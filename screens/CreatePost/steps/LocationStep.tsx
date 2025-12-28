/**
 * LocationStep Component
 *
 * Fourth step in the CreatePost wizard flow. Allows the user to select
 * the location where they saw their missed connection. Shows only locations
 * the user has visited within the last 3 hours, with visit timestamps displayed.
 *
 * Features:
 * - Location search and selection via LocationPicker
 * - Displays only recently visited locations (within 3 hours)
 * - Shows "Visited X ago" badges for each location
 * - Empty state when no recent visits
 * - Back/Next navigation buttons
 * - Disabled Next button until location is selected
 *
 * @example
 * ```tsx
 * <LocationStep
 *   locations={visitedLocations}
 *   selectedLocation={formData.location}
 *   onSelect={handleLocationSelect}
 *   userCoordinates={{ latitude: 37.78, longitude: -122.41 }}
 *   loading={loadingLocations}
 *   isPreselected={preselectedLocation !== null}
 *   onNext={handleNext}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo } from 'react'
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native'

import { LocationPicker, type LocationItem } from '../../../components/LocationPicker'
import { Button, OutlineButton } from '../../../components/Button'
import { EmptyState } from '../../../components/EmptyState'
import { COLORS } from '../styles'

// ============================================================================
// TYPES
// ============================================================================

/**
 * User coordinates for distance calculation
 */
interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Props for the LocationStep component
 */
export interface LocationStepProps {
  /**
   * Array of recently visited locations to display (visited within last 3 hours)
   */
  locations: LocationItem[]

  /**
   * Currently selected location (null if none selected)
   */
  selectedLocation: LocationItem | null

  /**
   * Callback when a location is selected
   * @param location - The selected location
   */
  onSelect: (location: LocationItem) => void

  /**
   * User's current coordinates for distance calculation
   * (null if not available)
   */
  userCoordinates: Coordinates | null

  /**
   * Whether locations are being loaded
   * @default false
   */
  loading?: boolean

  /**
   * Whether the selected location was pre-filled from navigation params
   * (e.g., from favorites). When true, allows proceeding even without
   * recently visited locations.
   * @default false
   */
  isPreselected?: boolean

  /**
   * Callback when user wants to proceed to next step
   */
  onNext: () => void

