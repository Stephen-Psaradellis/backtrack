-- ============================================================================
-- Location Visits Schema Migration
-- ============================================================================
-- This migration creates the location_visits table for tracking user visits
-- to physical venues. Users can only create posts at locations they have
-- physically visited within the last 3 hours.
--
-- Key features:
-- - Tracks when users visit locations (within 50m proximity)
-- - Stores visit coordinates and GPS accuracy for verification
-- - Enables visit-based filtering for post creation eligibility
-- - Automatic cleanup of visits older than 3 hours (privacy)
-- ============================================================================

-- ============================================================================
-- LOCATION_VISITS TABLE
-- ============================================================================
-- Tracks user visits to physical locations for post creation eligibility
-- Users can only post to locations they've visited within the last 3 hours

CREATE TABLE IF NOT EXISTS location_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    visited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on location_visits table and columns
COMMENT ON TABLE location_visits IS 'Tracks user visits to physical locations for post creation eligibility';
COMMENT ON COLUMN location_visits.id IS 'Unique identifier for the visit record';
COMMENT ON COLUMN location_visits.user_id IS 'User who visited the location';
COMMENT ON COLUMN location_visits.location_id IS 'Location that was visited';
COMMENT ON COLUMN location_visits.visited_at IS 'Timestamp when the user was at the location';
COMMENT ON COLUMN location_visits.latitude IS 'GPS latitude of user at time of visit';
COMMENT ON COLUMN location_visits.longitude IS 'GPS longitude of user at time of visit';
COMMENT ON COLUMN location_visits.accuracy IS 'GPS accuracy in meters (lower is better)';
COMMENT ON COLUMN location_visits.created_at IS 'Timestamp when the visit record was created';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying a user's visits by time (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_location_visits_user_id ON location_visits(user_id);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_location_visits_location_id ON location_visits(location_id);

-- Composite index for user's recent visits (sorted by visit time)
CREATE INDEX IF NOT EXISTS idx_location_visits_user_visited_at
    ON location_visits(user_id, visited_at DESC);

-- Composite index for unique user-location-time queries
CREATE INDEX IF NOT EXISTS idx_location_visits_user_location
    ON location_visits(user_id, location_id, visited_at DESC);

-- Index on created_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_location_visits_created_at ON location_visits(created_at DESC);

-- Partial index for efficient 3-hour window queries
-- This index optimizes the most common query pattern: finding a user's recent visits
-- The WHERE clause filters to only include visits within the 3-hour eligibility window
CREATE INDEX IF NOT EXISTS idx_location_visits_recent
    ON location_visits(user_id, visited_at DESC)
    WHERE visited_at > NOW() - INTERVAL '3 hours';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Users can only see and insert their own location visits
-- This protects user location privacy by preventing access to other users' visits

ALTER TABLE location_visits ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own location visits
CREATE POLICY "location_visits_select_own"
  ON location_visits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert only their own location visits
CREATE POLICY "location_visits_insert_own"
  ON location_visits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: UPDATE and DELETE are intentionally not allowed for regular users
-- Location visits are append-only and should only be cleaned up by system processes
-- This preserves data integrity for post eligibility verification

-- ============================================================================
-- POLICY COMMENTS
-- ============================================================================

COMMENT ON POLICY "location_visits_select_own" ON location_visits IS 'Users can only view their own location visits for privacy';
COMMENT ON POLICY "location_visits_insert_own" ON location_visits IS 'Users can only record their own location visits';

-- ============================================================================
-- RECORD_LOCATION_VISIT FUNCTION
-- ============================================================================
-- Records a user visit to a location if they are within 50 meters proximity.
-- Uses ST_DWithin with geography type for accurate meter-based distance calculations.
-- Verifies the user is physically present at the location before recording.
--
-- Parameters:
--   p_location_id: UUID of the location being visited
--   p_user_lat: User's current latitude (DOUBLE PRECISION)
--   p_user_lon: User's current longitude (DOUBLE PRECISION)
--   p_accuracy: GPS accuracy in meters (DOUBLE PRECISION), optional
--
-- Returns: The inserted location_visit record if within 50m, NULL otherwise

CREATE OR REPLACE FUNCTION record_location_visit(
  p_location_id UUID,
  p_user_lat DOUBLE PRECISION,
  p_user_lon DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS location_visits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_point GEOGRAPHY;
  location_point GEOGRAPHY;
  proximity_radius CONSTANT DOUBLE PRECISION := 50.0; -- 50 meters
  v_location locations%ROWTYPE;
  v_visit location_visits%ROWTYPE;
BEGIN
  -- Look up the location to get its coordinates
  SELECT * INTO v_location
  FROM locations
  WHERE id = p_location_id;

  -- Return NULL if location not found
  IF v_location IS NULL THEN
    RETURN NULL;
  END IF;

  -- Create geography points for user and location (SRID 4326 for WGS 84)
  user_point := ST_SetSRID(ST_MakePoint(p_user_lon, p_user_lat), 4326)::geography;
  location_point := ST_SetSRID(ST_MakePoint(v_location.longitude, v_location.latitude), 4326)::geography;

  -- Check if user is within 50m of the location using ST_DWithin
  IF NOT ST_DWithin(user_point, location_point, proximity_radius) THEN
    -- User is not within proximity, return NULL without inserting
    RETURN NULL;
  END IF;

  -- User is within proximity, insert the visit record
  INSERT INTO location_visits (
    user_id,
    location_id,
    visited_at,
    latitude,
    longitude,
    accuracy
  )
  VALUES (
    auth.uid(),
    p_location_id,
    NOW(),
    p_user_lat,
    p_user_lon,
    p_accuracy
  )
  RETURNING * INTO v_visit;

  RETURN v_visit;
END;
$$;

-- ============================================================================
-- FUNCTION COMMENTS
-- ============================================================================

COMMENT ON FUNCTION record_location_visit(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
  'Records a user visit to a location if within 50m proximity. Uses PostGIS ST_DWithin for accurate distance verification. Returns the visit record if within proximity, NULL otherwise.';