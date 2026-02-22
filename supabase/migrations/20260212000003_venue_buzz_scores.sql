-- ============================================================================
-- Venue Buzz Scores Migration
-- ============================================================================
-- Creates the get_trending_venues RPC function to calculate and return
-- venues with buzz scores based on recent activity (posts, check-ins, visitors).
--
-- Buzz Score Formula:
-- (posts in last 24h × 3) + (check-ins in last 24h × 2) + (unique visitors in last 7d × 1)
--
-- This enables the "Trending Now" feed feature for venue discovery.
-- ============================================================================

-- ============================================================================
-- GET_TRENDING_VENUES FUNCTION
-- ============================================================================
-- Returns venues within a specified radius sorted by buzz score
--
-- Parameters:
--   user_lat: User's current latitude
--   user_lng: User's current longitude
--   radius_m: Search radius in meters (default: 25km)
--   venue_limit: Maximum number of venues to return (default: 5)
--
-- Returns:
--   TABLE with location_id, location_name, buzz_score, post_count_24h,
--   checkin_count_24h, latitude, longitude

CREATE OR REPLACE FUNCTION get_trending_venues(
    user_lat FLOAT8,
    user_lng FLOAT8,
    radius_m INT DEFAULT 25000,
    venue_limit INT DEFAULT 5
)
RETURNS TABLE (
    location_id UUID,
    location_name TEXT,
    buzz_score INT,
    post_count_24h BIGINT,
    checkin_count_24h BIGINT,
    latitude FLOAT8,
    longitude FLOAT8
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_24h_ago TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
    v_7d_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
BEGIN
    RETURN QUERY
    WITH nearby_locations AS (
        -- Find all locations within radius
        SELECT
            l.id,
            l.name,
            l.latitude,
            l.longitude
        FROM locations l
        WHERE ST_DWithin(
            ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_m
        )
    ),
    posts_24h AS (
        -- Count posts at each location in last 24 hours
        SELECT
            p.location_id,
            COUNT(*) as post_count
        FROM posts p
        WHERE p.created_at >= v_24h_ago
            AND p.location_id IS NOT NULL
        GROUP BY p.location_id
    ),
    checkins_24h AS (
        -- Count check-ins at each location in last 24 hours
        SELECT
            uc.location_id,
            COUNT(*) as checkin_count
        FROM user_checkins uc
        WHERE uc.checked_in_at >= v_24h_ago
            AND uc.location_id IS NOT NULL
        GROUP BY uc.location_id
    ),
    visitors_7d AS (
        -- Count unique visitors at each location in last 7 days
        -- Combines location_visits and user_checkins for total unique visitors
        SELECT
            location_id,
            COUNT(DISTINCT user_id) as visitor_count
        FROM (
            -- Visitors from location_visits
            SELECT
                lv.location_id,
                lv.user_id
            FROM location_visits lv
            WHERE lv.created_at >= v_7d_ago
                AND lv.location_id IS NOT NULL
            UNION
            -- Visitors from user_checkins
            SELECT
                uc.location_id,
                uc.user_id
            FROM user_checkins uc
            WHERE uc.checked_in_at >= v_7d_ago
                AND uc.location_id IS NOT NULL
        ) all_visits
        GROUP BY location_id
    ),
    buzz_scores AS (
        -- Calculate buzz scores for all nearby locations
        SELECT
            nl.id,
            nl.name,
            nl.latitude,
            nl.longitude,
            COALESCE(p24.post_count, 0) as posts_24h,
            COALESCE(c24.checkin_count, 0) as checkins_24h,
            COALESCE(v7d.visitor_count, 0) as visitors_7d,
            -- Buzz score formula: posts×3 + checkins×2 + visitors×1
            (
                (COALESCE(p24.post_count, 0) * 3) +
                (COALESCE(c24.checkin_count, 0) * 2) +
                (COALESCE(v7d.visitor_count, 0) * 1)
            )::INT as buzz
        FROM nearby_locations nl
        LEFT JOIN posts_24h p24 ON p24.location_id = nl.id
        LEFT JOIN checkins_24h c24 ON c24.location_id = nl.id
        LEFT JOIN visitors_7d v7d ON v7d.location_id = nl.id
    )
    -- Return top venues by buzz score (only include venues with buzz > 0)
    SELECT
        bs.id,
        bs.name,
        bs.buzz,
        bs.posts_24h,
        bs.checkins_24h,
        bs.latitude,
        bs.longitude
    FROM buzz_scores bs
    WHERE bs.buzz > 0
    ORDER BY bs.buzz DESC
    LIMIT venue_limit;
END;
$$;

COMMENT ON FUNCTION get_trending_venues(FLOAT8, FLOAT8, INT, INT) IS
    'Returns trending venues within radius sorted by buzz score. Buzz = (posts×3 + checkins×2 + visitors×1). Used for Trending Now feed feature.';

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_trending_venues(FLOAT8, FLOAT8, INT, INT) TO authenticated;
