/**
 * Unit tests for avatar utility functions
 * @see lib/utils/avatar.ts
 */

import {
  formatOptionName,
  getCategoryLabel,
  getOptionDisplayName,
  getCategoryGroup,
  getCategoryOptions,
  createPreviewConfig,
  getOptionValues,
  getOptionCount,
  createAllPreviewConfigs,
  mergeWithDefaults,
  hasCustomOption,
  getOptionValue,
  getConfigDiff,
  areConfigsEqual,
  AVATAR_CATEGORIES,
  PRIMARY_OPTION_KEYS,
  SECONDARY_OPTION_KEYS,
} from '@/lib/utils/avatar'

import {
  AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  AVATAR_OPTIONS,
  AVATAR_OPTION_LABELS,
} from '@/types/avatar'

// ============================================================================
// Display Name Helpers Tests
// ============================================================================

describe('formatOptionName', () => {
  it('converts PascalCase to spaced words', () => {
    expect(formatOptionName('LongHairBigHair')).toBe('Long Hair Big Hair')
    expect(formatOptionName('ShortHairShortFlat')).toBe('Short Hair Short Flat')
    expect(formatOptionName('NoHair')).toBe('No Hair')
  })

  it('handles strings with numbers', () => {
    expect(formatOptionName('Blue01')).toBe('Blue 01')
    expect(formatOptionName('WinterHat1')).toBe('Winter Hat 1')
    expect(formatOptionName('ShortHairDreads02')).toBe('Short Hair Dreads 02')
  })

  it('converts "Blank" to "None"', () => {
    expect(formatOptionName('Blank')).toBe('None')
  })

  it('handles single words', () => {
    expect(formatOptionName('Hat')).toBe('Hat')
    expect(formatOptionName('Turban')).toBe('Turban')
  })

  it('handles mixed case patterns', () => {
    expect(formatOptionName('MoustacheFancy')).toBe('Moustache Fancy')
    expect(formatOptionName('BeardMajestic')).toBe('Beard Majestic')
  })
})

describe('getCategoryLabel', () => {
  it('returns correct labels for all option keys', () => {
    expect(getCategoryLabel('topType')).toBe('Hair / Head')
    expect(getCategoryLabel('hairColor')).toBe('Hair Color')
    expect(getCategoryLabel('accessoriesType')).toBe('Accessories')
    expect(getCategoryLabel('facialHairType')).toBe('Facial Hair')
    expect(getCategoryLabel('facialHairColor')).toBe('Facial Hair Color')
    expect(getCategoryLabel('clotheType')).toBe('Clothes')
    expect(getCategoryLabel('clotheColor')).toBe('Clothes Color')
    expect(getCategoryLabel('graphicType')).toBe('Graphic')
    expect(getCategoryLabel('eyeType')).toBe('Eyes')
    expect(getCategoryLabel('eyebrowType')).toBe('Eyebrows')
    expect(getCategoryLabel('mouthType')).toBe('Mouth')
    expect(getCategoryLabel('skinColor')).toBe('Skin Color')
    expect(getCategoryLabel('avatarStyle')).toBe('Style')
  })

  it('returns labels from AVATAR_OPTION_LABELS constant', () => {
    for (const key of Object.keys(AVATAR_OPTION_LABELS) as Array<keyof typeof AVATAR_OPTION_LABELS>) {
      expect(getCategoryLabel(key)).toBe(AVATAR_OPTION_LABELS[key])
    }
  })
})

describe('getOptionDisplayName', () => {
  it('formats option values for display', () => {
    expect(getOptionDisplayName('topType', 'LongHairBigHair')).toBe('Long Hair Big Hair')
    expect(getOptionDisplayName('accessoriesType', 'Blank')).toBe('None')
    expect(getOptionDisplayName('clotheColor', 'Blue01')).toBe('Blue 01')
  })
})

// ============================================================================
// Category Grouping Tests
// ============================================================================

