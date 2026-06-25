import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/sla-plans
router.get('/', authenticate, async (req, res) => {
  try {
    const plans = await db('sla_plans').orderBy('name');
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos SLA:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/sla-plans
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      name, description,
      emergency_hours, high_hours, normal_hours, low_hours,
      grace_period, is_default, notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    // Se for o padrão, desativar outros padrões
    if (is_default) {
      await db('sla_plans').where({ is_default: true }).update({ is_default: false });
    }

    const [plan] = await db('sla_plans').insert({
      id: uuidv4(),
      name,
      description,
      emergency_hours: emergency_hours || 2,
      high_hours: high_hours || 8,
      normal_hours: normal_hours || 24,
      low_hours: low_hours || 48,
      grace_period: grace_period || 0,
      is_default: is_default || false,
      status: 'active',
      notes
    }).returning('*');

    res.status(201).json(plan);
  } catch (error) {
    console.error('Erro ao criar plano SLA:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/sla-plans/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      name, description,
      emergency_hours, high_hours, normal_hours, low_hours,
      grace_period, is_default, status, notes
    } = req.body;

    // Se for o padrão, desativar outros padrões
    if (is_default) {
      await db('sla_plans').where({ is_default: true }).whereNot({ id: req.params.id }).update({ is_default: false });
    }

    const [plan] = await db('sla_plans')
      .where({ id: req.params.id })
      .update({
        name, description,
        emergency_hours, high_hours, normal_hours, low_hours,
        grace_period, is_default, status, notes,
        updated_at: new Date()
      })
      .returning('*');

    if (!plan) {
      return res.status(404).json({ message: 'Plano SLA não encontrado' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Erro ao atualizar plano SLA:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// DELETE /api/sla-plans/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const deleted = await db('sla_plans').where({ id: req.params.id }).del();

    if (!deleted) {
      return res.status(404).json({ message: 'Plano SLA não encontrado' });
    }

    res.json({ message: 'Plano SLA excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir plano SLA:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

export default router;
