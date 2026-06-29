-- ============================================
-- SUPABASE: Limpeza automática de Auth ao deletar usuário
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Criar função do trigger que deleta do auth.users
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Deleta o registro correspondente no auth.users
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Se falhar, loga mas não bloqueia a exclusão da tabela users
  RAISE NOTICE 'Aviso: Não foi possível remover do auth.users: %', SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar o trigger que dispara após DELETE na tabela users
DROP TRIGGER IF EXISTS on_user_deleted ON public.users;

CREATE TRIGGER on_user_deleted
  AFTER DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();
