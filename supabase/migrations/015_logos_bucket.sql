INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_auth_insert" ON storage.objects;
CREATE POLICY "logos_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "logos_auth_update" ON storage.objects;
CREATE POLICY "logos_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "logos_auth_delete" ON storage.objects;
CREATE POLICY "logos_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
