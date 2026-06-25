import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();
console.log('Conectado ao Supabase');

// IDs dos usuários (do Supabase Auth)
const adminId = 'dd8d4df9-a15b-434c-b254-8e27c270cf9a';
const tecnicoId = '41fad381-65bd-4563-b7ca-2975358d3865';
const usuarioId = '8b981ad0-fa28-43f8-99f1-3843a245bcb1';

// =====================================================
// TICKETS DE EXEMPLO
// =====================================================
const tickets = [
  {
    id: uuidv4(), number: '#000001', title: 'Computador não liga após atualização',
    description: 'Meu computador não está ligando depois que fiz a atualização do Windows ontem à noite. A luz da placa-mãe acende mas o monitor fica preto.',
    status: 'open', priority: 'high',
    user_id: usuarioId, user_name: 'Maria Santos', user_email: 'usuario@exemplo.com', user_phone: '(11) 99999-0001',
    category_name: 'TI / Infraestrutura', source: 'web'
  },
  {
    id: uuidv4(), number: '#000002', title: 'Erro ao acessar sistema financeiro',
    description: 'Ao tentar acessar o módulo de faturamento, aparece erro 500. Preciso gerar as notas fiscais de hoje.',
    status: 'in_progress', priority: 'emergency',
    agent_id: tecnicoId, agent_name: 'João Silva',
    user_id: usuarioId, user_name: 'Carlos Oliveira', user_email: 'carlos@empresa.com',
    category_name: 'Sistemas / Software', source: 'email'
  },
  {
    id: uuidv4(), number: '#000003', title: 'Solicitação de acesso ao novo sistema',
    description: 'Preciso de acesso ao sistema de gestão de projetos para acompanhar as tarefas da minha equipe.',
    status: 'waiting', priority: 'normal',
    agent_id: tecnicoId, agent_name: 'João Silva',
    user_id: usuarioId, user_name: 'Ana Costa', user_email: 'ana@empresa.com',
    category_name: 'Sistemas / Software', source: 'web'
  },
  {
    id: uuidv4(), number: '#000004', title: 'Impressora não imprime',
    description: 'A impressora do setor financeiro parou de imprimir. Já verifiquei conexão e está tudo ok.',
    status: 'open', priority: 'low',
    user_id: usuarioId, user_name: 'Pedro Lima', user_email: 'pedro@empresa.com',
    category_name: 'TI / Infraestrutura', source: 'phone'
  },
  {
    id: uuidv4(), number: '#000005', title: 'Falha no sistema de email',
    description: 'Não estou conseguindo enviar emails pelo Outlook. Recebo erro de timeout.',
    status: 'pending_approval', priority: 'high',
    agent_id: tecnicoId, agent_name: 'João Silva',
    user_id: usuarioId, user_name: 'Fernanda Souza', user_email: 'fernanda@empresa.com',
    category_name: 'TI / Infraestrutura', source: 'whatsapp'
  },
  {
    id: uuidv4(), number: '#000006', title: 'Dúvida sobre férias',
    description: 'Gostaria de saber como solicitar férias pelo sistema e quais são os prazos.',
    status: 'resolved', priority: 'low',
    agent_id: tecnicoId, agent_name: 'João Silva',
    user_id: usuarioId, user_name: 'Roberto Alves', user_email: 'roberto@empresa.com',
    category_name: 'RH / Departamento Pessoal', source: 'web',
    closed_date: new Date().toISOString()
  },
  {
    id: uuidv4(), number: '#000007', title: 'Servidor principal fora do ar',
    description: 'O servidor principal está respondendo com timeout. Todos os sistemas estão indisponíveis.',
    status: 'in_progress', priority: 'emergency',
    agent_id: adminId, agent_name: 'Administrador',
    user_id: usuarioId, user_name: 'TI Geral', user_email: 'ti@empresa.com',
    category_name: 'TI / Infraestrutura', source: 'api'
  },
  {
    id: uuidv4(), number: '#000008', title: 'Solicitação de novo notebook',
    description: 'Preciso de um notebook novo para o estágiario que vai entrar na próxima semana.',
    status: 'closed', priority: 'normal',
    agent_id: tecnicoId, agent_name: 'João Silva',
    user_id: usuarioId, user_name: 'Marcos Vieira', user_email: 'marcos@empresa.com',
    category_name: 'TI / Infraestrutura', source: 'web',
    closed_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: uuidv4(), number: '#000009', title: 'VPN não conecta',
    description: 'Não consigo conectar na VPN para trabalhar remotamente. Já tentei reiniciar o computador.',
    status: 'open', priority: 'high',
    user_id: usuarioId, user_name: 'Juliana Mendes', user_email: 'juliana@empresa.com',
    category_name: 'TI / Infraestrutura', source: 'email'
  },
  {
    id: uuidv4(), number: '#000010', title: 'Atualização do software de controle de ponto',
    description: 'O software de controle de ponto precisa ser atualizado para a nova versão que inclui o vale-transporte.',
    status: 'waiting', priority: 'normal',
    agent_id: tecnicoId, agent_name: 'João Silva',
    user_id: usuarioId, user_name: 'Patricia Ramos', user_email: 'patricia@empresa.com',
    category_name: 'Sistemas / Software', source: 'web'
  },
];

