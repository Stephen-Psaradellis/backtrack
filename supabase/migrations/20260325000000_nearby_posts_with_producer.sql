-- Update get_posts_within_radius to include producer profile data
-- This allows the feed to display poster avatars and names without extra queries

-- Must DROP first because return type is changing (adding producer columns)
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

-- Re-grant execute (signature changed with new return columns)
GRANT EXECUTE ON FUNCTION get_posts_within_radius(double precision, double precision, int, int) TO authenticated;
