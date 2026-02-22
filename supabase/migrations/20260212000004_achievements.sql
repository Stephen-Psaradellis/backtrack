-- ============================================================================
-- Achievement System Migration
-- ============================================================================
-- Creates tables and functions for a gamified achievement/trophy system
-- Users earn badges across 5 categories: Explorer, Social, Streak, Creator, Safety
-- ============================================================================

-- ============================================================================
-- Achievement Definitions Table
-- ============================================================================
CREATE TABLE achievement_definitions (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('explorer', 'social', 'streak', 'creator', 'safety')),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  requirement_type text NOT NULL,
  requirement_value int NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE achievement_definitions IS 'Defines all available achievements with their requirements';
COMMENT ON COLUMN achievement_definitions.category IS 'Achievement category: explorer, social, streak, creator, safety';
COMMENT ON COLUMN achievement_definitions.tier IS 'Achievement tier: bronze, silver, gold';
COMMENT ON COLUMN achievement_definitions.requirement_type IS 'Type of requirement (e.g., visit_locations, start_conversations, check_in_streak)';
COMMENT ON COLUMN achievement_definitions.requirement_value IS 'Numeric value to reach (e.g., 10 locations, 5 conversations)';

-- ============================================================================
-- User Achievements Table
-- ============================================================================
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

COMMENT ON TABLE user_achievements IS 'Tracks which achievements each user has earned';

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at DESC);

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievement definitions are publicly readable
CREATE POLICY "achievement_definitions_select_all"
  ON achievement_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can read all user achievements (to see leaderboards, etc.)
CREATE POLICY "user_achievements_select_all"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own achievements
CREATE POLICY "user_achievements_insert_own"
  ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON achievement_definitions TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO authenticated;

-- ============================================================================
-- Seed Achievement Definitions (15-20 achievements)
-- ============================================================================

-- Explorer Category (Bronze/Silver/Gold progression)
INSERT INTO achievement_definitions (id, category, name, description, icon, tier, requirement_type, requirement_value) VALUES
('explorer_first_steps', 'explorer', 'First Steps', 'Visit your first location', 'pin', 'bronze', 'visit_locations', 1),
('explorer_neighborhood_scout', 'explorer', 'Neighborhood Scout', 'Visit 10 different locations', 'map', 'silver', 'visit_locations', 10),
('explorer_city_explorer', 'explorer', 'City Explorer', 'Visit 50 different locations', 'globe', 'gold', 'visit_locations', 50),
('explorer_adventurer', 'explorer', 'Adventurer', 'Visit 25 different locations', 'compass', 'silver', 'visit_locations', 25);

-- Social Category
INSERT INTO achievement_definitions (id, category, name, description, icon, tier, requirement_type, requirement_value) VALUES
('social_ice_breaker', 'social', 'Ice Breaker', 'Start your first conversation', 'chatbubble', 'bronze', 'start_conversations', 1),
('social_butterfly', 'social', 'Social Butterfly', 'Start 5 conversations', 'chatbubbles', 'silver', 'start_conversations', 5),
('social_connector', 'social', 'Connector', 'Match with 10 people', 'people', 'gold', 'matches', 10),
('social_networker', 'social', 'Networker', 'Match with 3 people', 'person-add', 'bronze', 'matches', 3);

-- Streak Category
INSERT INTO achievement_definitions (id, category, name, description, icon, tier, requirement_type, requirement_value) VALUES
('streak_regular', 'streak', 'Regular', 'Check in for 3 consecutive days', 'flame', 'bronze', 'check_in_streak', 3),
('streak_dedicated', 'streak', 'Dedicated', 'Check in for 7 consecutive days', 'fire', 'silver', 'check_in_streak', 7),
('streak_unstoppable', 'streak', 'Unstoppable', 'Check in for 30 consecutive days', 'bonfire', 'gold', 'check_in_streak', 30);

-- Creator Category
INSERT INTO achievement_definitions (id, category, name, description, icon, tier, requirement_type, requirement_value) VALUES
('creator_first_post', 'creator', 'First Post', 'Create your first post', 'create', 'bronze', 'create_posts', 1),
('creator_storyteller', 'creator', 'Storyteller', 'Create 10 posts', 'book', 'silver', 'create_posts', 10),
('creator_prolific', 'creator', 'Prolific', 'Create 50 posts', 'library', 'gold', 'create_posts', 50),
('creator_active', 'creator', 'Active Creator', 'Create 5 posts', 'pencil', 'bronze', 'create_posts', 5);

