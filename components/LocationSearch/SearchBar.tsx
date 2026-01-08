'use client'

/**
 * SearchBar Component
 *
 * A search input component for venue discovery with autocomplete and loading states.
 * Features:
 * - Text input with search icon and clear button
 * - Loading indicator during API calls
 * - Autocomplete suggestions display
 * - Debounced input handling
 * - Accessibility support with proper ARIA labels
 * - iOS-style design matching the app theme
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SearchBar
 *   value={query}
 *   onChangeText={setQuery}
 *   loading={isSearching}
 * />
 *
 * @example
 * // With autocomplete suggestions
 * <SearchBar
 *   value={query}
 *   onChangeText={setQuery}
 *   loading={isSearching}
 *   suggestions={searchResults}
 *   onSuggestionPress={handleVenueSelect}
 * />
 * ```
 */

import React, { memo, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  ScrollView,
  type StyleProp,
  type ViewStyle,
  type TextInputProps,
} from 'react-native'

import type { VenuePreview, VenueCategory } from '../../types/location'
import { VENUE_TYPE_FILTERS } from '../../types/location'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the SearchBar component
 */
export interface SearchBarProps {
  /** Current search query value (controlled) */
  value: string
  /** Callback when search query changes */
  onChangeText: (text: string) => void
  /** Whether search is in progress */
  loading?: boolean
  /** Placeholder text for the input */
  placeholder?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean
  /** Autocomplete suggestions to display */
  suggestions?: VenuePreview[]
  /** Callback when a suggestion is pressed */
  onSuggestionPress?: (venue: VenuePreview) => void
  /** Maximum number of suggestions to display */
  maxSuggestions?: number
  /** Callback when search is submitted (Enter key) */
  onSubmit?: () => void
  /** Callback when input is focused */
  onFocus?: () => void
  /** Callback when input is blurred */
  onBlur?: () => void
  /** Error message to display */
  error?: string | null
  /** Whether to show the clear button */
  showClearButton?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
  /** Additional TextInput props */
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder'>
  /** Whether to show venue type filter chips */
  showFilters?: boolean
  /** Currently active filter categories */
  activeFilters?: VenueCategory[]
  /** Callback when a filter is toggled */
  onFilterToggle?: (category: VenueCategory) => void
}

/**
 * Props for suggestion list item
 */
