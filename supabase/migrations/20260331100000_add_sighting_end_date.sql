-- Add sighting_end_date to posts for time range support
-- sighting_date remains as the start time (backwards compatible)
-- sighting_end_date is optional: null means instant/point-in-time sighting
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sighting_end_date timestamptz DEFAULT NULL;
