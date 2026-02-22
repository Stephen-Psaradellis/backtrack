/**
 * Test Render Utilities
 *
 * Custom render function that wraps components with all required providers.
 * Use this instead of @testing-library/react-native's render() for component tests.
 */

import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthStateContext, ProfileContext } from '../../contexts/AuthContext'
import { ToastProvider } from '../../contexts/ToastContext'
import { ThemeProvider } from '../../contexts/ThemeContext'
import type { AuthContextType } from './auth-mock'
import { createMockAuthContext } from './auth-mock'

// ============================================================================
// TYPES
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Mock auth context value (defaults to authenticated user) */
  authContext?: Partial<AuthContextType>
  /** Custom QueryClient (defaults to new instance) */
  queryClient?: QueryClient
  /** Initial safe area insets */
  initialSafeAreaInsets?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
}

// ============================================================================
// RENDER WITH PROVIDERS
// ============================================================================

/**
 * Render a component wrapped with all required providers for testing
 *
 * @param ui - React element to render
 * @param options - Render options including auth context overrides
 * @returns Render result with all testing-library utilities
 *
 * @example
 * ```tsx
 * import { renderWithProviders } from '__tests__/utils'
 *
 * // Render with default authenticated user
 * const { getByText } = renderWithProviders(<MyComponent />)
 *
 * // Render with custom auth context
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   authContext: { isAuthenticated: false }
 * })
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> {
  const {
    authContext: authContextOverrides,
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    initialSafeAreaInsets = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    ...renderOptions
  } = options

  // Create mock auth context
  const authContextValue = createMockAuthContext(authContextOverrides)

  // Split auth context into auth state and profile
  const authStateValue = {
    session: authContextValue.session,
    user: authContextValue.user,
    userId: authContextValue.userId,
    isAuthenticated: authContextValue.isAuthenticated,
    isLoading: authContextValue.isLoading,
    signUp: authContextValue.signUp,
    signIn: authContextValue.signIn,
    signOut: authContextValue.signOut,
    resetPassword: authContextValue.resetPassword,
    updatePassword: authContextValue.updatePassword,
  }

  const profileValue = {
    profile: authContextValue.profile,
    refreshProfile: authContextValue.refreshProfile,
    updateProfile: authContextValue.updateProfile,
  }

  // Create wrapper with all providers
  function Wrapper({ children }: { children: React.ReactNode }): ReactElement {
    return (
      <SafeAreaProvider initialMetrics={{ insets: initialSafeAreaInsets, frame: { x: 0, y: 0, width: 375, height: 812 } }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <AuthStateContext.Provider value={authStateValue}>
              <ProfileContext.Provider value={profileValue}>
                <QueryClientProvider client={queryClient}>
                  <ToastProvider>{children}</ToastProvider>
                </QueryClientProvider>
              </ProfileContext.Provider>
            </AuthStateContext.Provider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Render a component with unauthenticated user
 *
 * @param ui - React element to render
 * @param options - Render options
 * @returns Render result with all testing-library utilities
 */
export function renderWithUnauthenticatedUser(
  ui: ReactElement,
  options?: Omit<CustomRenderOptions, 'authContext'>
): ReturnType<typeof render> {
  return renderWithProviders(ui, {
    ...options,
    authContext: {
      session: null,
      user: null,
      userId: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    },
  })
}

/**
 * Render a component with loading auth state
 *
 * @param ui - React element to render
 * @param options - Render options
 * @returns Render result with all testing-library utilities
 */
export function renderWithLoadingAuth(
  ui: ReactElement,
  options?: Omit<CustomRenderOptions, 'authContext'>
): ReturnType<typeof render> {
  return renderWithProviders(ui, {
    ...options,
    authContext: {
      session: null,
      user: null,
      userId: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,
    },
  })
}