console.log('Inserindo tickets...');
for (const t of tickets) {
  const { id, ...data } = t;
  await c.query(
    `INSERT INTO tickets (id, number, title, description, status, priority, agent_id, agent_name, user_id, user_name, user_email, user_phone, category_name, source, closed_date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [id, data.number, data.title, data.description, data.status, data.priority,
     data.agent_id || null, data.agent_name || null,
     data.user_id || null, data.user_name || null, data.user_email || null, data.user_phone || null,
     data.category_name || null, data.source || 'web', data.closed_date || null,
     new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()]
  );
  console.log(`  ✅ ${data.number} - ${data.title}`);
}

// =====================================================
// MENSAGENS DOS TICKETS
// =====================================================
const ticketIds = tickets.map(t => t.id);
const messages = [
  { ticket_id: ticketIds[0], sender_type: 'user', sender_name: 'Maria Santos', body: 'Meu computador não está ligando depois que fiz a atualização do Windows ontem à noite.', is_internal: false },
  { ticket_id: ticketIds[0], sender_type: 'system', sender_name: 'Sistema', body: 'Ticket criado via portal web.', is_internal: false },
  { ticket_id: ticketIds[1], sender_type: 'agent', sender_id: tecnicoId, sender_name: 'João Silva', body: 'Bom dia Carlos, estou verificando o problema. Qual é a mensagem de erro exata?', is_internal: false },
  { ticket_id: ticketIds[1], sender_type: 'user', sender_name: 'Carlos Oliveira', body: 'Aparece "HTTP 500 - Internal Server Error" ao clicar em "Gerar Notas Fiscais".', is_internal: false },
  { ticket_id: ticketIds[1], sender_type: 'agent', sender_id: tecnicoId, sender_name: 'João Silva', body: 'Entendido. Vou verificar o servidor. Pode aguardar alguns minutos?', is_internal: false },
  { ticket_id: ticketIds[1], sender_type: 'agent', sender_id: tecnicoId, sender_name: 'João Silva', body: '[Nota Interna] O servidor de aplicação está com alto uso de CPU. Parece ser um processo travado.', is_internal: true },
  { ticket_id: ticketIds[2], sender_type: 'agent', sender_id: tecnicoId, sender_name: 'João Silva', body: 'Olá Ana, vou solicitar o acesso para você. Qual projeto específico você precisa acessar?', is_internal: false },
  { ticket_id: ticketIds[2], sender_type: 'user', sender_name: 'Ana Costa', body: 'Preciso acessar o projeto "Migração ERP 2024".', is_internal: false },
  { ticket_id: ticketIds[3], sender_type: 'user', sender_name: 'Pedro Lima', body: 'A impressora HP do 3º andar parou de imprimir. A luz verde está acesa mas nada sai.', is_internal: false },
  { ticket_id: ticketIds[5], sender_type: 'agent', sender_id: tecnicoId, sender_name: 'João Silva', body: 'Olá Roberto! As férias devem ser solicitadas com 30 dias de antecedência pelo portal do colaborador. O prazo para férias coletivas é até dia 15/07.', is_internal: false },
  { ticket_id: ticketIds[5], sender_type: 'user', sender_name: 'Roberto Alves', body: 'Muito obrigado pela informação!', is_internal: false },
  { ticket_id: ticketIds[6], sender_type: 'agent', sender_id: adminId, sender_name: 'Administrador', body: 'URGENTE: Servidor principal com falha no disco RAID. Iniciando procedimento de recuperação.', is_internal: false },
  { ticket_id: ticketIds[6], sender_type: 'agent', sender_id: adminId, sender_name: 'Administrador', body: '[Nota Interna] Disco sdb1 com 98% de uso. Precisa de limpeza urgente ou expansão de disco.', is_internal: true },
];

console.log('Inserindo mensagens...');
for (const m of messages) {
  await c.query(
    `INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, body, is_internal, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [uuidv4(), m.ticket_id, m.sender_type, m.sender_id || null, m.sender_name, m.body, m.is_internal,
     new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString()]
  );
}
console.log(`  ✅ ${messages.length} mensagens inseridas`);

