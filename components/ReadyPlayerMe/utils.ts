/**
 * Ready Player Me Utility Functions
 *
 * Helper functions for working with Ready Player Me avatars.
 */

import { RPMRenderOptions, StoredAvatar, RPMAvatarData } from './types'

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Generate a 2D render URL for an avatar
 *
 * @param avatarIdOrUrl - Avatar ID or full GLB URL
 * @param options - Render options
 * @returns URL to the rendered 2D image
 *
 * @example
 * ```ts
 * // Portrait render
 * const url = getRenderUrl('abc123', { camera: 'portrait', size: 512 })
 *
 * // Full body render with background
 * const url = getRenderUrl('abc123', {
 *   camera: 'fullbody',
 *   size: 1024,
 *   background: 'f5f5f5'
 * })
 * ```
 */
export function getRenderUrl(
  avatarIdOrUrl: string,
  options: RPMRenderOptions = {}
): string {
  // Extract avatar ID if full URL provided
  const avatarId = extractAvatarId(avatarIdOrUrl)

  if (!avatarId) {
    console.warn('[getRenderUrl] Invalid avatar ID or URL:', avatarIdOrUrl)
    return ''
  }

  // Build render URL
  const baseUrl = `https://models.readyplayer.me/${avatarId}.png`
  const params = new URLSearchParams()

  // Camera type (portrait or fullbody)
  if (options.camera) {
    params.append('camera', options.camera)
  }

  // Image size (max 1024)
  if (options.size) {
    const size = Math.min(options.size, 1024)
    params.append('size', size.toString())
  }

  // Expression
  if (options.expression) {
    params.append('expression', options.expression)
  }

  // Background color (hex without #)
  if (options.background) {
    const bg = options.background.replace('#', '')
    params.append('background', bg)
  }

  // Quality
  if (options.quality) {
    params.append('quality', options.quality.toString())
  }

  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * Generate portrait render URL (head/shoulders)
 */
export function getPortraitUrl(avatarId: string, size = 256): string {
  return getRenderUrl(avatarId, {
    camera: 'portrait',
    size,
  })
}

/**
 * Generate full body render URL
 */
export function getFullBodyUrl(avatarId: string, size = 512): string {
  return getRenderUrl(avatarId, {
    camera: 'fullbody',
    size,
  })
}

/**
 * Generate GLB model URL
 */
export function getModelUrl(avatarId: string): string {
  const id = extractAvatarId(avatarId)
  return `https://models.readyplayer.me/${id}.glb`
}

// ============================================================================
// Avatar ID Helpers
// ============================================================================

/**
 * Extract avatar ID from URL or return as-is if already an ID
 */
export function extractAvatarId(avatarIdOrUrl: string): string {
  if (!avatarIdOrUrl) return ''

  // If it's already just an ID (alphanumeric)
  if (/^[a-zA-Z0-9]+$/.test(avatarIdOrUrl)) {
    return avatarIdOrUrl
  }

  // Extract from GLB URL: https://models.readyplayer.me/{id}.glb
  const glbMatch = avatarIdOrUrl.match(/models\.readyplayer\.me\/([a-zA-Z0-9]+)\.glb/)
  if (glbMatch) {
    return glbMatch[1]
  }

  // Extract from PNG URL: https://models.readyplayer.me/{id}.png
  const pngMatch = avatarIdOrUrl.match(/models\.readyplayer\.me\/([a-zA-Z0-9]+)\.png/)
  if (pngMatch) {
    return pngMatch[1]
  }

  return ''
}

/**
 * Check if a string is a valid Ready Player Me avatar ID or URL
 */
export function isValidAvatarId(avatarIdOrUrl: string): boolean {
  return extractAvatarId(avatarIdOrUrl).length > 0
}

// ============================================================================
// Avatar Data Conversion
// ============================================================================

/**
 * Convert RPMAvatarData to StoredAvatar for database storage
 */
export function toStoredAvatar(data: RPMAvatarData): StoredAvatar {
  const avatarId = data.avatarId || extractAvatarId(data.url)

  return {
    avatarId,
    modelUrl: data.url || getModelUrl(avatarId),
    imageUrl: getPortraitUrl(avatarId, 512),
    gender: data.metadata?.gender || 'neutral',
    bodyType: data.metadata?.bodyType || 'fullbody',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Create a StoredAvatar from just an avatar ID
 */
export function createStoredAvatar(
  avatarId: string,
  gender: 'male' | 'female' | 'neutral' = 'neutral',
  bodyType: 'fullbody' | 'halfbody' = 'fullbody'
): StoredAvatar {
  return {
    avatarId,
    modelUrl: getModelUrl(avatarId),
    imageUrl: getPortraitUrl(avatarId, 512),
    gender,
    bodyType,
    createdAt: new Date().toISOString(),
  }
}

// ============================================================================
// Preset Render URLs
// ============================================================================

/**
 * Preset render configurations
 */
export const RENDER_PRESETS = {
  /** Small thumbnail for lists */
  thumbnail: { camera: 'portrait', size: 64 } as RPMRenderOptions,
  /** Small avatar for compact views */
  small: { camera: 'portrait', size: 128 } as RPMRenderOptions,
  /** Medium avatar for cards */
  medium: { camera: 'portrait', size: 256 } as RPMRenderOptions,
  /** Large avatar for profiles */
  large: { camera: 'portrait', size: 512 } as RPMRenderOptions,
  /** Full body small */
  fullBodySmall: { camera: 'fullbody', size: 256 } as RPMRenderOptions,
  /** Full body medium */
  fullBodyMedium: { camera: 'fullbody', size: 512 } as RPMRenderOptions,
  /** Full body large */
  fullBodyLarge: { camera: 'fullbody', size: 1024 } as RPMRenderOptions,
} as const

/**
 * Get render URL using a preset
 */
export function getPresetRenderUrl(
  avatarId: string,
  preset: keyof typeof RENDER_PRESETS
): string {
  return getRenderUrl(avatarId, RENDER_PRESETS[preset])
}
