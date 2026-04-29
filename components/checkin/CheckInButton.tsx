/**
 * CheckInButton
 *
 * A floating button for checking in to a nearby location.
 * Shows current check-in status and handles the check-in flow.
 *
 * Features:
 * - Shows "Check In" when not checked in anywhere
 * - Shows location name and "Checked In" status when checked in
 * - Handles location permission request
 * - Finds nearest POI within 200m
 * - Shows confirmation modal before checking in
 *
 * @example
 * ```tsx
 * <CheckInButton
 *   style={{ position: 'absolute', top: 16, right: 16 }}
 *   testID="home-checkin-button"
 * />
 * ```
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  FlatList,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'

import { useCheckin } from '../../hooks/useCheckin'
import { CheckinDurationPicker } from './CheckinDurationPicker'
import { supabase } from '../../lib/supabase'
import { successFeedback, errorFeedback, selectionFeedback } from '../../lib/haptics'
import {
  searchNearbyPlaces,
  transformGooglePlaces,
  cacheVenueToSupabase,
  type GooglePlaceTransformed,
} from '../../services/locationService'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface CheckInButtonProps {
  /** Additional style for the button container */
  style?: ViewStyle
  /** Test ID for testing */
  testID?: string
}

interface NearbyLocation {
  id: string
  name: string
  distance: number
  address: string | null
  fromGooglePlaces?: boolean
  googlePlaceId?: string
  /** Cached transformed place data to avoid re-fetching from Google */
  placeData?: GooglePlaceTransformed
}

// Search radius for finding locations (200m to account for indoor GPS drift)
const CHECKIN_SEARCH_RADIUS_METERS = 200

// Google Places search radius (500m for better coverage with indoor GPS drift)
const GOOGLE_PLACES_SEARCH_RADIUS_METERS = 500

// Broad venue types for Nearby Search (API requires at least one includedType)
const CHECKIN_VENUE_TYPES = [
  'restaurant', 'bar', 'cafe', 'coffee_shop', 'night_club',
  'store', 'shopping_mall', 'supermarket',
  'gym', 'fitness_center', 'sports_club',
  'hotel', 'lodging',
  'park', 'museum', 'art_gallery', 'movie_theater',
  'library', 'university', 'church',
  'hospital', 'pharmacy',
  'airport', 'train_station', 'bus_station',
  'gas_station', 'car_wash',
  'beauty_salon', 'hair_care', 'spa',
]

// ============================================================================
// COMPONENT
// ============================================================================

