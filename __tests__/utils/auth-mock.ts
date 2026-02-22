/**
 * Auth Context Mock
 *
 * Reusable mock for AuthContext in tests.
 */

import type { Session, User, AuthError } from '@supabase/supabase-js'
import type { Profile, ProfileUpdate } from '../../types/database'
import { createMockProfile } from './factories'

// ============================================================================
// TYPES (matching AuthContext interface)
// ============================================================================

export interface AuthContextType {
  /** Supabase session object (if authenticated) */
  session: Session | null
  /** Supabase user object (if authenticated) */
  user: User | null
  /** Current user ID (null if not authenticated) */
  userId: string | null
  /** User profile data (null if not loaded or not authenticated) */
  profile: Profile | null
  /** Whether user is authenticated */
  isAuthenticated: boolean
  /** Whether auth state is still loading */
  isLoading: boolean

  // Auth operations
  /** Sign up with email and password */
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  /** Sign out the current user */
  signOut: () => Promise<{ error: AuthError | null }>
  /** Send password reset email */
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  /** Update password (when user is logged in) */
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>

  // Profile operations
  /** Refresh the user's profile from the database */
  refreshProfile: () => Promise<void>
  /** Update the user's profile */
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: Error | null }>
}

// ============================================================================
// MOCK AUTH CONTEXT
// ============================================================================

/**
 * Create a mock AuthContext value for testing
 *
 * @param overrides - Partial overrides for the auth context
 * @returns Mock AuthContext value
 */
export function createMockAuthContext(overrides?: Partial<AuthContextType>): AuthContextType {
  // Create a default authenticated user
  const defaultUserId = '00000000-0000-0000-0000-000000000001'
  const defaultProfile = createMockProfile({ id: defaultUserId })

  const defaultUser: User = {
    id: defaultUserId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const defaultSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: defaultUser,
  }

  const baseContext: AuthContextType = {
    session: defaultSession,
    user: defaultUser,
    userId: defaultUserId,
    profile: defaultProfile,
    isAuthenticated: true,
    isLoading: false,

    // Auth operations (no-op by default)
    signUp: async () => ({ error: null }),
    signIn: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    resetPassword: async () => ({ error: null }),
    updatePassword: async () => ({ error: null }),

    // Profile operations (no-op by default)
    refreshProfile: async () => {},
    updateProfile: async () => ({ error: null }),
  }

  return {
    ...baseContext,
    ...overrides,
  }
}

/**
 * Create a mock unauthenticated AuthContext value
 */
export function createMockUnauthenticatedAuthContext(
  overrides?: Partial<AuthContextType>
): AuthContextType {
  return createMockAuthContext({
    session: null,
    user: null,
    userId: null,
    profile: null,
    isAuthenticated: false,
    isLoading: false,
    ...overrides,
  })
}

/**
 * Create a mock loading AuthContext value
 */
export function createMockLoadingAuthContext(
  overrides?: Partial<AuthContextType>
): AuthContextType {
  return createMockAuthContext({
    session: null,
    user: null,
    userId: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
    ...overrides,
  })
}
