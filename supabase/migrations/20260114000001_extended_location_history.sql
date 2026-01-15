-- Extended Location History Migration
-- Creates a permanent history table for location visits that persists beyond the 3-hour cleanup

-- ============================================================================
-- 1. Create location_visit_history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_visit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE location_visit_history IS 'Permanent history of location visits, preserved from location_visits before cleanup';

-- ============================================================================
-- 2. Create index for efficient queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_location_visit_history_user_visited
  ON location_visit_history(user_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_visit_history_location
  ON location_visit_history(location_id);

-- ============================================================================
-- 3. Enable Row Level Security
-- ============================================================================
ALTER TABLE location_visit_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own visit history
CREATE POLICY "Users can view own visit history"
  ON location_visit_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own visit history (for migration/sync)
CREATE POLICY "Users can insert own visit history"
  ON location_visit_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. Create function to archive visits before cleanup
-- ============================================================================
CREATE OR REPLACE FUNCTION archive_location_visit()
RETURNS TRIGGER AS $$
BEGIN
  -- Copy the visit being deleted to the history table
  INSERT INTO location_visit_history (user_id, location_id, visited_at, created_at)
  VALUES (OLD.user_id, OLD.location_id, OLD.visited_at, now())
  ON CONFLICT DO NOTHING;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Create trigger to archive visits before deletion
-- ============================================================================
DROP TRIGGER IF EXISTS archive_visit_before_delete ON location_visits;
CREATE TRIGGER archive_visit_before_delete
  BEFORE DELETE ON location_visits
  FOR EACH ROW
  EXECUTE FUNCTION archive_location_visit();

-- ============================================================================
-- 6. Create RPC function to get locations visited in the last month
-- ============================================================================
CREATE OR REPLACE FUNCTION get_locations_visited_in_last_month(p_user_id uuid)
RETURNS TABLE (
  location_id uuid,
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,
  google_place_id text,
  last_visited_at timestamptz,
  visit_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id AS location_id,
    l.name AS location_name,
    l.address,
    l.latitude,
    l.longitude,
    l.google_place_id,
    MAX(h.visited_at) AS last_visited_at,
    COUNT(h.id) AS visit_count
  FROM location_visit_history h
  INNER JOIN locations l ON l.id = h.location_id
  WHERE h.user_id = p_user_id
    AND h.visited_at >= (now() - interval '30 days')
  GROUP BY l.id, l.name, l.address, l.latitude, l.longitude, l.google_place_id
  ORDER BY last_visited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_locations_visited_in_last_month(uuid) TO authenticated;

-- ============================================================================
-- 7. Migrate existing location_visits to history (one-time backfill)
-- ============================================================================
INSERT INTO location_visit_history (user_id, location_id, visited_at, created_at)
SELECT user_id, location_id, visited_at, now()
FROM location_visits
ON CONFLICT DO NOTHING;
