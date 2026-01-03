-- ============================================================================
-- Post Responses Schema Migration
-- ============================================================================
-- This migration creates the verification_tier enum and post_responses table
-- for tracking how users respond to posts with different levels of verification.
--
-- Verification Tiers:
-- - verified_checkin: User was GPS-verified at the location during sighting window
-- - regular_spot: Location is one of user's saved favorites
-- - unverified_claim: User claims presence without verification
--
-- Key features:
-- - Tracks which tier a response belongs to
-- - Links to check-in record for Tier 1 verification
-- - Prevents duplicate responses (one per user per post)
-- - Enables producers to see trust level of responders
-- ============================================================================

-- ============================================================================
-- VERIFICATION_TIER ENUM
-- ============================================================================
-- Represents the three tiers of response verification

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_tier') THEN
        CREATE TYPE verification_tier AS ENUM (
            'verified_checkin',   -- Tier 1: GPS-verified check-in during time window
            'regular_spot',       -- Tier 2: Location is in user's favorites
            'unverified_claim'    -- Tier 3: User claims presence without verification
        );
    END IF;
END$$;

COMMENT ON TYPE verification_tier IS 'Verification tier for post responses: verified_checkin (Tier 1), regular_spot (Tier 2), unverified_claim (Tier 3)';

-- ============================================================================
-- POST_RESPONSES TABLE
-- ============================================================================
-- Tracks responses to posts with their verification tier

CREATE TABLE IF NOT EXISTS post_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    responder_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

    -- Verification tier
    verification_tier verification_tier NOT NULL,
    checkin_id UUID REFERENCES user_checkins(id), -- Only for Tier 1

    -- Response content
    message TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,

    -- Prevent duplicate responses from same user to same post
    CONSTRAINT post_responses_unique UNIQUE(post_id, responder_id)
);

-- Comments
COMMENT ON TABLE post_responses IS 'Tracks user responses to posts with verification tier for trust signaling';
COMMENT ON COLUMN post_responses.id IS 'Unique identifier for the response';
COMMENT ON COLUMN post_responses.post_id IS 'Post being responded to';
COMMENT ON COLUMN post_responses.responder_id IS 'User responding to the post (consumer)';
COMMENT ON COLUMN post_responses.verification_tier IS 'Level of verification for this response';
COMMENT ON COLUMN post_responses.checkin_id IS 'Reference to check-in record (for Tier 1 verified responses)';
COMMENT ON COLUMN post_responses.message IS 'Optional message from responder';
COMMENT ON COLUMN post_responses.status IS 'Response status: pending, accepted, or rejected by producer';
COMMENT ON COLUMN post_responses.created_at IS 'When the response was created';
COMMENT ON COLUMN post_responses.responded_at IS 'When the producer responded to this response';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding responses to a post
CREATE INDEX IF NOT EXISTS idx_post_responses_post
    ON post_responses(post_id);

-- Index for finding responses by a user
CREATE INDEX IF NOT EXISTS idx_post_responses_responder
    ON post_responses(responder_id);

-- Index for tier-based queries (e.g., show verified first)
CREATE INDEX IF NOT EXISTS idx_post_responses_tier
    ON post_responses(post_id, verification_tier);

-- Index for pending responses
CREATE INDEX IF NOT EXISTS idx_post_responses_pending
    ON post_responses(post_id)
    WHERE status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE post_responses ENABLE ROW LEVEL SECURITY;

-- Responders can read their own responses
DROP POLICY IF EXISTS "post_responses_select_responder" ON post_responses;
CREATE POLICY "post_responses_select_responder"
    ON post_responses
    FOR SELECT
    USING (auth.uid() = responder_id);

-- Post authors can read responses to their posts
DROP POLICY IF EXISTS "post_responses_select_producer" ON post_responses;
CREATE POLICY "post_responses_select_producer"
    ON post_responses
    FOR SELECT
    USING (
        auth.uid() = (SELECT producer_id FROM posts WHERE id = post_id)
    );

