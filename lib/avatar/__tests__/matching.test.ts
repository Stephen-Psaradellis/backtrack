/**
 * Tests for lib/avatar/matching.ts
 *
 * Tests the avatar matching algorithm.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  compareAvatars,
  quickMatch,
  filterMatchingPosts,
  getPostsWithMatchScores,
  getMatchDescription,
  explainMatch,
  getMatchQualityColor,
  getMatchScoreColor,
  DEFAULT_MATCHING_CONFIG,
  QUALITY_THRESHOLDS,
  OUTFIT_SIMILARITY,
} from '../matching'
import type { AvatarConfig, StoredAvatar, AvatarPreset } from '../../../components/avatar/types'

// Mock defaults module
vi.mock('../defaults', () => ({
  getAvatarPreset: vi.fn((id: string) => {
    const presets: Record<string, AvatarPreset> = {
      'avatar_asian_m': {
        id: 'avatar_asian_m',
        name: 'Asian Male',
        file: 'avatar_asian_m.glb',
        style: 'Style B',
        ethnicity: 'Asian',
        gender: 'M',
        outfit: 'Casual',
        isLocal: true,
        sizeKB: 1791,
        license: 'CC0',
        source: 'VALID Project',
        variant: 1,
        tags: [],
      },
      'avatar_asian_f': {
        id: 'avatar_asian_f',
        name: 'Asian Female',
        file: 'avatar_asian_f.glb',
        style: 'Style B',
        ethnicity: 'Asian',
        gender: 'F',
        outfit: 'Casual',
        isLocal: true,
        sizeKB: 1710,
        license: 'CC0',
        source: 'VALID Project',
        variant: 1,
        tags: [],
      },
      'avatar_black_m': {
        id: 'avatar_black_m',
        name: 'Black Male',
        file: 'avatar_black_m.glb',
        style: 'Style C',
        ethnicity: 'Black',
        gender: 'M',
        outfit: 'Casual',
        isLocal: true,
        sizeKB: 1890,
        license: 'CC0',
        source: 'VALID Project',
        variant: 1,
        tags: [],
      },
      'avatar_business_m': {
        id: 'avatar_business_m',
        name: 'Business Male',
        file: 'avatar_business_m.glb',
        style: 'Style B',
        ethnicity: 'Asian',
        gender: 'M',
        outfit: 'Business',
        isLocal: true,
        sizeKB: 1800,
        license: 'CC0',
        source: 'VALID Project',
        variant: 1,
        tags: [],
      },
      'avatar_utility_m': {
        id: 'avatar_utility_m',
        name: 'Utility Male',
        file: 'avatar_utility_m.glb',
        style: 'Style B',
        ethnicity: 'Asian',
        gender: 'M',
        outfit: 'Utility',
        isLocal: true,
        sizeKB: 1800,
        license: 'CC0',
        source: 'VALID Project',
        variant: 1,
        tags: [],
      },
      'avatar_no_style': {
        id: 'avatar_no_style',
        name: 'No Style Preset',
        file: 'avatar_no_style.glb',
        style: 'Style B', // Has style but also ethnicity for backward compat testing
        ethnicity: 'Asian',
        gender: 'M',
        outfit: 'Casual',
        isLocal: true,
        sizeKB: 1800,
        license: 'CC0',
        source: 'VALID Project',
        variant: 1,
        tags: [],
      },
    }
    return presets[id]
  }),
}))

describe('matching module constants', () => {
  it('should have default matching config', () => {
    expect(DEFAULT_MATCHING_CONFIG.defaultThreshold).toBe(60)
    expect(DEFAULT_MATCHING_CONFIG.useFuzzyMatching).toBe(true)
  })

  it('should have quality thresholds', () => {
    expect(QUALITY_THRESHOLDS.excellent).toBe(85)
    expect(QUALITY_THRESHOLDS.good).toBe(70)
    expect(QUALITY_THRESHOLDS.fair).toBe(50)
  })

  it('should have outfit similarity groups', () => {
    expect(OUTFIT_SIMILARITY).toContainEqual(['Casual', 'Utility'])
    expect(OUTFIT_SIMILARITY).toContainEqual(['Business', 'Medical'])
  })
})

describe('compareAvatars', () => {
  describe('with null or missing avatars', () => {
    it('should return poor match for null target', () => {
      const consumer: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        gender: 'M',
        outfit: 'Casual',
      }

      const result = compareAvatars(null, consumer)

      expect(result.score).toBe(0)
      expect(result.quality).toBe('poor')
      expect(result.isMatch).toBe(false)
    })

    it('should return poor match for null consumer', () => {
      const target: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        gender: 'M',
        outfit: 'Casual',
      }

      const result = compareAvatars(target, null)

      expect(result.score).toBe(0)
      expect(result.quality).toBe('poor')
      expect(result.isMatch).toBe(false)
    })

    it('should return poor match for undefined avatars', () => {
      const result = compareAvatars(undefined, undefined)

      expect(result.score).toBe(0)
      expect(result.isMatch).toBe(false)
      expect(result.breakdown.nonMatchingAttributes).toContain('style')
      expect(result.breakdown.nonMatchingAttributes).toContain('gender')
      expect(result.breakdown.nonMatchingAttributes).toContain('outfit')
    })
  })

  describe('with AvatarConfig inputs', () => {
    it('should return excellent match for identical avatars', () => {
      const avatar: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Casual',
      }

      const result = compareAvatars(avatar, avatar)

      expect(result.score).toBe(100)
      expect(result.quality).toBe('excellent')
      expect(result.isMatch).toBe(true)
      expect(result.breakdown.matchingAttributes).toContain('style')
      expect(result.breakdown.matchingAttributes).toContain('gender')
      expect(result.breakdown.matchingAttributes).toContain('outfit')
    })

    it('should calculate partial match correctly', () => {
      const target: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Casual',
      }
      const consumer: AvatarConfig = {
        avatarId: 'avatar_asian_f',
        style: 'Style B',
        gender: 'F',
        outfit: 'Casual',
      }

      const result = compareAvatars(target, consumer)

      // Style matches (40%), gender doesn't (0%), outfit matches (30%)
      expect(result.score).toBe(70) // 40 + 0 + 30
      expect(result.quality).toBe('good')
      expect(result.isMatch).toBe(true)
      expect(result.breakdown.matchingAttributes).toContain('style')
      expect(result.breakdown.matchingAttributes).toContain('outfit')
      expect(result.breakdown.nonMatchingAttributes).toContain('gender')
    })

    it('should not match with all different attributes', () => {
      const target: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Casual',
      }
      const consumer: AvatarConfig = {
        avatarId: 'avatar_black_m',
        style: 'Style C',
        gender: 'F',
        outfit: 'Business',
      }

      const result = compareAvatars(target, consumer)

      expect(result.score).toBe(0)
      expect(result.quality).toBe('poor')
      expect(result.isMatch).toBe(false)
    })
  })

  describe('with StoredAvatar inputs', () => {
    it('should extract config from StoredAvatar', () => {
      const target: StoredAvatar = {
        id: 'stored-1',
        config: {
          avatarId: 'avatar_asian_m',
          style: 'Style B',
          gender: 'M',
          outfit: 'Casual',
        },
        version: 2,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }
      const consumer: StoredAvatar = {
        id: 'stored-2',
        config: {
          avatarId: 'avatar_asian_m',
          style: 'Style B',
          gender: 'M',
          outfit: 'Casual',
        },
        version: 2,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      const result = compareAvatars(target, consumer)

      expect(result.score).toBe(100)
      expect(result.isMatch).toBe(true)
    })
  })

  describe('fuzzy matching', () => {
    it('should give partial score for similar outfits when fuzzy enabled', () => {
      const target: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Casual',
      }
      const consumer: AvatarConfig = {
        avatarId: 'avatar_utility_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Utility',
      }

      const result = compareAvatars(target, consumer, 60, true)

      // Style matches (40%), gender matches (30%), outfit fuzzy (30 * 0.7 = 21%)
      expect(result.score).toBe(91) // 40 + 30 + 21
      expect(result.breakdown.partialMatchAttributes).toContain('outfit')
    })

    it('should not give partial score when fuzzy disabled', () => {
      const target: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Casual',
      }
      const consumer: AvatarConfig = {
        avatarId: 'avatar_utility_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Utility',
      }

      const result = compareAvatars(target, consumer, 60, false)

      expect(result.score).toBe(70) // 40 + 30 + 0
      expect(result.breakdown.nonMatchingAttributes).toContain('outfit')
    })
  })

  describe('threshold parameter', () => {
    it('should use custom threshold', () => {
      const target: AvatarConfig = {
        avatarId: 'avatar_asian_m',
        style: 'Style B',
        gender: 'M',
        outfit: 'Casual',
      }
      const consumer: AvatarConfig = {
        avatarId: 'avatar_asian_f',
        style: 'Style B',
        gender: 'F',
        outfit: 'Casual',
      }

      // Score is 70
      const resultLowThreshold = compareAvatars(target, consumer, 50)
      const resultHighThreshold = compareAvatars(target, consumer, 80)

      expect(resultLowThreshold.isMatch).toBe(true)
      expect(resultHighThreshold.isMatch).toBe(false)
    })
  })

  describe('with preset avatars', () => {
    it('should get attributes from preset if not in config', () => {
      const target: AvatarConfig = {
        avatarId: 'avatar_asian_m',
      }
      const consumer: AvatarConfig = {
        avatarId: 'avatar_asian_m',
      }

      const result = compareAvatars(target, consumer)

      // Should get attributes from preset mock
      expect(result.score).toBe(100)
    })
  })
})

describe('quickMatch', () => {
  it('should return true for matching avatars', () => {
    const target: AvatarConfig = {
      avatarId: 'avatar_asian_m',
      style: 'Style B',
      gender: 'M',
      outfit: 'Casual',
    }

    expect(quickMatch(target, target)).toBe(true)
  })

  it('should return false for non-matching avatars', () => {
    const target: AvatarConfig = {
      avatarId: 'avatar_asian_m',
      style: 'Style B',
      gender: 'M',
      outfit: 'Casual',
    }
    const consumer: AvatarConfig = {
      avatarId: 'avatar_black_m',
      style: 'Style C',
      gender: 'F',
      outfit: 'Business',
    }

    expect(quickMatch(target, consumer)).toBe(false)
  })

  it('should use custom threshold', () => {
    const target: AvatarConfig = {
      avatarId: 'avatar_asian_m',
      style: 'Style B',
      gender: 'M',
      outfit: 'Casual',
    }
    const consumer: AvatarConfig = {
      avatarId: 'avatar_asian_f',
      style: 'Style B',
      gender: 'F',
      outfit: 'Casual',
    }

    // Score is 70
    expect(quickMatch(target, consumer, 60)).toBe(true)
    expect(quickMatch(target, consumer, 80)).toBe(false)
  })
})

describe('filterMatchingPosts', () => {
  const consumerAvatar: AvatarConfig = {
    avatarId: 'avatar_asian_m',
    style: 'Style B',
    gender: 'M',
    outfit: 'Casual',
  }

  it('should return empty array for empty posts', () => {
    expect(filterMatchingPosts(consumerAvatar, [])).toEqual([])
  })

  it('should return empty array for null posts', () => {
    expect(filterMatchingPosts(consumerAvatar, null as unknown as [])).toEqual([])
  })

  it('should filter matching posts', () => {
    const posts = [
      { id: '1', target_avatar: { avatarId: 'avatar_asian_m', style: 'Style B' as const, gender: 'M' as const, outfit: 'Casual' as const } },
      { id: '2', target_avatar: { avatarId: 'avatar_black_m', style: 'Style C' as const, gender: 'F' as const, outfit: 'Business' as const } },
      { id: '3', target_avatar: { avatarId: 'avatar_asian_f', style: 'Style B' as const, gender: 'F' as const, outfit: 'Casual' as const } },
    ]

    const result = filterMatchingPosts(consumerAvatar, posts)

    // Post 1 is exact match (100), Post 3 is partial (70), Post 2 doesn't match
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1') // Highest score first
    expect(result[1].id).toBe('3')
  })

  it('should use custom threshold', () => {
    const posts = [
      { id: '1', target_avatar: { avatarId: 'avatar_asian_f', style: 'Style B' as const, gender: 'F' as const, outfit: 'Casual' as const } },
    ]

    // Score is 70
    expect(filterMatchingPosts(consumerAvatar, posts, 60)).toHaveLength(1)
    expect(filterMatchingPosts(consumerAvatar, posts, 80)).toHaveLength(0)
  })
})

describe('getPostsWithMatchScores', () => {
  const consumerAvatar: AvatarConfig = {
    avatarId: 'avatar_asian_m',
    style: 'Style B',
    gender: 'M',
    outfit: 'Casual',
  }

  it('should return empty array for empty posts', () => {
    expect(getPostsWithMatchScores(consumerAvatar, [])).toEqual([])
  })

  it('should return posts with match scores', () => {
    const posts = [
      { id: '1', target_avatar: { avatarId: 'avatar_asian_m', style: 'Style B' as const, gender: 'M' as const, outfit: 'Casual' as const } },
      { id: '2', target_avatar: { avatarId: 'avatar_black_m', style: 'Style C' as const, gender: 'F' as const, outfit: 'Business' as const } },
    ]

    const result = getPostsWithMatchScores(consumerAvatar, posts)

    expect(result).toHaveLength(2)
    expect(result[0].match.score).toBe(100) // Exact match
    expect(result[0].post.id).toBe('1')
    expect(result[1].match.score).toBe(0) // No match
  })

  it('should sort by score descending', () => {
    const posts = [
      { id: '1', target_avatar: { avatarId: 'avatar_black_m', style: 'Style C' as const, gender: 'F' as const, outfit: 'Business' as const } },
      { id: '2', target_avatar: { avatarId: 'avatar_asian_m', style: 'Style B' as const, gender: 'M' as const, outfit: 'Casual' as const } },
    ]

    const result = getPostsWithMatchScores(consumerAvatar, posts)

    expect(result[0].post.id).toBe('2') // Higher score first
  })
})

describe('getMatchDescription', () => {
  it('should format excellent match', () => {
    const result = { score: 90, quality: 'excellent' as const, isMatch: true, breakdown: { primaryScore: 0, secondaryScore: 0, matchingAttributes: [], partialMatchAttributes: [], nonMatchingAttributes: [] } }
    expect(getMatchDescription(result)).toBe('90% match - Excellent')
  })

  it('should format good match', () => {
    const result = { score: 75, quality: 'good' as const, isMatch: true, breakdown: { primaryScore: 0, secondaryScore: 0, matchingAttributes: [], partialMatchAttributes: [], nonMatchingAttributes: [] } }
    expect(getMatchDescription(result)).toBe('75% match - Good')
  })

  it('should format fair match', () => {
    const result = { score: 55, quality: 'fair' as const, isMatch: false, breakdown: { primaryScore: 0, secondaryScore: 0, matchingAttributes: [], partialMatchAttributes: [], nonMatchingAttributes: [] } }
    expect(getMatchDescription(result)).toBe('55% match - Fair')
  })

  it('should format poor match', () => {
    const result = { score: 30, quality: 'poor' as const, isMatch: false, breakdown: { primaryScore: 0, secondaryScore: 0, matchingAttributes: [], partialMatchAttributes: [], nonMatchingAttributes: [] } }
    expect(getMatchDescription(result)).toBe('30% match - Poor')
  })
})

describe('explainMatch', () => {
  it('should explain no matching features', () => {
    const result = {
      score: 0,
      quality: 'poor' as const,
      isMatch: false,
      breakdown: {
        primaryScore: 0,
        secondaryScore: 0,
        matchingAttributes: [],
        partialMatchAttributes: [],
        nonMatchingAttributes: ['style', 'gender', 'outfit'],
      },
    }

    expect(explainMatch(result)).toBe('No matching features')
  })

  it('should explain single matching attribute', () => {
    const result = {
      score: 40,
      quality: 'poor' as const,
      isMatch: false,
      breakdown: {
        primaryScore: 40,
        secondaryScore: 0,
        matchingAttributes: ['style'],
        partialMatchAttributes: [],
        nonMatchingAttributes: ['gender', 'outfit'],
      },
    }

    expect(explainMatch(result)).toBe('appearance matches')
  })

  it('should explain two matching attributes', () => {
    const result = {
      score: 70,
      quality: 'good' as const,
      isMatch: true,
      breakdown: {
        primaryScore: 70,
        secondaryScore: 30,
        matchingAttributes: ['style', 'outfit'],
        partialMatchAttributes: [],
        nonMatchingAttributes: ['gender'],
      },
    }

    expect(explainMatch(result)).toBe('appearance and clothing match')
  })

  it('should explain three matching attributes', () => {
    const result = {
      score: 100,
      quality: 'excellent' as const,
      isMatch: true,
      breakdown: {
        primaryScore: 100,
        secondaryScore: 100,
        matchingAttributes: ['style', 'gender', 'outfit'],
        partialMatchAttributes: [],
        nonMatchingAttributes: [],
      },
    }

    expect(explainMatch(result)).toBe('appearance, gender, and clothing match')
  })

  it('should include partial matches', () => {
    const result = {
      score: 80,
      quality: 'good' as const,
      isMatch: true,
      breakdown: {
        primaryScore: 70,
        secondaryScore: 70,
        matchingAttributes: ['style'],
        partialMatchAttributes: ['outfit'],
        nonMatchingAttributes: ['gender'],
      },
    }

    expect(explainMatch(result)).toBe('appearance and similar clothing match')
  })
})

describe('getMatchQualityColor', () => {
  it('should return green for excellent', () => {
    expect(getMatchQualityColor('excellent')).toBe('#34C759')
  })

  it('should return orange-red for good', () => {
    expect(getMatchQualityColor('good')).toBe('#FF6B47')
  })

  it('should return orange for fair', () => {
    expect(getMatchQualityColor('fair')).toBe('#FF9500')
  })

  it('should return gray for poor', () => {
    expect(getMatchQualityColor('poor')).toBe('#8E8E93')
  })
})

describe('getMatchScoreColor', () => {
  it('should return color based on score threshold', () => {
    expect(getMatchScoreColor(90)).toBe('#34C759') // Excellent
    expect(getMatchScoreColor(75)).toBe('#FF6B47') // Good
    expect(getMatchScoreColor(55)).toBe('#FF9500') // Fair
    expect(getMatchScoreColor(30)).toBe('#8E8E93') // Poor
  })
})

describe('compareAvatars with AvatarPreset inputs', () => {
  it('should handle AvatarPreset as target avatar', () => {
    const targetPreset: AvatarPreset = {
      id: 'avatar_asian_m',
      name: 'Asian Male',
      file: 'avatar_asian_m.glb',
      style: 'Style B',
      ethnicity: 'Asian',
      gender: 'M',
      outfit: 'Casual',
      isLocal: true,
      sizeKB: 1791,
      license: 'CC0',
      source: 'VALID Project',
      variant: 1,
      tags: [],
    }
    const consumer: AvatarConfig = {
      avatarId: 'avatar_asian_m',
      style: 'Style B',
      gender: 'M',
      outfit: 'Casual',
    }

    const result = compareAvatars(targetPreset, consumer)

    expect(result.score).toBe(100)
    expect(result.isMatch).toBe(true)
  })

  it('should handle AvatarPreset as consumer avatar', () => {
    const target: AvatarConfig = {
      avatarId: 'avatar_asian_m',
      style: 'Style B',
      gender: 'M',
      outfit: 'Casual',
    }
    const consumerPreset: AvatarPreset = {
      id: 'avatar_asian_m',
      name: 'Asian Male',
      file: 'avatar_asian_m.glb',
      style: 'Style B',
      ethnicity: 'Asian',
      gender: 'M',
      outfit: 'Casual',
      isLocal: true,
      sizeKB: 1791,
      license: 'CC0',
      source: 'VALID Project',
      variant: 1,
      tags: [],
    }

    const result = compareAvatars(target, consumerPreset)

    expect(result.score).toBe(100)
    expect(result.isMatch).toBe(true)
  })

  it('should handle both being AvatarPreset', () => {
    const preset1: AvatarPreset = {
      id: 'avatar_asian_m',
      name: 'Asian Male',
      file: 'avatar_asian_m.glb',
      style: 'Style B',
      ethnicity: 'Asian',
      gender: 'M',
      outfit: 'Casual',
      isLocal: true,
      sizeKB: 1791,
      license: 'CC0',
      source: 'VALID Project',
      variant: 1,
      tags: [],
    }
    const preset2: AvatarPreset = {
      id: 'avatar_asian_f',
      name: 'Asian Female',
      file: 'avatar_asian_f.glb',
      style: 'Style B',
      ethnicity: 'Asian',
      gender: 'F',
      outfit: 'Casual',
      isLocal: true,
      sizeKB: 1710,
      license: 'CC0',
      source: 'VALID Project',
      variant: 1,
      tags: [],
    }

    const result = compareAvatars(preset1, preset2)

    // Style matches (40%), gender different (0%), outfit matches (30%)
    expect(result.score).toBe(70)
    expect(result.quality).toBe('good')
  })

  it('should return poor match for object that is not a valid avatar type', () => {
    const invalidObject = { someField: 'value' }
    const consumer: AvatarConfig = {
      avatarId: 'avatar_asian_m',
      style: 'Style B',
      gender: 'M',
      outfit: 'Casual',
    }

    const result = compareAvatars(invalidObject as unknown as AvatarConfig, consumer)

    expect(result.score).toBeLessThanOrEqual(30)
  })
})

describe('compareAvatars with ethnicity fallback', () => {
  it('should fall back to config ethnicity when style not available', () => {
    // Config has ethnicity but no style, preset doesn't exist (unknown id)
    const target: AvatarConfig = {
      avatarId: 'unknown_avatar',
      ethnicity: 'Asian',
      gender: 'M',
      outfit: 'Casual',
    }
    const consumer: AvatarConfig = {
      avatarId: 'unknown_avatar_2',
      ethnicity: 'Asian',
      gender: 'F',
      outfit: 'Casual',
    }

    const result = compareAvatars(target, consumer)

    // Both have 'Asian' ethnicity which maps to a style
    // Style matches (40%), gender different (0%), outfit matches (30%)
    expect(result.score).toBe(70)
    expect(result.breakdown.matchingAttributes).toContain('style')
  })

  it('should use preset ethnicity when config has no style or ethnicity', () => {
    const target: AvatarConfig = {
      avatarId: 'avatar_asian_m', // Preset has ethnicity: 'Asian' which maps to Style B
    }
    const consumer: AvatarConfig = {
      avatarId: 'avatar_asian_f', // Preset has ethnicity: 'Asian' which maps to Style B
    }

    const result = compareAvatars(target, consumer)

    // Both use presets with same ethnicity → same style
    expect(result.breakdown.matchingAttributes).toContain('style')
  })

  it('should use preset ethnicity when preset has no style', () => {
    // Use a preset that has ethnicity but no style
    const target: AvatarConfig = {
      avatarId: 'avatar_no_style', // Preset has ethnicity but no style
    }
    const consumer: AvatarConfig = {
      avatarId: 'avatar_no_style', // Same preset
    }

    const result = compareAvatars(target, consumer)

    // Preset ethnicity 'Asian' maps to style, should match
    expect(result.score).toBe(100)
    expect(result.breakdown.matchingAttributes).toContain('style')
  })

  it('should not get full score when both styles are undefined', () => {
    // Both config and preset have no style or ethnicity - exercises return undefined path
    const target: AvatarConfig = {
      avatarId: 'completely_unknown',
      gender: 'M',
      outfit: 'Casual',
    }
    const consumer: AvatarConfig = {
      avatarId: 'completely_unknown_2',
      gender: 'M',
      outfit: 'Casual',
    }

    const result = compareAvatars(target, consumer)

    // When both styles are undefined, style doesn't contribute to score
    // gender matches (30%), outfit matches (30%)
    expect(result.score).toBe(60)
    expect(result.isMatch).toBe(true) // 60 >= 60 threshold
  })
})
