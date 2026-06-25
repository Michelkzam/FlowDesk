# FlowDesk Server

Backend completo para o sistema de tickets FlowDesk.

## Pré-requisitos

- Node.js 18+
- Conta no Supabase (https://supabase.com)

## Instalação

```bash
cd server
npm install
```

## Configuração do Supabase

### 1. Criar projeto no Supabase

1. Acesse https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - Project name: `flowdesk`
   - Database Password: (gere uma senha forte)
4. Aguarde a criação do projeto

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:

```env
DATABASE_URL=postgresql://postgres:[SUA_SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres
SUPABASE_URL=https://[SEU_PROJETO].supabase.co
SUPABASE_ANON_KEY=[SUA_ANON_KEY]
SUPABASE_SERVICE_KEY=[SUA_SERVICE_KEY]
```

**Onde encontrar:**
- **DATABASE_URL**: Settings > Database > Connection string > URI
- **SUPABASE_URL**: Settings > API > Project URL
- **SUPABASE_ANON_KEY**: Settings > API > anon public
- **SUPABASE_SERVICE_KEY**: Settings > API > service_role

### 3. Criar tabelas no Supabase

1. Vá em **SQL Editor** no painel do Supabase
2. Clique em "New query"
3. Cole o conteúdo do arquivo `src/db/supabase-schema.sql`
4. Clique em "Run"

### 4. Executar setup

```bash
npm run setup
```

Ou manualmente:

```bash
npm run migrate
npm run seed
```

### 5. Configurar Row Level Security (RLS)

No painel do Supabase:
1. Vá em **Authentication > Policies**
2. Para cada tabela, adicione políticas de acesso:

**Exemplo para tabela "tickets":**
```sql
-- Ver tickets (usuários autenticados)
CREATE POLICY "Authenticated users can view tickets" 
ON tickets FOR SELECT 
USING (auth.role() = 'authenticated');

-- Criar tickets
CREATE POLICY "Authenticated users can create tickets" 
ON tickets FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Atualizar tickets
CREATE POLICY "Authenticated users can update tickets" 
ON tickets FOR UPDATE 
USING (auth.role() = 'authenticated');
```

## Iniciar Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## Usuários Padrão (após seed)

| Email | Senha | Permissão |
|-------|-------|-----------|
| admin@flowdesk.com | admin123 | Admin |
| tecnico@flowdesk.com | tecnico123 | Técnico |
| usuario@exemplo.com | usuario123 | Usuário |

## Estrutura de Tabelas

```
users
  ├── tickets (agent_id, user_id)
  ├── ticket_messages (sender_id)
  ├── audit_logs (user_id)
  ├── departments (manager_id)
  ├── teams (lead_id)
  └── kb_articles (author_id)

categories
  ├── tickets (category_id)
  ├── help_topics (category_id)
  └── kb_categories (category_id)

departments
  ├── tickets (department_id)
  ├── teams (department_id)
  └── help_topics (department_id)

sla_plans
  ├── tickets (sla_plan_id)
  └── help_topics (sla_plan_id)

tickets
  ├── ticket_messages (ticket_id)
  └── tickets (team_id)

organizations
  └── (relacionamento com users)

help_topics
  └── tickets (help_topic_id)

teams
  └── tickets (team_id)
```

## Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Dados do usuário logado
- `PUT /api/auth/profile` - Atualizar perfil
- `PUT /api/auth/password` - Alterar senha

### Tickets
- `GET /api/tickets` - Listar tickets
- `GET /api/tickets/:id` - Buscar ticket
- `POST /api/tickets` - Criar ticket
- `PUT /api/tickets/:id` - Atualizar ticket
- `POST /api/tickets/:id/claim` - Assumir ticket (transacional)
- `POST /api/tickets/:id/transfer` - Transferir ticket
- `GET /api/tickets/:id/messages` - Buscar mensagens
- `POST /api/tickets/:id/messages` - Enviar mensagem

### Categorias
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria (admin)
- `PUT /api/categories/:id` - Atualizar categoria (admin)
- `DELETE /api/categories/:id` - Excluir categoria (admin)

### SLA Plans
- `GET /api/sla-plans` - Listar planos
- `POST /api/sla-plans` - Criar plano (admin)
- `PUT /api/sla-plans/:id` - Atualizar plano (admin)
- `DELETE /api/sla-plans/:id` - Excluir plano (admin)

### Agentes
- `GET /api/agents` - Listar agentes
- `POST /api/agents` - Criar agente (admin)
- `PUT /api/agents/:id` - Atualizar agente (admin)
- `DELETE /api/agents/:id` - Excluir agente (admin)

## WebSocket

Eventos emitidos:
- `ticket:created` - Novo ticket criado
- `ticket:updated` - Ticket atualizado
- `ticket:claimed` - Ticket assumido
- `ticket:transferred` - Ticket transferido
- `ticket:auto-closed` - Ticket fechado por inatividade
- `message:created` - Nova mensagem

## Cron Jobs

- **Auto-close inactive**: Executa diariamente às 02:00, encerrando tickets sem interação do usuário há mais de 5 dias.
