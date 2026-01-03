/**
 * Location Streaks Types
 *
 * Type definitions for the location streaks gamification system.
 * Tracks daily, weekly, and monthly visit patterns to locations.
 *
 * @module types/streaks
 */

// ============================================================================
// STREAK TYPES
// ============================================================================

/**
 * Streak type enumeration
 */
export type StreakType = 'daily' | 'weekly' | 'monthly'

/**
 * Location streak record tracking visit patterns
 */
export interface LocationStreak {
  /** Unique identifier for the streak record */
  id: string
  /** User who owns this streak */
  user_id: string
  /** Location this streak is for */
  location_id: string
  /** Type of streak (daily, weekly, monthly) */
  streak_type: StreakType
  /** Current consecutive period count */
  current_streak: number
  /** All-time longest streak */
  longest_streak: number
  /** Period string of last visit */
  last_visit_period: string | null
  /** Total number of visits to this location */
  total_visits: number
  /** When the current streak began */
  started_at: string | null
  /** When the streak was last updated */
  updated_at: string
}

/**
 * Location streak with location details (from view/join)
 */
export interface LocationStreakWithDetails extends LocationStreak {
  /** Name of the location */
  location_name: string
  /** Address of the location */
  location_address: string | null
  /** Latitude of the location */
  latitude?: number
  /** Longitude of the location */
  longitude?: number
}

/**
 * Milestone values for streak achievements
 */
export type StreakMilestone = 5 | 10 | 25 | 50 | 100

/**
 * Streak milestone achievement record
 */
export interface StreakMilestoneRecord {
  /** Unique identifier for the milestone */
  id: string
  /** User who achieved the milestone */
  user_id: string
  /** Location where milestone was achieved */
  location_id: string
  /** Type of streak */
  streak_type: StreakType
  /** Milestone value achieved */
  milestone: StreakMilestone
  /** When the milestone was achieved */
  achieved_at: string
  /** Location name (from join) */
  location_name?: string
}

/**
 * Streak summary for a single location
 */
export interface LocationStreakSummary {
  /** Daily streak info */
  daily?: {
    current: number
    longest: number
    total: number
  }
  /** Weekly streak info */
  weekly?: {
    current: number
    longest: number
    total: number
  }
  /** Monthly streak info */
  monthly?: {
    current: number
    longest: number
    total: number
  }
}

/**
 * Streak display info for UI components
 */
export interface StreakDisplayInfo {
  /** Current streak count */
  count: number
  /** Type of streak */
  type: StreakType
  /** Location name */
  locationName: string
  /** Location ID */
  locationId: string
  /** Whether this is a new milestone */
  isNewMilestone?: boolean
  /** The milestone value if applicable */
  milestoneValue?: StreakMilestone
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Available milestone values
 */
export const STREAK_MILESTONES: readonly StreakMilestone[] = [5, 10, 25, 50, 100] as const

/**
 * Streak type labels for display
 */
export const STREAK_TYPE_LABELS: Record<StreakType, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
} as const

/**
 * Streak type short labels for badges
 */
export const STREAK_TYPE_SHORT_LABELS: Record<StreakType, string> = {
  daily: 'd',
  weekly: 'w',
  monthly: 'm',
} as const
