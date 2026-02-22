/**
 * Map Clustering Tests
 *
 * Tests for the manual marker clustering functionality.
 */

import { describe, it, expect } from 'vitest'
import { clusterMarkers, getRegionForCluster } from '../mapClustering'
import type { ClusterableMarker } from '../mapClustering'
import type { MapRegion } from '../../types'

describe('mapClustering', () => {
  describe('clusterMarkers', () => {
    it('returns empty array for empty markers', () => {
      const region: MapRegion = {
        latitude: 37.78,
        longitude: -122.41,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }

      const result = clusterMarkers([], region, 60)
      expect(result).toEqual([])
    })

    it('returns single cluster for single marker', () => {
      const markers: ClusterableMarker[] = [
        { id: '1', latitude: 37.78, longitude: -122.41 },
      ]

      const region: MapRegion = {
        latitude: 37.78,
        longitude: -122.41,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }

      const result = clusterMarkers(markers, region, 60)

      expect(result).toHaveLength(1)
      expect(result[0].count).toBe(1)
      expect(result[0].id).toBe('1')
      expect(result[0].markers).toEqual(markers)
    })

    it('groups nearby markers into cluster', () => {
      const markers: ClusterableMarker[] = [
        { id: '1', latitude: 37.78, longitude: -122.41 },
        { id: '2', latitude: 37.7801, longitude: -122.4101 }, // Very close
        { id: '3', latitude: 37.7802, longitude: -122.4102 }, // Very close
      ]

      const region: MapRegion = {
        latitude: 37.78,
        longitude: -122.41,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }

      const result = clusterMarkers(markers, region, 60)

      // Should create one cluster containing all markers
      expect(result).toHaveLength(1)
      expect(result[0].count).toBe(3)
      expect(result[0].id).toBe('cluster-0')
      expect(result[0].markers).toHaveLength(3)
    })

    it('keeps distant markers separate', () => {
      const markers: ClusterableMarker[] = [
        { id: '1', latitude: 37.78, longitude: -122.41 },
        { id: '2', latitude: 37.79, longitude: -122.42 }, // Far away
      ]

      const region: MapRegion = {
        latitude: 37.78,
        longitude: -122.41,
        latitudeDelta: 0.01, // Very zoomed in
        longitudeDelta: 0.01,
      }

      const result = clusterMarkers(markers, region, 60)

      // Should create two separate clusters (singles)
      expect(result).toHaveLength(2)
      expect(result[0].count).toBe(1)
      expect(result[1].count).toBe(1)
    })

    it('adjusts clustering based on zoom level', () => {
      const markers: ClusterableMarker[] = [
        { id: '1', latitude: 37.78, longitude: -122.41 },
        { id: '2', latitude: 37.785, longitude: -122.415 },
      ]

      // Zoomed out - should cluster
      const regionFar: MapRegion = {
        latitude: 37.78,
        longitude: -122.41,
        latitudeDelta: 0.1, // Zoomed out
        longitudeDelta: 0.1,
      }

      const resultFar = clusterMarkers(markers, regionFar, 60)
      expect(resultFar).toHaveLength(1)
      expect(resultFar[0].count).toBe(2)

      // Zoomed in - should separate
      const regionClose: MapRegion = {
        latitude: 37.78,
        longitude: -122.41,
        latitudeDelta: 0.001, // Very zoomed in
        longitudeDelta: 0.001,
      }

      const resultClose = clusterMarkers(markers, regionClose, 60)
      expect(resultClose).toHaveLength(2)
    })
  })

  describe('getRegionForCluster', () => {
    it('returns tight zoom for single marker cluster', () => {
      const cluster = {
        id: '1',
        latitude: 37.78,
        longitude: -122.41,
        count: 1,
        markers: [{ id: '1', latitude: 37.78, longitude: -122.41 }],
      }

      const region = getRegionForCluster(cluster)

      expect(region.latitude).toBe(37.78)
      expect(region.longitude).toBe(-122.41)
      expect(region.latitudeDelta).toBe(0.01)
      expect(region.longitudeDelta).toBe(0.01)
    })

    it('calculates bounds for multi-marker cluster', () => {
      const cluster = {
        id: 'cluster-1',
        latitude: 37.78,
        longitude: -122.41,
        count: 3,
        markers: [
          { id: '1', latitude: 37.78, longitude: -122.41 },
          { id: '2', latitude: 37.79, longitude: -122.42 },
          { id: '3', latitude: 37.77, longitude: -122.40 },
        ],
      }

      const region = getRegionForCluster(cluster, 1.5)

      // Center should be average of all markers
      expect(region.latitude).toBeCloseTo(37.78, 2)
      expect(region.longitude).toBeCloseTo(-122.41, 2)

      // Deltas should encompass all markers with padding
      expect(region.latitudeDelta).toBeGreaterThan(0)
      expect(region.longitudeDelta).toBeGreaterThan(0)
    })

    it('applies padding multiplier', () => {
      const cluster = {
        id: 'cluster-1',
        latitude: 37.78,
        longitude: -122.41,
        count: 2,
        markers: [
          { id: '1', latitude: 37.78, longitude: -122.41 },
          { id: '2', latitude: 37.79, longitude: -122.42 },
        ],
      }

      const region1 = getRegionForCluster(cluster, 1.0)
      const region2 = getRegionForCluster(cluster, 2.0)

      // Higher padding should result in larger deltas
      expect(region2.latitudeDelta).toBeGreaterThan(region1.latitudeDelta)
      expect(region2.longitudeDelta).toBeGreaterThan(region1.longitudeDelta)
    })
  })
})
