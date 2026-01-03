-- Configure Edge Function URLs for production
-- This migration sets up the app_configuration table with production Edge Function URLs

-- Create app_configuration table if not exists
CREATE TABLE IF NOT EXISTS app_configuration (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE app_configuration ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage configuration
CREATE POLICY "Service role can manage app_configuration" ON app_configuration
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read configuration (non-sensitive keys only)
CREATE POLICY "Authenticated users can read non-sensitive config" ON app_configuration
  FOR SELECT
  TO authenticated
  USING (key NOT LIKE '%key%' AND key NOT LIKE '%secret%');

-- Set the Edge Function URLs
INSERT INTO app_configuration (key, value) VALUES
  ('edge_function_url', 'https://hyidfsfvqlsimefixfhc.supabase.co/functions/v1/send-notification'),
  ('spark_notification_url', 'https://hyidfsfvqlsimefixfhc.supabase.co/functions/v1/send-spark-notification'),
  ('match_notification_url', 'https://hyidfsfvqlsimefixfhc.supabase.co/functions/v1/send-match-notification'),
  ('moderate_image_url', 'https://hyidfsfvqlsimefixfhc.supabase.co/functions/v1/moderate-image')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
