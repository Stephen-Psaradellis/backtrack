-- ============================================================================
-- Love Ledger Initial Schema Migration
-- ============================================================================
-- This migration creates the core tables for the Love Ledger app:
-- - profiles: User profiles extending Supabase auth.users
-- - locations: Physical venues/locations where posts can be created
-- - posts: "Missed connection" posts with avatar descriptions
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile information
-- Each authenticated user has exactly one profile record

CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    own_avatar JSONB, -- User's self-description avatar configuration
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on profiles table and columns
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN profiles.id IS 'References auth.users(id) - the primary key';
COMMENT ON COLUMN profiles.display_name IS 'Optional display name for the user';
COMMENT ON COLUMN profiles.own_avatar IS 'JSONB avatar configuration describing the user themselves (for matching)';
COMMENT ON COLUMN profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp when the profile was last updated';

-- Create index for faster updated_at queries
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================
-- Stores physical venues/locations where users can create posts
-- Locations are tied to Google Maps place IDs when available

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    place_id TEXT, -- Google Maps place ID for deduplication and enrichment
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on locations table and columns
COMMENT ON TABLE locations IS 'Physical venues where users can create missed connection posts';
COMMENT ON COLUMN locations.id IS 'Unique identifier for the location';
COMMENT ON COLUMN locations.name IS 'Name of the venue/location';
COMMENT ON COLUMN locations.address IS 'Full address of the location';
COMMENT ON COLUMN locations.latitude IS 'GPS latitude coordinate (10 total digits, 8 after decimal)';
COMMENT ON COLUMN locations.longitude IS 'GPS longitude coordinate (11 total digits, 8 after decimal)';
COMMENT ON COLUMN locations.place_id IS 'Google Maps place ID for venue identification';
COMMENT ON COLUMN locations.created_at IS 'Timestamp when the location was first added';

-- Create indexes for location queries
CREATE INDEX IF NOT EXISTS idx_locations_place_id ON locations(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at DESC);

-- ============================================================================
-- POSTS TABLE
-- ============================================================================
-- "Missed connection" posts created by producers
-- Contains avatar description of person of interest and anonymous note

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    target_avatar JSONB NOT NULL, -- Avatar configuration describing person of interest
    note TEXT NOT NULL,
    selfie_url TEXT, -- Private URL to producer's selfie (not shown to consumers)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Comment on posts table and columns
COMMENT ON TABLE posts IS 'Missed connection posts created by producers at locations';
COMMENT ON COLUMN posts.id IS 'Unique identifier for the post';
COMMENT ON COLUMN posts.producer_id IS 'User who created this post';
COMMENT ON COLUMN posts.location_id IS 'Location where this post was created';
COMMENT ON COLUMN posts.target_avatar IS 'JSONB avatar configuration describing the person of interest';
COMMENT ON COLUMN posts.note IS 'Anonymous note/message left by the producer';
COMMENT ON COLUMN posts.selfie_url IS 'Private selfie URL for verification (not publicly visible)';
COMMENT ON COLUMN posts.created_at IS 'Timestamp when the post was created';
COMMENT ON COLUMN posts.expires_at IS 'Timestamp when the post expires (defaults to 30 days)';
COMMENT ON COLUMN posts.is_active IS 'Whether the post is currently active and visible';

-- Create indexes for post queries
CREATE INDEX IF NOT EXISTS idx_posts_producer_id ON posts(producer_id);
CREATE INDEX IF NOT EXISTS idx_posts_location_id ON posts(location_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON posts(expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_active ON posts(is_active) WHERE is_active = true;

-- Composite index for location-based active posts queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_posts_location_active_created
    ON posts(location_id, created_at DESC)
    WHERE is_active = true;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
-- This ensures every auth.users entry has a corresponding profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NULL), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Function to deactivate expired posts (can be called by cron job or edge function)
CREATE OR REPLACE FUNCTION deactivate_expired_posts()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE posts
    SET is_active = false
    WHERE is_active = true
    AND expires_at < NOW();

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure note has content
ALTER TABLE posts ADD CONSTRAINT posts_note_not_empty
    CHECK (LENGTH(TRIM(note)) > 0);

-- Ensure target_avatar is a valid JSON object
ALTER TABLE posts ADD CONSTRAINT posts_target_avatar_is_object
    CHECK (jsonb_typeof(target_avatar) = 'object');

-- Ensure location name has content
ALTER TABLE locations ADD CONSTRAINT locations_name_not_empty
    CHECK (LENGTH(TRIM(name)) > 0);

-- Ensure latitude is within valid range (-90 to 90)
ALTER TABLE locations ADD CONSTRAINT locations_latitude_range
    CHECK (latitude >= -90 AND latitude <= 90);

-- Ensure longitude is within valid range (-180 to 180)
ALTER TABLE locations ADD CONSTRAINT locations_longitude_range
    CHECK (longitude >= -180 AND longitude <= 180);

-- ============================================================================
-- INITIAL SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Run 004_rls_policies.sql to enable Row Level Security
-- 2. Configure storage buckets via 005_storage_policies.sql
-- 3. Test that profile is auto-created when user signs up
-- ============================================================================
