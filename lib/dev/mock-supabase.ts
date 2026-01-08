/**
 * Mock Supabase Client for Development Mode
 *
 * Provides a functional mock Supabase client for development when
 * credentials are not configured. Adapted from __tests__/mocks/supabase.ts
 * but without Jest dependencies for runtime use.
 *
 * Key features:
 * - Chainable query builder that mimics real Supabase behavior
 * - Mock auth methods returning simulated responses
 * - Mock storage methods for file operations
 * - Realistic mock data for testing UI components
 * - Multiple POIs with posts for testing location flows
 */

import type { User, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Profile, Post, Location as LocationEntity } from '../../types/database'
import type { StoredAvatar } from '../../components/avatar/types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Mock user type for development
 */
export interface DevMockUser {
  id: string
  email?: string
  phone?: string
  created_at?: string
  updated_at?: string
}

/**
 * Mock session type for development
 */
export interface DevMockSession {
  access_token: string
  refresh_token: string
  user: DevMockUser
}

/**
 * Mock function type that can track calls (simplified version of jest.Mock)
 */
type MockFunction<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> = T & {
  calls: Parameters<T>[]
  mockClear: () => void
}

/**
 * Creates a mock function that tracks calls
 */
function createMockFunction<T extends (...args: unknown[]) => unknown>(
  implementation: T
): MockFunction<T> {
  const calls: Parameters<T>[] = []

  const mockFn = ((...args: Parameters<T>) => {
    calls.push(args)
    return implementation(...args)
  }) as MockFunction<T>

  mockFn.calls = calls
  mockFn.mockClear = () => {
    calls.length = 0
  }

  return mockFn
}

/**
 * Query result interface
 */
interface QueryResult<T = unknown> {
  data: T | null
  error: Error | null
}

/**
 * Mock query builder interface that supports chaining
 */
export interface DevMockQueryBuilder {
  select: (...args: unknown[]) => DevMockQueryBuilder
  insert: (...args: unknown[]) => DevMockQueryBuilder
  update: (...args: unknown[]) => DevMockQueryBuilder
  delete: (...args: unknown[]) => DevMockQueryBuilder
  upsert: (...args: unknown[]) => DevMockQueryBuilder
  eq: (...args: unknown[]) => DevMockQueryBuilder
  neq: (...args: unknown[]) => DevMockQueryBuilder
  gt: (...args: unknown[]) => DevMockQueryBuilder
  gte: (...args: unknown[]) => DevMockQueryBuilder
  lt: (...args: unknown[]) => DevMockQueryBuilder
  lte: (...args: unknown[]) => DevMockQueryBuilder
  like: (...args: unknown[]) => DevMockQueryBuilder
  ilike: (...args: unknown[]) => DevMockQueryBuilder
  is: (...args: unknown[]) => DevMockQueryBuilder
  in: (...args: unknown[]) => DevMockQueryBuilder
  not: (...args: unknown[]) => DevMockQueryBuilder
  or: (...args: unknown[]) => DevMockQueryBuilder
  and: (...args: unknown[]) => DevMockQueryBuilder
  order: (...args: unknown[]) => DevMockQueryBuilder
  limit: (...args: unknown[]) => DevMockQueryBuilder
  range: (...args: unknown[]) => DevMockQueryBuilder
  filter: (...args: unknown[]) => DevMockQueryBuilder
  match: (...args: unknown[]) => DevMockQueryBuilder
  single: () => Promise<QueryResult>
  maybeSingle: () => Promise<QueryResult>
  then: <TResult>(
    onfulfilled?: ((value: QueryResult<unknown[]>) => TResult | PromiseLike<TResult>) | null
  ) => Promise<TResult>
}

/**
 * Mock auth methods interface
 */
export interface DevMockAuth {
  getUser: () => Promise<{ data: { user: DevMockUser | null }; error: null }>
  getSession: () => Promise<{ data: { session: DevMockSession | null }; error: null }>
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{
    data: { user: DevMockUser; session: DevMockSession }
    error: null
  }>
  signUp: (credentials: { email: string; password: string }) => Promise<{
    data: { user: DevMockUser; session: DevMockSession }
    error: null
  }>
  signOut: () => Promise<{ error: null }>
  onAuthStateChange: (
    callback: (event: string, session: DevMockSession | null) => void
  ) => { data: { subscription: { unsubscribe: () => void } } }
  resetPasswordForEmail: (email: string) => Promise<{ data: object; error: null }>
  updateUser: (attributes: object) => Promise<{
    data: { user: DevMockUser }
    error: null
  }>
}

/**
 * Mock storage bucket interface
 */
interface DevMockStorageBucket {
  upload: (path: string, file: unknown) => Promise<{ data: { path: string }; error: null }>
  download: (path: string) => Promise<{ data: Blob; error: null }>
  remove: (paths: string[]) => Promise<{ data: object; error: null }>
  getPublicUrl: (path: string) => { data: { publicUrl: string } }
  createSignedUrl: (path: string, expiresIn: number) => Promise<{
    data: { signedUrl: string }
    error: null
  }>
  list: (path?: string) => Promise<{ data: unknown[]; error: null }>
}

/**
 * Mock storage interface
 */
export interface DevMockStorage {
  from: (bucket: string) => DevMockStorageBucket
}

/**
 * Mock channel interface for realtime
 */
interface DevMockChannel {
  on: (...args: unknown[]) => DevMockChannel
  subscribe: (...args: unknown[]) => DevMockChannel
  unsubscribe: () => void
}

/**
 * Mock Supabase client interface
 */
export interface DevMockSupabaseClient {
  auth: DevMockAuth
  storage: DevMockStorage
  from: (table: string) => DevMockQueryBuilder
  channel: (name: string) => DevMockChannel
  removeChannel: (channel: DevMockChannel) => void
  rpc: (fn: string, params?: object) => Promise<{ data: unknown; error: null }>
}

/**
 * Location visit record type
 */
