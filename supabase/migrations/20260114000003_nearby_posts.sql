-- Nearby Posts Migration
-- Creates an RPC function to get posts within a radius using PostGIS

-- ============================================================================
-- Create RPC function to get posts within radius
-- ============================================================================
CREATE OR REPLACE FUNCTION get_posts_within_radius(
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
  distance_meters double precision
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
    ) AS distance_meters
  FROM posts p
  INNER JOIN locations l ON l.id = p.location_id
  WHERE p.is_active = true
    AND p.expires_at > now()
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_posts_within_radius(double precision, double precision, int, int) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_posts_within_radius(double precision, double precision, int, int) IS 'Returns active posts within a specified radius (in meters) from a given lat/lng point, ordered by creation date';

-- ============================================================================
-- Create spatial index on locations for better PostGIS performance
-- ============================================================================
-- First check if the geography column needs to be added for indexing
-- Note: We use the existing lat/lng columns with on-the-fly point creation
-- For better performance, we create an expression index
-- Using geography() function syntax for compatibility

CREATE INDEX IF NOT EXISTS idx_locations_geography
  ON locations USING gist (
    geography(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))
  );
