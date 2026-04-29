-- ============================================================================
-- Add checkin/checkout bounds to get_recently_visited_locations
-- ============================================================================
-- Extends the RPC to return checked_in_at and checked_out_at from
-- user_checkins, enabling the post creation flow to constrain time pickers
-- to the valid checkin window.

-- Must drop first because the return type is changing (adding new OUT columns)
DROP FUNCTION IF EXISTS get_recently_visited_locations(INTEGER);

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
  visited_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ
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
    -- Location visits (background tracking) — no checkin/checkout bounds
    SELECT
      lv.location_id,
      lv.visited_at AS visit_time,
      NULL::TIMESTAMPTZ AS ci_at,
      NULL::TIMESTAMPTZ AS co_at
    FROM location_visits lv
    WHERE lv.user_id = auth.uid()
      AND lv.visited_at > NOW() - visit_window

    UNION ALL

    -- User check-ins (explicit check-ins) — carry checkin/checkout times
    SELECT
      uc.location_id,
      uc.checked_in_at AS visit_time,
      uc.checked_in_at AS ci_at,
      uc.checked_out_at AS co_at
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
    MAX(cv.visit_time) AS visited_at,
    MIN(cv.ci_at) AS checked_in_at,
    MAX(cv.co_at) AS checked_out_at
  FROM locations l
  INNER JOIN combined_visits cv ON cv.location_id = l.id
  GROUP BY l.id, l.google_place_id, l.name, l.address, l.latitude, l.longitude, l.place_types, l.post_count, l.created_at
  ORDER BY MAX(cv.visit_time) DESC
  LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION get_recently_visited_locations(INTEGER) IS
  'Returns locations visited by the current user within the last 3 hours (from location_visits) or checked into within the last 12 hours (from user_checkins). Includes checked_in_at/checked_out_at for time picker bounds in post creation.';

GRANT EXECUTE ON FUNCTION get_recently_visited_locations(INTEGER) TO authenticated;
