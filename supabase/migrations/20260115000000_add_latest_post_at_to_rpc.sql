-- Add latest_post_at to get_locations_with_active_posts RPC
-- Migration: 20260115000000_add_latest_post_at_to_rpc.sql
-- Description: Adds latest_post_at field to support activity-based map markers
-- The latest_post_at timestamp is used to determine marker "hotness" (hot/active/historical)

-- ============================================================================
-- UPDATED GET_LOCATIONS_WITH_ACTIVE_POSTS FUNCTION
-- ============================================================================
-- Now returns latest_post_at to enable activity-based marker styling.
-- Hot markers (< 2h old) display pulse animations.
-- Active markers (< 24h old) display static glow.
-- Historical markers display muted styling.

CREATE OR REPLACE FUNCTION get_locations_with_active_posts(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 5000,
  min_post_count INTEGER DEFAULT 1,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  google_place_id TEXT,
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_types TEXT[],
  active_post_count BIGINT,
  latest_post_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_point GEOGRAPHY;
BEGIN
  -- Create a geography point from user coordinates (SRID 4326 for WGS 84)
  user_point := ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    l.id,
    l.google_place_id,
    l.name,
    l.address,
    l.latitude,
    l.longitude,
    l.place_types,
    -- Count only active, non-expired posts for this location
    COUNT(p.id) AS active_post_count,
    -- Get the most recent post timestamp for activity state
    MAX(p.created_at) AS latest_post_at,
    l.created_at,
    -- Calculate distance in meters using geography for accuracy
    ST_Distance(
      user_point,
      ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
    ) AS distance_meters
  FROM locations l
  INNER JOIN posts p ON p.location_id = l.id
    AND p.is_active = TRUE
    AND p.expires_at > NOW()
  WHERE ST_DWithin(
    user_point,
    ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
    radius_meters
  )
  GROUP BY l.id, l.google_place_id, l.name, l.address, l.latitude, l.longitude, l.place_types, l.created_at
  HAVING COUNT(p.id) >= min_post_count
  ORDER BY distance_meters ASC
  LIMIT max_results;
END;
$$;

-- ============================================================================
-- UPDATE COMMENT
-- ============================================================================

COMMENT ON FUNCTION get_locations_with_active_posts(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) IS
  'Returns nearby locations with active posts for map marker display. Includes latest_post_at for activity-based marker styling (hot/active/historical). Only includes locations meeting the minimum active post count threshold. Uses PostGIS ST_DWithin for efficient spatial queries with GIST index.';