describe('AVATAR_CATEGORIES', () => {
  it('contains all expected category groups', () => {
    expect(AVATAR_CATEGORIES).toHaveProperty('head')
    expect(AVATAR_CATEGORIES).toHaveProperty('accessories')
    expect(AVATAR_CATEGORIES).toHaveProperty('facialHair')
    expect(AVATAR_CATEGORIES).toHaveProperty('clothing')
    expect(AVATAR_CATEGORIES).toHaveProperty('face')
    expect(AVATAR_CATEGORIES).toHaveProperty('skin')
    expect(AVATAR_CATEGORIES).toHaveProperty('style')
  })

  it('has correct keys in head group', () => {
    expect(AVATAR_CATEGORIES.head).toEqual(['topType', 'hairColor'])
  })

  it('has correct keys in accessories group', () => {
    expect(AVATAR_CATEGORIES.accessories).toEqual(['accessoriesType'])
  })

  it('has correct keys in facialHair group', () => {
    expect(AVATAR_CATEGORIES.facialHair).toEqual(['facialHairType', 'facialHairColor'])
  })

  it('has correct keys in clothing group', () => {
    expect(AVATAR_CATEGORIES.clothing).toEqual(['clotheType', 'clotheColor', 'graphicType'])
  })

  it('has correct keys in face group', () => {
    expect(AVATAR_CATEGORIES.face).toEqual(['eyeType', 'eyebrowType', 'mouthType'])
  })

  it('has correct keys in skin group', () => {
    expect(AVATAR_CATEGORIES.skin).toEqual(['skinColor'])
  })

  it('has correct keys in style group', () => {
    expect(AVATAR_CATEGORIES.style).toEqual(['avatarStyle'])
  })
})

describe('getCategoryGroup', () => {
  it('returns correct group for head-related keys', () => {
    expect(getCategoryGroup('topType')).toBe('head')
    expect(getCategoryGroup('hairColor')).toBe('head')
  })

  it('returns correct group for accessories', () => {
    expect(getCategoryGroup('accessoriesType')).toBe('accessories')
  })

  it('returns correct group for facial hair', () => {
    expect(getCategoryGroup('facialHairType')).toBe('facialHair')
    expect(getCategoryGroup('facialHairColor')).toBe('facialHair')
  })

  it('returns correct group for clothing', () => {
    expect(getCategoryGroup('clotheType')).toBe('clothing')
    expect(getCategoryGroup('clotheColor')).toBe('clothing')
    expect(getCategoryGroup('graphicType')).toBe('clothing')
  })

  it('returns correct group for face features', () => {
    expect(getCategoryGroup('eyeType')).toBe('face')
    expect(getCategoryGroup('eyebrowType')).toBe('face')
    expect(getCategoryGroup('mouthType')).toBe('face')
  })

  it('returns correct group for skin', () => {
    expect(getCategoryGroup('skinColor')).toBe('skin')
  })

  it('returns correct group for style', () => {
    expect(getCategoryGroup('avatarStyle')).toBe('style')
  })
})

describe('getCategoryOptions', () => {
  it('returns correct keys for each group', () => {
    expect(getCategoryOptions('head')).toEqual(['topType', 'hairColor'])
    expect(getCategoryOptions('accessories')).toEqual(['accessoriesType'])
    expect(getCategoryOptions('facialHair')).toEqual(['facialHairType', 'facialHairColor'])
    expect(getCategoryOptions('clothing')).toEqual(['clotheType', 'clotheColor', 'graphicType'])
    expect(getCategoryOptions('face')).toEqual(['eyeType', 'eyebrowType', 'mouthType'])
    expect(getCategoryOptions('skin')).toEqual(['skinColor'])
    expect(getCategoryOptions('style')).toEqual(['avatarStyle'])
  })
})

