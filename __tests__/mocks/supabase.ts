/**
 * Supabase Mock for Testing
 *
 * Provides mock implementations for Supabase client and auth.
 * Supports both simple default mocks and customizable factory functions.
 */

import { vi, Mock } from 'vitest'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Profile, Post, Location as LocationEntity, Conversation, Message } from '../../types/database'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extended mock user type for testing
 */
export interface MockUser extends Partial<User> {
  id: string
  email?: string
  phone?: string
  created_at?: string
  updated_at?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  aud?: string
}

/**
 * Extended mock session type for testing
 */
export interface MockSession extends Partial<Session> {
  access_token: string
  refresh_token: string
  user: MockUser
  expires_in?: number
  expires_at?: number
  token_type?: string
}

/**
 * Mock query builder interface that supports chaining
 */
export interface MockQueryBuilder {
  select: Mock
  insert: Mock
  update: Mock
  delete: Mock
  eq: Mock
  neq: Mock
  gt: Mock
  gte: Mock
  lt: Mock
  lte: Mock
  like: Mock
  ilike: Mock
  is?: Mock
  in: Mock
  not?: Mock
  or?: Mock
  and?: Mock
  order: Mock
  limit: Mock
  single: Mock
  maybeSingle: Mock
  range: Mock
  filter?: Mock
  then?: (resolve: (value: any) => void) => Promise<any>
}

/**
 * Mock auth methods interface
 */
export interface MockAuth {
  getUser: Mock
  getSession: Mock
  signInWithPassword: Mock
  signUp: Mock
  signOut: Mock
  onAuthStateChange: Mock
  resetPasswordForEmail: Mock
  updateUser: Mock
}

/**
 * Mock storage methods interface
 */
export interface MockStorage {
  from: Mock
  upload?: Mock
  download?: Mock
  remove?: Mock
  getPublicUrl?: Mock
  createSignedUrl?: Mock
  list?: Mock
}

/**
 * Mock Supabase client interface
 */
export interface MockSupabaseClient {
  auth: MockAuth
  storage: MockStorage
  from: Mock
  channel?: Mock
  removeChannel?: Mock
  rpc?: Mock
}

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Mock user for testing
 */
export const mockUser: MockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Mock session for testing
 */
export const mockSession: MockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser,
}

/**
 * Mock profile for testing
 */
export const mockProfile: Profile = {
  username: 'testuser',
  avatar_config: null,
  id: mockUser.id,
  display_name: 'Test User',
  own_avatar: null,
  rpm_avatar: null,
  rpm_avatar_id: 'mock-rpm-avatar-123',
  is_verified: false,
  verified_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Mock location for testing
 */
export const mockLocation: LocationEntity = {
  id: 'test-location-123',
  name: 'Coffee Shop on Main St',
  address: '123 Main St, San Francisco, CA 94102',
  latitude: 37.7749,
  longitude: -122.4194,
  google_place_id: 'mock-place-id',
  place_types: ['cafe'],
  post_count: 0,
  created_at: new Date().toISOString(),
}

/**
 * Mock post for testing
 */
export const mockPost: Post = {
  id: 'test-post-123',
  producer_id: mockUser.id,
  location_id: mockLocation.id,
  target_avatar: null,
  target_rpm_avatar: { avatarId: 'mock-target-avatar-123', modelUrl: 'https://models.readyplayer.me/mock.glb', imageUrl: 'https://models.readyplayer.me/mock.png', gender: 'male', bodyType: 'fullbody', createdAt: new Date().toISOString() },
  message: 'I saw you at the coffee shop today and thought you had a wonderful smile.',
  selfie_url: 'mock-selfie-path.jpg',
  photo_id: null,
  target_description: null,
  seen_at: null,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
}

// ============================================================================
// MOCK QUERY BUILDER
// ============================================================================

/**
 * Creates a chainable mock query builder
 * All methods return the builder for chaining, except terminal methods (single, maybeSingle)
 */
export function createMockQueryBuilder<T = unknown>(
  mockData: T | T[] | null = null,
  mockError: Error | null = null
): MockQueryBuilder {
  const normalizedData = Array.isArray(mockData) ? mockData : (mockData !== null ? [mockData as T] : [])

  const builder: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    like: vi.fn(),
    ilike: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    not: vi.fn(),
    or: vi.fn(),
    and: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    filter: vi.fn(),
  }

  // Make all chainable methods return the builder
  const chainMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'not',
    'or',
    'and',
    'order',
    'limit',
    'range',
    'filter',
  ]

  chainMethods.forEach((method) => {
    builder[method] = vi.fn().mockReturnValue(builder)
  })

  // Terminal methods return the result
  const chainableResult = { data: normalizedData, error: mockError }
  builder.single = vi.fn().mockResolvedValue({
    data: normalizedData[0] || null,
    error: mockError,
  })
  builder.maybeSingle = vi.fn().mockResolvedValue({
    data: normalizedData[0] || null,
    error: mockError,
  })

  // Make the builder itself a thenable for direct await
  builder.then = (resolve: (value: any) => void) =>
    Promise.resolve(chainableResult).then(resolve)

  return builder as MockQueryBuilder
}

