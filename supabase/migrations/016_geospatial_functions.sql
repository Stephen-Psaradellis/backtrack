-- Backtrack Geospatial Functions
-- Migration: 003_geospatial_functions.sql
-- Description: Creates PostGIS-powered functions for efficient nearby location queries
-- Uses ST_DWithin for O(log n) spatial queries with the existing GIST index

-- ============================================================================
-- GET_NEARBY_LOCATIONS FUNCTION
-- ============================================================================
-- Returns locations within a specified radius of a given point, ordered by distance.
-- Uses ST_DWithin with geography type for accurate meter-based distance calculations.
-- Leverages the existing locations_geo_idx GIST index for efficient queries.
--
-- Parameters:
--   user_lat: User's latitude (DOUBLE PRECISION)
--   user_lon: User's longitude (DOUBLE PRECISION)
--   radius_meters: Search radius in meters (DOUBLE PRECISION), default 5000 (5km)
--   max_results: Maximum number of results to return (INTEGER), default 50
--
-- Returns: TABLE with all location columns plus distance_meters

CREATE OR REPLACE FUNCTION get_nearby_locations(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 5000,
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
  post_count INTEGER,
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
    l.post_count,
    l.created_at,
    -- Calculate distance in meters using geography for accuracy
    ST_Distance(
      user_point,
      ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography
    ) AS distance_meters
  FROM locations l
  WHERE ST_DWithin(
    user_point,
    ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters ASC
  LIMIT max_results;
END;
$$;

-- ============================================================================
-- GET_LOCATIONS_WITH_ACTIVE_POSTS FUNCTION
-- ============================================================================
-- Returns nearby locations that have active posts, optimized for map marker display.
-- Calculates actual active post counts by joining with posts table.
-- Uses ST_DWithin with geography type for accurate meter-based distance calculations.
-- Leverages the existing locations_geo_idx GIST index for efficient queries.
--
-- Parameters:
--   user_lat: User's latitude (DOUBLE PRECISION)
--   user_lon: User's longitude (DOUBLE PRECISION)
--   radius_meters: Search radius in meters (DOUBLE PRECISION), default 5000 (5km)
--   min_post_count: Minimum number of active posts required (INTEGER), default 1
--   max_results: Maximum number of results to return (INTEGER), default 50
--
-- Returns: TABLE with location columns, active_post_count, and distance_meters

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
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_nearby_locations(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS
  'Returns locations within radius_meters of the given coordinates, ordered by distance. Uses PostGIS ST_DWithin for efficient spatial queries with GIST index.';

COMMENT ON FUNCTION get_locations_with_active_posts(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) IS
  'Returns nearby locations with active posts for map marker display. Only includes locations meeting the minimum active post count threshold. Uses PostGIS ST_DWithin for efficient spatial queries with GIST index.';
