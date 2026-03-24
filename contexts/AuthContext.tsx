/**
 * AuthContext
 *
 * Provides authentication state management throughout the app.
 * Uses Supabase Auth for authentication and manages user profile data.
 *
 * Features:
 * - Session persistence via AsyncStorage
 * - Automatic auth state listening
 * - User profile loading and updates
 * - Sign up, sign in, sign out operations
 * - Password reset functionality
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { type Session, type User, type AuthError } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

import { supabase } from '../lib/supabase'
import type { Profile, ProfileUpdate, AuthState } from '../lib/types'

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHED_SESSION_KEY = '@auth/cached_session'
const SESSION_TIMEOUT_MS = 5000 // 5s max for session fetch
const PROFILE_TIMEOUT_MS = 5000 // 5s max for profile fetch

// ============================================================================
// TYPES
// ============================================================================

/**
 * Auth state context value (session and auth operations)
 * Separated from profile to prevent unnecessary re-renders
 */
interface AuthStateContextValue {
  /** Supabase session object (if authenticated) */
  session: Session | null
  /** Supabase user object (if authenticated) */
  user: User | null
  /** Current user ID (null if not authenticated) */
  userId: string | null
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
}

/**
 * Profile context value (user profile data)
 * Separated from auth state to prevent unnecessary re-renders
 */
interface ProfileContextValue {
  /** User profile data (null if not loaded or not authenticated) */
  profile: Profile | null
  /** Refresh the user's profile from the database */
  refreshProfile: () => Promise<void>
  /** Update the user's profile */
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: Error | null }>
}

/**
 * Combined auth context value interface (backward compatible)
 */
interface AuthContextValue extends AuthState {
  /** Supabase session object (if authenticated) */
  session: Session | null
  /** Supabase user object (if authenticated) */
  user: User | null

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
// CONTEXT
// ============================================================================

/**
 * Default auth state context value (used when accessed outside provider)
 */
const defaultAuthStateValue: AuthStateContextValue = {
  session: null,
  user: null,
  userId: null,
  isAuthenticated: false,
  isLoading: true,

  // Auth operations (no-op defaults)
  signUp: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  signIn: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  signOut: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  resetPassword: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  updatePassword: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
}

/**
 * Default profile context value (used when accessed outside provider)
 */
const defaultProfileValue: ProfileContextValue = {
  profile: null,
  refreshProfile: async () => {},
  updateProfile: async () => ({ error: new Error('AuthProvider not mounted') }),
}

/**
 * Internal auth state context (session, user, auth operations)
 * Components can use useAuthState() to subscribe only to auth changes
 */
const AuthStateContext = createContext<AuthStateContextValue>(defaultAuthStateValue)

/**
 * Internal profile context (profile data and operations)
 * Components can use useProfile() to subscribe only to profile changes
 */
const ProfileContext = createContext<ProfileContextValue>(defaultProfileValue)

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode
}