-- Users can insert responses (will be validated by RPC function)
DROP POLICY IF EXISTS "post_responses_insert" ON post_responses;
CREATE POLICY "post_responses_insert"
    ON post_responses
    FOR INSERT
    WITH CHECK (auth.uid() = responder_id);

-- Post authors can update response status
DROP POLICY IF EXISTS "post_responses_update_producer" ON post_responses;
CREATE POLICY "post_responses_update_producer"
    ON post_responses
    FOR UPDATE
    USING (
        auth.uid() = (SELECT producer_id FROM posts WHERE id = post_id)
    )
    WITH CHECK (
        auth.uid() = (SELECT producer_id FROM posts WHERE id = post_id)
    );

-- Comments on policies
COMMENT ON POLICY "post_responses_select_responder" ON post_responses IS 'Responders can view their own responses';
COMMENT ON POLICY "post_responses_select_producer" ON post_responses IS 'Post authors can view responses to their posts';
COMMENT ON POLICY "post_responses_insert" ON post_responses IS 'Users can create responses (verified via RPC)';
COMMENT ON POLICY "post_responses_update_producer" ON post_responses IS 'Post authors can accept/reject responses';

-- ============================================================================
-- GET_POST_RESPONSES FUNCTION
-- ============================================================================
-- Gets all responses to a specific post with tier information.
-- Only accessible by the post author.
--
-- Parameters:
--   p_post_id: UUID of the post
--
-- Returns: TABLE with response details sorted by tier (verified first)

CREATE OR REPLACE FUNCTION get_post_responses(
    p_post_id UUID
)
RETURNS TABLE (
    response_id UUID,
    responder_id UUID,
    verification_tier verification_tier,
    checkin_id UUID,
    message TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_post posts%ROWTYPE;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get post and verify ownership
    SELECT * INTO v_post FROM posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post not found';
    END IF;

    IF v_post.producer_id != v_current_user_id THEN
        RAISE EXCEPTION 'Not authorized to view responses';
    END IF;

    RETURN QUERY
    SELECT
        pr.id as response_id,
        pr.responder_id,
        pr.verification_tier,
        pr.checkin_id,
        pr.message,
        pr.status,
        pr.created_at
    FROM post_responses pr
    WHERE pr.post_id = p_post_id
    ORDER BY
        -- Tier 1 first, then 2, then 3
        CASE pr.verification_tier
            WHEN 'verified_checkin' THEN 1
            WHEN 'regular_spot' THEN 2
            ELSE 3
        END,
        -- Within tier, most recent first
        pr.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_post_responses(UUID) IS
    'Gets responses to a post sorted by verification tier (verified first). Only accessible by post author.';

-- ============================================================================
-- GET_RESPONSE_COUNTS FUNCTION
-- ============================================================================
-- Gets count of responses by tier for a post.
-- Used to show "3 verified, 5 other responses" type UI.
--
-- Parameters:
--   p_post_id: UUID of the post
--
-- Returns: JSON with counts by tier

CREATE OR REPLACE FUNCTION get_response_counts(
    p_post_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_verified INTEGER;
    v_regular INTEGER;
    v_unverified INTEGER;
    v_post posts%ROWTYPE;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get post and verify ownership
    SELECT * INTO v_post FROM posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Post not found');
    END IF;

    IF v_post.producer_id != v_current_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized');
    END IF;

    -- Count by tier
    SELECT COUNT(*) INTO v_verified
    FROM post_responses
    WHERE post_id = p_post_id AND verification_tier = 'verified_checkin';

    SELECT COUNT(*) INTO v_regular
    FROM post_responses
    WHERE post_id = p_post_id AND verification_tier = 'regular_spot';

    SELECT COUNT(*) INTO v_unverified
    FROM post_responses
    WHERE post_id = p_post_id AND verification_tier = 'unverified_claim';

    RETURN json_build_object(
        'success', true,
        'verified_checkin', v_verified,
        'regular_spot', v_regular,
        'unverified_claim', v_unverified,
        'total', v_verified + v_regular + v_unverified
    );
END;
$$;

COMMENT ON FUNCTION get_response_counts(UUID) IS
    'Gets count of responses to a post grouped by verification tier. Only accessible by post author.';