// =====================================================
// CATEGORIAS ADICIONAIS
// =====================================================
const existingCats = await c.query('SELECT name FROM categories');
const existingCatNames = existingCats.rows.map(r => r.name);

const extraCats = [
  { name: 'Segurança da Informação', description: 'Antivírus, firewall, acessos', color: '#ef4444' },
  { name: 'Telecomunicações', description: 'Telefonia, ramal, internet', color: '#06b6d4' },
];

for (const cat of extraCats) {
  if (!existingCatNames.includes(cat.name)) {
    await c.query('INSERT INTO categories (name, description, color) VALUES ($1, $2, $3)', [cat.name, cat.description, cat.color]);
    console.log(`  ✅ Categoria: ${cat.name}`);
  }
}

// =====================================================
// DEPARTAMENTOS ADICIONAIS
// =====================================================
const existingDepts = await c.query('SELECT name FROM departments');
const existingDeptNames = existingDepts.rows.map(r => r.name);

const extraDepts = [
  { name: 'Marketing', description: 'Marketing e comunicação' },
  { name: 'Vendas', description: 'Departamento comercial' },
  { name: 'Operações', description: 'Operações gerais' },
];

for (const dept of extraDepts) {
  if (!existingDeptNames.includes(dept.name)) {
    await c.query('INSERT INTO departments (name, description) VALUES ($1, $2)', [dept.name, dept.description]);
    console.log(`  ✅ Departamento: ${dept.name}`);
  }
}

// =====================================================
// HELP TOPICS
// =====================================================
const cats = await c.query('SELECT id, name FROM categories');
const depts = await c.query('SELECT id, name FROM departments');
const sla = await c.query('SELECT id FROM sla_plans WHERE is_default = true LIMIT 1');
const slaId = sla.rows[0]?.id;

const topics = [
  { name: 'Computador não liga', category: 'TI / Infraestrutura', department: 'Suporte Técnico' },
  { name: 'Erro em sistema web', category: 'Sistemas / Software', department: 'Desenvolvimento' },
  { name: 'Solicitação de acesso', category: 'Sistemas / Software', department: 'Desenvolvimento' },
  { name: 'Impressora com problema', category: 'TI / Infraestrutura', department: 'Suporte Técnico' },
  { name: 'Problema com email', category: 'TI / Infraestrutura', department: 'Suporte Técnico' },
  { name: 'Dúvida sobre férias', category: 'RH / Departamento Pessoal', department: 'Administrativo' },
  { name: 'Servidor fora do ar', category: 'TI / Infraestrutura', department: 'Suporte Técnico' },
  { name: 'Solicitação de equipamento', category: 'TI / Infraestrutura', department: 'Suporte Técnico' },
  { name: 'VPN não conecta', category: 'TI / Infraestrutura', department: 'Suporte Técnico' },
  { name: 'Atualização de software', category: 'Sistemas / Software', department: 'Desenvolvimento' },
];

console.log('Inserindo help topics...');
for (const topic of topics) {
  const catId = cats.rows.find(r => r.name === topic.category)?.id;
  const deptId = depts.rows.find(r => r.name === topic.department)?.id;
  await c.query(
    'INSERT INTO help_topics (id, name, category_id, department_id, sla_plan_id) VALUES ($1, $2, $3, $4, $5)',
    [uuidv4(), topic.name, catId || null, deptId || null, slaId || null]
  );
}
console.log(`  ✅ ${topics.length} tópicos inseridos`);

