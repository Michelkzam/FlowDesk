-- FlowDesk - Function para admin alterar senha de usuário
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuários autenticados chamem a function
GRANT EXECUTE ON FUNCTION admin_update_user_password(UUID, TEXT) TO authenticated;
