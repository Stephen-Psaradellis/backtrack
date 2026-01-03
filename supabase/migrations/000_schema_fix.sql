-- ============================================================================
-- Schema Fix: Add missing columns to conversations table
-- ============================================================================
-- Run this FIRST before other migrations to fix schema conflicts
-- This adds is_active column that's expected by RLS policies
-- ============================================================================

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE conversations ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE 'Added is_active column to conversations';
    ELSE
        RAISE NOTICE 'is_active column already exists';
    END IF;
END $$;

-- Create index for is_active if not exists
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active) WHERE is_active = true;

-- Composite indexes for user's active conversations
CREATE INDEX IF NOT EXISTS idx_conversations_producer_active_updated
    ON conversations(producer_id, updated_at DESC)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversations_consumer_active_updated
    ON conversations(consumer_id, updated_at DESC)
    WHERE is_active = true;
