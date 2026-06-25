const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString()
const hoursAgo = (n) => new Date(now.getTime() - n * 3600000).toISOString()

const ids = (() => {
  let counter = 100
  return { next: () => String(++counter) }
})()

function withTimestamps(data) {
  const ts = new Date().toISOString()
  return { ...data, id: ids.next(), created_date: ts, updated_date: ts }
}

function updateTimestamps(record, data) {
  return { ...record, ...data, updated_date: new Date().toISOString() }
}

function matchFilter(record, criteria) {
  return Object.entries(criteria).every(([key, val]) => {
    if (val === undefined || val === null) return true
    if (typeof val === 'string' && val.includes('%')) {
      const pattern = val.replace(/%/g, '').toLowerCase()
      return String(record[key] || '').toLowerCase().includes(pattern)
    }
    return record[key] === val
  })
}

function applySort(list, sortBy) {
  if (!sortBy) return list
  const desc = sortBy.startsWith('-')
  const field = desc ? sortBy.slice(1) : sortBy
  return [...list].sort((a, b) => {
    const va = a[field] || ''
    const vb = b[field] || ''
    if (va < vb) return desc ? 1 : -1
    if (va > vb) return desc ? -1 : 1
    return 0
  })
}

function createStore(initialData = [], storageKey = null) {
  const getData = () => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  };
  let data = getData() || initialData.map(r => ({ ...r }));
  const persist = () => {
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
    }
  };
  const sync = () => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) data = JSON.parse(saved);
      } catch {}
    }
  };
  return {
    list: (sortBy, limit) => {
      sync();
      let result = applySort(data, sortBy)
      if (limit) result = result.slice(0, limit)
      return Promise.resolve(result)
    },
    filter: (criteria = {}, sortBy, limit) => {
      sync();
      let result = data.filter(r => matchFilter(r, criteria))
      result = applySort(result, sortBy)
      if (limit) result = result.slice(0, limit)
      return Promise.resolve(result)
    },
    get: (id) => {
      sync();
      return Promise.resolve(data.find(r => r.id === id) || null)
    },
    create: (payload) => {
      sync();
      const record = withTimestamps(payload)
      data.push(record)
      persist();
      return Promise.resolve(record)
    },
    update: (id, payload) => {
      sync();
      const idx = data.findIndex(r => r.id === id)
      if (idx === -1) return Promise.resolve(null)
      data[idx] = updateTimestamps(data[idx], payload)
      persist();
      return Promise.resolve(data[idx])
    },
    delete: (id) => {
      sync();
      const idx = data.findIndex(r => r.id === id)
      if (idx === -1) return Promise.resolve(null)
      data.splice(idx, 1)
      persist();
      return Promise.resolve({ id, deleted: true })
    },
  }
}

const departments = [
  { id: 'dept-1', name: 'Suporte Técnico', description: 'Suporte técnico especializado', status: 'active', created_date: daysAgo(90) },
  { id: 'dept-2', name: 'Vendas', description: 'Departamento de vendas', status: 'active', created_date: daysAgo(90) },
  { id: 'dept-3', name: 'Financeiro', description: 'Departamento financeiro', status: 'active', created_date: daysAgo(85) },
  { id: 'dept-4', name: 'RH', description: 'Recursos humanos', status: 'active', created_date: daysAgo(80) },
  { id: 'dept-5', name: 'Infraestrutura', description: 'Infraestrutura de TI', status: 'active', created_date: daysAgo(75) },
]

