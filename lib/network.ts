/**
 * Network Error Handling Utility
 *
 * Provides utilities for handling network errors, offline detection,
 * retry mechanisms, and graceful degradation.
 *
 * Features:
 * - Network status detection
 * - Retry mechanism with exponential backoff
 * - Error categorization
 * - User-friendly error messages
 * - Offline queue for pending operations
 *
 * @example
 * ```tsx
 * import { withRetry, isNetworkError, getNetworkErrorMessage } from 'lib/network'
 *
 * // Wrap API calls with retry logic
 * const result = await withRetry(() => fetchData(), { maxRetries: 3 })
 *
 * // Check if error is network-related
 * if (isNetworkError(error)) {
 *   showOfflineMessage()
 * }
 * ```
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Network error types for categorization
 */
export type NetworkErrorType =
  | 'offline'
  | 'timeout'
  | 'server_error'
  | 'client_error'
  | 'unknown'

/**
 * Categorized network error
 */
export interface NetworkError {
  type: NetworkErrorType
  message: string
  originalError?: Error
  statusCode?: number
  retryable: boolean
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number
  /** Whether to retry on specific errors only */
  retryCondition?: (error: Error) => boolean
  /** Callback called before each retry */
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Result of an operation that may require retry
 */
export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: NetworkError
  attempts: number
}

/**
 * Queued operation for offline mode
 */
export interface QueuedOperation {
  id: string
  operation: () => Promise<unknown>
  timestamp: number
  retryCount: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryCondition: () => true,
  onRetry: () => {},
}

/**
 * HTTP status codes that indicate retryable errors
 */
const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]

/**
 * Error messages for network states
 */
const ERROR_MESSAGES: Record<NetworkErrorType, string> = {
  offline: 'You appear to be offline. Please check your internet connection.',
  timeout: 'The request took too long to complete. Please try again.',
  server_error: 'The server is experiencing issues. Please try again later.',
  client_error: 'There was a problem with your request. Please try again.',
  unknown: 'An unexpected error occurred. Please try again.',
}

// ============================================================================
// NETWORK STATUS
// ============================================================================

/**
 * Current network state
 */
let currentNetworkState: NetInfoState | null = null

/**
 * Listeners for network state changes
 */
const networkListeners: Set<(state: NetInfoState) => void> = new Set()

/**
 * Initialize network state monitoring
 * Call this once at app startup
 */
export function initializeNetworkMonitoring(): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    currentNetworkState = state
    networkListeners.forEach((listener) => listener(state))
  })

  // Get initial state
  NetInfo.fetch().then((state) => {
    currentNetworkState = state
  })

  return unsubscribe
}

/**
 * Add a listener for network state changes
 */
export function addNetworkListener(
  listener: (state: NetInfoState) => void
): () => void {
  networkListeners.add(listener)
  return () => networkListeners.delete(listener)
}

/**
 * Check if device is currently online
 */
export async function isOnline(): Promise<boolean> {
  if (currentNetworkState) {
    return currentNetworkState.isConnected ?? false
  }
  const state = await NetInfo.fetch()
  return state.isConnected ?? false
}

/**
 * Get current network state
 */
export async function getNetworkState(): Promise<NetInfoState> {
  if (currentNetworkState) {
    return currentNetworkState
  }
  return NetInfo.fetch()
}

// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false

  // Check for common network error indicators
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('offline') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    )
  }

  return false
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown, statusCode?: number): boolean {
  // Network errors are generally retryable
  if (isNetworkError(error)) {
    return true
  }

  // Check HTTP status codes
  if (statusCode && RETRYABLE_STATUS_CODES.includes(statusCode)) {
    return true
  }

  return false
}

/**
 * Categorize an error into a NetworkError
 */
