/**
 * Moderation Utilities
 *
 * Handles user blocking and moderation functionality for the Backtrack app.
 * This module provides functions to block/unblock users and check block status.
 *
 * BLOCKING BEHAVIOR:
 * 1. When a user is blocked, all conversations between them are deactivated
 * 2. Blocked users' content becomes invisible to the blocker
 * 3. Block relationships are mutual for visibility (if A blocks B, both see nothing)
 * 4. Users can unblock at any time, but conversations remain deactivated
 *
 * @example
 * ```tsx
 * import { blockUser, unblockUser, isUserBlocked } from 'lib/moderation'
 *
 * // Block a user from a chat
 * const result = await blockUser(myUserId, otherUserId)
 * if (result.success) {
 *   navigation.goBack()
 * }
 *
 * // Check if blocked
 * const blocked = await isUserBlocked(myUserId, otherUserId)
 * ```
 */

import { supabase } from './supabase'
import type { Block, ReportedType } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result from a block operation
 */
export interface BlockResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from checking block status
 */
export interface BlockStatusResult {
  /** Whether the check was successful */
  success: boolean
  /** Whether the user is blocked */
  isBlocked: boolean
  /** Error message if check failed */
  error: string | null
}

/**
 * Result from getting blocked user IDs
 */
export interface BlockedUsersResult {
  /** Whether the operation was successful */
  success: boolean
  /** List of blocked user IDs */
  blockedUserIds: string[]
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from getting hidden user IDs (blocked + blockers)
 */
export interface HiddenUsersResult {
  /** Whether the operation was successful */
  success: boolean
  /** List of user IDs whose content should be hidden */
  hiddenUserIds: string[]
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from submitting a report
 */
export interface ReportResult {
  /** Whether the operation was successful */
  success: boolean
  /** ID of the created report (if successful) */
  reportId: string | null
  /** Error message if operation failed */
  error: string | null
}

/**
 * Result from checking if user has already reported
 */
export interface HasReportedResult {
  /** Whether the check was successful */
  success: boolean
  /** Whether the user has already reported this content */
  hasReported: boolean
  /** Error message if check failed */
  error: string | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Error messages for moderation operations
 */
export const MODERATION_ERRORS = {
  MISSING_USER_ID: 'User ID is required.',
  MISSING_BLOCKED_ID: 'ID of user to block is required.',
  SELF_BLOCK: 'You cannot block yourself.',
  BLOCK_FAILED: 'Failed to block user. Please try again.',
  UNBLOCK_FAILED: 'Failed to unblock user. Please try again.',
  CHECK_FAILED: 'Failed to check block status.',
  LIST_FAILED: 'Failed to get blocked users list.',
  MISSING_REPORT_TYPE: 'Report type is required.',
  MISSING_REPORTED_ID: 'Content ID is required.',
  MISSING_REASON: 'A reason for reporting is required.',
  REPORT_FAILED: 'Failed to submit report. Please try again.',
  SELF_REPORT: 'You cannot report yourself.',
  ALREADY_REPORTED: 'You have already reported this content.',
} as const

/**
 * Valid report reasons for the app
 */
export const REPORT_REASONS = {
  SPAM: 'Spam or misleading',
  HARASSMENT: 'Harassment or bullying',
  INAPPROPRIATE: 'Inappropriate content',
  IMPERSONATION: 'Impersonation',
  VIOLENCE: 'Violence or dangerous behavior',
  HATE_SPEECH: 'Hate speech',
  OTHER: 'Other',
} as const

export type ReportReason = typeof REPORT_REASONS[keyof typeof REPORT_REASONS]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate block request parameters
 *
 * @param blockerId - The user doing the blocking
 * @param blockedId - The user being blocked
 * @returns Error message if invalid, null if valid
 */
export function validateBlockRequest(
  blockerId: string | null | undefined,
  blockedId: string | null | undefined
): string | null {
  if (!blockerId) {
    return MODERATION_ERRORS.MISSING_USER_ID
  }

  if (!blockedId) {
    return MODERATION_ERRORS.MISSING_BLOCKED_ID
  }

  if (blockerId === blockedId) {
    return MODERATION_ERRORS.SELF_BLOCK
  }

  return null
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Block a user
 *
 * Creates a block record and deactivates any conversations between the users.
 * The database function `block_user()` handles the conversation deactivation.
 *
 * @param blockerId - The user ID doing the blocking
 * @param blockedId - The user ID being blocked
 * @returns Result indicating success or failure
 *
 * @example
 * const result = await blockUser(myUserId, otherUserId)
 * if (result.success) {
 *   Alert.alert('User Blocked', 'You will no longer see content from this user.')
 * }
 */
export async function blockUser(
  blockerId: string | null | undefined,
  blockedId: string | null | undefined
): Promise<BlockResult> {
  // Validate inputs
  const validationError = validateBlockRequest(blockerId, blockedId)
  if (validationError) {
    return {
      success: false,
      error: validationError,
    }
  }

  try {
    // Call the database function that handles block creation and conversation deactivation
    const { error } = await supabase.rpc('block_user', {
      blocker: blockerId as string,
      blocked: blockedId as string,
    })

    if (error) {
      return {
        success: false,
        error: error.message || MODERATION_ERRORS.BLOCK_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.BLOCK_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Unblock a user
 *
 * Removes the block record. Note: Conversations that were deactivated
 * during blocking will remain deactivated.
 *
 * @param blockerId - The user ID who created the block
 * @param blockedId - The user ID who was blocked
 * @returns Result indicating success or failure
 *
 * @example
 * const result = await unblockUser(myUserId, otherUserId)
 * if (result.success) {
 *   Alert.alert('User Unblocked', 'You can now see content from this user.')
 * }
 */
export async function unblockUser(
  blockerId: string | null | undefined,
  blockedId: string | null | undefined
): Promise<BlockResult> {
  // Validate inputs
  const validationError = validateBlockRequest(blockerId, blockedId)
  if (validationError) {
    return {
      success: false,
      error: validationError,
    }
  }

  try {
    // Call the database function to remove the block
    const { error } = await supabase.rpc('unblock_user', {
      blocker: blockerId as string,
      blocked: blockedId as string,
    })

    if (error) {
      return {
        success: false,
        error: error.message || MODERATION_ERRORS.UNBLOCK_FAILED,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.UNBLOCK_FAILED
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Check if user A has blocked user B
 *
 * @param blockerId - The potential blocker
 * @param blockedId - The potentially blocked user
 * @returns Whether the block exists
 *
 * @example
 * const result = await isUserBlocked(myUserId, otherUserId)
 * if (result.isBlocked) {
 *   console.log('You have blocked this user')
 * }
 */
export async function isUserBlocked(
  blockerId: string | null | undefined,
  blockedId: string | null | undefined
): Promise<BlockStatusResult> {
  // Validate inputs
  const validationError = validateBlockRequest(blockerId, blockedId)
  if (validationError) {
    return {
      success: false,
      isBlocked: false,
      error: validationError,
    }
  }

  try {
    const { data, error } = await supabase.rpc('is_user_blocked', {
      blocker: blockerId as string,
      blocked: blockedId as string,
    })

    if (error) {
      return {
        success: false,
        isBlocked: false,
        error: error.message || MODERATION_ERRORS.CHECK_FAILED,
      }
    }

    return {
      success: true,
      isBlocked: data === true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.CHECK_FAILED
    return {
      success: false,
      isBlocked: false,
      error: message,
    }
  }
}

/**
 * Check if there is any block relationship between two users
 * (either one has blocked the other)
 *
 * @param userA - First user ID
 * @param userB - Second user ID
 * @returns Whether any block exists between them
 *
 * @example
 * const result = await hasBlockRelationship(userA, userB)
 * if (result.isBlocked) {
 *   // Don't show content between these users
 * }
 */
export async function hasBlockRelationship(
  userA: string | null | undefined,
  userB: string | null | undefined
): Promise<BlockStatusResult> {
  // Validate inputs
  if (!userA || !userB) {
    return {
      success: false,
      isBlocked: false,
      error: MODERATION_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    const { data, error } = await supabase.rpc('has_block_relationship', {
      user_a: userA,
      user_b: userB,
    })

    if (error) {
      return {
        success: false,
        isBlocked: false,
        error: error.message || MODERATION_ERRORS.CHECK_FAILED,
      }
    }

    return {
      success: true,
      isBlocked: data === true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.CHECK_FAILED
    return {
      success: false,
      isBlocked: false,
      error: message,
    }
  }
}

/**
 * Get all user IDs that the current user has blocked
 *
 * @param userId - The user whose block list to retrieve
 * @returns List of blocked user IDs
 *
 * @example
 * const result = await getBlockedUserIds(myUserId)
 * if (result.success) {
 *   // Filter out blocked users from list
 *   const filteredPosts = posts.filter(p => !result.blockedUserIds.includes(p.producer_id))
 * }
 */
export async function getBlockedUserIds(
  userId: string | null | undefined
): Promise<BlockedUsersResult> {
  if (!userId) {
    return {
      success: false,
      blockedUserIds: [],
      error: MODERATION_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_blocked_user_ids', {
      user_id: userId,
    })

    if (error) {
      return {
        success: false,
        blockedUserIds: [],
        error: error.message || MODERATION_ERRORS.LIST_FAILED,
      }
    }

    return {
      success: true,
      blockedUserIds: (data as string[]) || [],
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.LIST_FAILED
    return {
      success: false,
      blockedUserIds: [],
      error: message,
    }
  }
}

/**
 * Get all user IDs whose content should be hidden from the current user
 * (users they've blocked + users who have blocked them)
 *
 * This is the primary function for content filtering.
 *
 * @param userId - The user whose hidden list to retrieve
 * @returns List of user IDs to hide content from
 *
 * @example
 * const result = await getHiddenUserIds(myUserId)
 * if (result.success) {
 *   // Filter out all content from hidden users
 *   const visiblePosts = posts.filter(p => !result.hiddenUserIds.includes(p.producer_id))
 * }
 */
export async function getHiddenUserIds(
  userId: string | null | undefined
): Promise<HiddenUsersResult> {
  if (!userId) {
    return {
      success: false,
      hiddenUserIds: [],
      error: MODERATION_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_hidden_user_ids', {
      user_id: userId,
    })

    if (error) {
      return {
        success: false,
        hiddenUserIds: [],
        error: error.message || MODERATION_ERRORS.LIST_FAILED,
      }
    }

    return {
      success: true,
      hiddenUserIds: (data as string[]) || [],
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.LIST_FAILED
    return {
      success: false,
      hiddenUserIds: [],
      error: message,
    }
  }
}

/**
 * Get list of blocks created by a user (for profile/settings display)
 *
 * @param userId - The user whose blocks to retrieve
 * @returns List of block records
 */
export async function getUserBlocks(
  userId: string | null | undefined
): Promise<{
  success: boolean
  blocks: Block[]
  error: string | null
}> {
  if (!userId) {
    return {
      success: false,
      blocks: [],
      error: MODERATION_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        blocks: [],
        error: error.message || MODERATION_ERRORS.LIST_FAILED,
      }
    }

    return {
      success: true,
      blocks: (data as Block[]) || [],
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.LIST_FAILED
    return {
      success: false,
      blocks: [],
      error: message,
    }
  }
}

// ============================================================================
// REPORT FUNCTIONS
// ============================================================================

/**
 * Validate report request parameters
 *
 * @param reporterId - The user submitting the report
 * @param reportedType - Type of content being reported
 * @param reportedId - ID of the content being reported
 * @param reason - Reason for the report
 * @returns Error message if invalid, null if valid
 */
export function validateReportRequest(
  reporterId: string | null | undefined,
  reportedType: ReportedType | null | undefined,
  reportedId: string | null | undefined,
  reason: string | null | undefined
): string | null {
  if (!reporterId) {
    return MODERATION_ERRORS.MISSING_USER_ID
  }

  if (!reportedType) {
    return MODERATION_ERRORS.MISSING_REPORT_TYPE
  }

  if (!reportedId) {
    return MODERATION_ERRORS.MISSING_REPORTED_ID
  }

  if (!reason || reason.trim().length === 0) {
    return MODERATION_ERRORS.MISSING_REASON
  }

  // Prevent self-reporting for user type
  if (reportedType === 'user' && reporterId === reportedId) {
    return MODERATION_ERRORS.SELF_REPORT
  }

  return null
}

/**
 * Submit a report for content moderation
 *
 * Reports are submitted to the database for moderator review.
 * Users can report posts, messages, or other users.
 *
 * @param reporterId - The user submitting the report
 * @param reportedType - Type of content: 'post', 'message', or 'user'
 * @param reportedId - ID of the reported content/user
 * @param reason - Primary reason for the report
 * @param additionalDetails - Optional additional context
 * @returns Result indicating success or failure with report ID
 *
 * @example
 * const result = await submitReport(myUserId, 'post', postId, 'Spam or misleading')
 * if (result.success) {
 *   Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.')
 * }
 */
export async function submitReport(
  reporterId: string | null | undefined,
  reportedType: ReportedType | null | undefined,
  reportedId: string | null | undefined,
  reason: string | null | undefined,
  additionalDetails?: string | null
): Promise<ReportResult> {
  // Validate inputs
  const validationError = validateReportRequest(reporterId, reportedType, reportedId, reason)
  if (validationError) {
    return {
      success: false,
      reportId: null,
      error: validationError,
    }
  }

  try {
    // Check if user has already reported this content
    const hasReportedResult = await hasUserReported(
      reporterId as string,
      reportedType as ReportedType,
      reportedId as string
    )

    if (hasReportedResult.hasReported) {
      return {
        success: false,
        reportId: null,
        error: MODERATION_ERRORS.ALREADY_REPORTED,
      }
    }

    // Submit the report using the database function
    const { data, error } = await supabase.rpc('submit_report', {
      p_reporter_id: reporterId as string,
      p_reported_type: reportedType as string,
      p_reported_id: reportedId as string,
      p_reason: (reason as string).trim(),
      p_additional_details: additionalDetails?.trim() || null,
    })

    if (error) {
      return {
        success: false,
        reportId: null,
        error: error.message || MODERATION_ERRORS.REPORT_FAILED,
      }
    }

    return {
      success: true,
      reportId: data as string,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.REPORT_FAILED
    return {
      success: false,
      reportId: null,
      error: message,
    }
  }
}

/**
 * Check if the current user has already reported a specific piece of content
 *
 * @param reporterId - The user to check
 * @param reportedType - Type of content
 * @param reportedId - ID of the content
 * @returns Whether the user has already reported this content
 *
 * @example
 * const result = await hasUserReported(myUserId, 'post', postId)
 * if (result.hasReported) {
 *   console.log('You have already reported this content')
 * }
 */
export async function hasUserReported(
  reporterId: string | null | undefined,
  reportedType: ReportedType | null | undefined,
  reportedId: string | null | undefined
): Promise<HasReportedResult> {
  if (!reporterId || !reportedType || !reportedId) {
    return {
      success: false,
      hasReported: false,
      error: MODERATION_ERRORS.MISSING_USER_ID,
    }
  }

  try {
    const { data, error } = await supabase.rpc('has_user_reported', {
      p_reporter_id: reporterId,
      p_reported_type: reportedType,
      p_reported_id: reportedId,
    })

    if (error) {
      return {
        success: false,
        hasReported: false,
        error: error.message || MODERATION_ERRORS.CHECK_FAILED,
      }
    }

    return {
      success: true,
      hasReported: data === true,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.CHECK_FAILED
    return {
      success: false,
      hasReported: false,
      error: message,
    }
  }
}

/**
 * Get the count of reports for a specific piece of content
 *
 * @param reportedType - Type of content
 * @param reportedId - ID of the content
 * @returns Number of reports (non-dismissed) for the content
 */
export async function getReportCount(
  reportedType: ReportedType,
  reportedId: string
): Promise<{
  success: boolean
  count: number
  error: string | null
}> {
  try {
    const { data, error } = await supabase.rpc('get_report_count', {
      p_reported_type: reportedType,
      p_reported_id: reportedId,
    })

    if (error) {
      return {
        success: false,
        count: 0,
        error: error.message || MODERATION_ERRORS.CHECK_FAILED,
      }
    }

    return {
      success: true,
      count: (data as number) || 0,
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : MODERATION_ERRORS.CHECK_FAILED
    return {
      success: false,
      count: 0,
      error: message,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const moderationApi = {
  blockUser,
  unblockUser,
  isUserBlocked,
  hasBlockRelationship,
  getBlockedUserIds,
  getHiddenUserIds,
  getUserBlocks,
  validateBlockRequest,
  submitReport,
  hasUserReported,
  getReportCount,
  validateReportRequest,
  MODERATION_ERRORS,
  REPORT_REASONS,
}

export default moderationApi
