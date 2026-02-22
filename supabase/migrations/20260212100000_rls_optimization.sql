-- ============================================================================
-- RLS and Query Performance Optimizations (P-001, P-002, P-003)
-- ============================================================================
-- This migration implements three critical performance optimizations from the
-- performance audit report (docs/ideation/09-performance-ideation-report.md):
--
-- P-001: Split RLS block-check OR into separate NOT EXISTS
--        - Replaces OR-based block checks with two separate NOT EXISTS
--        - Creates indexed UNION ALL pattern for 3x-10x speedup
--
-- P-002: Replace messages INSERT RLS with SECURITY DEFINER function
--        - Moves complex logic to helper function with SET search_path
--        - Reduces policy complexity and improves plan caching
--
-- P-003: Time-bound checkins CTE in get_posts_for_user()
--        - Adds WHERE checked_in_at >= NOW() - INTERVAL '9 days'
--        - Prevents full table scan of historical checkins
--        - Replaces duplicate subquery with LEFT JOIN LATERAL
-- ============================================================================

-- ============================================================================
-- P-001: HELPER FUNCTION FOR BLOCK CHECKS
-- ============================================================================
-- This function performs a fast block check using UNION ALL and targeted indexes.
-- Returns TRUE if user_a has blocked user_b OR user_b has blocked user_a.
-- Uses SECURITY DEFINER to ensure consistent execution plan and security context.

CREATE OR REPLACE FUNCTION is_blocked_by(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check both directions using UNION ALL with index lookups
    -- This is faster than OR because each subquery uses a different index
    RETURN EXISTS (
        -- Check if user_a blocked user_b
        SELECT 1 FROM blocks
        WHERE blocker_id = user_a AND blocked_id = user_b

        UNION ALL

        -- Check if user_b blocked user_a
        SELECT 1 FROM blocks
        WHERE blocker_id = user_b AND blocked_id = user_a
    );
END;
$$;

COMMENT ON FUNCTION is_blocked_by(UUID, UUID) IS
'Fast block check using UNION ALL pattern. Returns TRUE if either user has blocked the other. Uses separate index lookups for 3x-10x speedup vs OR pattern.';

-- ============================================================================
-- P-001: UPDATE RLS POLICIES TO USE HELPER FUNCTION
-- ============================================================================

-- Update conversations RLS policy to use helper function
DROP POLICY IF EXISTS "conversations_select_participant_not_blocked" ON conversations;
CREATE POLICY "conversations_select_participant_not_blocked"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
        -- Must be a participant (producer or consumer)
        (producer_id = auth.uid() OR consumer_id = auth.uid())
        AND
        -- Must NOT have blocking relationship with the other party
        NOT is_blocked_by(
            auth.uid(),
            CASE WHEN producer_id = auth.uid() THEN consumer_id ELSE producer_id END
        )
    );

COMMENT ON POLICY "conversations_select_participant_not_blocked" ON conversations IS
'Allow participants to view conversations, but hide if either party has blocked the other. Uses optimized is_blocked_by() function.';

-- ============================================================================
-- P-002: SECURITY DEFINER FUNCTION FOR MESSAGE SENDING
-- ============================================================================
-- This function checks if a user can send a message to a conversation.
-- Returns TRUE if:
--   1. User is a participant in the conversation
--   2. Conversation is active
--   3. Neither party has blocked the other

CREATE OR REPLACE FUNCTION can_send_message(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_producer_id UUID;
    v_consumer_id UUID;
    v_is_active BOOLEAN;
    v_other_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get conversation details in one query
    SELECT c.producer_id, c.consumer_id, c.is_active
    INTO v_producer_id, v_consumer_id, v_is_active
    FROM conversations c
    WHERE c.id = p_conversation_id;

    -- Conversation must exist and be active
    IF NOT FOUND OR NOT v_is_active THEN
        RETURN FALSE;
    END IF;

    -- User must be a participant
    IF v_user_id NOT IN (v_producer_id, v_consumer_id) THEN
        RETURN FALSE;
    END IF;

    -- Determine the other user
    v_other_user_id := CASE
        WHEN v_user_id = v_producer_id THEN v_consumer_id
        ELSE v_producer_id
    END;

    -- Check blocking using optimized helper function
    RETURN NOT is_blocked_by(v_user_id, v_other_user_id);
END;
$$;

COMMENT ON FUNCTION can_send_message(UUID) IS
'Checks if current user can send message to conversation. Validates participation, active status, and blocking. Used by messages INSERT RLS policy for better performance and plan caching.';

-- ============================================================================
-- P-002: UPDATE MESSAGES INSERT RLS POLICY
-- ============================================================================

-- Replace the complex inline RLS policy with a call to the helper function
DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant"
    ON messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND can_send_message(conversation_id)
    );

