import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const user = await db('users').where({ email }).first();

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Conta desativada' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro no login:', error.message);
    res.status(500).json({ message: 'Erro interno no servidor', error: error.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, senha e nome são obrigatórios' });
    }

    const existingUser = await db('users').where({ email }).first();

    if (existingUser) {
      return res.status(409).json({ message: 'Email já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db('users').insert({
      email,
      password_hash: passwordHash,
      full_name,
      role: 'user',
      status: 'active'
    }).returning(['id', 'email', 'full_name', 'role', 'status', 'created_at']);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/auth/create-user (cria usuário no Supabase Auth)
router.post('/create-user', authenticate, async (req, res) => {
  try {
    const { email, password, full_name, role = 'user' } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, senha e nome são obrigatórios' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.status(201).json({ user: data.user });
  } catch (error) {
    console.error('Erro ao criar usuário no Auth:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/auth/admin-password (admin altera senha de qualquer usuário)
router.put('/admin-password', authenticate, async (req, res) => {
  try {
    const { target_user_id, new_password } = req.body;

    if (!target_user_id || !new_password) {
      return res.status(400).json({ message: 'ID do usuário e nova senha são obrigatórios' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
      password: new_password
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// DELETE /api/auth/delete-user (admin exclui usuário do Auth)
router.delete('/delete-user', authenticate, async (req, res) => {
  try {
    const { target_user_id } = req.body;

    if (!target_user_id) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'email', 'full_name', 'role', 'status', 'avatar_url', 'created_at')
      .where({ id: req.user.id })
      .first();

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, avatar_url } = req.body;

    const [user] = await db('users')
      .where({ id: req.user.id })
      .update({ full_name, avatar_url, updated_at: new Date() })
      .returning(['id', 'email', 'full_name', 'role', 'status', 'avatar_url']);

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias' });
    }

    const user = await db('users').where({ id: req.user.id }).first();

    const validPassword = await bcrypt.compare(current_password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    await db('users').where({ id: req.user.id }).update({
      password_hash: passwordHash,
      updated_at: new Date()
    });

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

export default router;
