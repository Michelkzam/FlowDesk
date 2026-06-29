import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/agents
router.get('/', authenticate, async (req, res) => {
  try {
    const agents = await db('users')
      .select('id', 'email', 'full_name', 'role', 'status', 'avatar_url', 'created_at')
      .whereIn('role', ['admin', 'agent'])
      .orderBy('full_name');

    res.json(agents);
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/agents
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, password, full_name, role = 'agent' } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, senha e nome são obrigatórios' });
    }

    const allowedRoles = ['agent', 'user'];
    const finalRole = allowedRoles.includes(role) ? role : 'agent';

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ message: 'Email já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [agent] = await db('users').insert({
      id: uuidv4(),
      email,
      password_hash: passwordHash,
      full_name,
      role: finalRole,
      status: 'active'
    }).returning(['id', 'email', 'full_name', 'role', 'status', 'created_at']);

    res.status(201).json(agent);
  } catch (error) {
    console.error('Erro ao criar agente:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/agents/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { full_name, email, role, status } = req.body;

    const allowedRoles = ['agent', 'user'];
    const updateData = { full_name, email, status, updated_at: new Date() };
    if (role && allowedRoles.includes(role)) updateData.role = role;

    const [agent] = await db('users')
      .where({ id: req.params.id })
      .update(updateData)
      .returning(['id', 'email', 'full_name', 'role', 'status']);

    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Erro ao atualizar agente:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// DELETE /api/agents/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const agent = await db('users').where({ id: req.params.id }).first();

    if (!agent) {
      return res.status(404).json({ message: 'Agente não encontrado' });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (authError) {
      console.error('Aviso: Erro ao deletar do Auth:', authError.message);
    }

    await db('users').where({ id: req.params.id }).del();

    res.json({ message: 'Agente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir agente:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

export default router;
