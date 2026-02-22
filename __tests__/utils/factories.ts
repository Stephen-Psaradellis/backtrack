/**
 * Test Data Factories
 *
 * Type-safe factory functions for creating mock database entities.
 * All factories return valid mock objects with sensible defaults and allow partial overrides.
 */

import type { StoredAvatar } from 'react-native-bitmoji'
import type {
  Profile,
  Conversation,
  Message,
  Location,
  Post,
  UserCheckin,
  LocationVisit,
  PostResponse,
  Notification,
  ProfilePhoto,
  Block,
  FavoriteLocation,
  VenueStory,
  Report,
  Hangout,
  HangoutAttendee,
  UUID,
  Timestamp,
  SafeSearchResult,
} from '../../types/database'

// ============================================================================
// COUNTER-BASED UUID GENERATOR
// ============================================================================

let uuidCounter = 0

/**
 * Generate a deterministic UUID for testing (no crypto dependency)
 * Format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
export function generateTestUUID(): UUID {
  uuidCounter++
  const hex = uuidCounter.toString(16).padStart(12, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4000-8000-000000000001`
}

/**
 * Reset the UUID counter (useful for test isolation)
 */
export function resetUUIDCounter(): void {
  uuidCounter = 0
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): Timestamp {
  return new Date().toISOString()
}

/**
 * Create a timestamp N hours from now (negative for past)
 */
