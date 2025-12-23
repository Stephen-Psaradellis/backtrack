-- ============================================================================
-- Love Ledger Moderation Schema Migration
-- ============================================================================
-- This migration creates the moderation tables for the Love Ledger app:
-- - blocks: User blocking to prevent unwanted interactions
-- - reports: Content/user reporting for app store compliance
-- ============================================================================

-- ============================================================================
-- BLOCKS TABLE
-- ============================================================================
-- Allows users to block other users, hiding their content and preventing
-- any interaction. This is required for app store compliance.

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Comment on blocks table and columns
COMMENT ON TABLE blocks IS 'User blocks to prevent unwanted interactions';
COMMENT ON COLUMN blocks.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN blocks.blocked_id IS 'User who is being blocked';
COMMENT ON COLUMN blocks.created_at IS 'Timestamp when the block was created';

-- Create indexes for block queries
-- Index for checking if a specific user is blocked by another
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON blocks(created_at DESC);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
-- Allows users to report inappropriate content or users
-- This is required for app store compliance and content moderation

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reported_type TEXT NOT NULL, -- 'post', 'message', 'user'
    reported_id UUID NOT NULL, -- ID of the reported entity
    reason TEXT NOT NULL,
    additional_details TEXT, -- Optional additional context from reporter
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_at TIMESTAMPTZ, -- When the report was reviewed (if applicable)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Comment on reports table and columns
COMMENT ON TABLE reports IS 'User reports for content moderation and app store compliance';
COMMENT ON COLUMN reports.id IS 'Unique identifier for the report';
COMMENT ON COLUMN reports.reporter_id IS 'User who submitted the report';
COMMENT ON COLUMN reports.reported_type IS 'Type of entity being reported: post, message, or user';
COMMENT ON COLUMN reports.reported_id IS 'UUID of the reported entity (post, message, or user)';
COMMENT ON COLUMN reports.reason IS 'Primary reason for the report (e.g., spam, harassment, inappropriate)';
COMMENT ON COLUMN reports.additional_details IS 'Optional additional context provided by the reporter';
COMMENT ON COLUMN reports.status IS 'Current status of the report: pending, reviewed, resolved, or dismissed';
COMMENT ON COLUMN reports.reviewed_at IS 'Timestamp when the report was reviewed by a moderator';
COMMENT ON COLUMN reports.created_at IS 'Timestamp when the report was submitted';

-- Create indexes for report queries
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_type ON reports(reported_type);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Composite index for pending reports (common moderation query)
CREATE INDEX IF NOT EXISTS idx_reports_pending_created
    ON reports(created_at ASC)
    WHERE status = 'pending';

-- Composite index for reports by type and status (moderation dashboard)
CREATE INDEX IF NOT EXISTS idx_reports_type_status
    ON reports(reported_type, status, created_at DESC);

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure users cannot block themselves
ALTER TABLE blocks ADD CONSTRAINT blocks_no_self_block
    CHECK (blocker_id != blocked_id);

-- Ensure reported_type is valid
ALTER TABLE reports ADD CONSTRAINT reports_valid_type
    CHECK (reported_type IN ('post', 'message', 'user'));

-- Ensure reason is not empty
ALTER TABLE reports ADD CONSTRAINT reports_reason_not_empty
    CHECK (LENGTH(TRIM(reason)) > 0);

-- Ensure reason is not excessively long (1000 characters max)
ALTER TABLE reports ADD CONSTRAINT reports_reason_max_length
    CHECK (LENGTH(reason) <= 1000);

-- Ensure additional_details is not excessively long (5000 characters max)
ALTER TABLE reports ADD CONSTRAINT reports_additional_details_max_length
    CHECK (additional_details IS NULL OR LENGTH(additional_details) <= 5000);

-- Ensure status is valid
ALTER TABLE reports ADD CONSTRAINT reports_valid_status
    CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- ============================================================================
-- FUNCTIONS FOR MODERATION
-- ============================================================================

-- Function to check if user A has blocked user B
CREATE OR REPLACE FUNCTION is_user_blocked(blocker UUID, blocked UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = blocker
        AND blocked_id = blocked
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if there is a mutual block between two users
-- (either user has blocked the other)
CREATE OR REPLACE FUNCTION has_block_relationship(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all user IDs that a user has blocked
CREATE OR REPLACE FUNCTION get_blocked_user_ids(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT blocked_id FROM blocks
    WHERE blocker_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all user IDs that have blocked a user
CREATE OR REPLACE FUNCTION get_blocker_user_ids(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT blocker_id FROM blocks
    WHERE blocked_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all user IDs that should be hidden from a user
-- (users they've blocked + users who have blocked them)
CREATE OR REPLACE FUNCTION get_hidden_user_ids(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT blocked_id FROM blocks WHERE blocker_id = user_id
    UNION
    SELECT DISTINCT blocker_id FROM blocks WHERE blocked_id = user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create a block between users
-- Also automatically deactivates any conversations between them
CREATE OR REPLACE FUNCTION block_user(blocker UUID, blocked UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert the block
    INSERT INTO blocks (blocker_id, blocked_id, created_at)
    VALUES (blocker, blocked, NOW())
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

    -- Deactivate any conversations between these users
    UPDATE conversations
    SET is_active = false
    WHERE (producer_id = blocker AND consumer_id = blocked)
       OR (producer_id = blocked AND consumer_id = blocker);
END;
$$ LANGUAGE plpgsql;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(blocker UUID, blocked UUID)
RETURNS BOOLEAN AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    DELETE FROM blocks
    WHERE blocker_id = blocker
    AND blocked_id = blocked;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RETURN rows_deleted > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to submit a report
CREATE OR REPLACE FUNCTION submit_report(
    p_reporter_id UUID,
    p_reported_type TEXT,
    p_reported_id UUID,
    p_reason TEXT,
    p_additional_details TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    report_id UUID;
BEGIN
    INSERT INTO reports (reporter_id, reported_type, reported_id, reason, additional_details)
    VALUES (p_reporter_id, p_reported_type, p_reported_id, p_reason, p_additional_details)
    RETURNING id INTO report_id;

    RETURN report_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get report count for a specific entity
-- Useful for determining if content should be auto-hidden
CREATE OR REPLACE FUNCTION get_report_count(p_reported_type TEXT, p_reported_id UUID)
RETURNS INTEGER AS $$
DECLARE
    report_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO report_count
    FROM reports
    WHERE reported_type = p_reported_type
    AND reported_id = p_reported_id
    AND status != 'dismissed';

    RETURN report_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has already reported an entity
CREATE OR REPLACE FUNCTION has_user_reported(
    p_reporter_id UUID,
    p_reported_type TEXT,
    p_reported_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM reports
        WHERE reporter_id = p_reporter_id
        AND reported_type = p_reported_type
        AND reported_id = p_reported_id
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Run 004_rls_policies.sql to enable Row Level Security on these tables
-- 2. Consider implementing auto-hide logic when report_count exceeds threshold
-- 3. Set up moderation dashboard to review pending reports
-- 4. The block_user() function automatically deactivates conversations
-- ============================================================================
