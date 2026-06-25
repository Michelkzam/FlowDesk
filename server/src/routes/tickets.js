import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { emitToTicket } from '../services/websocket.js';

const router = Router();

// GET /api/tickets
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority, agent_id, limit = 100, offset = 0 } = req.query;

    let query = db('tickets').select('*');

    if (status) query = query.where('status', status);
    if (priority) query = query.where('priority', priority);
    if (agent_id) query = query.where('agent_id', agent_id);

    const tickets = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json(tickets);
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// GET /api/tickets/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await db('tickets').where({ id: req.params.id }).first();

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/tickets
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title, description, priority = 'normal', source = 'web',
      user_name, user_email, user_phone,
      department_id, department_name,
      help_topic_id, help_topic_name,
      agent_id, agent_name,
      category_id, category_name
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Título é obrigatório' });
    }

    const number = `#${Date.now().toString().slice(-6)}`;

    const [ticket] = await db('tickets').insert({
      id: uuidv4(),
      number,
      title,
      description,
      status: 'open',
      priority,
      source,
      user_id: req.user.id,
      user_name,
      user_email,
      user_phone,
      department_id,
      department_name,
      category_id,
      category_name,
      agent_id,
      agent_name,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    emitToTicket(ticket.id, 'ticket:created', ticket);

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// PUT /api/tickets/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status, priority, agent_id, agent_name, category_id, category_name } = req.body;

    const [ticket] = await db('tickets')
      .where({ id: req.params.id })
      .update({
        status,
        priority,
        agent_id,
        agent_name,
        category_id,
        category_name,
        updated_at: new Date(),
        ...(status === 'resolved' || status === 'closed' ? { closed_date: new Date() } : {})
      })
      .returning('*');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    emitToTicket(ticket.id, 'ticket:updated', ticket);

    res.json(ticket);
  } catch (error) {
    console.error('Erro ao atualizar ticket:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/tickets/:id/claim
router.post('/:id/claim', authenticate, async (req, res) => {
  const { id } = req.params;
  const agent_id = req.user.id;
  const agent_name = req.user.full_name;

  try {
    const result = await db.transaction(async (trx) => {
      const [ticket] = await trx('tickets').where({ id }).for('update');

      if (!ticket) {
        return { success: false, message: 'Ticket não encontrado' };
      }

      if (ticket.agent_id && ticket.agent_id !== agent_id) {
        return {
          success: false,
          ticket,
          message: `Este ticket já foi assumido por ${ticket.agent_name || 'outro técnico'}`
        };
      }

      const [updatedTicket] = await trx('tickets')
        .where({ id })
        .update({
          agent_id,
          agent_name,
          status: ticket.status === 'open' ? 'in_progress' : ticket.status,
          updated_at: new Date()
        })
        .returning('*');

      return { success: true, ticket: updatedTicket, message: 'Ticket assumido com sucesso' };
    });

    if (result.success) {
      emitToTicket(id, 'ticket:claimed', { agent_id, agent_name });
    }

    res.json(result);
  } catch (error) {
    console.error('Erro ao assumir ticket:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
});

// POST /api/tickets/:id/transfer
router.post('/:id/transfer', authenticate, async (req, res) => {
  const { id } = req.params;
  const { to_agent_id, to_agent_name, note } = req.body;
  const from_agent_id = req.user.id;
  const from_agent_name = req.user.full_name;

  if (!to_agent_id || !to_agent_name) {
    return res.status(400).json({ success: false, message: 'Técnico de destino é obrigatório' });
  }

  if (!note || note.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Justificativa da transferência é obrigatória' });
  }

  try {
    const result = await db.transaction(async (trx) => {
      const [ticket] = await trx('tickets').where({ id });

      if (!ticket) {
        return { success: false, message: 'Ticket não encontrado' };
      }

      if (ticket.agent_id && ticket.agent_id !== from_agent_id) {
        return { success: false, message: 'Apenas o técnico responsável pode transferir' };
      }

      await trx('ticket_messages').insert({
        id: uuidv4(),
        ticket_id: id,
        body: `[Transferência] Ticket transferido de ${from_agent_name} para ${to_agent_name}.\n\nMotivo: ${note}`,
        sender_type: 'system',
        sender_id: from_agent_id,
        sender_name: from_agent_name,
        type: 'system',
        is_internal: true,
        created_at: new Date()
      });

      const [updatedTicket] = await trx('tickets')
        .where({ id })
        .update({
          agent_id: to_agent_id,
          agent_name: to_agent_name,
          updated_at: new Date()
        })
        .returning('*');

      return { success: true, ticket: updatedTicket, message: `Ticket transferido para ${to_agent_name}` };
    });

    if (result.success) {
      emitToTicket(id, 'ticket:transferred', { from_agent_id, to_agent_id, to_agent_name });
    }

    res.json(result);
  } catch (error) {
    console.error('Erro ao transferir ticket:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
});

// GET /api/tickets/:id/messages
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const messages = await db('ticket_messages')
      .where({ ticket_id: req.params.id })
      .orderBy('created_at', 'asc')
      .limit(limit);

    // Filtrar notas internas para usuários comuns
    const filteredMessages = req.user.role === 'user'
      ? messages.filter(m => !m.is_internal)
      : messages;

    res.json(filteredMessages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

// POST /api/tickets/:id/messages
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { body, type = 'message', is_internal = false } = req.body;

    if (!body) {
      return res.status(400).json({ message: 'Mensagem é obrigatória' });
    }

    const ticket = await db('tickets').where({ id: req.params.id }).first();

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket não encontrado' });
    }

    // Se é resposta de técnico e ticket está open, assumir automaticamente
    if (req.user.role !== 'user' && !ticket.agent_id) {
      await db('tickets').where({ id: req.params.id }).update({
        agent_id: req.user.id,
        agent_name: req.user.full_name,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
        updated_at: new Date()
      });
    }

    const [message] = await db('ticket_messages').insert({
      id: uuidv4(),
      ticket_id: req.params.id,
      sender_type: req.user.role === 'user' ? 'user' : 'agent',
      sender_id: req.user.id,
      sender_name: req.user.full_name,
      body,
      type,
      is_internal,
      created_at: new Date()
    }).returning('*');

    // Atualizar last_response_date
    await db('tickets').where({ id: req.params.id }).update({
      last_response_date: new Date(),
      ...(req.user.role === 'user' ? { last_user_response_date: new Date() } : {}),
      updated_at: new Date()
    });

    emitToTicket(req.params.id, 'message:created', message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
});

export default router;
