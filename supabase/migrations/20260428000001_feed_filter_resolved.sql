-- ============================================================================
-- Feed RPC updates: filter out resolved posts (Feature 3.7)
-- ============================================================================
-- After 20260428000000 added posts.resolved_at, the discovery feed RPCs need
-- to exclude resolved posts. Three RPCs power discovery:
--
--   1. get_posts_within_radius — proximity feed (FeedScreen via useNearbyPosts)
--   2. get_posts_for_user      — tiered discovery (useTieredPosts)
--   3. get_posts_for_location  — location detail screen
--
-- Each gets the same filter: AND p.resolved_at IS NULL.
-- The producer's own "My Posts" view does NOT use these RPCs and is therefore
-- unaffected — resolved posts remain visible to their author with a "Resolved"
-- badge (UI work, not in this migration).
-- ============================================================================

-- ============================================================================
-- 1. get_posts_within_radius
-- ============================================================================
-- Re-create with resolved_at filter. Signature unchanged.

DROP FUNCTION IF EXISTS get_posts_within_radius(double precision, double precision, int, int);

CREATE FUNCTION get_posts_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters int DEFAULT 5000,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  post_id uuid,
  producer_id uuid,
  location_id uuid,
  selfie_url text,
  photo_id uuid,
  target_avatar_v2 jsonb,
  target_description text,
  message text,
  note text,
  sighting_date timestamptz,
  time_granularity text,
  seen_at timestamptz,
  is_active boolean,
  post_created_at timestamptz,
  expires_at timestamptz,
  location_name text,
  location_address text,
  location_latitude double precision,
  location_longitude double precision,
  google_place_id text,
  distance_meters double precision,
  producer_display_name text,
  producer_username text,
  producer_avatar jsonb,
  producer_is_verified boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.producer_id,
    p.location_id,
    p.selfie_url,
    p.photo_id,
    p.target_avatar_v2,
    p.target_description,
    p.message,
    p.note,
    p.sighting_date,
    p.time_granularity::text,
    p.seen_at,
    p.is_active,
    p.created_at AS post_created_at,
    p.expires_at,
    l.name AS location_name,
    l.address AS location_address,
    l.latitude AS location_latitude,
    l.longitude AS location_longitude,
    l.google_place_id,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters,
    pr.display_name AS producer_display_name,
    pr.username AS producer_username,
    pr.avatar AS producer_avatar,
    pr.is_verified AS producer_is_verified
  FROM posts p
  INNER JOIN locations l ON l.id = p.location_id
  LEFT JOIN profiles pr ON pr.id = p.producer_id
  WHERE p.is_active = true
    AND p.resolved_at IS NULL
    AND p.expires_at > now()
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_posts_within_radius(double precision, double precision, int, int) TO authenticated;

-- ============================================================================
-- 2. get_posts_for_user (tiered discovery)
-- ============================================================================
-- Add resolved_at filter to the scored_posts CTE. Signature unchanged.

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
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    WITH user_checkins_expanded AS (
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
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM user_checkins_expanded uce
                    WHERE uce.location_id = p.location_id
                        AND uce.verified = true
                        AND uce.checked_in_at <= COALESCE(p.sighting_date, p.created_at) + INTERVAL '2 hours'
                        AND uce.checked_out_at >= COALESCE(p.sighting_date, p.created_at) - INTERVAL '2 hours'
                ) THEN 'verified_checkin'::verification_tier
                WHEN EXISTS (
                    SELECT 1 FROM user_favorites uf
                    WHERE uf.google_place_id = l.google_place_id
                ) THEN 'regular_spot'::verification_tier
                ELSE 'unverified_claim'::verification_tier
            END as matching_tier,
            EXISTS (
                SELECT 1 FROM user_checkins_expanded uce
                WHERE uce.location_id = p.location_id
            ) as user_was_there,
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
            AND p.resolved_at IS NULL
            AND p.expires_at > NOW()
            AND p.producer_id != v_current_user_id
            AND (p_location_id IS NULL OR p.location_id = p_location_id)
            AND NOT EXISTS (
                SELECT 1 FROM post_responses pr
                WHERE pr.post_id = p.id AND pr.responder_id = v_current_user_id
            )
            AND NOT EXISTS (
                SELECT 1 FROM conversations c
                WHERE c.post_id = p.id AND c.consumer_id = v_current_user_id
            )
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
        CASE sp.matching_tier
            WHEN 'verified_checkin' THEN 1
            WHEN 'regular_spot' THEN 2
            ELSE 3
        END,
        sp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 3. get_posts_for_location
-- ============================================================================

CREATE OR REPLACE FUNCTION get_posts_for_location(
    p_location_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    producer_id UUID,
    location_id UUID,
    target_avatar JSONB,
    note TEXT,
    selfie_url TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN
) AS $$
DECLARE
    current_user_id UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.producer_id,
        p.location_id,
        p.target_avatar,
        p.note,
        CASE
            WHEN p.producer_id = current_user_id THEN p.selfie_url
            ELSE NULL
        END AS selfie_url,
        p.created_at,
        p.expires_at,
        p.is_active
    FROM posts p
    WHERE p.location_id = p_location_id
    AND p.is_active = true
    AND p.resolved_at IS NULL
    AND p.expires_at > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM blocks b
        WHERE (b.blocker_id = current_user_id AND b.blocked_id = p.producer_id)
           OR (b.blocker_id = p.producer_id AND b.blocked_id = current_user_id)
    )
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
