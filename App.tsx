/**
 * Love Ledger
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

import React, { useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import * as Notifications from 'expo-notifications'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppNavigator } from './navigation/AppNavigator'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerForPushNotifications } from './services/notifications'

// ============================================================================
// NOTIFICATION HANDLER SETUP (Must be called at module level, outside component)
// ============================================================================

/**
 * Configure how notifications are handled when the app is in the foreground.
 * This determines whether to show alerts, play sounds, and update badges.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

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
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null)

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId) {
      // Register for push notifications
      // Note: This will request permissions and register token
      // Per spec, we don't request on first app launch - only when authenticated
      registerForPushNotifications(userId)
    }
  }, [isAuthenticated, userId])

  // Set up notification response listener for deep-linking
  useEffect(() => {
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

    // Cleanup listener on unmount
    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current)
      }
    }
  }, [])

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
  },
})