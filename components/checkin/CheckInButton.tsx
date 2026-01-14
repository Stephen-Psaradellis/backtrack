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
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'

import { useCheckin } from '../../hooks/useCheckin'
import { supabase } from '../../lib/supabase'
import { successFeedback, errorFeedback, selectionFeedback } from '../../lib/haptics'

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
}

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
  } = useCheckin()

  const [isSearching, setIsSearching] = useState(false)
  const [nearbyLocation, setNearbyLocation] = useState<NearbyLocation | null>(null)
  const [showModal, setShowModal] = useState(false)

  /**
   * Find nearest location within 200m
   */
  const findNearbyLocation = useCallback(async (lat: number, lon: number): Promise<NearbyLocation | null> => {
    try {
      // Query locations within 200m using PostGIS
      const { data, error: queryError } = await supabase.rpc('get_locations_near_point', {
        p_lat: lat,
        p_lon: lon,
        p_radius_meters: 200,
        p_limit: 1,
      })

      if (queryError || !data || data.length === 0) {
        return null
      }

      return {
        id: data[0].id,
        name: data[0].name,
        distance: data[0].distance_meters,
        address: data[0].address,
      }
    } catch {
      return null
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

      // Find nearest location
      const nearby = await findNearbyLocation(
        location.coords.latitude,
        location.coords.longitude
      )

      if (!nearby) {
        await errorFeedback()
        Alert.alert(
          'No Locations Found',
          'No locations found within 200m. Move closer to a location to check in.'
        )
        setIsSearching(false)
        return
      }

      // Show confirmation modal
      setNearbyLocation(nearby)
      setShowModal(true)
    } catch (err) {
      await errorFeedback()
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to get your location'
      )
    } finally {
      setIsSearching(false)
    }
  }, [activeCheckin, checkOut, findNearbyLocation])

  /**
   * Handle confirmation to check in
   */
  const handleConfirmCheckIn = useCallback(async () => {
    if (!nearbyLocation) return

    setShowModal(false)

    const result = await checkIn(nearbyLocation.id)
    if (result.success) {
      await successFeedback()
      if (result.alreadyCheckedIn) {
        Alert.alert('Already Checked In', `You're already checked in at ${nearbyLocation.name}`)
      }
    } else {
      await errorFeedback()
      Alert.alert('Check-In Failed', result.error || 'Failed to check in')
    }

    setNearbyLocation(null)
  }, [nearbyLocation, checkIn])

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    setShowModal(false)
    setNearbyLocation(null)
  }, [])

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const isProcessing = isLoading || isCheckingIn || isCheckingOut || isSearching

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
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={activeCheckin ? '#FFFFFF' : '#FF6B47'} />
        ) : (
          <>
            <Ionicons
              name={activeCheckin ? 'location' : 'location-outline'}
              size={20}
              color={activeCheckin ? '#FFFFFF' : '#FF6B47'}
            />
            <Text
              style={[
                styles.buttonText,
                activeCheckin ? styles.buttonTextCheckedIn : styles.buttonTextDefault,
              ]}
              numberOfLines={1}
            >
              {activeCheckin ? activeCheckin.location_name : 'Check In'}
            </Text>
          </>
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
              <Ionicons name="location" size={32} color="#FF6B47" />
            </View>
            <Text style={styles.modalTitle}>Check In</Text>
            <Text style={styles.modalLocation}>{nearbyLocation?.name}</Text>
            {nearbyLocation?.address && (
              <Text style={styles.modalAddress}>{nearbyLocation.address}</Text>
            )}
            <Text style={styles.modalDistance}>
              {nearbyLocation ? `${Math.round(nearbyLocation.distance)}m away` : ''}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleCancel}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleConfirmCheckIn}
              >
                <Text style={styles.modalButtonConfirmText}>Check In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDefault: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF6B47',
  },
  buttonCheckedIn: {
    backgroundColor: '#FF6B47',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
  },
  buttonTextDefault: {
    color: '#FF6B47',
  },
  buttonTextCheckedIn: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  modalLocation: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B47',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalAddress: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalDistance: {
    fontSize: 14,
    color: '#8E8E93',
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
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FF6B47',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})

export default CheckInButton
