-- ============================================================================
-- Tiered Discovery Schema Migration
-- ============================================================================
-- This migration creates the get_posts_for_user RPC function for tiered
-- post discovery. Posts are categorized based on the user's relationship
-- to the location:
--
-- - Tier 1 (verified_checkin): User has a verified check-in at the location
--   during the post's sighting time window (±2 hours)
-- - Tier 2 (regular_spot): Location is in user's favorite_locations
-- - Tier 3 (unverified_claim): All other posts
--
-- This enables:
-- - Prioritizing posts the user is most likely to be the target of
-- - Showing trust indicators to help users find relevant posts
-- - Future notification targeting for Tier 1 matches
-- ============================================================================

-- ============================================================================
-- GET_POSTS_FOR_USER FUNCTION
-- ============================================================================
-- Returns posts with tier information for the current user.
-- Posts are sorted by tier (verified first) then by recency.
-- Excludes user's own posts, posts they've already responded to,
-- and posts they're already in conversation with.
--
-- Parameters:
--   p_location_id: Optional - filter to specific location
--   p_limit: Maximum number of posts to return (default 50)
--   p_offset: Offset for pagination (default 0)
--
-- Returns: TABLE with post details and tier information

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
        -- Get all user's verified check-ins with time ranges
        -- Use 4-hour default duration for open check-ins
        SELECT
            uc.id as checkin_id,
            uc.location_id,
            uc.checked_in_at,
            COALESCE(uc.checked_out_at, uc.checked_in_at + INTERVAL '4 hours') as checked_out_at,
            uc.verified
        FROM user_checkins uc
        WHERE uc.user_id = v_current_user_id
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
            -- Get the matching check-in ID if verified tier
            (
                SELECT uce.checkin_id FROM user_checkins_expanded uce
                WHERE uce.location_id = p.location_id
                    AND uce.verified = true
                    AND uce.checked_in_at <= COALESCE(p.sighting_date, p.created_at) + INTERVAL '2 hours'
                    AND uce.checked_out_at >= COALESCE(p.sighting_date, p.created_at) - INTERVAL '2 hours'
                LIMIT 1
            ) as checkin_id
        FROM posts p
        JOIN locations l ON l.id = p.location_id
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
            -- Not from blocked users
            AND NOT EXISTS (
                SELECT 1 FROM blocks b
                WHERE (b.blocker_id = v_current_user_id AND b.blocked_id = p.producer_id)
                   OR (b.blocker_id = p.producer_id AND b.blocked_id = v_current_user_id)
            )
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
    'Gets posts for user with tiered matching. Tier 1: verified check-in, Tier 2: favorite location, Tier 3: unverified. Excludes own posts, already responded, and blocked users.';

-- ============================================================================
-- GET_TIER_1_POSTS FUNCTION
-- ============================================================================
-- Returns only Tier 1 posts (verified check-in matches).
-- Used for notification targeting when a new post is created.
--
-- Parameters:
--   p_location_id: Optional - filter to specific location
--   p_limit: Maximum number of posts (default 20)
--
-- Returns: TABLE with post details

CREATE OR REPLACE FUNCTION get_tier_1_posts(
    p_location_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    post_id UUID,
    location_id UUID,
    location_name TEXT,
    producer_id UUID,
    sighting_date TIMESTAMPTZ,
    checkin_id UUID
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
        p.post_id,
        p.location_id,
        p.location_name,
        p.producer_id,
        p.sighting_date,
        p.checkin_id
    FROM get_posts_for_user(p_location_id, p_limit, 0) p
    WHERE p.matching_tier = 'verified_checkin';
END;
$$;

COMMENT ON FUNCTION get_tier_1_posts(UUID, INTEGER) IS
    'Gets only Tier 1 (verified check-in) posts for the current user. Used for high-priority matches.';

-- ============================================================================
-- GET_POSTS_AT_FAVORITE_SPOTS FUNCTION
-- ============================================================================
-- Returns posts at user's favorite locations (Tier 1 and Tier 2).
-- Used for "Posts at your spots" feed.
--
-- Parameters:
--   p_limit: Maximum number of posts (default 50)
--
-- Returns: TABLE with post details

CREATE OR REPLACE FUNCTION get_posts_at_favorite_spots(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    post_id UUID,
    location_id UUID,
    location_name TEXT,
    producer_id UUID,
    message TEXT,
    target_rpm_avatar JSONB,
    sighting_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    matching_tier verification_tier
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
        p.post_id,
        p.location_id,
        p.location_name,
        p.producer_id,
        p.message,
        p.target_rpm_avatar,
        p.sighting_date,
        p.created_at,
        p.matching_tier
    FROM get_posts_for_user(NULL, p_limit, 0) p
    WHERE p.matching_tier IN ('verified_checkin', 'regular_spot');
END;
$$;

COMMENT ON FUNCTION get_posts_at_favorite_spots(INTEGER) IS
    'Gets posts at user favorite locations (Tier 1 and 2). Used for "Posts at your spots" feed.';