const agents = [
  { id: 'agent-1', name: 'João Silva', email: 'joao@flowdesk.com', phone: '(11) 99999-0001', role: 'admin', department_id: 'dept-1', department_name: 'Suporte Técnico', status: 'active', created_date: daysAgo(60) },
  { id: 'agent-2', name: 'Maria Santos', email: 'maria@flowdesk.com', phone: '(11) 99999-0002', role: 'admin', department_id: 'dept-1', department_name: 'Suporte Técnico', status: 'active', created_date: daysAgo(50) },
  { id: 'agent-3', name: 'Pedro Oliveira', email: 'pedro@flowdesk.com', phone: '(11) 99999-0003', role: 'agent', department_id: 'dept-2', department_name: 'Vendas', status: 'active', created_date: daysAgo(40) },
  { id: 'agent-4', name: 'Ana Costa', email: 'ana@flowdesk.com', phone: '(11) 99999-0004', role: 'agent', department_id: 'dept-3', department_name: 'Financeiro', status: 'active', created_date: daysAgo(30) },
  { id: 'agent-5', name: 'Carlos Souza', email: 'carlos@flowdesk.com', phone: '(11) 99999-0005', role: 'agent', department_id: 'dept-5', department_name: 'Infraestrutura', status: 'active', created_date: daysAgo(20) },
]

const clients = [
  { id: 'client-1', name: 'Empresa ABC Ltda', email: 'contato@abc.com', phone: '(11) 3333-0001', company: 'ABC Ltda', document: '12.345.678/0001-90', status: 'active', notes: 'Cliente premium', created_date: daysAgo(120) },
  { id: 'client-2', name: 'Tech Solutions SA', email: 'suporte@techsol.com', phone: '(21) 4444-0002', company: 'Tech Solutions', document: '98.765.432/0001-10', status: 'active', notes: '', created_date: daysAgo(100) },
  { id: 'client-3', name: 'Maria Oliveira', email: 'maria.oliveira@email.com', phone: '(31) 5555-0003', company: 'Oliveira & Cia', document: '123.456.789-00', status: 'active', notes: '', created_date: daysAgo(80) },
  { id: 'client-4', name: 'Comércio Digital Ltda', email: 'adm@comerciodigital.com', phone: '(41) 6666-0004', company: 'Comércio Digital', document: '45.678.901/0001-23', status: 'active', notes: 'Contrato vigente', created_date: daysAgo(60) },
  { id: 'client-5', name: 'João Pereira', email: 'joao.pereira@email.com', phone: '(51) 7777-0005', company: 'Pereira ME', document: '987.654.321-00', status: 'inactive', notes: '', created_date: daysAgo(40) },
]

const teams = [
  { id: 'team-1', name: 'Suporte N1', description: 'Primeiro nível de suporte', department_id: 'dept-1', department_name: 'Suporte Técnico', status: 'active', created_date: daysAgo(60) },
  { id: 'team-2', name: 'Suporte N2', description: 'Segundo nível de suporte', department_id: 'dept-1', department_name: 'Suporte Técnico', status: 'active', created_date: daysAgo(50) },
  { id: 'team-3', name: 'Vendas Online', description: 'Equipe de vendas online', department_id: 'dept-2', department_name: 'Vendas', status: 'active', created_date: daysAgo(40) },
  { id: 'team-4', name: 'Infraestrutura', description: 'Equipe de infraestrutura', department_id: 'dept-5', department_name: 'Infraestrutura', status: 'active', created_date: daysAgo(30) },
]

const roles = [
  { id: 'role-1', name: 'Administrador', permissions: ['tickets.*', 'agents.*', 'settings.*', 'reports.*', 'kb.*', 'clients.*'], status: 'active', created_date: daysAgo(90) },
  { id: 'role-2', name: 'Técnico', permissions: ['tickets.read', 'tickets.write', 'tickets.update_status', 'kb.read'], status: 'active', created_date: daysAgo(90) },
  { id: 'role-3', name: 'Supervisor', permissions: ['tickets.*', 'reports.*', 'agents.read'], status: 'active', created_date: daysAgo(80) },
  { id: 'role-4', name: 'Financeiro', permissions: ['tickets.read', 'clients.read', 'reports.financeiro'], status: 'active', created_date: daysAgo(70) },
]

