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
  /** Optional username for the user */
  username: string | null
  /** Optional display name for the user */
  display_name: string | null
  /** JSONB avatar configuration describing the user themselves (for matching) */
  avatar_config: AvatarConfig | null
  /** JSONB avatar configuration describing the user themselves (for matching against posts) */
  own_avatar: AvatarConfig | null
  /** Timestamp when the profile was created */
  created_at: Timestamp
  /** Timestamp when the profile was last updated */
  updated_at: Timestamp
}

/**
 * Fields required when inserting a new profile (id is required, others optional)
 */
export interface ProfileInsert {
  id: UUID
  username?: string | null
  display_name?: string | null
  avatar_config?: AvatarConfig | null
  own_avatar?: AvatarConfig | null
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Fields that can be updated on a profile
 */
export interface ProfileUpdate {
  username?: string | null
  display_name?: string | null
  avatar_config?: AvatarConfig | null
  own_avatar?: AvatarConfig | null
  updated_at?: Timestamp
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
  /** Google Maps place ID for venue identification */
  google_place_id: string
  /** Name of the venue/location */
  name: string
  /** Full address of the location */
  address: string | null
  /** GPS latitude coordinate */
  latitude: number
  /** GPS longitude coordinate */
  longitude: number
  /** Place types from Google Maps */
  place_types: string[]
  /** Count of active posts at this location */
  post_count: number
  /** Timestamp when the location was first added */
  created_at: Timestamp
}

/**
 * Fields required when inserting a new location
 */
export interface LocationInsert {
  id?: UUID
  google_place_id: string
  name: string
  address?: string | null
  latitude: number
  longitude: number
  place_types?: string[]
  post_count?: number
  created_at?: Timestamp
}

/**
 * Fields that can be updated on a location
 */
export interface LocationUpdate {
  google_place_id?: string
  name?: string
  address?: string | null
  latitude?: number
  longitude?: number
  place_types?: string[]
  post_count?: number
}

// ============================================================================
// LOCATION VISITS
// ============================================================================

/**
 * Record of a user's physical visit to a location
 *
 * Tracks when users are physically present at a location (within ~50 meters).
 * Used to verify eligibility for creating posts at a location.
 * Visits older than 3 hours are considered expired for post creation.
 */
export interface LocationVisit {
  /** Unique identifier for the visit record */
  id: UUID
  /** User who visited the location */
  user_id: UUID
  /** Location that was visited */
  location_id: UUID
  /** Timestamp when the visit was recorded (server-side) */
  visited_at: Timestamp
  /** GPS latitude at time of visit */
  latitude: number
  /** GPS longitude at time of visit */
  longitude: number
  /** GPS accuracy in meters at time of visit (optional) */
  accuracy: number | null
}

/**
 * Fields required when inserting a new location visit
 */
export interface LocationVisitInsert {
  id?: UUID
  user_id: UUID
  location_id: UUID
  visited_at?: Timestamp
  latitude: number
  longitude: number
  accuracy?: number | null
}

// ============================================================================
// POSTS
// ============================================================================

/**
 * "Missed connection" post created by a producer at a location
 *
 * Contains avatar description of person of interest and message.
 * Posts expire after 30 days by default.
 */
export interface Post {
  /** Unique identifier for the post */
  id: UUID
  /** User who created this post */
  producer_id: UUID
  /** Location where this post was created */
  location_id: UUID
  /** Selfie URL for verification */
  selfie_url: string
  /** JSONB avatar configuration describing the person of interest */
  target_avatar: AvatarConfig
  /** Additional description of the target person */
  target_description: string | null
  /** Message left by the producer */
  message: string
  /** Timestamp when the post was seen */
  seen_at: Timestamp | null
  /** Whether the post is currently active and visible */
  is_active: boolean
  /** Timestamp when the post was created */
  created_at: Timestamp
  /** Timestamp when the post expires (defaults to 30 days) */
  expires_at: Timestamp
}

/**
 * Fields required when inserting a new post
 */
export interface PostInsert {
  id?: UUID
  producer_id: UUID
  location_id: UUID
  selfie_url: string
  target_avatar: AvatarConfig
  target_description?: string | null
  message: string
  seen_at?: Timestamp | null
  is_active?: boolean
  created_at?: Timestamp
  expires_at?: Timestamp
}

/**
 * Fields that can be updated on a post
 */
export interface PostUpdate {
  selfie_url?: string
  target_avatar?: AvatarConfig
  target_description?: string | null
  message?: string
  seen_at?: Timestamp | null
  is_active?: boolean
  expires_at?: Timestamp
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

/**
 * Status of a conversation in the interaction workflow
 */
export type ConversationStatus = 'pending' | 'active' | 'declined' | 'blocked'

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
  /** Status of the conversation */
  status: ConversationStatus
  /** Whether the producer has accepted the conversation */
  producer_accepted: boolean
  /** Timestamp when the conversation was started */
  created_at: Timestamp
  /** Timestamp of the last activity in the conversation */
  updated_at: Timestamp
}

/**
 * Fields required when inserting a new conversation
 */
export interface ConversationInsert {
  id?: UUID
  post_id: UUID
  producer_id: UUID
  consumer_id: UUID
  status?: ConversationStatus
  producer_accepted?: boolean
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Fields that can be updated on a conversation
 */
export interface ConversationUpdate {
  status?: ConversationStatus
  producer_accepted?: boolean
  updated_at?: Timestamp
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
  /** Whether the recipient has read this message */
  is_read: boolean
  /** Timestamp when the message was sent */
  created_at: Timestamp
}

/**
 * Fields required when inserting a new message
 */
export interface MessageInsert {
  id?: UUID
  conversation_id: UUID
  sender_id: UUID
  content: string
  is_read?: boolean
  created_at?: Timestamp
}

/**
 * Fields that can be updated on a message
 */
export interface MessageUpdate {
  content?: string
  is_read?: boolean
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Type of notification event
 */
export type NotificationType = 'new_response' | 'new_message' | 'response_accepted'

/**
 * User notification for alerts and updates
 *
 * Notifies users of important events like new responses or messages.
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: UUID
  /** User who receives this notification */
  user_id: UUID
  /** Type of notification event */
  type: NotificationType
  /** Reference to related entity (post or conversation) */
  reference_id: UUID | null
  /** Whether the notification has been read */
  is_read: boolean
  /** Timestamp when the notification was created */
  created_at: Timestamp
}

/**
 * Fields required when inserting a new notification
 */
export interface NotificationInsert {
  id?: UUID
  user_id: UUID
  type: NotificationType
  reference_id?: UUID | null
  is_read?: boolean
  created_at?: Timestamp
}

/**
 * Fields that can be updated on a notification
 */
export interface NotificationUpdate {
  is_read?: boolean
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

/**
 * Alternative block type with explicit ID field
 */
export interface BlockedUser {
  id: UUID
  blocker_id: UUID
  blocked_id: UUID
  created_at: Timestamp
}

/**
 * Fields required when inserting a new blocked user
 */
export interface BlockedUserInsert {
  id?: UUID
  blocker_id: UUID
  blocked_id: UUID
  created_at?: Timestamp
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
 * Fields required when inserting a new report
 */
export interface ReportInsert {
  reporter_id: UUID
  reported_type: ReportedType
  reported_id: UUID
  reason: string
  additional_details?: string | null
}

/**
 * Fields that can be updated on a report (for moderation)
 */
export interface ReportUpdate {
  status?: ReportStatus
  reviewed_at?: Timestamp
}

/**
 * Alternative report type with predefined reasons
 */
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'fake_profile'
  | 'other'

/**
 * Simplified user report type
 */
export interface UserReport {
  id: UUID
  reporter_id: UUID
  reported_id: UUID
  reason: ReportReason
  details: string | null
  created_at: Timestamp
}

/**
 * Fields required when inserting a new user report
 */
export interface UserReportInsert {
  id?: UUID
  reporter_id: UUID
  reported_id: UUID
  reason: ReportReason
  details?: string | null
  created_at?: Timestamp
}

// ============================================================================
// GEOSPATIAL TYPES
// ============================================================================

/**
 * Coordinates for geospatial queries
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Parameters for the get_nearby_locations database function.
 * Uses PostGIS ST_DWithin for efficient spatial queries with GIST index.
 */
export interface NearbyLocationParams {
  /** User's latitude coordinate (WGS 84) */
  user_lat: number
  /** User's longitude coordinate (WGS 84) */
  user_lon: number
  /** Search radius in meters (default: 5000 = 5km) */
  radius_meters?: number
  /** Maximum number of results to return (default: 50) */
  max_results?: number
}

/**
 * Parameters for the get_locations_with_active_posts database function.
 * Returns nearby locations filtered by those with active posts.
 */
export interface LocationsWithActivePostsParams extends NearbyLocationParams {
  /** Minimum number of active posts required (default: 1) */
  min_post_count?: number
}

/**
 * Parameters for the get_recently_visited_locations database function.
 * Returns locations the current user has visited within the eligibility window.
 * Note: The RPC function uses auth.uid() internally, so no user_id is needed.
 */
export interface RecentlyVisitedLocationParams {
  /** Maximum number of results to return (default: unlimited) */
  max_results?: number
}

/**
 * Location with distance information from geospatial query.
 * Returned by the get_nearby_locations database function.
 */
export interface LocationWithDistance extends Location {
  /** Distance from query point in meters */
  distance_meters: number
}

/**
 * Location with active post count and distance information.
 * Returned by the get_locations_with_active_posts database function.
 * Note: Uses active_post_count (BIGINT) instead of post_count from base Location.
 */
export interface LocationWithActivePosts extends Omit<Location, 'post_count'> {
  /** Count of active, non-expired posts at this location */
  active_post_count: number
  /** Distance from query point in meters */
  distance_meters: number
}

/**
 * Location with visit timestamp information.
 * Used when querying locations that a user has recently visited.
 * Combines Location data with the user's most recent visit timestamp.
 */
export interface LocationWithVisit extends Location {
  /** Timestamp when the user last visited this location */
  visited_at: Timestamp
}

// ============================================================================
// JOINED TYPES (for queries with relations)
// ============================================================================

/**
 * Post with location information
 */
export interface PostWithLocation extends Post {
  location: Location
}

/**
 * Post with producer information
 */
export interface PostWithProducer extends Post {
  producer: Profile
}

/**
 * Post with expanded location and profile data
 * Used for displaying posts in the ledger
 */
export interface PostWithDetails extends Post {
  location: Location
  producer: Profile
}

/**
 * Conversation with expanded related data
 * Used for displaying in chat list
 */
export interface ConversationWithDetails extends Conversation {
  post: Pick<Post, 'id' | 'target_avatar' | 'message'>
  other_user?: Pick<Profile, 'id' | 'username' | 'avatar_config'>
  last_message?: Pick<Message, 'content' | 'created_at' | 'sender_id'>
  unread_count?: number
}

/**
 * Conversation with all participants and related data
 */
export interface ConversationWithParticipants extends Conversation {
  producer: Profile
  consumer: Profile
  post: Post
}

/**
 * Message with sender information
 */
export interface MessageWithSender extends Message {
  sender: Profile
}

/**
 * Notification with related data
 */
export interface NotificationWithReference extends Notification {
  conversation?: Conversation
  post?: Post
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
      location_visits: {
        Row: LocationVisit
        Insert: LocationVisitInsert
        Update: never
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
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
      blocks: {
        Row: Block
        Insert: BlockInsert
        Update: never
      }
      blocked_users: {
        Row: BlockedUser
        Insert: BlockedUserInsert
        Update: never
      }
      reports: {
        Row: Report
        Insert: ReportInsert
        Update: ReportUpdate
      }
      user_reports: {
        Row: UserReport
        Insert: UserReportInsert
        Update: never
      }
    }
  }
}