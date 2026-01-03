-- ============================================================================
-- Backtrack Favorite Locations Migration
-- ============================================================================
-- Migration: 007_favorite_locations.sql
-- Description: Creates the favorite_locations table for users to save
--              frequently visited venues with custom names for quick access
-- Security Model:
--   - Users can only view, create, update, and delete their own favorites
-- ============================================================================

-- ============================================================================
-- FAVORITE LOCATIONS TABLE
-- ============================================================================
-- Stores user's favorite locations for quick access to post creation and
-- ledger browsing. Each user can save venues with custom labels.

CREATE TABLE IF NOT EXISTS favorite_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    custom_name TEXT NOT NULL,
    place_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    place_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Validate custom_name length (1-50 characters)
    CONSTRAINT favorite_locations_custom_name_length CHECK (
        char_length(custom_name) > 0 AND char_length(custom_name) <= 50
    )
);

-- Comment on favorite_locations table and columns
COMMENT ON TABLE favorite_locations IS 'User saved favorite locations for quick access to posting and browsing';
COMMENT ON COLUMN favorite_locations.id IS 'Unique identifier for the favorite location';
COMMENT ON COLUMN favorite_locations.user_id IS 'User who saved this favorite (references auth.users)';
COMMENT ON COLUMN favorite_locations.custom_name IS 'User-defined label for this location (1-50 characters)';
COMMENT ON COLUMN favorite_locations.place_name IS 'Actual venue/place name from Google Places';
COMMENT ON COLUMN favorite_locations.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN favorite_locations.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN favorite_locations.address IS 'Full address of the location';
COMMENT ON COLUMN favorite_locations.place_id IS 'Google Places ID for venue identification';
COMMENT ON COLUMN favorite_locations.created_at IS 'Timestamp when the favorite was created';
COMMENT ON COLUMN favorite_locations.updated_at IS 'Timestamp when the favorite was last updated';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary index for user's favorites queries
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_id
    ON favorite_locations(user_id);

-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_created
    ON favorite_locations(user_id, created_at DESC);

-- Index for ordering by last updated (most recently used)
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_updated
    ON favorite_locations(user_id, updated_at DESC);

-- Index for place_id lookups (to find if a place is already favorited)
CREATE INDEX IF NOT EXISTS idx_favorite_locations_place_id
    ON favorite_locations(user_id, place_id)
    WHERE place_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to favorite_locations table
DROP TRIGGER IF EXISTS favorite_locations_updated_at ON favorite_locations;
CREATE TRIGGER favorite_locations_updated_at
    BEFORE UPDATE ON favorite_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE favorite_locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Users can only access their own favorite locations
-- All CRUD operations are restricted to the owner

-- Allow users to view their own favorites
DROP POLICY IF EXISTS "favorite_locations_select_own" ON favorite_locations;
CREATE POLICY "favorite_locations_select_own"
    ON favorite_locations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own favorites
DROP POLICY IF EXISTS "favorite_locations_insert_own" ON favorite_locations;
CREATE POLICY "favorite_locations_insert_own"
    ON favorite_locations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own favorites
DROP POLICY IF EXISTS "favorite_locations_update_own" ON favorite_locations;
CREATE POLICY "favorite_locations_update_own"
    ON favorite_locations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own favorites
DROP POLICY IF EXISTS "favorite_locations_delete_own" ON favorite_locations;
CREATE POLICY "favorite_locations_delete_own"
    ON favorite_locations
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- POLICY COMMENTS
-- ============================================================================

COMMENT ON POLICY "favorite_locations_select_own" ON favorite_locations
    IS 'Users can only view their own favorite locations';
COMMENT ON POLICY "favorite_locations_insert_own" ON favorite_locations
    IS 'Users can only create favorites for themselves';
COMMENT ON POLICY "favorite_locations_update_own" ON favorite_locations
    IS 'Users can only update their own favorites (e.g., rename)';
COMMENT ON POLICY "favorite_locations_delete_own" ON favorite_locations
    IS 'Users can only delete their own favorites';