const helpTopics = [
  { id: 'ht-1', name: 'Problemas de Rede', description: 'Conectividade, internet, VPN', department_id: 'dept-1', department_name: 'Suporte Técnico', sla_id: null, status: 'active', created_date: daysAgo(60) },
  { id: 'ht-2', name: 'Software', description: 'Problemas com aplicativos e sistemas', department_id: 'dept-1', department_name: 'Suporte Técnico', sla_id: null, status: 'active', created_date: daysAgo(55) },
  { id: 'ht-3', name: 'Hardware', description: 'Problemas com equipamentos', department_id: 'dept-1', department_name: 'Suporte Técnico', sla_id: null, status: 'active', created_date: daysAgo(50) },
  { id: 'ht-4', name: 'Suporte Comercial', description: 'Dúvidas sobre produtos e serviços', department_id: 'dept-2', department_name: 'Vendas', sla_id: null, status: 'active', created_date: daysAgo(45) },
  { id: 'ht-5', name: 'Faturamento', description: 'Notas fiscais, boletos, cobranças', department_id: 'dept-3', department_name: 'Financeiro', sla_id: null, status: 'active', created_date: daysAgo(40) },
]

const kbCategories = [
  { id: 'kbc-1', name: 'Primeiros Passos', description: 'Guias de início rápido', status: 'active', created_date: daysAgo(60) },
  { id: 'kbc-2', name: 'Tutoriais', description: 'Tutoriais passo a passo', status: 'active', created_date: daysAgo(55) },
  { id: 'kbc-3', name: 'FAQ', description: 'Perguntas frequentes', status: 'active', created_date: daysAgo(50) },
  { id: 'kbc-4', name: 'Solução de Problemas', description: 'Resolução de problemas comuns', status: 'active', created_date: daysAgo(45) },
]

const kbArticles = [
  { id: 'kba-1', title: 'Como resetar sua senha', content: 'Para resetar sua senha, acesse a página de login e clique em "Esqueci minha senha". Siga as instruções enviadas por email.', category_id: 'kbc-1', category_name: 'Primeiros Passos', author: 'João Silva', status: 'published', created_date: daysAgo(50) },
  { id: 'kba-2', title: 'Configurando email no Outlook', content: 'Passo a passo para configurar sua conta de email no Microsoft Outlook...', category_id: 'kbc-2', category_name: 'Tutoriais', author: 'Maria Santos', status: 'published', created_date: daysAgo(45) },
  { id: 'kba-3', title: 'Qual o horário de funcionamento do suporte?', content: 'Nosso suporte funciona de segunda a sexta, das 8h às 18h.', category_id: 'kbc-3', category_name: 'FAQ', author: 'João Silva', status: 'published', created_date: daysAgo(40) },
  { id: 'kba-4', title: 'Erro de conexão com banco de dados', content: 'Se você está enfrentando erro de conexão, verifique se o servidor está ativo e se as credenciais estão corretas.', category_id: 'kbc-4', category_name: 'Solução de Problemas', author: 'Carlos Souza', status: 'published', created_date: daysAgo(35) },
]

const cannedResponses = [
  { id: 'cr-1', title: 'Saudação inicial', content: 'Olá! Como posso ajudá-lo hoje?', category: 'geral', status: 'active', created_date: daysAgo(30) },
  { id: 'cr-2', title: 'Pedir informações', content: 'Para melhor atendê-lo, preciso de mais informações sobre o problema. Poderia descrever detalhadamente o que está acontecendo?', category: 'geral', status: 'active', created_date: daysAgo(28) },
  { id: 'cr-3', title: 'Encerramento', content: 'Seu chamado foi resolvido. Ficamos à disposição para qualquer dúvida adicional.', category: 'geral', status: 'active', created_date: daysAgo(25) },
  { id: 'cr-4', title: 'Transferência', content: 'Estou transferindo seu chamado para o setor responsável. Em breve você receberá um retorno.', category: 'geral', status: 'active', created_date: daysAgo(22) },
]

const ticketStatuses = ['open', 'in_progress', 'waiting', 'pending_approval', 'resolved', 'closed']
const priorities = ['low', 'normal', 'high', 'emergency']
const sources = ['web', 'email', 'api', 'phone', 'whatsapp']

const sampleTickets = []
const sampleMessages = []
const sampleAuditLogs = []