// ============================================================================
// MOCK AUTH
// ============================================================================

/**
 * Creates mock auth object with common authentication methods
 */
export function createMockAuth(options?: {
  user?: MockUser | null
  session?: MockSession | null
}): MockAuth {
  const user = options?.user ?? mockUser
  const session = options?.session ?? mockSession

  return {
    getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    getSession: vi
      .fn()
      .mockResolvedValue({ data: { session }, error: null }),
    signInWithPassword: vi
      .fn()
      .mockResolvedValue({ data: { user, session }, error: null }),
    signUp: vi
      .fn()
      .mockResolvedValue({ data: { user, session }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockImplementation((callback) => {
      // Immediately trigger with current session
      if (callback) {
        callback('SIGNED_IN', session)
      }
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
  }
}

/**
 * Mock auth object with default values
 */
export const mockAuth = createMockAuth()

// ============================================================================
// MOCK STORAGE
// ============================================================================

/**
 * Creates mock storage object for file operations
 */
export function createMockStorage(): MockStorage {
  const storageMethods = {
    upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path.jpg' }, error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/mock-image.jpg' },
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url.jpg' },
      error: null,
    }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  const storage: MockStorage = {
    from: vi.fn().mockReturnValue(storageMethods),
    ...storageMethods,
  }

  return storage
}

/**
 * Mock storage object with default values
 */
export const mockStorage = createMockStorage()

// ============================================================================
// MOCK CHANNEL
// ============================================================================

/**
 * Mock Supabase channel for realtime
 */
export const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
}

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Creates a complete mock Supabase client
 */
export function createMockSupabaseClient(options?: {
  user?: MockUser | null
  session?: MockSession | null
  queryData?: unknown
  queryError?: Error | null
}): MockSupabaseClient {
  const queryBuilder = createMockQueryBuilder(
    options?.queryData ?? null,
    options?.queryError ?? null
  )

  return {
    auth: createMockAuth({
      user: options?.user,
      session: options?.session,
    }),
    storage: createMockStorage(),
    from: vi.fn().mockImplementation((table: string) => {
      switch (table) {
        case 'profiles':
          return createMockQueryBuilder([mockProfile])
        case 'locations':
          return createMockQueryBuilder([mockLocation])
        case 'posts':
          return createMockQueryBuilder([mockPost])
        case 'conversations':
          return createMockQueryBuilder([])
        case 'messages':
          return createMockQueryBuilder([])
        case 'blocks':
          return createMockQueryBuilder([])
        case 'reports':
          return createMockQueryBuilder([])
        default:
          return queryBuilder
      }
    }),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}

/**
 * Creates a mock for the createClient function from lib/supabase/client
 */
export function createClientMock(options?: Parameters<typeof createMockSupabaseClient>[0]) {
  const mockClient = createMockSupabaseClient(options)
  return vi.fn().mockReturnValue(mockClient)
}

/**
 * Mock Supabase client instance for simple cases
 */
export const mockSupabase = createMockSupabaseClient()
export const mockSupabaseClient = mockSupabase

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Reset all mocks to initial state
 */
export function resetSupabaseMocks(client?: MockSupabaseClient): void {
  const targetClient = client ?? mockSupabase

  vi.clearAllMocks()

  // Reset auth mocks
  Object.values(targetClient.auth).forEach((mock) => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Reset storage mocks
  Object.values(targetClient.storage).forEach((mock) => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Reset from mock
  if (vi.isMockFunction(targetClient.from)) {
    targetClient.from.mockClear()
  }

  // Restore default auth implementations
  targetClient.auth.signUp.mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null,
  })
  targetClient.auth.signInWithPassword.mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null,
  })
  targetClient.auth.signOut.mockResolvedValue({ error: null })
  targetClient.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  })
}

/**
 * Configure auth to fail with a specific error
 */
export function mockAuthError(method: 'signUp' | 'signIn' | 'signOut', message: string): void {
  const error: AuthError = {
    name: 'AuthError',
    message,
    status: 400,
  }

  if (method === 'signIn') {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error,
    })
  } else if (method === 'signUp') {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error,
    })
  } else if (method === 'signOut') {
    mockAuth.signOut.mockResolvedValue({ error })
  }
}

/**
 * Configure a table query to return specific data
 */
export function mockTableData<T>(table: string, data: T[]): void {
  mockSupabase.from.mockImplementation((tableName: string) => {
    if (tableName === table) {
      return createMockQueryBuilder(data)
    }
    return createMockQueryBuilder([])
  })
}

// Export the mock for Jest module mocking
export default mockSupabase