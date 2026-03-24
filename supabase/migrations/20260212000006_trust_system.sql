-- ============================================================================
-- Trust System Migration
-- ============================================================================
-- Implements a graduated 5-tier trust system based on user engagement metrics
-- Trust levels unlock progressive features and provide social proof
--
-- Tier 1: Newcomer (0 pts) - Basic access
-- Tier 2: Regular (50 pts) - Unlock reactions, see approximate times
-- Tier 3: Trusted (200 pts) - See broader radius details, icebreakers
-- Tier 4: Verified (500 pts) - Full detail access, priority matching
-- Tier 5: Ambassador (1000 pts) - All features, special badge
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Trust Columns to Profiles Table
-- ============================================================================

-- Add trust_level column (1-5 tier system)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trust_level INTEGER DEFAULT 1 CHECK (trust_level >= 1 AND trust_level <= 5);

-- Add trust_points column (accumulated points)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trust_points INTEGER DEFAULT 0 CHECK (trust_points >= 0);

-- Create index for efficient trust-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_trust_level ON profiles(trust_level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_trust_points ON profiles(trust_points DESC);

-- Add comments
COMMENT ON COLUMN profiles.trust_level IS 'Trust tier (1-5): 1=Newcomer, 2=Regular, 3=Trusted, 4=Verified, 5=Ambassador';
COMMENT ON COLUMN profiles.trust_points IS 'Accumulated trust points based on engagement metrics';

-- ============================================================================
-- STEP 2: Create RPC to Calculate Trust Points
-- ============================================================================

/**
 * Calculate total trust points for a user based on engagement metrics
 *
 * Point allocation:
 * - Account age: 1pt per day (max 90pts)
 * - Posts created: 5pt each (max 250pts)
 * - Matches/conversations: 10pt each (max 200pts)
 * - Check-ins: 2pt each (max 200pts)
 * - Verification bonus: +100pts (one-time)
 * - Reports received: -20pt each (penalty)
 *
 * @param p_user_id - The user's UUID
 * @returns Total trust points (can be negative if heavily reported)
 */
CREATE OR REPLACE FUNCTION calculate_trust_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER := 0;
  v_account_age_days INTEGER;
  v_post_count INTEGER;
  v_match_count INTEGER;
  v_checkin_count INTEGER;
  v_is_verified BOOLEAN;
  v_report_count INTEGER;
BEGIN
  -- Get profile data
  SELECT
    EXTRACT(DAY FROM (NOW() - created_at))::INTEGER,
    is_verified
  INTO
    v_account_age_days,
    v_is_verified
  FROM profiles
  WHERE id = p_user_id;

  -- If profile doesn't exist, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Account age points: 1pt per day, max 90pts
  v_points := v_points + LEAST(v_account_age_days, 90);

  -- Posts created: 5pt each, max 250pts (50 posts)
  SELECT COUNT(*)::INTEGER INTO v_post_count
  FROM posts
  WHERE producer_id = p_user_id;
  v_points := v_points + LEAST(v_post_count * 5, 250);

  -- Matches/conversations: 10pt each, max 200pts (20 matches)
  SELECT COUNT(DISTINCT conversation_id)::INTEGER INTO v_match_count
  FROM (
    SELECT id AS conversation_id FROM conversations WHERE producer_id = p_user_id
    UNION
    SELECT id AS conversation_id FROM conversations WHERE consumer_id = p_user_id
  ) AS user_conversations;
  v_points := v_points + LEAST(v_match_count * 10, 200);

  -- Check-ins: 2pt each, max 200pts (100 check-ins)
  SELECT COUNT(*)::INTEGER INTO v_checkin_count
  FROM user_checkins
  WHERE user_id = p_user_id;
  v_points := v_points + LEAST(v_checkin_count * 2, 200);

  -- Verification bonus: +100pts flat
  IF v_is_verified THEN
    v_points := v_points + 100;
  END IF;

  -- Reports received penalty: -20pt each (no limit)
  SELECT COUNT(*)::INTEGER INTO v_report_count
  FROM reports
  WHERE reported_id = p_user_id AND reported_type = 'user';
  v_points := v_points - (v_report_count * 20);

  -- Ensure points don't go negative
  v_points := GREATEST(v_points, 0);

  RETURN v_points;
END;
$$;

COMMENT ON FUNCTION calculate_trust_points IS 'Calculates total trust points for a user based on engagement metrics';

-- ============================================================================
-- STEP 3: Create RPC to Update User Trust Level
-- ============================================================================

/**
 * Calculate points and update trust level for a user
 *
 * Trust level thresholds:
 * - Level 1 (Newcomer): 0-49 pts
 * - Level 2 (Regular): 50-199 pts
 * - Level 3 (Trusted): 200-499 pts
 * - Level 4 (Verified): 500-999 pts
 * - Level 5 (Ambassador): 1000+ pts
 *
 * @param p_user_id - The user's UUID
 * @returns void - Updates the profiles table directly
 */
CREATE OR REPLACE FUNCTION update_user_trust_level(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Calculate current points
  v_points := calculate_trust_points(p_user_id);

  -- Determine trust level based on points
  IF v_points >= 1000 THEN
    v_new_level := 5; -- Ambassador
  ELSIF v_points >= 500 THEN
    v_new_level := 4; -- Verified
  ELSIF v_points >= 200 THEN
    v_new_level := 3; -- Trusted
  ELSIF v_points >= 50 THEN
    v_new_level := 2; -- Regular
  ELSE
    v_new_level := 1; -- Newcomer
  END IF;

  -- Update profile with new points and level
  UPDATE profiles
  SET
    trust_points = v_points,
    trust_level = v_new_level,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION update_user_trust_level IS 'Updates user trust level based on calculated points';

-- ============================================================================
-- STEP 4: Create Trigger to Update Trust on Profile Changes
-- ============================================================================

/**
 * Trigger function to automatically update trust level when verification status changes
 */
CREATE OR REPLACE FUNCTION trigger_update_trust_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update trust if verification status changed
  IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified) THEN
    PERFORM update_user_trust_level(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS update_trust_on_verification ON profiles;
CREATE TRIGGER update_trust_on_verification
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_trust_on_verification();

-- ============================================================================
-- STEP 5: Initialize Trust Levels for Existing Users
-- ============================================================================

-- Update all existing users' trust levels
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN SELECT id FROM profiles LOOP
    PERFORM update_user_trust_level(v_user_id);
  END LOOP;

  RAISE NOTICE 'Trust levels initialized for all existing users';
END;
$$;

-- ============================================================================
-- STEP 6: Grant Execute Permissions
-- ============================================================================

-- Allow authenticated users to calculate their own trust points
GRANT EXECUTE ON FUNCTION calculate_trust_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_trust_level(UUID) TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Trust system migration complete';
  RAISE NOTICE '- Added trust_level and trust_points columns to profiles';
  RAISE NOTICE '- Created calculate_trust_points() and update_user_trust_level() RPCs';
  RAISE NOTICE '- Created automatic trust update trigger';
  RAISE NOTICE '- Initialized trust levels for existing users';
END;
$$;
