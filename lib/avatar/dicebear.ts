/**
 * DiceBear Avatar Adapter
 *
 * Provides adapter functions for converting AvatarConfig (avataaars format)
 * to DiceBear's avataaars style options and generating SVG/DataURI output.
 *
 * This adapter maintains backward compatibility with existing database configs
 * while using the modern DiceBear library for rendering.
 */

import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'
import {
  AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
} from '@/types/avatar'

// ============================================================================
// Types
// ============================================================================

/**
 * DiceBear avataaars style options
 * Maps to the options accepted by createAvatar(avataaars, options)
 */
export interface DiceBearAvataaarsOptions {
  seed?: string
  size?: number
  backgroundColor?: string[]
  backgroundType?: ('solid' | 'gradientLinear')[]
  backgroundRotation?: number[]
  style?: ('circle' | 'default')[]
  top?: string[]
  accessories?: string[]
  accessoriesProbability?: number
  accessoriesColor?: string[]
  clothingGraphic?: string[]
  clothing?: string[]
  clothesColor?: string[]
  eyebrows?: string[]
  eyes?: string[]
  facialHair?: string[]
  facialHairProbability?: number
  facialHairColor?: string[]
  hairColor?: string[]
  hatColor?: string[]
  mouth?: string[]
  nose?: string[]
  skinColor?: string[]
}

// ============================================================================
// Property Name Mapping
// ============================================================================

/**
 * Maps avataaars property names to DiceBear property names
 * Some properties have different names in DiceBear
 */
const PROP_NAME_MAP: Record<string, string> = {
  topType: 'top',
  accessoriesType: 'accessories',
  facialHairType: 'facialHair',
  clotheType: 'clothing',
  clotheColor: 'clothesColor',
  graphicType: 'clothingGraphic',
  eyeType: 'eyes',
  eyebrowType: 'eyebrows',
  mouthType: 'mouth',
  // These are the same in both
  hairColor: 'hairColor',
  facialHairColor: 'facialHairColor',
  skinColor: 'skinColor',
  avatarStyle: 'style',
}

/**
 * Maps avatarStyle values to DiceBear style values
 */
const AVATAR_STYLE_MAP: Record<string, string> = {
  Circle: 'circle',
  Transparent: 'default',
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Converts an AvatarConfig to DiceBear avataaars options
 *
 * @param config - The avatar configuration in avataaars format
 * @returns DiceBear options object for the avataaars style
 */
export function convertToDiceBearOptions(
  config: AvatarConfig
): DiceBearAvataaarsOptions {
  // Merge with defaults to ensure all values are present
  const mergedConfig: Required<AvatarConfig> = {
    ...DEFAULT_AVATAR_CONFIG,
    ...config,
  }

  const options: DiceBearAvataaarsOptions = {}

  // Convert each property, mapping names and wrapping in arrays
  for (const [avataaarsKey, dicebearKey] of Object.entries(PROP_NAME_MAP)) {
    const value = mergedConfig[avataaarsKey as keyof AvatarConfig]
    if (value !== undefined) {
      // Handle special case for avatarStyle
      if (avataaarsKey === 'avatarStyle') {
        const mappedValue = AVATAR_STYLE_MAP[value] || 'circle'
        ;(options as Record<string, unknown>)[dicebearKey] = [mappedValue]
      } else {
        // DiceBear expects array format for option values
        ;(options as Record<string, unknown>)[dicebearKey] = [value]
      }
    }
  }

  return options
}

/**
 * Creates a DiceBear avatar instance from an AvatarConfig
 *
 * @param config - The avatar configuration
 * @param size - Optional size in pixels
 * @returns DiceBear avatar result object
 */
export function createDiceBearAvatar(
  config: AvatarConfig,
  size?: number
) {
  const options = convertToDiceBearOptions(config)

  if (size !== undefined) {
    options.size = size
  }

  return createAvatar(avataaars, options)
}

/**
 * Creates an SVG string from an AvatarConfig
 * Use this for React Native with react-native-svg's SvgXml
 *
 * @param config - The avatar configuration
 * @param size - Optional size in pixels
 * @returns SVG string
 */
export function createAvatarSvg(
  config: AvatarConfig,
  size?: number
): string {
  return createDiceBearAvatar(config, size).toString()
}

/**
 * Creates a data URI from an AvatarConfig
 * Use this for web with <img> tags
 *
 * @param config - The avatar configuration
 * @param size - Optional size in pixels
 * @returns Data URI string (image/svg+xml format)
 */
export function createAvatarDataUri(
  config: AvatarConfig,
  size?: number
): string {
  return createDiceBearAvatar(config, size).toDataUri()
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates that an AvatarConfig can be converted to DiceBear options
 * Returns true if all values are valid for DiceBear
 *
 * @param config - The avatar configuration to validate
 * @returns True if the config is valid for DiceBear
 */
export function isValidDiceBearConfig(config: AvatarConfig): boolean {
  // All values should be strings if present
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && typeof value !== 'string') {
      return false
    }
    // Check that the key is a known property
    if (key !== 'avatarStyle' && !(key in PROP_NAME_MAP)) {
      // Unknown keys are allowed but ignored
    }
  }
  return true
}

/**
 * Gets the DiceBear property name for an avataaars property name
 *
 * @param avataaarsKey - The avataaars property name
 * @returns The corresponding DiceBear property name
 */
export function getDiceBearPropName(avataaarsKey: string): string {
  return PROP_NAME_MAP[avataaarsKey] || avataaarsKey
}
