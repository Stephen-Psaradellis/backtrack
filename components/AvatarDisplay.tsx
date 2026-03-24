/**
 * AvatarDisplay Component
 *
 * Shared component for rendering AI-generated avatars.
 * Supports SVG string rendering (offline-first), URL fallback,
 * and placeholder/initials when no avatar is available.
 */

import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { darkTheme } from '../constants/glassStyles'
import {
  type StoredAvatar,
  type AvatarSize,
  AVATAR_SIZE_MAP,
  hasGeneratedAvatar,
  getAvatarSvg,
  getAvatarUrl,
} from '../types/avatar'

// ============================================================================
// TYPES
// ============================================================================

export interface AvatarDisplayProps {
  /** StoredAvatar data (with generatedAvatar) */
  avatar?: StoredAvatar | null
  /** Direct SVG string override */
  svg?: string | null
  /** Direct URL override */
  url?: string | null
  /** Avatar size preset */
  size?: AvatarSize
  /** Custom pixel size (overrides size preset) */
  pixelSize?: number
  /** Initials to show as fallback (e.g. first letter of name) */
  initials?: string
  /** Test ID for testing */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AvatarDisplay({
  avatar,
  svg: svgProp,
  url: urlProp,
  size = 'md',
  pixelSize,
  initials,
  testID = 'avatar-display',
}: AvatarDisplayProps): React.ReactElement {
  const px = pixelSize ?? AVATAR_SIZE_MAP[size]
  const borderRadius = px / 2

  // Resolve SVG and URL from props or avatar data
  const svgString = svgProp ?? getAvatarSvg(avatar)
  const imageUrl = urlProp ?? getAvatarUrl(avatar)
  const hasAvatar = svgString || imageUrl || hasGeneratedAvatar(avatar)

  // Priority: SVG string > URL > Placeholder
  if (svgString) {
    return (
      <View
        style={[styles.container, { width: px, height: px, borderRadius }]}
        testID={testID}
      >
        <SvgXml
          xml={svgString}
          width={px}
          height={px}
        />
      </View>
    )
  }

  if (imageUrl) {
    return (
      <View
        style={[styles.container, { width: px, height: px, borderRadius }]}
        testID={testID}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: px, height: px, borderRadius }}
          resizeMode="cover"
        />
      </View>
    )
  }

  // Placeholder fallback
  const displayChar = initials?.[0]?.toUpperCase() ?? '?'
  const fontSize = px * 0.4

  return (
    <View
      style={[
        styles.container,
        styles.placeholder,
        { width: px, height: px, borderRadius },
      ]}
      testID={testID}
    >
      <Text style={[styles.placeholderText, { fontSize }]}>{displayChar}</Text>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
  },
  placeholder: {
    backgroundColor: darkTheme.surfaceElevated,
    borderWidth: 2,
    borderColor: darkTheme.cardBorder,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontWeight: '700',
    color: darkTheme.textMuted,
  },
})

export default AvatarDisplay
