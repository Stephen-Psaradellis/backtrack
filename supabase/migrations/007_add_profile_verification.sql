-- ============================================================================
-- Profile Verification Schema Migration
-- ============================================================================
-- This migration adds verification fields to the profiles table for the
-- Verified User Badge System. Users can be verified by administrators to
-- display a verification badge on their profile.
--
-- Key features:
-- - is_verified: Boolean flag indicating if user is verified
-- - verified_at: Timestamp when verification was granted
-- - Index for efficient queries on verified users
-- ============================================================================

-- ============================================================================
-- ADD VERIFICATION COLUMNS TO PROFILES TABLE
-- ============================================================================
-- Adds fields to track user verification status
-- Only admins can set these fields (enforced at application/RLS level)

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ============================================================================
-- COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.is_verified IS 'Whether the user has been verified by an administrator';
COMMENT ON COLUMN profiles.verified_at IS 'Timestamp when the user was verified (NULL if not verified)';

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for querying verified users efficiently

CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified) WHERE is_verified = TRUE;
