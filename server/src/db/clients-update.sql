-- ============================================================
-- FlowDesk - Atualização da tabela clients para cadastro de empresas
-- ============================================================

-- Adicionar colunas novas
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

-- Migrar dados existentes
UPDATE public.clients SET
  razao_social = COALESCE(razao_social, company),
  cnpj = COALESCE(cnpj, document),
  telefone = COALESCE(telefone, phone),
  email_financeiro = COALESCE(email_financeiro, email),
  observacoes = COALESCE(observacoes, notes)
WHERE razao_social IS NULL OR cnpj IS NULL;

-- Criar índice para CNPJ
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients(cnpj);

-- Comentários
COMMENT ON COLUMN public.clients.razao_social IS 'Razão social da empresa';
COMMENT ON COLUMN public.clients.nome_fantasia IS 'Nome de fantasia da empresa';
COMMENT ON COLUMN public.clients.endereco IS 'Endereço completo da empresa';
COMMENT ON COLUMN public.clients.cidade IS 'Cidade da empresa';
COMMENT ON COLUMN public.clients.estado IS 'Estado (UF) da empresa';
COMMENT ON COLUMN public.clients.cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN public.clients.inscricao_estadual IS 'Inscrição estadual da empresa';
COMMENT ON COLUMN public.clients.contato_principal IS 'Nome do contato principal';
COMMENT ON COLUMN public.clients.telefone IS 'Telefone de contato';
COMMENT ON COLUMN public.clients.email_financeiro IS 'Email financeiro da empresa';
COMMENT ON COLUMN public.clients.observacoes IS 'Observações gerais sobre a empresa';