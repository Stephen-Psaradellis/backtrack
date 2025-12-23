/**
 * Avatar utility functions for the character builder
 * Provides helpers for display names, category grouping, and preview configs
 */

import {
  AvatarConfig,
  AvatarOptionKey,
  AvatarOptionValue,
  AVATAR_OPTIONS,
  AVATAR_OPTION_LABELS,
  DEFAULT_AVATAR_CONFIG,
} from '@/types/avatar'

// ============================================================================
// Display Name Helpers
// ============================================================================

/**
 * Converts a PascalCase or camelCase string to a human-readable display name
 * Examples:
 *   'LongHairBigHair' -> 'Long Hair Big Hair'
 *   'ShortHairShortFlat' -> 'Short Hair Short Flat'
 *   'Blue01' -> 'Blue 01'
 *   'NoHair' -> 'No Hair'
 */
export function formatOptionName(value: string): string {
  // Handle special cases
  if (value === 'Blank') return 'None'

  // Insert spaces before capital letters and numbers
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/(\d+)/g, ' $1')
    .trim()
}

/**
 * Gets the display label for an avatar option category
 */
export function getCategoryLabel(key: AvatarOptionKey): string {
  return AVATAR_OPTION_LABELS[key]
}

/**
 * Gets a formatted display name for a specific option value
 */
export function getOptionDisplayName<K extends AvatarOptionKey>(
  _key: K,
  value: AvatarOptionValue<K>
): string {
  return formatOptionName(value)
}

// ============================================================================
// Category Grouping
// ============================================================================

/**
 * Avatar categories organized by UI grouping
 */
export const AVATAR_CATEGORIES = {
  /** Hair and head coverings */
  head: ['topType', 'hairColor'] as const,
  /** Face accessories */
  accessories: ['accessoriesType'] as const,
  /** Facial hair options */
  facialHair: ['facialHairType', 'facialHairColor'] as const,
  /** Clothing options */
  clothing: ['clotheType', 'clotheColor', 'graphicType'] as const,
  /** Facial features */
  face: ['eyeType', 'eyebrowType', 'mouthType'] as const,
  /** Skin appearance */
  skin: ['skinColor'] as const,
  /** Avatar style */
  style: ['avatarStyle'] as const,
} as const

export type AvatarCategoryGroup = keyof typeof AVATAR_CATEGORIES

/**
 * Gets the category group for a given option key
 */
export function getCategoryGroup(key: AvatarOptionKey): AvatarCategoryGroup | null {
  for (const [group, keys] of Object.entries(AVATAR_CATEGORIES)) {
    if ((keys as readonly string[]).includes(key)) {
      return group as AvatarCategoryGroup
    }
  }
  return null
}

/**
 * Gets all option keys for a category group
 */
export function getCategoryOptions(group: AvatarCategoryGroup): readonly AvatarOptionKey[] {
  return AVATAR_CATEGORIES[group] as readonly AvatarOptionKey[]
}

/**
 * Primary option keys for the main category selector
 * These are the main options users will customize, ordered by visual importance
 */
export const PRIMARY_OPTION_KEYS: readonly AvatarOptionKey[] = [
  'topType',
  'hairColor',
  'accessoriesType',
  'facialHairType',
  'facialHairColor',
  'clotheType',
  'clotheColor',
  'eyeType',
  'eyebrowType',
  'mouthType',
  'skinColor',
] as const

/**
 * Secondary option keys (less commonly changed)
 */
export const SECONDARY_OPTION_KEYS: readonly AvatarOptionKey[] = [
  'graphicType',
  'avatarStyle',
] as const

// ============================================================================
// Preview Config Generation
// ============================================================================

/**
 * Creates a preview config showing what the avatar would look like
 * with a specific option value applied to the base config
 */
export function createPreviewConfig<K extends AvatarOptionKey>(
  baseConfig: AvatarConfig,
  optionKey: K,
  optionValue: AvatarOptionValue<K>
): AvatarConfig {
  return {
    ...baseConfig,
    [optionKey]: optionValue,
  }
}

/**
 * Gets all option values for a given option key
 */
export function getOptionValues<K extends AvatarOptionKey>(
  key: K
): readonly AvatarOptionValue<K>[] {
  return AVATAR_OPTIONS[key] as readonly AvatarOptionValue<K>[]
}

/**
 * Gets the count of options for a given key
 */
export function getOptionCount(key: AvatarOptionKey): number {
  return AVATAR_OPTIONS[key].length
}

/**
 * Creates preview configs for all options of a given key
 * Returns an array of { value, config } objects for rendering previews
 */
export function createAllPreviewConfigs<K extends AvatarOptionKey>(
  baseConfig: AvatarConfig,
  optionKey: K
): Array<{ value: AvatarOptionValue<K>; config: AvatarConfig }> {
  const values = getOptionValues(optionKey)
  return values.map((value) => ({
    value,
    config: createPreviewConfig(baseConfig, optionKey, value),
  }))
}

// ============================================================================
// Config Utilities
// ============================================================================

/**
 * Merges a partial config with defaults to create a complete config
 */
export function mergeWithDefaults(partial?: Partial<AvatarConfig>): Required<AvatarConfig> {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...partial,
  }
}

/**
 * Checks if a config has a specific option set (not using default)
 */
export function hasCustomOption(
  config: AvatarConfig,
  key: AvatarOptionKey
): boolean {
  return config[key] !== undefined && config[key] !== DEFAULT_AVATAR_CONFIG[key]
}

/**
 * Gets the current value for an option, falling back to default
 */
export function getOptionValue<K extends AvatarOptionKey>(
  config: AvatarConfig,
  key: K
): AvatarOptionValue<K> {
  return (config[key] ?? DEFAULT_AVATAR_CONFIG[key]) as AvatarOptionValue<K>
}

/**
 * Creates a diff between two configs, returning only changed keys
 */
export function getConfigDiff(
  oldConfig: AvatarConfig,
  newConfig: AvatarConfig
): Partial<AvatarConfig> {
  const diff: Partial<AvatarConfig> = {}

  for (const key of Object.keys(AVATAR_OPTIONS) as AvatarOptionKey[]) {
    const oldValue = oldConfig[key]
    const newValue = newConfig[key]
    if (oldValue !== newValue) {
      ;(diff as Record<string, unknown>)[key] = newValue
    }
  }

  return diff
}

/**
 * Checks if two configs are equal
 */
export function areConfigsEqual(
  config1: AvatarConfig,
  config2: AvatarConfig
): boolean {
  for (const key of Object.keys(AVATAR_OPTIONS) as AvatarOptionKey[]) {
    if (config1[key] !== config2[key]) {
      return false
    }
  }
  return true
}
