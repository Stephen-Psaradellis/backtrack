'use client'

/**
 * useReportUser Hook
 *
 * Custom hook for reporting a user in a chat conversation including:
 * - Calling the report API endpoint (user_reports table)
 * - Handling loading and error states
 * - Providing callbacks for success and error notifications
 *
 * This hook extracts the user reporting logic from ChatScreen
 * for better separation of concerns and reusability.
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import type { UUID, ReportReason } from '../../../types/database'
import type { UseReportUserReturn } from '../../../types/chat'

/**
 * Options for the useReportUser hook
 */
export interface UseReportUserOptions {
  /** The ID of the user submitting the report (reporter) */
  currentUserId: UUID
  /** The ID of the user being reported */
  targetUserId: UUID
  /** Callback when user is successfully reported */
  onSuccess?: (reportedUserId: UUID) => void
  /** Callback when an error occurs */
  onError?: (error: string) => void
}

/**
 * useReportUser - Hook for reporting users with API integration
 *
 * @param options - Configuration options for the hook
 * @returns Object containing reporting state and control function
 *
 * @example
 * ```tsx
 * const { isReporting, error, reportUser, clearError } = useReportUser({
 *   currentUserId: 'user-123',
 *   targetUserId: 'user-456',
 *   onSuccess: (reportedUserId) => {
 *     console.log(`User ${reportedUserId} has been reported`)
 *     setShowReportModal(false)
 *   },
 *   onError: (error) => {
 *     console.error('Failed to report user:', error)
 *   },
 * })
 *
 * // Call reportUser when user submits the report form
 * const handleSubmitReport = () => {
 *   reportUser('harassment', 'Additional details about the incident...')
 * }
 *
 * <button onClick={handleSubmitReport} disabled={isReporting}>
 *   {isReporting ? 'Submitting...' : 'Submit Report'}
 * </button>
 *
 * // Display error if any
 * {error && <p className="error">{error}</p>}
 * ```
 */
export function useReportUser({
  currentUserId,
  targetUserId,
  onSuccess,
  onError,
}: UseReportUserOptions): UseReportUserReturn {
  // supabase imported from lib/supabase

  // ============================================================================
  // State
  // ============================================================================

  /** Whether a report operation is in progress */
  const [isReporting, setIsReporting] = useState(false)

  /** Error message if the report operation fails */
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // Refs
  // ============================================================================

  /** Prevent duplicate report operations */
  const isReportingRef = useRef(false)

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Report the target user
   *
   * This function:
   * 1. Inserts a record into the user_reports table
   * 2. Calls success callback on completion
   * 3. Sets error state if the operation fails
   *
   * @param reason - The reason for reporting the user
   * @param details - Optional additional details about the report
   */
  const reportUser = useCallback(
    async (reason: ReportReason, details?: string): Promise<void> => {
      // Prevent duplicate report operations
      if (isReportingRef.current || !targetUserId) {
        return
      }

      try {
        isReportingRef.current = true
        setIsReporting(true)
        setError(null)

        // Insert into user_reports table
        const { error: reportError } = await supabase
          .from('user_reports')
          .insert({
            reporter_id: currentUserId,
            reported_id: targetUserId,
            reason,
            details: details?.trim() || null,
          })

        if (reportError) {
          // Check for duplicate report attempt
          if (reportError.code === '23505') {
            // Unique constraint violation - already reported
            throw new Error('You have already reported this user for this reason')
          }
          throw reportError
        }

        // Call success callback
        if (onSuccess) {
          onSuccess(targetUserId)
        }
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : 'Failed to submit report. Please try again.'

        setError(errorMessage)

        if (onError) {
          onError(errorMessage)
        }
      } finally {
        isReportingRef.current = false
        setIsReporting(false)
      }
    },
    [currentUserId, onError, onSuccess, supabase, targetUserId]
  )

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isReporting,
    error,
    reportUser,
    clearError,
  }
}

export default useReportUser