for (let i = 0; i < 30; i++) {
  const daysBack = Math.floor(Math.random() * 30)
  const statusIdx = Math.min(Math.floor(Math.random() * 5) + (i < 10 ? 2 : 0), 5)
  const status = ticketStatuses[statusIdx]
  const client = clients[Math.floor(Math.random() * clients.length)]
  const agent = agents[Math.floor(Math.random() * agents.length)]
  const dept = departments[Math.floor(Math.random() * departments.length)]
  const topic = helpTopics[Math.floor(Math.random() * helpTopics.length)]
  const priority = priorities[Math.floor(Math.random() * priorities.length)]
  const source = sources[Math.floor(Math.random() * sources.length)]

  const tid = `ticket-${100 + i}`
  const createdDate = daysAgo(daysBack)
  const resolvedDate = ['resolved', 'closed'].includes(status) ? daysAgo(Math.max(0, daysBack - Math.floor(Math.random() * 3) - 1)) : null

  sampleTickets.push({
    id: tid,
    number: `#${String(1000 + i).padStart(4, '0')}`,
    title: [
      'Computador não liga',
      'Internet caindo constantemente',
      'Erro ao acessar o sistema',
      'Impressora não funciona',
      'Email corporativo não enviando',
      'Problema com VPN',
      'Solicitação de novo usuário',
      'Atualização de cadastro',
      'Nota fiscal com erro',
      'Sistema lento',
      'Acesso remoto não funciona',
      'Videoconferencia com falha',
      'Boleto vencido sem reemissão',
      'Dúvida sobre contrato',
      'Troca de equipamento',
      'Relatório não gera',
      'Erro 500 no painel',
      'Senha expirada',
      'Backup não realizado',
      'Certificado digital vencendo',
      'Migração de email',
      'Instalação de software',
      'Configuração de roteador',
      'Problema com headset',
      'Acesso ao WiFi corporativo',
      'Agendamento de visita técnica',
      'Solicitação de orçamento',
      'Cancelamento de serviço',
      'Reativação de contrato',
      'Suporte para apresentação',
    ][i],
    description: `Descrição detalhada do chamado ${i + 1}. O cliente relatou o problema e solicitou suporte técnico para resolução.`,
    status,
    priority,
    department_id: dept.id,
    department_name: dept.name,
    agent_id: ['resolved', 'closed'].includes(status) ? agent.id : (Math.random() > 0.3 ? agent.id : null),
    agent_name: ['resolved', 'closed'].includes(status) ? agent.name : (Math.random() > 0.3 ? agent.name : null),
    user_id: client.id,
    user_name: client.name,
    user_email: client.email,
    user_phone: client.phone,
    organization_id: null,
    organization_name: client.company,
    help_topic_id: topic.id,
    help_topic_name: topic.name,
    source,
    created_date: createdDate,
    closed_date: resolvedDate,
    due_date: daysAgo(Math.max(0, daysBack - 2)),
    is_overdue: Math.random() > 0.7,
    last_response_date: hoursAgo(Math.floor(Math.random() * 48)),
    category_id: null,
    category_name: null,
  })

  const msgCount = Math.floor(Math.random() * 5) + 1
  for (let j = 0; j < msgCount; j++) {
    sampleMessages.push({
      id: `msg-${i}-${j}`,
      ticket_id: tid,
      body: [
        'Olá, preciso de ajuda com este problema.',
        'Já tentou reiniciar o equipamento?',
        'Sim, já reiniciei e o problema persiste.',
        'Vou verificar em nosso sistema.',
        'Conseguimos resolver o problema.',
        'Agradeço o atendimento!',
        'Preciso de mais informações sobre o ocorrido.',
        'Estou enviando um técnico até o local.',
        'O problema foi resolvido remotamente.',
        'Aguardando retorno do cliente.',
      ][j % 10],
      sender_type: j % 2 === 0 ? 'user' : 'agent',
      sender_id: j % 2 === 0 ? client.id : agent.id,
      sender_name: j % 2 === 0 ? client.name : agent.name,
      type: 'text',
      is_internal: j === 1,
      created_date: new Date(new Date(createdDate).getTime() + j * 3600000).toISOString(),
    })
  }
}

