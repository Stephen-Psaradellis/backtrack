/**
 * useReportUser Hook Tests
 *
 * Tests for the useReportUser hook including:
 * - Reporting user API calls
 * - Loading states
 * - Error handling
 * - Success callbacks
 * - Duplicate operation prevention
 * - Already reported user handling
 * - Report reason and details handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useReportUser } from '../useReportUser'
import * as supabaseModule from '../../../../lib/supabase'
import type { UUID, ReportReason } from '../../../../types/database'

// Mock the Supabase client
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock data
const mockCurrentUserId: UUID = 'test-user-123'
const mockTargetUserId: UUID = 'test-target-456'

// Create mock Supabase functions
const createMockSupabase = () => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null })

  const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert,
  })

  return {
    from: mockFrom,
    _mockFrom: mockFrom,
    _mockInsert: mockInsert,
  }
}

describe('useReportUser', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    // Set up the mocked supabase module
    vi.mocked(supabaseModule.supabase.from).mockImplementation(mockSupabase.from)
  })

  describe('Initial state', () => {
    it('should start with isReporting false', () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      expect(result.current.isReporting).toBe(false)
    })

    it('should start with error null', () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      expect(result.current.error).toBeNull()
    })

    it('should provide reportUser and clearError functions', () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      expect(typeof result.current.reportUser).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('reportUser function', () => {
    it('should insert into user_reports table with required fields', async () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment')
      })

      expect(supabaseModule.supabase.from).toHaveBeenCalledWith('user_reports')
      expect(mockSupabase._mockInsert).toHaveBeenCalledWith({
        reporter_id: mockCurrentUserId,
        reported_id: mockTargetUserId,
        reason: 'harassment',
        details: null,
      })
    })

    it('should include details when provided', async () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('spam', 'Sent unsolicited advertisements')
      })

      expect(mockSupabase._mockInsert).toHaveBeenCalledWith({
        reporter_id: mockCurrentUserId,
        reported_id: mockTargetUserId,
        reason: 'spam',
        details: 'Sent unsolicited advertisements',
      })
    })

    it('should trim details and set to null if empty', async () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment', '   ')
      })

      expect(mockSupabase._mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: null,
        })
      )
    })

    it('should set isReporting to true during operation', async () => {
      let resolveReport: () => void = () => {}
      mockSupabase._mockInsert.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveReport = () => resolve({ error: null })
          })
      )

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      act(() => {
        result.current.reportUser('harassment')
      })

      await waitFor(() => {
        expect(result.current.isReporting).toBe(true)
      })

      await act(async () => {
        resolveReport()
      })

      await waitFor(() => {
        expect(result.current.isReporting).toBe(false)
      })
    })

    it('should call onSuccess callback on successful report', async () => {
      const onSuccess = vi.fn()

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          onSuccess,
        })
      )

      await act(async () => {
        await result.current.reportUser('inappropriate_content')
      })

      expect(onSuccess).toHaveBeenCalledWith(mockTargetUserId)
    })

    it('should not report if targetUserId is empty', async () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: '' as UUID,
        })
      )

      await act(async () => {
        await result.current.reportUser('spam')
      })

      expect(mockSupabase._mockInsert).not.toHaveBeenCalled()
    })

    it('should handle all report reason types', async () => {
      const reasons: ReportReason[] = [
        'spam',
        'harassment',
        'inappropriate_content',
        'fake_profile',
        'other',
      ]

      for (const reason of reasons) {
        vi.clearAllMocks()
        mockSupabase._mockInsert.mockResolvedValue({ error: null })

        const { result } = renderHook(() =>
          useReportUser({
            currentUserId: mockCurrentUserId,
            targetUserId: mockTargetUserId,
          })
        )

        await act(async () => {
          await result.current.reportUser(reason)
        })

        expect(mockSupabase._mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({ reason })
        )
      }
    })
  })

  describe('Error handling', () => {
    it('should set error state on database error', async () => {
      mockSupabase._mockInsert.mockResolvedValue({
        error: { message: 'Database connection failed' },
      })

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment')
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should call onError callback on failure', async () => {
      const onError = vi.fn()
      const errorMessage = 'Network error'

      mockSupabase._mockInsert.mockResolvedValue({
        error: { message: errorMessage },
      })

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          onError,
        })
      )

      await act(async () => {
        await result.current.reportUser('spam')
      })

      expect(onError).toHaveBeenCalledWith(expect.any(String))
    })

    it('should handle unique constraint violation (already reported)', async () => {
      mockSupabase._mockInsert.mockResolvedValue({
        error: { code: '23505', message: 'Unique constraint violation' },
      })

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment')
      })

      expect(result.current.error).toBe('You have already reported this user for this reason')
    })

    it('should handle thrown exceptions', async () => {
      mockSupabase._mockInsert.mockRejectedValue(new Error('Unexpected error'))

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment')
      })

      expect(result.current.error).toBe('Unexpected error')
    })

    it('should handle non-Error thrown values', async () => {
      mockSupabase._mockInsert.mockRejectedValue('String error')

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('spam')
      })

      expect(result.current.error).toBe('Failed to submit report. Please try again.')
    })
  })

  describe('clearError function', () => {
    it('should clear the error state', async () => {
      mockSupabase._mockInsert.mockResolvedValue({
        error: { message: 'Some error' },
      })

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment')
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Duplicate operation prevention', () => {
    it('should prevent duplicate report operations', async () => {
      let resolveFirst: () => void = () => {}
      let callCount = 0

      mockSupabase._mockInsert.mockImplementation(() => {
        callCount++
        return new Promise((resolve) => {
          if (callCount === 1) {
            resolveFirst = () => resolve({ error: null })
          } else {
            resolve({ error: null })
          }
        })
      })

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      // Start first report operation
      act(() => {
        result.current.reportUser('harassment')
      })

      // Try to start second report operation while first is pending
      act(() => {
        result.current.reportUser('spam')
      })

      // Should only have one call
      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // Complete the first operation
      await act(async () => {
        resolveFirst()
      })

      // After completion, should be able to report again
      await act(async () => {
        await result.current.reportUser('spam')
      })

      expect(callCount).toBe(2)
    })
  })

  describe('Details handling', () => {
    it('should handle long details text', async () => {
      const longDetails = 'A'.repeat(500)

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('other', longDetails)
      })

      expect(mockSupabase._mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: longDetails,
        })
      )
    })

    it('should handle undefined details', async () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('spam', undefined)
      })

      expect(mockSupabase._mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: null,
        })
      )
    })

    it('should trim details with leading/trailing whitespace', async () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment', '  This is the report details  ')
      })

      expect(mockSupabase._mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          details: 'This is the report details',
        })
      )
    })
  })

  describe('Return value structure', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      expect(result.current).toHaveProperty('isReporting')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('reportUser')
      expect(result.current).toHaveProperty('clearError')

      // Verify types
      expect(typeof result.current.isReporting).toBe('boolean')
      expect(typeof result.current.reportUser).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('Edge cases', () => {
    it('should handle optional callbacks when not provided', async () => {
      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
          // No callbacks provided
        })
      )

      // Should not throw
      await act(async () => {
        await result.current.reportUser('spam')
      })

      expect(result.current.isReporting).toBe(false)
    })

    it('should reset isReporting even after error', async () => {
      mockSupabase._mockInsert.mockRejectedValue(new Error('Failed'))

      const { result } = renderHook(() =>
        useReportUser({
          currentUserId: mockCurrentUserId,
          targetUserId: mockTargetUserId,
        })
      )

      await act(async () => {
        await result.current.reportUser('harassment')
      })

      expect(result.current.isReporting).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })
})
