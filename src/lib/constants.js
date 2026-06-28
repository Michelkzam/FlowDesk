export const ALL_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
  "kb.create", "kb.edit", "kb.delete", "kb.publish",
  "users.manage", "reports.view", "admin.access",
];

export const ALL_PERMISSIONS_WITH_LABELS = [
  { key: "tickets.create", label: "Criar tickets" },
  { key: "tickets.edit", label: "Editar tickets" },
  { key: "tickets.delete", label: "Excluir tickets" },
  { key: "tickets.close", label: "Fechar tickets" },
  { key: "tickets.assign", label: "Atribuir tickets" },
  { key: "tickets.transfer", label: "Transferir tickets" },
  { key: "kb.create", label: "Criar artigos KB" },
  { key: "kb.edit", label: "Editar artigos KB" },
  { key: "kb.delete", label: "Excluir artigos KB" },
  { key: "kb.publish", label: "Publicar artigos KB" },
  { key: "users.manage", label: "Gerenciar usuários" },
  { key: "reports.view", label: "Ver relatórios" },
  { key: "admin.access", label: "Acesso administrativo" },
];

export const PERMISSION_GROUPS = {
  "Tickets": ["tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer"],
  "Base de Conhecimento": ["kb.create", "kb.edit", "kb.delete", "kb.publish"],
  "Sistema": ["users.manage", "reports.view", "admin.access"],
};

export const TICKET_STATUSES = {
  open: { key: "open", label: "Pendente", color: "bg-yellow-400", textColor: "text-yellow-800", dotColor: "bg-yellow-500", badgeCls: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { key: "in_progress", label: "Em Atendimento", color: "bg-blue-500", textColor: "text-white", dotColor: "bg-blue-500", badgeCls: "bg-amber-100 text-amber-700 border-amber-200" },
  waiting: { key: "waiting", label: "Aguardando", color: "bg-purple-500", textColor: "text-white", dotColor: "bg-purple-500", badgeCls: "bg-purple-100 text-purple-700 border-purple-200" },
  pending_approval: { key: "pending_approval", label: "Aguard. Aprovação", color: "bg-orange-500", textColor: "text-white", dotColor: "bg-orange-500", badgeCls: "bg-orange-100 text-orange-700 border-orange-200" },
  resolved: { key: "resolved", label: "Resolvido", color: "bg-green-500", textColor: "text-white", dotColor: "bg-green-500", badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { key: "closed", label: "Finalizado", color: "bg-zinc-500", textColor: "text-white", dotColor: "bg-zinc-500", badgeCls: "bg-muted text-muted-foreground border-border" },
};

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(TICKET_STATUSES).map(([k, v]) => [k, v.label])
);

export const STATUS_LIST = Object.keys(TICKET_STATUSES);

export const TICKET_PRIORITIES = {
  low: { key: "low", label: "Baixa", badgeCls: "bg-muted text-muted-foreground border-border" },
  normal: { key: "normal", label: "Média", badgeCls: "bg-blue-100 text-blue-700 border-blue-200" },
  high: { key: "high", label: "Alta", badgeCls: "bg-amber-100 text-amber-700 border-amber-200" },
  emergency: { key: "emergency", label: "Crítica", badgeCls: "bg-red-100 text-red-700 border-red-200" },
};

export const PRIORITY_LABELS = Object.fromEntries(
  Object.entries(TICKET_PRIORITIES).map(([k, v]) => [k, v.label])
);

export const PRIORITY_LIST = Object.keys(TICKET_PRIORITIES);

export const SOURCE_EMOJI = { web: "🌐", email: "📧", api: "⚙️", phone: "📞", whatsapp: "💬" };

export const CLOSED_STATUSES = ["resolved", "closed"];

export const AGENT_STATUSES = ["open", "in_progress", "waiting", "pending_approval"];

export const ADMIN_ONLY_STATUSES = ["resolved", "closed"];

export const SLA_HOURS = {
  emergency: 2,
  high: 8,
  normal: 24,
  low: 48,
};