interface LocationVisit {
  id: string
  user_id: string
  location_id: string
  visited_at: string
}

/**
 * Conversation record type
 */
interface Conversation {
  id: string
  post_id: string
  producer_id: string
  consumer_id: string
  status: 'pending' | 'active' | 'declined' | 'blocked'
  producer_accepted: boolean
  verification_tier: string | null
  response_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Message record type
 */
interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

/**
 * Favorite location record type
 */
interface FavoriteLocation {
  id: string
  user_id: string
  custom_name: string
  place_name: string
  latitude: number
  longitude: number
  address: string | null
  place_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Notification record type
 */
interface Notification {
  id: string
  user_id: string
  type: 'new_response' | 'new_message' | 'response_accepted'
  reference_id: string | null
  is_read: boolean
  created_at: string
}

/**
 * Photo share record type
 */
interface PhotoShare {
  id: string
  photo_id: string
  conversation_id: string
  shared_by_user_id: string
  shared_with_user_id: string
  status: 'pending' | 'active' | 'revoked' | 'expired'
  created_at: string
  expires_at: string | null
}

/**
 * User checkin record type
 */
interface UserCheckin {
  id: string
  user_id: string
  location_id: string
  checked_in_at: string
  checked_out_at: string | null
  verified: boolean
  verification_lat: number
  verification_lon: number
  verification_accuracy: number | null
  created_at: string
}

/**
 * Location streak record type
 */
interface LocationStreak {
  id: string
  user_id: string
  location_id: string
  streak_count: number
  last_visit_date: string
  created_at: string
  updated_at: string
}

/**
 * Event attendance record type
 */
interface EventAttendance {
  id: string
  user_id: string
  event_id: string
  status: 'going' | 'interested' | 'not_going'
  created_at: string
  updated_at: string
}

/**
 * Notification preferences record type
 */
interface NotificationPreferences {
  id: string
  user_id: string
  messages: boolean
  matches: boolean
  marketing: boolean
  created_at: string
  updated_at: string
}

/**
 * Push token record type
 */
interface PushToken {
  id: string
  user_id: string
  token: string
  platform: 'ios' | 'android' | 'web'
  device_name: string | null
  created_at: string
  updated_at: string
}

/**
 * RPC result for nearby locations
 */
interface NearbyLocationResult {
  id: string
  google_place_id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  place_types: string[]
  post_count: number
  created_at: string
  distance_meters: number
}

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Default mock coordinates (San Francisco - Union Square area)
 * This is where the user "starts" in dev mode
 */
export const DEV_MOCK_COORDINATES = {
  latitude: 37.7879,
  longitude: -122.4074,
} as const

/**
 * Mock user for development (simulates logged-out state by default)
 */
export const devMockUser: DevMockUser = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Mock session for development
 */
export const devMockSession: DevMockSession = {
  access_token: 'dev-mock-access-token',
  refresh_token: 'dev-mock-refresh-token',
  user: devMockUser,
}

/**
 * Mock profile for development
 */
export const devMockProfile: Profile = {
  id: devMockUser.id,
  username: 'DevUser',
  display_name: 'Dev User',
  avatar: null,
  avatar_version: 1,
  is_verified: false,
  verified_at: null,
  terms_accepted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Multiple mock locations around San Francisco for realistic POI testing
 */
export const devMockLocations: LocationEntity[] = [
  {
    id: 'dev-location-001',
    google_place_id: 'ChIJdev001',
    name: 'Blue Bottle Coffee - Mint Plaza',
    address: '66 Mint St, San Francisco, CA 94103',
    latitude: 37.7825,
    longitude: -122.4048,
    place_types: ['cafe', 'food', 'point_of_interest', 'establishment'],
    post_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dev-location-002',
    google_place_id: 'ChIJdev002',
    name: 'Dolores Park',
    address: 'Dolores St & 19th St, San Francisco, CA 94114',
    latitude: 37.7596,
    longitude: -122.4269,
    place_types: ['park', 'point_of_interest', 'establishment'],
    post_count: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dev-location-003',
    google_place_id: 'ChIJdev003',
    name: 'Ferry Building Marketplace',
    address: '1 Ferry Building, San Francisco, CA 94111',
    latitude: 37.7955,
    longitude: -122.3937,
    place_types: ['shopping_mall', 'food', 'point_of_interest', 'establishment'],
    post_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dev-location-004',
    google_place_id: 'ChIJdev004',
    name: 'Tartine Bakery',
    address: '600 Guerrero St, San Francisco, CA 94110',
    latitude: 37.7614,
    longitude: -122.4241,
    place_types: ['bakery', 'cafe', 'food', 'point_of_interest', 'establishment'],
    post_count: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dev-location-005',
    google_place_id: 'ChIJdev005',
    name: 'Philz Coffee - Castro',
    address: '549 Castro St, San Francisco, CA 94114',
    latitude: 37.7603,
    longitude: -122.4349,
    place_types: ['cafe', 'food', 'point_of_interest', 'establishment'],
    post_count: 0,
    created_at: new Date().toISOString(),
  },
]

// Keep the original single location export for backwards compatibility
export const devMockLocation: LocationEntity = devMockLocations[0]

/**
 * Multiple mock posts distributed across locations
 */
/**
 * Helper to create a mock custom avatar for posts
 */
function createMockAvatar(id: string): StoredAvatar {
  // Avatar presets for mock data
  const presets = [
    { avatarId: 'avatar_asian_m', ethnicity: 'Asian', gender: 'M', outfit: 'Casual' },
    { avatarId: 'avatar_asian_f', ethnicity: 'Asian', gender: 'F', outfit: 'Casual' },
    { avatarId: 'avatar_black_m', ethnicity: 'Black', gender: 'M', outfit: 'Casual' },
    { avatarId: 'avatar_white_f', ethnicity: 'White', gender: 'F', outfit: 'Casual' },
    { avatarId: 'avatar_hispanic_m', ethnicity: 'Hispanic', gender: 'M', outfit: 'Casual' },
    { avatarId: 'avatar_mena_f', ethnicity: 'MENA', gender: 'F', outfit: 'Casual' },
  ];
  const preset = presets[Math.floor(Math.random() * presets.length)];

  return {
    id,
    version: 2,
    config: {
      avatarId: preset.avatarId,
      ethnicity: preset.ethnicity as 'Asian' | 'Black' | 'White' | 'Hispanic' | 'MENA',
      gender: preset.gender as 'M' | 'F',
      outfit: preset.outfit as 'Casual',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const devMockPosts: Post[] = [
  // Blue Bottle Coffee posts (3)
  {
    id: 'dev-post-001',
    producer_id: 'dev-producer-001',
    location_id: 'dev-location-001',
    target_avatar_v2: createMockAvatar('dev-target-001'),
    target_description: 'Had a laptop with cool stickers, seemed like a designer',
    message: 'You were working on your laptop by the window. I was too nervous to say hi!',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-001.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-002',
    producer_id: 'dev-producer-002',
    location_id: 'dev-location-001',
    target_avatar_v2: createMockAvatar('dev-target-002'),
    target_description: 'Reading a sci-fi book, had glasses',
    message: 'We made eye contact over our coffees. Would love to chat about what you were reading!',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-002.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-003',
    producer_id: devMockUser.id,
    location_id: 'dev-location-001',
    target_avatar_v2: createMockAvatar('dev-target-003'),
    target_description: 'A friendly person with a warm smile',
    message: 'I saw you at the coffee shop today. Would love to chat!',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-003.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date().toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  // Dolores Park posts (4)
  {
    id: 'dev-post-004',
    producer_id: 'dev-producer-003',
    location_id: 'dev-location-002',
    target_avatar_v2: createMockAvatar('dev-target-004'),
    target_description: 'Playing frisbee with a golden retriever',
    message: 'Your dog is adorable! We should get our dogs together sometime.',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-004.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-005',
    producer_id: 'dev-producer-004',
    location_id: 'dev-location-002',
    target_avatar_v2: createMockAvatar('dev-target-005'),
    target_description: 'Doing yoga on a blue mat near the palm trees',
    message: 'Your practice looked amazing! Would love to join you sometime.',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-005.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-006',
    producer_id: 'dev-producer-005',
    location_id: 'dev-location-002',
    target_avatar_v2: createMockAvatar('dev-target-006'),
    target_description: 'Picnic blanket, sharing snacks with friends',
    message: 'Your laugh is contagious! Wish I had the courage to come say hi.',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-006.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-007',
    producer_id: 'dev-producer-006',
    location_id: 'dev-location-002',
    target_avatar_v2: createMockAvatar('dev-target-007'),
    target_description: 'Sketching in a notebook, wearing a bucket hat',
    message: 'I noticed you drawing and was curious what you were sketching!',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-007.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  // Ferry Building posts (2)
  {
    id: 'dev-post-008',
    producer_id: 'dev-producer-007',
    location_id: 'dev-location-003',
    target_avatar_v2: createMockAvatar('dev-target-008'),
    target_description: 'Buying fresh flowers at the farmers market',
    message: 'The way you picked out those sunflowers was adorable!',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-008.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-009',
    producer_id: 'dev-producer-008',
    location_id: 'dev-location-003',
    target_avatar_v2: createMockAvatar('dev-target-009'),
    target_description: 'Tasting oysters at the Hog Island stand',
    message: 'You recommended the kumamoto oysters to me - you were right, they were amazing!',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-009.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  // Tartine Bakery post (1)
  {
    id: 'dev-post-010',
    producer_id: 'dev-producer-009',
    location_id: 'dev-location-004',
    target_avatar_v2: createMockAvatar('dev-target-010'),
    target_description: 'Cool band t-shirt, headphones around neck',
    message: 'Loved your music taste based on your shirt! What are you listening to?',
    note: null,
    selfie_url: 'https://example.com/mock-selfie-010.jpg',
    photo_id: null,
    seen_at: null,
    sighting_date: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString().split('T')[0],
    time_granularity: 'hour' as const,
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
]

// Keep the original single post export for backwards compatibility
export const devMockPost: Post = devMockPosts[2]

/**
 * Mock location visits (recent visits within 3-hour eligibility window)
 * These allow posting at these locations
 */
export const devMockLocationVisits: LocationVisit[] = [
  {
    id: 'dev-visit-001',
    user_id: devMockUser.id,
    location_id: 'dev-location-001',
    visited_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-visit-002',
    user_id: devMockUser.id,
    location_id: 'dev-location-003',
    visited_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-visit-003',
    user_id: devMockUser.id,
    location_id: 'dev-location-002',
    visited_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK CONVERSATIONS DATA
// ============================================================================

/**
 * Mock conversations between users
 * These create active chat threads for testing
 */
export const devMockConversations: Conversation[] = [
  {
    id: 'dev-conv-001',
    post_id: 'dev-post-001',
    producer_id: 'dev-producer-001',
    consumer_id: devMockUser.id,
    status: 'active',
    producer_accepted: true,
    verification_tier: 'verified_checkin',
    response_id: 'dev-response-001',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-conv-002',
    post_id: 'dev-post-004',
    producer_id: 'dev-producer-003',
    consumer_id: devMockUser.id,
    status: 'active',
    producer_accepted: true,
    verification_tier: 'regular_spot',
    response_id: 'dev-response-002',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-conv-003',
    post_id: 'dev-post-003',
    producer_id: devMockUser.id,
    consumer_id: 'dev-consumer-001',
    status: 'active',
    producer_accepted: true,
    verification_tier: 'unverified_claim',
    response_id: 'dev-response-003',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-conv-004',
    post_id: 'dev-post-008',
    producer_id: 'dev-producer-007',
    consumer_id: devMockUser.id,
    status: 'pending',
    producer_accepted: false,
    verification_tier: 'verified_checkin',
    response_id: 'dev-response-004',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK MESSAGES DATA
// ============================================================================

/**
 * Mock messages for conversations
 * Creates realistic chat histories
 */
export const devMockMessages: Message[] = [
  // Conversation 1 messages (active chat with dev-producer-001)
  {
    id: 'dev-msg-001',
    conversation_id: 'dev-conv-001',
    sender_id: devMockUser.id,
    content: 'Hey! I think I was the one you saw at Blue Bottle. Was it around 2pm?',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-002',
    conversation_id: 'dev-conv-001',
    sender_id: 'dev-producer-001',
    content: 'Yes! I remember you had a laptop with some cool stickers on it!',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-003',
    conversation_id: 'dev-conv-001',
    sender_id: devMockUser.id,
    content: 'That was me! I was working on a design project. I noticed you too 😊',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-004',
    conversation_id: 'dev-conv-001',
    sender_id: 'dev-producer-001',
    content: 'Would you want to grab coffee there again sometime? Maybe this weekend?',
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-005',
    conversation_id: 'dev-conv-001',
    sender_id: devMockUser.id,
    content: "I'd love that! Saturday afternoon works great for me.",
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-006',
    conversation_id: 'dev-conv-001',
    sender_id: 'dev-producer-001',
    content: "Perfect! See you Saturday at 2pm. I'll be the one with the vintage camera 📷",
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },

  // Conversation 2 messages (Dolores Park chat)
  {
    id: 'dev-msg-007',
    conversation_id: 'dev-conv-002',
    sender_id: devMockUser.id,
    content: 'Hi! I think you might have been describing me - I was at Dolores Park yesterday with my golden retriever, Max!',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-008',
    conversation_id: 'dev-conv-002',
    sender_id: 'dev-producer-003',
    content: 'Oh my gosh yes! Max is such a sweetheart. He kept trying to steal my frisbee 😂',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-009',
    conversation_id: 'dev-conv-002',
    sender_id: devMockUser.id,
    content: "Haha he loves frisbees! He's such a friendly pup. Do you go to the park often?",
    is_read: true,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-010',
    conversation_id: 'dev-conv-002',
    sender_id: 'dev-producer-003',
    content: "Almost every weekend! It's my favorite spot in the city. Would love to have a puppy playdate!",
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-011',
    conversation_id: 'dev-conv-002',
    sender_id: devMockUser.id,
    content: "That sounds fun! Max would love it. I'll be there this Sunday around noon.",
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },

  // Conversation 3 messages (user is the producer)
  {
    id: 'dev-msg-012',
    conversation_id: 'dev-conv-003',
    sender_id: 'dev-consumer-001',
    content: "Hey! I saw your post and I think you might be describing me? I was at the coffee shop this morning.",
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-013',
    conversation_id: 'dev-conv-003',
    sender_id: devMockUser.id,
    content: 'Yes! You had the most amazing smile. I really wanted to say hi but was too nervous.',
    is_read: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-014',
    conversation_id: 'dev-conv-003',
    sender_id: 'dev-consumer-001',
    content: "Aww that's so sweet! I actually noticed you too. You seemed really focused on your work.",
    is_read: true,
    created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-015',
    conversation_id: 'dev-conv-003',
    sender_id: devMockUser.id,
    content: "I was, but I couldn't stop glancing over 😊 Would you like to chat more?",
    is_read: true,
    created_at: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-msg-016',
    conversation_id: 'dev-conv-003',
    sender_id: 'dev-consumer-001',
    content: "Absolutely! I'd love to get to know you better. Tell me about yourself!",
    is_read: false,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK FAVORITE LOCATIONS DATA
// ============================================================================

/**
 * Mock favorite locations for the user
 * Creates a list of saved locations for quick access
 */
export const devMockFavoriteLocations: FavoriteLocation[] = [
  {
    id: 'dev-fav-001',
    user_id: devMockUser.id,
    custom_name: 'My Coffee Spot',
    place_name: 'Blue Bottle Coffee - Mint Plaza',
    latitude: 37.7825,
    longitude: -122.4048,
    address: '66 Mint St, San Francisco, CA 94103',
    place_id: 'ChIJdev001',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-fav-002',
    user_id: devMockUser.id,
    custom_name: 'Sunday Hangout',
    place_name: 'Dolores Park',
    latitude: 37.7596,
    longitude: -122.4269,
    address: 'Dolores St & 19th St, San Francisco, CA 94114',
    place_id: 'ChIJdev002',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-fav-003',
    user_id: devMockUser.id,
    custom_name: 'Farmers Market',
    place_name: 'Ferry Building Marketplace',
    latitude: 37.7955,
    longitude: -122.3937,
    address: '1 Ferry Building, San Francisco, CA 94111',
    place_id: 'ChIJdev003',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-fav-004',
    user_id: devMockUser.id,
    custom_name: 'Best Pastries',
    place_name: 'Tartine Bakery',
    latitude: 37.7614,
    longitude: -122.4241,
    address: '600 Guerrero St, San Francisco, CA 94110',
    place_id: 'ChIJdev004',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK NOTIFICATIONS DATA
// ============================================================================

/**
 * Mock notifications for the user
 */
export const devMockNotifications: Notification[] = [
  {
    id: 'dev-notif-001',
    user_id: devMockUser.id,
    type: 'new_message',
    reference_id: 'dev-conv-001',
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-notif-002',
    user_id: devMockUser.id,
    type: 'new_response',
    reference_id: 'dev-post-003',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-notif-003',
    user_id: devMockUser.id,
    type: 'response_accepted',
    reference_id: 'dev-conv-002',
    is_read: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-notif-004',
    user_id: devMockUser.id,
    type: 'new_message',
    reference_id: 'dev-conv-003',
    is_read: false,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK PHOTO SHARES DATA
// ============================================================================

/**
 * Mock photo shares in conversations
 */
export const devMockPhotoShares: PhotoShare[] = [
  {
    id: 'dev-share-001',
    photo_id: 'dev-photo-001',
    conversation_id: 'dev-conv-001',
    shared_by_user_id: devMockUser.id,
    shared_with_user_id: 'dev-producer-001',
    status: 'active',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-share-002',
    photo_id: 'dev-photo-external-001',
    conversation_id: 'dev-conv-001',
    shared_by_user_id: 'dev-producer-001',
    shared_with_user_id: devMockUser.id,
    status: 'active',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK USER CHECKINS DATA
// ============================================================================

/**
 * Mock user check-ins for tiered matching
 */
export const devMockUserCheckins: UserCheckin[] = [
  {
    id: 'dev-checkin-001',
    user_id: devMockUser.id,
    location_id: 'dev-location-001',
    checked_in_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    checked_out_at: null,
    verified: true,
    verification_lat: 37.7825,
    verification_lon: -122.4048,
    verification_accuracy: 15,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK LOCATION STREAKS DATA
// ============================================================================

/**
 * Mock location streaks for regular visitors
 */
export const devMockLocationStreaks: LocationStreak[] = [
  {
    id: 'dev-streak-001',
    user_id: devMockUser.id,
    location_id: 'dev-location-001',
    streak_count: 5,
    last_visit_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-streak-002',
    user_id: devMockUser.id,
    location_id: 'dev-location-002',
    streak_count: 12,
    last_visit_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-streak-003',
    user_id: devMockUser.id,
    location_id: 'dev-location-003',
    streak_count: 3,
    last_visit_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK EVENT ATTENDANCE DATA
// ============================================================================

/**
 * Mock event attendance records
 */
export const devMockEventAttendance: EventAttendance[] = [
  {
    id: 'dev-attendance-001',
    user_id: devMockUser.id,
    event_id: 'dev-event-001',
    status: 'going',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-attendance-002',
    user_id: devMockUser.id,
    event_id: 'dev-event-002',
    status: 'interested',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK NOTIFICATION PREFERENCES DATA
// ============================================================================

/**
 * Mock notification preferences for the user
 */
export const devMockNotificationPreferences: NotificationPreferences = {
  id: 'dev-notif-pref-001',
  user_id: devMockUser.id,
  messages: true,
  matches: true,
  marketing: false,
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
}

// ============================================================================
// MOCK PUSH TOKENS DATA
// ============================================================================

/**
 * Mock push tokens for the user
 */
export const devMockPushTokens: PushToken[] = [
  {
    id: 'dev-push-001',
    user_id: devMockUser.id,
    token: 'ExponentPushToken[dev-mock-token-001]',
    platform: 'android',
    device_name: 'Dev Test Device',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK PROFILE PHOTOS DATA
// ============================================================================

/**
 * Mock profile photos for the user
 */
export const devMockProfilePhotos = [
  {
    id: 'dev-photo-001',
    user_id: devMockUser.id,
    storage_path: 'profile-photos/dev-user-123/photo-001.jpg',
    moderation_status: 'approved',
    moderation_result: null,
    is_primary: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-photo-002',
    user_id: devMockUser.id,
    storage_path: 'profile-photos/dev-user-123/photo-002.jpg',
    moderation_status: 'approved',
    moderation_result: null,
    is_primary: false,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dev-photo-003',
    user_id: devMockUser.id,
    storage_path: 'profile-photos/dev-user-123/photo-003.jpg',
    moderation_status: 'pending',
    moderation_result: null,
    is_primary: false,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

/**
 * Mock external profile photos (from other users who shared with us)
 */
export const devMockExternalProfilePhotos = [
  {
    id: 'dev-photo-external-001',
    user_id: 'dev-producer-001',
    storage_path: 'profile-photos/dev-producer-001/photo-001.jpg',
    moderation_status: 'approved',
    moderation_result: null,
    is_primary: true,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// MOCK EVENTS DATA
// ============================================================================

/**
 * Event record type for mock data
 */
interface Event {
  id: string
  external_id: string
  platform: 'eventbrite' | 'meetup'
  title: string
  description: string | null
  date_time: string
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  url: string | null
  category: string | null
  created_at: string
  synced_at: string
  post_count: number
}

/**
 * Mock events for testing event discovery
 */
export const devMockEvents: Event[] = [
  {
    id: 'dev-event-001',
    external_id: 'eb-123456',
    platform: 'eventbrite',
    title: 'San Francisco Tech Mixer - January Edition',
    description: 'Join fellow tech professionals for networking, drinks, and conversation. Great opportunity to meet new people in the Bay Area tech scene!',
    date_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
    venue_name: 'The Battery San Francisco',
    venue_address: '717 Battery St, San Francisco, CA 94111',
    latitude: 37.7970,
    longitude: -122.4028,
    image_url: 'https://example.com/events/tech-mixer.jpg',
    url: 'https://eventbrite.com/e/123456',
    category: 'Networking',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    synced_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    post_count: 5,
  },
  {
    id: 'dev-event-002',
    external_id: 'mu-789012',
    platform: 'meetup',
    title: 'Dog Lovers Meetup at Dolores Park',
    description: 'Bring your furry friend to our weekly dog meetup! All breeds welcome. We usually gather near the playground area.',
    date_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    venue_name: 'Dolores Park',
    venue_address: 'Dolores St & 19th St, San Francisco, CA 94114',
    latitude: 37.7596,
    longitude: -122.4269,
    image_url: 'https://example.com/events/dog-meetup.jpg',
    url: 'https://meetup.com/events/789012',
    category: 'Pets',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    synced_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    post_count: 3,
  },
  {
    id: 'dev-event-003',
    external_id: 'eb-345678',
    platform: 'eventbrite',
    title: 'Coffee & Conversations - Creative Professionals',
    description: 'A relaxed morning gathering for designers, artists, and creative professionals. Share your work, get feedback, and meet like-minded individuals.',
    date_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    venue_name: 'Blue Bottle Coffee - Mint Plaza',
    venue_address: '66 Mint St, San Francisco, CA 94103',
    latitude: 37.7825,
    longitude: -122.4048,
    image_url: 'https://example.com/events/coffee-creatives.jpg',
    url: 'https://eventbrite.com/e/345678',
    category: 'Arts',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    synced_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    post_count: 2,
  },
  {
    id: 'dev-event-004',
    external_id: 'mu-901234',
    platform: 'meetup',
    title: 'Sunday Farmers Market Social',
    description: 'Meet fellow foodies while exploring the Ferry Building Farmers Market. We\'ll sample local produce and artisan foods together!',
    date_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    venue_name: 'Ferry Building Marketplace',
    venue_address: '1 Ferry Building, San Francisco, CA 94111',
    latitude: 37.7955,
    longitude: -122.3937,
    image_url: 'https://example.com/events/farmers-market.jpg',
    url: 'https://meetup.com/events/901234',
    category: 'Food & Drink',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    synced_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    post_count: 7,
  },
  {
    id: 'dev-event-005',
    external_id: 'eb-567890',
    platform: 'eventbrite',
    title: 'Sunset Yoga at the Park',
    description: 'End your day with a relaxing yoga session as the sun sets over the city. All skill levels welcome. Bring your own mat!',
    date_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000).toISOString(),
    venue_name: 'Dolores Park',
    venue_address: 'Dolores St & 19th St, San Francisco, CA 94114',
    latitude: 37.7596,
    longitude: -122.4269,
    image_url: 'https://example.com/events/sunset-yoga.jpg',
    url: 'https://eventbrite.com/e/567890',
    category: 'Health & Wellness',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    synced_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    post_count: 4,
  },
  {
    id: 'dev-event-006',
    external_id: 'mu-234567',
    platform: 'meetup',
    title: 'Book Club: Fiction Favorites',
    description: 'Monthly book club meeting. This month we\'re discussing "Tomorrow, and Tomorrow, and Tomorrow". Join us for lively discussion!',
    date_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    venue_name: 'Tartine Bakery',
    venue_address: '600 Guerrero St, San Francisco, CA 94110',
    latitude: 37.7614,
    longitude: -122.4241,
    image_url: 'https://example.com/events/book-club.jpg',
    url: 'https://meetup.com/events/234567',
    category: 'Arts & Culture',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    synced_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    post_count: 1,
  },
]

// ============================================================================
// GEOSPATIAL HELPERS
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Get mock nearby locations with distance calculation
 */
export function getMockNearbyLocations(
  userLat: number,
  userLon: number,
  radiusMeters: number = 5000
): NearbyLocationResult[] {
  return devMockLocations
    .map((location) => {
      const distance = calculateDistanceMeters(userLat, userLon, location.latitude, location.longitude)
      return {
        ...location,
        distance_meters: Math.round(distance),
      }
    })
    .filter((location) => location.distance_meters <= radiusMeters)
    .sort((a, b) => a.distance_meters - b.distance_meters)
}

/**
 * Get mock locations with active posts
 */
export function getMockLocationsWithActivePosts(
  userLat: number,
  userLon: number,
  radiusMeters: number = 5000,
  minPostCount: number = 1
): NearbyLocationResult[] {
  return getMockNearbyLocations(userLat, userLon, radiusMeters).filter(
    (location) => location.post_count >= minPostCount
  )
}

/**
 * Get mock recently visited locations (within eligibility window)
 */
export function getMockRecentlyVisitedLocations(): Array<{
  location: LocationEntity
  visited_at: string
}> {
  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000

  return devMockLocationVisits
    .filter((visit) => new Date(visit.visited_at).getTime() > threeHoursAgo)
    .map((visit) => {
      const location = devMockLocations.find((loc) => loc.id === visit.location_id)
      return {
        location: location!,
        visited_at: visit.visited_at,
      }
    })
    .filter((item) => item.location !== undefined)
    .sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime())
}

/**
 * Get posts for a specific location
 */
export function getMockPostsForLocation(locationId: string): Post[] {
  return devMockPosts.filter((post) => post.location_id === locationId && post.is_active)
}

// ============================================================================
// MOCK RPC HANDLER
// ============================================================================

/**
 * Handle mock RPC calls
 */
export function handleMockRpc(
  fn: string,
  params?: Record<string, unknown>
): unknown {
  switch (fn) {
    case 'get_nearby_locations': {
      const lat = (params?.lat as number) ?? DEV_MOCK_COORDINATES.latitude
      const lng = (params?.lng as number) ?? DEV_MOCK_COORDINATES.longitude
      const radius = (params?.radius_meters as number) ?? 5000
      return getMockNearbyLocations(lat, lng, radius)
    }

    case 'get_locations_with_active_posts': {
      const lat = (params?.lat as number) ?? DEV_MOCK_COORDINATES.latitude
      const lng = (params?.lng as number) ?? DEV_MOCK_COORDINATES.longitude
      const radius = (params?.radius_meters as number) ?? 5000
      const minPosts = (params?.min_post_count as number) ?? 1
      return getMockLocationsWithActivePosts(lat, lng, radius, minPosts)
    }

    case 'get_recently_visited_locations': {
      return getMockRecentlyVisitedLocations()
    }

    case 'record_location_visit': {
      return {
        id: 'dev-visit-' + Date.now(),
        user_id: devMockUser.id,
        location_id: params?.location_id,
        visited_at: new Date().toISOString(),
      }
    }

    case 'get_posts_at_location': {
      const locationId = params?.location_id as string
      return getMockPostsForLocation(locationId)
    }

    case 'get_user_conversations': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      return devMockConversations.filter(
        c => c.producer_id === userId || c.consumer_id === userId
      )
    }

    case 'get_conversation_messages': {
      const conversationId = params?.conversation_id as string
      return devMockMessages.filter(m => m.conversation_id === conversationId)
    }

    case 'get_user_favorite_locations': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      return devMockFavoriteLocations.filter(f => f.user_id === userId)
    }

    case 'get_user_notifications': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      return devMockNotifications.filter(n => n.user_id === userId)
    }

    case 'get_unread_notification_count': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      return devMockNotifications.filter(n => n.user_id === userId && !n.is_read).length
    }

    case 'get_active_checkin': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      const activeCheckin = devMockUserCheckins.find(
        c => c.user_id === userId && c.checked_out_at === null
      )
      if (!activeCheckin) return null
      const location = devMockLocations.find(l => l.id === activeCheckin.location_id)
      return {
        id: activeCheckin.id,
        location_id: activeCheckin.location_id,
        location_name: location?.name ?? 'Unknown Location',
        checked_in_at: activeCheckin.checked_in_at,
        verified: activeCheckin.verified,
      }
    }

    case 'get_location_streak': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      const locationId = params?.location_id as string
      const streak = devMockLocationStreaks.find(
        s => s.user_id === userId && s.location_id === locationId
      )
      return streak ?? null
    }

    case 'get_user_streaks': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      return devMockLocationStreaks
        .filter(s => s.user_id === userId)
        .map(s => {
          const location = devMockLocations.find(l => l.id === s.location_id)
          return {
            ...s,
            location_name: location?.name ?? 'Unknown Location',
          }
        })
    }

    case 'get_notification_preferences': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      if (devMockNotificationPreferences.user_id === userId) {
        return devMockNotificationPreferences
      }
      return null
    }

    case 'get_shared_photos_for_conversation': {
      const conversationId = params?.conversation_id as string
      return devMockPhotoShares.filter(p => p.conversation_id === conversationId)
    }

    case 'get_user_profile_photos': {
      const userId = (params?.user_id as string) ?? devMockUser.id
      return devMockProfilePhotos.filter(p => p.user_id === userId)
    }

    case 'checkin': {
      return {
        id: 'dev-checkin-' + Date.now(),
        user_id: devMockUser.id,
        location_id: params?.location_id,
        checked_in_at: new Date().toISOString(),
        checked_out_at: null,
        verified: true,
        verification_lat: params?.lat ?? DEV_MOCK_COORDINATES.latitude,
        verification_lon: params?.lng ?? DEV_MOCK_COORDINATES.longitude,
        verification_accuracy: 15,
        created_at: new Date().toISOString(),
      }
    }

    case 'checkout': {
      const checkinId = params?.checkin_id as string
      return {
        id: checkinId,
        checked_out_at: new Date().toISOString(),
      }
    }

    case 'search_events': {
      const lat = (params?.lat as number) ?? DEV_MOCK_COORDINATES.latitude
      const lng = (params?.lng as number) ?? DEV_MOCK_COORDINATES.longitude
      const radius = (params?.radius_km as number) ?? 50
      const query = (params?.query as string) ?? ''

      // Filter events by proximity and search query
      let results = devMockEvents.filter(event => {
        if (!event.latitude || !event.longitude) return false
        const distance = calculateDistanceMeters(lat, lng, event.latitude, event.longitude)
        return distance <= radius * 1000 // Convert km to meters
      })

      // Filter by query if provided
      if (query) {
        const lowerQuery = query.toLowerCase()
        results = results.filter(event =>
          event.title.toLowerCase().includes(lowerQuery) ||
          (event.description?.toLowerCase().includes(lowerQuery)) ||
          (event.category?.toLowerCase().includes(lowerQuery))
        )
      }

      return results
    }

    case 'get_event_by_id': {
      const eventId = params?.event_id as string
      return devMockEvents.find(e => e.id === eventId) ?? null
    }

    case 'get_nearby_events': {
      const lat = (params?.lat as number) ?? DEV_MOCK_COORDINATES.latitude
      const lng = (params?.lng as number) ?? DEV_MOCK_COORDINATES.longitude
      const radius = (params?.radius_km as number) ?? 10

      return devMockEvents.filter(event => {
        if (!event.latitude || !event.longitude) return false
        const distance = calculateDistanceMeters(lat, lng, event.latitude, event.longitude)
        return distance <= radius * 1000
      })
    }

    case 'get_event_attendance': {
      const eventId = params?.event_id as string
      const userId = (params?.user_id as string) ?? devMockUser.id
      return devMockEventAttendance.find(
        a => a.event_id === eventId && a.user_id === userId
      ) ?? null
    }

    case 'update_event_attendance': {
      const eventId = params?.event_id as string
      const status = params?.status as string
      return {
        id: 'dev-attendance-' + Date.now(),
        user_id: devMockUser.id,
        event_id: eventId,
        status: status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    default:
      return null
  }
}

// ============================================================================
// MOCK QUERY BUILDER
// ============================================================================

/**
 * Creates a chainable mock query builder for development
 * All methods return the builder for chaining, except terminal methods (single, maybeSingle)
 */
export function createDevMockQueryBuilder<T = unknown>(
  mockData: T | T[] | null = null,
  mockError: Error | null = null
): DevMockQueryBuilder {
  const normalizedData = Array.isArray(mockData)
    ? mockData
    : mockData !== null
      ? [mockData]
      : []

  const chainableResult = { data: normalizedData, error: mockError }

  const builder: DevMockQueryBuilder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    in: () => builder,
    not: () => builder,
    or: () => builder,
    and: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    filter: () => builder,
    match: () => builder,

    single: async () => ({
      data: normalizedData[0] || null,
      error: mockError,
    }),
    maybeSingle: async () => ({
      data: normalizedData[0] || null,
      error: mockError,
    }),

    then: <TResult>(
      onfulfilled?: ((value: QueryResult<unknown[]>) => TResult | PromiseLike<TResult>) | null
    ) => {
      const result = Promise.resolve(chainableResult)
      return onfulfilled ? result.then(onfulfilled) : (result as Promise<TResult>)
    },
  }

  return builder
}

// ============================================================================
// MOCK AUTH
// ============================================================================

/**
 * Creates mock auth object for development
 * Default state is logged out (null user/session) for realistic dev experience
 */
export function createDevMockAuth(options?: {
  user?: DevMockUser | null
  session?: DevMockSession | null
  startLoggedIn?: boolean
}): DevMockAuth {
  const startLoggedIn = options?.startLoggedIn ?? false
  let currentUser = startLoggedIn ? (options?.user ?? devMockUser) : null
  let currentSession = startLoggedIn ? (options?.session ?? devMockSession) : null

  const authStateCallbacks: Array<(event: string, session: DevMockSession | null) => void> = []

  return {
    getUser: async () => {
      return { data: { user: currentUser }, error: null }
    },
    getSession: async () => {
      return { data: { session: currentSession }, error: null }
    },
    signInWithPassword: async () => { currentUser = devMockUser; currentSession = devMockSession;
      authStateCallbacks.forEach((cb) => cb('SIGNED_IN', devMockSession))
      return { data: { user: devMockUser, session: devMockSession }, error: null }
    },
    signUp: async () => { currentUser = devMockUser; currentSession = devMockSession;
      authStateCallbacks.forEach((cb) => cb('SIGNED_IN', devMockSession))
      return { data: { user: devMockUser, session: devMockSession }, error: null }
    },
    signOut: async () => { currentUser = null; currentSession = null;
      authStateCallbacks.forEach((cb) => cb('SIGNED_OUT', null))
      return { error: null }
    },
    onAuthStateChange: (callback) => {
      authStateCallbacks.push(callback)
      if (currentSession) {
        callback('SIGNED_IN', currentSession)
      } else {
        callback('SIGNED_OUT', null)
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = authStateCallbacks.indexOf(callback)
              if (index > -1) {
                authStateCallbacks.splice(index, 1)
              }
            },
          },
        },
      }
    },
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: devMockUser }, error: null }),
  }
}

// ============================================================================
// MOCK STORAGE
// ============================================================================

/**
 * Creates mock storage object for development
 */
export function createDevMockStorage(): DevMockStorage {
  const createBucketMethods = (): DevMockStorageBucket => ({
    upload: async (path: string) => ({
      data: { path },
      error: null,
    }),
    download: async () => ({
      data: new Blob(['mock file content'], { type: 'text/plain' }),
      error: null,
    }),
    remove: async () => ({
      data: {},
      error: null,
    }),
    getPublicUrl: (path: string) => ({
      data: { publicUrl: 'https://mock-storage.example.com/' + path },
    }),
    createSignedUrl: async (path: string) => ({
      data: { signedUrl: 'https://mock-storage.example.com/signed/' + path + '?token=mock-token' },
      error: null,
    }),
    list: async () => ({
      data: [],
      error: null,
    }),
  })

  return {
    from: () => createBucketMethods(),
  }
}

// ============================================================================
// MOCK CHANNEL (REALTIME)
// ============================================================================

/**
 * Creates mock channel for development realtime features
 */
export function createDevMockChannel(): DevMockChannel {
  const channel: DevMockChannel = {
    on: () => channel,
    subscribe: () => channel,
    unsubscribe: () => {},
  }
  return channel
}

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Creates a complete mock Supabase client for development
 *
 * This client provides realistic mock data for all tables and supports
 * the full query builder chain pattern used by the real Supabase client.
 *
 * @param options Configuration options for the mock client
 * @returns A mock Supabase client that can be used in place of the real client
 */
export function createDevSupabaseClient(options?: {
  user?: DevMockUser | null
  session?: DevMockSession | null
  startLoggedIn?: boolean
}): DevMockSupabaseClient {
  return {
    auth: createDevMockAuth(options),
    storage: createDevMockStorage(),
    from: (table: string) => {
      switch (table) {
        case 'profiles':
          return createDevMockQueryBuilder([devMockProfile])
        case 'locations':
          return createDevMockQueryBuilder(devMockLocations)
        case 'posts':
          return createDevMockQueryBuilder(devMockPosts)
        case 'location_visits':
          return createDevMockQueryBuilder(devMockLocationVisits)
        case 'conversations':
          return createDevMockQueryBuilder(devMockConversations)
        case 'messages':
          return createDevMockQueryBuilder(devMockMessages)
        case 'notifications':
          return createDevMockQueryBuilder(devMockNotifications)
        case 'favorite_locations':
          return createDevMockQueryBuilder(devMockFavoriteLocations)
        case 'photo_shares':
          return createDevMockQueryBuilder(devMockPhotoShares)
        case 'user_checkins':
          return createDevMockQueryBuilder(devMockUserCheckins)
        case 'location_streaks':
          return createDevMockQueryBuilder(devMockLocationStreaks)
        case 'event_attendance':
          return createDevMockQueryBuilder(devMockEventAttendance)
        case 'notification_preferences':
          return createDevMockQueryBuilder([devMockNotificationPreferences])
        case 'push_tokens':
          return createDevMockQueryBuilder(devMockPushTokens)
        case 'blocks':
        case 'blocked_users':
          return createDevMockQueryBuilder([])
        case 'reports':
        case 'user_reports':
          return createDevMockQueryBuilder([])
        case 'profile_photos':
          return createDevMockQueryBuilder(devMockProfilePhotos)
        case 'events':
          return createDevMockQueryBuilder(devMockEvents)
        default:
          return createDevMockQueryBuilder([])
      }
    },
    channel: () => createDevMockChannel(),
    removeChannel: () => {},
    rpc: async (fn: string, params?: object) => ({
      data: handleMockRpc(fn, params as Record<string, unknown>),
      error: null,
    }),
  }
}

/**
 * Type-compatible mock client that can be used as SupabaseClient
 * This casts the mock client to be compatible with Supabase's types
 */
export function createTypedDevSupabaseClient(
  options?: Parameters<typeof createDevSupabaseClient>[0]
): SupabaseClient {
  return createDevSupabaseClient(options) as unknown as SupabaseClient
}

/**
 * Default development mock client instance
 * Pre-configured with logged-out state for typical development usage
 */
export const devMockSupabaseClient = createDevSupabaseClient()
