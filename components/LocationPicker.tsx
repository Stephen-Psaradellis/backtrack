/**
 * LocationPicker Component
 *
 * A comprehensive venue search and selection component for the Love Ledger app.
 * Allows users to search for locations, view nearby venues, and select from a list.
 *
 * Features:
 * - Text-based venue search
 * - Display of nearby locations
 * - Location selection with callback
 * - Loading and error states
 * - Empty state handling
 * - Current location quick-select option
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LocationPicker
 *   onSelect={(location) => console.log('Selected:', location)}
 * />
 *
 * @example
 * // With pre-fetched locations
 * <LocationPicker
 *   locations={nearbyLocations}
 *   onSelect={(location) => setSelectedLocation(location)}
 *   loading={isLoading}
 * />
 *
 * @example
 * // Full configuration
 * <LocationPicker
 *   locations={locations}
 *   selectedLocationId={currentLocationId}
 *   onSelect={handleLocationSelect}
 *   onSearch={handleSearch}
 *   userCoordinates={{ latitude: 37.78, longitude: -122.41 }}
 *   placeholder="Search for a venue..."
 *   showCurrentLocation
 * />
 * ```
 */

import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Keyboard,
  Platform,
} from 'react-native'

import { LoadingSpinner } from './LoadingSpinner'
import { EmptyState, NoSearchResults } from './EmptyState'
import { selectionFeedback } from '../lib/haptics'
import type { Location, Coordinates } from '../lib/types'
import { calculateDistance } from '../hooks/useLocation'
import { formatVisitedAgo } from '../lib/utils/geo'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Location item for display in the picker
 */
export interface LocationItem {
  /** Unique identifier for the location */
  id: string
  /** Display name of the location */
  name: string
  /** Address or description */
  address: string | null
  /** GPS latitude */
  latitude: number
  /** GPS longitude */
  longitude: number
  /** Google Maps place ID (optional) */
  place_id?: string | null
  /** Distance from user in meters (calculated if userCoordinates provided) */
  distance?: number
  /** Timestamp when the user visited this location (for visited locations) */
  visited_at?: string | null
}

/**
 * Converts a Location database entity to a LocationItem for display.
 * Handles both regular Location and LocationWithVisit types.
 *
 * @param location - Location entity from database
 * @returns LocationItem for use in LocationPicker
 *
 * @example
 * ```typescript
 * // Convert a database location
 * const item = locationToItem(location)
 *
 * // Convert a visited location (preserves visited_at)
 * const visitedItem = locationToItem(visitedLocation)
 * console.log(visitedItem.visited_at) // "2024-01-01T12:00:00Z"
 * ```
 */
export function locationToItem(location: {
  id: string
  name: string
  address?: string | null
  latitude: number
  longitude: number
  google_place_id?: string | null
  visited_at?: string | null
}): LocationItem {
  return {
    id: location.id,
    name: location.name,
    address: location.address ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    place_id: location.google_place_id ?? null,
    visited_at: location.visited_at ?? null,
  }
}

/**
 * Converts a database Location entity to a LocationItem for display
 */
export function locationToItem(location: {
  id: string
  name: string
  address?: string | null
  latitude: number
  longitude: number
  google_place_id?: string | null
}): LocationItem {
  return {
    id: location.id,
    name: location.name,
    address: location.address ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    place_id: location.google_place_id ?? null,
  }
}

/**
 * Props for the LocationPicker component
 */
export interface LocationPickerProps {
  /** Array of locations to display */
  locations?: LocationItem[]
  /** Currently selected location ID */
  selectedLocationId?: string | null
  /** Callback when a location is selected */
  onSelect: (location: LocationItem) => void
  /** Callback when search text changes */
  onSearch?: (query: string) => void
  /** Callback when "Use Current Location" is pressed */
  onUseCurrentLocation?: () => void
  /** User's current coordinates (for distance calculation) */
  userCoordinates?: Coordinates | null
  /** Whether locations are loading */
  loading?: boolean
  /** Loading message to display */
  loadingMessage?: string
  /** Error message to display */
  error?: string | null
  /** Callback to retry after error */
  onRetry?: () => void
  /** Placeholder text for search input */
  placeholder?: string
  /** Whether to show the "Use Current Location" option */
  showCurrentLocation?: boolean
  /** Label for current location option */
  currentLocationLabel?: string
  /** Empty state title when no locations found */
  emptyTitle?: string
  /** Empty state message when no locations found */
  emptyMessage?: string
  /** Maximum number of locations to display */
  maxLocations?: number
  /** Whether to auto-focus the search input */
  autoFocus?: boolean
  /** Whether to show "Visited X ago" badge when visited_at is available */
  showVisitedAt?: boolean
  /** Custom container style */
  style?: StyleProp<ViewStyle>
  /** Custom list style */
  listStyle?: StyleProp<ViewStyle>
  /** Test ID for testing purposes */
  testID?: string
}

/**
 * Props for location list item
 */
