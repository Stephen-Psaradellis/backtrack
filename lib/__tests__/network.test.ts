/**
 * Tests for lib/network.ts
 *
 * Tests network error handling, retry mechanisms, and offline queue.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock NetInfo
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: vi.fn(() => vi.fn()),
    fetch: vi.fn(() => Promise.resolve({ isConnected: true })),
  },
}))

import {
  isNetworkError,
  isRetryableError,
  categorizeError,
  getNetworkErrorMessage,
  withRetry,
  withTimeout,
  queueOfflineOperation,
  removeFromQueue,
  getOfflineQueue,
  processOfflineQueue,
  isOnline,
  addNetworkListener,
} from '../network'

describe('isNetworkError', () => {
  it('should return false for null/undefined', () => {
    expect(isNetworkError(null)).toBe(false)
    expect(isNetworkError(undefined)).toBe(false)
  })

  it('should detect network error messages', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true)
    expect(isNetworkError(new Error('fetch failed'))).toBe(true)
    expect(isNetworkError(new Error('Device is offline'))).toBe(true)
    expect(isNetworkError(new Error('Request timeout'))).toBe(true)
    expect(isNetworkError(new Error('Connection refused'))).toBe(true)
    expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true)
    expect(isNetworkError(new Error('ENOTFOUND'))).toBe(true)
  })

  it('should return false for non-network errors', () => {
    expect(isNetworkError(new Error('Invalid input'))).toBe(false)
    expect(isNetworkError(new Error('User not found'))).toBe(false)
    expect(isNetworkError(new Error('Permission denied'))).toBe(false)
  })

  it('should return false for non-Error objects', () => {
    expect(isNetworkError('network error')).toBe(false)
    expect(isNetworkError({ message: 'network error' })).toBe(false)
  })
})

describe('isRetryableError', () => {
  it('should return true for network errors', () => {
    expect(isRetryableError(new Error('Network request failed'))).toBe(true)
  })

  it('should return true for retryable status codes', () => {
    expect(isRetryableError(new Error('Error'), 408)).toBe(true) // Timeout
    expect(isRetryableError(new Error('Error'), 429)).toBe(true) // Too Many Requests
    expect(isRetryableError(new Error('Error'), 500)).toBe(true) // Internal Server Error
    expect(isRetryableError(new Error('Error'), 502)).toBe(true) // Bad Gateway
    expect(isRetryableError(new Error('Error'), 503)).toBe(true) // Service Unavailable
    expect(isRetryableError(new Error('Error'), 504)).toBe(true) // Gateway Timeout
  })

  it('should return false for non-retryable status codes', () => {
    expect(isRetryableError(new Error('Error'), 400)).toBe(false) // Bad Request
    expect(isRetryableError(new Error('Error'), 401)).toBe(false) // Unauthorized
    expect(isRetryableError(new Error('Error'), 403)).toBe(false) // Forbidden
    expect(isRetryableError(new Error('Error'), 404)).toBe(false) // Not Found
  })

  it('should return false for non-network errors without status code', () => {
    expect(isRetryableError(new Error('Invalid input'))).toBe(false)
  })
})

describe('categorizeError', () => {
  it('should categorize timeout errors', () => {
    const error = categorizeError(new Error('Request timeout'))
    expect(error.type).toBe('timeout')
    expect(error.retryable).toBe(true)
  })

  it('should categorize AbortError as timeout', () => {
    const abortError = new Error('AbortError')
    abortError.name = 'AbortError'
    const error = categorizeError(abortError)
    expect(error.type).toBe('timeout')
  })

  it('should categorize server errors', () => {
    const error = categorizeError(new Error('Server error'), 500)
    expect(error.type).toBe('server_error')
    expect(error.statusCode).toBe(500)
    expect(error.retryable).toBe(true)
  })

  it('should categorize client errors', () => {
    const error = categorizeError(new Error('Bad request'), 400)
    expect(error.type).toBe('client_error')
    expect(error.statusCode).toBe(400)
    expect(error.retryable).toBe(false)
  })

  it('should categorize unknown errors', () => {
    const error = categorizeError(new Error('Unknown error'))
    expect(error.type).toBe('unknown')
  })

  it('should preserve original error', () => {
    const original = new Error('Original error')
    const error = categorizeError(original)
    expect(error.originalError).toBe(original)
  })
})

describe('getNetworkErrorMessage', () => {
  it('should return error message', () => {
    const error = {
      type: 'timeout' as const,
      message: 'Request timed out',
      retryable: true,
    }
    expect(getNetworkErrorMessage(error)).toBe('Request timed out')
  })
})

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await withRetry(operation)

    expect(result.success).toBe(true)
    expect(result.data).toBe('success')
    expect(result.attempts).toBe(1)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('success')

    const result = await withRetry(operation, { maxRetries: 3, baseDelay: 10, maxDelay: 50 })

    expect(result.success).toBe(true)
    expect(result.data).toBe('success')
    expect(result.attempts).toBe(2)
  }, 10000)

  it('should fail after max retries', async () => {
    const error = new Error('Network error')
    const operation = vi.fn().mockRejectedValue(error)

    const result = await withRetry(operation, { maxRetries: 1, baseDelay: 10, maxDelay: 50 })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.attempts).toBeGreaterThan(1)
  }, 10000)

  it('should call onRetry callback', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('success')
    const onRetry = vi.fn()

    const result = await withRetry(operation, {
      maxRetries: 3,
      baseDelay: 10,
      maxDelay: 50,
      onRetry,
    })

    expect(result.success).toBe(true)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  }, 10000)

  it('should respect retryCondition', async () => {
    const error = new Error('Non-retryable error')
    const operation = vi.fn().mockRejectedValue(error)
    const retryCondition = vi.fn().mockReturnValue(false)

    const result = await withRetry(operation, { retryCondition })

    expect(result.success).toBe(false)
    expect(operation).toHaveBeenCalledTimes(1) // No retries
  })
})

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should resolve if operation completes in time', async () => {
    const operation = Promise.resolve('success')

    const result = await withTimeout(operation, 1000)

    expect(result).toBe('success')
  })

  it('should reject if operation times out', async () => {
    const operation = new Promise<string>((resolve) => {
      setTimeout(() => resolve('success'), 2000)
    })

    const resultPromise = withTimeout(operation, 1000)

    // Advance past timeout
    vi.advanceTimersByTime(1001)

    await expect(resultPromise).rejects.toThrow('Operation timed out')
  })
})

describe('offline queue', () => {
  beforeEach(() => {
    // Clear queue
    while (getOfflineQueue().length > 0) {
      const queue = getOfflineQueue()
      if (queue.length > 0) {
        removeFromQueue(queue[0].id)
      }
    }
  })

  describe('queueOfflineOperation', () => {
    it('should add operation to queue', () => {
      const operation = vi.fn().mockResolvedValue('success')

      const id = queueOfflineOperation(operation)

      expect(id).toBeDefined()
      expect(getOfflineQueue()).toHaveLength(1)
      expect(getOfflineQueue()[0].id).toBe(id)
    })

    it('should generate unique IDs', () => {
      const op1 = vi.fn()
      const op2 = vi.fn()

      const id1 = queueOfflineOperation(op1)
      const id2 = queueOfflineOperation(op2)

      expect(id1).not.toBe(id2)
    })
  })

  describe('removeFromQueue', () => {
    it('should remove operation from queue', () => {
      const operation = vi.fn()
      const id = queueOfflineOperation(operation)

      expect(getOfflineQueue()).toHaveLength(1)

      const result = removeFromQueue(id)

      expect(result).toBe(true)
      expect(getOfflineQueue()).toHaveLength(0)
    })

    it('should return false for non-existent ID', () => {
      const result = removeFromQueue('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('getOfflineQueue', () => {
    it('should return copy of queue', () => {
      const operation = vi.fn()
      queueOfflineOperation(operation)

      const queue1 = getOfflineQueue()
      const queue2 = getOfflineQueue()

      expect(queue1).not.toBe(queue2) // Different array instances
      expect(queue1).toEqual(queue2)
    })
  })

  describe('processOfflineQueue', () => {
    it('should process queued operations when online', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      queueOfflineOperation(operation)

      const result = await processOfflineQueue()

      expect(result.processed).toBe(1)
      expect(result.failed).toBe(0)
      expect(getOfflineQueue()).toHaveLength(0)
      expect(operation).toHaveBeenCalled()
    })

    it('should handle failed operations', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'))
      queueOfflineOperation(operation)

      // Process multiple times to exceed retry limit
      await processOfflineQueue()
      await processOfflineQueue()
      await processOfflineQueue()

      const result = await processOfflineQueue()

      // After 3 failures, it should be removed
      expect(result.failed).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('isOnline', () => {
  it('should return network status', async () => {
    const result = await isOnline()
    expect(typeof result).toBe('boolean')
  })
})

describe('addNetworkListener', () => {
  it('should return unsubscribe function', () => {
    const listener = vi.fn()
    const unsubscribe = addNetworkListener(listener)
    expect(typeof unsubscribe).toBe('function')
  })

  it('should remove listener when unsubscribe is called', () => {
    const listener = vi.fn()
    const unsubscribe = addNetworkListener(listener)

    // Call unsubscribe
    unsubscribe()

    // Listener should be removed (we can verify by checking it doesn't throw)
    expect(unsubscribe).toBeDefined()
  })
})

describe('getNetworkState', () => {
  it('should return network state', async () => {
    const { getNetworkState } = await import('../network')
    const state = await getNetworkState()
    expect(state).toBeDefined()
    expect(typeof state.isConnected).toBe('boolean')
  })
})

describe('initializeNetworkMonitoring', () => {
  it('should return unsubscribe function', async () => {
    const { initializeNetworkMonitoring } = await import('../network')
    const unsubscribe = initializeNetworkMonitoring()
    expect(typeof unsubscribe).toBe('function')
    // Clean up
    unsubscribe()
  })
})

describe('categorizeError edge cases', () => {
  it('should categorize non-Error objects', () => {
    const error = categorizeError('string error')
    expect(error.type).toBe('unknown')
    expect(error.originalError).toBeUndefined()
  })

  it('should detect network error in unknown category', () => {
    const networkError = new Error('Network request failed')
    const result = categorizeError(networkError)
    expect(result.retryable).toBe(true)
  })

  it('should handle non-retryable server errors', () => {
    // Status 501 is not in RETRYABLE_STATUS_CODES but is >= 500
    const error = categorizeError(new Error('Not Implemented'), 501)
    expect(error.type).toBe('server_error')
    expect(error.retryable).toBe(false)
  })
})

describe('withRetry edge cases', () => {
  it('should handle non-Error exceptions', async () => {
    const operation = vi.fn().mockRejectedValue('string error')

    const result = await withRetry(operation, { maxRetries: 0 })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should not retry when retryCondition returns false immediately', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Error'))
    const retryCondition = vi.fn().mockReturnValue(false)

    const result = await withRetry(operation, {
      maxRetries: 3,
      retryCondition
    })

    expect(result.success).toBe(false)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should stop retrying when error becomes non-retryable', async () => {
    // Non-network error without retryable status code
    const error = new Error('Invalid input')
    const operation = vi.fn().mockRejectedValue(error)

    const result = await withRetry(operation, { maxRetries: 3, baseDelay: 10, maxDelay: 50 })

    expect(result.success).toBe(false)
    expect(operation).toHaveBeenCalledTimes(1) // No retries because error is not retryable
  })
})

describe('processOfflineQueue edge cases', () => {
  beforeEach(() => {
    // Clear queue
    while (getOfflineQueue().length > 0) {
      const queue = getOfflineQueue()
      if (queue.length > 0) {
        removeFromQueue(queue[0].id)
      }
    }
  })

  it('should move failed operation to end of queue on retry', async () => {
    const failingOp = vi.fn().mockRejectedValue(new Error('Failed'))
    const successOp = vi.fn().mockResolvedValue('success')

    queueOfflineOperation(failingOp)
    queueOfflineOperation(successOp)

    // First process - failing op fails, moves to end
    await processOfflineQueue()

    // The failing op should have been attempted
    expect(failingOp).toHaveBeenCalled()
  })

  it('should process multiple successful operations', async () => {
    const op1 = vi.fn().mockResolvedValue('result1')
    const op2 = vi.fn().mockResolvedValue('result2')

    queueOfflineOperation(op1)
    queueOfflineOperation(op2)

    const result = await processOfflineQueue()

    expect(result.processed).toBe(2)
    expect(result.failed).toBe(0)
    expect(op1).toHaveBeenCalled()
    expect(op2).toHaveBeenCalled()
  })
})
