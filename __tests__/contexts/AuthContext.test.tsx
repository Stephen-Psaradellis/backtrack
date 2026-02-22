/**
 * @vitest-environment jsdom
 */

/**
 * Unit tests for AuthContext
 *
 * Tests authentication flow including:
 * - Sign up, sign in, sign out
 * - Password reset and update
 * - Profile loading and updating
 * - Auth state listener behavior
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// ============================================================================
// Hoisted Mocks
// ============================================================================

const {
  mockSignUp,
  mockSignInWithPassword,
  mockSignOut,
  mockResetPasswordForEmail,
  mockUpdateUser,
  mockGetSession,
  mockOnAuthStateChange,
  mockFrom,
  mockSelect,
  mockUpdate,
  mockEq,
  mockSingle,
} = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
  mockSingle: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (opts: unknown) => mockSignUp(opts),
      signInWithPassword: (opts: unknown) => mockSignInWithPassword(opts),
      signOut: () => mockSignOut(),
      resetPasswordForEmail: (email: string) => mockResetPasswordForEmail(email),
      updateUser: (opts: unknown) => mockUpdateUser(opts),
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
    },
    from: (table: string) => {
      mockFrom(table)
      return {
        select: (fields: string) => {
          mockSelect(fields)
          return {
            eq: (col: string, val: string) => {
              mockEq(col, val)
              return {
                single: () => mockSingle(),
              }
            },
          }
        },
        update: (data: unknown) => {
          mockUpdate(data)
          return {
            eq: (col: string, val: string) => {
              mockEq(col, val)
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  },
}))

// Import after mocks
import { AuthProvider, useAuth } from '../../contexts/AuthContext'

// ============================================================================
// Test Helpers
// ============================================================================

const TEST_USER = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2024-01-01T00:00:00Z',
}

const TEST_SESSION = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: TEST_USER,
}

const TEST_PROFILE = {
  id: 'user-123',
  username: 'testuser',
  display_name: 'Test User',
  avatar: null,
  bio: 'Test bio',
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

// ============================================================================
// Tests
// ============================================================================

describe('AuthContext', () => {
  let authStateCallback: ((event: string, session: unknown) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    authStateCallback = null

    // Default: no session
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    // Capture the auth state change callback
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authStateCallback = cb
      return {
        data: {
          subscription: { unsubscribe: vi.fn() },
        },
      }
    })

    // Default profile fetch returns nothing
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    })
  })

  // --------------------------------------------------------------------------
  // Initial State
  // --------------------------------------------------------------------------

  describe('initial state', () => {
    it('should start with loading true', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      expect(result.current.isLoading).toBe(true)
    })

    it('should resolve to unauthenticated when no session', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    it('should resolve to authenticated when session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: TEST_SESSION },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: TEST_PROFILE,
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(TEST_USER)
      expect(result.current.userId).toBe('user-123')
      expect(result.current.profile).toEqual(TEST_PROFILE)
    })

    it('should handle session fetch timeout gracefully', async () => {
      mockGetSession.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false)
        },
        { timeout: 60000 }
      )

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // Sign Up
  // --------------------------------------------------------------------------

  describe('signUp', () => {
    it('should call supabase.auth.signUp with email and password', async () => {
      mockSignUp.mockResolvedValue({ data: {}, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let signUpResult: { error: unknown }
      await act(async () => {
        signUpResult = await result.current.signUp('new@example.com', 'Password123!')
      })

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'Password123!',
      })
      expect(signUpResult!.error).toBeNull()
    })

    it('should return error on sign up failure', async () => {
      const mockError = { message: 'Email already registered', status: 422 }
      mockSignUp.mockResolvedValue({ data: {}, error: mockError })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let signUpResult: { error: unknown }
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'Password123!')
      })

      expect(signUpResult!.error).toEqual(mockError)
    })
  })

  // --------------------------------------------------------------------------
  // Sign In
  // --------------------------------------------------------------------------

  describe('signIn', () => {
    it('should call supabase.auth.signInWithPassword', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let signInResult: { error: unknown }
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'Password123!')
      })

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      })
      expect(signInResult!.error).toBeNull()
    })

    it('should return error on invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials', status: 400 }
      mockSignInWithPassword.mockResolvedValue({ data: {}, error: mockError })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let signInResult: { error: unknown }
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong')
      })

      expect(signInResult!.error).toEqual(mockError)
    })
  })

  // --------------------------------------------------------------------------
  // Sign Out
  // --------------------------------------------------------------------------

  describe('signOut', () => {
    it('should call supabase.auth.signOut and clear state', async () => {
      // Start authenticated
      mockGetSession.mockResolvedValue({
        data: { session: TEST_SESSION },
        error: null,
      })
      mockSingle.mockResolvedValue({ data: TEST_PROFILE, error: null })
      mockSignOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSignOut).toHaveBeenCalled()
      expect(result.current.session).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })

    it('should not clear state on sign out error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: TEST_SESSION },
        error: null,
      })
      mockSingle.mockResolvedValue({ data: TEST_PROFILE, error: null })
      mockSignOut.mockResolvedValue({ error: { message: 'Network error' } })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.signOut()
      })

      // State should NOT be cleared because error occurred
      expect(result.current.session).not.toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // Password Reset
  // --------------------------------------------------------------------------

  describe('resetPassword', () => {
    it('should call supabase.auth.resetPasswordForEmail', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let resetResult: { error: unknown }
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com')
      })

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com')
      expect(resetResult!.error).toBeNull()
    })

    it('should return error for invalid email', async () => {
      const mockError = { message: 'User not found', status: 404 }
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: mockError })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let resetResult: { error: unknown }
      await act(async () => {
        resetResult = await result.current.resetPassword('nonexistent@example.com')
      })

      expect(resetResult!.error).toEqual(mockError)
    })
  })

  // --------------------------------------------------------------------------
  // Update Password
  // --------------------------------------------------------------------------

  describe('updatePassword', () => {
    it('should call supabase.auth.updateUser with new password', async () => {
      mockUpdateUser.mockResolvedValue({ data: {}, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let updateResult: { error: unknown }
      await act(async () => {
        updateResult = await result.current.updatePassword('NewPassword123!')
      })

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPassword123!' })
      expect(updateResult!.error).toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // Profile Operations
  // --------------------------------------------------------------------------

  describe('updateProfile', () => {
    it('should return error when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let updateResult: { error: Error | null }
      await act(async () => {
        updateResult = await result.current.updateProfile({ display_name: 'New Name' })
      })

      expect(updateResult!.error).toBeInstanceOf(Error)
      expect(updateResult!.error!.message).toBe('Not authenticated')
    })

    it('should update profile when authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: TEST_SESSION },
        error: null,
      })
      mockSingle.mockResolvedValue({ data: TEST_PROFILE, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.updateProfile({ display_name: 'Updated Name' })
      })

      expect(mockUpdate).toHaveBeenCalledWith({ display_name: 'Updated Name' })
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123')
    })
  })

  // --------------------------------------------------------------------------
  // Auth State Change Listener
  // --------------------------------------------------------------------------

  describe('auth state changes', () => {
    it('should set up auth state listener on mount', async () => {
      renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled()
      })
    })

    it('should update state when user signs in via listener', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)

      // Simulate auth state change from Supabase
      await act(async () => {
        if (authStateCallback) {
          await authStateCallback('SIGNED_IN', TEST_SESSION)
        }
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(TEST_USER)
    })

    it('should clear state when user signs out via listener', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: TEST_SESSION },
        error: null,
      })
      mockSingle.mockResolvedValue({ data: TEST_PROFILE, error: null })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        if (authStateCallback) {
          await authStateCallback('SIGNED_OUT', null)
        }
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.profile).toBeNull()
    })

    it('should unsubscribe on unmount', async () => {
      const mockUnsubscribe = vi.fn()
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: { unsubscribe: mockUnsubscribe },
        },
      })

      const { unmount } = renderHook(() => useAuth(), { wrapper })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