COMMENT ON POLICY "messages_insert_participant" ON messages IS
'Allow authenticated users to insert messages if they can send to the conversation. Uses can_send_message() function for optimized performance.';

-- ============================================================================
-- P-003: OPTIMIZE get_posts_for_user() FUNCTION
-- ============================================================================
-- Time-bound the user_checkins_expanded CTE to only scan recent checkins
-- (last 9 days), and replace duplicate subquery with LEFT JOIN LATERAL.

CREATE OR REPLACE FUNCTION get_posts_for_user(
    p_location_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id UUID,
    location_id UUID,
    location_name TEXT,
    producer_id UUID,
    message TEXT,
    target_rpm_avatar JSONB,
    sighting_date TIMESTAMPTZ,
    time_granularity TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    matching_tier verification_tier,
    user_was_there BOOLEAN,
    checkin_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    WITH user_checkins_expanded AS (
        -- P-003: Time-bound to last 9 days to prevent full table scan
        -- Only need recent checkins for matching against active posts
        SELECT
            uc.id as checkin_id,
            uc.location_id,
            uc.checked_in_at,
            COALESCE(uc.checked_out_at, uc.checked_in_at + INTERVAL '4 hours') as checked_out_at,
            uc.verified
        FROM user_checkins uc
        WHERE uc.user_id = v_current_user_id
            AND uc.checked_in_at >= NOW() - INTERVAL '9 days'  -- P-003: Time filter
    ),
    user_favorites AS (
        -- Get user's favorite locations
        SELECT fl.place_id as google_place_id
        FROM favorite_locations fl
        WHERE fl.user_id = v_current_user_id
    ),
    scored_posts AS (
        SELECT
            p.id as post_id,
            p.location_id,
            l.name as location_name,
            p.producer_id,
            p.message,
            p.target_rpm_avatar::jsonb as target_rpm_avatar,
            p.sighting_date,
            p.time_granularity::text as time_granularity,
            p.created_at,
            p.expires_at,
            -- Determine tier based on user's relationship to location
            CASE
                -- Tier 1: Verified check-in overlapping with sighting time (±2 hours)
                WHEN EXISTS (
                    SELECT 1 FROM user_checkins_expanded uce
                    WHERE uce.location_id = p.location_id
                        AND uce.verified = true
                        AND uce.checked_in_at <= COALESCE(p.sighting_date, p.created_at) + INTERVAL '2 hours'
                        AND uce.checked_out_at >= COALESCE(p.sighting_date, p.created_at) - INTERVAL '2 hours'
                ) THEN 'verified_checkin'::verification_tier
                -- Tier 2: Location is in user's favorites (match by google_place_id)
                WHEN EXISTS (
                    SELECT 1 FROM user_favorites uf
                    WHERE uf.google_place_id = l.google_place_id
                ) THEN 'regular_spot'::verification_tier
                -- Tier 3: All other posts
                ELSE 'unverified_claim'::verification_tier
            END as matching_tier,
            -- Did user ever check in at this location?
            EXISTS (
                SELECT 1 FROM user_checkins_expanded uce
                WHERE uce.location_id = p.location_id
            ) as user_was_there,
            -- P-003: Use LEFT JOIN LATERAL instead of duplicate subquery
            uce_match.checkin_id
        FROM posts p
        JOIN locations l ON l.id = p.location_id
        -- P-003: Replace duplicate subquery with LEFT JOIN LATERAL for better performance
        LEFT JOIN LATERAL (
            SELECT uce.checkin_id
            FROM user_checkins_expanded uce
            WHERE uce.location_id = p.location_id
                AND uce.verified = true
                AND uce.checked_in_at <= COALESCE(p.sighting_date, p.created_at) + INTERVAL '2 hours'
                AND uce.checked_out_at >= COALESCE(p.sighting_date, p.created_at) - INTERVAL '2 hours'
            LIMIT 1
        ) uce_match ON true
        WHERE p.is_active = true
            AND p.expires_at > NOW() -- Not expired
            AND p.producer_id != v_current_user_id -- Not own posts
            -- Optional location filter
            AND (p_location_id IS NULL OR p.location_id = p_location_id)
            -- Not already responded to
            AND NOT EXISTS (
                SELECT 1 FROM post_responses pr
                WHERE pr.post_id = p.id AND pr.responder_id = v_current_user_id
            )
            -- Not already in conversation
            AND NOT EXISTS (
                SELECT 1 FROM conversations c
                WHERE c.post_id = p.id AND c.consumer_id = v_current_user_id
            )
            -- P-001: Use optimized block check function
            AND NOT is_blocked_by(v_current_user_id, p.producer_id)
    )
    SELECT
        sp.post_id,
        sp.location_id,
        sp.location_name,
        sp.producer_id,
        sp.message,
        sp.target_rpm_avatar,
        sp.sighting_date,
        sp.time_granularity,
        sp.created_at,
        sp.expires_at,
        sp.matching_tier,
        sp.user_was_there,
        sp.checkin_id
    FROM scored_posts sp
    ORDER BY
        -- Tier 1 first, then Tier 2, then Tier 3
        CASE sp.matching_tier
            WHEN 'verified_checkin' THEN 1
            WHEN 'regular_spot' THEN 2
            ELSE 3
        END,
        -- Within tier, sort by recency
        sp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_posts_for_user(UUID, INTEGER, INTEGER) IS
'Gets posts for user with tiered matching. OPTIMIZED: Time-bounded checkins (9 days), LEFT JOIN LATERAL for deduplication, is_blocked_by() function. Tier 1: verified check-in, Tier 2: favorite location, Tier 3: unverified.';

-- ============================================================================
-- TEST QUERIES (For validation)
-- ============================================================================

-- Test 1: Verify is_blocked_by() function works correctly
-- Expected: Returns FALSE if no block exists, TRUE if block exists in either direction
/*
SELECT is_blocked_by(
    'user-a-uuid'::UUID,
    'user-b-uuid'::UUID
);
*/

-- Test 2: Verify can_send_message() function works correctly
-- Expected: Returns TRUE only if user is participant, conversation is active, and no blocks
/*
SELECT can_send_message('conversation-uuid'::UUID);
*/

-- Test 3: Verify get_posts_for_user() uses time-bounded checkins
-- Check EXPLAIN output to confirm checkins CTE has WHERE filter on checked_in_at
/*
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM get_posts_for_user(NULL, 50, 0);
*/

-- Test 4: Verify conversations RLS policy uses optimized block check
-- Expected: No sequential scans on blocks table
/*
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM conversations WHERE producer_id = auth.uid() OR consumer_id = auth.uid();
*/

-- ============================================================================
-- PERFORMANCE IMPACT SUMMARY
-- ============================================================================
-- P-001: Block check optimization
--   - Before: OR pattern with seq scan or bitmap heap scan
--   - After: UNION ALL with two separate index lookups
--   - Expected gain: 3x-10x faster block checks
--   - Affected: conversations RLS, get_posts_for_user(), messages RLS
--
-- P-002: Messages INSERT RLS optimization
--   - Before: Complex inline policy with nested EXISTS
--   - After: Simple policy calling SECURITY DEFINER function
--   - Expected gain: Better plan caching, reduced planning time
--   - Affected: messages table inserts
--
-- P-003: get_posts_for_user() optimization
--   - Before: Full table scan of all historical checkins
--   - After: Time-bounded CTE (9 days) + LEFT JOIN LATERAL
--   - Expected gain: 5x-50x faster depending on checkins table size
--   - Affected: All feed queries, post discovery
-- ============================================================================