const schedules = [
  { id: 'sched-1', name: 'Plantão Seg-Sex 8h-18h', description: 'Horário comercial padrão', timezone: 'America/Sao_Paulo', monday: { start: '08:00', end: '18:00' }, tuesday: { start: '08:00', end: '18:00' }, wednesday: { start: '08:00', end: '18:00' }, thursday: { start: '08:00', end: '18:00' }, friday: { start: '08:00', end: '18:00' }, saturday: null, sunday: null, type: 'business', status: 'active', created_date: daysAgo(60) },
  { id: 'sched-2', name: 'Plantão 24h', description: 'Cobertura 24 horas', timezone: 'America/Sao_Paulo', monday: { start: '00:00', end: '23:59' }, tuesday: { start: '00:00', end: '23:59' }, wednesday: { start: '00:00', end: '23:59' }, thursday: { start: '00:00', end: '23:59' }, friday: { start: '00:00', end: '23:59' }, saturday: { start: '00:00', end: '23:59' }, sunday: { start: '00:00', end: '23:59' }, type: '24h', status: 'active', created_date: daysAgo(50) },
]

const slaPlans = [
  { id: 'sla-1', name: 'Suporte Básico', description: 'Atendimento em até 48h úteis', response_time: 48, resolution_time: 120, schedule_id: 'sched-1', priority: 'low', status: 'active', created_date: daysAgo(60) },
  { id: 'sla-2', name: 'Suporte Avançado', description: 'Atendimento em até 24h úteis', response_time: 24, resolution_time: 72, schedule_id: 'sched-1', priority: 'normal', status: 'active', created_date: daysAgo(55) },
  { id: 'sla-3', name: 'Suporte Crítico', description: 'Atendimento em até 4h', response_time: 4, resolution_time: 24, schedule_id: 'sched-2', priority: 'high', status: 'active', created_date: daysAgo(50) },
  { id: 'sla-4', name: 'Emergencial', description: 'Atendimento imediato', response_time: 1, resolution_time: 8, schedule_id: 'sched-2', priority: 'emergency', status: 'active', created_date: daysAgo(45) },
]

const holidays = [
  { id: 'hol-1', name: 'Confraternização Universal', date: `${now.getFullYear()}-01-01`, type: 'national', created_date: daysAgo(300) },
  { id: 'hol-2', name: 'Carnaval', date: `${now.getFullYear()}-02-${String(Math.floor(Math.random() * 10) + 10).padStart(2, '0')}`, type: 'national', created_date: daysAgo(290) },
  { id: 'hol-3', name: 'Tiradentes', date: `${now.getFullYear()}-04-21`, type: 'national', created_date: daysAgo(280) },
  { id: 'hol-4', name: 'Dia do Trabalho', date: `${now.getFullYear()}-05-01`, type: 'national', created_date: daysAgo(270) },
  { id: 'hol-5', name: 'Independência', date: `${now.getFullYear()}-09-07`, type: 'national', created_date: daysAgo(260) },
  { id: 'hol-6', name: 'Nossa Sra. Aparecida', date: `${now.getFullYear()}-10-12`, type: 'national', created_date: daysAgo(250) },
  { id: 'hol-7', name: 'Finados', date: `${now.getFullYear()}-11-02`, type: 'national', created_date: daysAgo(240) },
  { id: 'hol-8', name: 'Proclamação da República', date: `${now.getFullYear()}-11-15`, type: 'national', created_date: daysAgo(230) },
  { id: 'hol-9', name: 'Natal', date: `${now.getFullYear()}-12-25`, type: 'national', created_date: daysAgo(220) },
]

