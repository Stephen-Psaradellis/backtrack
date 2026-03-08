/**
 * Backtrack
 *
 * Location-Based Anonymous Matchmaking Mobile App
 *
 * This is the root component that sets up:
 * - Gesture Handler (required by React Navigation)
 * - Safe Area Context (for proper screen layout)
 * - Error Boundary (for catching and handling errors gracefully)
 * - Authentication Provider (for global auth state)
 * - Push Notification Handler (for receiving notifications)
 * - Navigation Container with app navigator
 */

// IMPORTANT: gesture-handler must be imported at the very top
import 'react-native-gesture-handler'

import React, { useEffect, useRef, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './hooks/useQueryConfig'
import { initSentry, setUserContext, wrapWithSentry } from './lib/sentry'
import { initializeAnalytics, flushAnalytics, resetAnalytics } from './lib/analytics'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, LogBox, AppState, AppStateStatus, Platform } from 'react-native'
import * as NavigationBar from 'expo-navigation-bar'
import { useFonts, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans'
import * as SplashScreen from 'expo-splash-screen'

// Suppress Legacy Architecture warning - we intentionally use it for compatibility
// with react-native-maps and some expo modules. Migration to New Architecture
// should be done in a dedicated effort when all dependencies are ready.
// NOTE: Legacy Architecture is frozen as of RN 0.80 and removed in RN 0.82.
// Expo SDK 54 is the last SDK to support it. Plan migration before upgrading.
LogBox.ignoreLogs([
  'The app is running using the Legacy Architecture',
])

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { AppNavigator, getNavigationIntegration, navigationRef } from './navigation/AppNavigator'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerForPushNotifications } from './services/notifications'
import { processOfflineQueue } from './lib/offlineMessageQueue'
import { useNetworkStatus } from './hooks/useNetworkStatus'

// ============================================================================
// NOTIFICATION SETUP (Lazy loaded to handle native module issues)
// ============================================================================

// Dynamically import expo-notifications to handle cases where native modules
// aren't available (e.g., mismatched iOS dev client and JS bundle versions)
let Notifications: typeof import('expo-notifications') | null = null
let notificationsAvailable = false

// Try to load notifications module asynchronously
async function initializeNotifications(): Promise<void> {
  try {
    Notifications = await import('expo-notifications')
    notificationsAvailable = true

    // Configure how notifications are handled when the app is in the foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })

    if (__DEV__) {
      console.log('[App] Notifications module loaded successfully')
    }
  } catch (error) {
    notificationsAvailable = false
    if (__DEV__) {
      console.warn('[App] Failed to load notifications module:', error)
      console.warn('[App] Push notifications will be disabled. To fix this, rebuild your development client.')
    }
  }
}

// Initialize notifications in useEffect to defer module-level work
// (moved to App component below)

// ============================================================================
// FONT LOADING SETUP
// ============================================================================

// Prevent auto-hiding splash screen until fonts are loaded
SplashScreen.preventAutoHideAsync()

// ============================================================================
// SENTRY ERROR TRACKING SETUP
// ============================================================================

// Initialize Sentry at module level so it's ready before the first render.
// This ensures errors caught by ErrorBoundary during initial render are reported.
initSentry(getNavigationIntegration())

// ============================================================================
// ANALYTICS SETUP
// ============================================================================

// Analytics initialization is deferred to App component's useEffect

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Global error handler for logging errors caught by ErrorBoundary
 * In production, this could send errors to a monitoring service
 */
function handleGlobalError(error: Error, errorInfo: React.ErrorInfo): void {
  // In production, you would send this to an error monitoring service
  // For now, we'll just log in development
  if (__DEV__) {
    // Error details are shown in the ErrorBoundary UI when showDetails is true
  }
}

/**
 * OfflineQueueProcessor Component
 *
 * Handles automatic retry of offline messages when network connectivity is restored.
 * Monitors network status and processes the offline message queue when connection is regained.
 *
 * This component:
 * 1. Listens for network state changes
 * 2. Processes offline message queue on app startup (if network available)
 * 3. Processes queue when network is restored after being offline
 * 4. Notifies user when queued messages are recovered
 */