/**
 * AuthProvider component
 *
 * Wraps the application and provides authentication context to all children.
 * Must be placed near the root of the component tree.
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ---------------------------------------------------------------------------
  // PROFILE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Fetch user profile from the database with timeout
   */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), PROFILE_TIMEOUT_MS)
    )

    try {
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as Awaited<typeof profilePromise>

      if (error) {
        // Profile might not exist yet (will be created by trigger on first access)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as Profile
    } catch (error) {
      if (__DEV__) {
        console.log('[AuthContext] Profile fetch failed:', error)
      }
      return null
    }
  }, [])

  /**
   * Refresh the user's profile from the database
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!user) {
      setProfile(null)
      return
    }

    try {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    } catch {
      // Error fetching profile - keep current state
    }
  }, [user, fetchProfile])

  /**
   * Update the user's profile
   */
  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<{ error: Error | null }> => {
      if (!user) {
        return { error: new Error('Not authenticated') }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        return { error: new Error(error.message) }
      }

      // Refresh profile to get updated data
      await refreshProfile()

      return { error: null }
    },
    [user, refreshProfile]
  )

  // ---------------------------------------------------------------------------
  // AUTH OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      return { error }
    },
    []
  )

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { error }
    },
    []
  )

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut()

    if (!error) {
      // Clear local state immediately
      setSession(null)
      setUser(null)
      setProfile(null)
    }

    return { error }
  }, [])

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(
    async (email: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)

      return { error }
    },
    []
  )

  /**
   * Update password (when user is logged in)
   */
  const updatePassword = useCallback(
    async (newPassword: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      return { error }
    },
    []
  )

  // ---------------------------------------------------------------------------
  // AUTH STATE LISTENER
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Initialize auth with optimized loading strategy
    const initializeAuth = async () => {
      try {
        // STEP 1: Check AsyncStorage cache first (instant, no network)
        let cachedSession: Session | null = null
        try {
          const cachedData = await SecureStore.getItemAsync(CACHED_SESSION_KEY)
          if (cachedData) {
            cachedSession = JSON.parse(cachedData) as Session

            // Validate cached session isn't expired
            const expiresAt = cachedSession.expires_at
            if (expiresAt && expiresAt * 1000 > Date.now()) {
              // Use cached session immediately for fast startup
              setSession(cachedSession)
              setUser(cachedSession.user)
              setIsLoading(false) // Early return - auth state ready!

              if (__DEV__) {
                console.log('[AuthContext] Using cached session for fast startup')
              }
            } else {
              cachedSession = null // Expired
            }
          }
        } catch {
          // Cache read failed - continue to network fetch
        }

        // STEP 2: Fetch fresh session from Supabase with timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), SESSION_TIMEOUT_MS)
        )

        try {
          const { data: { session: freshSession } } = await Promise.race([
            sessionPromise,
            timeoutPromise,
          ]) as Awaited<typeof sessionPromise>

          // STEP 3: Update state with fresh session (if different from cache)
          if (freshSession) {
            setSession(freshSession)
            setUser(freshSession.user)

            // Cache the fresh session for next startup
            try {
              await SecureStore.setItemAsync(CACHED_SESSION_KEY, JSON.stringify(freshSession))
            } catch {
              // Cache write failed - non-critical
            }

            // STEP 4: Mark loading as complete IMMEDIATELY (don't wait for profile)
            setIsLoading(false)

            // STEP 5: Fetch profile in background (deferred, non-blocking)
            // This runs async without blocking the UI
            fetchProfile(freshSession.user.id).then(profileData => {
              setProfile(profileData)
            }).catch(() => {
              // Error fetching profile - app still works without it
            })
          } else {
            // No session - user is logged out
            setIsLoading(false)

            // Clear cached session
            try {
              await SecureStore.deleteItemAsync(CACHED_SESSION_KEY)
            } catch {
              // Cache clear failed - non-critical
            }
          }
        } catch (error) {
          // Session fetch failed or timed out
          if (__DEV__) {
            console.log('[AuthContext] Session fetch failed:', error)
          }

          // If we have a cached session, keep using it
          if (!cachedSession) {
            setIsLoading(false)
          }
          // else: already set from cache, keep isLoading=false
        }
      } catch (error) {
        // Catastrophic error - mark as not loading
        if (__DEV__) {
          console.error('[AuthContext] Auth initialization failed:', error)
        }
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        // Cache the new session
        try {
          await SecureStore.setItemAsync(CACHED_SESSION_KEY, JSON.stringify(newSession))
        } catch {
          // Cache write failed - non-critical
        }

        // Fetch profile in background (non-blocking)
        fetchProfile(newSession.user.id).then(profileData => {
          setProfile(profileData)
        }).catch(() => {
          // Error fetching profile - continue without it
        })
      } else {
        // Clear profile and cache when user signs out
        setProfile(null)
        try {
          await SecureStore.deleteItemAsync(CACHED_SESSION_KEY)
        } catch {
          // Cache clear failed - non-critical
        }
      }

      // Handle specific auth events if needed
      switch (event) {
        case 'SIGNED_IN':
          // User signed in
          break
        case 'SIGNED_OUT':
          // User signed out
          setProfile(null)
          break
        case 'TOKEN_REFRESHED':
          // Token was refreshed - update cache
          if (newSession) {
            try {
              await SecureStore.setItemAsync(CACHED_SESSION_KEY, JSON.stringify(newSession))
            } catch {
              // Cache write failed - non-critical
            }
          }
          break
        case 'USER_UPDATED':
          // User data was updated
          break
        case 'PASSWORD_RECOVERY':
          // Password recovery flow initiated
          break
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ---------------------------------------------------------------------------
  // CONTEXT VALUES
  // ---------------------------------------------------------------------------

  // Auth state context value (session, user, auth operations)
  const authStateValue = useMemo<AuthStateContextValue>(
    () => ({
      session,
      user,
      userId: user?.id ?? null,
      isAuthenticated: !!session,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      session,
      user,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    ]
  )

  // Profile context value (profile data and operations)
  const profileValue = useMemo<ProfileContextValue>(
    () => ({
      profile,
      refreshProfile,
      updateProfile,
    }),
    [profile, refreshProfile, updateProfile]
  )

  return (
    <AuthStateContext.Provider value={authStateValue}>
      <ProfileContext.Provider value={profileValue}>
        {children}
      </ProfileContext.Provider>
    </AuthStateContext.Provider>
  )
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useAuth hook (backward compatible)
 *
 * Access the combined auth context from any component within an AuthProvider.
 * Returns both auth state and profile data.
 *
 * For better performance, consider using:
 * - useAuthState() if you only need auth state (session, user, auth operations)
 * - useProfile() if you only need profile data
 *
 * @throws Error if used outside of an AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, profile, signOut } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <LoginScreen />
 *   }
 *
 *   return (
 *     <View>
 *       <Text>Welcome, {profile?.display_name || user?.email}</Text>
 *       <Button title="Sign Out" onPress={signOut} />
 *     </View>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const authState = useContext(AuthStateContext)
  const profileContext = useContext(ProfileContext)

  // Combine both contexts for backward compatibility
  return useMemo(
    () => ({
      ...authState,
      ...profileContext,
    }),
    [authState, profileContext]
  )
}

