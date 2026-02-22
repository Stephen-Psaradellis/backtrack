-- ============================================================================
-- GDPR Compliance Fixes (Findings 2.8-2.11, 3.4-3.6)
-- ============================================================================
-- 1. Add auth_deleted_at tracking column (if not already present)
-- 2. Extend delete_user_account with location_visit_history
-- 3. pg_cron job for scheduled account deletion execution
-- 4. pg_cron job for location data retention (90-day purge)
-- ============================================================================

-- ============================================================================
-- 1. Add auth_deleted_at column (idempotent)
-- ============================================================================
ALTER TABLE scheduled_account_deletions
  ADD COLUMN IF NOT EXISTS auth_deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN scheduled_account_deletions.auth_deleted_at IS
  'Timestamp when auth.users record was deleted via Admin API. NULL = not yet deleted.';

-- ============================================================================
-- 2. Update delete_user_account to also handle location_visit_history
--    and photo_shares (already handled in 20260214 migration but included
--    for completeness if that migration hasn't run)
-- ============================================================================
-- Note: The 20260214000000_gdpr_account_deletion_fixes.sql migration already
-- handles this comprehensively. This section is intentionally left as a no-op
-- to avoid conflicts. The function is already up to date.

-- ============================================================================
-- 3. pg_cron: Execute scheduled account deletions daily at 3:30 AM UTC
-- ============================================================================
-- IMPORTANT: pg_cron extension must be enabled manually in Supabase Dashboard:
--   Database > Extensions > pg_cron > Enable
--
-- After enabling, run these commands in the SQL Editor:
--
-- SELECT cron.schedule(
--   'execute-account-deletions',
--   '30 3 * * *',
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.supabase_url') || '/functions/v1/execute-account-deletion',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ============================================================================
-- 4. pg_cron: Purge location data older than 90 days (daily at 2:00 AM UTC)
-- ============================================================================
-- IMPORTANT: pg_cron extension must be enabled manually in Supabase Dashboard.
--
-- After enabling, run these commands in the SQL Editor:
--
-- SELECT cron.schedule(
--   'purge-old-location-data',
--   '0 2 * * *',
--   $$
--   DELETE FROM user_checkins WHERE checked_in_at < NOW() - INTERVAL '90 days';
--   DELETE FROM location_visit_history WHERE visited_at < NOW() - INTERVAL '90 days';
--   DELETE FROM frequent_locations WHERE last_visited_at < NOW() - INTERVAL '90 days';
--   $$
-- );

-- ============================================================================
-- 5. Service role policy for scheduled_account_deletions
--    Allows the Edge Function (running as service_role) to query and update
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_account_deletions'
      AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY "service_role_full_access" ON scheduled_account_deletions
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