export function CheckInButton({
  style,
  testID = 'checkin-button',
}: CheckInButtonProps): React.ReactNode {
  const {
    activeCheckin,
    isCheckingIn,
    isCheckingOut,
    isLoading,
    checkIn,
    checkOut,
    error,
    scheduleCheckout,
    hasAlwaysOnTracking,
  } = useCheckin()

  const [isSearching, setIsSearching] = useState(false)
  const [nearbyLocation, setNearbyLocation] = useState<NearbyLocation | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [availableLocations, setAvailableLocations] = useState<NearbyLocation[]>([])
  const [isCreatingLocation, setIsCreatingLocation] = useState(false)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [lastCheckinLocationName, setLastCheckinLocationName] = useState<string | null>(null)

  /**
   * Find locations within search radius from database
   */
  const findNearbyLocations = useCallback(async (lat: number, lon: number): Promise<NearbyLocation[]> => {
    try {
      // Query locations within 200m using PostGIS
      const { data, error: queryError } = await supabase.rpc('get_locations_near_point', {
        p_lat: lat,
        p_lon: lon,
        p_radius_meters: CHECKIN_SEARCH_RADIUS_METERS,
        p_limit: 10,
      })

      if (queryError) {
        if (__DEV__) {
          console.warn('[CheckInButton] DB venue search error:', queryError.message)
        }
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      return data.map((loc: { id: string; name: string; distance_meters: number; address: string | null }) => ({
        id: loc.id,
        name: loc.name,
        distance: loc.distance_meters,
        address: loc.address,
        fromGooglePlaces: false,
      }))
    } catch (err) {
      if (__DEV__) {
        console.warn('[CheckInButton] DB venue search exception:', err)
      }
      return []
    }
  }, [])

  /**
   * Search Google Places for nearby venues when no database locations found.
   * Uses Nearby Search API (by type + location) instead of Text Search.
   */
  const searchGooglePlacesNearby = useCallback(async (lat: number, lon: number): Promise<NearbyLocation[]> => {
    try {
      // Use Nearby Search with venue types to find places near the user
      const result = await searchNearbyPlaces({
        latitude: lat,
        longitude: lon,
        radius_meters: GOOGLE_PLACES_SEARCH_RADIUS_METERS,
        max_results: 10,
        includedTypes: CHECKIN_VENUE_TYPES,
      })

      if (!result.success) {
        if (__DEV__) {
          console.warn('[CheckInButton] Google Places search failed:', result.error)
        }
        return []
      }

      if (result.places.length === 0) {
        return []
      }

      // Skip establishment filtering - at 200m everything is relevant
      // transformGooglePlaces with filterEstablishments=false keeps all results
      const transformed = transformGooglePlaces(result.places, false)

      // Calculate distance and format for our interface
      return transformed.map(place => {
        const R = 6371e3 // Earth's radius in meters
        const φ1 = (lat * Math.PI) / 180
        const φ2 = (place.latitude * Math.PI) / 180
        const Δφ = ((place.latitude - lat) * Math.PI) / 180
        const Δλ = ((place.longitude - lon) * Math.PI) / 180
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        return {
          id: '', // Will be assigned after caching
          name: place.name,
          distance,
          address: place.address,
          fromGooglePlaces: true,
          googlePlaceId: place.google_place_id,
          placeData: place, // Store for direct caching later
        }
      }).sort((a, b) => a.distance - b.distance)
    } catch (err) {
      if (__DEV__) {
        console.warn('[CheckInButton] Google Places search exception:', err)
      }
      return []
    }
  }, [])

  /**
   * Create a location in the database from a Google Places result.
   * Uses cached placeData from the initial nearby search to avoid a redundant API call.
   */
  const createLocationFromGooglePlace = useCallback(async (location: NearbyLocation): Promise<string | null> => {
    if (!location.fromGooglePlaces || !location.googlePlaceId) {
      return location.id
    }

    if (!location.placeData) {
      return null
    }

    setIsCreatingLocation(true)

    try {
      const cacheResult = await cacheVenueToSupabase(supabase, location.placeData)

      if (!cacheResult.success || !cacheResult.location) {
        return null
      }

      return cacheResult.location.id
    } catch {
      return null
    } finally {
      setIsCreatingLocation(false)
    }
  }, [])

  /**
   * Handle check-in button press
   */
  const handlePress = useCallback(async () => {
    await selectionFeedback()

    // If already checked in, show checkout confirmation
    if (activeCheckin) {
      Alert.alert(
        'Check Out',
        `Are you sure you want to check out from ${activeCheckin.location_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Check Out',
            style: 'destructive',
            onPress: async () => {
              const result = await checkOut(activeCheckin.location_id)
              if (result.success) {
                await successFeedback()
              } else {
                await errorFeedback()
                Alert.alert('Error', result.error || 'Failed to check out')
              }
            },
          },
        ]
      )
      return
    }

    // Request location permission
    setIsSearching(true)

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        await errorFeedback()
        Alert.alert(
          'Location Required',
          'Location permission is required to check in. Please enable it in your device settings.'
        )
        setIsSearching(false)
        return
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const lat = location.coords.latitude
      const lon = location.coords.longitude

      // Search both database and Google Places in parallel for a full venue list
      const [dbLocations, googleLocations] = await Promise.all([
        findNearbyLocations(lat, lon),
        searchGooglePlacesNearby(lat, lon),
      ])

      // Merge results, deduplicating by google_place_id
      const dbPlaceIds = new Set(
        dbLocations.filter(l => l.googlePlaceId).map(l => l.googlePlaceId)
      )
      const uniqueGoogleLocations = googleLocations.filter(
        g => !g.googlePlaceId || !dbPlaceIds.has(g.googlePlaceId)
      )
      const allLocations = [...dbLocations, ...uniqueGoogleLocations]
        .sort((a, b) => a.distance - b.distance)

      if (allLocations.length > 0) {
        setAvailableLocations(allLocations)
        setShowLocationPicker(true)
      } else {
        await errorFeedback()
        Alert.alert(
          'No Venues Found',
          'No venues found nearby. Make sure you have a good GPS signal and try again.\n\nIf this keeps happening, venue search may be temporarily unavailable.'
        )
      }
    } catch (err) {
      await errorFeedback()
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to get your location'
      )
    } finally {
      setIsSearching(false)
    }
  }, [activeCheckin, checkOut, findNearbyLocations, searchGooglePlacesNearby])

  /**
   * Handle confirmation to check in
   */
  const handleConfirmCheckIn = useCallback(async () => {
    if (!nearbyLocation) return

    setShowModal(false)

    // If this is a Google Places location, we need to create it first
    let locationId = nearbyLocation.id
    if (nearbyLocation.fromGooglePlaces) {
      const createdId = await createLocationFromGooglePlace(nearbyLocation)
      if (!createdId) {
        await errorFeedback()
        Alert.alert(
          'Venue Error',
          'Could not save this venue to your account. Check your internet connection and try again.'
        )
        setNearbyLocation(null)
        return
      }
      locationId = createdId
    }

    const result = await checkIn(locationId)
    if (result.success) {
      await successFeedback()
      if (result.alreadyCheckedIn) {
        Alert.alert('Already Checked In', `You're already checked in at ${nearbyLocation.name}`)
      } else {
        // Show duration picker for users without always-on tracking
        if (!hasAlwaysOnTracking) {
          setLastCheckinLocationName(nearbyLocation.name)
          setShowDurationPicker(true)
        }

        if (result.verified && result.accuracyInfo) {
          const accuracyStatus = result.accuracyInfo.status
          if (accuracyStatus === 'poor') {
            Alert.alert(
              'Checked In',
              `You're checked in at ${nearbyLocation.name}.\n\nYour GPS signal is weak. If this isn't the right spot, try again outdoors or away from tall buildings.`
            )
          } else if (accuracyStatus === 'fair') {
            Alert.alert(
              'Checked In',
              `You're checked in at ${nearbyLocation.name}.\n\nGPS accuracy is moderate — your location may be slightly off.`
            )
          }
        }
      }
    } else {
      await errorFeedback()
      // Show detailed error with GPS accuracy info if available
      let errorMessage = result.error || 'Failed to check in'
      if (result.accuracyInfo) {
        const accuracy = result.accuracyInfo.reported
        if (accuracy > 75) {
          errorMessage = `Your GPS is off by ~${Math.round(accuracy)}m, which is too far to verify your location.\n\nTo improve accuracy:\n• Step outside or near a window\n• Move away from tall buildings\n• Wait a moment and try again`
        }
      }
      Alert.alert('Location Too Inaccurate', errorMessage)
    }

    setNearbyLocation(null)
  }, [nearbyLocation, checkIn, createLocationFromGooglePlace])

  /**
   * Handle location selection from picker
   */
  const handleSelectLocation = useCallback((location: NearbyLocation) => {
    setShowLocationPicker(false)
    setAvailableLocations([])
    setNearbyLocation(location)
    setShowModal(true)
  }, [])

  /**
   * Handle duration selection from picker
   */
  const handleSelectDuration = useCallback((minutes: number) => {
    setShowDurationPicker(false)
    setLastCheckinLocationName(null)
    scheduleCheckout(minutes)
  }, [scheduleCheckout])

  /**
   * Handle duration picker dismiss (skip)
   */
  const handleDurationPickerClose = useCallback(() => {
    setShowDurationPicker(false)
    setLastCheckinLocationName(null)
  }, [])

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    setShowModal(false)
    setShowLocationPicker(false)
    setAvailableLocations([])
    setNearbyLocation(null)
  }, [])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const isProcessing = isLoading || isCheckingIn || isCheckingOut || isSearching || isCreatingLocation

  /**
   * Render a location item in the picker
   */
  const renderLocationItem = useCallback(({ item }: { item: NearbyLocation }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => handleSelectLocation(item)}
      activeOpacity={0.7}
      accessibilityLabel={`Check in at ${item.name}${item.fromGooglePlaces ? ' (new venue)' : ''}`}
      accessibilityRole="button"
    >
      <View style={styles.locationItemContent}>
        <View style={styles.locationItemIcon}>
          <Ionicons
            name={item.fromGooglePlaces ? 'add-circle-outline' : 'location'}
            size={24}
            color={item.fromGooglePlaces ? darkTheme.success : darkTheme.primary}
          />
        </View>
        <View style={styles.locationItemText}>
          <Text style={styles.locationItemName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.address && (
            <Text style={styles.locationItemAddress} numberOfLines={1}>
              {item.address}
            </Text>
          )}
          <Text style={styles.locationItemDistance}>
            {Math.round(item.distance)}m away
            {item.fromGooglePlaces && ' • New venue'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={darkTheme.textMuted} />
      </View>
    </TouchableOpacity>
  ), [handleSelectLocation])

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          activeCheckin ? styles.buttonCheckedIn : styles.buttonDefault,
          style,
        ]}
        onPress={handlePress}
        disabled={isProcessing}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={
          activeCheckin
            ? `Checked in at ${activeCheckin.location_name}. Tap to check out.`
            : 'Check in to a nearby location'
        }
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={activeCheckin ? colors.white : darkTheme.primary} />
        ) : (
          <Ionicons
            name={activeCheckin ? 'location' : 'location-outline'}
            size={18}
            color={activeCheckin ? colors.white : darkTheme.primary}
          />
        )}
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="location" size={32} color={darkTheme.primary} />
            </View>
            <Text style={styles.modalTitle}>Check In</Text>
            <Text style={styles.modalLocation}>{nearbyLocation?.name}</Text>
            {nearbyLocation?.address && (
              <Text style={styles.modalAddress}>{nearbyLocation.address}</Text>
            )}
            <Text style={styles.modalDistance}>
              {nearbyLocation ? `${Math.round(nearbyLocation.distance)}m away` : ''}
            </Text>

            {nearbyLocation?.fromGooglePlaces && (
              <View style={styles.newVenueBadge}>
                <Ionicons name="add-circle" size={14} color={darkTheme.success} />
                <Text style={styles.newVenueBadgeText}>New venue - will be added</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleCancel}
                disabled={isCreatingLocation}
                accessibilityLabel="Cancel check-in"
                accessibilityRole="button"
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleConfirmCheckIn}
                disabled={isCreatingLocation}
                accessibilityLabel="Confirm check-in"
                accessibilityRole="button"
              >
                {isCreatingLocation ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Check In</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select a Venue</Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.pickerCloseButton}
                accessibilityLabel="Close location picker"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={darkTheme.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pickerSubtitle}>
              {availableLocations.some(l => l.fromGooglePlaces)
                ? 'Choose a venue to check in. New venues will be added to Backtrack.'
                : 'Choose a venue to check in.'}
            </Text>
            <FlatList
              data={availableLocations}
              renderItem={renderLocationItem}
              keyExtractor={(item) => item.googlePlaceId || item.id}
              style={styles.pickerList}
              ItemSeparatorComponent={() => <View style={styles.pickerSeparator} />}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Duration Picker (shown after check-in for non-tracking users) */}
      <CheckinDurationPicker
        visible={showDurationPicker}
        onClose={handleDurationPickerClose}
        onSelectDuration={handleSelectDuration}
        locationName={lastCheckinLocationName ?? undefined}
        testID={`${testID}-duration-picker`}
      />
    </>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDefault: {
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  buttonCheckedIn: {
    backgroundColor: colors.primary[500],
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
  },
  buttonTextDefault: {
    color: colors.primary[500],
  },
  buttonTextCheckedIn: {
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: darkTheme.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.glassBorder,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 107, 71, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginBottom: 8,
  },
  modalLocation: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[500],
    textAlign: 'center',
    marginBottom: 4,
  },
  modalAddress: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalDistance: {
    fontSize: 14,
    color: darkTheme.textMuted,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: darkTheme.surfaceElevated,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textSecondary,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  newVenueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
  },
  newVenueBadgeText: {
    fontSize: 12,
    color: darkTheme.success,
    fontWeight: '500',
  },
  // Location Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: darkTheme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34, // Safe area
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: darkTheme.glassBorder,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  pickerCloseButton: {
    padding: 4,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerSeparator: {
    height: 1,
    backgroundColor: darkTheme.glassBorder,
    marginLeft: 68,
  },
  locationItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  locationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 71, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationItemText: {
    flex: 1,
  },
  locationItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginBottom: 2,
  },
  locationItemAddress: {
    fontSize: 13,
    color: darkTheme.textSecondary,
    marginBottom: 2,
  },
  locationItemDistance: {
    fontSize: 12,
    color: darkTheme.textMuted,
  },
})

export default CheckInButton
