/*
# KAIRO — Storage bucket for medical documents

Creates a private storage bucket 'medical_documents' for uploading patient files.
Adds storage policies so each authenticated user can only manage their own files
within a user-scoped folder path (user_id/filename).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical_documents', 'medical_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload files to their own folder
DROP POLICY IF EXISTS "users_upload_own_docs" ON storage.objects;
CREATE POLICY "users_upload_own_docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read their own files
DROP POLICY IF EXISTS "users_read_own_docs" ON storage.objects;
CREATE POLICY "users_read_own_docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'medical_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can update their own files
DROP POLICY IF EXISTS "users_update_own_docs" ON storage.objects;
CREATE POLICY "users_update_own_docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'medical_documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'medical_documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own files
DROP POLICY IF EXISTS "users_delete_own_docs" ON storage.objects;
CREATE POLICY "users_delete_own_docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'medical_documents' AND (storage.foldername(name))[1] = auth.uid()::text);