const organizations = [
  { id: 'org-1', name: 'ABC Ltda', website: 'www.abc.com', phone: '(11) 3333-0001', address: 'Rua A, 123', account_manager_name: 'João Silva', status: 'active', notes: '', created_date: daysAgo(120) },
  { id: 'org-2', name: 'Tech Solutions SA', website: 'www.techsol.com', phone: '(21) 4444-0002', address: 'Av B, 456', account_manager_name: 'Maria Santos', status: 'active', notes: '', created_date: daysAgo(100) },
  { id: 'org-3', name: 'Comércio Digital Ltda', website: 'www.comerciodigital.com', phone: '(41) 6666-0004', address: 'Rua C, 789', account_manager_name: 'Pedro Oliveira', status: 'active', notes: '', created_date: daysAgo(80) },
]

const users = [
  { id: 'user-1', full_name: 'Admin FlowDesk', email: 'admin@flowdesk.com', phone: '(11) 99999-0000', role: 'admin', status: 'active', created_date: daysAgo(90) },
  { id: 'user-2', full_name: 'João Silva', email: 'joao@flowdesk.com', phone: '(11) 99999-0001', role: 'admin', status: 'active', created_date: daysAgo(60) },
  { id: 'user-3', full_name: 'Maria Santos', email: 'maria@flowdesk.com', phone: '(11) 99999-0002', role: 'admin', status: 'active', created_date: daysAgo(50) },
  { id: 'user-4', full_name: 'Pedro Oliveira', email: 'pedro@flowdesk.com', phone: '(11) 99999-0003', role: 'agent', status: 'active', created_date: daysAgo(40) },
  { id: 'user-5', full_name: 'Ana Costa', email: 'ana@flowdesk.com', phone: '(11) 99999-0004', role: 'agent', status: 'active', created_date: daysAgo(30) },
]

const userProfiles = [
  { id: 'up-1', name: 'Administrador', description: 'Acesso total ao sistema', permissions: ['all'], status: 'active', created_date: daysAgo(90) },
  { id: 'up-2', name: 'Técnico', description: 'Acesso a tickets e KB', permissions: ['tickets', 'kb'], status: 'active', created_date: daysAgo(90) },
  { id: 'up-3', name: 'Usuário', description: 'Acesso restrito a tickets próprios', permissions: ['tickets.own'], status: 'active', created_date: daysAgo(90) },
]

const ticketFilters = [
  { id: 'tf-1', name: 'Alta Prioridade', description: 'Filtrar tickets de alta prioridade', conditions: [{ field: 'priority', operator: 'eq', value: 'high' }], execution_order: 1, status: 'active', created_date: daysAgo(30) },
  { id: 'tf-2', name: 'Vencidos', description: 'Filtrar tickets vencidos', conditions: [{ field: 'is_overdue', operator: 'eq', value: true }], execution_order: 2, status: 'active', created_date: daysAgo(25) },
]

const businessHours = [
  { id: 'bh-1', day_of_week: 1, start_time: '08:00', end_time: '18:00', is_working_day: true, created_date: daysAgo(60) },
  { id: 'bh-2', day_of_week: 2, start_time: '08:00', end_time: '18:00', is_working_day: true, created_date: daysAgo(60) },
  { id: 'bh-3', day_of_week: 3, start_time: '08:00', end_time: '18:00', is_working_day: true, created_date: daysAgo(60) },
  { id: 'bh-4', day_of_week: 4, start_time: '08:00', end_time: '18:00', is_working_day: true, created_date: daysAgo(60) },
  { id: 'bh-5', day_of_week: 5, start_time: '08:00', end_time: '18:00', is_working_day: true, created_date: daysAgo(60) },
]

const assets = [
  { id: 'asset-1', name: 'Notebook Dell Inspiron', type: 'notebook', serial: 'DEL-2024-001', status: 'active', client_id: 'client-1', client_name: 'Empresa ABC Ltda', created_date: daysAgo(60) },
  { id: 'asset-2', name: 'Servidor HP ProLiant', type: 'server', serial: 'HP-2024-002', status: 'active', client_id: 'client-2', client_name: 'Tech Solutions SA', created_date: daysAgo(55) },
  { id: 'asset-3', name: 'Switch Cisco 2960', type: 'network', serial: 'CIS-2024-003', status: 'active', client_id: 'client-4', client_name: 'Comércio Digital Ltda', created_date: daysAgo(50) },
  { id: 'asset-4', name: 'Impressora HP LaserJet', type: 'printer', serial: 'HPLJ-2024-004', status: 'active', client_id: 'client-1', client_name: 'Empresa ABC Ltda', created_date: daysAgo(45) },
]

