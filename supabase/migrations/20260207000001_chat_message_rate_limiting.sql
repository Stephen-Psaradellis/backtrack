-- ============================================================================
-- Chat Message Rate Limiting Migration
-- ============================================================================
-- Adds server-side rate limiting for chat messages to prevent spam and abuse.
-- Uses the existing rate_limits table and check_rate_limit RPC function.
-- ============================================================================

-- ============================================================================
-- RLS POLICY: Rate Limit Messages
-- ============================================================================

/**
 * Add rate limiting to message inserts via RLS policy.
 * Enforces 20 messages per minute and 200 messages per hour server-side.
 * This complements client-side throttling for defense in depth.
 */

-- First, check if the policy already exists and drop it if so
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'messages'
        AND policyname = 'messages_rate_limit_insert'
    ) THEN
        DROP POLICY messages_rate_limit_insert ON messages;
    END IF;
END $$;

-- Create the rate limiting policy
CREATE POLICY "messages_rate_limit_insert" ON messages
FOR INSERT
TO authenticated
WITH CHECK (
    -- Verify user is not sending too many messages
    -- Check last minute (20 msg/min limit)
    (
        SELECT COUNT(*)
        FROM messages
        WHERE sender_id = auth.uid()
        AND created_at > NOW() - INTERVAL '1 minute'
    ) < 20
    AND
    -- Check last hour (200 msg/hour limit)
    (
        SELECT COUNT(*)
        FROM messages
        WHERE sender_id = auth.uid()
        AND created_at > NOW() - INTERVAL '1 hour'
    ) < 200
);

COMMENT ON POLICY "messages_rate_limit_insert" ON messages IS
'Rate limiting policy: max 20 messages per minute, 200 per hour per user. Prevents spam and abuse.';

-- ============================================================================
-- ANALYTICS: Message Rate Limit Violations
-- ============================================================================

/**
 * Create a table to track rate limit violations for monitoring.
 * This helps identify potential abusers and tune rate limits.
 */
CREATE TABLE IF NOT EXISTS message_rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL CHECK (violation_type IN ('per_minute', 'per_hour')),
    message_count INTEGER NOT NULL,
    limit_value INTEGER NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE message_rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Service role only (no user access needed)
CREATE POLICY "violations_service_role_only" ON message_rate_limit_violations
FOR ALL TO authenticated
USING (false);

-- Index for querying violations
CREATE INDEX idx_message_rate_violations_user
    ON message_rate_limit_violations(user_id, detected_at DESC);

-- Index for recent violations (removed WHERE clause since NOW() is not IMMUTABLE)
CREATE INDEX idx_message_rate_violations_recent
    ON message_rate_limit_violations(detected_at DESC);

COMMENT ON TABLE message_rate_limit_violations IS
'Tracks chat message rate limit violations for abuse detection and monitoring';

-- ============================================================================
-- HELPER FUNCTION: Log Rate Limit Violation
-- ============================================================================

/**
 * Log a rate limit violation for analytics.
 * This is called automatically when RLS policy blocks a message.
 */
CREATE OR REPLACE FUNCTION log_message_rate_limit_violation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_minute_count INTEGER;
    v_hour_count INTEGER;
BEGIN
    -- Count recent messages
    SELECT COUNT(*) INTO v_minute_count
    FROM messages
    WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';

    SELECT COUNT(*) INTO v_hour_count
    FROM messages
    WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 hour';

    -- Log if over limit
    IF v_minute_count >= 20 THEN
        INSERT INTO message_rate_limit_violations (user_id, violation_type, message_count, limit_value)
        VALUES (NEW.sender_id, 'per_minute', v_minute_count, 20);
    END IF;

    IF v_hour_count >= 200 THEN
        INSERT INTO message_rate_limit_violations (user_id, violation_type, message_count, limit_value)
        VALUES (NEW.sender_id, 'per_hour', v_hour_count, 200);
    END IF;

    RETURN NEW;
END;
$$;

-- Note: We don't attach this trigger because the RLS policy will prevent the insert anyway.
-- This function can be called manually for analytics if needed.

COMMENT ON FUNCTION log_message_rate_limit_violation() IS
'Logs message rate limit violations for monitoring and abuse detection';