describe('PRIMARY_OPTION_KEYS', () => {
  it('contains the expected primary keys', () => {
    expect(PRIMARY_OPTION_KEYS).toContain('topType')
    expect(PRIMARY_OPTION_KEYS).toContain('hairColor')
    expect(PRIMARY_OPTION_KEYS).toContain('accessoriesType')
    expect(PRIMARY_OPTION_KEYS).toContain('facialHairType')
    expect(PRIMARY_OPTION_KEYS).toContain('facialHairColor')
    expect(PRIMARY_OPTION_KEYS).toContain('clotheType')
    expect(PRIMARY_OPTION_KEYS).toContain('clotheColor')
    expect(PRIMARY_OPTION_KEYS).toContain('eyeType')
    expect(PRIMARY_OPTION_KEYS).toContain('eyebrowType')
    expect(PRIMARY_OPTION_KEYS).toContain('mouthType')
    expect(PRIMARY_OPTION_KEYS).toContain('skinColor')
  })

  it('has 11 primary keys', () => {
    expect(PRIMARY_OPTION_KEYS).toHaveLength(11)
  })

  it('does not contain secondary keys', () => {
    expect(PRIMARY_OPTION_KEYS).not.toContain('graphicType')
    expect(PRIMARY_OPTION_KEYS).not.toContain('avatarStyle')
  })
})

describe('SECONDARY_OPTION_KEYS', () => {
  it('contains the expected secondary keys', () => {
    expect(SECONDARY_OPTION_KEYS).toContain('graphicType')
    expect(SECONDARY_OPTION_KEYS).toContain('avatarStyle')
  })

  it('has 2 secondary keys', () => {
    expect(SECONDARY_OPTION_KEYS).toHaveLength(2)
  })
})

// ============================================================================
// Preview Config Generation Tests
// ============================================================================

describe('createPreviewConfig', () => {
  const baseConfig: AvatarConfig = {
    topType: 'ShortHairShortFlat',
    hairColor: 'Brown',
    skinColor: 'Light',
  }

  it('creates config with changed option value', () => {
    const preview = createPreviewConfig(baseConfig, 'topType', 'LongHairBigHair')

    expect(preview.topType).toBe('LongHairBigHair')
    expect(preview.hairColor).toBe('Brown')
    expect(preview.skinColor).toBe('Light')
  })

  it('preserves all other config values', () => {
    const fullConfig: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG }
    const preview = createPreviewConfig(fullConfig, 'skinColor', 'DarkBrown')

    expect(preview.skinColor).toBe('DarkBrown')
    expect(preview.topType).toBe(DEFAULT_AVATAR_CONFIG.topType)
    expect(preview.hairColor).toBe(DEFAULT_AVATAR_CONFIG.hairColor)
    expect(preview.clotheType).toBe(DEFAULT_AVATAR_CONFIG.clotheType)
  })

  it('does not mutate original config', () => {
    const original = { ...baseConfig }
    createPreviewConfig(baseConfig, 'topType', 'NoHair')

    expect(baseConfig).toEqual(original)
  })
})

describe('getOptionValues', () => {
  it('returns all values for topType', () => {
    const values = getOptionValues('topType')
    expect(values).toEqual(AVATAR_OPTIONS.topType)
    expect(values).toContain('NoHair')
    expect(values).toContain('LongHairBigHair')
  })

  it('returns all values for skinColor', () => {
    const values = getOptionValues('skinColor')
    expect(values).toEqual(AVATAR_OPTIONS.skinColor)
    expect(values).toContain('Light')
    expect(values).toContain('DarkBrown')
  })

  it('returns all values for accessoriesType', () => {
    const values = getOptionValues('accessoriesType')
    expect(values).toEqual(AVATAR_OPTIONS.accessoriesType)
    expect(values).toContain('Blank')
    expect(values).toContain('Sunglasses')
  })
})

describe('getOptionCount', () => {
  it('returns correct count for topType', () => {
    expect(getOptionCount('topType')).toBe(AVATAR_OPTIONS.topType.length)
    expect(getOptionCount('topType')).toBe(36)
  })

  it('returns correct count for accessoriesType', () => {
    expect(getOptionCount('accessoriesType')).toBe(AVATAR_OPTIONS.accessoriesType.length)
    expect(getOptionCount('accessoriesType')).toBe(7)
  })

  it('returns correct count for skinColor', () => {
    expect(getOptionCount('skinColor')).toBe(AVATAR_OPTIONS.skinColor.length)
    expect(getOptionCount('skinColor')).toBe(7)
  })

  it('returns correct count for avatarStyle', () => {
    expect(getOptionCount('avatarStyle')).toBe(AVATAR_OPTIONS.avatarStyle.length)
    expect(getOptionCount('avatarStyle')).toBe(2)
  })
})

