import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/categories
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await db('categories').orderBy('name');
    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/categories
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    const [category] = await db('categories').insert({
      id: uuidv4(),
      name,
      description,
      color: color || '#6b7280',
      status: 'active'
    }).returning('*');

    res.status(201).json(category);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, color, status } = req.body;

    const [category] = await db('categories')
      .where({ id: req.params.id })
      .update({ name, description, color, status, updated_at: new Date() })
      .returning('*');

    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    res.json(category);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const deleted = await db('categories').where({ id: req.params.id }).del();

    if (!deleted) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

export default router;