interface LocationListItemProps {
  location: LocationItem
  selected: boolean
  onPress: () => void
  showDistance: boolean
  showVisitedAt: boolean
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * iOS-style colors
 */
const COLORS = {
  primary: '#007AFF',
  secondary: '#8E8E93',
  background: '#F2F2F7',
  cardBackground: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  textSecondary: '#8E8E93',
  selectedBackground: '#E3F2FF',
  danger: '#FF3B30',
} as const

/**
 * Default props
 */
const DEFAULT_PROPS = {
  placeholder: 'Search for a venue...',
  loadingMessage: 'Finding locations...',
  currentLocationLabel: 'Use Current Location',
  emptyTitle: 'No Locations Found',
  emptyMessage: 'Try a different search or select a location on the map.',
  maxLocations: 50,
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format distance for display
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  const km = meters / 1000
  if (km < 10) {
    return `${km.toFixed(1)} km`
  }
  return `${Math.round(km)} km`
}

/**
 * Format address for display
 */
function formatAddress(address: string | null | undefined): string {
  if (!address) return 'Address unavailable'
  // Truncate long addresses
  if (address.length > 50) {
    return `${address.substring(0, 47)}...`
  }
  return address
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Individual location list item
 */
function LocationListItem({
  location,
  selected,
  onPress,
  showDistance,
  showVisitedAt,
  testID,
}: LocationListItemProps): JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.locationItem,
        selected && styles.locationItemSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Select ${location.name}`}
      accessibilityState={{ selected }}
      testID={testID}
    >
      {/* Location icon */}
      <View style={styles.locationIcon}>
        <Text style={styles.locationIconText}>📍</Text>
      </View>

      {/* Location details */}
      <View style={styles.locationDetails}>
        <View style={styles.locationNameRow}>
          <Text
            style={[
              styles.locationName,
              selected && styles.locationNameSelected,
            ]}
            numberOfLines={1}
          >
            {location.name}
          </Text>
          {/* Visited badge (if available) */}
          {showVisitedAt && location.visited_at != null && (
            <View style={styles.visitedBadge}>
              <Text style={styles.visitedBadgeText}>
                {formatVisitedAgo(location.visited_at)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.locationAddress} numberOfLines={1}>
          {formatAddress(location.address)}
        </Text>
      </View>

      {/* Distance (if available) */}
      {showDistance && location.distance != null && (
        <View style={styles.distanceContainer}>
          <Text style={styles.distanceText}>
            {formatDistance(location.distance)}
          </Text>
        </View>
      )}

      {/* Selection indicator */}
      {selected && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedIndicatorText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

/**
 * Current location option button
 */
function CurrentLocationOption({
  label,
  onPress,
  testID,
}: {
  label: string
  onPress: () => void
  testID?: string
}): JSX.Element {
  return (
    <TouchableOpacity
      style={styles.currentLocationButton}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <View style={styles.currentLocationIcon}>
        <Text style={styles.currentLocationIconText}>📍</Text>
      </View>
      <Text style={styles.currentLocationText}>{label}</Text>
      <Text style={styles.currentLocationArrow}>→</Text>
    </TouchableOpacity>
  )
}

/**
 * Search input header
 */
function SearchHeader({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  testID,
}: {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  autoFocus: boolean
  testID?: string
}): JSX.Element {
  const inputRef = useRef<TextInput>(null)

  const handleClear = useCallback(() => {
    onChangeText('')
    inputRef.current?.focus()
  }, [onChangeText])

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.secondary}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          testID={testID}
          accessibilityLabel="Search locations"
        />
        {value.length > 0 && Platform.OS !== 'ios' && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            testID={`${testID}-clear`}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * LocationPicker - Venue search and selection component
 *
 * @example
 * <LocationPicker
 *   locations={venues}
 *   onSelect={(location) => setSelectedVenue(location)}
 *   showCurrentLocation
 * />
 */
export function LocationPicker({
  locations = [],
  selectedLocationId = null,
  onSelect,
  onSearch,
  onUseCurrentLocation,
  userCoordinates = null,
  loading = false,
  loadingMessage = DEFAULT_PROPS.loadingMessage,
  error = null,
  onRetry,
  placeholder = DEFAULT_PROPS.placeholder,
  showCurrentLocation = false,
  currentLocationLabel = DEFAULT_PROPS.currentLocationLabel,
  emptyTitle = DEFAULT_PROPS.emptyTitle,
  emptyMessage = DEFAULT_PROPS.emptyMessage,
  maxLocations = DEFAULT_PROPS.maxLocations,
  autoFocus = false,
  showVisitedAt = false,
  style,
  listStyle,
  testID = 'location-picker',
}: LocationPickerProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState('')

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle search text change
   */
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text)
      onSearch?.(text)
    },
    [onSearch]
  )

  /**
   * Handle location selection
   */
  const handleLocationSelect = useCallback(
    (location: LocationItem) => {
      selectionFeedback()
      Keyboard.dismiss()
      onSelect(location)
    },
    [onSelect]
  )

  /**
   * Handle current location selection
   */
  const handleCurrentLocationPress = useCallback(() => {
    selectionFeedback()
    Keyboard.dismiss()
    onUseCurrentLocation?.()
  }, [onUseCurrentLocation])

  // ---------------------------------------------------------------------------
  // COMPUTED DATA
  // ---------------------------------------------------------------------------

  /**
   * Process and filter locations based on search query and user coordinates
   */
  const processedLocations = useMemo(() => {
    // Add distance to each location if user coordinates are available
    let locationsWithDistance = locations.map((location) => ({
      ...location,
      distance:
        userCoordinates != null
          ? calculateDistance(userCoordinates, {
              latitude: location.latitude,
              longitude: location.longitude,
            })
          : undefined,
    }))

    // Filter by search query if provided
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim()
      locationsWithDistance = locationsWithDistance.filter(
        (location) =>
          location.name.toLowerCase().includes(query) ||
          (location.address?.toLowerCase().includes(query) ?? false)
      )
    }

    // Sort by distance if available, otherwise by name
    locationsWithDistance.sort((a, b) => {
      if (a.distance != null && b.distance != null) {
        return a.distance - b.distance
      }
      return a.name.localeCompare(b.name)
    })

    // Limit results
    return locationsWithDistance.slice(0, maxLocations)
  }, [locations, searchQuery, userCoordinates, maxLocations])

  /**
   * Whether to show distance information
   */
  const showDistance = userCoordinates != null

  // ---------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------------------------

  if (loading && locations.length === 0) {
    return (
      <View style={[styles.container, styles.centered, style]} testID={`${testID}-loading`}>
        <LoadingSpinner message={loadingMessage} />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: ERROR STATE
  // ---------------------------------------------------------------------------

  if (error && locations.length === 0) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-error`}>
        <SearchHeader
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder={placeholder}
          autoFocus={false}
          testID={`${testID}-search`}
        />
        <View style={[styles.stateContainer, styles.centered]}>
          <EmptyState
            icon="⚠️"
            title="Error Loading Locations"
            message={error}
            action={onRetry ? { label: 'Retry', onPress: onRetry } : undefined}
          />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: LOCATION LIST
  // ---------------------------------------------------------------------------

