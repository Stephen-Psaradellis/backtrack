/**
 * TimeFilterChips - Time-based filter chips for feed
 *
 * Displays horizontal chips for filtering posts by time ranges.
 * Useful for finding recent posts or posts from specific time periods.
 *
 * Features:
 * - 5 time filter options
 * - Active chip highlighted with accent color
 * - Haptic feedback on selection
 * - Dark theme styling
 */

import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { selectionFeedback } from '../lib/haptics'

// ============================================================================
// TYPES
// ============================================================================

export type TimeFilter =
  | 'all'
  | 'now'
  | 'today'
  | 'last-night'
  | 'this-weekend'
  | 'this-week'

export interface TimeFilterChipsProps {
  /** Currently selected filter */
  selectedFilter: TimeFilter
  /** Callback when filter changes */
  onFilterChange: (filter: TimeFilter) => void
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_FILTERS: Array<{
  id: TimeFilter
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: 'all', label: 'All', icon: 'infinite-outline' },
  { id: 'now', label: 'Now', icon: 'flash-outline' },
  { id: 'today', label: 'Today', icon: 'sunny-outline' },
  { id: 'last-night', label: 'Last Night', icon: 'moon-outline' },
  { id: 'this-weekend', label: 'This Weekend', icon: 'calendar-outline' },
  { id: 'this-week', label: 'This Week', icon: 'time-outline' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the start and end timestamps for a time filter
 */
export function getTimeFilterRange(filter: TimeFilter): { start: Date | null; end: Date | null } {
  const now = new Date()

  switch (filter) {
    case 'all':
      return { start: null, end: null }

    case 'now':
      // Last 1 hour
      return {
        start: new Date(now.getTime() - 60 * 60 * 1000),
        end: now,
      }

    case 'today':
      // Start of today
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
        end: now,
      }

    case 'last-night':
      // 6PM yesterday to 6AM today
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 18, 0, 0),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0),
      }

    case 'this-weekend':
      // Saturday and Sunday of the current week
      const dayOfWeek = now.getDay()
      const saturday = new Date(now)
      saturday.setDate(now.getDate() - dayOfWeek + 6)
      saturday.setHours(0, 0, 0, 0)

      const sunday = new Date(saturday)
      sunday.setDate(saturday.getDate() + 1)
      sunday.setHours(23, 59, 59, 999)

      return {
        start: saturday,
        end: sunday,
      }

    case 'this-week':
      // Monday to Sunday of the current week
      const monday = new Date(now)
      const currentDay = now.getDay()
      const diff = currentDay === 0 ? -6 : 1 - currentDay
      monday.setDate(now.getDate() + diff)
      monday.setHours(0, 0, 0, 0)

      return {
        start: monday,
        end: now,
      }

    default:
      return { start: null, end: null }
  }
}

/**
 * Check if a post timestamp matches the selected time filter
 */
export function isInTimeRange(timestamp: string | Date, filter: TimeFilter): boolean {
  if (filter === 'all') return true

  const postDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const { start, end } = getTimeFilterRange(filter)

  if (!start || !end) return true

  return postDate >= start && postDate <= end
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeFilterChips({
  selectedFilter,
  onFilterChange,
  testID = 'time-filter-chips',
}: TimeFilterChipsProps): React.ReactNode {
  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFilterPress = useCallback(
    async (filter: TimeFilter) => {
      await selectionFeedback()
      onFilterChange(filter)
    },
    [onFilterChange]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Ionicons name="filter-outline" size={16} color={darkTheme.textMuted} />
        <Text style={styles.label}>Time</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID={`${testID}-scroll`}
      >
        {TIME_FILTERS.map((filter) => {
          const isSelected = selectedFilter === filter.id
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleFilterPress(filter.id)}
              activeOpacity={0.7}
              testID={`${testID}-${filter.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${filter.label}`}
              accessibilityState={{ selected: isSelected }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons
                name={filter.icon}
                size={14}
                color={isSelected ? '#FFFFFF' : darkTheme.textSecondary}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing[1.5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[0.5],
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: darkTheme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: 20,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chipSelected: {
    backgroundColor: darkTheme.accent,
    borderColor: darkTheme.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
})
