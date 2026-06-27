-- FlowDesk - Criar bucket avatars no Supabase Storage
-- Execute no SQL Editor do Supabase

-- Criar bucket avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar view" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;

-- Qualquer usuário autenticado pode visualizar avatares
CREATE POLICY "Avatar view" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Usuários autenticados podem fazer upload
CREATE POLICY "Avatar upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Usuários podem atualizar seus próprios avatares
CREATE POLICY "Avatar update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Usuários podem deletar avatares
CREATE POLICY "Avatar delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
