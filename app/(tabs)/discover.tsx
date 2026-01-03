'use client'

/**
 * Discover Screen
 *
 * Location-based venue discovery screen for the Backtrack app.
 * Enables users to search for specific venues by name and discover
 * popular locations in their area where missed connection posts are
 * actively occurring.
 *
 * Features:
 * - Venue name search with Google Places API integration
 * - Popular venues feed sorted by post count
 * - Venue type filtering (cafe, gym, bar, restaurant, bookstore)
 * - GPS location for proximity-based results
 * - Offline mode support with cached venues
 * - Loading states with skeleton loaders
 * - Permission handling for location access
 *
 * @example
 * ```tsx
 * // Used in Next.js app router
 * // Access via: http://localhost:3000/(tabs)/discover
 * ```
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Platform,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native'

import { useLocationSearch } from '../../hooks/useLocationSearch'
import {
  SearchBar,
  VenueCard,
  VenueCardSkeleton,
  PopularVenues,
  PopularVenuesSkeleton,
} from '../../components/LocationSearch'
import { Button } from '../../components/Button'
import type { Venue, VenuePreview, VenueCategory } from '../../types/location'

// ============================================================================
// TYPES
// ============================================================================

/**
 * View mode for the discover screen
 */
type ViewMode = 'search' | 'discover'

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
} as const

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Permission request content (used in both modal and inline)
 */
function LocationPermissionContent({
  onRequestPermission,
  permissionStatus,
  testID,
  onOpenSettings,
}: {
  onRequestPermission: () => void
  permissionStatus: string
  testID?: string
  onOpenSettings?: () => void
}): JSX.Element {
  const isDenied = permissionStatus === 'denied'
  const isRestricted = permissionStatus === 'restricted'

  const handlePress = useCallback(() => {
    if (isDenied && onOpenSettings) {
      onOpenSettings()
    } else {
      onRequestPermission()
    }
  }, [isDenied, onOpenSettings, onRequestPermission])

  return (
    <View style={styles.permissionContent}>
      <Text style={styles.permissionIcon}>📍</Text>
      <Text style={styles.permissionTitle}>Location Access</Text>
      <Text style={styles.permissionMessage}>
        {isDenied
          ? 'Location access was denied. Enable location in your device settings for better venue recommendations.'
          : isRestricted
            ? 'Location services are restricted on this device.'
            : 'Enable location to discover popular venues near you and get better search results.'}
      </Text>
      {!isRestricted && (
        <Button
          title={isDenied ? 'Open Settings' : 'Enable Location'}
          onPress={handlePress}
          testID={`${testID}-button`}
        />
      )}
    </View>
  )
}

/**
 * Permission request modal for GPS access
 *
 * Shows a modal overlay prompting the user to grant location permission.
 * Follows the ReportModal pattern with proper accessibility support.
 */
function LocationPermissionModal({
  visible,
  onClose,
  onRequestPermission,
  permissionStatus,
  testID = 'location-permission-modal',
}: {
  visible: boolean
  onClose: () => void
  onRequestPermission: () => void
  permissionStatus: string
  testID?: string
}): JSX.Element {
  const isDenied = permissionStatus === 'denied'

  /**
   * Handle opening device settings for location permissions
   */
  const handleOpenSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:')
      } else if (Platform.OS === 'android') {
        await Linking.openSettings()
      } else {
        // Web - close modal and show inline instructions
        onClose()
      }
    } catch {
      // Failed to open settings, close modal
      onClose()
    }
  }, [onClose])

  /**
   * Handle permission request from modal
   */
  const handleRequestPermission = useCallback(() => {
    onRequestPermission()
    // Close modal after requesting permission (will reopen if denied)
    onClose()
  }, [onRequestPermission, onClose])

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close permission modal"
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => {}}
          accessibilityRole="dialog"
          accessibilityLabel="Location permission request"
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enable Location</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID={`${testID}-close`}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <LocationPermissionContent
              onRequestPermission={handleRequestPermission}
              permissionStatus={permissionStatus}
              onOpenSettings={handleOpenSettings}
              testID={`${testID}-content`}
            />
          </View>

          {!isDenied && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Skip for now"
                testID={`${testID}-skip`}
              >
                <Text style={styles.modalSecondaryButtonText}>Skip for Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

/**
 * Inline permission request (used when modal was dismissed)
 */
function LocationPermissionRequest({
  onRequestPermission,
  permissionStatus,
  testID,
}: {
  onRequestPermission: () => void
  permissionStatus: string
  testID?: string
}): JSX.Element {
  const handleOpenSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:')
      } else if (Platform.OS === 'android') {
        await Linking.openSettings()
      }
    } catch {
      // Failed to open settings
    }
  }, [])

  return (
    <View style={styles.permissionContainer} testID={testID}>
      <LocationPermissionContent
        onRequestPermission={onRequestPermission}
        permissionStatus={permissionStatus}
        onOpenSettings={handleOpenSettings}
        testID={testID}
      />
    </View>
  )
}