// =====================================================
// KB CATEGORIES
// =====================================================
const kbCats = [
  { name: 'Guias de Uso', description: 'Guias para uso dos sistemas' },
  { name: 'Perguntas Frequentes', description: 'Dúvidas comuns dos usuários' },
  { name: 'Procedimentos', description: 'Procedimentos padrão' },
  { name: 'Políticas', description: 'Políticas da empresa' },
];

console.log('Inserindo KB categories...');
for (const cat of kbCats) {
  await c.query('INSERT INTO kb_categories (name, description) VALUES ($1, $2)', [cat.name, cat.description]);
}
console.log(`  ✅ ${kbCats.length} categorias KB inseridas`);

// =====================================================
// KB ARTICLES
// =====================================================
const kbCatsData = await c.query('SELECT id, name FROM kb_categories');
const articles = [
  { title: 'Como solicitar férias', content: 'Acesse o portal do colaborador > Férias > Nova Solicitação. O prazo é de 30 dias de antecedência.', category: 'Guias de Uso' },
  { title: 'Como conectar na VPN', content: '1. Abra o programa Cisco AnyConnect\n2. Digite o endereço: vpn.empresa.com\n3. Use seu email corporativo e senha\n4. Clique em Connect', category: 'Guias de Uso' },
  { title: 'Senha do WiFi corporativo', content: 'A rede é: Empresa-Corp\nSenha: Emp@2024!\nPara visitantes: Empresa-Visit (senha na recepção)', category: 'Perguntas Frequentes' },
  { title: 'Horário de expediente', content: 'Segunda a Sexta: 08h às 18h\nSábado: 08h às 12h\nAlmoço: 12h às 13h', category: 'Perguntas Frequentes' },
  { title: 'Protocolo de segurança da informação', content: '1. Nunca compartilhe senhas\n2. Use autenticação de dois fatores\n3. Não abra emails suspeitos\n4. Reporte incidentes imediatamente', category: 'Políticas' },
];

console.log('Inserindo KB articles...');
for (const art of articles) {
  const catId = kbCatsData.rows.find(r => r.name === art.category)?.id;
  await c.query(
    'INSERT INTO kb_articles (title, content, category_id, author_id, status) VALUES ($1, $2, $3, $4, $5)',
    [art.title, art.content, catId || null, adminId, 'published']
  );
}
console.log(`  ✅ ${articles.length} artigos KB inseridos`);

// =====================================================
// CANNED RESPONSES
// =====================================================
const responses = [
  { title: 'Saudação inicial', content: 'Olá! Bem-vindo ao suporte FlowDesk. Como posso ajudá-lo hoje?' },
  { title: 'Aguarde verificação', content: 'Obrigado pela informação. Estou verificando o problema. Por favor, aguarde alguns minutos.' },
  { title: 'Solução reiniciar', content: 'Para resolver, reinicie o computador segurando o botão de ligar por 10 segundos. Se persistir, nos avise.' },
  { title: 'Senha padrão WiFi', content: 'A rede é Empresa-Corp com senha Emp@2024!' },
  { title: 'Horário de atendimento', content: 'Nosso horário de atendimento é de segunda a sexta, das 08h às 18h.' },
];

console.log('Inserindo canned responses...');
for (const r of responses) {
  await c.query('INSERT INTO canned_responses (title, content) VALUES ($1, $2)', [r.title, r.content]);
}
console.log(`  ✅ ${responses.length} respostas rápidas inseridas`);

// =====================================================
// ORGANIZATIONS
// =====================================================
const orgs = [
  { name: 'Empresa ABC Ltda', document: '12.345.678/0001-90', email: 'contato@abc.com', phone: '(11) 3333-0001' },
  { name: 'Tech Solutions SA', document: '98.765.432/0001-10', email: 'suporte@techsol.com', phone: '(21) 4444-0002' },
  { name: 'Comércio Digital Ltda', document: '45.678.901/0001-23', email: 'adm@comerciodigital.com', phone: '(41) 6666-0004' },
];

console.log('Inserindo organizations...');
for (const org of orgs) {
  await c.query('INSERT INTO organizations (name, document, email, phone) VALUES ($1, $2, $3, $4)', [org.name, org.document, org.email, org.phone]);
}
console.log(`  ✅ ${orgs.length} organizações inseridas`);

await c.end();
console.log('\n🎉 Todos os dados de exemplo inseridos com sucesso!');
