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
 */

import type { User, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Profile, Post, Location as LocationEntity } from '../../types/database'
import type { AvatarConfig } from '../../types/avatar'
import { DEFAULT_AVATAR_CONFIG } from '../../types/avatar'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Mock user type for development
 */
export interface DevMockUser extends Partial<User> {
  id: string
  email?: string
  phone?: string
  created_at?: string
  updated_at?: string
}

/**
 * Mock session type for development
 */
export interface DevMockSession extends Partial<Session> {
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
  rpc: (fn: string, params?: object) => Promise<{ data: null; error: null }>
}

// ============================================================================
// MOCK DATA
// ============================================================================

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
  avatar_config: DEFAULT_AVATAR_CONFIG as AvatarConfig,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Mock location for development
 */
export const devMockLocation: LocationEntity = {
  id: 'dev-location-123',
  google_place_id: 'dev-mock-place-id',
  name: 'Mock Coffee Shop',
  address: '123 Dev Street, Mock City, MC 12345',
  latitude: 37.7749,
  longitude: -122.4194,
  place_types: ['cafe', 'restaurant'],
  post_count: 5,
  created_at: new Date().toISOString(),
}

/**
 * Mock post for development
 */
export const devMockPost: Post = {
  id: 'dev-post-123',
  producer_id: devMockUser.id,
  location_id: devMockLocation.id,
  target_avatar: DEFAULT_AVATAR_CONFIG as AvatarConfig,
  target_description: 'A friendly person with a warm smile',
  message: 'I saw you at the coffee shop today. Would love to chat!',
  selfie_url: 'https://example.com/mock-selfie.jpg',
  seen_at: null,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
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

    // Terminal methods return the result
    single: async () => ({
      data: normalizedData[0] || null,
      error: mockError,
    }),
    maybeSingle: async () => ({
      data: normalizedData[0] || null,
      error: mockError,
    }),

    // Make the builder thenable for direct await
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
  // By default, start in logged-out state for realistic dev experience
  const startLoggedIn = options?.startLoggedIn ?? false
  const user = startLoggedIn ? (options?.user ?? devMockUser) : null
  const session = startLoggedIn ? (options?.session ?? devMockSession) : null

  // Track auth state for onAuthStateChange callbacks
  const authStateCallbacks: Array<(event: string, session: DevMockSession | null) => void> = []

  return {
    getUser: async () => ({ data: { user }, error: null }),
    getSession: async () => ({ data: { session }, error: null }),
    signInWithPassword: async () => {
      // Notify subscribers of sign in
      authStateCallbacks.forEach((cb) => cb('SIGNED_IN', devMockSession))
      return { data: { user: devMockUser, session: devMockSession }, error: null }
    },
    signUp: async () => {
      // Notify subscribers of sign up
      authStateCallbacks.forEach((cb) => cb('SIGNED_IN', devMockSession))
      return { data: { user: devMockUser, session: devMockSession }, error: null }
    },
    signOut: async () => {
      // Notify subscribers of sign out
      authStateCallbacks.forEach((cb) => cb('SIGNED_OUT', null))
      return { error: null }
    },
    onAuthStateChange: (callback) => {
      authStateCallbacks.push(callback)
      // Immediately trigger with current session state
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
      data: { publicUrl: `https://mock-storage.example.com/${path}` },
    }),
    createSignedUrl: async (path: string) => ({
      data: { signedUrl: `https://mock-storage.example.com/signed/${path}?token=mock-token` },
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
      // Return table-specific mock data for realistic development experience
      switch (table) {
        case 'profiles':
          return createDevMockQueryBuilder([devMockProfile])
        case 'locations':
          return createDevMockQueryBuilder([devMockLocation])
        case 'posts':
          return createDevMockQueryBuilder([devMockPost])
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
    rpc: async () => ({ data: null, error: null }),
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
