-- ============================================================================
-- Match Notification Trigger Wiring (Feature 2.8)
-- ============================================================================
-- Migration 040 added the get_tier_1_matches_for_post RPC and the
-- match_notifications dedupe table, and the send-match-notification edge
-- function exists at supabase/functions/send-match-notification, but no
-- trigger ever fired the edge function on post insert. Result: feature 2.8
-- (proactive "Someone might be looking for you" pushes) was dead code.
--
-- This migration mirrors the spark notification pattern from migration 032
-- but uncommented and with the match URL.
--
-- Runtime config required (set in production via SQL):
--   INSERT INTO app_configuration (key, value) VALUES
--     ('match_notification_url',
--      'https://<project-ref>.supabase.co/functions/v1/send-match-notification'),
--     ('service_role_key', '<service-role-jwt>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- The trigger no-ops gracefully if either config row is missing or still
-- contains the YOUR_PROJECT_REF placeholder, so it is safe to deploy this
-- migration before configuring the URL.
--
-- pg_net dependency: this migration assumes the pg_net extension is enabled
-- (it is — used by the spark trigger pattern in migration 032).
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_match_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_edge_function_url TEXT;
    v_service_role_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Only fire when the new post has a location
    IF NEW.location_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Skip resolved/inactive posts (defensive — INSERT path is the common case)
    IF NEW.is_active IS NOT TRUE OR NEW.resolved_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT value INTO v_edge_function_url
    FROM app_configuration
    WHERE key = 'match_notification_url';

    SELECT value INTO v_service_role_key
    FROM app_configuration
    WHERE key = 'service_role_key';

    -- No-op if config missing or still a placeholder
    IF v_edge_function_url IS NULL
       OR v_edge_function_url = ''
       OR v_edge_function_url LIKE '%YOUR_PROJECT_REF%'
       OR v_service_role_key IS NULL
       OR v_service_role_key = ''
    THEN
        RETURN NEW;
    END IF;

    -- Fire-and-forget HTTP call. pg_net is async so this does not block
    -- post creation even if the edge function is slow.
    SELECT net.http_post(
        url := v_edge_function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
            'postId', NEW.id,
            'locationId', NEW.location_id
        )
    ) INTO v_request_id;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_match_notification() IS
    'Fires send-match-notification edge function on post insert. No-ops if app_configuration is unset or contains placeholders.';

DROP TRIGGER IF EXISTS on_post_created_match ON posts;
CREATE TRIGGER on_post_created_match
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_match_notification();

-- Seed an empty service_role_key row so prod admins can update it without
-- having to know the schema. The trigger treats empty string as missing.
INSERT INTO app_configuration (key, value)
VALUES ('service_role_key', '')
ON CONFLICT (key) DO NOTHING;
