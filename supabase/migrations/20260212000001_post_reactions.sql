-- Post Reactions Feature
-- Allows users to react to posts with predefined reactions

-- ============================================================================
-- TABLE: post_reactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (
    reaction_type IN ('thats_me', 'great_description', 'saw_them_too')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure a user can only add each reaction type once per post
  UNIQUE(post_id, user_id, reaction_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for efficiently querying reactions by post
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id
  ON post_reactions(post_id);

-- Index for querying user's reactions
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id
  ON post_reactions(user_id);

-- Composite index for checking if a user has reacted
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_user
  ON post_reactions(post_id, user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view all reactions on all posts
CREATE POLICY "Users can view all reactions"
  ON post_reactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own reactions
CREATE POLICY "Users can add their own reactions"
  ON post_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions (to toggle reactions off)
CREATE POLICY "Users can remove their own reactions"
  ON post_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE post_reactions IS 'Stores user reactions to posts (thats_me, great_description, saw_them_too)';
COMMENT ON COLUMN post_reactions.reaction_type IS 'Type of reaction: thats_me, great_description, or saw_them_too';
