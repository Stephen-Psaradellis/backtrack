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
 * - Navigation Container with app navigator
 */

// IMPORTANT: gesture-handler must be imported at the very top
import 'react-native-gesture-handler'

import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'

import { AuthProvider } from './contexts/AuthContext'
import { AppNavigator } from './navigation/AppNavigator'
import { ErrorBoundary } from './components/ErrorBoundary'

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
 * Root App Component
 *
 * Sets up the provider hierarchy and navigation structure:
 * 1. GestureHandlerRootView - Required for React Navigation gestures
 * 2. SafeAreaProvider - Provides safe area insets for notched devices
 * 3. ErrorBoundary - Catches and handles errors gracefully
 * 4. AuthProvider - Global authentication state
 * 5. AppNavigator - Navigation structure with auth-based routing
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
            <AppNavigator />
            <StatusBar style="auto" />
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