-- FlowDesk: Adicionar colunas novas na tabela clients
-- Executar no Supabase SQL Editor

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS inscricao_estadual text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contato_principal text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email_financeiro text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS observacoes text;

-- Migrar dados antigos para os novos campos
UPDATE public.clients SET
  razao_social = COALESCE(razao_social, company),
  cnpj = COALESCE(cnpj, document),
  telefone = COALESCE(telefone, phone),
  email_financeiro = COALESCE(email_financeiro, email),
  observacoes = COALESCE(observacoes, notes)
WHERE razao_social IS NULL AND (company IS NOT NULL OR document IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients(cnpj);