  /**
   * Callback when user wants to go back to previous step
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   * @default 'create-post'
   */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LocationStep - Location selection step in the CreatePost wizard
 *
 * Displays:
 * 1. Empty state if user has no recent visits (visited within 3 hours) and no pre-selected location
 * 2. Pre-selected location view when coming from favorites (allows proceeding without recent visits)
 * 3. LocationPicker with search and recently visited locations
 * 4. "Visited X ago" badges on each location
 * 5. Back/Next navigation buttons at the bottom
 *
 * The Next button is disabled until a location is selected.
 *
 * When a location is pre-selected from favorites (isPreselected=true), the user
 * can proceed even without having recently visited any locations.
 */
export const LocationStep = memo(function LocationStep({
  locations,
  selectedLocation,
  onSelect,
  userCoordinates,
  loading = false,
  isPreselected = false,
  onNext,
  onBack,
  testID = 'create-post',
}: LocationStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const isLocationSelected = selectedLocation !== null
  // Don't show empty state if a location was pre-selected from favorites
  const hasNoVisits = !loading && locations.length === 0 && !isPreselected

  // ---------------------------------------------------------------------------
  // RENDER: EMPTY STATE
  // ---------------------------------------------------------------------------

  if (hasNoVisits) {
    return (
      <View style={styles.locationContainer}>
        <View style={styles.emptyStateContainer}>
          <EmptyState
            icon="📍"
            title="No Recent Visits"
            message="Visit a location to post there. You can only create posts at places you've been within the last 3 hours."
            testID={`${testID}-empty-state`}
          />
        </View>

        {/* Action buttons (Back only when no visits) */}
        <View style={styles.locationActions}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.locationFullWidthButton as ViewStyle}
            testID={`${testID}-location-back`}
          />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: PRE-SELECTED LOCATION (when no visited locations)
  // ---------------------------------------------------------------------------

  // Show pre-selected location with option to proceed when no visited locations
  if (isPreselected && selectedLocation && locations.length === 0 && !loading) {
    return (
      <View style={styles.locationContainer}>
        <View style={styles.preselectedContainer}>
          {/* Header */}
          <Text style={styles.preselectedHeader}>Selected Location</Text>
          <Text style={styles.preselectedSubheader}>
            From your favorites
          </Text>

          {/* Pre-selected location card */}
          <TouchableOpacity
            style={styles.preselectedCard}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Selected location: ${selectedLocation.name}`}
            testID={`${testID}-preselected-location`}
          >
            <View style={styles.preselectedIconContainer}>
              <Text style={styles.preselectedIcon}>⭐</Text>
            </View>
            <View style={styles.preselectedContent}>
              <Text style={styles.preselectedName} numberOfLines={1}>
                {selectedLocation.name}
              </Text>
              {selectedLocation.address && (
                <Text style={styles.preselectedAddress} numberOfLines={2}>
                  {selectedLocation.address}
                </Text>
              )}
            </View>
            <View style={styles.preselectedCheckmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          </TouchableOpacity>

          {/* Info text */}
          <Text style={styles.preselectedInfo}>
            You can proceed with this location or go back to select a different one.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.locationActions}>
          <OutlineButton
            title="Back"
            onPress={onBack}
            style={styles.locationBackButton as ViewStyle}
            testID={`${testID}-location-back`}
          />
          <Button
            title="Next"
            onPress={onNext}
            disabled={!isLocationSelected}
            style={styles.locationNextButton as ViewStyle}
            testID={`${testID}-location-next`}
          />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER: LOCATION LIST
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.locationContainer}>
      <LocationPicker
        locations={locations}
        selectedLocationId={selectedLocation?.id ?? null}
        onSelect={onSelect}
        userCoordinates={userCoordinates}
        loading={loading}
        showCurrentLocation={false}
        showVisitedAt={true}
        placeholder="Search for a venue..."
        testID={`${testID}-location-picker`}
      />

      {/* Action buttons */}
      <View style={styles.locationActions}>
        <OutlineButton
          title="Back"
          onPress={onBack}
          style={styles.locationBackButton as ViewStyle}
          testID={`${testID}-location-back`}
        />
        <Button
          title="Next"
          onPress={onNext}
          disabled={!isLocationSelected}
          style={styles.locationNextButton as ViewStyle}
          testID={`${testID}-location-next`}
        />
      </View>
    </View>
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  /**
   * Main container for the location step
   */
  locationContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  /**
   * Container for empty state display (centered vertically)
   */
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /**
   * Container for Back/Next action buttons
   */
  locationActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  /**
   * Back button styling (flex: 1 for smaller width)
   */
  locationBackButton: {
    flex: 1,
    marginRight: 8,
  },

  /**
   * Next button styling (flex: 2 for larger width)
   */
  locationNextButton: {
    flex: 2,
  },

  /**
   * Full width button styling (used in empty state)
   */
  locationFullWidthButton: {
    flex: 1,
  },

  /**
   * Container for pre-selected location display
   */
  preselectedContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },

  /**
   * Header text for pre-selected section
   */
  preselectedHeader: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },

  /**
   * Subheader text for pre-selected section
   */
  preselectedSubheader: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },

  /**
   * Card displaying the pre-selected location
   */
  preselectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },

  /**
   * Container for the favorite star icon
   */
  preselectedIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  /**
   * Star icon
   */
  preselectedIcon: {
    fontSize: 20,
  },

  /**
   * Content area for location name and address
   */
  preselectedContent: {
    flex: 1,
  },

  /**
   * Location name text
   */
  preselectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  /**
   * Location address text
   */
  preselectedAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  /**
   * Checkmark container
   */
  preselectedCheckmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /**
   * Checkmark text
   */
  checkmarkText: {
    fontSize: 16,
    color: COLORS.background,
    fontWeight: 'bold',
  },

  /**
   * Info text below the pre-selected card
   */
  preselectedInfo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default LocationStep