-- Safety Category
INSERT INTO achievement_definitions (id, category, name, description, icon, tier, requirement_type, requirement_value) VALUES
('safety_verified', 'safety', 'Verified', 'Complete profile verification', 'shield-checkmark', 'bronze', 'verified', 1),
('safety_guardian', 'safety', 'Guardian', 'Report 1 safety issue', 'alert-circle', 'silver', 'reports', 1),
('safety_trusted', 'safety', 'Trusted Member', 'Maintain good standing for 30 days', 'star', 'gold', 'trust_days', 30);

-- ============================================================================
-- RPC Function: Check and Award Achievements
-- ============================================================================

/**
 * Check user's progress and automatically award any earned achievements
 *
 * This function:
 * 1. Calculates current progress for each achievement type
 * 2. Awards any achievements that have been earned but not yet awarded
 * 3. Returns the newly awarded achievements
 *
 * @param p_user_id - The user ID to check achievements for
 * @returns Array of newly awarded achievement IDs
 */
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id text, achievement_name text, tier text) AS $$
DECLARE
  v_locations_visited int;
  v_conversations_started int;
  v_matches_count int;
  v_current_streak int;
  v_posts_created int;
  v_is_verified boolean;
  v_reports_count int;
  v_account_age_days int;
BEGIN
  -- Calculate user's current stats

  -- Unique locations visited (from checkins)
  SELECT COUNT(DISTINCT location_id)
  INTO v_locations_visited
  FROM checkins
  WHERE user_id = p_user_id;

  -- Conversations started (user is producer)
  SELECT COUNT(*)
  INTO v_conversations_started
  FROM conversations
  WHERE producer_id = p_user_id;

  -- Matches count (conversations with at least one message exchange)
  SELECT COUNT(DISTINCT c.id)
  INTO v_matches_count
  FROM conversations c
  WHERE (c.producer_id = p_user_id OR c.consumer_id = p_user_id)
    AND EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.conversation_id = c.id
    );

  -- Current check-in streak (simplified - consecutive days with at least one check-in)
  -- Note: This is a basic implementation; a more robust streak calculation would be recommended
  WITH daily_checkins AS (
    SELECT DISTINCT DATE(created_at) as check_date
    FROM checkins
    WHERE user_id = p_user_id
    ORDER BY check_date DESC
  ),
  streak_calc AS (
    SELECT
      check_date,
      ROW_NUMBER() OVER (ORDER BY check_date DESC) as rn,
      check_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY check_date DESC) - 1) as expected_date
    FROM daily_checkins
  )
  SELECT COUNT(*)
  INTO v_current_streak
  FROM streak_calc
  WHERE DATE(expected_date) = check_date;

  -- Posts created
  SELECT COUNT(*)
  INTO v_posts_created
  FROM posts
  WHERE user_id = p_user_id;

  -- Verification status
  SELECT COALESCE(is_verified, false)
  INTO v_is_verified
  FROM profiles
  WHERE id = p_user_id;

  -- Reports submitted (if there's a reports table; otherwise set to 0)
  -- Note: Assuming a 'reports' table exists with user_id as reporter
  v_reports_count := 0;
  -- SELECT COUNT(*) INTO v_reports_count FROM reports WHERE user_id = p_user_id;

  -- Account age in days
  SELECT EXTRACT(DAY FROM (NOW() - created_at))
  INTO v_account_age_days
  FROM profiles
  WHERE id = p_user_id;

  -- Award achievements based on progress
  -- Insert only if user hasn't already earned them
  RETURN QUERY
  INSERT INTO user_achievements (user_id, achievement_id)
  SELECT p_user_id, ad.id
  FROM achievement_definitions ad
  WHERE NOT EXISTS (
    SELECT 1 FROM user_achievements ua
    WHERE ua.user_id = p_user_id AND ua.achievement_id = ad.id
  )
  AND (
    -- Explorer achievements
    (ad.requirement_type = 'visit_locations' AND v_locations_visited >= ad.requirement_value)
    OR
    -- Social achievements (conversations)
    (ad.requirement_type = 'start_conversations' AND v_conversations_started >= ad.requirement_value)
    OR
    -- Social achievements (matches)
    (ad.requirement_type = 'matches' AND v_matches_count >= ad.requirement_value)
    OR
    -- Streak achievements
    (ad.requirement_type = 'check_in_streak' AND v_current_streak >= ad.requirement_value)
    OR
    -- Creator achievements
    (ad.requirement_type = 'create_posts' AND v_posts_created >= ad.requirement_value)
    OR
    -- Safety achievements (verified)
    (ad.requirement_type = 'verified' AND v_is_verified = true)
    OR
    -- Safety achievements (reports)
    (ad.requirement_type = 'reports' AND v_reports_count >= ad.requirement_value)
    OR
    -- Safety achievements (trust days)
    (ad.requirement_type = 'trust_days' AND v_account_age_days >= ad.requirement_value)
  )
  RETURNING user_achievements.achievement_id, ad.name, ad.tier
  FROM achievement_definitions ad
  WHERE ad.id = user_achievements.achievement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_and_award_achievements IS 'Check user progress and award any earned achievements';

-- ============================================================================
-- RPC Function: Calculate User Streak
-- ============================================================================

/**
 * Calculate a user's current check-in streak
 *
 * @param p_user_id - The user ID to calculate streak for
 * @returns The current consecutive day streak count
 */
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_streak int;
BEGIN
  WITH daily_checkins AS (
    SELECT DISTINCT DATE(created_at) as check_date
    FROM checkins
    WHERE user_id = p_user_id
    ORDER BY check_date DESC
  ),
  streak_calc AS (
    SELECT
      check_date,
      ROW_NUMBER() OVER (ORDER BY check_date DESC) as rn,
      check_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY check_date DESC) - 1) as expected_date
    FROM daily_checkins
  )
  SELECT COUNT(*)
  INTO v_current_streak
  FROM streak_calc
  WHERE DATE(expected_date) = check_date;

  RETURN COALESCE(v_current_streak, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_user_streak IS 'Calculate a user''s current consecutive check-in streak';

-- ============================================================================
-- RPC Function: Get Streak Leaderboard
-- ============================================================================

/**
 * Get the top users by check-in streak
 *
 * @param p_location_id - Optional location filter
 * @param p_limit - Maximum number of results (default 10)
 * @returns Array of users with their streak data
 */
CREATE OR REPLACE FUNCTION get_streak_leaderboard(
  p_location_id TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  current_streak INT,
  max_streak INT,
  location_id TEXT,
  location_name TEXT
) AS $$
BEGIN
  -- If location_id is provided, get streaks for that location
  IF p_location_id IS NOT NULL THEN
    RETURN QUERY
    WITH user_streaks AS (
      SELECT
        c.user_id,
        p.display_name,
        calculate_user_streak(c.user_id) as streak_count
      FROM checkins c
      JOIN profiles p ON p.id = c.user_id
      WHERE c.location_id = p_location_id
      GROUP BY c.user_id, p.display_name
    )
    SELECT
      us.user_id,
      us.display_name,
      us.streak_count as current_streak,
      us.streak_count as max_streak, -- simplified: current = max for now
      p_location_id as location_id,
      CAST(NULL AS TEXT) as location_name -- would need locations table to populate
    FROM user_streaks us
    WHERE us.streak_count > 0
    ORDER BY us.streak_count DESC, us.user_id
    LIMIT p_limit;
  ELSE
    -- Global leaderboard - top streakers across all locations
    RETURN QUERY
    WITH user_streaks AS (
      SELECT DISTINCT
        c.user_id,
        p.display_name,
        calculate_user_streak(c.user_id) as streak_count,
        FIRST_VALUE(c.location_id) OVER (
          PARTITION BY c.user_id
          ORDER BY c.created_at DESC
        ) as recent_location_id
      FROM checkins c
      JOIN profiles p ON p.id = c.user_id
    )
    SELECT
      us.user_id,
      us.display_name,
      us.streak_count as current_streak,
      us.streak_count as max_streak,
      us.recent_location_id as location_id,
      CAST(NULL AS TEXT) as location_name
    FROM user_streaks us
    WHERE us.streak_count > 0
    ORDER BY us.streak_count DESC, us.user_id
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_streak_leaderboard IS 'Get top users by check-in streak, optionally filtered by location';
