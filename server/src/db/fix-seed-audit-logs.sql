-- FlowDesk - Inserir logs de auditoria de teste
-- Execute no SQL Editor do Supabase Dashboard

INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, entity_label, description, old_value, new_value, created_at)
VALUES
  (NULL, 'Sistema', 'status_changed', 'Ticket', NULL, 'Ticket de teste #001', 'Status alterado de "open" para "in_progress"', 'open', 'in_progress', NOW() - INTERVAL '1 hour'),
  (NULL, 'Sistema', 'agent_changed', 'Ticket', NULL, 'Ticket de teste #002', 'Agente alterado para "João Silva"', NULL, 'João Silva', NOW() - INTERVAL '30 minutes'),
  (NULL, 'Sistema', 'ticket_created', 'Ticket', NULL, 'Ticket de teste #003', 'Novo ticket criado via formulário web', NULL, NULL, NOW() - INTERVAL '10 minutes'),
  (NULL, 'Sistema', 'ticket_closed', 'Ticket', NULL, 'Ticket de teste #001', 'Atendimento finalizado com sucesso', 'in_progress', 'resolved', NOW() - INTERVAL '5 minutes');