/**
 * Search results list
 */
function SearchResultsList({
  results,
  isLoading,
  onVenuePress,
  testID,
}: {
  results: Venue[]
  isLoading: boolean
  onVenuePress?: (venue: Venue) => void
  testID?: string
}): JSX.Element {
  // Show skeletons while loading
  if (isLoading && results.length === 0) {
    return (
      <View style={styles.searchResultsContainer} testID={`${testID}-skeleton`}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.resultItem}>
            <VenueCardSkeleton testID={`${testID}-skeleton-${index}`} />
          </View>
        ))}
      </View>
    )
  }

  // Show results
  return (
    <View style={styles.searchResultsContainer} testID={testID}>
      <Text style={styles.sectionTitle}>
        {results.length} {results.length === 1 ? 'Result' : 'Results'}
      </Text>
      {results.map((venue, index) => (
        <View key={venue.id || venue.google_place_id || index} style={styles.resultItem}>
          <VenueCard
            venue={venue}
            onPress={onVenuePress}
            showDistance={true}
            testID={`${testID}-item-${index}`}
          />
        </View>
      ))}
    </View>
  )
}

/**
 * Empty search results state
 *
 * Displayed when a search query returns no matching venues.
 * Provides helpful suggestions for improving search results.
 */
function EmptySearchResults({
  query,
  onClear,
  testID,
}: {
  query: string
  onClear?: () => void
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.emptyContainer} testID={testID}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No Results Found</Text>
      <Text style={styles.emptyMessage}>
        No venues found for &quot;{query}&quot;. Try a different search term or check your spelling.
      </Text>
      {onClear && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          testID={`${testID}-clear`}
        >
          <Text style={styles.emptyActionButtonText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/**
 * Empty discover state
 *
 * Displayed when no popular venues are found near the user's location.
 * Encourages users to check back later as venues become active.
 */
function NoVenuesNearby({
  onRefresh,
  testID,
}: {
  onRefresh?: () => void
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.emptyContainer} testID={testID}>
      <Text style={styles.emptyIcon}>📍</Text>
      <Text style={styles.emptyTitle}>No Venues Nearby</Text>
      <Text style={styles.emptyMessage}>
        We couldn&apos;t find any venues with active posts in your area. Check back later as more people post!
      </Text>
      {onRefresh && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh venues"
          testID={`${testID}-refresh`}
        >
          <Text style={styles.emptyActionButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/**
 * Permission denied empty state
 *
 * Displayed when the user has denied location permissions.
 * Provides instructions for enabling location access in settings.
 */
function PermissionDeniedState({
  onOpenSettings,
  testID,
}: {
  onOpenSettings?: () => void
  testID?: string
}): JSX.Element {
  const handleOpenSettings = useCallback(async () => {
    if (onOpenSettings) {
      onOpenSettings()
      return
    }
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:')
      } else if (Platform.OS === 'android') {
        await Linking.openSettings()
      }
    } catch {
      // Failed to open settings - silently fail
    }
  }, [onOpenSettings])

  return (
    <View style={styles.emptyContainer} testID={testID}>
      <Text style={styles.emptyIcon}>🚫</Text>
      <Text style={styles.emptyTitle}>Location Access Denied</Text>
      <Text style={styles.emptyMessage}>
        Location access is required to discover venues near you. Enable location permissions in your device settings to use this feature.
      </Text>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={handleOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open device settings"
        testID={`${testID}-settings`}
      >
        <Text style={styles.settingsButtonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  )
}

/**
 * Location restricted empty state
 *
 * Displayed when location services are restricted on the device
 * (e.g., parental controls, enterprise policies).
 */
function LocationRestrictedState({
  testID,
}: {
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.emptyContainer} testID={testID}>
      <Text style={styles.emptyIcon}>⛔</Text>
      <Text style={styles.emptyTitle}>Location Restricted</Text>
      <Text style={styles.emptyMessage}>
        Location services are restricted on this device. Please check your device settings or contact your administrator.
      </Text>
    </View>
  )
}

/**
 * Offline mode indicator
 */
function OfflineBanner({ testID }: { testID?: string }): JSX.Element {
  return (
    <View style={styles.offlineBanner} testID={testID}>
      <Text style={styles.offlineBannerText}>
        📴 Offline Mode - Showing cached venues
      </Text>
    </View>
  )
}

/**
 * Error state display
 */
function ErrorState({
  error,
  onRetry,
  testID,
}: {
  error: string
  onRetry?: () => void
  testID?: string
}): JSX.Element {
  return (
    <View style={styles.errorContainer} testID={testID}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DiscoverScreen - Venue search and discovery screen
 *
 * Provides a search interface for finding specific venues and a discovery
 * feed showing popular venues with active posts in the user's area.
 */
export default function DiscoverScreen(): JSX.Element {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    isOffline,
    activeFilters,
    toggleFilter,
    clearFilters,
    clearSearch,
    refetch,
    locationPermissionStatus,
    gpsLocation,
    isGpsLoading,
    gpsError,
    requestGpsLocation,
  } = useLocationSearch({
    enableGpsOnMount: true,
    highAccuracy: true,
  })

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [hasShownPermissionModal, setHasShownPermissionModal] = useState(false)

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  /**
   * Determine current view mode based on search query
   */
  const viewMode: ViewMode = useMemo(() => {
    return query.trim().length >= 2 ? 'search' : 'discover'
  }, [query])

  /**
   * Whether location is available for popular venues
   */
  const hasLocation = useMemo(() => {
    return gpsLocation !== null
  }, [gpsLocation])

  /**
   * Whether we need to show location permission request
   */
  const showPermissionRequest = useMemo(() => {
    return (
      locationPermissionStatus === 'denied' ||
      locationPermissionStatus === 'restricted' ||
      (locationPermissionStatus === 'undetermined' && !isGpsLoading && !hasLocation)
    )
  }, [locationPermissionStatus, isGpsLoading, hasLocation])

  /**
   * Convert search results to venue previews for autocomplete
   */
  const suggestionsList: VenuePreview[] = useMemo(() => {
    return results.slice(0, 5).map((venue) => ({
      id: venue.id,
      google_place_id: venue.google_place_id,
      name: venue.name,
      address: venue.address,
      primary_type: venue.place_types?.[0] ?? null,
      post_count: venue.post_count,
      distance_meters: venue.distance_meters,
    }))
  }, [results])

  /**
   * Whether to show inline permission request (after modal dismissed)
   */
  const showInlinePermissionRequest = useMemo(() => {
    return showPermissionRequest && hasShownPermissionModal
  }, [showPermissionRequest, hasShownPermissionModal])

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  /**
   * Show permission modal when location access is needed on first load
   * Only shows once per session - after dismissal, shows inline prompt instead
   */
  useEffect(() => {
    // Only show modal for undetermined status (first-time prompt)
    // For denied status, show inline with "Open Settings" option
    if (
      locationPermissionStatus === 'undetermined' &&
      !isGpsLoading &&
      !hasLocation &&
      !hasShownPermissionModal &&
      viewMode === 'discover'
    ) {
      // Small delay to let the screen render first
      const timer = setTimeout(() => {
        setShowPermissionModal(true)
        setHasShownPermissionModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [locationPermissionStatus, isGpsLoading, hasLocation, hasShownPermissionModal, viewMode])

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle venue selection from search results or popular venues
   */
  const handleVenuePress = useCallback((venue: Venue) => {
    // In a full implementation, this would navigate to venue detail
    // or Ledger screen. For now, we'll just log it.
    // navigation.navigate('Ledger', { locationId: venue.id, locationName: venue.name })
  }, [])

  /**
   * Handle suggestion selection from autocomplete
   */
  const handleSuggestionPress = useCallback((venue: VenuePreview) => {
    // Clear search and potentially navigate to venue
    clearSearch()
    // In a full implementation: navigate to venue detail
  }, [clearSearch])

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await requestGpsLocation()
      if (viewMode === 'search') {
        await refetch()
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [requestGpsLocation, refetch, viewMode])

  /**
   * Handle location permission request
   */
  const handleRequestPermission = useCallback(async () => {
    await requestGpsLocation()
  }, [requestGpsLocation])

  /**
   * Handle closing the permission modal
   */
  const handleClosePermissionModal = useCallback(() => {
    setShowPermissionModal(false)
  }, [])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(async () => {
    if (viewMode === 'search') {
      await refetch()
    } else {
      await requestGpsLocation()
    }
  }, [viewMode, refetch, requestGpsLocation])

  // ---------------------------------------------------------------------------
  // RENDER: INLINE PERMISSION REQUEST (after modal dismissed)
  // ---------------------------------------------------------------------------

  // Show inline location permission request if modal was dismissed and still needed
  if (showInlinePermissionRequest && viewMode === 'discover') {
    // Render appropriate empty state based on permission status
    const renderPermissionState = () => {
      if (locationPermissionStatus === 'denied') {
        return (
          <PermissionDeniedState
            testID="discover-permission-denied-inline"
          />
        )
      }
      if (locationPermissionStatus === 'restricted') {
        return (
          <LocationRestrictedState
            testID="discover-permission-restricted-inline"
          />
        )
      }
      return (
        <LocationPermissionRequest
          onRequestPermission={handleRequestPermission}
          permissionStatus={locationPermissionStatus}
          testID="discover-permission-request"
        />
      )
    }

    return (
      <View style={styles.container} testID="discover-screen">
        <View style={styles.searchSection}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            loading={isLoading}
            showFilters={true}
            activeFilters={activeFilters}
            onFilterToggle={toggleFilter}
            testID="discover-search-bar"
          />
        </View>
        {renderPermissionState()}
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN SCREEN
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="discover-screen">
      {/* Location Permission Modal */}
      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={handleClosePermissionModal}
        onRequestPermission={handleRequestPermission}
        permissionStatus={locationPermissionStatus}
        testID="discover-permission-modal"
      />

      {/* Offline Banner */}
      {isOffline && <OfflineBanner testID="discover-offline-banner" />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
        testID="discover-scroll-view"
      >
        {/* Search Section */}
        <View style={styles.searchSection}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            loading={isLoading}
            suggestions={viewMode === 'search' ? suggestionsList : undefined}
            onSuggestionPress={handleSuggestionPress}
            showFilters={true}
            activeFilters={activeFilters}
            onFilterToggle={toggleFilter}
            error={error}
            testID="discover-search-bar"
          />
        </View>

        {/* Content Area */}
        {viewMode === 'search' ? (
          // Search Results View
          <View style={styles.contentSection} testID="discover-search-results">
            {error ? (
              <ErrorState
                error={error}
                onRetry={handleRetry}
                testID="discover-search-error"
              />
            ) : results.length === 0 && !isLoading && query.length >= 2 ? (
              <EmptySearchResults
                query={query}
                onClear={clearSearch}
                testID="discover-empty-results"
              />
            ) : (
              <SearchResultsList
                results={results}
                isLoading={isLoading}
                onVenuePress={handleVenuePress}
                testID="discover-results-list"
              />
            )}
          </View>
        ) : (
          // Discovery View (Popular Venues)
          <View style={styles.contentSection} testID="discover-popular-venues">
            {hasLocation ? (
              <PopularVenues
                latitude={gpsLocation!.latitude}
                longitude={gpsLocation!.longitude}
                placeTypes={activeFilters.length > 0 ? getGoogleTypesForFilters(activeFilters) : undefined}
                onVenuePress={handleVenuePress}
                showHeader={true}
                headerTitle="Popular Venues"
                testID="discover-popular-list"
              />
            ) : isGpsLoading ? (
              <PopularVenuesSkeleton
                count={3}
                testID="discover-popular-skeleton"
              />
            ) : gpsError ? (
              <ErrorState
                error={gpsError}
                onRetry={handleRequestPermission}
                testID="discover-gps-error"
              />
            ) : locationPermissionStatus === 'denied' ? (
              <PermissionDeniedState
                testID="discover-permission-denied"
              />
            ) : locationPermissionStatus === 'restricted' ? (
              <LocationRestrictedState
                testID="discover-permission-restricted"
              />
            ) : (
              <LocationPermissionRequest
                onRequestPermission={handleRequestPermission}
                permissionStatus={locationPermissionStatus}
                testID="discover-permission-inline"
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert venue categories to Google Places type strings
 */
function getGoogleTypesForFilters(categories: VenueCategory[]): string[] {
  const typeMap: Record<VenueCategory, string[]> = {
    cafe: ['cafe', 'coffee_shop'],
    gym: ['gym', 'fitness_center'],
    bar: ['bar', 'night_club'],
    restaurant: ['restaurant', 'food'],
    bookstore: ['book_store', 'library'],
    park: ['park', 'hiking_area'],
    museum: ['museum', 'art_gallery'],
    library: ['library'],
  }

  const types: string[] = []
  for (const category of categories) {
    const categoryTypes = typeMap[category]
    if (categoryTypes) {
      types.push(...categoryTypes)
    }
  }
  return types
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },

  // Sections
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  contentSection: {
    flex: 1,
    paddingTop: 8,
  },

  // Section Title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  // Search Results
  searchResultsContainer: {
    paddingTop: 16,
  },

  resultItem: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // Permission Request
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  permissionContent: {
    alignItems: 'center',
    gap: 12,
  },

  permissionIcon: {
    fontSize: 48,
    marginBottom: 8,
  },

  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },

  permissionMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },

  modalCloseButton: {
    padding: 8,
    marginRight: -8,
  },

  modalCloseButtonText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },

  modalBody: {
    padding: 24,
  },

  modalFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  modalSecondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  emptyActionButton: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: 16,
  },

  emptyActionButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  settingsButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },

  settingsButtonText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: '600',
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: 8,
    textAlign: 'center',
  },

  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },

  retryButtonText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: '600',
  },

  // Offline Banner
  offlineBanner: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  offlineBannerText: {
    color: COLORS.cardBackground,
    fontSize: 13,
    fontWeight: '500',
  },
})