describe('createAllPreviewConfigs', () => {
  const baseConfig: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG }

  it('creates preview configs for all option values', () => {
    const previews = createAllPreviewConfigs(baseConfig, 'skinColor')

    expect(previews).toHaveLength(AVATAR_OPTIONS.skinColor.length)
  })

  it('each preview has correct value and config', () => {
    const previews = createAllPreviewConfigs(baseConfig, 'accessoriesType')

    for (const preview of previews) {
      expect(preview).toHaveProperty('value')
      expect(preview).toHaveProperty('config')
      expect(preview.config.accessoriesType).toBe(preview.value)
    }
  })

  it('includes all option values', () => {
    const previews = createAllPreviewConfigs(baseConfig, 'avatarStyle')
    const values = previews.map(p => p.value)

    expect(values).toContain('Circle')
    expect(values).toContain('Transparent')
  })

  it('preserves base config properties', () => {
    const previews = createAllPreviewConfigs(baseConfig, 'eyeType')

    for (const preview of previews) {
      expect(preview.config.topType).toBe(baseConfig.topType)
      expect(preview.config.hairColor).toBe(baseConfig.hairColor)
    }
  })
})

// ============================================================================
// Config Utilities Tests
// ============================================================================

describe('mergeWithDefaults', () => {
  it('returns full defaults when called with no argument', () => {
    const result = mergeWithDefaults()
    expect(result).toEqual(DEFAULT_AVATAR_CONFIG)
  })

  it('returns full defaults when called with empty object', () => {
    const result = mergeWithDefaults({})
    expect(result).toEqual(DEFAULT_AVATAR_CONFIG)
  })

  it('merges partial config with defaults', () => {
    const partial: Partial<AvatarConfig> = {
      topType: 'NoHair',
      skinColor: 'DarkBrown',
    }
    const result = mergeWithDefaults(partial)

    expect(result.topType).toBe('NoHair')
    expect(result.skinColor).toBe('DarkBrown')
    expect(result.hairColor).toBe(DEFAULT_AVATAR_CONFIG.hairColor)
    expect(result.clotheType).toBe(DEFAULT_AVATAR_CONFIG.clotheType)
  })

  it('overrides all provided values', () => {
    const customConfig: Partial<AvatarConfig> = {
      avatarStyle: 'Transparent',
      topType: 'Hat',
      accessoriesType: 'Sunglasses',
      hairColor: 'Blue',
      facialHairType: 'BeardMajestic',
      facialHairColor: 'Black',
      clotheType: 'Hoodie',
      clotheColor: 'Red',
      graphicType: 'Pizza',
      eyeType: 'Happy',
      eyebrowType: 'RaisedExcited',
      mouthType: 'Smile',
      skinColor: 'Tanned',
    }
    const result = mergeWithDefaults(customConfig)

    expect(result).toEqual(customConfig)
  })
})

describe('hasCustomOption', () => {
  it('returns false for default values', () => {
    const config = { ...DEFAULT_AVATAR_CONFIG }
    expect(hasCustomOption(config, 'topType')).toBe(false)
    expect(hasCustomOption(config, 'skinColor')).toBe(false)
  })

  it('returns true for non-default values', () => {
    const config: AvatarConfig = {
      ...DEFAULT_AVATAR_CONFIG,
      topType: 'NoHair',
    }
    expect(hasCustomOption(config, 'topType')).toBe(true)
  })

  it('returns false for undefined values', () => {
    const config: AvatarConfig = {}
    expect(hasCustomOption(config, 'topType')).toBe(false)
  })

  it('correctly identifies custom options in partial config', () => {
    const config: AvatarConfig = {
      skinColor: 'DarkBrown',
      eyeType: 'Happy',
    }

    expect(hasCustomOption(config, 'skinColor')).toBe(true)
    expect(hasCustomOption(config, 'eyeType')).toBe(true)
    expect(hasCustomOption(config, 'topType')).toBe(false)
  })
})

