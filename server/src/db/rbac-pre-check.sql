-- ============================================================
-- FlowDesk RBAC - Migration Helper
-- Execute este script ANTES do rbac-complete.sql
-- para verificar pré-requisitos
-- ============================================================

-- Verificar se a tabela users existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE EXCEPTION 'Tabela public.users não encontrada. Execute a migração base primeiro.';
  END IF;
END $$;

-- Verificar se auth.users está acessível
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    RAISE EXCEPTION 'Tabela auth.users não encontrada. Supabase Auth não configurado.';
  END IF;
END $$;

-- Verificar tabelas dependentes
DO $$
DECLARE
  missing_tables text[] := ARRAY[]::text[];
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['assets', 'audit_logs', 'contracts', 'clients', 'departments', 'categories'])
  LOOP
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      missing_tables := array_append(missing_tables, t);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'Tabelas ausentes: %. Algumas políticas RLS podem não funcionar.', array_to_string(missing_tables, ', ');
  END IF;
END $$;

SELECT 'Pré-verificação concluída com sucesso!' AS status;
