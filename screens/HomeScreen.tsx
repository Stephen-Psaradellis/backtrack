/**
 * HomeScreen - Main home screen with full-screen map
 *
 * The Explore tab shows only the map view for discovering locations.
 * Users tap on POIs (Points of Interest) to view posts at that location.
 * Favorites are managed in the dedicated Favorites tab.
 */
import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { View, StyleSheet, StatusBar, Text, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import { useLocation } from '../hooks/useLocation'
import { useFavoriteLocations, type FavoriteLocationWithDistance } from '../hooks/useFavoriteLocations'
import { MapView, createRegion, createMarker, type MapMarker, type PoiData } from '../components/MapView'
import { selectionFeedback, lightFeedback } from '../lib/haptics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import { ClusterMarker } from '../components/ClusterMarker'
import { clusterMarkers, getRegionForCluster, type MarkerCluster } from '../lib/utils/mapClustering'
import { RadarEncounters } from '../components/RadarEncounters'
import { useRadar } from '../hooks/useRadar'
import type { MapRegion } from '../lib/types'
import type { MainTabNavigationProp } from '../navigation/types'

// ============================================================================
// HomeScreen Component
// ============================================================================

const COACH_MARK_KEY = '@backtrack/homeCoachSeen'

export function HomeScreen(): React.ReactNode {
  const navigation = useNavigation<MainTabNavigationProp>()
  const { latitude, longitude, loading: locationLoading } = useLocation()

  // Coach mark state for first-time users
  const [showCoachMark, setShowCoachMark] = useState(false)

  // Map region state for clustering
  const [currentRegion, setCurrentRegion] = useState<MapRegion | undefined>()

  // Radar encounters state
  const [showRadarPanel, setShowRadarPanel] = useState(false)
  const { recentEncounters, encounterCount, radarEnabled } = useRadar()

  useEffect(() => {
    const checkCoachMark = async () => {
      try {
        const seen = await AsyncStorage.getItem(COACH_MARK_KEY)
        if (seen === null) {
          setShowCoachMark(true)
        }
      } catch {
        // Fail silently - don't block the user
      }
    }
    checkCoachMark()
  }, [])

  const dismissCoachMark = useCallback(async () => {
    setShowCoachMark(false)
    try {
      await AsyncStorage.setItem(COACH_MARK_KEY, 'true')
    } catch {
      // Fail silently
    }
  }, [])

  const userCoordinates = latitude && longitude ? { latitude, longitude } : null

  const {
    favorites,
    refetch: refetchFavorites,
  } = useFavoriteLocations({ userCoordinates })

  // ---------------------------------------------------------------------------
  // Map Configuration
  // ---------------------------------------------------------------------------

  const initialRegion = userCoordinates
    ? createRegion(userCoordinates, 'medium')
    : undefined

  // Set initial region for clustering
  useEffect(() => {
    if (initialRegion && !currentRegion) {
      setCurrentRegion(initialRegion)
    }
  }, [initialRegion, currentRegion])

  // Create markers for favorites (shown on the map as reference)
  const favoriteMarkers: MapMarker[] = favorites.map((fav) =>
    createMarker(
      fav.id,
      { latitude: fav.latitude, longitude: fav.longitude },
      { title: fav.custom_name }
    )
  )

  // Cluster markers based on current map region
  const clusteredMarkers = useMemo(() => {
    if (!currentRegion || favoriteMarkers.length === 0) {
      return []
    }

    const clusters = clusterMarkers(favoriteMarkers, currentRegion, 60)

    // Convert clusters to MapMarker format
    return clusters.map((cluster) => {
      const isCluster = cluster.count > 1

      if (isCluster) {
        // Cluster marker with custom view
        return createMarker(
          cluster.id,
          { latitude: cluster.latitude, longitude: cluster.longitude },
          {
            customView: <ClusterMarker count={cluster.count} />,
            tracksViewChanges: false,
          }
        )
      } else {
        // Single marker - use original marker data
        const originalMarker = cluster.markers[0]
        return createMarker(
          originalMarker.id,
          { latitude: originalMarker.latitude, longitude: originalMarker.longitude },
          { title: originalMarker.title }
        )
      }
    })
  }, [favoriteMarkers, currentRegion])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePoiClick = useCallback((poi: PoiData) => {
    selectionFeedback()
    // Navigate to posts for this POI location
    navigation.navigate('Ledger', {
      locationId: poi.placeId ?? '',
      locationName: poi.name,
    })
  }, [navigation])

  const handleMarkerPress = useCallback((marker: MapMarker) => {
    // Check if this is a cluster marker
    if (marker.id.startsWith('cluster-')) {
      // Find the cluster to get all markers
      const clusters = currentRegion ? clusterMarkers(favoriteMarkers, currentRegion, 60) : []
      const cluster = clusters.find(c => c.id === marker.id)

      if (cluster && cluster.count > 1) {
        // Zoom to fit all markers in the cluster
        selectionFeedback()
        const region = getRegionForCluster(cluster, 1.8)
        setCurrentRegion(region)
        return
      }
    }

    // Single marker - navigate to posts
    const fav = favorites.find(f => f.id === marker.id)
    if (fav) {
      selectionFeedback()
      // Navigate to posts for this favorite location
      navigation.navigate('Ledger', {
        locationId: fav.place_id ?? '',
        locationName: fav.place_name,
      })
    }
  }, [favorites, navigation, favoriteMarkers, currentRegion])

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchFavorites()
    }, [refetchFavorites])
  )

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (locationLoading) {
    return (
      <View style={styles.container} testID="home-screen">
        <StatusBar barStyle="light-content" />
        <GlobalHeader />
        <View style={styles.centered}>
          <LoadingSpinner message="Getting your location..." />
        </View>
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container} testID="home-screen">
      <StatusBar barStyle="light-content" />
      {/* Global Header */}
      <GlobalHeader />
      <FloatingActionButtons testID="home-floating-actions" />

      {/* Full-screen Map */}
      <View style={styles.mapContainer} testID="home-map-container">
        <MapView
          showsUserLocation
          initialRegion={initialRegion}
          markers={clusteredMarkers}
          mapPadding={{ bottom: 120 }}
          onMapReady={() => lightFeedback()}
          onMarkerPress={handleMarkerPress}
          onPoiClick={handlePoiClick}
          onRegionChangeComplete={(region) => setCurrentRegion(region)}
        />
      </View>

      {/* Radar Encounters Panel */}
      {radarEnabled && encounterCount > 0 && (
        <View style={styles.radarPanel}>
          <TouchableOpacity
            style={styles.radarHeader}
            onPress={() => {
              lightFeedback()
              setShowRadarPanel(!showRadarPanel)
            }}
            activeOpacity={0.7}
            testID="home-radar-toggle"
            accessibilityRole="button"
            accessibilityLabel={`Nearby encounters panel, ${encounterCount} new encounters, ${showRadarPanel ? 'expanded' : 'collapsed'}`}
            accessibilityHint="Double tap to toggle encounters panel"
          >
            <View style={styles.radarHeaderLeft}>
              <Ionicons name="radar" size={20} color={darkTheme.primary} />
              <Text style={styles.radarTitle}>Nearby Encounters</Text>
              {encounterCount > 0 && (
                <View style={styles.radarBadge}>
                  <Text style={styles.radarBadgeText}>{encounterCount}</Text>
                </View>
              )}
            </View>
            <Ionicons
              name={showRadarPanel ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={darkTheme.textMuted}
            />
          </TouchableOpacity>

          {showRadarPanel && (
            <View style={styles.radarContent}>
              <RadarEncounters
                encounters={recentEncounters}
                testID="home-radar-encounters"
              />
            </View>
          )}
        </View>
      )}

      {/* Coach Mark Overlay for First-Time Users */}
      {showCoachMark && (
        <Modal
          transparent
          animationType="fade"
          visible={showCoachMark}
          onRequestClose={dismissCoachMark}
          testID="home-coach-mark-modal"
        >
          <View style={styles.coachOverlay}>
            <View style={styles.coachCard}>
              <Ionicons
                name="map-outline"
                size={48}
                color={darkTheme.primary}
                style={styles.coachIcon}
              />
              <Text style={styles.coachTitle}>Welcome to Backtrack!</Text>
              <Text style={styles.coachBody}>
                Explore the map to discover places where connections happen. Tap any location to see posts from people nearby.
              </Text>
              <TouchableOpacity
                style={styles.coachButton}
                onPress={dismissCoachMark}
                testID="home-coach-mark-dismiss"
                accessibilityRole="button"
                accessibilityLabel="Got it, dismiss welcome message"
              >
                <Text style={styles.coachButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.background,
  },
  mapContainer: {
    flex: 1,
  },
  coachOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  coachCard: {
    backgroundColor: darkTheme.surface,
    borderRadius: 16,
    padding: spacing[7],
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  coachIcon: {
    marginBottom: spacing[4],
  },
  coachTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  coachBody: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  coachButton: {
    backgroundColor: darkTheme.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: 12,
    alignItems: 'center',
  },
  coachButtonText: {
    color: darkTheme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Radar panel styles
  radarPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: darkTheme.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  radarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  radarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  radarBadge: {
    backgroundColor: darkTheme.primary,
    borderRadius: 10,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  radarContent: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    maxHeight: 300,
  },
})

export default HomeScreen
