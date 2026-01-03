-- ============================================================================
-- Time-Specific Posts Schema Migration
-- ============================================================================
-- This migration adds time-related fields to the posts table for the
-- Time-Specific Posts feature. Users can optionally specify when they saw
-- someone at a location, with support for both specific times and approximate
-- time periods (morning, afternoon, evening).
--
-- Key features:
-- - sighting_date: Optional timestamp when user saw the person of interest
-- - time_granularity: Specifies if time is specific or approximate (morning/afternoon/evening)
-- - Index for efficient time-based filtering and sorting
-- - Supports 30-day de-prioritization for post ranking
--
-- This is a key market differentiator addressing market gap-2 by adding
-- specificity and credibility to posts (e.g., "Saw you at Blue Bottle on Tuesday at 3pm")
-- ============================================================================

-- ============================================================================
-- ADD TIME COLUMNS TO POSTS TABLE
-- ============================================================================
-- Adds optional fields to specify when the user saw the person of interest
-- Both fields are optional to maintain backward compatibility with existing posts

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS sighting_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS time_granularity TEXT;

-- ============================================================================
-- ADD CHECK CONSTRAINT FOR TIME GRANULARITY
-- ============================================================================
-- Constrain time_granularity to valid enum values:
-- - 'specific': Exact time (e.g., "3:15 PM")
-- - 'morning': Approximate morning time (6am-12pm)
-- - 'afternoon': Approximate afternoon time (12pm-6pm)
-- - 'evening': Approximate evening time (6pm-12am)
-- NULL is allowed for posts without time specification

DO $$
BEGIN
    -- Add constraint only if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'posts_valid_time_granularity'
    ) THEN
        ALTER TABLE posts
            ADD CONSTRAINT posts_valid_time_granularity
            CHECK (time_granularity IS NULL OR time_granularity IN ('specific', 'morning', 'afternoon', 'evening'));
    END IF;
END $$;

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN posts.sighting_date IS 'Optional timestamp when the producer saw the person of interest at the location';
COMMENT ON COLUMN posts.time_granularity IS 'Time precision: specific (exact time), morning (6am-12pm), afternoon (12pm-6pm), or evening (6pm-12am). NULL if time not specified.';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for efficient time-based filtering and sorting queries

-- Primary index for sighting_date filtering and sorting (most recent first)
CREATE INDEX IF NOT EXISTS idx_posts_sighting_date ON posts(sighting_date DESC);

-- Composite index for time-based active posts queries (location + time filtering)
CREATE INDEX IF NOT EXISTS idx_posts_location_sighting_date
    ON posts(location_id, sighting_date DESC)
    WHERE is_active = true AND sighting_date IS NOT NULL;

-- Index for 30-day deprioritization queries (efficient lookup of recent vs old posts)
CREATE INDEX IF NOT EXISTS idx_posts_sighting_date_30_days
    ON posts(sighting_date DESC);
