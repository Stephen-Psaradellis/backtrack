/**
 * Database Entity Types
 *
 * TypeScript type definitions for all database tables in the Backtrack app.
 * These types mirror the Supabase PostgreSQL schema defined in migrations.
 */

import type { StoredAvatar } from 'react-native-bitmoji'

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

/**
 * Time granularity for events/posts
 */
export type TimeGranularity = 'specific' | 'morning' | 'afternoon' | 'evening' | 'exact' | 'hour' | 'day' | 'week'

/**
 * Verification tier for post responses
 * Indicates how a user's presence at a location was verified
 */
export type VerificationTier = 'verified_checkin' | 'regular_spot' | 'unverified_claim'

/**
 * Response status for post responses
 */
export type ResponseStatus = 'pending' | 'accepted' | 'rejected'

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
  /** Custom avatar data for matching and display */
  avatar: StoredAvatar | null
  /** Avatar schema version for migrations */
  avatar_version: number
  /** Whether the user has completed identity verification */
  is_verified: boolean
  /** Timestamp when the user was verified (null if not verified) */
  verified_at: Timestamp | null
  /** Timestamp when user accepted terms of service, privacy policy, and confirmed age (18+) */
  terms_accepted_at: Timestamp | null
  /** Whether user has enabled always-on location tracking for auto check-in prompts */
  always_on_tracking_enabled: boolean
  /** Minutes to wait before prompting user to check in when at same location (1-60) */
  checkin_prompt_minutes: number
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
  avatar?: StoredAvatar | null
  avatar_version?: number
  is_verified?: boolean
  verified_at?: Timestamp | null
  terms_accepted_at?: Timestamp | null
  always_on_tracking_enabled?: boolean
  checkin_prompt_minutes?: number
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Fields that can be updated on a profile
 */
