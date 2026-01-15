/**
 * useLocationHistory Hook
 *
 * Custom hook for fetching locations the user has visited in the past.
 * Uses Supabase RPC to get visited locations with their last visit timestamps.
 *
 * @example
 * ```tsx
 * function RecentPlaces() {
 *   const { locations, isLoading, error, refetch } = useLocationHistory(7) // Last 7 days
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (error) return <Text>{error}</Text>
 *
 *   return (
 *     <FlatList
 *       data={locations}
 *       renderItem={({ item }) => (
 *         <LocationCard
 *           name={item.name}
 *           lastVisited={item.last_visited_at}
 *         />
 *       )}
 *     />
 *   )
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Location } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Location with visit date information
 */
export interface LocationWithVisitDate extends Location {
  /** ISO timestamp of the last visit */
  last_visited_at: string
}

/**
 * Return value from useLocationHistory hook
 */
export interface UseLocationHistoryResult {
  /** Array of visited locations */
  locations: LocationWithVisitDate[]
  /** Whether data is loading */
  isLoading: boolean
  /** Any error that occurred */
  error: string | null
  /** Refresh data */
  refetch: () => Promise<void>
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default number of days to look back */
const DEFAULT_DAYS_BACK = 30

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for fetching the user's location visit history
 *
 * @param daysBack - Number of days to look back (default: 30)
 * @returns Locations array, loading state, error, and refetch function
 */
export function useLocationHistory(
  daysBack: number = DEFAULT_DAYS_BACK
): UseLocationHistoryResult {
  const { userId, isAuthenticated } = useAuth()

  // State
  const [locations, setLocations] = useState<LocationWithVisitDate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const isMountedRef = useRef(true)

  /**
   * Fetch location history from the database
   */
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      if (isMountedRef.current) {
        setLocations([])
        setIsLoading(false)
        setError(null)
      }
      return
    }

    try {
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('get_locations_visited_in_last_month', {
        p_user_id: userId,
      })

      if (rpcError) {
        if (isMountedRef.current) {
          setError(rpcError.message)
        }
        return
      }

      if (isMountedRef.current) {
        // Filter to daysBack if different from default (30 days)
        let filteredData = data ?? []

        if (daysBack !== DEFAULT_DAYS_BACK && filteredData.length > 0) {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - daysBack)

          filteredData = filteredData.filter((location: LocationWithVisitDate) => {
            const visitDate = new Date(location.last_visited_at)
            return visitDate >= cutoffDate
          })
        }

        setLocations(filteredData)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch location history')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [userId, isAuthenticated, daysBack])

  /**
   * Refresh data
   */
  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchData()
  }, [fetchData])

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true

    fetchData()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchData])

  return {
    locations,
    isLoading,
    error,
    refetch,
  }
}

export default useLocationHistory
