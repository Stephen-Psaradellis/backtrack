-- ============================================================================
-- Fix get_locations_near_point function overload ambiguity
-- ============================================================================
-- Two migrations created this function with different signatures:
--   20260112: p_radius_meters INTEGER
--   20260117: p_radius_meters DOUBLE PRECISION
--
-- PostgreSQL treats these as separate overloaded functions. PostgREST cannot
-- disambiguate JSON number 200 between INTEGER and DOUBLE PRECISION, causing
-- ambiguous function call errors that silently break venue search.
--
-- Fix: Drop the old INTEGER-signature overload, keep only the DOUBLE PRECISION
-- version which is the intended one.
-- ============================================================================

-- Drop the old INTEGER-signature overload (from 20260112 migration)
DROP FUNCTION IF EXISTS get_locations_near_point(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER);

-- Drop the DOUBLE PRECISION version too — return type changed (added address column)
-- CREATE OR REPLACE cannot change return types, so we must drop and recreate
DROP FUNCTION IF EXISTS get_locations_near_point(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

-- Recreate with address in return type and geog column optimization
CREATE FUNCTION get_locations_near_point(
    p_lat DOUBLE PRECISION,
    p_lon DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION DEFAULT 200,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    user_point GEOGRAPHY;
BEGIN
    -- Create geography point from coordinates
    user_point := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        l.id,
        l.name,
        l.address,
        l.latitude,
        l.longitude,
        ST_Distance(
            COALESCE(l.geog, ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography),
            user_point
        ) AS distance_meters
    FROM locations l
    WHERE ST_DWithin(
        COALESCE(l.geog, ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography),
        user_point,
        p_radius_meters
    )
    ORDER BY distance_meters ASC
    LIMIT p_limit;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_locations_near_point(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_locations_near_point(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) IS
    'Returns nearby locations within radius. Uses stored geog column when available for 2x faster queries. Returns address for venue display.';
