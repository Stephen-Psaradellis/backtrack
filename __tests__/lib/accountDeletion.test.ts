/**
 * Account Deletion Service Tests
 *
 * Tests the account deletion functionality for GDPR/CCPA compliance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create hoisted mocks that are available before module loading
const { mockRpc, mockSignOut } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSignOut: vi.fn(),
}))

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      signOut: () => mockSignOut(),
    },
  },
}))

// Import after mocking
import {
  scheduleAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
  deleteAccountImmediately,
  deleteAccountAndSignOut,
  DEFAULT_GRACE_DAYS,
  MIN_GRACE_DAYS,
  MAX_GRACE_DAYS,
} from '../../lib/accountDeletion'

describe('Account Deletion Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Constants', () => {
    it('should have correct default grace period', () => {
      expect(DEFAULT_GRACE_DAYS).toBe(7)
    })

    it('should have correct minimum grace period', () => {
      expect(MIN_GRACE_DAYS).toBe(1)
    })

    it('should have correct maximum grace period', () => {
      expect(MAX_GRACE_DAYS).toBe(30)
    })
  })

  describe('scheduleAccountDeletion', () => {
    it('should schedule deletion with default grace period', async () => {
      const scheduledFor = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Account deletion scheduled',
          scheduled_for: scheduledFor,
          grace_days: 7,
        },
        error: null,
      })

      const result = await scheduleAccountDeletion('User requested')

      expect(result.success).toBe(true)
      expect(result.scheduledFor).toBe(scheduledFor)
      expect(result.graceDays).toBe(7)
      expect(mockRpc).toHaveBeenCalledWith('schedule_account_deletion', {
        p_reason: 'User requested',
        p_grace_days: 7,
      })
    })

    it('should clamp grace days to valid range', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      // Test minimum clamping
      await scheduleAccountDeletion(undefined, 0)
      expect(mockRpc).toHaveBeenCalledWith('schedule_account_deletion', {
        p_reason: null,
        p_grace_days: MIN_GRACE_DAYS,
      })

      mockRpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      // Test maximum clamping
      await scheduleAccountDeletion(undefined, 100)
      expect(mockRpc).toHaveBeenCalledWith('schedule_account_deletion', {
        p_reason: null,
        p_grace_days: MAX_GRACE_DAYS,
      })
    })

    it('should handle RPC errors', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await scheduleAccountDeletion()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('cancelAccountDeletion', () => {
    it('should cancel scheduled deletion', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Account deletion cancelled',
        },
        error: null,
      })

      const result = await cancelAccountDeletion()

      expect(result.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('cancel_account_deletion')
    })

    it('should handle cancellation when no pending deletion exists', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          message: 'No pending deletion found',
        },
        error: null,
      })

      const result = await cancelAccountDeletion()

      expect(result.success).toBe(false)
    })
  })

  describe('getDeletionStatus', () => {
    it('should return scheduled status when deletion is pending', async () => {
      const scheduledFor = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

      mockRpc.mockResolvedValueOnce({
        data: {
          scheduled: true,
          scheduled_for: scheduledFor,
          days_remaining: 3,
          reason: 'User requested',
        },
        error: null,
      })

      const result = await getDeletionStatus()

      expect(result.scheduled).toBe(true)
      expect(result.daysRemaining).toBe(3)
    })

    it('should return not scheduled when no pending deletion', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          scheduled: false,
        },
        error: null,
      })

      const result = await getDeletionStatus()

      expect(result.scheduled).toBe(false)
      expect(result.scheduledFor).toBeUndefined()
    })
  })

  describe('deleteAccountImmediately', () => {
    it('should delete account and return counts', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Account deleted',
          deleted_counts: {
            messages: 10,
            posts: 5,
            conversations: 3,
          },
        },
        error: null,
      })

      const result = await deleteAccountImmediately('test-user-id')

      expect(result.success).toBe(true)
      expect(result.deletedCounts).toEqual({
        messages: 10,
        posts: 5,
        conversations: 3,
      })
    })

    it('should handle deletion failure', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Unauthorized',
        },
        error: null,
      })

      const result = await deleteAccountImmediately('test-user-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })
  })

  describe('deleteAccountAndSignOut', () => {
    it('should delete account and sign out', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Account deleted',
        },
        error: null,
      })
      mockSignOut.mockResolvedValueOnce({ error: null })

      const result = await deleteAccountAndSignOut('test-user-id')

      expect(result.success).toBe(true)
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should still succeed if sign out fails after deletion', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Account deleted',
        },
        error: null,
      })
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'))

      const result = await deleteAccountAndSignOut('test-user-id')

      // Should still report success since data was deleted
      expect(result.success).toBe(true)
    })

    it('should not sign out if deletion fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Deletion failed' },
      })

      const result = await deleteAccountAndSignOut('test-user-id')

      expect(result.success).toBe(false)
      expect(mockSignOut).not.toHaveBeenCalled()
    })
  })

  describe('Exception handling', () => {
    it('should handle thrown exceptions in scheduleAccountDeletion', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network error'))

      const result = await scheduleAccountDeletion()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.message).toContain('unexpected error')
    })

    it('should handle non-Error exceptions in scheduleAccountDeletion', async () => {
      mockRpc.mockRejectedValueOnce('String error')

      const result = await scheduleAccountDeletion()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should handle thrown exceptions in cancelAccountDeletion', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network error'))

      const result = await cancelAccountDeletion()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exceptions in cancelAccountDeletion', async () => {
      mockRpc.mockRejectedValueOnce('String error')

      const result = await cancelAccountDeletion()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should handle RPC error in getDeletionStatus', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await getDeletionStatus()

      expect(result.scheduled).toBe(false)
    })

    it('should handle thrown exceptions in getDeletionStatus', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network error'))

      const result = await getDeletionStatus()

      expect(result.scheduled).toBe(false)
    })

    it('should handle thrown exceptions in deleteAccountImmediately', async () => {
      mockRpc.mockRejectedValueOnce(new Error('Network error'))

      const result = await deleteAccountImmediately('test-user-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exceptions in deleteAccountImmediately', async () => {
      mockRpc.mockRejectedValueOnce('String error')

      const result = await deleteAccountImmediately('test-user-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should handle RPC error in deleteAccountImmediately', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized' },
      })

      const result = await deleteAccountImmediately('test-user-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })
  })
})
