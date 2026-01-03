-- ============================================================================
-- Response Flow Schema Migration
-- ============================================================================
-- This migration creates the respond_to_post RPC function which handles
-- the complete flow of a user responding to a post:
--
-- 1. Validates the response is allowed (not own post, not duplicate)
-- 2. Determines the verification tier based on check-in or favorite status
-- 3. Creates a post_response record
-- 4. Creates or updates a conversation with the tier information
--
-- This ensures that when a user responds to a post, their verification
-- level is captured and displayed to the post author.
-- ============================================================================

-- ============================================================================
-- RESPOND_TO_POST FUNCTION
-- ============================================================================
-- Creates a response to a post with appropriate verification tier.
-- Also creates or updates the associated conversation.
--
-- Parameters:
--   p_post_id: UUID of the post to respond to
--   p_message: Optional message from responder
--   p_claimed_checkin_id: Optional check-in ID to claim (for Tier 1)
--
-- Returns: JSON with success, response_id, conversation_id, verification_tier

CREATE OR REPLACE FUNCTION respond_to_post(
    p_post_id UUID,
    p_message TEXT DEFAULT NULL,
    p_claimed_checkin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_post posts%ROWTYPE;
    v_tier verification_tier;
    v_checkin user_checkins%ROWTYPE;
    v_response_id UUID;
    v_conversation_id UUID;
    v_current_user_id UUID;
    v_location locations%ROWTYPE;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get post
    SELECT * INTO v_post FROM posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Post not found');
    END IF;

    -- Can't respond to own post
    IF v_post.producer_id = v_current_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot respond to own post');
    END IF;

    -- Check for existing response
    IF EXISTS (
        SELECT 1 FROM post_responses
        WHERE post_id = p_post_id AND responder_id = v_current_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already responded to this post');
    END IF;

    -- Check for existing conversation
    IF EXISTS (
        SELECT 1 FROM conversations
        WHERE post_id = p_post_id AND consumer_id = v_current_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already in conversation for this post');
    END IF;

    -- Check if blocked
    IF EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = v_current_user_id AND blocked_id = v_post.producer_id)
           OR (blocker_id = v_post.producer_id AND blocked_id = v_current_user_id)
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Cannot respond to this post');
    END IF;

    -- Get location for favorite check
    SELECT * INTO v_location FROM locations WHERE id = v_post.location_id;

    -- Determine verification tier
    IF p_claimed_checkin_id IS NOT NULL THEN
        -- User is claiming a check-in for Tier 1
        SELECT * INTO v_checkin
        FROM user_checkins
        WHERE id = p_claimed_checkin_id
            AND user_id = v_current_user_id;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Invalid check-in');
        END IF;

        IF v_checkin.location_id != v_post.location_id THEN
            RETURN json_build_object('success', false, 'error', 'Check-in location does not match post');
        END IF;

        -- Check if check-in overlaps with post sighting time (±2 hours)
        IF v_checkin.checked_in_at > COALESCE(v_post.sighting_date, v_post.created_at) + INTERVAL '2 hours'
           OR COALESCE(v_checkin.checked_out_at, v_checkin.checked_in_at + INTERVAL '4 hours') < COALESCE(v_post.sighting_date, v_post.created_at) - INTERVAL '2 hours' THEN
            RETURN json_build_object('success', false, 'error', 'Check-in time does not overlap with post');
        END IF;

        IF v_checkin.verified THEN
            v_tier := 'verified_checkin';
        ELSE
            -- Has check-in but not GPS verified - treat as unverified
            v_tier := 'unverified_claim';
        END IF;
    ELSE
        -- Check if user has this as a favorite location
        IF EXISTS (
            SELECT 1 FROM favorite_locations
            WHERE user_id = v_current_user_id
                AND place_id = v_location.google_place_id
        ) THEN
            v_tier := 'regular_spot';
        ELSE
            v_tier := 'unverified_claim';
        END IF;
    END IF;

    -- Create response
    INSERT INTO post_responses (
        post_id,
        responder_id,
        verification_tier,
        checkin_id,
        message,
        status
    ) VALUES (
        p_post_id,
        v_current_user_id,
        v_tier,
        p_claimed_checkin_id,
        p_message,
        'pending'
    )
    RETURNING id INTO v_response_id;

    -- Create conversation with tier
    INSERT INTO conversations (
        post_id,
        producer_id,
        consumer_id,
        verification_tier,
        response_id,
        status,
        producer_accepted
    ) VALUES (
        p_post_id,
        v_post.producer_id,
        v_current_user_id,
        v_tier,
        v_response_id,
        'pending',
        FALSE
    )
    RETURNING id INTO v_conversation_id;

    RETURN json_build_object(
        'success', true,
        'response_id', v_response_id,
        'conversation_id', v_conversation_id,
        'verification_tier', v_tier
    );
END;
$$;

COMMENT ON FUNCTION respond_to_post(UUID, TEXT, UUID) IS
    'Creates a response to a post with appropriate verification tier. Creates the conversation. Returns response_id, conversation_id, and tier.';

-- ============================================================================
-- UPDATE_RESPONSE_STATUS FUNCTION
-- ============================================================================
-- Allows post author to accept or reject a response.
--
-- Parameters:
--   p_response_id: UUID of the response to update
--   p_status: New status ('accepted' or 'rejected')
--
-- Returns: JSON with success

CREATE OR REPLACE FUNCTION update_response_status(
    p_response_id UUID,
    p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response post_responses%ROWTYPE;
    v_post posts%ROWTYPE;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Validate status
    IF p_status NOT IN ('accepted', 'rejected') THEN
        RETURN json_build_object('success', false, 'error', 'Invalid status. Must be accepted or rejected.');
    END IF;

    -- Get response
    SELECT * INTO v_response FROM post_responses WHERE id = p_response_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Response not found');
    END IF;

    -- Get post to verify ownership
    SELECT * INTO v_post FROM posts WHERE id = v_response.post_id;
    IF v_post.producer_id != v_current_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Not authorized to update this response');
    END IF;

    -- Update response status
    UPDATE post_responses
    SET status = p_status,
        responded_at = NOW()
    WHERE id = p_response_id;

    -- Update conversation status if accepted
    IF p_status = 'accepted' THEN
        UPDATE conversations
        SET status = 'active',
            producer_accepted = TRUE,
            updated_at = NOW()
        WHERE response_id = p_response_id;
    ELSIF p_status = 'rejected' THEN
        UPDATE conversations
        SET status = 'declined',
            updated_at = NOW()
        WHERE response_id = p_response_id;
    END IF;

    RETURN json_build_object('success', true, 'status', p_status);
END;
$$;

COMMENT ON FUNCTION update_response_status(UUID, TEXT) IS
    'Allows post author to accept or reject a response. Updates both response and conversation status.';

-- ============================================================================
-- GET_MY_RESPONSES FUNCTION
-- ============================================================================
-- Gets responses made by the current user.
--
-- Returns: TABLE with response details and conversation status

CREATE OR REPLACE FUNCTION get_my_responses(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    response_id UUID,
    post_id UUID,
    verification_tier verification_tier,
    message TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    conversation_id UUID,
    conversation_status TEXT,
    location_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        pr.id as response_id,
        pr.post_id,
        pr.verification_tier,
        pr.message,
        pr.status,
        pr.created_at,
        pr.responded_at,
        c.id as conversation_id,
        c.status as conversation_status,
        l.name as location_name
    FROM post_responses pr
    JOIN posts p ON p.id = pr.post_id
    JOIN locations l ON l.id = p.location_id
    LEFT JOIN conversations c ON c.response_id = pr.id
    WHERE pr.responder_id = v_current_user_id
    ORDER BY pr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_my_responses(INTEGER, INTEGER) IS
    'Gets responses made by the current user with conversation status.';
