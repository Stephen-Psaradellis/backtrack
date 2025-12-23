/**
 * Supabase Mock for Testing
 *
 * Provides mock implementations for Supabase client and auth.
 */

import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Profile, Post, Location as LocationEntity, Conversation, Message } from '../../types/database'
import type { AvatarConfig } from '../../types/avatar'
import { DEFAULT_AVATAR_CONFIG } from '../../types/avatar'

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Mock user for testing
 */
export const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

/**
 * Mock session for testing
 */
export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
}

/**
 * Mock profile for testing
 */
export const mockProfile: Profile = {
  id: mockUser.id,
  display_name: 'Test User',
  own_avatar: DEFAULT_AVATAR_CONFIG as unknown as Record<string, unknown>,
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
  place_id: 'mock-place-id',
  created_at: new Date().toISOString(),
}

/**
 * Mock post for testing
 */
export const mockPost: Post = {
  id: 'test-post-123',
  producer_id: mockUser.id,
  location_id: mockLocation.id,
  target_avatar: DEFAULT_AVATAR_CONFIG as unknown as Record<string, unknown>,
  note: 'I saw you at the coffee shop today and thought you had a wonderful smile.',
  selfie_url: 'mock-selfie-path.jpg',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
}

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Mock query builder for Supabase
 */
export function createMockQueryBuilder<T>(defaultData: T[] = []) {
  let data = [...defaultData]
  let error: Error | null = null

  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => ({
      data: data[0] || null,
      error,
    })),
    maybeSingle: jest.fn().mockImplementation(() => ({
      data: data[0] || null,
      error,
    })),
    then: jest.fn().mockImplementation((resolve) => {
      resolve({ data, error })
    }),
    // For awaiting queries
    data,
    error,
  }

  // Make it thenable
  Object.defineProperty(queryBuilder, 'then', {
    value: (resolve: Function) => {
      return Promise.resolve().then(() => resolve({ data, error }))
    },
  })

  return queryBuilder
}

/**
 * Mock auth for Supabase
 */
export const mockAuth = {
  signUp: jest.fn().mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null,
  }),
  signInWithPassword: jest.fn().mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null,
  }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
  resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
  updateUser: jest.fn().mockResolvedValue({
    data: { user: mockUser },
    error: null,
  }),
  getSession: jest.fn().mockResolvedValue({
    data: { session: mockSession },
    error: null,
  }),
  getUser: jest.fn().mockResolvedValue({
    data: { user: mockUser },
    error: null,
  }),
  onAuthStateChange: jest.fn().mockImplementation((callback) => {
    // Immediately trigger with current session
    callback('SIGNED_IN', mockSession)
    return {
      data: { subscription: { unsubscribe: jest.fn() } },
    }
  }),
}

/**
 * Mock storage for Supabase
 */
export const mockStorage = {
  from: jest.fn().mockReturnValue({
    upload: jest.fn().mockResolvedValue({
      data: { path: 'mock-path.jpg' },
      error: null,
    }),
    download: jest.fn().mockResolvedValue({
      data: new Blob(),
      error: null,
    }),
    remove: jest.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/mock-image.jpg' },
    }),
    createSignedUrl: jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url.jpg' },
      error: null,
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  }),
}

/**
 * Mock Supabase channel for realtime
 */
export const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn(),
}

/**
 * Create a complete mock Supabase client
 */
export function createMockSupabaseClient() {
  return {
    auth: mockAuth,
    storage: mockStorage,
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
          return createMockQueryBuilder([])
      }
    }),
    channel: jest.fn().mockReturnValue(mockChannel),
    removeChannel: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}

/**
 * Mock the supabase module
 */
export const mockSupabase = createMockSupabaseClient()

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Reset all mocks to initial state
 */
export function resetSupabaseMocks(): void {
  jest.clearAllMocks()

  // Reset auth mocks
  mockAuth.signUp.mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null,
  })
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: mockUser, session: mockSession },
    error: null,
  })
  mockAuth.signOut.mockResolvedValue({ error: null })
  mockAuth.getSession.mockResolvedValue({
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
