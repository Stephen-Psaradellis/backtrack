/**
 * Database Entity Types
 *
 * TypeScript type definitions for all database tables in the Love Ledger app.
 * These types mirror the Supabase PostgreSQL schema defined in migrations.
 */

import type { AvatarConfig } from './avatar'

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * UUID type alias for readability
 */
export type UUID = string

/**
 * ISO 8601 timestamp string (from Supabase)
 */
export type Timestamp = string

// ============================================================================
// PROFILES
// ============================================================================

/**
 * User profile extending Supabase auth.users
 *
 * Each authenticated user has exactly one profile record.
 * Profiles are automatically created via database trigger on signup.
 */
export interface Profile {
  /** References auth.users(id) - the primary key */
  id: UUID
  /** Optional display name for the user */
  display_name: string | null
  /** JSONB avatar configuration describing the user themselves (for matching) */
  own_avatar: AvatarConfig | null
  /** Timestamp when the profile was created */
  created_at: Timestamp
  /** Timestamp when the profile was last updated */
  updated_at: Timestamp
}

/**
 * Fields that can be updated on a profile
 */
export interface ProfileUpdate {
  display_name?: string | null
  own_avatar?: AvatarConfig | null
}

/**
 * Fields required when inserting a new profile (id is required, others optional)
 */
export interface ProfileInsert {
  id: UUID
  display_name?: string | null
  own_avatar?: AvatarConfig | null
}

// ============================================================================
// LOCATIONS
// ============================================================================

/**
 * Physical venue where posts can be created
 *
 * Locations are tied to Google Maps place IDs when available
 * for deduplication and venue enrichment.
 */
export interface Location {
  /** Unique identifier for the location */
  id: UUID
  /** Name of the venue/location */
  name: string
  /** Full address of the location */
  address: string | null
  /** GPS latitude coordinate */
  latitude: number
  /** GPS longitude coordinate */
  longitude: number
  /** Google Maps place ID for venue identification */
  place_id: string | null
  /** Timestamp when the location was first added */
  created_at: Timestamp
}

/**
 * Fields that can be updated on a location
 */
export interface LocationUpdate {
  name?: string
  address?: string | null
  latitude?: number
  longitude?: number
  place_id?: string | null
}

/**
 * Fields required when inserting a new location
 */
export interface LocationInsert {
  name: string
  address?: string | null
  latitude: number
  longitude: number
  place_id?: string | null
}

// ============================================================================
// POSTS
// ============================================================================

/**
 * "Missed connection" post created by a producer at a location
 *
 * Contains avatar description of person of interest and anonymous note.
 * Posts expire after 30 days by default.
 */
export interface Post {
  /** Unique identifier for the post */
  id: UUID
  /** User who created this post */
  producer_id: UUID
  /** Location where this post was created */
  location_id: UUID
  /** JSONB avatar configuration describing the person of interest */
  target_avatar: AvatarConfig
  /** Anonymous note/message left by the producer */
  note: string
  /** Private selfie URL for verification (not publicly visible) */
  selfie_url: string | null
  /** Timestamp when the post was created */
  created_at: Timestamp
  /** Timestamp when the post expires (defaults to 30 days) */
  expires_at: Timestamp
  /** Whether the post is currently active and visible */
  is_active: boolean
}

/**
 * Fields that can be updated on a post
 */
export interface PostUpdate {
  target_avatar?: AvatarConfig
  note?: string
  selfie_url?: string | null
  is_active?: boolean
}

/**
 * Fields required when inserting a new post
 */
export interface PostInsert {
  producer_id: UUID
  location_id: UUID
  target_avatar: AvatarConfig
  note: string
  selfie_url?: string | null
}

/**
 * Post with expanded location and profile data
 * Used for displaying posts in the ledger
 */
export interface PostWithDetails extends Post {
  location: Location
  producer?: Pick<Profile, 'id' | 'display_name'>
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Anonymous chat session between a post producer and consumer
 *
 * Created when a consumer initiates contact with a post creator.
 * Each post-consumer pair can only have one conversation.
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: UUID
  /** The post that initiated this conversation */
  post_id: UUID
  /** User who created the original post */
  producer_id: UUID
  /** User who initiated the conversation (matched with the post) */
  consumer_id: UUID
  /** Timestamp when the conversation was started */
  created_at: Timestamp
  /** Timestamp of the last activity in the conversation */
  updated_at: Timestamp
  /** Whether the conversation is currently active */
  is_active: boolean
}

/**
 * Fields that can be updated on a conversation
 */
export interface ConversationUpdate {
  is_active?: boolean
}

/**
 * Fields required when inserting a new conversation
 */
export interface ConversationInsert {
  post_id: UUID
  producer_id: UUID
  consumer_id: UUID
}

/**
 * Conversation with expanded related data
 * Used for displaying in chat list
 */
export interface ConversationWithDetails extends Conversation {
  post: Pick<Post, 'id' | 'target_avatar' | 'note'>
  other_user?: Pick<Profile, 'id' | 'display_name' | 'own_avatar'>
  last_message?: Pick<Message, 'content' | 'created_at' | 'sender_id'>
  unread_count?: number
}

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Individual message within a conversation
 *
 * Both producer and consumer can send messages.
 */
