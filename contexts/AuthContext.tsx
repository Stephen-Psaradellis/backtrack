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

import { supabase } from '../lib/supabase'
import type { Profile, ProfileUpdate, AuthState } from '../lib/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Auth context value interface
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
 * Default context value (used when accessed outside provider)
 */
const defaultContextValue: AuthContextValue = {
  // AuthState
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  profile: null,

  // Session/User
  session: null,
  user: null,

  // Auth operations (no-op defaults)
  signUp: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  signIn: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  signOut: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  resetPassword: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),
  updatePassword: async () => ({ error: new Error('AuthProvider not mounted') as unknown as AuthError }),

  // Profile operations (no-op defaults)
  refreshProfile: async () => {},
  updateProfile: async () => ({ error: new Error('AuthProvider not mounted') }),
}

const AuthContext = createContext<AuthContextValue>(defaultContextValue)

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
   * Fetch user profile from the database
   */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // Profile might not exist yet (will be created by trigger on first access)
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data as Profile
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
    // Get initial session with timeout and retry logic for emulator latency
    const initializeAuth = async () => {
      const MAX_RETRIES = 3
      const TIMEOUT_MS = 15000 // 15 seconds per attempt

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth initialization timeout')), TIMEOUT_MS)
          )

          const { data: { session: initialSession } } = await Promise.race([
            sessionPromise,
            timeoutPromise,
          ]) as Awaited<typeof sessionPromise>

          if (initialSession) {
            setSession(initialSession)
            setUser(initialSession.user)

            // Fetch profile for authenticated user
            try {
              const profileData = await fetchProfile(initialSession.user.id)
              setProfile(profileData)
            } catch {
              // Error fetching profile - continue without it
            }
          }
          // Success - exit retry loop
          setIsLoading(false)
          return
        } catch (error) {
          console.warn(`Auth initialization attempt ${attempt}/${MAX_RETRIES} failed:`, error)
          if (attempt === MAX_RETRIES) {
            // All retries exhausted - proceed without session
            console.warn('Auth initialization failed after all retries')
          }
          // Wait briefly before retry (exponential backoff)
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          }
        }
      }
      setIsLoading(false)
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        // Fetch profile when user signs in
        try {
          const profileData = await fetchProfile(newSession.user.id)
          setProfile(profileData)
        } catch {
          // Error fetching profile - continue without it
        }
      } else {
        // Clear profile when user signs out
        setProfile(null)
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
          // Token was refreshed
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
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      // AuthState
      isLoading,
      isAuthenticated: !!session,
      userId: user?.id ?? null,
      profile,

      // Session/User
      session,
      user,

      // Auth operations
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,

      // Profile operations
      refreshProfile,
      updateProfile,
    }),
    [
      isLoading,
      session,
      user,
      profile,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
      updateProfile,
    ]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useAuth hook
 *
 * Access the auth context from any component within an AuthProvider.
 *
 * @throws Error if used outside of an AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, signOut } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <LoginScreen />
 *   }
 *
 *   return (
 *     <View>
 *       <Text>Welcome, {user?.email}</Text>
 *       <Button title="Sign Out" onPress={signOut} />
 *     </View>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AuthContext }
export type { AuthContextValue, AuthProviderProps }