const contracts = [
  { id: 'cont-1', title: 'Contrato de Suporte Anual', client_id: 'client-1', client_name: 'Empresa ABC Ltda', value: 24000, status: 'active', start_date: daysAgo(120), end_date: daysAgo(245), created_date: daysAgo(120) },
  { id: 'cont-2', title: 'Contrato de Infraestrutura', client_id: 'client-2', client_name: 'Tech Solutions SA', value: 48000, status: 'active', start_date: daysAgo(100), end_date: daysAgo(265), created_date: daysAgo(100) },
  { id: 'cont-3', title: 'Suporte Mensal', client_id: 'client-4', client_name: 'Comércio Digital Ltda', value: 3000, status: 'active', start_date: daysAgo(60), end_date: daysAgo(425), created_date: daysAgo(60) },
]

const appointments = [
  { id: 'appt-1', title: 'Visita Técnica - Troca de Equipamento', client_id: 'client-1', client_name: 'Empresa ABC Ltda', start_date: daysAgo(5), end_date: daysAgo(4), status: 'completed', agent_id: 'agent-1', agent_name: 'João Silva', created_date: daysAgo(10) },
  { id: 'appt-2', title: 'Instalação de Servidor', client_id: 'client-2', client_name: 'Tech Solutions SA', start_date: daysAgo(2), end_date: daysAgo(1), status: 'completed', agent_id: 'agent-5', agent_name: 'Carlos Souza', created_date: daysAgo(7) },
  { id: 'appt-3', title: 'Manutenção Preventiva', client_id: 'client-4', client_name: 'Comércio Digital Ltda', start_date: daysAgo(1), end_date: now.toISOString(), status: 'scheduled', agent_id: 'agent-3', agent_name: 'Pedro Oliveira', created_date: daysAgo(5) },
]

const documents = [
  { id: 'doc-1', title: 'Manual do Sistema', type: 'pdf', file_url: '/files/manual.pdf', client_id: null, status: 'active', created_date: daysAgo(60) },
  { id: 'doc-2', title: 'Contrato Social ABC', type: 'pdf', file_url: '/files/contrato-abc.pdf', client_id: 'client-1', status: 'active', created_date: daysAgo(50) },
]

const userAccounts = [
  { id: 'ua-1', name: 'Admin FlowDesk', email: 'admin@flowdesk.com', phone: '(11) 99999-0000', status: 'active', role: 'admin', created_date: daysAgo(90) },
  { id: 'ua-2', name: 'Usuário Teste', email: 'user@flowdesk.com', phone: '(11) 99999-0001', status: 'active', role: 'user', created_date: daysAgo(60) },
]

const categories = [
  { id: 'cat-1', name: 'Problema Técnico', description: 'Problemas técnicos em geral', status: 'active', created_date: daysAgo(60) },
  { id: 'cat-2', name: 'Dúvida', description: 'Dúvidas sobre produtos/serviços', status: 'active', created_date: daysAgo(55) },
  { id: 'cat-3', name: 'Solicitação', description: 'Solicitações diversas', status: 'active', created_date: daysAgo(50) },
  { id: 'cat-4', name: 'Reclamação', description: 'Reclamações', status: 'active', created_date: daysAgo(45) },
]

const chatQueues = [
  { id: 'cq-1', name: 'Atendimento Online', description: 'Fila de atendimento web', status: 'active', created_date: daysAgo(60) },
  { id: 'cq-2', name: 'WhatsApp', description: 'Fila de WhatsApp', status: 'active', created_date: daysAgo(50) },
]

const channelLinks = [
  { id: 'cl-1', channel: 'whatsapp', name: 'WhatsApp Comercial', phone: '+5511999990000', status: 'connected', created_date: daysAgo(30) },
  { id: 'cl-2', channel: 'telegram', name: 'Telegram Suporte', username: '@flowdesk_sup', status: 'connected', created_date: daysAgo(25) },
]