export interface Message {
  /** Unique identifier for the message */
  id: UUID
  /** The conversation this message belongs to */
  conversation_id: UUID
  /** User who sent this message */
  sender_id: UUID
  /** The message text content */
  content: string
  /** Timestamp when the message was sent */
  created_at: Timestamp
  /** Whether the recipient has read this message */
  is_read: boolean
}

/**
 * Fields that can be updated on a message
 */
export interface MessageUpdate {
  is_read?: boolean
}

/**
 * Fields required when inserting a new message
 */
export interface MessageInsert {
  conversation_id: UUID
  sender_id: UUID
  content: string
}

/**
 * Message with sender information
 */
export interface MessageWithSender extends Message {
  sender?: Pick<Profile, 'id' | 'display_name' | 'own_avatar'>
}

// ============================================================================
// BLOCKS
// ============================================================================

/**
 * User block to prevent unwanted interactions
 *
 * When a user blocks another, they will not see each other's content
 * and cannot communicate.
 */
export interface Block {
  /** User who initiated the block */
  blocker_id: UUID
  /** User who is being blocked */
  blocked_id: UUID
  /** Timestamp when the block was created */
  created_at: Timestamp
}

/**
 * Fields required when inserting a new block
 */
export interface BlockInsert {
  blocker_id: UUID
  blocked_id: UUID
}

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Type of entity that can be reported
 */
export type ReportedType = 'post' | 'message' | 'user'

/**
 * Status of a report in the moderation workflow
 */
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

/**
 * User report for content moderation
 *
 * Allows users to report inappropriate content or users.
 * Required for app store compliance.
 */
export interface Report {
  /** Unique identifier for the report */
  id: UUID
  /** User who submitted the report */
  reporter_id: UUID
  /** Type of entity being reported: post, message, or user */
  reported_type: ReportedType
  /** UUID of the reported entity (post, message, or user) */
  reported_id: UUID
  /** Primary reason for the report */
  reason: string
  /** Optional additional context provided by the reporter */
  additional_details: string | null
  /** Current status of the report */
  status: ReportStatus
  /** Timestamp when the report was reviewed by a moderator */
  reviewed_at: Timestamp | null
  /** Timestamp when the report was submitted */
  created_at: Timestamp
}

/**
 * Fields that can be updated on a report (for moderation)
 */
export interface ReportUpdate {
  status?: ReportStatus
  reviewed_at?: Timestamp
}

/**
 * Fields required when inserting a new report
 */
export interface ReportInsert {
  reporter_id: UUID
  reported_type: ReportedType
  reported_id: UUID
  reason: string
  additional_details?: string | null
}

// ============================================================================
// SUPABASE DATABASE TYPES
// ============================================================================

/**
 * Database type for Supabase client
 *
 * This follows the pattern expected by @supabase/supabase-js
 * for typed database operations.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      locations: {
        Row: Location
        Insert: LocationInsert
        Update: LocationUpdate
      }
      posts: {
        Row: Post
        Insert: PostInsert
        Update: PostUpdate
      }
      conversations: {
        Row: Conversation
        Insert: ConversationInsert
        Update: ConversationUpdate
      }
      messages: {
        Row: Message
        Insert: MessageInsert
        Update: MessageUpdate
      }
      blocks: {
        Row: Block
        Insert: BlockInsert
        Update: never // Blocks cannot be updated, only inserted or deleted
      }
      reports: {
        Row: Report
        Insert: ReportInsert
        Update: ReportUpdate
      }
    }
    Views: Record<string, never>
    Functions: {
      deactivate_expired_posts: {
        Args: Record<string, never>
        Returns: number
      }
      get_unread_message_count: {
        Args: { user_id: UUID }
        Returns: number
      }
      mark_conversation_as_read: {
        Args: { conv_id: UUID; user_id: UUID }
        Returns: number
      }
      is_user_blocked: {
        Args: { blocker: UUID; blocked: UUID }
        Returns: boolean
      }
      has_block_relationship: {
        Args: { user_a: UUID; user_b: UUID }
        Returns: boolean
      }
      get_blocked_user_ids: {
        Args: { user_id: UUID }
        Returns: UUID[]
      }
      get_blocker_user_ids: {
        Args: { user_id: UUID }
        Returns: UUID[]
      }
      get_hidden_user_ids: {
        Args: { user_id: UUID }
        Returns: UUID[]
      }
      block_user: {
        Args: { blocker: UUID; blocked: UUID }
        Returns: void
      }
      unblock_user: {
        Args: { blocker: UUID; blocked: UUID }
        Returns: boolean
      }
      submit_report: {
        Args: {
          p_reporter_id: UUID
          p_reported_type: ReportedType
          p_reported_id: UUID
          p_reason: string
          p_additional_details?: string | null
        }
        Returns: UUID
      }
      get_report_count: {
        Args: { p_reported_type: ReportedType; p_reported_id: UUID }
        Returns: number
      }
      has_user_reported: {
        Args: {
          p_reporter_id: UUID
          p_reported_type: ReportedType
          p_reported_id: UUID
        }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
  }
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Extract table row type from Database
 */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Extract table insert type from Database
 */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/**
 * Extract table update type from Database
 */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