function OfflineQueueProcessor({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isConnected, isInternetReachable } = useNetworkStatus()
  const { userId, isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const previousConnectionRef = useRef<boolean | null>(null)
  const hasProcessedOnStartupRef = useRef(false)

  // Process queue when network is restored
  useEffect(() => {
    const processQueue = async () => {
      if (!isAuthenticated || !userId) return
      if (!isConnected || isInternetReachable === false) return

      try {
        // Create a send function that uses Supabase
        const sendFunction = async (
          conversationId: string,
          senderId: string,
          content: string
        ) => {
          // Import moved to top of file for P-046
          const { supabase } = await import('./lib/supabase')
          const { data, error } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: senderId,
              content,
            })
            .select()
            .single()

          if (error) {
            return { success: false, error: error.message }
          }

          return { success: true }
        }

        const result = await processOfflineQueue(sendFunction)

        // Notify user if messages were recovered
        if (result.succeeded > 0) {
          showToast({
            message: `Successfully sent ${result.succeeded} queued message${result.succeeded > 1 ? 's' : ''}.`,
            variant: 'success',
            duration: 3000,
          })
        }

        if (result.failed > 0 && result.remaining > 0) {
          showToast({
            message: `${result.failed} message${result.failed > 1 ? 's' : ''} could not be sent. ${result.remaining} remaining in queue.`,
            variant: 'error',
            duration: 4000,
          })
        }
      } catch (error) {
        // Silent fail - not critical
        if (__DEV__) {
          console.warn('[OfflineQueue] Failed to process queue:', error)
        }
      }
    }

    // Process on startup (once)
    if (!hasProcessedOnStartupRef.current && isConnected && isAuthenticated && userId) {
      hasProcessedOnStartupRef.current = true
      processQueue()
      return
    }

    // Process when network is restored (connection state changed from false to true)
    const wasDisconnected = previousConnectionRef.current === false
    const isNowConnected = isConnected === true

    if (wasDisconnected && isNowConnected && isAuthenticated && userId) {
      processQueue()
    }

    // Update previous connection state
    previousConnectionRef.current = isConnected
  }, [isConnected, isInternetReachable, isAuthenticated, userId])

  return <>{children}</>
}

/**
 * NotificationRegistration Component
 *
 * Handles push notification registration when user is authenticated.
 * Must be rendered inside AuthProvider to access auth context.
 *
 * This component:
 * 1. Registers for push notifications when user logs in
 * 2. Sets up listeners for notification responses (for deep-linking)
 * 3. Cleans up listeners on unmount
 */
function NotificationRegistration({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { userId, isAuthenticated } = useAuth()
  const [notificationsReady, setNotificationsReady] = useState(false)
  const notificationResponseListener = useRef<{ remove: () => void } | null>(null)

  // Wait for notifications module to be ready
  useEffect(() => {
    const checkNotifications = async () => {
      // Wait a bit for the async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      setNotificationsReady(notificationsAvailable)
    }
    checkNotifications()
  }, [])

  // Register for push notifications and set Sentry user context when authenticated
  useEffect(() => {
    if (isAuthenticated && userId && notificationsReady) {
      // Register for push notifications
      // Note: This will request permissions and register token
      // Per spec, we don't request on first app launch - only when authenticated
      registerForPushNotifications(userId)
    }

    // Set Sentry user context for error tracking
    if (isAuthenticated && userId) {
      setUserContext(userId)
    } else {
      setUserContext(null)
    }
  }, [isAuthenticated, userId, notificationsReady])

  // Set up notification response listener for deep-linking
  useEffect(() => {
    if (!notificationsReady || !Notifications) return

    try {
      // Listen for when user taps on a notification
      notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data
          if (!data) return

          try {
            if (data.type === 'checkin_prompt' && data.locationId && data.locationName) {
              // Navigate to the location's check-in screen
              navigationRef.current?.navigate('Main', {
                screen: 'Ledger',
                params: {
                  locationId: data.locationId as string,
                  locationName: data.locationName as string,
                },
              })
            } else if (data.url && typeof data.url === 'string') {
              // Handle deep-link URLs from push notifications (match/message)
              const matchPost = data.url.match(/backtrack:\/\/post\/(.+)/)
              const matchConvo = data.url.match(/backtrack:\/\/conversation\/(.+)/)
              if (matchPost) {
                navigationRef.current?.navigate('Main', {
                  screen: 'PostDetail',
                  params: { postId: matchPost[1] },
                })
              } else if (matchConvo) {
                navigationRef.current?.navigate('Main', {
                  screen: 'Chat',
                  params: { conversationId: matchConvo[1] },
                })
              }
            }
          } catch {
            // Navigation not ready yet - app will show default screen
          }
        }
      )
    } catch (error) {
      if (__DEV__) {
        console.warn('[App] Failed to set up notification listener:', error)
      }
    }

    // Cleanup listener on unmount
    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove()
      }
    }
  }, [notificationsReady])

  return <>{children}</>
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

/**
 * Root App Component
 *
 * Sets up the provider hierarchy and navigation structure:
 * 1. GestureHandlerRootView - Required for React Navigation gestures
 * 2. SafeAreaProvider - Provides safe area insets for notched devices
 * 3. ErrorBoundary - Catches and handles errors gracefully
 * 4. AuthProvider - Global authentication state
 * 5. NotificationRegistration - Push notification setup (inside AuthProvider)
 * 6. AppNavigator - Navigation structure with auth-based routing
 */
function App() {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  })

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  // Set Android navigation bar color
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#0F0F13')
      NavigationBar.setButtonStyleAsync('light')
    }
  }, [])

  // Initialize notifications and analytics (Sentry is initialized at module level)
  useEffect(() => {
    initializeNotifications()
    initializeAnalytics()
  }, [])

  // Set up AppState listener for analytics flushing
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        flushAnalytics()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  // Don't render app until fonts are loaded
  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary
          onError={handleGlobalError}
          showDetails={__DEV__}
          testID="app-error-boundary"
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ToastProvider>
                <OfflineQueueProcessor>
                  <NotificationRegistration>
                    <AppNavigator />
                    <StatusBar style="light" />
                  </NotificationRegistration>
                </OfflineQueueProcessor>
              </ToastProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default wrapWithSentry(App)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
})
