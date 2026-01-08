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
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet, LogBox } from 'react-native'

// Suppress Legacy Architecture warning - we intentionally use it for compatibility
// with react-native-maps and some expo modules. Migration to New Architecture
// should be done in a dedicated effort when all dependencies are ready.
// NOTE: Legacy Architecture is frozen as of RN 0.80 and removed in RN 0.82.
// Expo SDK 54 is the last SDK to support it. Plan migration before upgrading.
LogBox.ignoreLogs([
  'The app is running using the Legacy Architecture',
])

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppNavigator } from './navigation/AppNavigator'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerForPushNotifications } from './services/notifications'
import { avatarLoader } from './lib/avatar'

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

// Initialize notifications (non-blocking)
initializeNotifications()

// ============================================================================
// AVATAR PRELOADING SETUP
// ============================================================================

/**
 * Initialize avatar preloading system.
 * This sets up the loading state tracking for local avatar presets.
 * Actual 3D model preloading happens when the WebGL view is mounted.
 *
 * Task 4.1: Avatar Preloading System
 */
function initializeAvatarPreloading(): void {
  try {
    // Initialize loading state for all local avatar presets
    // This doesn't load the 3D models - just sets up tracking
    avatarLoader.initializeLocalAvatars()

    if (__DEV__) {
      const stats = avatarLoader.getCacheStats()
      console.log(`[App] Avatar preloading initialized: ${stats.local} local avatars registered`)
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[App] Failed to initialize avatar preloading:', error)
    }
  }
}

// Initialize avatar preloading (non-blocking)
initializeAvatarPreloading()

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

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId && notificationsReady) {
      // Register for push notifications
      // Note: This will request permissions and register token
      // Per spec, we don't request on first app launch - only when authenticated
      registerForPushNotifications(userId)
    }
  }, [isAuthenticated, userId, notificationsReady])

  // Set up notification response listener for deep-linking
  useEffect(() => {
    if (!notificationsReady || !Notifications) return

    try {
      // Listen for when user taps on a notification
      notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          // The notification data contains the deep-link URL
          // Deep-linking navigation is handled by React Navigation's linking config
          // which will be set up in AppNavigator (subtask-5-1)
          const data = response.notification.request.content.data

          // Navigation will be handled automatically by linking config
          // when the app receives the notification URL
          if (__DEV__ && data) {
            // Debug logging in development only
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
export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary
          onError={handleGlobalError}
          showDetails={__DEV__}
          testID="app-error-boundary"
        >
          <AuthProvider>
            <NotificationRegistration>
              <AppNavigator />
              <StatusBar style="auto" />
            </NotificationRegistration>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
})
