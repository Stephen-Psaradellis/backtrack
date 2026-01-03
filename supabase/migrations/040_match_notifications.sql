-- ============================================================================
-- Match Notifications Schema Migration
-- ============================================================================
-- This migration creates the infrastructure for sending push notifications
-- to users with verified check-ins when a new post is created at their location.
--
-- Key components:
-- 1. Table to track sent notifications (prevent duplicates)
-- 2. Function to find users who should be notified
-- 3. Function to queue notifications (called by Edge Function trigger)
--
-- Note: The actual push notification sending is done by an Edge Function
-- that is triggered by a webhook or scheduled job, not a database trigger,
-- to avoid blocking post creation.
-- ============================================================================

-- ============================================================================
-- MATCH_NOTIFICATIONS TABLE
-- ============================================================================
-- Tracks notifications sent for post matches to prevent duplicates

CREATE TABLE IF NOT EXISTS match_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    checkin_id UUID REFERENCES user_checkins(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL DEFAULT 'tier_1_match',
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- Prevent duplicate notifications for same post/user
    CONSTRAINT match_notifications_unique UNIQUE(post_id, user_id)
);

-- Comments
COMMENT ON TABLE match_notifications IS 'Tracks match notifications sent to users for tiered matching';
COMMENT ON COLUMN match_notifications.post_id IS 'Post that triggered the notification';
COMMENT ON COLUMN match_notifications.user_id IS 'User who received the notification';
COMMENT ON COLUMN match_notifications.checkin_id IS 'Check-in that qualified the user for Tier 1 match';
COMMENT ON COLUMN match_notifications.notification_type IS 'Type of notification (tier_1_match, etc.)';
COMMENT ON COLUMN match_notifications.sent_at IS 'When the notification was sent';
COMMENT ON COLUMN match_notifications.read_at IS 'When user viewed the notification';
COMMENT ON COLUMN match_notifications.clicked_at IS 'When user clicked/tapped the notification';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_notifications_user
    ON match_notifications(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_notifications_post
    ON match_notifications(post_id);

CREATE INDEX IF NOT EXISTS idx_match_notifications_unread
    ON match_notifications(user_id)
    WHERE read_at IS NULL;

-- RLS
ALTER TABLE match_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_notifications_select_own" ON match_notifications;
CREATE POLICY "match_notifications_select_own"
    ON match_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "match_notifications_update_own" ON match_notifications;
CREATE POLICY "match_notifications_update_own"
    ON match_notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can insert
DROP POLICY IF EXISTS "match_notifications_insert_service" ON match_notifications;
CREATE POLICY "match_notifications_insert_service"
    ON match_notifications
    FOR INSERT
    WITH CHECK (TRUE); -- Will be called by service role from Edge Function

-- ============================================================================
-- GET_TIER_1_MATCHES_FOR_POST FUNCTION
-- ============================================================================
-- Finds users with verified check-ins at the post's location
-- who should receive a Tier 1 match notification.
--
-- Parameters:
--   p_post_id: UUID of the newly created post
--
-- Returns: TABLE of user_ids with check-in details

CREATE OR REPLACE FUNCTION get_tier_1_matches_for_post(
    p_post_id UUID
)
RETURNS TABLE (
    user_id UUID,
    checkin_id UUID,
    checked_in_at TIMESTAMPTZ,
    push_token TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_post posts%ROWTYPE;
    v_sighting_time TIMESTAMPTZ;
BEGIN
    -- Get post details
    SELECT * INTO v_post FROM posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Use sighting_date if available, otherwise created_at
    v_sighting_time := COALESCE(v_post.sighting_date, v_post.created_at);

    RETURN QUERY
    SELECT
        uc.user_id,
        uc.id as checkin_id,
        uc.checked_in_at,
        pt.token as push_token
    FROM user_checkins uc
    -- Join to get push tokens
    LEFT JOIN expo_push_tokens pt ON pt.user_id = uc.user_id
    WHERE
        -- At the post's location
        uc.location_id = v_post.location_id
        -- GPS verified
        AND uc.verified = TRUE
        -- Not the post author
        AND uc.user_id != v_post.producer_id
        -- Check-in overlaps with sighting time (±2 hours)
        AND uc.checked_in_at <= v_sighting_time + INTERVAL '2 hours'
        AND COALESCE(uc.checked_out_at, uc.checked_in_at + INTERVAL '4 hours') >= v_sighting_time - INTERVAL '2 hours'
        -- Not already notified for this post
        AND NOT EXISTS (
            SELECT 1 FROM match_notifications mn
            WHERE mn.post_id = p_post_id AND mn.user_id = uc.user_id
        )
        -- Not blocked
        AND NOT EXISTS (
            SELECT 1 FROM blocks b
            WHERE (b.blocker_id = uc.user_id AND b.blocked_id = v_post.producer_id)
               OR (b.blocker_id = v_post.producer_id AND b.blocked_id = uc.user_id)
        )
        -- Has push notifications enabled
        AND EXISTS (
            SELECT 1 FROM notification_preferences np
            WHERE np.user_id = uc.user_id
                AND (np.match_notifications = TRUE OR np.match_notifications IS NULL)
        )
    -- Only users with valid push tokens
    AND pt.token IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION get_tier_1_matches_for_post(UUID) IS
    'Finds users with verified check-ins who should receive Tier 1 match notification for a post.';

-- ============================================================================
-- RECORD_MATCH_NOTIFICATION FUNCTION
-- ============================================================================
-- Records that a notification was sent to prevent duplicates.
--
-- Parameters:
--   p_post_id: UUID of the post
--   p_user_id: UUID of the user notified
--   p_checkin_id: UUID of the matching check-in
--
-- Returns: UUID of the notification record

CREATE OR REPLACE FUNCTION record_match_notification(
    p_post_id UUID,
    p_user_id UUID,
    p_checkin_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO match_notifications (
        post_id,
        user_id,
        checkin_id,
        notification_type
    ) VALUES (
        p_post_id,
        p_user_id,
        p_checkin_id,
        'tier_1_match'
    )
    ON CONFLICT (post_id, user_id) DO NOTHING
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION record_match_notification(UUID, UUID, UUID) IS
    'Records that a match notification was sent. Returns null if already sent.';

-- ============================================================================
-- MARK_NOTIFICATION_READ FUNCTION
-- ============================================================================
-- Marks a notification as read.

CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE match_notifications
    SET read_at = NOW()
    WHERE id = p_notification_id
        AND user_id = auth.uid()
        AND read_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION mark_notification_read(UUID) IS
    'Marks a match notification as read.';

-- ============================================================================
-- MARK_NOTIFICATION_CLICKED FUNCTION
-- ============================================================================
-- Marks a notification as clicked (also marks as read if not already).

CREATE OR REPLACE FUNCTION mark_notification_clicked(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated BOOLEAN;
BEGIN
    UPDATE match_notifications
    SET clicked_at = NOW(),
        read_at = COALESCE(read_at, NOW())
    WHERE id = p_notification_id
        AND user_id = auth.uid();

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION mark_notification_clicked(UUID) IS
    'Marks a match notification as clicked.';

-- ============================================================================
-- GET_MY_MATCH_NOTIFICATIONS FUNCTION
-- ============================================================================
-- Gets match notifications for the current user.

CREATE OR REPLACE FUNCTION get_my_match_notifications(
    p_limit INTEGER DEFAULT 20,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    notification_id UUID,
    post_id UUID,
    location_name TEXT,
    notification_type TEXT,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mn.id as notification_id,
        mn.post_id,
        l.name as location_name,
        mn.notification_type,
        mn.sent_at,
        mn.read_at
    FROM match_notifications mn
    JOIN posts p ON p.id = mn.post_id
    JOIN locations l ON l.id = p.location_id
    WHERE mn.user_id = auth.uid()
        AND (NOT p_unread_only OR mn.read_at IS NULL)
    ORDER BY mn.sent_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_my_match_notifications(INTEGER, BOOLEAN) IS
    'Gets match notifications for the current user.';
