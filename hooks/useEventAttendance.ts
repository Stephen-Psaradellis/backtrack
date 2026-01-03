/**
 * useEventAttendance Hook
 *
 * Custom hook for managing event attendance (Going/Interested).
 * Provides methods to set attendance status and view attendees.
 *
 * Features:
 * - Set/remove attendance status
 * - Fetch event attendees
 * - Get user's attending events
 * - Optimistic UI updates
 * - Loading and error states
 *
 * @module hooks/useEventAttendance
 *
 * @example
 * ```tsx
 * function EventDetailScreen({ eventId }) {
 *   const {
 *     attendees,
 *     userStatus,
 *     goingCount,
 *     interestedCount,
 *     setAttendance,
 *     removeAttendance,
 *   } = useEventAttendance(eventId)
 *
 *   return (
 *     <View>
 *       <AttendanceButton
 *         status={userStatus}
 *         onGoing={() => setAttendance('going')}
 *         onInterested={() => setAttendance('interested')}
 *         onRemove={removeAttendance}
 *       />
 *       <AttendeesPreview attendees={attendees} count={goingCount} />
 *     </View>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// Types
// ============================================================================

/**
 * Attendance status values
 */
export type AttendanceStatus = 'interested' | 'going' | 'went' | 'skipped' | null

/**
 * Attendee information from the database
 */
export interface EventAttendee {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
  status: AttendanceStatus
  attended_at: string
}

/**
 * Event with attendance stats
 */
export interface EventWithStats {
  id: string
  title: string
  date_time: string
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  image_url: string | null
  user_status: AttendanceStatus
  going_count: number
  interested_count: number
  post_count: number
}

/**
 * Error type for attendance operations
 */
export interface AttendanceError {
  code: 'AUTH_ERROR' | 'FETCH_ERROR' | 'UPDATE_ERROR'
  message: string
}

/**
 * Options for the useEventAttendance hook
 */
export interface UseEventAttendanceOptions {
  /** Whether to fetch automatically on mount (default: true) */
  enabled?: boolean
  /** Maximum attendees to fetch */
  limit?: number
}

/**
 * Return value from useEventAttendance hook
 */
export interface UseEventAttendanceResult {
  /** List of attendees for the event */
  attendees: EventAttendee[]
  /** Current user's attendance status */
  userStatus: AttendanceStatus
  /** Number of users marked "going" */
  goingCount: number
  /** Number of users marked "interested" */
  interestedCount: number
  /** Whether data is loading */
  isLoading: boolean
  /** Whether an update is in progress */
  isUpdating: boolean
  /** Error object if any operation failed */
  error: AttendanceError | null
  /** Set attendance status (going, interested, etc.) */
  setAttendance: (status: 'going' | 'interested') => Promise<boolean>
  /** Remove attendance (un-RSVP) */
  removeAttendance: () => Promise<boolean>
  /** Toggle between going and not going */
  toggleGoing: () => Promise<boolean>
  /** Toggle between interested and not interested */
  toggleInterested: () => Promise<boolean>
  /** Refresh attendee data */
  refetch: () => Promise<void>
}

// ============================================================================
// Constants
// ============================================================================

const AUTH_ERROR_MESSAGE = 'You must be logged in to RSVP.'

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for managing event attendance.
 *
 * @param eventId - The event ID to manage attendance for
 * @param options - Configuration options
 * @returns Object containing attendance state and methods
 */
