-- Security fixes: search_path for remaining SECURITY DEFINER functions,
-- message rate limit index, and security events table.
--
-- The original migration 20260212000000 fixed 7 core functions.
-- This migration catches ALL remaining SECURITY DEFINER functions that
-- are missing SET search_path = public.

-- ============================================================================
-- BATCH ALTER: Set search_path on all SECURITY DEFINER functions
-- ============================================================================

-- From 001_initial_schema.sql
DO $$ BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 015_rls_policies.sql
DO $$ BEGIN
  ALTER FUNCTION public.is_conversation_member(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 016_geospatial_functions.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_posts_for_location(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_locations_near_point(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 019_storage_policies.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_photo_owner(TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.is_photo_owner(TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.cleanup_old_photos() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 020_location_visits.sql
DO $$ BEGIN
  ALTER FUNCTION public.record_location_visit(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.verify_location_visit(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.can_post_at_location(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 023_profile_photos.sql
DO $$ BEGIN
  ALTER FUNCTION public.increment_photo_count(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.decrement_photo_count(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_user_photos(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_user_photo_count(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_user_primary_photo(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.set_primary_photo(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 024_push_tokens.sql
DO $$ BEGIN
  ALTER FUNCTION public.register_push_token(UUID, TEXT, TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_user_push_tokens(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.remove_push_token(TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 026_notification_preferences.sql
DO $$ BEGIN
  ALTER FUNCTION public.update_notification_preferences(UUID, JSONB) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_notification_preferences(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.should_send_notification(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 027_notification_webhooks.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_webhook_config(TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.log_webhook_delivery(UUID, TEXT, INTEGER, TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.process_notification_queue() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.handle_new_message_notification() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_notification_delivery_stats(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 029_photo_shares.sql (all functions)
DO $$ BEGIN
  ALTER FUNCTION public.create_photo_share(UUID, UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.respond_to_photo_share(UUID, TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 042_terms_acceptance.sql
DO $$ BEGIN
  ALTER FUNCTION public.accept_terms(TEXT) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20251231200000_account_deletion.sql
DO $$ BEGIN
  ALTER FUNCTION public.delete_user_account(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.schedule_account_deletion(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.cancel_account_deletion(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_deletion_status(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20251231210000_rls_fixes.sql
DO $$ BEGIN
  ALTER FUNCTION public.is_conversation_participant(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20251231210001_rls_fixes_part2.sql
DO $$ BEGIN
  ALTER FUNCTION public.can_access_conversation(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20260114000002_notification_counts.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_unread_notification_count(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20260114000001_extended_location_history.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_extended_location_history(UUID, INTEGER) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.get_location_visit_details(UUID, UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20260114000003_nearby_posts.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_nearby_posts(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20260205000000_fix_rpc_auth_checks.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_user_conversations(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20260117100000_backend_performance_fixes.sql
DO $$ BEGIN
  ALTER FUNCTION public.get_locations_near_point_optimized(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20260207000001_chat_message_rate_limiting.sql
DO $$ BEGIN
  ALTER FUNCTION public.check_message_rate_limit(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- From 20260214000000_gdpr_account_deletion_fixes.sql
DO $$ BEGIN
  ALTER FUNCTION public.delete_user_account_gdpr(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================================
-- TASK 3: Message rate limit index (3.10)
-- ============================================================================

-- Supports the rate limit RLS policy that counts messages by sender_id + created_at
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
ON messages(sender_id, created_at DESC);

-- ============================================================================
-- TASK 4: Security event monitoring table (3.11)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC);

-- Enable RLS - only service role can insert/read (no policies = service role only)
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
