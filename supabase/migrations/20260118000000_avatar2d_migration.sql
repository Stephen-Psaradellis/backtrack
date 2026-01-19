-- Avatar 2D Migration
-- Migrates from 3D GLB-based avatars to 2D component-based system
--
-- IMPORTANT: This is a fresh start - all existing avatar data will be reset to NULL
-- Users will need to create new 2D avatars

-- ============================================
-- Step 1: Update profiles table
-- ============================================

-- Add avatar_version column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_version'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_version INTEGER DEFAULT 1;
  END IF;
END $$;

-- Reset all avatars to NULL and mark as version 2 (2D system)
UPDATE profiles
SET
  avatar = NULL,
  avatar_version = 2,
  updated_at = NOW()
WHERE avatar IS NOT NULL OR avatar_version != 2;

-- ============================================
-- Step 2: Update posts table
-- ============================================

-- Reset target avatars in posts
UPDATE posts
SET
  target_avatar_v2 = NULL,
  updated_at = NOW()
WHERE target_avatar_v2 IS NOT NULL;

-- ============================================
-- Step 3: Cleanup old avatar infrastructure
-- ============================================

-- Drop avatar snapshot cache table if it exists
DROP TABLE IF EXISTS avatar_snapshot_cache CASCADE;

-- Drop any avatar-related functions
DROP FUNCTION IF EXISTS get_avatar_snapshot(uuid);
DROP FUNCTION IF EXISTS cache_avatar_snapshot(uuid, text);
DROP FUNCTION IF EXISTS invalidate_avatar_cache(uuid);

-- ============================================
-- Step 4: Create new avatar helper functions
-- ============================================

-- Function to validate 2D avatar config structure
CREATE OR REPLACE FUNCTION validate_avatar2d_config(config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check required fields exist
  IF config IS NULL THEN
    RETURN TRUE; -- NULL is valid (no avatar set)
  END IF;

  -- Must have type = '2d'
  IF config->>'type' != '2d' THEN
    RETURN FALSE;
  END IF;

  -- Must have config object with required fields
  IF config->'config' IS NULL THEN
    RETURN FALSE;
  END IF;

  IF config->'config'->>'gender' IS NULL
     OR config->'config'->>'skinTone' IS NULL
     OR config->'config'->>'hairStyle' IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment to document the new avatar format
COMMENT ON COLUMN profiles.avatar IS 'JSON object containing 2D avatar config. Format: {type: "2d", config: {gender, skinTone, hairStyle, ...}, id, createdAt, updatedAt}';
COMMENT ON COLUMN posts.target_avatar_v2 IS 'JSON object containing 2D avatar config for target person. Same format as profiles.avatar';

-- ============================================
-- Step 5: Storage bucket cleanup (manual)
-- ============================================

-- NOTE: Storage bucket cleanup should be done via Supabase dashboard
-- The following buckets can be deleted:
--   - avatar-snapshots
--   - avatar-models
--
-- DO NOT run these programmatically, handle via dashboard:
-- DELETE FROM storage.buckets WHERE name IN ('avatar-snapshots', 'avatar-models');

-- ============================================
-- Migration complete
-- ============================================

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Avatar 2D migration complete. All avatar data reset to NULL.';
  RAISE NOTICE 'Users will need to create new 2D avatars.';
END $$;
