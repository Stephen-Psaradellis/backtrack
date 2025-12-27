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

// Note: Old avatar types removed - using plain objects for mock data

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
  avatar_config: null,
  own_avatar: null,
  rpm_avatar: null,
  rpm_avatar_id: 'dev-rpm-avatar-123',
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
 * Helper to create a mock RPM avatar for posts
 */
function createMockRpmAvatar(id: string) {
  return {
    avatarId: id,
    modelUrl: `https://models.readyplayer.me/${id}.glb`,
    imageUrl: `https://models.readyplayer.me/${id}.png`,
    gender: 'male' as const,
    bodyType: 'fullbody' as const,
    createdAt: new Date().toISOString(),
  }
}

export const devMockPosts: Post[] = [
  // Blue Bottle Coffee posts (3)
  {
    id: 'dev-post-001',
    producer_id: 'dev-producer-001',
    location_id: 'dev-location-001',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-001'),
    target_description: 'Had a laptop with cool stickers, seemed like a designer',
    message: 'You were working on your laptop by the window. I was too nervous to say hi!',
    selfie_url: 'https://example.com/mock-selfie-001.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-002',
    producer_id: 'dev-producer-002',
    location_id: 'dev-location-001',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-002'),
    target_description: 'Reading a sci-fi book, had glasses',
    message: 'We made eye contact over our coffees. Would love to chat about what you were reading!',
    selfie_url: 'https://example.com/mock-selfie-002.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-003',
    producer_id: devMockUser.id,
    location_id: 'dev-location-001',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-003'),
    target_description: 'A friendly person with a warm smile',
    message: 'I saw you at the coffee shop today. Would love to chat!',
    selfie_url: 'https://example.com/mock-selfie-003.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  // Dolores Park posts (4)
  {
    id: 'dev-post-004',
    producer_id: 'dev-producer-003',
    location_id: 'dev-location-002',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-004'),
    target_description: 'Playing frisbee with a golden retriever',
    message: 'Your dog is adorable! We should get our dogs together sometime.',
    selfie_url: 'https://example.com/mock-selfie-004.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-005',
    producer_id: 'dev-producer-004',
    location_id: 'dev-location-002',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-005'),
    target_description: 'Doing yoga on a blue mat near the palm trees',
    message: 'Your practice looked amazing! Would love to join you sometime.',
    selfie_url: 'https://example.com/mock-selfie-005.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-006',
    producer_id: 'dev-producer-005',
    location_id: 'dev-location-002',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-006'),
    target_description: 'Picnic blanket, sharing snacks with friends',
    message: 'Your laugh is contagious! Wish I had the courage to come say hi.',
    selfie_url: 'https://example.com/mock-selfie-006.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-007',
    producer_id: 'dev-producer-006',
    location_id: 'dev-location-002',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-007'),
    target_description: 'Sketching in a notebook, wearing a bucket hat',
    message: 'I noticed you drawing and was curious what you were sketching!',
    selfie_url: 'https://example.com/mock-selfie-007.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  // Ferry Building posts (2)
  {
    id: 'dev-post-008',
    producer_id: 'dev-producer-007',
    location_id: 'dev-location-003',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-008'),
    target_description: 'Buying fresh flowers at the farmers market',
    message: 'The way you picked out those sunflowers was adorable!',
    selfie_url: 'https://example.com/mock-selfie-008.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  {
    id: 'dev-post-009',
    producer_id: 'dev-producer-008',
    location_id: 'dev-location-003',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-009'),
    target_description: 'Tasting oysters at the Hog Island stand',
    message: 'You recommended the kumamoto oysters to me - you were right, they were amazing!',
    selfie_url: 'https://example.com/mock-selfie-009.jpg',
    photo_id: null,
    seen_at: null,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  },
  // Tartine Bakery post (1)
  {
    id: 'dev-post-010',
    producer_id: 'dev-producer-009',
    location_id: 'dev-location-004',
    target_avatar: null,
    target_rpm_avatar: createMockRpmAvatar('dev-target-010'),
    target_description: 'Cool band t-shirt, headphones around neck',
    message: 'Loved your music taste based on your shirt! What are you listening to?',
    selfie_url: 'https://example.com/mock-selfie-010.jpg',
    photo_id: null,
    seen_at: null,
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
  const user = startLoggedIn ? (options?.user ?? devMockUser) : null
  const session = startLoggedIn ? (options?.session ?? devMockSession) : null

  const authStateCallbacks: Array<(event: string, session: DevMockSession | null) => void> = []

  return {
    getUser: async () => ({ data: { user }, error: null }),
    getSession: async () => ({ data: { session }, error: null }),
    signInWithPassword: async () => {
      authStateCallbacks.forEach((cb) => cb('SIGNED_IN', devMockSession))
      return { data: { user: devMockUser, session: devMockSession }, error: null }
    },
    signUp: async () => {
      authStateCallbacks.forEach((cb) => cb('SIGNED_IN', devMockSession))
      return { data: { user: devMockUser, session: devMockSession }, error: null }
    },
    signOut: async () => {
      authStateCallbacks.forEach((cb) => cb('SIGNED_OUT', null))
      return { error: null }
    },
    onAuthStateChange: (callback) => {
      authStateCallbacks.push(callback)
      if (session) {
        callback('SIGNED_IN', session)
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
          return createDevMockQueryBuilder([])
        case 'messages':
          return createDevMockQueryBuilder([])
        case 'notifications':
          return createDevMockQueryBuilder([])
        case 'blocks':
        case 'blocked_users':
          return createDevMockQueryBuilder([])
        case 'reports':
        case 'user_reports':
          return createDevMockQueryBuilder([])
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
