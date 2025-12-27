/**
 * Supabase Mock for Testing
 *
 * Provides mock implementations for Supabase client and auth.
 * Supports both simple default mocks and customizable factory functions.
 */

import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Profile, Post, Location as LocationEntity, Conversation, Message } from '../../types/database'

// Note: Old avatar types removed - using plain objects for mock data

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Extended mock user type for testing
 */
export interface MockUser {
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
export interface MockSession {
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
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  eq: jest.Mock
  neq: jest.Mock
  gt: jest.Mock
  gte: jest.Mock
  lt: jest.Mock
  lte: jest.Mock
  like: jest.Mock
  ilike: jest.Mock
  is?: jest.Mock
  in: jest.Mock
  not?: jest.Mock
  or?: jest.Mock
  and?: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  range: jest.Mock
  filter?: jest.Mock
  then?: (resolve: (value: any) => void) => Promise<any>
}

/**
 * Mock auth methods interface
 */
export interface MockAuth {
  getUser: jest.Mock
  getSession: jest.Mock
  signInWithPassword: jest.Mock
  signUp: jest.Mock
  signOut: jest.Mock
  onAuthStateChange: jest.Mock
  resetPasswordForEmail: jest.Mock
  updateUser: jest.Mock
}

/**
 * Mock storage methods interface
 */
export interface MockStorage {
  from: jest.Mock
  upload?: jest.Mock
  download?: jest.Mock
  remove?: jest.Mock
  getPublicUrl?: jest.Mock
  createSignedUrl?: jest.Mock
  list?: jest.Mock
}

/**
 * Mock Supabase client interface
 */
export interface MockSupabaseClient {
  auth: MockAuth
  storage: MockStorage
  from: jest.Mock
  channel?: jest.Mock
  removeChannel?: jest.Mock
  rpc?: jest.Mock
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
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    lte: jest.fn(),
    like: jest.fn(),
    ilike: jest.fn(),
    is: jest.fn(),
    in: jest.fn(),
    not: jest.fn(),
    or: jest.fn(),
    and: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    range: jest.fn(),
    filter: jest.fn(),
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
    builder[method] = jest.fn().mockReturnValue(builder)
  })

  // Terminal methods return the result
  const chainableResult = { data: normalizedData, error: mockError }
  builder.single = jest.fn().mockResolvedValue({
    data: normalizedData[0] || null,
    error: mockError,
  })
  builder.maybeSingle = jest.fn().mockResolvedValue({
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
    getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    getSession: jest
      .fn()
      .mockResolvedValue({ data: { session }, error: null }),
    signInWithPassword: jest
      .fn()
      .mockResolvedValue({ data: { user, session }, error: null }),
    signUp: jest
      .fn()
      .mockResolvedValue({ data: { user, session }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockImplementation((callback) => {
      // Immediately trigger with current session
      if (callback) {
        callback('SIGNED_IN', session)
      }
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      }
    }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: jest.fn().mockResolvedValue({
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
    upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path.jpg' }, error: null }),
    download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/mock-image.jpg' },
    }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url.jpg' },
      error: null,
    }),
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
  }

  const storage: MockStorage = {
    from: jest.fn().mockReturnValue(storageMethods),
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
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn(),
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
    from: jest.fn().mockImplementation((table: string) => {
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
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}

/**
 * Creates a mock for the createClient function from lib/supabase/client
 */
export function createClientMock(options?: Parameters<typeof createMockSupabaseClient>[0]) {
  const mockClient = createMockSupabaseClient(options)
  return jest.fn().mockReturnValue(mockClient)
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

  jest.clearAllMocks()

  // Reset auth mocks
  Object.values(targetClient.auth).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Reset storage mocks
  Object.values(targetClient.storage).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Reset from mock
  if (jest.isMockFunction(targetClient.from)) {
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
  const error = new Error(message) as unknown as AuthError
  Object.assign(error, {
    name: 'AuthError',
    status: 400,
    code: 'auth_error',
  })

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