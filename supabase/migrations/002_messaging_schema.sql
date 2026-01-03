-- ============================================================================
-- Love Ledger Messaging Schema Migration
-- ============================================================================
-- This migration creates the messaging tables for the Love Ledger app:
-- - conversations: Anonymous chat sessions between producer and consumer
-- - messages: Individual messages within conversations
-- ============================================================================

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Anonymous chat sessions initiated when a consumer matches with a post
-- Links a post's producer with an interested consumer

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    producer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    consumer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Comment on conversations table and columns
COMMENT ON TABLE conversations IS 'Anonymous chat sessions between post producer and consumer';
COMMENT ON COLUMN conversations.id IS 'Unique identifier for the conversation';
COMMENT ON COLUMN conversations.post_id IS 'The post that initiated this conversation';
COMMENT ON COLUMN conversations.producer_id IS 'User who created the original post';
COMMENT ON COLUMN conversations.consumer_id IS 'User who initiated the conversation (matched with the post)';
COMMENT ON COLUMN conversations.created_at IS 'Timestamp when the conversation was started';
COMMENT ON COLUMN conversations.updated_at IS 'Timestamp of the last activity in the conversation';
COMMENT ON COLUMN conversations.is_active IS 'Whether the conversation is currently active';

-- Create indexes for conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_post_id ON conversations(post_id);
CREATE INDEX IF NOT EXISTS idx_conversations_producer_id ON conversations(producer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_consumer_id ON conversations(consumer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active) WHERE is_active = true;

-- Composite index for user's active conversations (common query pattern)
CREATE INDEX IF NOT EXISTS idx_conversations_producer_active_updated
    ON conversations(producer_id, updated_at DESC)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_conversations_consumer_active_updated
    ON conversations(consumer_id, updated_at DESC)
    WHERE is_active = true;

-- Ensure one conversation per post-consumer pair (prevent duplicate conversations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_post_consumer_unique
    ON conversations(post_id, consumer_id);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Individual messages within a conversation
-- Both producer and consumer can send messages

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL
);

-- Comment on messages table and columns
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON COLUMN messages.id IS 'Unique identifier for the message';
COMMENT ON COLUMN messages.conversation_id IS 'The conversation this message belongs to';
COMMENT ON COLUMN messages.sender_id IS 'User who sent this message';
COMMENT ON COLUMN messages.content IS 'The message text content';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when the message was sent';
COMMENT ON COLUMN messages.is_read IS 'Whether the recipient has read this message';

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = false;

-- Composite index for conversation messages (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages(conversation_id, created_at ASC);

-- Composite index for unread messages per conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread
    ON messages(conversation_id, created_at ASC)
    WHERE is_read = false;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to conversations table
-- (reuses update_updated_at_column() from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation updated_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure message content is not empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_not_empty') THEN
        ALTER TABLE messages ADD CONSTRAINT messages_content_not_empty
            CHECK (LENGTH(TRIM(content)) > 0);
    END IF;
END $$;

-- Ensure message content is not excessively long (10,000 characters max)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_max_length') THEN
        ALTER TABLE messages ADD CONSTRAINT messages_content_max_length
            CHECK (LENGTH(content) <= 10000);
    END IF;
END $$;

-- Ensure producer and consumer are different users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_different_users') THEN
        ALTER TABLE conversations ADD CONSTRAINT conversations_different_users
            CHECK (producer_id != consumer_id);
    END IF;
END $$;

-- ============================================================================
-- FUNCTIONS FOR MESSAGING
-- ============================================================================

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.is_read = false
    AND m.sender_id != user_id
    AND (c.producer_id = user_id OR c.consumer_id = user_id)
    AND c.is_active = true;

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to mark all messages in a conversation as read for a user
CREATE OR REPLACE FUNCTION mark_conversation_as_read(conv_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE messages
    SET is_read = true
    WHERE conversation_id = conv_id
    AND sender_id != user_id
    AND is_read = false;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SETUP NOTES
-- ============================================================================
-- After running this migration:
-- 1. Run 004_rls_policies.sql to enable Row Level Security
-- 2. Configure Supabase Realtime for messages table for live updates
-- 3. Test conversation creation and message sending
-- ============================================================================
