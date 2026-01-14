/**
 * Tests for lib/moderation.ts
 *
 * Tests user blocking and reporting functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase - use function factory
vi.mock('../supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  },
}))

import { supabase } from '../supabase'
import {
  validateBlockRequest,
  validateReportRequest,
  blockUser,
  unblockUser,
  isUserBlocked,
  hasBlockRelationship,
  getBlockedUserIds,
  getHiddenUserIds,
  getUserBlocks,
  submitReport,
  hasUserReported,
  getReportCount,
  MODERATION_ERRORS,
  REPORT_REASONS,
} from '../moderation'

describe('moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MODERATION_ERRORS', () => {
    it('should have required error messages', () => {
      expect(MODERATION_ERRORS.MISSING_USER_ID).toBeDefined()
      expect(MODERATION_ERRORS.MISSING_BLOCKED_ID).toBeDefined()
      expect(MODERATION_ERRORS.SELF_BLOCK).toBeDefined()
      expect(MODERATION_ERRORS.BLOCK_FAILED).toBeDefined()
      expect(MODERATION_ERRORS.UNBLOCK_FAILED).toBeDefined()
      expect(MODERATION_ERRORS.CHECK_FAILED).toBeDefined()
      expect(MODERATION_ERRORS.LIST_FAILED).toBeDefined()
      expect(MODERATION_ERRORS.MISSING_REPORT_TYPE).toBeDefined()
      expect(MODERATION_ERRORS.MISSING_REPORTED_ID).toBeDefined()
      expect(MODERATION_ERRORS.MISSING_REASON).toBeDefined()
      expect(MODERATION_ERRORS.REPORT_FAILED).toBeDefined()
      expect(MODERATION_ERRORS.SELF_REPORT).toBeDefined()
      expect(MODERATION_ERRORS.ALREADY_REPORTED).toBeDefined()
    })
  })

  describe('REPORT_REASONS', () => {
    it('should have required report reasons', () => {
      expect(REPORT_REASONS.SPAM).toBe('Spam or misleading')
      expect(REPORT_REASONS.HARASSMENT).toBe('Harassment or bullying')
      expect(REPORT_REASONS.INAPPROPRIATE).toBe('Inappropriate content')
      expect(REPORT_REASONS.IMPERSONATION).toBe('Impersonation')
      expect(REPORT_REASONS.VIOLENCE).toBe('Violence or dangerous behavior')
      expect(REPORT_REASONS.HATE_SPEECH).toBe('Hate speech')
      expect(REPORT_REASONS.OTHER).toBe('Other')
    })
  })

  describe('validateBlockRequest', () => {
    it('should return error for missing blocker ID', () => {
      const result = validateBlockRequest(null, 'user-2')
      expect(result).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing blocked ID', () => {
      const result = validateBlockRequest('user-1', null)
      expect(result).toBe(MODERATION_ERRORS.MISSING_BLOCKED_ID)
    })

    it('should return error for self-block', () => {
      const result = validateBlockRequest('user-1', 'user-1')
      expect(result).toBe(MODERATION_ERRORS.SELF_BLOCK)
    })

    it('should return null for valid request', () => {
      const result = validateBlockRequest('user-1', 'user-2')
      expect(result).toBeNull()
    })
  })

  describe('validateReportRequest', () => {
    it('should return error for missing reporter ID', () => {
      const result = validateReportRequest(null, 'post', 'post-1', 'reason')
      expect(result).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should return error for missing report type', () => {
      const result = validateReportRequest('user-1', null, 'post-1', 'reason')
      expect(result).toBe(MODERATION_ERRORS.MISSING_REPORT_TYPE)
    })

    it('should return error for missing reported ID', () => {
      const result = validateReportRequest('user-1', 'post', null, 'reason')
      expect(result).toBe(MODERATION_ERRORS.MISSING_REPORTED_ID)
    })

    it('should return error for missing reason', () => {
      const result = validateReportRequest('user-1', 'post', 'post-1', null)
      expect(result).toBe(MODERATION_ERRORS.MISSING_REASON)
    })

    it('should return error for empty reason', () => {
      const result = validateReportRequest('user-1', 'post', 'post-1', '   ')
      expect(result).toBe(MODERATION_ERRORS.MISSING_REASON)
    })

    it('should return error for self-report', () => {
      const result = validateReportRequest('user-1', 'user', 'user-1', 'reason')
      expect(result).toBe(MODERATION_ERRORS.SELF_REPORT)
    })

    it('should return null for valid request', () => {
      const result = validateReportRequest('user-1', 'post', 'post-1', 'spam')
      expect(result).toBeNull()
    })
  })

  describe('blockUser', () => {
    it('should return error for invalid request', async () => {
      const result = await blockUser(null, 'user-2')
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should block user successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never)

      const result = await blockUser('user-1', 'user-2')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(supabase.rpc).toHaveBeenCalledWith('block_user', {
        blocker: 'user-1',
        blocked: 'user-2',
      })
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await blockUser('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await blockUser('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('unblockUser', () => {
    it('should return error for invalid request', async () => {
      const result = await unblockUser('user-1', null)
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_BLOCKED_ID)
    })

    it('should unblock user successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never)

      const result = await unblockUser('user-1', 'user-2')

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(supabase.rpc).toHaveBeenCalledWith('unblock_user', {
        blocker: 'user-1',
        blocked: 'user-2',
      })
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await unblockUser('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('isUserBlocked', () => {
    it('should return error for invalid request', async () => {
      const result = await isUserBlocked('user-1', 'user-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.SELF_BLOCK)
    })

    it('should return true when user is blocked', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as never)

      const result = await isUserBlocked('user-1', 'user-2')

      expect(result.success).toBe(true)
      expect(result.isBlocked).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('is_user_blocked', {
        blocker: 'user-1',
        blocked: 'user-2',
      })
    })

    it('should return false when user is not blocked', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never)

      const result = await isUserBlocked('user-1', 'user-2')

      expect(result.success).toBe(true)
      expect(result.isBlocked).toBe(false)
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await isUserBlocked('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.isBlocked).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('hasBlockRelationship', () => {
    it('should return error for missing user IDs', async () => {
      const result = await hasBlockRelationship(null, 'user-2')
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should return true when block relationship exists', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as never)

      const result = await hasBlockRelationship('user-1', 'user-2')

      expect(result.success).toBe(true)
      expect(result.isBlocked).toBe(true)
    })

    it('should return false when no block relationship', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never)

      const result = await hasBlockRelationship('user-1', 'user-2')

      expect(result.success).toBe(true)
      expect(result.isBlocked).toBe(false)
    })
  })

  describe('getBlockedUserIds', () => {
    it('should return error for missing user ID', async () => {
      const result = await getBlockedUserIds(null)
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should return blocked user IDs', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: ['user-2', 'user-3'], error: null } as never)

      const result = await getBlockedUserIds('user-1')

      expect(result.success).toBe(true)
      expect(result.blockedUserIds).toEqual(['user-2', 'user-3'])
    })

    it('should return empty array when no blocks', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never)

      const result = await getBlockedUserIds('user-1')

      expect(result.success).toBe(true)
      expect(result.blockedUserIds).toEqual([])
    })
  })

  describe('getHiddenUserIds', () => {
    it('should return error for missing user ID', async () => {
      const result = await getHiddenUserIds(null)
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should return hidden user IDs', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: ['user-2', 'user-3', 'user-4'], error: null } as never)

      const result = await getHiddenUserIds('user-1')

      expect(result.success).toBe(true)
      expect(result.hiddenUserIds).toEqual(['user-2', 'user-3', 'user-4'])
    })
  })

  describe('getUserBlocks', () => {
    it('should return error for missing user ID', async () => {
      const result = await getUserBlocks(null)
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })
  })

  describe('submitReport', () => {
    it('should return error for invalid request', async () => {
      const result = await submitReport(null, 'post', 'post-1', 'spam')
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should return error if already reported', async () => {
      // First call is hasUserReported check
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as never)

      const result = await submitReport('user-1', 'post', 'post-1', 'spam')

      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.ALREADY_REPORTED)
    })

    it('should submit report successfully', async () => {
      // hasUserReported returns false
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never)
      // submit_report returns report ID
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: 'report-123', error: null } as never)

      const result = await submitReport('user-1', 'post', 'post-1', 'spam', 'additional details')

      expect(result.success).toBe(true)
      expect(result.reportId).toBe('report-123')
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never)
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await submitReport('user-1', 'post', 'post-1', 'spam')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('hasUserReported', () => {
    it('should return error for missing params', async () => {
      const result = await hasUserReported(null, 'post', 'post-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should return true when already reported', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as never)

      const result = await hasUserReported('user-1', 'post', 'post-1')

      expect(result.success).toBe(true)
      expect(result.hasReported).toBe(true)
    })

    it('should return false when not reported', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never)

      const result = await hasUserReported('user-1', 'post', 'post-1')

      expect(result.success).toBe(true)
      expect(result.hasReported).toBe(false)
    })
  })

  describe('getReportCount', () => {
    it('should return report count', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: 5, error: null } as never)

      const result = await getReportCount('post', 'post-1')

      expect(result.success).toBe(true)
      expect(result.count).toBe(5)
    })

    it('should return 0 for no reports', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never)

      const result = await getReportCount('post', 'post-1')

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await getReportCount('post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe('Database error')
    })

    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await getReportCount('post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await getReportCount('post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.count).toBe(0)
      expect(result.error).toBe(MODERATION_ERRORS.CHECK_FAILED)
    })
  })

  describe('unblockUser extended tests', () => {
    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await unblockUser('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await unblockUser('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.UNBLOCK_FAILED)
    })
  })

  describe('isUserBlocked extended tests', () => {
    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await isUserBlocked('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.isBlocked).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await isUserBlocked('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.isBlocked).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.CHECK_FAILED)
    })
  })

  describe('hasBlockRelationship extended tests', () => {
    it('should return error for missing second user ID', async () => {
      const result = await hasBlockRelationship('user-1', null)
      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.MISSING_USER_ID)
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await hasBlockRelationship('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await hasBlockRelationship('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await hasBlockRelationship('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.CHECK_FAILED)
    })
  })

  describe('getBlockedUserIds extended tests', () => {
    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await getBlockedUserIds('user-1')

      expect(result.success).toBe(false)
      expect(result.blockedUserIds).toEqual([])
      expect(result.error).toBe('Database error')
    })

    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await getBlockedUserIds('user-1')

      expect(result.success).toBe(false)
      expect(result.blockedUserIds).toEqual([])
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await getBlockedUserIds('user-1')

      expect(result.success).toBe(false)
      expect(result.blockedUserIds).toEqual([])
      expect(result.error).toBe(MODERATION_ERRORS.LIST_FAILED)
    })
  })

  describe('getHiddenUserIds extended tests', () => {
    it('should return empty array when data is null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never)

      const result = await getHiddenUserIds('user-1')

      expect(result.success).toBe(true)
      expect(result.hiddenUserIds).toEqual([])
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await getHiddenUserIds('user-1')

      expect(result.success).toBe(false)
      expect(result.hiddenUserIds).toEqual([])
      expect(result.error).toBe('Database error')
    })

    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await getHiddenUserIds('user-1')

      expect(result.success).toBe(false)
      expect(result.hiddenUserIds).toEqual([])
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await getHiddenUserIds('user-1')

      expect(result.success).toBe(false)
      expect(result.hiddenUserIds).toEqual([])
      expect(result.error).toBe(MODERATION_ERRORS.LIST_FAILED)
    })
  })

  describe('blockUser extended tests', () => {
    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await blockUser('user-1', 'user-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.BLOCK_FAILED)
    })
  })

  describe('hasUserReported extended tests', () => {
    it('should handle database error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'Database error' } } as never)

      const result = await hasUserReported('user-1', 'post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.hasReported).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('should handle exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await hasUserReported('user-1', 'post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.hasReported).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await hasUserReported('user-1', 'post', 'post-1')

      expect(result.success).toBe(false)
      expect(result.hasReported).toBe(false)
      expect(result.error).toBe(MODERATION_ERRORS.CHECK_FAILED)
    })
  })

  describe('submitReport extended tests', () => {
    it('should handle exception during submit_report call', async () => {
      // First RPC call (hasUserReported) succeeds with not reported
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never)
      // Second RPC call (submit_report) throws exception
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network error'))

      const result = await submitReport('user-1', 'post', 'post-1', 'spam')

      expect(result.success).toBe(false)
      expect(result.reportId).toBeNull()
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception during submit_report call', async () => {
      // First RPC call (hasUserReported) succeeds with not reported
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never)
      // Second RPC call (submit_report) throws non-Error exception
      vi.mocked(supabase.rpc).mockRejectedValueOnce('String error')

      const result = await submitReport('user-1', 'post', 'post-1', 'spam')

      expect(result.success).toBe(false)
      expect(result.reportId).toBeNull()
      expect(result.error).toBe(MODERATION_ERRORS.REPORT_FAILED)
    })
  })

  describe('getUserBlocks extended tests', () => {
    it('should return blocks successfully', async () => {
      const mockBlocks = [
        { id: 'block-1', blocker_id: 'user-1', blocked_id: 'user-2', created_at: '2024-01-01' },
        { id: 'block-2', blocker_id: 'user-1', blocked_id: 'user-3', created_at: '2024-01-02' },
      ]
      // Mock the from chain properly
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockBlocks, error: null }),
          }),
        }),
      } as never)

      const result = await getUserBlocks('user-1')

      expect(result.success).toBe(true)
      expect(result.blocks).toEqual(mockBlocks)
    })

    it('should handle database error', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
          }),
        }),
      } as never)

      const result = await getUserBlocks('user-1')

      expect(result.success).toBe(false)
      expect(result.blocks).toEqual([])
      expect(result.error).toBe('Database error')
    })

    it('should handle exception', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => {
        throw new Error('Network error')
      })

      const result = await getUserBlocks('user-1')

      expect(result.success).toBe(false)
      expect(result.blocks).toEqual([])
      expect(result.error).toBe('Network error')
    })

    it('should handle non-Error exception', async () => {
      vi.mocked(supabase.from).mockImplementationOnce(() => {
        throw 'String error'
      })

      const result = await getUserBlocks('user-1')

      expect(result.success).toBe(false)
      expect(result.blocks).toEqual([])
      expect(result.error).toBe(MODERATION_ERRORS.LIST_FAILED)
    })

    it('should return empty array when data is null', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as never)

      const result = await getUserBlocks('user-1')

      expect(result.success).toBe(true)
      expect(result.blocks).toEqual([])
    })
  })
})
