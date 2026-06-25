# FlowDesk Server

Backend completo para o sistema de tickets FlowDesk.

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+

## Instalação

```bash
cd server
npm install
```

## Configuração

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Variáveis obrigatórias:
- `DATABASE_URL` - URL de conexão com PostgreSQL
- `JWT_SECRET` - Segredo para tokens JWT
- `CORS_ORIGIN` - URL do frontend (http://localhost:5173)

## Banco de Dados

### Criar banco no PostgreSQL

```sql
CREATE DATABASE flowdesk;
CREATE USER flowdesk WITH PASSWORD 'flowdesk123';
GRANT ALL PRIVILEGES ON DATABASE flowdesk TO flowdesk;
```

### Executar migrações

```bash
npm run migrate
```

### Popular dados iniciais

```bash
npm run seed
```

## Iniciar Servidor

```bash
# Desenvolvimento (com hot reload)
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
