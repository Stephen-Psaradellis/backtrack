/**
 * AuthContext Tests
 *
 * Tests the dual-context AuthProvider (AuthStateContext + ProfileContext),
 * session persistence, auth operations, profile operations, and all three hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React, { type ReactNode } from 'react'

// ============================================================================
// MOCK SETUP
// ============================================================================

// -- AsyncStorage mock --
const { mockGetItem, mockSetItem, mockRemoveItem } = vi.hoisted(() => ({
  mockGetItem: vi.fn(),
  mockSetItem: vi.fn(),
  mockRemoveItem: vi.fn(),
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}))

// -- Supabase mock --
// Using vi.hoisted so these are available inside vi.mock factory (which is hoisted)
const {
  mockSignUp,
  mockSignInWithPassword,
  mockSignOut,
  mockResetPasswordForEmail,
  mockUpdateUser,
  mockGetSession,
  mockUnsubscribe,
  mockSelect,
  mockEq,
  mockSingle,
  mockUpdate,
  getAuthStateCallback,
  setAuthStateCallback,
} = vi.hoisted(() => {
  let _authStateCallback: ((event: string, session: unknown) => void) | null = null
  return {
    mockSignUp: vi.fn(),
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockResetPasswordForEmail: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockGetSession: vi.fn(),
    mockUnsubscribe: vi.fn(),
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockSingle: vi.fn(),
    mockUpdate: vi.fn(),
    getAuthStateCallback: () => _authStateCallback,
    setAuthStateCallback: (cb: ((event: string, session: unknown) => void) | null) => { _authStateCallback = cb },
  }
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        setAuthStateCallback(cb)
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      },
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
    })),
  },
}))

// Import AFTER mocks are set up (vitest hoists vi.mock calls)
import { AuthProvider, useAuth, useAuthState, useProfile } from '../AuthContext'

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

function createMockSession(overrides: Record<string, unknown> = {}) {
  const user = createMockUser()
  return {
    access_token: 'access-token-abc',
    refresh_token: 'refresh-token-xyz',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user,
    ...overrides,
  }
}

function createMockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    display_name: 'Test User',
    avatar_url: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function setupSupabaseChain(profileData: unknown = null, profileError: unknown = null) {
  mockSingle.mockResolvedValue({ data: profileData, error: profileError })
  mockEq.mockReturnValue({ single: mockSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
}

function setupGetSession(session: unknown = null) {
  mockGetSession.mockResolvedValue({ data: { session } })
}

function setupUpdateChain(error: unknown = null) {
  const eqMock = vi.fn().mockResolvedValue({ error })
  mockUpdate.mockReturnValue({ eq: eqMock })
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// ============================================================================
// TESTS
// ============================================================================

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAuthStateCallback(null)

    // Default: no cached session, no active session, no profile
    mockGetItem.mockResolvedValue(null)
    setupGetSession(null)
    setupSupabaseChain(null, null)
  })

  // --------------------------------------------------------------------------
  // 1. Provider renders children
  // --------------------------------------------------------------------------

  describe('AuthProvider', () => {
    it('renders children and provides context', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current).toBeDefined()
      expect(result.current.session).toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // 2-3. useAuth() with and without session
  // --------------------------------------------------------------------------

  describe('useAuth()', () => {
    it('returns session and user when authenticated', async () => {
      const session = createMockSession()
      const profile = createMockProfile()
      setupGetSession(session)
      setupSupabaseChain(profile)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.session).toBeTruthy()
      expect(result.current.user).toBeTruthy()
      expect(result.current.user!.id).toBe('user-123')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('returns null session when not authenticated', async () => {
      setupGetSession(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.session).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // 4-7. Auth operations
  // --------------------------------------------------------------------------

  describe('Auth operations', () => {
    it('signIn calls supabase.auth.signInWithPassword', async () => {
      setupGetSession(null)
      mockSignInWithPassword.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        const res = await result.current.signIn('test@example.com', 'password123')
        expect(res.error).toBeNull()
      })

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('signUp calls supabase.auth.signUp', async () => {
      setupGetSession(null)
      mockSignUp.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        const res = await result.current.signUp('new@example.com', 'newpass123')
        expect(res.error).toBeNull()
      })

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpass123',
      })
    })

    it('signOut calls supabase.auth.signOut and clears state', async () => {
      const session = createMockSession()
      setupGetSession(session)
      setupSupabaseChain(createMockProfile())
      mockSignOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.session).toBeTruthy()
      })

      await act(async () => {
        const res = await result.current.signOut()
        expect(res.error).toBeNull()
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(result.current.session).toBeNull()
      expect(result.current.user).toBeNull()
    })

    it('resetPassword calls supabase.auth.resetPasswordForEmail', async () => {
      setupGetSession(null)
      mockResetPasswordForEmail.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        const res = await result.current.resetPassword('test@example.com')
        expect(res.error).toBeNull()
      })

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com')
    })
  })

  // --------------------------------------------------------------------------
  // 8. Auth state change listener
  // --------------------------------------------------------------------------

  describe('Auth state change listener', () => {
    it('updates state when auth state changes', async () => {
      setupGetSession(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.session).toBeNull()

      // Simulate auth state change (user signs in)
      const newSession = createMockSession()
      setupSupabaseChain(createMockProfile())

      await act(async () => {
        getAuthStateCallback()?.('SIGNED_IN', newSession)
      })

      await waitFor(() => {
        expect(result.current.session).toBeTruthy()
        expect(result.current.user?.id).toBe('user-123')
      })
    })
  })

  // --------------------------------------------------------------------------
  // 9-11. Profile operations
  // --------------------------------------------------------------------------

  describe('Profile operations', () => {
    it('useProfile() returns profile data after auth', async () => {
      const session = createMockSession()
      const profile = createMockProfile()
      setupGetSession(session)
      setupSupabaseChain(profile)

      const { result } = renderHook(() => useProfile(), { wrapper })

      await waitFor(() => {
        expect(result.current.profile).toBeTruthy()
      })

      expect(result.current.profile!.display_name).toBe('Test User')
    })

    it('refreshProfile fetches profile from supabase', async () => {
      const session = createMockSession()
      const profile = createMockProfile()
      setupGetSession(session)
      setupSupabaseChain(profile)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.profile).toBeTruthy()
      })

      // Setup updated profile for refresh
      const updatedProfile = createMockProfile({ display_name: 'Updated User' })
      setupSupabaseChain(updatedProfile)

      await act(async () => {
        await result.current.refreshProfile()
      })

      await waitFor(() => {
        expect(result.current.profile.display_name).toBe('Updated User')
      })
    })

    it('updateProfile calls supabase update', async () => {
      const session = createMockSession()
      const profile = createMockProfile()
      setupGetSession(session)
      setupSupabaseChain(profile)
      setupUpdateChain(null)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).toBeTruthy()
      })

      // Setup profile for the refresh that follows update
      setupSupabaseChain(createMockProfile({ display_name: 'New Name' }))

      await act(async () => {
        const res = await result.current.updateProfile({ display_name: 'New Name' })
        expect(res.error).toBeNull()
      })

      expect(mockUpdate).toHaveBeenCalledWith({ display_name: 'New Name' })
    })
  })

  // --------------------------------------------------------------------------
  // 12-13. Error states
  // --------------------------------------------------------------------------

  describe('Error states', () => {
    it('returns error on signIn failure', async () => {
      setupGetSession(null)
      const authError = { message: 'Invalid credentials', status: 400, name: 'AuthApiError' }
      mockSignInWithPassword.mockResolvedValue({ error: authError })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        const res = await result.current.signIn('bad@example.com', 'wrong')
        expect(res.error).toBeTruthy()
        expect(res.error!.message).toBe('Invalid credentials')
      })
    })

    it('returns error on signUp failure', async () => {
      setupGetSession(null)
      const authError = { message: 'Email already registered', status: 422, name: 'AuthApiError' }
      mockSignUp.mockResolvedValue({ error: authError })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        const res = await result.current.signUp('existing@example.com', 'pass123')
        expect(res.error).toBeTruthy()
        expect(res.error!.message).toBe('Email already registered')
      })
    })
  })

  // --------------------------------------------------------------------------
  // 14. Session restoration from AsyncStorage
  // --------------------------------------------------------------------------

  describe('Session restoration', () => {
    it('restores cached session from AsyncStorage on mount', async () => {
      const cachedSession = createMockSession()
      mockGetItem.mockResolvedValue(JSON.stringify(cachedSession))
      setupGetSession(cachedSession)
      setupSupabaseChain(createMockProfile())

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.session).toBeTruthy()
      })

      expect(mockGetItem).toHaveBeenCalledWith('@auth/cached_session')
      expect(result.current.user?.id).toBe('user-123')
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // 15. useAuthState() returns only auth state
  // --------------------------------------------------------------------------

  describe('useAuthState()', () => {
    it('returns only auth state without profile', async () => {
      const session = createMockSession()
      setupGetSession(session)
      setupSupabaseChain(createMockProfile())

      const { result } = renderHook(() => useAuthState(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Has auth state
      expect(result.current.session).toBeTruthy()
      expect(result.current.user).toBeTruthy()
      expect(result.current.userId).toBe('user-123')
      expect(result.current.isAuthenticated).toBe(true)

      // Does NOT have profile (that's on ProfileContext)
      expect((result.current as Record<string, unknown>).profile).toBeUndefined()
      expect((result.current as Record<string, unknown>).refreshProfile).toBeUndefined()
      expect((result.current as Record<string, unknown>).updateProfile).toBeUndefined()

      // Has auth operations
      expect(typeof result.current.signIn).toBe('function')
      expect(typeof result.current.signOut).toBe('function')
      expect(typeof result.current.signUp).toBe('function')
      expect(typeof result.current.resetPassword).toBe('function')
      expect(typeof result.current.updatePassword).toBe('function')
    })
  })
})