describe('getOptionValue', () => {
  it('returns the value from config when present', () => {
    const config: AvatarConfig = {
      topType: 'NoHair',
      skinColor: 'DarkBrown',
    }

    expect(getOptionValue(config, 'topType')).toBe('NoHair')
    expect(getOptionValue(config, 'skinColor')).toBe('DarkBrown')
  })

  it('returns default when value is undefined', () => {
    const config: AvatarConfig = {}

    expect(getOptionValue(config, 'topType')).toBe(DEFAULT_AVATAR_CONFIG.topType)
    expect(getOptionValue(config, 'skinColor')).toBe(DEFAULT_AVATAR_CONFIG.skinColor)
  })

  it('handles partial configs correctly', () => {
    const config: AvatarConfig = {
      topType: 'Hat',
    }

    expect(getOptionValue(config, 'topType')).toBe('Hat')
    expect(getOptionValue(config, 'hairColor')).toBe(DEFAULT_AVATAR_CONFIG.hairColor)
    expect(getOptionValue(config, 'clotheType')).toBe(DEFAULT_AVATAR_CONFIG.clotheType)
  })
})

describe('getConfigDiff', () => {
  it('returns empty object for identical configs', () => {
    const config1 = { ...DEFAULT_AVATAR_CONFIG }
    const config2 = { ...DEFAULT_AVATAR_CONFIG }

    expect(getConfigDiff(config1, config2)).toEqual({})
  })

  it('returns changed values only', () => {
    const config1 = { ...DEFAULT_AVATAR_CONFIG }
    const config2 = {
      ...DEFAULT_AVATAR_CONFIG,
      topType: 'NoHair' as const,
      skinColor: 'DarkBrown' as const,
    }

    const diff = getConfigDiff(config1, config2)

    expect(diff).toEqual({
      topType: 'NoHair',
      skinColor: 'DarkBrown',
    })
  })

  it('detects all changed keys', () => {
    const config1: AvatarConfig = {
      topType: 'ShortHairShortFlat',
      hairColor: 'Brown',
      skinColor: 'Light',
    }
    const config2: AvatarConfig = {
      topType: 'LongHairBigHair',
      hairColor: 'Black',
      skinColor: 'DarkBrown',
    }

    const diff = getConfigDiff(config1, config2)

    expect(Object.keys(diff)).toHaveLength(3)
    expect(diff.topType).toBe('LongHairBigHair')
    expect(diff.hairColor).toBe('Black')
    expect(diff.skinColor).toBe('DarkBrown')
  })

  it('handles undefined values correctly', () => {
    const config1: AvatarConfig = { topType: 'Hat' }
    const config2: AvatarConfig = { topType: 'NoHair' }

    const diff = getConfigDiff(config1, config2)

    expect(diff.topType).toBe('NoHair')
  })
})

describe('areConfigsEqual', () => {
  it('returns true for identical configs', () => {
    const config1 = { ...DEFAULT_AVATAR_CONFIG }
    const config2 = { ...DEFAULT_AVATAR_CONFIG }

    expect(areConfigsEqual(config1, config2)).toBe(true)
  })

  it('returns false when any value differs', () => {
    const config1 = { ...DEFAULT_AVATAR_CONFIG }
    const config2 = {
      ...DEFAULT_AVATAR_CONFIG,
      topType: 'NoHair' as const,
    }

    expect(areConfigsEqual(config1, config2)).toBe(false)
  })

  it('returns true for configs with same values in different order', () => {
    const config1: AvatarConfig = {
      topType: 'Hat',
      skinColor: 'Light',
    }
    const config2: AvatarConfig = {
      skinColor: 'Light',
      topType: 'Hat',
    }

    expect(areConfigsEqual(config1, config2)).toBe(true)
  })

  it('returns false for undefined vs defined values', () => {
    const config1: AvatarConfig = { topType: 'Hat' }
    const config2: AvatarConfig = { topType: 'Hat', skinColor: 'Light' }

    expect(areConfigsEqual(config1, config2)).toBe(false)
  })

  it('returns false for different values', () => {
    const config1 = { ...DEFAULT_AVATAR_CONFIG, eyeType: 'Happy' as const }
    const config2 = { ...DEFAULT_AVATAR_CONFIG, eyeType: 'Sad' as const }

    expect(areConfigsEqual(config1, config2)).toBe(false)
  })
})
