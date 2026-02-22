/**
 * Map Marker Clustering Utility
 *
 * Provides manual marker clustering functionality for react-native-maps.
 * Groups nearby markers based on map zoom level to improve performance
 * and readability on maps with many markers.
 *
 * @example
 * ```tsx
 * const clusters = clusterMarkers(markers, region, 60);
 * // clusters = [
 * //   { id: 'cluster-1', latitude: 37.78, longitude: -122.41, count: 5, markers: [...] },
 * //   { id: 'marker-1', latitude: 37.79, longitude: -122.42, count: 1, markers: [marker] }
 * // ]
 * ```
 */

import type { MapRegion } from '../types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Marker data that can be clustered
 */
export interface ClusterableMarker {
  id: string
  latitude: number
  longitude: number
  [key: string]: unknown // Allow additional marker properties
}

/**
 * Cluster result containing grouped markers
 */
export interface MarkerCluster<T extends ClusterableMarker = ClusterableMarker> {
  /** Unique cluster ID */
  id: string
  /** Center latitude of cluster */
  latitude: number
  /** Center longitude of cluster */
  longitude: number
  /** Number of markers in cluster (1 = single marker) */
  count: number
  /** Array of markers in this cluster */
  markers: T[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Earth radius in kilometers (for distance calculations)
 */
const EARTH_RADIUS_KM = 6371

/**
 * Default cluster radius in pixels at current zoom level
 */
const DEFAULT_CLUSTER_RADIUS = 60

// ============================================================================
// CLUSTERING ALGORITHM
// ============================================================================

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Convert pixel radius to approximate geographic distance based on zoom level
 * Uses the map region's latitudeDelta as a proxy for zoom level
 */
function pixelRadiusToKm(pixelRadius: number, region: MapRegion): number {
  // Approximate: smaller latitudeDelta = more zoomed in = smaller km per pixel
  // At latitudeDelta ~0.01 (very zoomed in), 60px ~= 0.5km
  // At latitudeDelta ~0.1 (zoomed out), 60px ~= 5km
  const kmPerPixel = (region.latitudeDelta / 0.01) * (0.5 / 60)
  return pixelRadius * kmPerPixel
}

/**
 * Group markers into clusters based on proximity
 *
 * @param markers - Array of markers to cluster
 * @param region - Current map region (used to determine zoom-based clustering distance)
 * @param clusterRadius - Radius in pixels for clustering (default: 60)
 * @returns Array of clusters, where each cluster contains 1+ markers
 *
 * @example
 * ```tsx
 * const region = {
 *   latitude: 37.78,
 *   longitude: -122.41,
 *   latitudeDelta: 0.05,
 *   longitudeDelta: 0.05,
 * };
 * const clusters = clusterMarkers(favoriteMarkers, region, 60);
 * ```
 */
export function clusterMarkers<T extends ClusterableMarker>(
  markers: T[],
  region: MapRegion,
  clusterRadius: number = DEFAULT_CLUSTER_RADIUS
): MarkerCluster<T>[] {
  if (markers.length === 0) {
    return []
  }

  // Convert pixel radius to geographic distance based on zoom
  const clusterDistanceKm = pixelRadiusToKm(clusterRadius, region)

  // Track which markers have been assigned to clusters
  const clustered = new Set<string>()
  const clusters: MarkerCluster<T>[] = []

  // Iterate through all markers
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]

    // Skip if already clustered
    if (clustered.has(marker.id)) {
      continue
    }

    // Start a new cluster with this marker
    const clusterMarkers: T[] = [marker]
    clustered.add(marker.id)

    // Find all nearby markers that should be in this cluster
    for (let j = i + 1; j < markers.length; j++) {
      const otherMarker = markers[j]

      // Skip if already clustered
      if (clustered.has(otherMarker.id)) {
        continue
      }

      // Calculate distance between markers
      const distance = calculateDistance(
        marker.latitude,
        marker.longitude,
        otherMarker.latitude,
        otherMarker.longitude
      )

      // Add to cluster if within radius
      if (distance <= clusterDistanceKm) {
        clusterMarkers.push(otherMarker)
        clustered.add(otherMarker.id)
      }
    }

    // Calculate cluster center (average of all marker positions)
    const centerLat =
      clusterMarkers.reduce((sum, m) => sum + m.latitude, 0) / clusterMarkers.length
    const centerLon =
      clusterMarkers.reduce((sum, m) => sum + m.longitude, 0) / clusterMarkers.length

    // Create cluster object
    clusters.push({
      id: clusterMarkers.length === 1 ? marker.id : `cluster-${i}`,
      latitude: centerLat,
      longitude: centerLon,
      count: clusterMarkers.length,
      markers: clusterMarkers,
    })
  }

  return clusters
}

/**
 * Calculate a region that fits all markers in a cluster
 * Useful for zooming in when a cluster is tapped
 *
 * @param cluster - The cluster to fit
 * @param padding - Padding multiplier for region bounds (default: 1.5)
 * @returns Map region that fits all cluster markers
 *
 * @example
 * ```tsx
 * const region = getRegionForCluster(cluster, 1.8);
 * mapRef.current?.animateToRegion(region, 500);
 * ```
 */
export function getRegionForCluster<T extends ClusterableMarker>(
  cluster: MarkerCluster<T>,
  padding: number = 1.5
): MapRegion {
  const markers = cluster.markers

  // Single marker - use tight zoom
  if (markers.length === 1) {
    return {
      latitude: markers[0].latitude,
      longitude: markers[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
  }

  // Multiple markers - find bounds
  let minLat = markers[0].latitude
  let maxLat = markers[0].latitude
  let minLng = markers[0].longitude
  let maxLng = markers[0].longitude

  markers.forEach((marker) => {
    minLat = Math.min(minLat, marker.latitude)
    maxLat = Math.max(maxLat, marker.latitude)
    minLng = Math.min(minLng, marker.longitude)
    maxLng = Math.max(maxLng, marker.longitude)
  })

  // Calculate center
  const latitude = (minLat + maxLat) / 2
  const longitude = (minLng + maxLng) / 2

  // Calculate deltas with padding
  const latitudeDelta = Math.max((maxLat - minLat) * padding, 0.01)
  const longitudeDelta = Math.max((maxLng - minLng) * padding, 0.01)

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  }
}
