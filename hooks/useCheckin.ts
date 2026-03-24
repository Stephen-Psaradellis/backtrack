/**
 * useCheckin Hook
 *
 * Custom hook for managing user check-ins at locations.
 * Delegates to CheckinContext for shared state — all consumers see the same
 * activeCheckin, so GlobalHeader and CheckInButton stay in sync.
 *
 * @example
 * ```tsx
 * function LocationScreen({ locationId, locationName }) {
 *   const { activeCheckin, isCheckingIn, checkIn, checkOut, isCheckedInAt } = useCheckin()
 *
 *   const handlePress = async () => {
 *     if (isCheckedInAt(locationId)) {
 *       await checkOut(locationId)
 *     } else {
 *       await checkIn(locationId)
 *     }
 *   }
 *
 *   return (
 *     <Button onPress={handlePress} disabled={isCheckingIn}>
 *       {isCheckedInAt(locationId) ? 'Checked In' : 'Check In'}
 *     </Button>
 *   )
 * }
 * ```
 */

import type { ActiveCheckin } from '../types/database'
import { useCheckinContext } from '../contexts/CheckinContext'

// ============================================================================
// TYPES (kept here so existing imports from consumers don't break)
// ============================================================================

/**
 * GPS accuracy information from dynamic radius verification
 */
export interface AccuracyInfo {
  /** Reported GPS accuracy in meters */
  reported: number
  /** Accuracy status: 'excellent' | 'good' | 'fair' | 'poor' | 'suspicious' | 'defaulted' */
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'suspicious' | 'defaulted' | 'unknown'
  /** Calculated accuracy buffer in meters */
  buffer: number
  /** Formula used for calculation (only on new check-ins) */
  formula?: string
}

/**
 * Result of a check-in operation
 */
export interface CheckinResult {
  success: boolean
  checkinId: string | null
  verified: boolean
  alreadyCheckedIn: boolean
  distanceMeters: number | null
  /** Effective verification radius used (dynamic based on accuracy) */
  effectiveRadius: number | null
  /** GPS accuracy information */
  accuracyInfo: AccuracyInfo | null
  error: string | null
}

/**
 * Result of a check-out operation
 */
export interface CheckoutResult {
  success: boolean
  checkouts: number
  error: string | null
}

/**
 * Return value from useCheckin hook
 */
export interface UseCheckinResult {
  /** Current active check-in (if any) */
  activeCheckin: ActiveCheckin | null
  /** Whether a check-in operation is in progress */
  isCheckingIn: boolean
  /** Whether a check-out operation is in progress */
  isCheckingOut: boolean
  /** Whether the initial fetch is loading */
  isLoading: boolean
  /** Last error message */
  error: string | null
  /** Check in to a location */
  checkIn: (locationId: string) => Promise<CheckinResult>
  /** Check out from a location (or all if no locationId) */
  checkOut: (locationId?: string) => Promise<CheckoutResult>
  /** Fetch the current active check-in */
  getActiveCheckin: () => Promise<void>
  /** Check if user is checked in at a specific location */
  isCheckedInAt: (locationId: string) => boolean
  /** Clear error state */
  clearError: () => void
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing user check-ins at locations.
 * Thin wrapper over CheckinContext — all state is shared across consumers.
 */
export function useCheckin(): UseCheckinResult {
  return useCheckinContext()
}
