/**
 * Account Deletion Service
 *
 * Provides GDPR/CCPA compliant account deletion functionality.
 * Required for Apple App Store and Google Play Store compliance.
 *
 * Features:
 * - Schedule account deletion with grace period
 * - Cancel scheduled deletion
 * - Check deletion status
 * - Immediate deletion (for testing/admin)
 *
 * @example
 * ```typescript
 * import { scheduleAccountDeletion, cancelAccountDeletion } from './accountDeletion'
 *
 * // Schedule deletion with 7-day grace period
 * const result = await scheduleAccountDeletion('User requested')
 * if (result.success) {
 *   console.log('Deletion scheduled for:', result.scheduledFor)
 * }
 *
 * // Cancel if user changes mind
 * await cancelAccountDeletion()
 * ```
 */

import { supabase } from './supabase'
import { trackEvent, AnalyticsEvent, resetAnalytics } from './analytics'

// ============================================================================
// Types
// ============================================================================

export interface DeletionResult {
  success: boolean
  message: string
  error?: string
}

export interface ScheduleDeletionResult extends DeletionResult {
  scheduledFor?: string
  graceDays?: number
}

export interface DeletionStatus {
  scheduled: boolean
  scheduledFor?: string
  daysRemaining?: number
  reason?: string
}

export interface DeleteAccountResult extends DeletionResult {
  deletedCounts?: Record<string, number>
}

// ============================================================================
// Constants
// ============================================================================

/** Default grace period in days before account is deleted */
export const DEFAULT_GRACE_DAYS = 7

/** Minimum grace period allowed */
export const MIN_GRACE_DAYS = 1

/** Maximum grace period allowed */
export const MAX_GRACE_DAYS = 30

// ============================================================================
// Functions
// ============================================================================

/**
 * Schedule account deletion with a grace period.
 * User can cancel during this period.
 *
 * @param reason - Optional reason for deletion
 * @param graceDays - Number of days before deletion (default: 7)
 * @returns Result with scheduled date
 */
export async function scheduleAccountDeletion(
  reason?: string,
  graceDays: number = DEFAULT_GRACE_DAYS
): Promise<ScheduleDeletionResult> {
  try {
    // Validate grace days
    const validGraceDays = Math.max(
      MIN_GRACE_DAYS,
      Math.min(MAX_GRACE_DAYS, graceDays)
    )

    const { data, error } = await supabase.rpc('schedule_account_deletion', {
      p_reason: reason || null,
      p_grace_days: validGraceDays,
    })

    if (error) {
      console.error('[AccountDeletion] Failed to schedule deletion:', error)
      return {
        success: false,
        message: 'Failed to schedule account deletion',
        error: error.message,
      }
    }

    return {
      success: data?.success ?? false,
      message: data?.message ?? 'Account deletion scheduled',
      scheduledFor: data?.scheduled_for,
      graceDays: data?.grace_days,
    }
  } catch (error) {
    console.error('[AccountDeletion] Unexpected error:', error)
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cancel a scheduled account deletion.
 * Only works if deletion hasn't been executed yet.
 *
 * @returns Result indicating success or failure
 */
export async function cancelAccountDeletion(): Promise<DeletionResult> {
  try {
    const { data, error } = await supabase.rpc('cancel_account_deletion')

    if (error) {
      console.error('[AccountDeletion] Failed to cancel deletion:', error)
      return {
        success: false,
        message: 'Failed to cancel account deletion',
        error: error.message,
      }
    }

    return {
      success: data?.success ?? false,
      message: data?.message ?? 'Account deletion cancelled',
    }
  } catch (error) {
    console.error('[AccountDeletion] Unexpected error:', error)
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the current deletion status for the authenticated user.
 *
 * @returns Deletion status including scheduled date if applicable
 */
export async function getDeletionStatus(): Promise<DeletionStatus> {
  try {
    const { data, error } = await supabase.rpc('get_deletion_status')

    if (error) {
      console.error('[AccountDeletion] Failed to get status:', error)
      return { scheduled: false }
    }

    return {
      scheduled: data?.scheduled ?? false,
      scheduledFor: data?.scheduled_for,
      daysRemaining: data?.days_remaining,
      reason: data?.reason,
    }
  } catch (error) {
    console.error('[AccountDeletion] Unexpected error:', error)
    return { scheduled: false }
  }
}

/**
 * Immediately delete the account and all associated data.
 * This is irreversible and should only be used after confirmation.
 *
 * Note: This deletes all user data but the auth.users record
 * must be deleted via Supabase Admin API separately.
 *
 * @param userId - The user ID to delete
 * @returns Result with counts of deleted records
 */
export async function deleteAccountImmediately(
  userId: string
): Promise<DeleteAccountResult> {
  // Perform deletion first
  let deletionData: { success: boolean; message?: string; deleted_counts?: Record<string, number>; error?: string } | null = null

  try {
    const { data, error } = await supabase.rpc('delete_user_account', {
      p_user_id: userId,
    })

    if (error) {
      console.error('[AccountDeletion] Failed to delete account:', error)
      return {
        success: false,
        message: 'Failed to delete account',
        error: error.message,
      }
    }

    if (!data?.success) {
      return {
        success: false,
        message: data?.error || 'Failed to delete account',
        error: data?.error,
      }
    }

    deletionData = data
  } catch (error) {
    console.error('[AccountDeletion] Unexpected error:', error)
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Analytics errors should not affect the deletion result
  // The account is already deleted at this point
  try {
    trackEvent(AnalyticsEvent.ACCOUNT_DELETED)
    await resetAnalytics()
  } catch (analyticsError) {
    console.warn('[AccountDeletion] Analytics failed after successful deletion:', analyticsError)
    // Continue - deletion succeeded, analytics is non-critical
  }

  return {
    success: true,
    message: deletionData?.message ?? 'Account deleted successfully',
    deletedCounts: deletionData?.deleted_counts,
  }
}

/**
 * Delete account immediately and sign out.
 * Combines data deletion with auth signout.
 *
 * @param userId - The user ID to delete
 * @returns Result indicating success or failure
 */
export async function deleteAccountAndSignOut(
  userId: string
): Promise<DeleteAccountResult> {
  // First delete all user data
  const deleteResult = await deleteAccountImmediately(userId)

  if (!deleteResult.success) {
    return deleteResult
  }

  // Then sign out
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.warn('[AccountDeletion] Sign out failed after deletion:', error)
    // Don't fail the overall operation - data is already deleted
  }

  return deleteResult
}

// ============================================================================
// Exports
// ============================================================================

export default {
  scheduleAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
  deleteAccountImmediately,
  deleteAccountAndSignOut,
  DEFAULT_GRACE_DAYS,
  MIN_GRACE_DAYS,
  MAX_GRACE_DAYS,
}
