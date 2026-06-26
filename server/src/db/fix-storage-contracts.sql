-- FlowDesk - Criar bucket de storage para contratos
-- Execute no SQL Editor do Supabase Dashboard

-- Criar bucket para anexos de contratos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contract-attachments', 'contract-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contract-attachments' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contract-attachments' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contract-attachments' AND auth.role() = 'authenticated'
  );
