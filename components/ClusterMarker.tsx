/**
 * ClusterMarker Component
 *
 * Renders a cluster marker on the map with a count badge.
 * Used by MapView when multiple markers are grouped together.
 *
 * Features:
 * - Circular badge with marker count
 * - Size scales with marker count (more markers = larger badge)
 * - Uses app's primary color theme
 * - White count text for maximum contrast
 *
 * @example
 * ```tsx
 * <Marker coordinate={{ latitude, longitude }}>
 *   <ClusterMarker count={5} />
 * </Marker>
 * ```
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { darkTheme } from '../constants/glassStyles'

// ============================================================================
// TYPES
// ============================================================================

export interface ClusterMarkerProps {
  /** Number of markers in the cluster */
  count: number
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ClusterMarker - Visual representation of a marker cluster
 *
 * Displays a circular badge with the number of markers in the cluster.
 * Size automatically scales based on count for visual hierarchy.
 */
export function ClusterMarker({ count }: ClusterMarkerProps): JSX.Element {
  // Calculate size based on count (larger clusters = larger badges)
  // Min size: 40, Max size: 70
  const baseSize = 40
  const maxSize = 70
  const size = Math.min(maxSize, baseSize + Math.log10(count) * 15)

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={styles.text}>{count}</Text>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: darkTheme.primary, // Coral/primary color
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    // Border for definition
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  text: {
    color: '#FFFFFF', // White text for maximum contrast
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
})

export default ClusterMarker
