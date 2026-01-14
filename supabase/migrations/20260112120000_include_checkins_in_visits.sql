-- ============================================================================
-- Include Check-ins in Recently Visited Locations
-- ============================================================================
-- Updates get_recently_visited_locations to also include active check-ins
-- from the user_checkins table. This allows users who have checked in
-- to create posts at that location.

CREATE OR REPLACE FUNCTION get_recently_visited_locations(
    max_results INTEGER DEFAULT NULL
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
  visited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  visit_window CONSTANT INTERVAL := INTERVAL '3 hours';
  checkin_window CONSTANT INTERVAL := INTERVAL '12 hours';
BEGIN
  RETURN QUERY
  WITH combined_visits AS (
    -- Location visits (background tracking)
    SELECT
      lv.location_id,
      lv.visited_at AS visit_time
    FROM location_visits lv
    WHERE lv.user_id = auth.uid()
      AND lv.visited_at > NOW() - visit_window

    UNION ALL

    -- User check-ins (explicit check-ins)
    SELECT
      uc.location_id,
      uc.checked_in_at AS visit_time
    FROM user_checkins uc
    WHERE uc.user_id = auth.uid()
      AND uc.checked_in_at > NOW() - checkin_window
      AND uc.checked_out_at IS NULL  -- Only active check-ins
  )
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
    MAX(cv.visit_time) AS visited_at
  FROM locations l
  INNER JOIN combined_visits cv ON cv.location_id = l.id
  GROUP BY l.id, l.google_place_id, l.name, l.address, l.latitude, l.longitude, l.place_types, l.post_count, l.created_at
  ORDER BY MAX(cv.visit_time) DESC
  LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION get_recently_visited_locations(INTEGER) IS
  'Returns locations visited by the current user within the last 3 hours (from location_visits) or checked into within the last 12 hours (from user_checkins). Used for post creation eligibility.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_recently_visited_locations(INTEGER) TO authenticated;