export function getTimestampOffset(hours: number): Timestamp {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

// ============================================================================
// PROFILE FACTORIES
// ============================================================================

/**
 * Create a mock StoredAvatar object
 */
export function createMockAvatar(overrides?: Partial<StoredAvatar>): StoredAvatar {
  return {
    id: generateTestUUID(),
    metadata: {
      version: 2,
      created: getCurrentTimestamp(),
      ...overrides?.metadata,
    },
    features: {
      body: 'body_01',
      face: 'face_01',
      hair: 'hair_01',
      outfit: 'outfit_01',
      accessories: [],
      ...overrides?.features,
    },
    colors: {
      skinTone: '#F5D0C5',
      hairColor: '#4A3428',
      outfitPrimary: '#2C5F8D',
      outfitSecondary: '#FFFFFF',
      ...overrides?.colors,
    },
    ...overrides,
  }
}

/**
 * Create a mock Profile object
 */
export function createMockProfile(overrides?: Partial<Profile>): Profile {
  const id = overrides?.id || generateTestUUID()
  const timestamp = getCurrentTimestamp()

  return {
    id,
    username: `user_${id.slice(0, 8)}`,
    display_name: `Test User ${id.slice(0, 4)}`,
    avatar: createMockAvatar(),
    avatar_version: 2,
    is_verified: false,
    verified_at: null,
    terms_accepted_at: timestamp,
    always_on_tracking_enabled: false,
    checkin_prompt_minutes: 15,
    ghost_mode_until: null,
    trust_level: 1,
    trust_points: 0,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

// ============================================================================
// LOCATION FACTORIES
// ============================================================================

/**
 * Create a mock Location object
 */
export function createMockLocation(overrides?: Partial<Location>): Location {
  const id = overrides?.id || generateTestUUID()

  return {
    id,
    google_place_id: `place_${id.slice(0, 8)}`,
    name: 'Test Cafe',
    address: '123 Test St, Test City, TC 12345',
    latitude: 40.7128,
    longitude: -74.006,
    place_types: ['cafe', 'food', 'establishment'],
    post_count: 0,
    created_at: getCurrentTimestamp(),
    ...overrides,
  }
}

/**
 * Create a mock LocationVisit object
 */
export function createMockLocationVisit(overrides?: Partial<LocationVisit>): LocationVisit {
  return {
    id: generateTestUUID(),
    user_id: generateTestUUID(),
    location_id: generateTestUUID(),
    visited_at: getCurrentTimestamp(),
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 10,
    ...overrides,
  }
}

/**
 * Create a mock UserCheckin object
 */
export function createMockCheckin(overrides?: Partial<UserCheckin>): UserCheckin {
  return {
    id: generateTestUUID(),
    user_id: generateTestUUID(),
    location_id: generateTestUUID(),
    checked_in_at: getCurrentTimestamp(),
    checked_out_at: null,
    verified: true,
    verification_lat: 40.7128,
    verification_lon: -74.006,
    verification_accuracy: 10,
    created_at: getCurrentTimestamp(),
    ...overrides,
  }
}

/**
 * Create a mock FavoriteLocation object
 */
export function createMockFavoriteLocation(
  overrides?: Partial<FavoriteLocation>
): FavoriteLocation {
  const timestamp = getCurrentTimestamp()

  return {
    id: generateTestUUID(),
    user_id: generateTestUUID(),
    custom_name: 'My Favorite Cafe',
    place_name: 'Test Cafe',
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Test St, Test City, TC 12345',
    place_id: `place_${generateTestUUID().slice(0, 8)}`,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

// ============================================================================
// POST FACTORIES
// ============================================================================

/**
 * Create a mock Post object
 */
export function createMockPost(overrides?: Partial<Post>): Post {
  const timestamp = getCurrentTimestamp()
  const expiresAt = getTimestampOffset(24 * 30) // 30 days from now

  return {
    id: generateTestUUID(),
    producer_id: generateTestUUID(),
    location_id: generateTestUUID(),
    selfie_url: `https://example.com/selfie_${generateTestUUID()}.jpg`,
    photo_id: generateTestUUID(),
    target_avatar_v2: createMockAvatar(),
    target_description: 'Wearing a red jacket',
    message: 'Hope to connect!',
    note: null,
    sighting_date: timestamp,
    time_granularity: 'exact',
    seen_at: timestamp,
    is_active: true,
    created_at: timestamp,
    expires_at: expiresAt,
    ...overrides,
  }
}

/**
 * Create a mock PostResponse object
 */
export function createMockPostResponse(overrides?: Partial<PostResponse>): PostResponse {
  return {
    id: generateTestUUID(),
    post_id: generateTestUUID(),
    responder_id: generateTestUUID(),
    verification_tier: 'verified_checkin',
    checkin_id: generateTestUUID(),
    message: 'Hey, I think that was me!',
    status: 'pending',
    created_at: getCurrentTimestamp(),
    responded_at: null,
    ...overrides,
  }
}

// ============================================================================
// CONVERSATION & MESSAGE FACTORIES
// ============================================================================

/**
 * Create a mock Conversation object
 */
export function createMockConversation(overrides?: Partial<Conversation>): Conversation {
  const timestamp = getCurrentTimestamp()

  return {
    id: generateTestUUID(),
    post_id: generateTestUUID(),
    producer_id: generateTestUUID(),
    consumer_id: generateTestUUID(),
    status: 'active',
    producer_accepted: true,
    verification_tier: 'verified_checkin',
    response_id: generateTestUUID(),
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

/**
 * Create a mock Message object
 */
export function createMockMessage(overrides?: Partial<Message>): Message {
  return {
    id: generateTestUUID(),
    conversation_id: generateTestUUID(),
    sender_id: generateTestUUID(),
    content: 'Test message content',
    is_read: false,
    created_at: getCurrentTimestamp(),
    ...overrides,
  }
}

// ============================================================================
// NOTIFICATION FACTORIES
// ============================================================================

/**
 * Create a mock Notification object
 */
export function createMockNotification(overrides?: Partial<Notification>): Notification {
  return {
    id: generateTestUUID(),
    user_id: generateTestUUID(),
    type: 'new_message',
    reference_id: generateTestUUID(),
    is_read: false,
    created_at: getCurrentTimestamp(),
    ...overrides,
  }
}

// ============================================================================
// PROFILE PHOTO FACTORIES
// ============================================================================

/**
 * Create a mock SafeSearchResult object
 */
export function createMockSafeSearchResult(
  overrides?: Partial<SafeSearchResult>
): SafeSearchResult {
  return {
    adult: 'VERY_UNLIKELY',
    spoof: 'VERY_UNLIKELY',
    medical: 'VERY_UNLIKELY',
    violence: 'VERY_UNLIKELY',
    racy: 'VERY_UNLIKELY',
    ...overrides,
  }
}

/**
 * Create a mock ProfilePhoto object
 */
export function createMockProfilePhoto(overrides?: Partial<ProfilePhoto>): ProfilePhoto {
  return {
    id: generateTestUUID(),
    user_id: generateTestUUID(),
    storage_path: `selfies/${generateTestUUID()}.jpg`,
    moderation_status: 'approved',
    moderation_result: createMockSafeSearchResult(),
    is_primary: false,
    created_at: getCurrentTimestamp(),
    ...overrides,
  }
}

// ============================================================================
// BLOCK FACTORIES
// ============================================================================

/**
 * Create a mock Block object
 */
export function createMockBlock(overrides?: Partial<Block>): Block {
  return {
    blocker_id: generateTestUUID(),
    blocked_id: generateTestUUID(),
    created_at: getCurrentTimestamp(),
    ...overrides,
  }
}

// ============================================================================
// VENUE STORY FACTORIES
// ============================================================================

/**
 * Create a mock VenueStory object
 */
export function createMockVenueStory(overrides?: Partial<VenueStory>): VenueStory {
  const createdAt = getCurrentTimestamp()
  const expiresAt = getTimestampOffset(4) // 4 hours from now

  return {
    id: generateTestUUID(),
    location_id: generateTestUUID(),
    user_id: generateTestUUID(),
    content: 'Great vibes here tonight!',
    created_at: createdAt,
    expires_at: expiresAt,
    ...overrides,
  }
}

// ============================================================================
// REPORT FACTORIES
// ============================================================================

/**
 * Create a mock Report object
 */
export function createMockReport(overrides?: Partial<Report>): Report {
  const timestamp = getCurrentTimestamp()

  return {
    id: generateTestUUID(),
    reporter_id: generateTestUUID(),
    reported_type: 'user',
    reported_id: generateTestUUID(),
    reason: 'spam',
    description: 'This user is spamming',
    status: 'pending',
    moderator_notes: null,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

// ============================================================================
// HANGOUT FACTORIES
// ============================================================================

/**
 * Create a mock Hangout object
 */
export function createMockHangout(overrides?: Partial<Hangout>): Hangout {
  const timestamp = getCurrentTimestamp()
  const scheduledFor = getTimestampOffset(2) // 2 hours from now

  return {
    id: generateTestUUID(),
    creator_id: generateTestUUID(),
    location_id: generateTestUUID(),
    title: 'Coffee Meetup',
    description: 'Let\'s grab coffee and chat!',
    scheduled_for: scheduledFor,
    max_attendees: 6,
    status: 'open',
    vibe: 'chill',
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  }
}

/**
 * Create a mock HangoutAttendee object
 */
export function createMockHangoutAttendee(overrides?: Partial<HangoutAttendee>): HangoutAttendee {
  return {
    id: generateTestUUID(),
    hangout_id: generateTestUUID(),
    user_id: generateTestUUID(),
    status: 'going',
    joined_at: getCurrentTimestamp(),
    ...overrides,
  }
}