export function useEventAttendance(
  eventId: string,
  options: UseEventAttendanceOptions = {}
): UseEventAttendanceResult {
  const { enabled = true, limit = 20 } = options

  // ---------------------------------------------------------------------------
  // Auth Context
  // ---------------------------------------------------------------------------

  const { userId, isAuthenticated } = useAuth()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [userStatus, setUserStatus] = useState<AttendanceStatus>(null)
  const [goingCount, setGoingCount] = useState(0)
  const [interestedCount, setInterestedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<AttendanceError | null>(null)

  // ---------------------------------------------------------------------------
  // Supabase Client
  // ---------------------------------------------------------------------------

  // supabase imported from lib/supabase

  // ---------------------------------------------------------------------------
  // Fetch Operations
  // ---------------------------------------------------------------------------

  /**
   * Fetch event attendees and stats
   */
  const fetchAttendees = useCallback(async () => {
    if (!eventId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch attendees
      const { data: attendeesData, error: attendeesError } = await supabase.rpc(
        'get_event_attendees',
        {
          p_event_id: eventId,
          p_status: null,
          p_limit: limit,
        }
      )

      if (attendeesError) {
        console.error('Error fetching attendees:', attendeesError)
        setError({
          code: 'FETCH_ERROR',
          message: attendeesError.message,
        })
        return
      }

      setAttendees(attendeesData || [])

      // Calculate counts
      const going = (attendeesData || []).filter(
        (a: EventAttendee) => a.status === 'going'
      ).length
      const interested = (attendeesData || []).filter(
        (a: EventAttendee) => a.status === 'interested'
      ).length
      setGoingCount(going)
      setInterestedCount(interested)

      // Get user's status
      if (userId) {
        const userAttendee = (attendeesData || []).find(
          (a: EventAttendee) => a.user_id === userId
        )
        setUserStatus(userAttendee?.status || null)
      }
    } catch (err) {
      console.error('Error fetching attendees:', err)
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch attendees',
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, eventId, userId, limit])

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchAttendees()
  }, [fetchAttendees])

  // ---------------------------------------------------------------------------
  // Attendance Operations
  // ---------------------------------------------------------------------------

  /**
   * Set attendance status
   */
  const setAttendance = useCallback(
    async (status: 'going' | 'interested'): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError({
          code: 'AUTH_ERROR',
          message: AUTH_ERROR_MESSAGE,
        })
        return false
      }

      setIsUpdating(true)
      setError(null)

      // Optimistic update
      const previousStatus = userStatus
      setUserStatus(status)

      // Update counts optimistically
      if (previousStatus === 'going') setGoingCount((c) => c - 1)
      if (previousStatus === 'interested') setInterestedCount((c) => c - 1)
      if (status === 'going') setGoingCount((c) => c + 1)
      if (status === 'interested') setInterestedCount((c) => c + 1)

      try {
        const { error: rpcError } = await supabase.rpc('set_event_attendance', {
          p_user_id: userId,
          p_event_id: eventId,
          p_status: status,
        })

        if (rpcError) {
          // Rollback on error
          setUserStatus(previousStatus)
          if (previousStatus === 'going') setGoingCount((c) => c + 1)
          if (previousStatus === 'interested') setInterestedCount((c) => c + 1)
          if (status === 'going') setGoingCount((c) => c - 1)
          if (status === 'interested') setInterestedCount((c) => c - 1)

          setError({
            code: 'UPDATE_ERROR',
            message: rpcError.message,
          })
          return false
        }

        return true
      } catch (err) {
        // Rollback on error
        setUserStatus(previousStatus)
        if (previousStatus === 'going') setGoingCount((c) => c + 1)
        if (previousStatus === 'interested') setInterestedCount((c) => c + 1)
        if (status === 'going') setGoingCount((c) => c - 1)
        if (status === 'interested') setInterestedCount((c) => c - 1)

        setError({
          code: 'UPDATE_ERROR',
          message: err instanceof Error ? err.message : 'Failed to update attendance',
        })
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [supabase, eventId, userId, isAuthenticated, userStatus]
  )

  /**
   * Remove attendance (un-RSVP)
   */
  const removeAttendance = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !userId) {
      setError({
        code: 'AUTH_ERROR',
        message: AUTH_ERROR_MESSAGE,
      })
      return false
    }

    setIsUpdating(true)
    setError(null)

    // Optimistic update
    const previousStatus = userStatus
    setUserStatus(null)

    // Update counts optimistically
    if (previousStatus === 'going') setGoingCount((c) => c - 1)
    if (previousStatus === 'interested') setInterestedCount((c) => c - 1)

    try {
      const { error: rpcError } = await supabase.rpc('remove_event_attendance', {
        p_user_id: userId,
        p_event_id: eventId,
      })

      if (rpcError) {
        // Rollback on error
        setUserStatus(previousStatus)
        if (previousStatus === 'going') setGoingCount((c) => c + 1)
        if (previousStatus === 'interested') setInterestedCount((c) => c + 1)

        setError({
          code: 'UPDATE_ERROR',
          message: rpcError.message,
        })
        return false
      }

      return true
    } catch (err) {
      // Rollback on error
      setUserStatus(previousStatus)
      if (previousStatus === 'going') setGoingCount((c) => c + 1)
      if (previousStatus === 'interested') setInterestedCount((c) => c + 1)

      setError({
        code: 'UPDATE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to remove attendance',
      })
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [supabase, eventId, userId, isAuthenticated, userStatus])

  /**
   * Toggle going status
   */
  const toggleGoing = useCallback(async (): Promise<boolean> => {
    if (userStatus === 'going') {
      return removeAttendance()
    }
    return setAttendance('going')
  }, [userStatus, setAttendance, removeAttendance])

  /**
   * Toggle interested status
   */
  const toggleInterested = useCallback(async (): Promise<boolean> => {
    if (userStatus === 'interested') {
      return removeAttendance()
    }
    return setAttendance('interested')
  }, [userStatus, setAttendance, removeAttendance])

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * Fetch attendees on mount when enabled
   */
  useEffect(() => {
    if (!enabled || !eventId) {
      return
    }

    fetchAttendees()
  }, [enabled, eventId, fetchAttendees])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    attendees,
    userStatus,
    goingCount,
    interestedCount,
    isLoading,
    isUpdating,
    error,
    setAttendance,
    removeAttendance,
    toggleGoing,
    toggleInterested,
    refetch,
  }
}

// ============================================================================
// Additional Hook: User's Events
// ============================================================================

/**
 * Options for useUserEvents hook
 */
export interface UseUserEventsOptions {
  enabled?: boolean
  status?: 'going' | 'interested' | null
}

/**
 * Hook to get events the user is attending
 */
export function useUserEvents(options: UseUserEventsOptions = {}) {
  const { enabled = true, status = null } = options
  const { userId, isAuthenticated } = useAuth()
  // supabase imported from lib/supabase

  const [events, setEvents] = useState<EventWithStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AttendanceError | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setEvents([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_events', {
        p_user_id: userId,
        p_status: status,
      })

      if (rpcError) {
        setError({
          code: 'FETCH_ERROR',
          message: rpcError.message,
        })
        return
      }

      setEvents(data || [])
    } catch (err) {
      setError({
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch events',
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, userId, isAuthenticated, status])

  useEffect(() => {
    if (!enabled) return
    fetchEvents()
  }, [enabled, fetchEvents])

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
  }
}

// ============================================================================
// Exports
// ============================================================================

export default useEventAttendance