interface SuggestionItemProps {
  venue: VenuePreview
  onPress: () => void
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * iOS-style colors matching the app theme
 */
const COLORS = {
  primary: '#FF6B47',
  secondary: '#8E8E93',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#8E8E93',
  danger: '#FF3B30',
  pink: '#FF6B47',
} as const

/**
 * Default component configuration
 */
const DEFAULTS = {
  placeholder: 'Search for a venue...',
  maxSuggestions: 5,
} as const

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Search icon SVG-like component
 */
function SearchIcon(): JSX.Element {
  return (
    <Text style={styles.searchIcon} accessible={false}>
      🔍
    </Text>
  )
}

/**
 * Loading spinner for search state
 */
function LoadingIndicator({ testID }: { testID?: string }): JSX.Element {
  return (
    <View style={styles.loadingContainer} testID={testID}>
      <ActivityIndicator
        size="small"
        color={COLORS.secondary}
        accessibilityLabel="Searching..."
      />
    </View>
  )
}

/**
 * Clear button to reset search query
 */
const ClearButton = memo(function ClearButton({
  onPress,
  testID,
}: {
  onPress: () => void
  testID?: string
}): JSX.Element {
  return (
    <TouchableOpacity
      style={styles.clearButton}
      onPress={onPress}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Clear search"
      testID={testID}
    >
      <Text style={styles.clearButtonText}>✕</Text>
    </TouchableOpacity>
  )
})

/**
 * Individual suggestion list item
 */
const SuggestionItem = memo(function SuggestionItem({
  venue,
  onPress,
  testID,
}: SuggestionItemProps): JSX.Element {
  return (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Select ${venue.name}`}
      testID={testID}
    >
      <View style={styles.suggestionIcon}>
        <Text style={styles.suggestionIconText}>📍</Text>
      </View>
      <View style={styles.suggestionDetails}>
        <Text style={styles.suggestionName} numberOfLines={1}>
          {venue.name}
        </Text>
        {venue.address && (
          <Text style={styles.suggestionAddress} numberOfLines={1}>
            {venue.address}
          </Text>
        )}
      </View>
      {venue.post_count > 0 && (
        <View style={styles.postCountBadge}>
          <Text style={styles.postCountText}>
            {venue.post_count} {venue.post_count === 1 ? 'post' : 'posts'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
})

/**
 * Suggestions dropdown list
 */
const SuggestionsList = memo(function SuggestionsList({
  suggestions,
  onSuggestionPress,
  maxSuggestions,
  testID,
}: {
  suggestions: VenuePreview[]
  onSuggestionPress: (venue: VenuePreview) => void
  maxSuggestions: number
  testID?: string
}): JSX.Element | null {
  if (suggestions.length === 0) {
    return null
  }

  const visibleSuggestions = suggestions.slice(0, maxSuggestions)

  return (
    <View style={styles.suggestionsContainer} testID={testID}>
      {visibleSuggestions.map((venue, index) => (
        <React.Fragment key={venue.id}>
          <SuggestionItem
            venue={venue}
            onPress={() => onSuggestionPress(venue)}
            testID={`${testID}-item-${index}`}
          />
          {index < visibleSuggestions.length - 1 && (
            <View style={styles.suggestionSeparator} />
          )}
        </React.Fragment>
      ))}
    </View>
  )
})

/**
 * Props for filter chip component
 */
interface FilterChipProps {
  /** Category identifier */
  category: VenueCategory
  /** Display label */
  label: string
  /** Whether the chip is currently active/selected */
  isActive: boolean
  /** Callback when chip is pressed */
  onPress: () => void
  /** Test ID for testing */
  testID?: string
}

/**
 * Individual filter chip for venue type filtering
 *
 * A pill-shaped button that toggles active/inactive state.
 * Active state shows pink background, inactive shows gray background.
 */
const FilterChip = memo(function FilterChip({
  label,
  isActive,
  onPress,
  testID,
}: FilterChipProps): JSX.Element {
  const chipStyles = useMemo(() => {
    return [
      styles.filterChip,
      isActive ? styles.filterChipActive : styles.filterChipInactive,
    ]
  }, [isActive])

  const textStyles = useMemo(() => {
    return [
      styles.filterChipText,
      isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
    ]
  }, [isActive])

  return (
    <TouchableOpacity
      style={chipStyles}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: isActive }}
      testID={testID}
    >
      <Text style={textStyles}>{label}</Text>
    </TouchableOpacity>
  )
})

/**
 * Venue type filter chips available for filtering
 * Limited to: cafe, gym, bookstore, bar, restaurant
 */
const FILTER_CHIP_CATEGORIES: VenueCategory[] = [
  'cafe',
  'gym',
  'bookstore',
  'bar',
  'restaurant',
]

/**
 * Horizontal scrollable row of filter chips
 */
const FilterChips = memo(function FilterChips({
  activeFilters,
  onFilterToggle,
  disabled,
  testID,
}: {
  activeFilters: VenueCategory[]
  onFilterToggle: (category: VenueCategory) => void
  disabled?: boolean
  testID?: string
}): JSX.Element {
  const handleFilterPress = useCallback(
    (category: VenueCategory) => {
      if (!disabled) {
        onFilterToggle(category)
      }
    },
    [disabled, onFilterToggle]
  )

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterChipsContainer}
      testID={testID}
    >
      {FILTER_CHIP_CATEGORIES.map((category) => {
        const filter = VENUE_TYPE_FILTERS.find((f) => f.category === category)
        if (!filter) return null

        const isActive = activeFilters.includes(category)

        return (
          <FilterChip
            key={category}
            category={category}
            label={filter.label}
            isActive={isActive}
            onPress={() => handleFilterPress(category)}
            testID={`${testID}-${category}`}
          />
        )
      })}
    </ScrollView>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SearchBar - Venue search input with autocomplete and loading states
 *
 * @param value - Current search query (controlled)
 * @param onChangeText - Callback when query changes
 * @param loading - Whether search is in progress
 * @param placeholder - Input placeholder text
 * @param disabled - Whether input is disabled
 * @param autoFocus - Whether to auto-focus on mount
 * @param suggestions - Autocomplete suggestions to display
 * @param onSuggestionPress - Callback when suggestion is selected
 * @param maxSuggestions - Maximum suggestions to show (default: 5)
 * @param onSubmit - Callback when Enter is pressed
 * @param onFocus - Callback when input is focused
 * @param onBlur - Callback when input is blurred
 * @param error - Error message to display
 * @param showClearButton - Whether to show clear button (default: true)
 * @param style - Custom container style
 * @param testID - Test ID for testing
 * @param inputProps - Additional TextInput props
 * @param showFilters - Whether to show venue type filter chips (default: false)
 * @param activeFilters - Currently active filter categories
 * @param onFilterToggle - Callback when a filter chip is toggled
 */
function SearchBarComponent({
  value,
  onChangeText,
  loading = false,
  placeholder = DEFAULTS.placeholder,
  disabled = false,
  autoFocus = false,
  suggestions = [],
  onSuggestionPress,
  maxSuggestions = DEFAULTS.maxSuggestions,
  onSubmit,
  onFocus,
  onBlur,
  error = null,
  showClearButton = true,
  style,
  testID = 'search-bar',
  inputProps,
  showFilters = false,
  activeFilters = [],
  onFilterToggle,
}: SearchBarProps): JSX.Element {
  const inputRef = useRef<TextInput>(null)

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const hasValue = value.length > 0
  const showClear = showClearButton && hasValue && !loading && !disabled
  const hasSuggestions = suggestions.length > 0 && hasValue && onSuggestionPress
  const hasError = error != null && error.length > 0
  const hasFilters = showFilters && onFilterToggle != null

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const containerStyles = useMemo(() => {
    return [styles.container, style]
  }, [style])

  const inputContainerStyles = useMemo(() => {
    return [
      styles.inputContainer,
      disabled && styles.inputContainerDisabled,
      hasError && styles.inputContainerError,
    ].filter(Boolean)
  }, [disabled, hasError])

  const inputStyles = useMemo(() => {
    return [
      styles.input,
      disabled && styles.inputDisabled,
    ].filter(Boolean)
  }, [disabled])

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  const handleClear = useCallback(() => {
    onChangeText('')
    inputRef.current?.focus()
  }, [onChangeText])

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss()
    onSubmit?.()
  }, [onSubmit])

  const handleSuggestionPress = useCallback(
    (venue: VenuePreview) => {
      Keyboard.dismiss()
      onSuggestionPress?.(venue)
    },
    [onSuggestionPress]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={containerStyles} testID={testID}>
      {/* Search Input Container */}
      <View style={inputContainerStyles}>
        <SearchIcon />

        <TextInput
          ref={inputRef}
          style={inputStyles}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.secondary}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          editable={!disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={handleSubmit}
          clearButtonMode={Platform.OS === 'ios' ? 'never' : undefined}
          accessibilityLabel="Search venues"
          accessibilityHint="Enter a venue name to search"
          accessibilityState={{ disabled }}
          testID={`${testID}-input`}
          {...inputProps}
        />

        {/* Loading Indicator */}
        {loading && (
          <LoadingIndicator testID={`${testID}-loading`} />
        )}

        {/* Clear Button (non-iOS or explicit) */}
        {showClear && (
          <ClearButton
            onPress={handleClear}
            testID={`${testID}-clear`}
          />
        )}
      </View>

      {/* Venue Type Filter Chips */}
      {hasFilters && (
        <FilterChips
          activeFilters={activeFilters}
          onFilterToggle={onFilterToggle}
          disabled={disabled}
          testID={`${testID}-filters`}
        />
      )}

      {/* Error Message */}
      {hasError && (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          testID={`${testID}-error`}
        >
          {error}
        </Text>
      )}

      {/* Autocomplete Suggestions */}
      {hasSuggestions && (
        <SuggestionsList
          suggestions={suggestions}
          onSuggestionPress={handleSuggestionPress}
          maxSuggestions={maxSuggestions}
          testID={`${testID}-suggestions`}
        />
      )}
    </View>
  )
}

/**
 * Memoized SearchBar component for performance
 */
export const SearchBar = memo(SearchBarComponent)

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    width: '100%',
  },

  // Input Container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  inputContainerDisabled: {
    backgroundColor: COLORS.background,
    opacity: 0.6,
  },

  inputContainerError: {
    borderColor: COLORS.danger,
  },

  // Search Icon
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  // Input
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 0,
  },

  inputDisabled: {
    color: COLORS.secondary,
  },

  // Loading
  loadingContainer: {
    marginLeft: 8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Clear Button
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  clearButtonText: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },

  // Error
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.danger,
  },

  // Suggestions Container
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  // Suggestion Item
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  suggestionIconText: {
    fontSize: 14,
  },

  suggestionDetails: {
    flex: 1,
  },

  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },

  suggestionAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  suggestionSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Post Count Badge
  postCountBadge: {
    backgroundColor: COLORS.pink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },

  postCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.cardBackground,
  },

  // Filter Chips Container
  filterChipsContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 8,
  },

  // Individual Filter Chip
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  filterChipActive: {
    backgroundColor: COLORS.pink,
    borderColor: COLORS.pink,
  },

  filterChipInactive: {
    backgroundColor: COLORS.cardBackground,
    borderColor: COLORS.border,
  },

  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  filterChipTextActive: {
    color: COLORS.cardBackground,
  },

  filterChipTextInactive: {
    color: COLORS.text,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default SearchBar
