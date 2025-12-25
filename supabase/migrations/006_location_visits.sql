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