export function categorizeError(
  error: unknown,
  statusCode?: number
): NetworkError {
  // Offline error
  if (currentNetworkState && !currentNetworkState.isConnected) {
    return {
      type: 'offline',
      message: ERROR_MESSAGES.offline,
      originalError: error instanceof Error ? error : undefined,
      retryable: true,
    }
  }

  // Timeout error
  if (
    error instanceof Error &&
    (error.message.includes('timeout') || error.name === 'AbortError')
  ) {
    return {
      type: 'timeout',
      message: ERROR_MESSAGES.timeout,
      originalError: error,
      retryable: true,
    }
  }

  // HTTP status code based errors
  if (statusCode) {
    if (statusCode >= 500) {
      return {
        type: 'server_error',
        message: ERROR_MESSAGES.server_error,
        originalError: error instanceof Error ? error : undefined,
        statusCode,
        retryable: RETRYABLE_STATUS_CODES.includes(statusCode),
      }
    }

    if (statusCode >= 400) {
      return {
        type: 'client_error',
        message: ERROR_MESSAGES.client_error,
        originalError: error instanceof Error ? error : undefined,
        statusCode,
        retryable: false,
      }
    }
  }

  // Unknown error
  return {
    type: 'unknown',
    message: error instanceof Error ? error.message : ERROR_MESSAGES.unknown,
    originalError: error instanceof Error ? error : undefined,
    retryable: isNetworkError(error),
  }
}

/**
 * Get a user-friendly error message
 */
export function getNetworkErrorMessage(error: NetworkError): string {
  return error.message
}

// ============================================================================
// RETRY MECHANISM
// ============================================================================

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 1000
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Wait for a specified delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute an operation with retry logic
 *
 * @example
 * ```tsx
 * const result = await withRetry(
 *   () => supabase.from('posts').select('*'),
 *   { maxRetries: 3 }
 * )
 *
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | undefined
  let attempts = 0

  while (attempts <= config.maxRetries) {
    try {
      const data = await operation()
      return {
        success: true,
        data,
        attempts: attempts + 1,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      attempts++

      // Check if we should retry
      const shouldRetry =
        attempts <= config.maxRetries &&
        config.retryCondition(lastError) &&
        isRetryableError(lastError)

      if (!shouldRetry) {
        break
      }

      // Call retry callback
      config.onRetry(attempts, lastError)

      // Wait before retrying
      const waitTime = calculateBackoffDelay(
        attempts - 1,
        config.baseDelay,
        config.maxDelay
      )
      await delay(waitTime)
    }
  }

  return {
    success: false,
    error: categorizeError(lastError),
    attempts,
  }
}

/**
 * Execute an operation with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Operation timed out'))
    }, timeoutMs)
  })

  return Promise.race([operation, timeoutPromise])
}

// ============================================================================
// OFFLINE QUEUE
// ============================================================================

/**
 * Queue of operations to execute when online
 */
const offlineQueue: QueuedOperation[] = []

/**
 * Generate unique ID for queued operations
 */
function generateQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Add an operation to the offline queue
 */
export function queueOfflineOperation(
  operation: () => Promise<unknown>
): string {
  const id = generateQueueId()
  offlineQueue.push({
    id,
    operation,
    timestamp: Date.now(),
    retryCount: 0,
  })
  return id
}

/**
 * Remove an operation from the offline queue
 */
export function removeFromQueue(id: string): boolean {
  const index = offlineQueue.findIndex((op) => op.id === id)
  if (index >= 0) {
    offlineQueue.splice(index, 1)
    return true
  }
  return false
}

/**
 * Get the current offline queue
 */
export function getOfflineQueue(): QueuedOperation[] {
  return [...offlineQueue]
}

/**
 * Process the offline queue when back online
 */
export async function processOfflineQueue(): Promise<{
  processed: number
  failed: number
}> {
  const isCurrentlyOnline = await isOnline()
  if (!isCurrentlyOnline) {
    return { processed: 0, failed: 0 }
  }

  let processed = 0
  let failed = 0

  // Process queue in order
  while (offlineQueue.length > 0) {
    const operation = offlineQueue[0]

    try {
      await operation.operation()
      offlineQueue.shift() // Remove from queue on success
      processed++
    } catch {
      operation.retryCount++

      // Remove if too many retries
      if (operation.retryCount >= 3) {
        offlineQueue.shift()
        failed++
      } else {
        // Move to end of queue for later retry
        offlineQueue.push(offlineQueue.shift()!)
        break // Stop processing to avoid infinite loop
      }
    }
  }

  return { processed, failed }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Network status
  initializeNetworkMonitoring,
  addNetworkListener,
  isOnline,
  getNetworkState,

  // Error handling
  isNetworkError,
  isRetryableError,
  categorizeError,
  getNetworkErrorMessage,

  // Retry mechanism
  withRetry,
  withTimeout,

  // Offline queue
  queueOfflineOperation,
  removeFromQueue,
  getOfflineQueue,
  processOfflineQueue,
}
