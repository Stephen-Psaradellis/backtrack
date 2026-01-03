/**
 * PostFilters Component
 *
 * A horizontal filter bar for filtering posts by time range in the Backtrack app.
 * Provides quick access to common time filters like "Last 24h", "Last Week", etc.
 *
 * Features:
 * - Horizontal scrollable filter chips
 * - iOS-style visual design
 * - Haptic feedback on selection
 * - Accessible filter options
 * - Support for additional custom filters
 *
 * @example
 * ```tsx
 * // Basic usage with time filter
 * <PostFilters
 *   selectedTimeFilter="last_week"
 *   onTimeFilterChange={(filter) => setTimeFilter(filter)}
 * />
 *
 * @example
 * // With custom styling
 * <PostFilters
 *   selectedTimeFilter="any_time"
 *   onTimeFilterChange={handleFilterChange}
 *   style={{ marginVertical: 12 }}
 * />
 * ```
 */

import React, { useCallback, memo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native'

import { selectionFeedback } from '../lib/haptics'
import {
  TimeFilterOption,
  TIME_FILTER_OPTIONS,
  TIME_FILTER_LABELS,
} from '../utils/dateTime'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PostFilters component
 */
export interface PostFiltersProps {
  /** Currently selected time filter */
  selectedTimeFilter: TimeFilterOption
  /** Callback when time filter changes */
  onTimeFilterChange: (filter: TimeFilterOption) => void
  /** Whether the filters are disabled (e.g., during loading) */
  disabled?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
}

/**
 * Props for individual filter chip
 */
interface FilterChipProps {
  /** Filter option value */
  value: TimeFilterOption
  /** Display label */
  label: string
  /** Whether this chip is selected */
  selected: boolean
  /** Whether the chip is disabled */
  disabled: boolean
  /** Press handler */
  onPress: () => void
  /** Test ID */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * iOS-style colors
 */
const COLORS = {
  primary: '#FF6B47',
  secondary: '#8E8E93',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#8E8E93',
  selectedBackground: '#FF6B47',
  selectedText: '#FFFFFF',
  disabledBackground: '#E5E5EA',
  disabledText: '#C7C7CC',
} as const

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Individual filter chip button
 */
const FilterChip = memo(function FilterChip({
  value,
  label,
  selected,
  disabled,
  onPress,
  testID,
}: FilterChipProps): JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected, disabled }}
      testID={testID}
    >
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          disabled && styles.chipTextDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PostFilters - Time-based filter bar for post browsing
 *
 * Renders a horizontal scrollable list of filter chips for filtering posts
 * by time range. Supports 'Last 24h', 'Last Week', 'Last Month', and 'Any Time'.
 *
 * @example
 * <PostFilters
 *   selectedTimeFilter="last_week"
 *   onTimeFilterChange={(filter) => fetchPostsWithFilter(filter)}
 * />
 */
export const PostFilters = memo(function PostFilters({
  selectedTimeFilter,
  onTimeFilterChange,
  disabled = false,
  style,
  testID = 'post-filters',
}: PostFiltersProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle filter chip press
   */
  const handleFilterPress = useCallback(
    (filter: TimeFilterOption) => {
      if (filter === selectedTimeFilter) {
        // Already selected, do nothing
        return
      }
      selectionFeedback()
      onTimeFilterChange(filter)
    },
    [selectedTimeFilter, onTimeFilterChange]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, style]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID={`${testID}-scroll`}
      >
        {TIME_FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option}
            value={option}
            label={TIME_FILTER_LABELS[option]}
            selected={selectedTimeFilter === option}
            disabled={disabled}
            onPress={() => handleFilterPress(option)}
            testID={`${testID}-chip-${option}`}
          />
        ))}
      </ScrollView>
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Filter chip
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  chipSelected: {
    backgroundColor: COLORS.selectedBackground,
    borderColor: COLORS.selectedBackground,
  },

  chipDisabled: {
    backgroundColor: COLORS.disabledBackground,
    borderColor: COLORS.disabledBackground,
  },

  // Chip text
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

  chipTextSelected: {
    color: COLORS.selectedText,
    fontWeight: '600',
  },

  chipTextDisabled: {
    color: COLORS.disabledText,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default PostFilters