const operators = [
  { id: 'op-1', name: 'João Silva', email: 'joao@flowdesk.com', status: 'active', created_date: daysAgo(60) },
  { id: 'op-2', name: 'Maria Santos', email: 'maria@flowdesk.com', status: 'active', created_date: daysAgo(50) },
]

const operatorProfiles = [
  { id: 'opp-1', name: 'Perfil Administrador', description: 'Acesso total', permissions: ['all'], status: 'active', created_date: daysAgo(60) },
  { id: 'opp-2', name: 'Perfil Operador', description: 'Acesso a tickets e chat', permissions: ['tickets', 'chat'], status: 'active', created_date: daysAgo(50) },
]

const operatorTeams = [
  { id: 'opt-1', name: 'Suporte N1', description: 'Primeiro nível', status: 'active', created_date: daysAgo(60) },
  { id: 'opt-2', name: 'Suporte N2', description: 'Segundo nível', status: 'active', created_date: daysAgo(50) },
]

const requesterSectors = [
  { id: 'rs-1', name: 'TI', description: 'Setor de TI', status: 'active', created_date: daysAgo(60) },
  { id: 'rs-2', name: 'Administrativo', description: 'Setor administrativo', status: 'active', created_date: daysAgo(55) },
  { id: 'rs-3', name: 'Produção', description: 'Setor de produção', status: 'active', created_date: daysAgo(50) },
]

const mockUser = {
  id: 'user-1',
  full_name: 'Admin FlowDesk',
  email: 'admin@flowdesk.com',
  phone: '(11) 99999-0000',
  role: 'admin',
  status: 'active',
  avatar_url: null,
  created_date: daysAgo(90),
}

const stores = {
  Agent: createStore(agents),
  Appointment: createStore(appointments),
  Asset: createStore(assets),
  AuditLog: createStore(sampleAuditLogs),
  BusinessHours: createStore(businessHours),
  CannedResponse: createStore(cannedResponses),
  Category: createStore(categories),
  ChannelLink: createStore(channelLinks),
  ChatMessage: createStore(sampleMessages),
  ChatQueue: createStore(chatQueues),
  Client: createStore(clients),
  Contract: createStore(contracts),
  Department: createStore(departments),
  Document: createStore(documents),
  HelpTopic: createStore(helpTopics),
  Holiday: createStore(holidays),
  KBCategory: createStore(kbCategories),
  KBArticle: createStore(kbArticles),
  Operator: createStore(operators),
  OperatorProfile: createStore(operatorProfiles),
  OperatorTeam: createStore(operatorTeams),
  Organization: createStore(organizations),
  QuickReply: createStore(cannedResponses),
  RequesterSector: createStore(requesterSectors),
  Role: createStore(roles),
  Schedule: createStore(schedules),
  SLAPlan: createStore(slaPlans),
  Team: createStore(teams),
  Ticket: createStore(sampleTickets, 'flowdesk_tickets'),
  TicketFilter: createStore(ticketFilters),
  TicketMessage: createStore(sampleMessages),
  User: createStore(users),
  UserAccount: createStore(userAccounts),
  UserProfile: createStore(userProfiles),
}

const db = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => ({ ...mockUser }),
    updateMe: async (data) => {
      Object.assign(mockUser, data)
      return { ...mockUser }
    },
    logout: async () => {},
    redirectToLogin: async () => {},
    getPublicSettings: async () => ({ id: 'app-1', public_settings: { name: 'FlowDesk' } }),
  },
  entities: new Proxy({}, {
    get: (_, name) => stores[name] || createStore([]),
  }),
  integrations: {
    Core: {
      UploadFile: async ({ file }) => ({ file_url: `/uploads/${file?.name || 'file'}` }),
      SendEmail: async () => ({ sent: true }),
    },
  },
  users: {
    inviteUser: async (email, role) => ({ id: ids.next(), email, role, status: 'invited' }),
  },
}

globalThis.__FLOWDESK_DB__ = db
export { db }
export default db