export interface ProfileUpdate {
  username?: string | null
  display_name?: string | null
  avatar?: StoredAvatar | null
  avatar_version?: number
  terms_accepted_at?: Timestamp | null
  always_on_tracking_enabled?: boolean
  checkin_prompt_minutes?: number
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
// USER CHECK-INS
// ============================================================================

/**
 * Record of a user's explicit check-in at a location
 *
 * Unlike location_visits (ephemeral, auto-cleanup), check-ins persist and
 * support explicit check-out for tiered matching verification.
 */
export interface UserCheckin {
  /** Unique identifier for the check-in record */
  id: UUID
  /** User who checked in */
  user_id: UUID
  /** Location where user checked in */
  location_id: UUID
  /** Timestamp when user checked in */
  checked_in_at: Timestamp
  /** Timestamp when user checked out (null if still checked in) */
  checked_out_at: Timestamp | null
  /** Whether check-in was GPS-verified (within 200m) */
  verified: boolean
  /** GPS latitude at time of check-in */
  verification_lat: number
  /** GPS longitude at time of check-in */
  verification_lon: number
  /** GPS accuracy in meters at time of check-in */
  verification_accuracy: number | null
  /** Timestamp when record was created */
  created_at: Timestamp
}

/**
 * Fields required when inserting a new user check-in
 */
export interface UserCheckinInsert {
  id?: UUID
  user_id: UUID
  location_id: UUID
  checked_in_at?: Timestamp
  checked_out_at?: Timestamp | null
  verified?: boolean
  verification_lat: number
  verification_lon: number
  verification_accuracy?: number | null
  created_at?: Timestamp
}

/**
 * Fields that can be updated on a user check-in
 */
export interface UserCheckinUpdate {
  checked_out_at?: Timestamp | null
}

/**
 * Active check-in with location details (from get_active_checkin RPC)
 */
export interface ActiveCheckin {
  id: UUID
  location_id: UUID
  location_name: string
  checked_in_at: Timestamp
  verified: boolean
}

/**
 * Tracking settings for a user
 */
export interface TrackingSettings {
  /** Whether always-on location tracking is enabled */
  always_on_tracking_enabled: boolean
  /** Minutes to wait before prompting check-in (1-60) */
  checkin_prompt_minutes: number
}

/**
 * Result from can_post_to_location RPC
 */
export interface CanPostResult {
  /** Whether user can post at this location */
  can_post: boolean
  /** Human-readable reason if cannot post */
  reason: string | null
  /** Whether user is a Regular at this location */
  is_regular: boolean
  /** Whether user has a recent check-in at this location */
  has_recent_checkin: boolean
  /** Name of the location */
  location_name?: string
}

/**
 * Result from can_match_post RPC
 */
export interface CanMatchResult {
  /** Whether user can match/respond to this post */
  can_match: boolean
  /** Human-readable reason if cannot match */
  reason: string | null
  /** Whether user is a Regular at the post's location */
  is_regular: boolean
  /** Whether user has a matching check-in */
  has_matching_checkin: boolean
  /** Name of the location */
  location_name?: string
}

/**
 * Live check-in user info (from get_active_checkins_at_location RPC)
 */
export interface LiveCheckinUser {
  user_id: UUID
  checkin_id: UUID
  checked_in_at: Timestamp
  avatar: StoredAvatar | null
  display_name: string | null
  is_verified: boolean
}

// ============================================================================
// POST RESPONSES
// ============================================================================

/**
 * Response to a post with verification tier
 *
 * Tracks how users respond to posts and their verification level.
 */
export interface PostResponse {
  /** Unique identifier for the response */
  id: UUID
  /** Post being responded to */
  post_id: UUID
  /** User responding to the post (consumer) */
  responder_id: UUID
  /** Level of verification for this response */
  verification_tier: VerificationTier
  /** Reference to check-in record (for Tier 1 verified responses) */
  checkin_id: UUID | null
  /** Optional message from responder */
  message: string | null
  /** Response status: pending, accepted, or rejected */
  status: ResponseStatus
  /** When the response was created */
  created_at: Timestamp
  /** When the producer responded to this response */
  responded_at: Timestamp | null
}

/**
 * Fields required when inserting a new post response
 */
export interface PostResponseInsert {
  id?: UUID
  post_id: UUID
  responder_id: UUID
  verification_tier: VerificationTier
  checkin_id?: UUID | null
  message?: string | null
  status?: ResponseStatus
  created_at?: Timestamp
  responded_at?: Timestamp | null
}

/**
 * Fields that can be updated on a post response
 */
export interface PostResponseUpdate {
  status?: ResponseStatus
  responded_at?: Timestamp | null
}

// ============================================================================
// FAVORITE LOCATIONS
// ============================================================================

/**
 * User's saved favorite location for quick access
 *
 * Allows users to save frequently visited venues (coffee shops, gyms, etc.)
 * for one-tap post creation or ledger browsing.
 * Users can give each favorite a custom name.
 */
export interface FavoriteLocation {
  /** Unique identifier for the favorite location */
  id: UUID
  /** User who saved this favorite (references auth.users) */
  user_id: UUID
  /** User-defined label for this favorite (max 50 characters) */
  custom_name: string
  /** Actual name of the venue/place */
  place_name: string
  /** GPS latitude coordinate */
  latitude: number
  /** GPS longitude coordinate */
  longitude: number
  /** Full address of the location */
  address: string | null
  /** Google Places ID for venue identification */
  place_id: string | null
  /** Timestamp when the favorite was created */
  created_at: Timestamp
  /** Timestamp when the favorite was last updated */
  updated_at: Timestamp
}

/**
 * Fields required when inserting a new favorite location
 */
export interface FavoriteLocationInsert {
  id?: UUID
  user_id: UUID
  custom_name: string
  place_name: string
  latitude: number
  longitude: number
  address?: string | null
  place_id?: string | null
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Fields that can be updated on a favorite location
 */
export interface FavoriteLocationUpdate {
  custom_name?: string
  place_name?: string
  latitude?: number
  longitude?: number
  address?: string | null
  place_id?: string | null
  updated_at?: Timestamp
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
  /** Selfie URL for verification (legacy, use photo_id for new posts) */
  selfie_url: string
  /** Reference to profile photo used for verification */
  photo_id: UUID | null
  /** Custom avatar for describing the person of interest */
  target_avatar_v2: StoredAvatar | null
  /** Additional description of the target person */
  target_description: string | null
  /** Message left by the producer */
  message: string
  /** Additional note for the post */
  note: string | null
  /** Date when the sighting occurred */
  sighting_date: Timestamp | null
  /** Time granularity for the sighting (exact, hour, day, week) */
  time_granularity: TimeGranularity | null
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
  photo_id?: UUID | null
  target_avatar_v2?: StoredAvatar | null
  target_description?: string | null
  message: string
  note?: string | null
  sighting_date?: Timestamp | null
  time_granularity?: TimeGranularity | null
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
  photo_id?: UUID | null
  target_avatar_v2?: StoredAvatar | null
  target_description?: string | null
  message?: string
  note?: string | null
  sighting_date?: Timestamp | null
  time_granularity?: TimeGranularity | null
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
  /** Verification tier of the consumer when they responded (null for legacy conversations) */
  verification_tier: VerificationTier | null
  /** Reference to the post response that initiated this conversation */
  response_id: UUID | null
  /** Whether the conversation is currently active */
  is_active: boolean
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
  verification_tier?: VerificationTier | null
  response_id?: UUID | null
  is_active?: boolean
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Fields that can be updated on a conversation
 */
export interface ConversationUpdate {
  status?: ConversationStatus
  producer_accepted?: boolean
  verification_tier?: VerificationTier | null
  response_id?: UUID | null
  is_active?: boolean
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
// PROFILE PHOTOS
// ============================================================================

/**
 * Moderation status for profile photos
 */
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'error'

/**
 * Likelihood levels from Google Cloud Vision SafeSearch API
 */
export type SafeSearchLikelihood =
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY'

/**
 * SafeSearch result from Google Cloud Vision API
 */
export interface SafeSearchResult {
  /** Likelihood of adult content */
  adult: SafeSearchLikelihood
  /** Likelihood of spoof/meme content */
  spoof: SafeSearchLikelihood
  /** Likelihood of medical content */
  medical: SafeSearchLikelihood
  /** Likelihood of violent content */
  violence: SafeSearchLikelihood
  /** Likelihood of racy content */
  racy: SafeSearchLikelihood
}

/**
 * User verification photo with content moderation
 *
 * Stored in the profile_photos table. Photos are uploaded to Supabase Storage
 * and moderated via Google Cloud Vision SafeSearch API before approval.
 */
export interface ProfilePhoto {
  /** Unique identifier for the photo */
  id: UUID
  /** User who owns this photo */
  user_id: UUID
  /** Path to the photo in Supabase Storage (selfies bucket) */
  storage_path: string
  /** Content moderation status */
  moderation_status: ModerationStatus
  /** SafeSearch result from Google Cloud Vision API */
  moderation_result: SafeSearchResult | null
  /** Whether this is the user's primary/default photo */
  is_primary: boolean
  /** Timestamp when the photo was uploaded */
  created_at: Timestamp
}

/**
 * Fields required when inserting a new profile photo
 */
export interface ProfilePhotoInsert {
  id?: UUID
  user_id: UUID
  storage_path: string
  moderation_status?: ModerationStatus
  moderation_result?: SafeSearchResult | null
  is_primary?: boolean
  created_at?: Timestamp
}

/**
 * Fields that can be updated on a profile photo
 */
export interface ProfilePhotoUpdate {
  moderation_status?: ModerationStatus
  moderation_result?: SafeSearchResult | null
  is_primary?: boolean
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
 * Reason for reporting content or users
 */
export type ReportReason =
  | 'inappropriate_content'
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'other'

/**
 * User report for flagging inappropriate content or users
 *
 * Allows users to report posts, messages, or other users to moderators.
 */
export interface Report {
  /** Unique identifier for the report */
  id: UUID
  /** User who submitted the report */
  reporter_id: UUID
  /** Type of entity being reported */
  reported_type: ReportedType
  /** ID of the reported entity (post, message, or user) */
  reported_id: UUID
  /** Reason for the report */
  reason: ReportReason
  /** Additional details about the report */
  description: string | null
  /** Status of the report */
  status: ReportStatus
  /** Moderator notes on the report */
  moderator_notes: string | null
  /** Timestamp when the report was created */
  created_at: Timestamp
  /** Timestamp when the report was last updated */
  updated_at: Timestamp
}

/**
 * Fields required when inserting a new report
 */
export interface ReportInsert {
  id?: UUID
  reporter_id: UUID
  reported_type: ReportedType
  reported_id: UUID
  reason: ReportReason
  description?: string | null
  status?: ReportStatus
  moderator_notes?: string | null
  created_at?: Timestamp
  updated_at?: Timestamp
}

/**
 * Fields that can be updated on a report
 */
export interface ReportUpdate {
  reason?: ReportReason
  description?: string | null
  status?: ReportStatus
  moderator_notes?: string | null
  updated_at?: Timestamp
}
// ============================================================================
// DERIVED TYPES AND UTILITY TYPES
// ============================================================================

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Post with author profile included
 */
export interface PostWithAuthor extends Post {
  producer?: Profile
  location?: Location
}

/**
 * Post with detailed relationships
 */
export interface PostWithDetails extends Post {
  producer?: Profile
  location?: Location
}

/**
 * Message with sender profile
 */
export interface MessageWithSender extends Message {
  sender?: Profile
}

/**
 * Location with distance from user
 */
export interface LocationWithDistance extends Location {
  distance?: number
}

/**
 * Location with active post count
 */
export interface LocationWithActivePosts extends Location {
  active_post_count?: number
  /** ISO timestamp of the most recent active post at this location */
  latest_post_at?: string
}

/**
 * Favorite location with distance from user
 */
export interface FavoriteLocationWithDistance extends FavoriteLocation {
  distance?: number
  google_place_id?: string // For compatibility
}

/**
 * Photo with signed URL
 */
export interface ProfilePhotoWithUrl extends ProfilePhoto {
  signedUrl: string
}

/**
 * Shared photo with URL
 */
export interface SharedPhotoWithUrl {
  id: UUID
  photo_id: UUID
  share_id: UUID
  shared_with_user_id: UUID
  shared_by_user_id: UUID
  created_at: Timestamp
  expires_at: Timestamp | null
  signedUrl: string
}

/**
 * Shared photo from my perspective
 */
export interface MySharedPhotoWithUrl {
  id: UUID
  photo_id: UUID
  share_id: UUID
  shared_with_user_id: UUID
  shared_by_user_id: UUID
  created_at: Timestamp
  expires_at: Timestamp | null
  signedUrl: string
}

// ============================================================================
// PHOTO SHARING TYPES
// ============================================================================

/**
 * Photo share record for conversation photo sharing
 */
export interface PhotoShare {
  id: UUID
  photo_id: UUID
  conversation_id: UUID
  owner_id: UUID
  shared_with_user_id: UUID
  status: PhotoShareStatus
  created_at: Timestamp
  expires_at: Timestamp | null
}

/**
 * Photo share insert type
 */
export interface PhotoShareInsert {
  id?: UUID
  photo_id: UUID
  conversation_id: UUID
  owner_id: UUID
  shared_with_user_id: UUID
  status?: PhotoShareStatus
  created_at?: Timestamp
  expires_at?: Timestamp | null
}

/**
 * Photo share status
 */
export type PhotoShareStatus = 'pending' | 'active' | 'revoked' | 'expired'

/**
 * Shared photo for conversation view
 */
export interface SharedPhotoForConversation extends PhotoShare {
  signedUrl?: string
}

/**
 * My shared photo for conversation view
 */
export interface MySharedPhotoForConversation extends PhotoShare {
  signedUrl?: string
}

// ============================================================================
// LOCATION UTILITY TYPES
// ============================================================================

/**
 * Location with visit data
 */
export interface LocationWithVisit extends Location {
  last_visited_at?: Timestamp
  visit_count?: number
}

/**
 * Parameters for nearby location queries
 */
export interface NearbyLocationParams {
  user_lat: number
  user_lon: number
  radius_meters?: number
  max_results?: number
}

/**
 * Parameters for locations with active posts query
 */
export interface LocationsWithActivePostsParams {
  user_lat: number
  user_lon: number
  radius_meters?: number
  max_results?: number
  min_post_count?: number
}

/**
 * Parameters for recently visited locations query.
 * Note: user_id is obtained from auth.uid() internally.
 */
export interface RecentlyVisitedLocationParams {
  max_results?: number | null
}

// ============================================================================
// CONVERSATION UTILITY TYPES
// ============================================================================

/**
 * Conversation with related details
 */
export interface ConversationWithDetails extends Conversation {
  post?: Post
  producer?: Profile
  consumer?: Profile
  messages?: Message[]
  last_message?: Message
  unread_count?: number
}

// ============================================================================
// SUPABASE DATABASE TYPE
// ============================================================================

/**
 * Database schema type for Supabase client
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
      user_checkins: {
        Row: UserCheckin
        Insert: UserCheckinInsert
        Update: UserCheckinUpdate
      }
      post_responses: {
        Row: PostResponse
        Insert: PostResponseInsert
        Update: PostResponseUpdate
      }
      favorite_locations: {
        Row: FavoriteLocation
        Insert: FavoriteLocationInsert
        Update: FavoriteLocationUpdate
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
      profile_photos: {
        Row: ProfilePhoto
        Insert: ProfilePhotoInsert
        Update: ProfilePhotoUpdate
      }
      blocks: {
        Row: Block
        Insert: BlockInsert
        Update: never
      }
      reports: {
        Row: Report
        Insert: ReportInsert
        Update: ReportUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
