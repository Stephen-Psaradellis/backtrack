/**
 * ErrorBoundary Component
 *
 * React error boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI instead of
 * crashing the app.
 *
 * Features:
 * - Catches and handles JavaScript errors in child components
 * - Displays user-friendly error screen
 * - Provides retry functionality to recover from errors
 * - Logs errors for debugging purposes
 * - Customizable fallback UI
 *
 * @example
 * ```tsx
 * // Wrap your app or specific sections
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={<CustomErrorScreen />}
 *   onError={(error, errorInfo) => logToService(error)}
 * >
 *   <RiskyComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native'

import { Button, OutlineButton } from './Button'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Optional custom fallback UI to display when an error occurs */
  fallback?: ReactNode
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Whether to show error details (useful for development) */
  showDetails?: boolean
  /** Test ID for testing purposes */
  testID?: string
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean
  /** The error that was caught */
  error: Error | null
  /** Additional error information from React */
  errorInfo: ErrorInfo | null
}

/**
 * Props for the default error fallback UI
 */
interface ErrorFallbackProps {
  /** The error that occurred */
  error: Error | null
  /** Error info from React */
  errorInfo: ErrorInfo | null
  /** Callback to reset the error boundary */
  onRetry: () => void
  /** Whether to show detailed error information */
  showDetails: boolean
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// ERROR FALLBACK COMPONENT
// ============================================================================

/**
 * Default error fallback UI
 *
 * Displays a user-friendly error screen with options to retry
 * or view error details (in development mode).
 */
function ErrorFallback({
  error,
  errorInfo,
  onRetry,
  showDetails,
  testID = 'error-fallback',
}: ErrorFallbackProps): JSX.Element {
  const [detailsVisible, setDetailsVisible] = React.useState(false)

  const handleToggleDetails = React.useCallback(() => {
    setDetailsVisible((prev) => !prev)
  }, [])

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer} testID={`${testID}-icon`}>
          <Text style={styles.errorIcon}>⚠️</Text>
        </View>

        {/* Error Title */}
        <Text style={styles.title} testID={`${testID}-title`}>
          Something went wrong
        </Text>

        {/* Error Message */}
        <Text style={styles.message} testID={`${testID}-message`}>
          We're sorry, but an unexpected error occurred. Please try again or
          restart the app if the problem persists.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Try Again"
            onPress={onRetry}
            fullWidth
            testID={`${testID}-retry-button`}
          />

          {showDetails && (
            <OutlineButton
              title={detailsVisible ? 'Hide Details' : 'Show Details'}
              onPress={handleToggleDetails}
              fullWidth
              testID={`${testID}-details-button`}
            />
          )}
        </View>

        {/* Error Details (collapsible) */}
        {showDetails && detailsVisible && (
          <View style={styles.detailsContainer} testID={`${testID}-details`}>
            <Text style={styles.detailsTitle}>Error Details</Text>

            {error && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Error Message:</Text>
                <Text style={styles.detailText} selectable>
                  {error.message}
                </Text>
              </View>
            )}

            {error?.name && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Error Type:</Text>
                <Text style={styles.detailText} selectable>
                  {error.name}
                </Text>
              </View>
            )}

            {errorInfo?.componentStack && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Component Stack:</Text>
                <ScrollView
                  style={styles.stackScrollView}
                  horizontal
                  showsHorizontalScrollIndicator
                >
                  <Text style={styles.stackText} selectable>
                    {errorInfo.componentStack}
                  </Text>
                </ScrollView>
              </View>
            )}

            {error?.stack && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Stack Trace:</Text>
                <ScrollView
                  style={styles.stackScrollView}
                  horizontal
                  showsHorizontalScrollIndicator
                >
                  <Text style={styles.stackText} selectable>
                    {error.stack}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 *
 * This is a class component because React error boundaries require
 * the getDerivedStateFromError and componentDidCatch lifecycle methods,
 * which are only available in class components.
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * // With error logging
 * <ErrorBoundary
 *   onError={(error, info) => {
 *     analytics.logError(error, info)
 *   }}
 * >
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  // ---------------------------------------------------------------------------
  // STATIC PROPERTIES
  // ---------------------------------------------------------------------------

  static defaultProps = {
    showDetails: __DEV__,
    testID: 'error-boundary',
  }

  // ---------------------------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------------------------

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE METHODS
  // ---------------------------------------------------------------------------

  /**
   * Static method called when an error is thrown in a descendant component.
   * Updates state to indicate an error has occurred.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Called after an error has been thrown by a descendant component.
   * Used for logging error information.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo })

    // Call the optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Reset the error boundary state, allowing children to re-render
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  render(): ReactNode {
    const { children, fallback, showDetails, testID } = this.props
    const { hasError, error, errorInfo } = this.state

    if (hasError) {
      // Render custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Render default error fallback
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          showDetails={showDetails ?? __DEV__}
          testID={testID}
        />
      )
    }

    // Render children normally when no error
    return children
  }
}

// ============================================================================
// HIGHER-ORDER COMPONENT
// ============================================================================

/**
 * HOC to wrap a component with an error boundary
 *
 * @example
 * ```tsx
 * const SafeScreen = withErrorBoundary(RiskyScreen, {
 *   showDetails: true,
 *   onError: (error) => logError(error),
 * })
 * ```
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const ComponentWithErrorBoundary = (props: P): JSX.Element => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

  return ComponentWithErrorBoundary
}

// ============================================================================
// HOOK FOR PROGRAMMATIC ERROR HANDLING
// ============================================================================

/**
 * Hook to programmatically throw errors that will be caught by the nearest
 * error boundary. Useful for async errors that aren't caught by boundaries.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const throwError = useErrorHandler()
 *
 *   const handleAsync = async () => {
 *     try {
 *       await riskyOperation()
 *     } catch (error) {
 *       throwError(error)
 *     }
 *   }
 * }
 * ```
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null)

  const throwError = React.useCallback((error: Error) => {
    setError(() => {
      throw error
    })
  }, [])

  return throwError
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Icon
  iconContainer: {
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 64,
  },

  // Text
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },

  // Buttons
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },

  // Details
  detailsContainer: {
    width: '100%',
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#FF3B30',
    fontFamily: 'monospace',
  },
  stackScrollView: {
    maxHeight: 150,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 8,
  },
  stackText: {
    fontSize: 11,
    color: '#3C3C43',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default ErrorBoundary