  /**
   * Render individual location item
   */
  const renderLocationItem = ({ item }: { item: LocationItem }) => (
    <LocationListItem
      location={item}
      selected={item.id === selectedLocationId}
      onPress={() => handleLocationSelect(item)}
      showDistance={showDistance}
      showVisitedAt={showVisitedAt}
      testID={`${testID}-item-${item.id}`}
    />
  )

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = (item: LocationItem) => item.id

  /**
   * Item separator
   */
  const ItemSeparator = () => <View style={styles.separator} />

  /**
   * List header component
   */
  const ListHeader = showCurrentLocation && onUseCurrentLocation ? (
    <>
      <CurrentLocationOption
        label={currentLocationLabel}
        onPress={handleCurrentLocationPress}
        testID={`${testID}-current-location`}
      />
      <ItemSeparator />
    </>
  ) : null

  /**
   * List footer component (shown when no results)
   */
  const ListFooter =
    processedLocations.length === 0 && searchQuery.length > 0 ? (
      <View style={styles.stateContainer}>
        <NoSearchResults
          icon="🔍"
          title={emptyTitle}
          message={emptyMessage}
        />
      </View>
    ) : null

  // ---------------------------------------------------------------------------
  // RENDER: MAIN
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, style]} testID={testID}>
      <SearchHeader
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        testID={`${testID}-search`}
      />

      <FlatList
        style={listStyle}
        data={processedLocations}
        renderItem={renderLocationItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        scrollEnabled={true}
        nestedScrollEnabled={false}
        testID={`${testID}-list`}
      />
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * StyleSheet definitions
 */
const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  stateContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: COLORS.text,
  },

  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  clearButtonText: {
    fontSize: 16,
    color: COLORS.secondary,
    fontWeight: '600',
  },

  // Location item
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
  },

  locationItemSelected: {
    backgroundColor: COLORS.selectedBackground,
  },

  locationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  locationIconText: {
    fontSize: 16,
  },

  locationDetails: {
    flex: 1,
  },

  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },

  locationNameSelected: {
    color: COLORS.primary,
  },

  locationAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  locationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  visitedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },

  visitedBadgeText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '600',
  },

  distanceContainer: {
    marginRight: 8,
  },

  distanceText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '500',
  },

  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedIndicatorText: {
    fontSize: 14,
    color: COLORS.cardBackground,
    fontWeight: 'bold',
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Current location button
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },

  currentLocationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  currentLocationIconText: {
    fontSize: 14,
    color: COLORS.cardBackground,
  },

  currentLocationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.cardBackground,
  },

  currentLocationArrow: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
})