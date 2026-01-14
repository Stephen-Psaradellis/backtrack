-- Configure Edge Function URLs for production
-- This migration sets up the app_configuration table with Edge Function URLs
--
-- IMPORTANT: The URLs below use the project reference. After deploying to a new environment,
-- update these values using:
--   SELECT set_app_config('edge_function_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification');
--   SELECT set_app_config('spark_notification_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-spark-notification');
--   SELECT set_app_config('match_notification_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-match-notification');
--   SELECT set_app_config('moderate_image_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/moderate-image');

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
-- IMPORTANT: These are placeholder values. After deploying, update with your actual project reference:
--   SELECT set_app_config('edge_function_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification');
-- The values below will fail until properly configured.
INSERT INTO app_configuration (key, value) VALUES
  ('edge_function_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification'),
  ('spark_notification_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-spark-notification'),
  ('match_notification_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-match-notification'),
  ('moderate_image_url', 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/moderate-image')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
