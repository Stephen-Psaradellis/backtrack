/**
 * CachedImage Component (P-030)
 *
 * Wrapper around expo-image with memory-disk caching for improved performance.
 * Falls back to standard React Native Image if expo-image is not available.
 *
 * NOTE: Requires `npx expo install expo-image` to enable caching.
 */

import React from 'react'
import { Image as RNImage, ImageProps as RNImageProps, ImageStyle, StyleProp } from 'react-native'

// ============================================================================
// TYPES
// ============================================================================

export interface CachedImageProps {
  source: { uri: string } | number
  style?: StyleProp<ImageStyle>
  placeholder?: { uri: string } | number
  transition?: number
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  priority?: 'low' | 'normal' | 'high'
  testID?: string
  accessible?: boolean
  accessibilityLabel?: string
}

// ============================================================================
// DYNAMIC IMPORT
// ============================================================================

let ExpoImage: any = null
let expoImageAvailable = false

// Try to load expo-image if available
try {
  // This will only work if expo-image is installed
  ExpoImage = require('expo-image').Image
  expoImageAvailable = true
} catch {
  // expo-image not installed - will fall back to standard Image
  if (__DEV__) {
    console.log(
      '[CachedImage] expo-image not found. Install with: npx expo install expo-image'
    )
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CachedImage component with expo-image integration
 *
 * @example
 * ```tsx
 * <CachedImage
 *   source={{ uri: 'https://example.com/image.jpg' }}
 *   style={{ width: 200, height: 200 }}
 *   placeholder={{ uri: 'https://example.com/placeholder.jpg' }}
 *   transition={300}
 * />
 * ```
 */
export function CachedImage({
  source,
  style,
  placeholder,
  transition = 200,
  contentFit = 'cover',
  priority = 'normal',
  testID,
  accessible = true,
  accessibilityLabel,
}: CachedImageProps): React.JSX.Element {
  // Use expo-image if available
  if (expoImageAvailable && ExpoImage) {
    return (
      <ExpoImage
        source={source}
        style={style}
        placeholder={placeholder}
        transition={transition}
        contentFit={contentFit}
        priority={priority}
        cachePolicy="memory-disk"
        testID={testID}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
      />
    )
  }

  // Fallback to standard React Native Image
  const rnImageProps: RNImageProps = {
    source,
    style,
    testID,
    accessible,
    accessibilityLabel,
  }

  // Standard Image doesn't support contentFit - map to resizeMode
  const resizeMode =
    contentFit === 'cover' ? 'cover' :
    contentFit === 'contain' ? 'contain' :
    contentFit === 'fill' ? 'stretch' :
    'center'

  return (
    <RNImage
      {...rnImageProps}
      resizeMode={resizeMode}
    />
  )
}

export default CachedImage
