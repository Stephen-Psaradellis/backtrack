-- GDPR account deletion improvements
-- Adds missing tables and auth deletion tracking

-- Track when auth.users record is deleted (separate from data deletion)
ALTER TABLE scheduled_account_deletions
  ADD COLUMN IF NOT EXISTS auth_deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN scheduled_account_deletions.auth_deleted_at IS
  'Timestamp when the auth.users record was deleted. NULL means only data was deleted.';

-- Update delete_user_account function to include missing tables
-- Makes deletion robust by checking table existence
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the user being deleted or service role
  IF auth.uid() != target_user_id AND NOT (SELECT auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own account';
  END IF;

  -- Delete from all user-related tables (with existence checks for robustness)

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    DELETE FROM messages WHERE sender_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    DELETE FROM conversations WHERE producer_id = target_user_id OR consumer_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
    DELETE FROM posts WHERE producer_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'checkins') THEN
    DELETE FROM checkins WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_checkins') THEN
    DELETE FROM user_checkins WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blocks') THEN
    DELETE FROM blocks WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
    DELETE FROM reports WHERE reporter_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expo_push_tokens') THEN
    DELETE FROM expo_push_tokens WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_photos') THEN
    DELETE FROM profile_photos WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'favorite_locations') THEN
    DELETE FROM favorite_locations WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences') THEN
    DELETE FROM notification_preferences WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_event_tokens') THEN
    DELETE FROM user_event_tokens WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'match_notifications') THEN
    DELETE FROM match_notifications WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'terms_acceptance') THEN
    DELETE FROM terms_acceptance WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'frequent_locations') THEN
    DELETE FROM frequent_locations WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'spark_notifications_sent') THEN
    DELETE FROM spark_notifications_sent WHERE user_id = target_user_id;
  END IF;

  -- NEW: Missing tables from original function
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'location_visit_history') THEN
    DELETE FROM location_visit_history WHERE user_id = target_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'location_visits') THEN
    DELETE FROM location_visits WHERE user_id = target_user_id;
  END IF;

  -- Delete profile last (other tables may reference it via FK)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    DELETE FROM profiles WHERE id = target_user_id;
  END IF;

  RAISE NOTICE 'Successfully deleted all data for user %', target_user_id;
END;
$$;

COMMENT ON FUNCTION delete_user_account IS
  'GDPR-compliant account deletion. Removes all user data from 18 tables. Includes existence checks for robustness. SECURITY DEFINER allows deletion of data the user owns but may not have direct DELETE grants on.';