/**
 * useAuthState hook (granular subscription)
 *
 * Access only auth state (session, user, auth operations).
 * Use this instead of useAuth() when you don't need profile data.
 * This prevents re-renders when profile changes.
 *
 * @throws Error if used outside of an AuthProvider
 *
 * @example
 * ```tsx
 * function AuthGuard({ children }) {
 *   const { isAuthenticated, isLoading } = useAuthState()
 *
 *   if (isLoading) {
 *     return <LoadingScreen />
 *   }
 *
 *   if (!isAuthenticated) {
 *     return <LoginScreen />
 *   }
 *
 *   return children
 * }
 * ```
 */
export function useAuthState(): AuthStateContextValue {
  const context = useContext(AuthStateContext)

  if (context === defaultAuthStateValue) {
    throw new Error('useAuthState must be used within an AuthProvider')
  }

  return context
}

/**
 * useProfile hook (granular subscription)
 *
 * Access only profile data and operations.
 * Use this instead of useAuth() when you don't need auth state.
 * This prevents re-renders when auth state changes (e.g., token refresh).
 *
 * @throws Error if used outside of an AuthProvider
 *
 * @example
 * ```tsx
 * function ProfileDisplay() {
 *   const { profile, updateProfile } = useProfile()
 *
 *   if (!profile) {
 *     return <Text>No profile data</Text>
 *   }
 *
 *   return (
 *     <View>
 *       <Text>{profile.display_name}</Text>
 *       <Button
 *         title="Update"
 *         onPress={() => updateProfile({ display_name: 'New Name' })}
 *       />
 *     </View>
 *   )
 * }
 * ```
 */
export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext)

  if (context === defaultProfileValue) {
    throw new Error('useProfile must be used within an AuthProvider')
  }

  return context
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AuthStateContext, ProfileContext }
export type {
  AuthContextValue,
  AuthStateContextValue,
  ProfileContextValue,
  AuthProviderProps,
}
