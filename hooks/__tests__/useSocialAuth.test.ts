/**
 * Tests for useSocialAuth Hook
 *
 * Tests social authentication flows for Apple and Google sign-in.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import { useSocialAuth } from '../useSocialAuth'
import { supabase } from '../../lib/supabase'
import { vi } from 'vitest'

// Use vi.hoisted to create the Platform mock before vi.mock hoisting runs
const mockPlatform = vi.hoisted(() => ({
  OS: 'ios' as string,
  Version: '17.0',
  isPad: false,
  isTVOS: false,
  isTV: false,
  select: (obj: Record<string, unknown>) => obj[(mockPlatform as any).OS] ?? obj['default'],
}))

// Mock react to include Platform (source imports Platform from 'react' instead of 'react-native')
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    Platform: mockPlatform,
  }
})

// Mock dependencies
vi.mock('expo-apple-authentication', () => ({
  signInAsync: vi.fn(),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
}))
vi.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: vi.fn(() => [null, null, vi.fn()]),
}))
vi.mock('expo-auth-session', () => ({
  makeRedirectUri: vi.fn(() => 'com.backtrack.app:/oauthredirect'),
}))
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('useSocialAuth', () => {
  // Get mock reference
  const mockUseAuthRequest = (Google.useAuthRequest as any)

  beforeEach(() => {
    vi.clearAllMocks()
    // Restore default useAuthRequest return value after clearAllMocks
    mockUseAuthRequest.mockReturnValue([null, null, vi.fn()])
  })

  describe('Platform availability', () => {
    it('should indicate Apple Sign In is available on iOS', () => {
      mockPlatform.OS = 'ios'
      const { result } = renderHook(() => useSocialAuth())

      expect(result.current.isAppleAvailable).toBe(true)
    })

    it('should indicate Apple Sign In is not available on Android', () => {
      mockPlatform.OS = 'android'
      const { result } = renderHook(() => useSocialAuth())

      expect(result.current.isAppleAvailable).toBe(false)
    })
  })

  describe('signInWithApple', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios'
    })

    it('should successfully sign in with Apple', async () => {
      const mockCredential = {
        identityToken: 'mock-identity-token',
        nonce: 'mock-nonce',
      }

      const mockAuthData = {
        user: { id: 'user-123' },
        session: { access_token: 'token' },
      }

      ;(AppleAuthentication.signInAsync as any).mockResolvedValue(mockCredential)
      ;(supabase.auth.signInWithIdToken as any).mockResolvedValue({
        data: mockAuthData,
        error: null,
      })

      // Mock profile check and creation
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }))
      ;(supabase.from as any).mockImplementation(mockFrom)
      ;(supabase.auth.getUser as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            user_metadata: { full_name: 'John Doe' },
          },
        },
      })

      const { result } = renderHook(() => useSocialAuth())

      let authResult
      await act(async () => {
        authResult = await result.current.signInWithApple()
      })

      expect(authResult).toEqual({
        success: true,
        error: null,
      })
      expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'apple',
        token: 'mock-identity-token',
        nonce: 'mock-nonce',
      })
    })

    it('should handle Apple sign in cancellation', async () => {
      const cancelError = new Error('User cancelled')
      ;(AppleAuthentication.signInAsync as any).mockRejectedValue(cancelError)

      const { result } = renderHook(() => useSocialAuth())

      let authResult
      await act(async () => {
        authResult = await result.current.signInWithApple()
      })

      expect(authResult).toEqual({
        success: false,
        error: 'Sign in was cancelled. Please try again.',
      })
    })

    it('should fail on Android', async () => {
      mockPlatform.OS = 'android'
      const { result } = renderHook(() => useSocialAuth())

      let authResult
      await act(async () => {
        authResult = await result.current.signInWithApple()
      })

      expect(authResult).toEqual({
        success: false,
        error: 'Apple Sign In is only available on iOS devices.',
      })
    })
  })

  describe('signInWithGoogle', () => {
    const mockUseAuthRequest = Google.useAuthRequest as any
    const mockPromptAsync = vi.fn()

    beforeEach(() => {
      mockUseAuthRequest.mockReturnValue([
        null,
        null,
        mockPromptAsync,
      ] as any)
    })

    it('should successfully sign in with Google', async () => {
      const mockGoogleResponse = {
        type: 'success',
        params: {
          id_token: 'mock-google-id-token',
        },
      }

      const mockAuthData = {
        user: { id: 'user-456' },
        session: { access_token: 'token' },
      }

      mockPromptAsync.mockResolvedValue(mockGoogleResponse)
      ;(supabase.auth.signInWithIdToken as any).mockResolvedValue({
        data: mockAuthData,
        error: null,
      })

      // Mock profile check and creation
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }))
      ;(supabase.from as any).mockImplementation(mockFrom)
      ;(supabase.auth.getUser as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-456',
            user_metadata: { name: 'Jane Smith' },
          },
        },
      })

      const { result } = renderHook(() => useSocialAuth())

      let authResult
      await act(async () => {
        authResult = await result.current.signInWithGoogle()
      })

      await waitFor(() => {
        expect(authResult).toEqual({
          success: true,
          error: null,
        })
      })

      expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: 'mock-google-id-token',
      })
    })

    it('should handle Google sign in cancellation', async () => {
      const mockGoogleResponse = {
        type: 'cancel',
      }

      mockPromptAsync.mockResolvedValue(mockGoogleResponse)

      const { result } = renderHook(() => useSocialAuth())

      let authResult
      await act(async () => {
        authResult = await result.current.signInWithGoogle()
      })

      expect(authResult).toEqual({
        success: false,
        error: 'Sign in was cancelled. Please try again.',
      })
    })

    it('should handle missing ID token', async () => {
      const mockGoogleResponse = {
        type: 'success',
        params: {}, // No id_token
      }

      mockPromptAsync.mockResolvedValue(mockGoogleResponse)

      const { result } = renderHook(() => useSocialAuth())

      let authResult
      await act(async () => {
        authResult = await result.current.signInWithGoogle()
      })

      expect(authResult).toEqual({
        success: false,
        error: 'Failed to get authentication token from Google.',
      })
    })
  })

  describe('Loading states', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios'
    })

    it('should set loading state during Apple sign in', async () => {
      ;(AppleAuthentication.signInAsync as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      const { result } = renderHook(() => useSocialAuth())

      expect(result.current.appleLoading).toBe(false)

      act(() => {
        result.current.signInWithApple()
      })

      await waitFor(() => {
        expect(result.current.appleLoading).toBe(true)
      })
    })

    it('should clear loading state after Apple sign in completes', async () => {
      const mockCredential = {
        identityToken: 'token',
        nonce: 'nonce',
      }
      ;(AppleAuthentication.signInAsync as any).mockResolvedValue(mockCredential)
      ;(supabase.auth.signInWithIdToken as any).mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      })

      // Mock profile
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: '123' }, error: null })),
          })),
        })),
      }))
      ;(supabase.from as any).mockImplementation(mockFrom)

      const { result } = renderHook(() => useSocialAuth())

      await act(async () => {
        await result.current.signInWithApple()
      })

      expect(result.current.appleLoading).toBe(false)
    })
  })
})
