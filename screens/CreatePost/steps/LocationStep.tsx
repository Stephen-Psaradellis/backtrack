/**
 * LocationStep Component
 *
 * Fourth step in the CreatePost wizard flow. Allows the user to select
 * the location where they saw their missed connection. Wraps the LocationPicker
 * component with navigation buttons and provides proper styling for the wizard.
 *
 * Features:
 * - Location search and selection via LocationPicker
 * - Displays nearby locations based on user coordinates
 * - Back/Next navigation buttons
 * - Disabled Next button until location is selected
 *
 * @example
 * ```tsx
 * <LocationStep
 *   locations={nearbyLocations}
 *   selectedLocation={formData.location}
 *   onSelect={handleLocationSelect}
 *   userCoordinates={{ latitude: 37.78, longitude: -122.41 }}
 *   loading={loadingLocations}
 *   onNext={handleNext}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'

import { LocationPicker, type LocationItem } from '../../../components/LocationPicker'
import { Button, OutlineButton } from '../../../components/Button'
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
   * Array of nearby locations to display
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
 * 1. LocationPicker with search and nearby locations
 * 2. Back/Next navigation buttons at the bottom
 *
 * The Next button is disabled until a location is selected.
 */
export const LocationStep = memo(function LocationStep({
  locations,
  selectedLocation,
  onSelect,
  userCoordinates,
  loading = false,
  onNext,
  onBack,
  testID = 'create-post',
}: LocationStepProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const isLocationSelected = selectedLocation !== null

  // ---------------------------------------------------------------------------
  // RENDER
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
})

// ============================================================================
// EXPORTS
// ============================================================================

export default LocationStep
