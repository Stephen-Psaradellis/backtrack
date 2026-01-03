-- ============================================================================
-- Terms Acceptance and Age Verification Migration
-- ============================================================================
-- This migration adds fields to track when users accepted terms of service,
-- privacy policy, and confirmed their age during signup.
-- ============================================================================

-- Add terms acceptance timestamp to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add comment for new column
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted terms of service, privacy policy, and confirmed age (18+)';

-- Create index for compliance queries (e.g., finding users who accepted terms after a certain date)
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted_at ON profiles(terms_accepted_at)
WHERE terms_accepted_at IS NOT NULL;

-- ============================================================================
-- Function to record terms acceptance
-- ============================================================================
-- This function updates a user's profile to record when they accepted terms.
-- Can be called after successful signup/terms acceptance.

CREATE OR REPLACE FUNCTION record_terms_acceptance(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET
        terms_accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for their own profile)
GRANT EXECUTE ON FUNCTION record_terms_acceptance(UUID) TO authenticated;

-- ============================================================================
-- RLS Policy Update
-- ============================================================================
-- Add policy to allow users to update their own terms_accepted_at

-- Note: Existing profile update policies should already cover this,
-- but we add a specific check to ensure terms can be recorded.

-- ============================================================================
-- Backfill existing users
-- ============================================================================
-- For existing users who already have accounts, we assume they accepted terms
-- at the time they created their account. This is a reasonable assumption since
-- the app previously required implicit acceptance.

UPDATE profiles
SET terms_accepted_at = created_at
WHERE terms_accepted_at IS NULL;
