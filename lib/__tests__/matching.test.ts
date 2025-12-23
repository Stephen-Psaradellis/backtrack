/**
 * Comprehensive unit tests for the avatar matching algorithm.
 *
 * Tests cover:
 * - Individual similarity calculation functions (12 total)
 * - Utility functions (type guards, validators)
 * - Threshold evaluation functions
 * - Main weighted scoring engine
 * - Edge cases (identical avatars, completely different avatars)
 * - Custom configuration scenarios
 */

import { describe, it, expect } from 'vitest'
import type { AvatarConfig } from '../../types/avatar'
import { DEFAULT_AVATAR_CONFIG } from '../../types/avatar'
import {
  // Similarity functions
  calculateSkinColorSimilarity,
  calculateHairColorSimilarity,
  calculateTopTypeSimilarity,
  calculateFacialHairSimilarity,
  calculateFacialHairColorSimilarity,
  calculateEyeTypeSimilarity,
  calculateMouthTypeSimilarity,
  calculateEyebrowTypeSimilarity,
  calculateClotheTypeSimilarity,
  calculateClotheColorSimilarity,
  calculateAccessoriesSimilarity,
  calculateGraphicTypeSimilarity,
  // Utility functions
  isMatchQuality,
  validateWeightsSum,
  validateThresholdsOrder,
  // Threshold evaluation functions
  evaluateMatch,
  isMatch,
  getMatchQuality,
  getMatchQualityDescription,
  getQualityScoreRange,
  // Main scoring function
  calculateAvatarMatchScore,
  // Types and configurations
  DEFAULT_MATCH_WEIGHTS,
  DEFAULT_MATCH_THRESHOLDS,
  DEFAULT_MATCH_CONFIG,
  STRICT_MATCH_CONFIG,
  RELAXED_MATCH_CONFIG,
  APPEARANCE_FOCUSED_CONFIG,
  STYLE_FOCUSED_CONFIG,
  APPEARANCE_FOCUSED_WEIGHTS,
  STYLE_FOCUSED_WEIGHTS,
  type MatchWeights,
  type MatchThresholds,
  type MatchConfig,
  type MatchQuality,
} from '../matching'

// ============================================================================
// Test Helper Functions and Fixtures
// ============================================================================

/**
 * Creates a complete avatar configuration with defaults
 */
function createTestAvatar(partial: Partial<AvatarConfig> = {}): AvatarConfig {
  return { ...DEFAULT_AVATAR_CONFIG, ...partial }
}

/**
 * Base avatar for comparison tests - uses all defaults
 */
const baseAvatar: AvatarConfig = createTestAvatar()

/**
 * Avatar with all different values from base
 */
const differentAvatar: AvatarConfig = createTestAvatar({
  skinColor: 'Black',
  hairColor: 'Blue',
  topType: 'NoHair',
  facialHairType: 'BeardMajestic',
  facialHairColor: 'Blonde',
  eyeType: 'Dizzy',
  mouthType: 'Vomit',
  eyebrowType: 'Angry',
  clotheType: 'BlazerShirt',
  clotheColor: 'Red',
  accessoriesType: 'Sunglasses',
  graphicType: 'Skull',
})

// ============================================================================
// Skin Color Similarity Tests
// ============================================================================

describe('calculateSkinColorSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical skin colors', () => {
      expect(calculateSkinColorSimilarity('Light', 'Light')).toBe(1.0)
      expect(calculateSkinColorSimilarity('Pale', 'Pale')).toBe(1.0)
      expect(calculateSkinColorSimilarity('Brown', 'Brown')).toBe(1.0)
      expect(calculateSkinColorSimilarity('Black', 'Black')).toBe(1.0)
    })
  })

  describe('same group matches', () => {
    it('returns 0.7 for colors in the light group', () => {
      expect(calculateSkinColorSimilarity('Light', 'Pale')).toBe(0.7)
      expect(calculateSkinColorSimilarity('Pale', 'Light')).toBe(0.7)
    })

    it('returns 0.7 for colors in the medium group', () => {
      expect(calculateSkinColorSimilarity('Tanned', 'Yellow')).toBe(0.7)
      expect(calculateSkinColorSimilarity('Yellow', 'Brown')).toBe(0.7)
      expect(calculateSkinColorSimilarity('Tanned', 'Brown')).toBe(0.7)
    })

    it('returns 0.7 for colors in the dark group', () => {
      expect(calculateSkinColorSimilarity('DarkBrown', 'Black')).toBe(0.7)
      expect(calculateSkinColorSimilarity('Black', 'DarkBrown')).toBe(0.7)
    })
  })

  describe('adjacent group matches', () => {
    it('returns 0.3 for light and medium groups', () => {
      expect(calculateSkinColorSimilarity('Light', 'Tanned')).toBe(0.3)
      expect(calculateSkinColorSimilarity('Pale', 'Brown')).toBe(0.3)
      expect(calculateSkinColorSimilarity('Yellow', 'Light')).toBe(0.3)
    })

    it('returns 0.3 for medium and dark groups', () => {
      expect(calculateSkinColorSimilarity('Brown', 'DarkBrown')).toBe(0.3)
      expect(calculateSkinColorSimilarity('Tanned', 'Black')).toBe(0.3)
      expect(calculateSkinColorSimilarity('DarkBrown', 'Yellow')).toBe(0.3)
    })
  })

  describe('opposite group matches', () => {
    it('returns 0.0 for light and dark groups', () => {
      expect(calculateSkinColorSimilarity('Light', 'Black')).toBe(0.0)
      expect(calculateSkinColorSimilarity('Pale', 'DarkBrown')).toBe(0.0)
      expect(calculateSkinColorSimilarity('Black', 'Pale')).toBe(0.0)
    })
  })
})

// ============================================================================
// Hair Color Similarity Tests
// ============================================================================

describe('calculateHairColorSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical hair colors', () => {
      expect(calculateHairColorSimilarity('Brown', 'Brown')).toBe(1.0)
      expect(calculateHairColorSimilarity('Black', 'Black')).toBe(1.0)
      expect(calculateHairColorSimilarity('Blonde', 'Blonde')).toBe(1.0)
      expect(calculateHairColorSimilarity('Blue', 'Blue')).toBe(1.0)
    })
  })

  describe('same group matches', () => {
    it('returns 0.8 for colors in the dark group', () => {
      expect(calculateHairColorSimilarity('Black', 'BrownDark')).toBe(0.8)
      expect(calculateHairColorSimilarity('BrownDark', 'Black')).toBe(0.8)
    })

    it('returns 0.8 for colors in the brown group', () => {
      expect(calculateHairColorSimilarity('Brown', 'Auburn')).toBe(0.8)
      expect(calculateHairColorSimilarity('Auburn', 'Brown')).toBe(0.8)
    })

    it('returns 0.8 for colors in the blonde group', () => {
      expect(calculateHairColorSimilarity('Blonde', 'BlondeGolden')).toBe(0.8)
      expect(calculateHairColorSimilarity('BlondeGolden', 'Platinum')).toBe(0.8)
    })

    it('returns 0.8 for colors in the vibrant group', () => {
      expect(calculateHairColorSimilarity('PastelPink', 'Blue')).toBe(0.8)
      expect(calculateHairColorSimilarity('Blue', 'Red')).toBe(0.8)
      expect(calculateHairColorSimilarity('PastelPink', 'Red')).toBe(0.8)
    })
  })

  describe('adjacent natural color matches', () => {
    it('returns 0.5 for dark and brown adjacency', () => {
      expect(calculateHairColorSimilarity('Black', 'Brown')).toBe(0.5)
      expect(calculateHairColorSimilarity('BrownDark', 'Auburn')).toBe(0.5)
    })

    it('returns 0.5 for brown and blonde adjacency', () => {
      expect(calculateHairColorSimilarity('Brown', 'Blonde')).toBe(0.5)
      expect(calculateHairColorSimilarity('Auburn', 'BlondeGolden')).toBe(0.5)
    })
  })

  describe('gray color matches', () => {
    it('returns 0.3 for gray with any natural color', () => {
      expect(calculateHairColorSimilarity('SilverGray', 'Black')).toBe(0.3)
      expect(calculateHairColorSimilarity('SilverGray', 'Brown')).toBe(0.3)
      expect(calculateHairColorSimilarity('SilverGray', 'Blonde')).toBe(0.3)
      expect(calculateHairColorSimilarity('Brown', 'SilverGray')).toBe(0.3)
    })
  })

  describe('vibrant vs natural color matches', () => {
    it('returns 0.0 for vibrant vs natural colors', () => {
      expect(calculateHairColorSimilarity('Blue', 'Brown')).toBe(0.0)
      expect(calculateHairColorSimilarity('PastelPink', 'Black')).toBe(0.0)
      expect(calculateHairColorSimilarity('Red', 'Blonde')).toBe(0.0)
      expect(calculateHairColorSimilarity('Brown', 'Blue')).toBe(0.0)
    })
  })

  describe('opposite natural color matches', () => {
    it('returns 0.2 for dark vs blonde', () => {
      expect(calculateHairColorSimilarity('Black', 'Blonde')).toBe(0.2)
      expect(calculateHairColorSimilarity('BrownDark', 'Platinum')).toBe(0.2)
      expect(calculateHairColorSimilarity('Blonde', 'Black')).toBe(0.2)
    })
  })
})

// ============================================================================
// Top Type Similarity Tests
// ============================================================================

describe('calculateTopTypeSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical top types', () => {
      expect(calculateTopTypeSimilarity('LongHairBob', 'LongHairBob')).toBe(1.0)
      expect(calculateTopTypeSimilarity('ShortHairShortFlat', 'ShortHairShortFlat')).toBe(1.0)
      expect(calculateTopTypeSimilarity('Hat', 'Hat')).toBe(1.0)
      expect(calculateTopTypeSimilarity('NoHair', 'NoHair')).toBe(1.0)
    })
  })

  describe('same category matches', () => {
    it('returns 0.7 for different long hair styles', () => {
      expect(calculateTopTypeSimilarity('LongHairBob', 'LongHairCurly')).toBe(0.7)
      expect(calculateTopTypeSimilarity('LongHairStraight', 'LongHairBun')).toBe(0.7)
      expect(calculateTopTypeSimilarity('LongHairFro', 'LongHairDreads')).toBe(0.7)
    })

    it('returns 0.7 for different short hair styles', () => {
      expect(calculateTopTypeSimilarity('ShortHairShortFlat', 'ShortHairShortCurly')).toBe(0.7)
      expect(calculateTopTypeSimilarity('ShortHairDreads01', 'ShortHairDreads02')).toBe(0.7)
      expect(calculateTopTypeSimilarity('ShortHairTheCaesar', 'ShortHairSides')).toBe(0.7)
    })

    it('returns 0.7 for different head coverings', () => {
      expect(calculateTopTypeSimilarity('Hat', 'Hijab')).toBe(0.7)
      expect(calculateTopTypeSimilarity('WinterHat1', 'WinterHat2')).toBe(0.7)
      expect(calculateTopTypeSimilarity('Turban', 'WinterHat3')).toBe(0.7)
    })
  })

  describe('hair style cross-category matches', () => {
    it('returns 0.3 for long hair vs short hair', () => {
      expect(calculateTopTypeSimilarity('LongHairBob', 'ShortHairShortFlat')).toBe(0.3)
      expect(calculateTopTypeSimilarity('ShortHairCurly', 'LongHairCurly')).toBe(0.3)
    })
  })

  describe('hair vs head covering matches', () => {
    it('returns 0.2 for hair styles vs head coverings', () => {
      expect(calculateTopTypeSimilarity('LongHairBob', 'Hat')).toBe(0.2)
      expect(calculateTopTypeSimilarity('ShortHairShortFlat', 'Hijab')).toBe(0.2)
      expect(calculateTopTypeSimilarity('Turban', 'LongHairStraight')).toBe(0.2)
    })
  })

  describe('hair vs no hair matches', () => {
    it('returns 0.1 for hair styles vs no hair', () => {
      expect(calculateTopTypeSimilarity('LongHairBob', 'NoHair')).toBe(0.1)
      expect(calculateTopTypeSimilarity('ShortHairShortFlat', 'NoHair')).toBe(0.1)
      expect(calculateTopTypeSimilarity('NoHair', 'LongHairCurly')).toBe(0.1)
    })
  })

  describe('accessory and special matches', () => {
    it('returns 0.0 for accessory vs other categories', () => {
      expect(calculateTopTypeSimilarity('Eyepatch', 'LongHairBob')).toBe(0.0)
      expect(calculateTopTypeSimilarity('Eyepatch', 'Hat')).toBe(0.0)
      expect(calculateTopTypeSimilarity('NoHair', 'Eyepatch')).toBe(0.0)
    })
  })
})

// ============================================================================
// Facial Hair Similarity Tests
// ============================================================================

describe('calculateFacialHairSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical facial hair types', () => {
      expect(calculateFacialHairSimilarity('Blank', 'Blank')).toBe(1.0)
      expect(calculateFacialHairSimilarity('BeardMedium', 'BeardMedium')).toBe(1.0)
      expect(calculateFacialHairSimilarity('MoustacheFancy', 'MoustacheFancy')).toBe(1.0)
    })
  })

  describe('same category matches', () => {
    it('returns 0.8 for different beard types', () => {
      expect(calculateFacialHairSimilarity('BeardLight', 'BeardMedium')).toBe(0.8)
      expect(calculateFacialHairSimilarity('BeardMedium', 'BeardMajestic')).toBe(0.8)
      expect(calculateFacialHairSimilarity('BeardLight', 'BeardMajestic')).toBe(0.8)
    })

    it('returns 0.8 for different moustache types', () => {
      expect(calculateFacialHairSimilarity('MoustacheFancy', 'MoustacheMagnum')).toBe(0.8)
      expect(calculateFacialHairSimilarity('MoustacheMagnum', 'MoustacheFancy')).toBe(0.8)
    })
  })

  describe('cross-category facial hair matches', () => {
    it('returns 0.5 for beard vs moustache', () => {
      expect(calculateFacialHairSimilarity('BeardMedium', 'MoustacheFancy')).toBe(0.5)
      expect(calculateFacialHairSimilarity('MoustacheMagnum', 'BeardLight')).toBe(0.5)
    })
  })

  describe('presence vs absence matches', () => {
    it('returns 0.0 for having facial hair vs not having it', () => {
      expect(calculateFacialHairSimilarity('BeardMedium', 'Blank')).toBe(0.0)
      expect(calculateFacialHairSimilarity('Blank', 'MoustacheFancy')).toBe(0.0)
      expect(calculateFacialHairSimilarity('BeardMajestic', 'Blank')).toBe(0.0)
    })
  })
})

// ============================================================================
// Facial Hair Color Similarity Tests
// ============================================================================

describe('calculateFacialHairColorSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical facial hair colors', () => {
      expect(calculateFacialHairColorSimilarity('Brown', 'Brown')).toBe(1.0)
      expect(calculateFacialHairColorSimilarity('Black', 'Black')).toBe(1.0)
      expect(calculateFacialHairColorSimilarity('Blonde', 'Blonde')).toBe(1.0)
    })
  })

  describe('same group matches', () => {
    it('returns 0.8 for colors in the dark group', () => {
      expect(calculateFacialHairColorSimilarity('Black', 'BrownDark')).toBe(0.8)
      expect(calculateFacialHairColorSimilarity('BrownDark', 'Black')).toBe(0.8)
    })

    it('returns 0.8 for colors in the brown group', () => {
      expect(calculateFacialHairColorSimilarity('Brown', 'Auburn')).toBe(0.8)
      expect(calculateFacialHairColorSimilarity('Auburn', 'Red')).toBe(0.8) // Red is in brown group for facial hair
    })

    it('returns 0.8 for colors in the blonde group', () => {
      expect(calculateFacialHairColorSimilarity('Blonde', 'BlondeGolden')).toBe(0.8)
      expect(calculateFacialHairColorSimilarity('BlondeGolden', 'Platinum')).toBe(0.8)
    })
  })

  describe('adjacent group matches', () => {
    it('returns 0.5 for dark and brown adjacency', () => {
      expect(calculateFacialHairColorSimilarity('Black', 'Brown')).toBe(0.5)
      expect(calculateFacialHairColorSimilarity('BrownDark', 'Auburn')).toBe(0.5)
    })

    it('returns 0.5 for brown and blonde adjacency', () => {
      expect(calculateFacialHairColorSimilarity('Brown', 'Blonde')).toBe(0.5)
      expect(calculateFacialHairColorSimilarity('Auburn', 'BlondeGolden')).toBe(0.5)
    })
  })

  describe('opposite group matches', () => {
    it('returns 0.2 for dark vs blonde', () => {
      expect(calculateFacialHairColorSimilarity('Black', 'Blonde')).toBe(0.2)
      expect(calculateFacialHairColorSimilarity('BrownDark', 'Platinum')).toBe(0.2)
      expect(calculateFacialHairColorSimilarity('Blonde', 'Black')).toBe(0.2)
    })
  })
})

// ============================================================================
// Eye Type Similarity Tests
// ============================================================================

describe('calculateEyeTypeSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical eye types', () => {
      expect(calculateEyeTypeSimilarity('Default', 'Default')).toBe(1.0)
      expect(calculateEyeTypeSimilarity('Happy', 'Happy')).toBe(1.0)
      expect(calculateEyeTypeSimilarity('Dizzy', 'Dizzy')).toBe(1.0)
    })
  })

  describe('same category matches', () => {
    it('returns 0.6 for different neutral expressions', () => {
      expect(calculateEyeTypeSimilarity('Default', 'Side')).toBe(0.6)
      expect(calculateEyeTypeSimilarity('Side', 'Squint')).toBe(0.6)
      expect(calculateEyeTypeSimilarity('Default', 'Squint')).toBe(0.6)
    })

    it('returns 0.6 for different happy expressions', () => {
      expect(calculateEyeTypeSimilarity('Happy', 'Hearts')).toBe(0.6)
      expect(calculateEyeTypeSimilarity('Wink', 'WinkWacky')).toBe(0.6)
      expect(calculateEyeTypeSimilarity('Happy', 'Wink')).toBe(0.6)
    })

    it('returns 0.6 for different unusual expressions', () => {
      expect(calculateEyeTypeSimilarity('Close', 'Cry')).toBe(0.6)
      expect(calculateEyeTypeSimilarity('Dizzy', 'EyeRoll')).toBe(0.6)
      expect(calculateEyeTypeSimilarity('Surprised', 'Close')).toBe(0.6)
    })
  })

  describe('cross-category matches', () => {
    it('returns 0.2 for different expression categories', () => {
      expect(calculateEyeTypeSimilarity('Default', 'Happy')).toBe(0.2)
      expect(calculateEyeTypeSimilarity('Happy', 'Dizzy')).toBe(0.2)
      expect(calculateEyeTypeSimilarity('Squint', 'Cry')).toBe(0.2)
    })
  })
})

// ============================================================================
// Mouth Type Similarity Tests
// ============================================================================

describe('calculateMouthTypeSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical mouth types', () => {
      expect(calculateMouthTypeSimilarity('Default', 'Default')).toBe(1.0)
      expect(calculateMouthTypeSimilarity('Smile', 'Smile')).toBe(1.0)
      expect(calculateMouthTypeSimilarity('Grimace', 'Grimace')).toBe(1.0)
    })
  })

  describe('same category matches', () => {
    it('returns 0.6 for different neutral expressions', () => {
      expect(calculateMouthTypeSimilarity('Default', 'Serious')).toBe(0.6)
      expect(calculateMouthTypeSimilarity('Serious', 'Default')).toBe(0.6)
    })

    it('returns 0.6 for different happy expressions', () => {
      expect(calculateMouthTypeSimilarity('Smile', 'Twinkle')).toBe(0.6)
      expect(calculateMouthTypeSimilarity('Twinkle', 'Smile')).toBe(0.6)
    })

    it('returns 0.6 for different unusual expressions', () => {
      expect(calculateMouthTypeSimilarity('Concerned', 'Grimace')).toBe(0.6)
      expect(calculateMouthTypeSimilarity('Sad', 'Vomit')).toBe(0.6)
      expect(calculateMouthTypeSimilarity('ScreamOpen', 'Tongue')).toBe(0.6)
    })
  })

  describe('cross-category matches', () => {
    it('returns 0.2 for different expression categories', () => {
      expect(calculateMouthTypeSimilarity('Default', 'Smile')).toBe(0.2)
      expect(calculateMouthTypeSimilarity('Smile', 'Grimace')).toBe(0.2)
      expect(calculateMouthTypeSimilarity('Serious', 'Vomit')).toBe(0.2)
    })
  })
})

// ============================================================================
// Eyebrow Type Similarity Tests
// ============================================================================

describe('calculateEyebrowTypeSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical eyebrow types', () => {
      expect(calculateEyebrowTypeSimilarity('Default', 'Default')).toBe(1.0)
      expect(calculateEyebrowTypeSimilarity('Angry', 'Angry')).toBe(1.0)
      expect(calculateEyebrowTypeSimilarity('SadConcerned', 'SadConcerned')).toBe(1.0)
    })
  })

  describe('same category matches', () => {
    it('returns 0.6 for different neutral eyebrows', () => {
      expect(calculateEyebrowTypeSimilarity('Default', 'DefaultNatural')).toBe(0.6)
      expect(calculateEyebrowTypeSimilarity('DefaultNatural', 'FlatNatural')).toBe(0.6)
      expect(calculateEyebrowTypeSimilarity('Default', 'FlatNatural')).toBe(0.6)
    })

    it('returns 0.6 for different expressive eyebrows', () => {
      expect(calculateEyebrowTypeSimilarity('Angry', 'AngryNatural')).toBe(0.6)
      expect(calculateEyebrowTypeSimilarity('RaisedExcited', 'RaisedExcitedNatural')).toBe(0.6)
      expect(calculateEyebrowTypeSimilarity('SadConcerned', 'UnibrowNatural')).toBe(0.6)
    })
  })

  describe('cross-category matches', () => {
    it('returns 0.2 for neutral vs expressive eyebrows', () => {
      expect(calculateEyebrowTypeSimilarity('Default', 'Angry')).toBe(0.2)
      expect(calculateEyebrowTypeSimilarity('FlatNatural', 'RaisedExcited')).toBe(0.2)
      expect(calculateEyebrowTypeSimilarity('DefaultNatural', 'UpDown')).toBe(0.2)
    })
  })
})

// ============================================================================
// Clothe Type Similarity Tests
// ============================================================================

describe('calculateClotheTypeSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical clothe types', () => {
      expect(calculateClotheTypeSimilarity('Hoodie', 'Hoodie')).toBe(1.0)
      expect(calculateClotheTypeSimilarity('BlazerShirt', 'BlazerShirt')).toBe(1.0)
      expect(calculateClotheTypeSimilarity('GraphicShirt', 'GraphicShirt')).toBe(1.0)
    })
  })

  describe('same formality matches', () => {
    it('returns 0.7 for different formal clothing', () => {
      expect(calculateClotheTypeSimilarity('BlazerShirt', 'BlazerSweater')).toBe(0.7)
      expect(calculateClotheTypeSimilarity('BlazerSweater', 'CollarSweater')).toBe(0.7)
      expect(calculateClotheTypeSimilarity('BlazerShirt', 'CollarSweater')).toBe(0.7)
    })

    it('returns 0.7 for different casual clothing', () => {
      expect(calculateClotheTypeSimilarity('Hoodie', 'ShirtCrewNeck')).toBe(0.7)
      expect(calculateClotheTypeSimilarity('GraphicShirt', 'Overall')).toBe(0.7)
      expect(calculateClotheTypeSimilarity('ShirtScoopNeck', 'ShirtVNeck')).toBe(0.7)
    })
  })

  describe('cross-formality matches', () => {
    it('returns 0.3 for formal vs casual clothing', () => {
      expect(calculateClotheTypeSimilarity('BlazerShirt', 'Hoodie')).toBe(0.3)
      expect(calculateClotheTypeSimilarity('CollarSweater', 'GraphicShirt')).toBe(0.3)
      expect(calculateClotheTypeSimilarity('Hoodie', 'BlazerSweater')).toBe(0.3)
    })
  })
})

// ============================================================================
// Clothe Color Similarity Tests
// ============================================================================

describe('calculateClotheColorSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical clothe colors', () => {
      expect(calculateClotheColorSimilarity('Blue01', 'Blue01')).toBe(1.0)
      expect(calculateClotheColorSimilarity('Black', 'Black')).toBe(1.0)
      expect(calculateClotheColorSimilarity('Pink', 'Pink')).toBe(1.0)
    })
  })

  describe('same group matches', () => {
    it('returns 0.7 for different blues', () => {
      expect(calculateClotheColorSimilarity('Blue01', 'Blue02')).toBe(0.7)
      expect(calculateClotheColorSimilarity('Blue02', 'Blue03')).toBe(0.7)
    })

    it('returns 0.7 for different neutrals', () => {
      expect(calculateClotheColorSimilarity('Black', 'Gray01')).toBe(0.7)
      expect(calculateClotheColorSimilarity('Gray02', 'White')).toBe(0.7)
      expect(calculateClotheColorSimilarity('Heather', 'Black')).toBe(0.7)
    })

    it('returns 0.7 for different pastels', () => {
      expect(calculateClotheColorSimilarity('PastelBlue', 'PastelGreen')).toBe(0.7)
      expect(calculateClotheColorSimilarity('PastelOrange', 'PastelYellow')).toBe(0.7)
      expect(calculateClotheColorSimilarity('PastelRed', 'PastelBlue')).toBe(0.7)
    })

    it('returns 0.7 for different vibrants', () => {
      expect(calculateClotheColorSimilarity('Pink', 'Red')).toBe(0.7)
      expect(calculateClotheColorSimilarity('Red', 'Pink')).toBe(0.7)
    })
  })

  describe('cross-group matches', () => {
    it('returns 0.3 for different color groups', () => {
      expect(calculateClotheColorSimilarity('Blue01', 'Red')).toBe(0.3)
      expect(calculateClotheColorSimilarity('Black', 'Pink')).toBe(0.3)
      expect(calculateClotheColorSimilarity('PastelGreen', 'Blue02')).toBe(0.3)
    })
  })
})

// ============================================================================
// Accessories Similarity Tests
// ============================================================================

describe('calculateAccessoriesSimilarity', () => {
  describe('exact matches', () => {
    it('returns 1.0 for identical accessories', () => {
      expect(calculateAccessoriesSimilarity('Blank', 'Blank')).toBe(1.0)
      expect(calculateAccessoriesSimilarity('Prescription01', 'Prescription01')).toBe(1.0)
      expect(calculateAccessoriesSimilarity('Sunglasses', 'Sunglasses')).toBe(1.0)
    })
  })

  describe('same category matches', () => {
    it('returns 0.8 for different prescription glasses', () => {
      expect(calculateAccessoriesSimilarity('Prescription01', 'Prescription02')).toBe(0.8)
      expect(calculateAccessoriesSimilarity('Prescription02', 'Round')).toBe(0.8)
      expect(calculateAccessoriesSimilarity('Kurt', 'Prescription01')).toBe(0.8)
    })

    it('returns 0.8 for different sunglasses', () => {
      expect(calculateAccessoriesSimilarity('Sunglasses', 'Wayfarers')).toBe(0.8)
      expect(calculateAccessoriesSimilarity('Wayfarers', 'Sunglasses')).toBe(0.8)
    })
  })

  describe('cross-category glasses matches', () => {
    it('returns 0.5 for prescription vs sunglasses', () => {
      expect(calculateAccessoriesSimilarity('Prescription01', 'Sunglasses')).toBe(0.5)
      expect(calculateAccessoriesSimilarity('Wayfarers', 'Round')).toBe(0.5)
      expect(calculateAccessoriesSimilarity('Kurt', 'Wayfarers')).toBe(0.5)
    })
  })

  describe('presence vs absence matches', () => {
    it('returns 0.2 for glasses vs no glasses', () => {
      expect(calculateAccessoriesSimilarity('Prescription01', 'Blank')).toBe(0.2)
      expect(calculateAccessoriesSimilarity('Blank', 'Sunglasses')).toBe(0.2)
      expect(calculateAccessoriesSimilarity('Kurt', 'Blank')).toBe(0.2)
    })
  })
})

// ============================================================================
// Graphic Type Similarity Tests
// ============================================================================

describe('calculateGraphicTypeSimilarity', () => {
  describe('when both wear GraphicShirt', () => {
    it('returns score 1.0 and applicable true for identical graphics', () => {
      const result = calculateGraphicTypeSimilarity('Pizza', 'Pizza', 'GraphicShirt', 'GraphicShirt')
      expect(result.score).toBe(1.0)
      expect(result.applicable).toBe(true)
    })

    it('returns score 0.0 and applicable true for different graphics', () => {
      const result = calculateGraphicTypeSimilarity('Pizza', 'Skull', 'GraphicShirt', 'GraphicShirt')
      expect(result.score).toBe(0.0)
      expect(result.applicable).toBe(true)
    })
  })

  describe('when not both wearing GraphicShirt', () => {
    it('returns score 0 and applicable false when first is not GraphicShirt', () => {
      const result = calculateGraphicTypeSimilarity('Pizza', 'Skull', 'Hoodie', 'GraphicShirt')
      expect(result.score).toBe(0)
      expect(result.applicable).toBe(false)
    })

    it('returns score 0 and applicable false when second is not GraphicShirt', () => {
      const result = calculateGraphicTypeSimilarity('Pizza', 'Skull', 'GraphicShirt', 'Hoodie')
      expect(result.score).toBe(0)
      expect(result.applicable).toBe(false)
    })

    it('returns score 0 and applicable false when neither wear GraphicShirt', () => {
      const result = calculateGraphicTypeSimilarity('Pizza', 'Skull', 'Hoodie', 'BlazerShirt')
      expect(result.score).toBe(0)
      expect(result.applicable).toBe(false)
    })
  })
})

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('isMatchQuality', () => {
  it('returns true for valid match quality values', () => {
    expect(isMatchQuality('excellent')).toBe(true)
    expect(isMatchQuality('good')).toBe(true)
    expect(isMatchQuality('fair')).toBe(true)
    expect(isMatchQuality('poor')).toBe(true)
  })

  it('returns false for invalid values', () => {
    expect(isMatchQuality('invalid')).toBe(false)
    expect(isMatchQuality('')).toBe(false)
    expect(isMatchQuality(null)).toBe(false)
    expect(isMatchQuality(undefined)).toBe(false)
    expect(isMatchQuality(42)).toBe(false)
    expect(isMatchQuality({})).toBe(false)
  })
})

describe('validateWeightsSum', () => {
  it('returns true for default weights', () => {
    expect(validateWeightsSum(DEFAULT_MATCH_WEIGHTS)).toBe(true)
  })

  it('returns true for appearance-focused weights', () => {
    expect(validateWeightsSum(APPEARANCE_FOCUSED_WEIGHTS)).toBe(true)
  })

  it('returns true for style-focused weights', () => {
    expect(validateWeightsSum(STYLE_FOCUSED_WEIGHTS)).toBe(true)
  })

  it('returns true for weights summing to exactly 1.0', () => {
    const exactWeights: MatchWeights = {
      skinColor: 0.25,
      hairColor: 0.15,
      topType: 0.12,
      facialHairType: 0.05,
      facialHairColor: 0.03,
      eyeType: 0.08,
      mouthType: 0.07,
      eyebrowType: 0.05,
      clotheType: 0.08,
      clotheColor: 0.05,
      accessoriesType: 0.05,
      graphicType: 0.02,
    }
    expect(validateWeightsSum(exactWeights)).toBe(true)
  })

  it('returns false for weights not summing to 1.0', () => {
    const invalidWeights: MatchWeights = {
      skinColor: 0.5,
      hairColor: 0.5,
      topType: 0.12,
      facialHairType: 0.05,
      facialHairColor: 0.03,
      eyeType: 0.08,
      mouthType: 0.07,
      eyebrowType: 0.05,
      clotheType: 0.08,
      clotheColor: 0.05,
      accessoriesType: 0.05,
      graphicType: 0.02,
    }
    expect(validateWeightsSum(invalidWeights)).toBe(false)
  })

  it('respects custom tolerance', () => {
    const slightlyOff: MatchWeights = {
      skinColor: 0.26, // Slightly more
      hairColor: 0.15,
      topType: 0.12,
      facialHairType: 0.05,
      facialHairColor: 0.03,
      eyeType: 0.08,
      mouthType: 0.07,
      eyebrowType: 0.05,
      clotheType: 0.08,
      clotheColor: 0.05,
      accessoriesType: 0.05,
      graphicType: 0.02,
    }
    expect(validateWeightsSum(slightlyOff, 0.01)).toBe(true)
    expect(validateWeightsSum(slightlyOff, 0.001)).toBe(false)
  })
})

describe('validateThresholdsOrder', () => {
  it('returns true for valid threshold order', () => {
    expect(validateThresholdsOrder(DEFAULT_MATCH_THRESHOLDS)).toBe(true)
    expect(validateThresholdsOrder({ excellent: 95, good: 85, fair: 70 })).toBe(true)
    expect(validateThresholdsOrder({ excellent: 100, good: 50, fair: 0 })).toBe(true)
  })

  it('returns false when excellent is not greater than good', () => {
    expect(validateThresholdsOrder({ excellent: 70, good: 70, fair: 50 })).toBe(false)
    expect(validateThresholdsOrder({ excellent: 60, good: 70, fair: 50 })).toBe(false)
  })

  it('returns false when good is not greater than fair', () => {
    expect(validateThresholdsOrder({ excellent: 85, good: 50, fair: 50 })).toBe(false)
    expect(validateThresholdsOrder({ excellent: 85, good: 40, fair: 50 })).toBe(false)
  })

  it('returns false when fair is negative', () => {
    expect(validateThresholdsOrder({ excellent: 85, good: 70, fair: -10 })).toBe(false)
  })

  it('returns false when excellent exceeds 100', () => {
    expect(validateThresholdsOrder({ excellent: 105, good: 70, fair: 50 })).toBe(false)
  })
})

// ============================================================================
// Threshold Evaluation Function Tests
// ============================================================================

describe('evaluateMatch', () => {
  describe('with default thresholds', () => {
    it('returns excellent for scores >= 85', () => {
      expect(evaluateMatch(100)).toBe('excellent')
      expect(evaluateMatch(92)).toBe('excellent')
      expect(evaluateMatch(85)).toBe('excellent')
    })

    it('returns good for scores >= 70 and < 85', () => {
      expect(evaluateMatch(84)).toBe('good')
      expect(evaluateMatch(75)).toBe('good')
      expect(evaluateMatch(70)).toBe('good')
    })

    it('returns fair for scores >= 50 and < 70', () => {
      expect(evaluateMatch(69)).toBe('fair')
      expect(evaluateMatch(55)).toBe('fair')
      expect(evaluateMatch(50)).toBe('fair')
    })

    it('returns poor for scores < 50', () => {
      expect(evaluateMatch(49)).toBe('poor')
      expect(evaluateMatch(30)).toBe('poor')
      expect(evaluateMatch(0)).toBe('poor')
    })
  })

  describe('with custom thresholds', () => {
    const strictThresholds: MatchThresholds = { excellent: 95, good: 85, fair: 70 }

    it('uses custom thresholds for classification', () => {
      expect(evaluateMatch(96, strictThresholds)).toBe('excellent')
      expect(evaluateMatch(92, strictThresholds)).toBe('good')
      expect(evaluateMatch(75, strictThresholds)).toBe('fair')
      expect(evaluateMatch(65, strictThresholds)).toBe('poor')
    })
  })
})

describe('isMatch', () => {
  describe('with default minimum threshold (50)', () => {
    it('returns true for scores at or above threshold', () => {
      expect(isMatch(100)).toBe(true)
      expect(isMatch(75)).toBe(true)
      expect(isMatch(50)).toBe(true)
    })

    it('returns false for scores below threshold', () => {
      expect(isMatch(49)).toBe(false)
      expect(isMatch(25)).toBe(false)
      expect(isMatch(0)).toBe(false)
    })
  })

  describe('with custom minimum threshold', () => {
    it('respects custom threshold', () => {
      expect(isMatch(75, 80)).toBe(false)
      expect(isMatch(85, 80)).toBe(true)
      expect(isMatch(35, 30)).toBe(true)
      expect(isMatch(25, 30)).toBe(false)
    })
  })
})

describe('getMatchQuality', () => {
  it('returns full descriptions for each quality tier', () => {
    expect(getMatchQuality('excellent')).toBe(
      'Excellent match - near-identical avatars with only minor differences'
    )
    expect(getMatchQuality('good')).toBe(
      'Good match - similar appearance with the same general look'
    )
    expect(getMatchQuality('fair')).toBe(
      'Fair match - some similarities but with notable differences'
    )
    expect(getMatchQuality('poor')).toBe('Poor match - significantly different avatars')
  })
})

describe('getMatchQualityDescription', () => {
  describe('full format', () => {
    it('returns full descriptions', () => {
      expect(getMatchQualityDescription('excellent', 'full')).toBe(
        'Excellent match - near-identical avatars with only minor differences'
      )
      expect(getMatchQualityDescription('good', 'full')).toBe(
        'Good match - similar appearance with the same general look'
      )
      expect(getMatchQualityDescription('fair', 'full')).toBe(
        'Fair match - some similarities but with notable differences'
      )
      expect(getMatchQualityDescription('poor', 'full')).toBe(
        'Poor match - significantly different avatars'
      )
    })
  })

  describe('short format', () => {
    it('returns short descriptions', () => {
      expect(getMatchQualityDescription('excellent', 'short')).toBe('Near-identical')
      expect(getMatchQualityDescription('good', 'short')).toBe('Similar appearance')
      expect(getMatchQualityDescription('fair', 'short')).toBe('Some similarities')
      expect(getMatchQualityDescription('poor', 'short')).toBe('Significantly different')
    })
  })

  describe('default format', () => {
    it('defaults to full format', () => {
      expect(getMatchQualityDescription('excellent')).toBe(
        'Excellent match - near-identical avatars with only minor differences'
      )
    })
  })
})

describe('getQualityScoreRange', () => {
  describe('with default thresholds', () => {
    it('returns correct range for excellent', () => {
      const range = getQualityScoreRange('excellent')
      expect(range).toEqual({ min: 85, max: 100 })
    })

    it('returns correct range for good', () => {
      const range = getQualityScoreRange('good')
      expect(range).toEqual({ min: 70, max: 84 })
    })

    it('returns correct range for fair', () => {
      const range = getQualityScoreRange('fair')
      expect(range).toEqual({ min: 50, max: 69 })
    })

    it('returns correct range for poor', () => {
      const range = getQualityScoreRange('poor')
      expect(range).toEqual({ min: 0, max: 49 })
    })
  })

  describe('with custom thresholds', () => {
    const customThresholds: MatchThresholds = { excellent: 95, good: 80, fair: 60 }

    it('uses custom thresholds for range calculation', () => {
      expect(getQualityScoreRange('excellent', customThresholds)).toEqual({ min: 95, max: 100 })
      expect(getQualityScoreRange('good', customThresholds)).toEqual({ min: 80, max: 94 })
      expect(getQualityScoreRange('fair', customThresholds)).toEqual({ min: 60, max: 79 })
      expect(getQualityScoreRange('poor', customThresholds)).toEqual({ min: 0, max: 59 })
    })
  })
})

// ============================================================================
// Main Scoring Function Tests
// ============================================================================

describe('calculateAvatarMatchScore', () => {
  describe('identical avatars', () => {
    it('returns score of 100 for identical avatars', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar)
      expect(result.score).toBe(100)
      expect(result.quality).toBe('excellent')
      expect(result.isMatch).toBe(true)
    })

    it('returns all similarity scores of 1.0 in breakdown', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar)
      expect(result.breakdown.skinColor.similarity).toBe(1.0)
      expect(result.breakdown.hairColor.similarity).toBe(1.0)
      expect(result.breakdown.topType.similarity).toBe(1.0)
      expect(result.breakdown.eyeType.similarity).toBe(1.0)
      expect(result.breakdown.mouthType.similarity).toBe(1.0)
    })
  })

  describe('completely different avatars', () => {
    it('returns a low score for completely different avatars', () => {
      const result = calculateAvatarMatchScore(baseAvatar, differentAvatar)
      expect(result.score).toBeLessThan(50)
      expect(result.quality).toBe('poor')
      expect(result.isMatch).toBe(false)
    })
  })

  describe('result structure', () => {
    it('returns all required fields', () => {
      const result = calculateAvatarMatchScore(baseAvatar, differentAvatar)

      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('quality')
      expect(result).toHaveProperty('breakdown')
      expect(result).toHaveProperty('isMatch')
      expect(result).toHaveProperty('minThreshold')
    })

    it('returns breakdown with all 12 attributes', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar)
      const { breakdown } = result

      expect(breakdown).toHaveProperty('skinColor')
      expect(breakdown).toHaveProperty('hairColor')
      expect(breakdown).toHaveProperty('topType')
      expect(breakdown).toHaveProperty('facialHairType')
      expect(breakdown).toHaveProperty('facialHairColor')
      expect(breakdown).toHaveProperty('eyeType')
      expect(breakdown).toHaveProperty('eyebrowType')
      expect(breakdown).toHaveProperty('mouthType')
      expect(breakdown).toHaveProperty('clotheType')
      expect(breakdown).toHaveProperty('clotheColor')
      expect(breakdown).toHaveProperty('accessoriesType')
      expect(breakdown).toHaveProperty('graphicType')
    })

    it('includes conditional attribute applicability flags', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar)

      expect(result.breakdown.facialHairColor).toHaveProperty('applicable')
      expect(result.breakdown.graphicType).toHaveProperty('applicable')
    })
  })

  describe('conditional attributes', () => {
    it('marks facialHairColor as not applicable when neither has facial hair', () => {
      // baseAvatar has Blank facial hair by default
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar)
      expect(result.breakdown.facialHairColor.applicable).toBe(false)
    })

    it('marks facialHairColor as applicable when both have facial hair', () => {
      const avatarWithBeard1 = createTestAvatar({ facialHairType: 'BeardMedium' })
      const avatarWithBeard2 = createTestAvatar({ facialHairType: 'BeardLight' })
      const result = calculateAvatarMatchScore(avatarWithBeard1, avatarWithBeard2)
      expect(result.breakdown.facialHairColor.applicable).toBe(true)
    })

    it('marks graphicType as not applicable when neither wears GraphicShirt', () => {
      // baseAvatar has ShirtCrewNeck by default
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar)
      expect(result.breakdown.graphicType.applicable).toBe(false)
    })

    it('marks graphicType as applicable when both wear GraphicShirt', () => {
      const avatarWithGraphic1 = createTestAvatar({
        clotheType: 'GraphicShirt',
        graphicType: 'Pizza',
      })
      const avatarWithGraphic2 = createTestAvatar({
        clotheType: 'GraphicShirt',
        graphicType: 'Skull',
      })
      const result = calculateAvatarMatchScore(avatarWithGraphic1, avatarWithGraphic2)
      expect(result.breakdown.graphicType.applicable).toBe(true)
    })
  })

  describe('with custom weights', () => {
    it('applies custom weights correctly', () => {
      // Create avatars that differ only in skin color
      const avatar1 = createTestAvatar({ skinColor: 'Light' })
      const avatar2 = createTestAvatar({ skinColor: 'Black' })

      // With high skin weight, difference should be more impactful
      const highSkinWeightConfig: MatchConfig = {
        weights: {
          ...DEFAULT_MATCH_WEIGHTS,
          skinColor: 0.50, // Much higher than default 0.25
          hairColor: 0.10,
          topType: 0.05,
        },
        thresholds: DEFAULT_MATCH_THRESHOLDS,
      }

      const defaultResult = calculateAvatarMatchScore(avatar1, avatar2)
      const customResult = calculateAvatarMatchScore(avatar1, avatar2, highSkinWeightConfig)

      // Custom result should have lower score due to higher skin weight
      expect(customResult.score).toBeLessThan(defaultResult.score)
    })
  })

  describe('with custom thresholds', () => {
    it('applies custom thresholds for quality classification', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar, STRICT_MATCH_CONFIG)
      expect(result.quality).toBe('excellent')
      expect(result.score).toBe(100)
    })

    it('uses custom thresholds for isMatch determination', () => {
      // Create avatars with moderate similarity
      const avatar1 = createTestAvatar({ skinColor: 'Light' })
      const avatar2 = createTestAvatar({ skinColor: 'Pale', hairColor: 'Auburn' })

      const defaultResult = calculateAvatarMatchScore(avatar1, avatar2)
      const relaxedResult = calculateAvatarMatchScore(avatar1, avatar2, RELAXED_MATCH_CONFIG)

      // With relaxed thresholds, lower fair threshold means more matches
      expect(relaxedResult.minThreshold).toBe(35)
      expect(defaultResult.minThreshold).toBe(50)
    })
  })

  describe('preset configurations', () => {
    it('works with STRICT_MATCH_CONFIG', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar, STRICT_MATCH_CONFIG)
      expect(result.score).toBe(100)
      expect(result.minThreshold).toBe(70) // strict fair threshold
    })

    it('works with RELAXED_MATCH_CONFIG', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar, RELAXED_MATCH_CONFIG)
      expect(result.score).toBe(100)
      expect(result.minThreshold).toBe(35) // relaxed fair threshold
    })

    it('works with APPEARANCE_FOCUSED_CONFIG', () => {
      // Test that appearance-focused config emphasizes physical traits
      const avatar1 = createTestAvatar({
        skinColor: 'Light',
        hairColor: 'Brown',
        clotheType: 'Hoodie',
      })
      const avatar2 = createTestAvatar({
        skinColor: 'Light',
        hairColor: 'Brown',
        clotheType: 'BlazerShirt', // Different clothes, same appearance
      })

      const defaultResult = calculateAvatarMatchScore(avatar1, avatar2)
      const appearanceResult = calculateAvatarMatchScore(avatar1, avatar2, APPEARANCE_FOCUSED_CONFIG)

      // Appearance-focused should score higher because clothes matter less
      expect(appearanceResult.score).toBeGreaterThanOrEqual(defaultResult.score)
    })

    it('works with STYLE_FOCUSED_CONFIG', () => {
      // Test that style-focused config emphasizes clothing/accessories
      const avatar1 = createTestAvatar({
        skinColor: 'Light',
        clotheType: 'Hoodie',
        clotheColor: 'Blue01',
      })
      const avatar2 = createTestAvatar({
        skinColor: 'Black', // Very different skin
        clotheType: 'Hoodie',
        clotheColor: 'Blue01', // Same clothes
      })

      const defaultResult = calculateAvatarMatchScore(avatar1, avatar2)
      const styleResult = calculateAvatarMatchScore(avatar1, avatar2, STYLE_FOCUSED_CONFIG)

      // Style-focused should score higher because appearance matters less
      expect(styleResult.score).toBeGreaterThanOrEqual(defaultResult.score)
    })
  })

  describe('partial avatar configurations', () => {
    it('handles avatars with missing properties by using defaults', () => {
      const partialAvatar: AvatarConfig = { skinColor: 'Light' }
      const result = calculateAvatarMatchScore(partialAvatar, baseAvatar)

      // Should complete without errors and return valid result
      expect(typeof result.score).toBe('number')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('handles empty avatar configurations', () => {
      const emptyAvatar: AvatarConfig = {}
      const result = calculateAvatarMatchScore(emptyAvatar, emptyAvatar)

      // Should return perfect score since both use defaults
      expect(result.score).toBe(100)
    })
  })

  describe('score normalization', () => {
    it('returns scores in 0-100 range', () => {
      const result = calculateAvatarMatchScore(baseAvatar, differentAvatar)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('normalizes correctly when conditional weights are excluded', () => {
      // Both have no facial hair and no graphic shirts
      // The score should still be properly normalized without those weights
      const avatar1 = createTestAvatar({
        facialHairType: 'Blank',
        clotheType: 'Hoodie',
      })
      const avatar2 = createTestAvatar({
        facialHairType: 'Blank',
        clotheType: 'Hoodie',
      })

      const result = calculateAvatarMatchScore(avatar1, avatar2)
      expect(result.score).toBe(100) // Should be perfect match
      expect(result.breakdown.facialHairColor.applicable).toBe(false)
      expect(result.breakdown.graphicType.applicable).toBe(false)
    })
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('boundary score values', () => {
    it('correctly classifies score at exact threshold boundaries', () => {
      expect(evaluateMatch(85)).toBe('excellent')
      expect(evaluateMatch(84)).toBe('good')
      expect(evaluateMatch(70)).toBe('good')
      expect(evaluateMatch(69)).toBe('fair')
      expect(evaluateMatch(50)).toBe('fair')
      expect(evaluateMatch(49)).toBe('poor')
    })
  })

  describe('avatars with mixed similarities', () => {
    it('calculates weighted average correctly for mixed similarities', () => {
      // Avatar with some matching and some different attributes
      const avatar1 = createTestAvatar({
        skinColor: 'Light',
        hairColor: 'Brown',
        eyeType: 'Happy',
        mouthType: 'Smile',
      })
      const avatar2 = createTestAvatar({
        skinColor: 'Light', // Same
        hairColor: 'Black', // Different
        eyeType: 'Happy', // Same
        mouthType: 'Grimace', // Different
      })

      const result = calculateAvatarMatchScore(avatar1, avatar2)

      // Verify individual similarities in breakdown
      expect(result.breakdown.skinColor.similarity).toBe(1.0) // Same
      expect(result.breakdown.hairColor.similarity).toBeLessThan(1.0) // Different
      expect(result.breakdown.eyeType.similarity).toBe(1.0) // Same
      expect(result.breakdown.mouthType.similarity).toBeLessThan(1.0) // Different

      // Score should be between 0 and 100
      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThan(100)
    })
  })

  describe('avatars with facial hair', () => {
    it('includes facialHairColor in scoring when both have facial hair', () => {
      const avatar1 = createTestAvatar({
        facialHairType: 'BeardMedium',
        facialHairColor: 'Brown',
      })
      const avatar2 = createTestAvatar({
        facialHairType: 'BeardLight',
        facialHairColor: 'Brown', // Same color
      })

      const result = calculateAvatarMatchScore(avatar1, avatar2)

      expect(result.breakdown.facialHairColor.applicable).toBe(true)
      expect(result.breakdown.facialHairColor.similarity).toBe(1.0)
      expect(result.breakdown.facialHairColor.contribution).toBeGreaterThan(0)
    })

    it('excludes facialHairColor when only one has facial hair', () => {
      const avatar1 = createTestAvatar({
        facialHairType: 'BeardMedium',
        facialHairColor: 'Brown',
      })
      const avatar2 = createTestAvatar({
        facialHairType: 'Blank',
        facialHairColor: 'Black',
      })

      const result = calculateAvatarMatchScore(avatar1, avatar2)

      expect(result.breakdown.facialHairColor.applicable).toBe(false)
      expect(result.breakdown.facialHairColor.contribution).toBe(0)
    })
  })

  describe('avatars with graphic shirts', () => {
    it('includes graphicType in scoring when both wear graphic shirts', () => {
      const avatar1 = createTestAvatar({
        clotheType: 'GraphicShirt',
        graphicType: 'Pizza',
      })
      const avatar2 = createTestAvatar({
        clotheType: 'GraphicShirt',
        graphicType: 'Pizza', // Same graphic
      })

      const result = calculateAvatarMatchScore(avatar1, avatar2)

      expect(result.breakdown.graphicType.applicable).toBe(true)
      expect(result.breakdown.graphicType.similarity).toBe(1.0)
      expect(result.breakdown.graphicType.contribution).toBeGreaterThan(0)
    })

    it('excludes graphicType when only one wears graphic shirt', () => {
      const avatar1 = createTestAvatar({
        clotheType: 'GraphicShirt',
        graphicType: 'Pizza',
      })
      const avatar2 = createTestAvatar({
        clotheType: 'Hoodie',
        graphicType: 'Skull',
      })

      const result = calculateAvatarMatchScore(avatar1, avatar2)

      expect(result.breakdown.graphicType.applicable).toBe(false)
      expect(result.breakdown.graphicType.contribution).toBe(0)
    })
  })

  describe('contribution calculations', () => {
    it('contribution equals similarity times weight', () => {
      const result = calculateAvatarMatchScore(baseAvatar, baseAvatar)

      // For each attribute, contribution should be similarity * weight
      const { breakdown } = result

      expect(breakdown.skinColor.contribution).toBeCloseTo(
        breakdown.skinColor.similarity * breakdown.skinColor.weight,
        10
      )
      expect(breakdown.hairColor.contribution).toBeCloseTo(
        breakdown.hairColor.similarity * breakdown.hairColor.weight,
        10
      )
    })
  })
})

// ============================================================================
// Configuration Constant Tests
// ============================================================================

describe('Configuration Constants', () => {
  describe('DEFAULT_MATCH_WEIGHTS', () => {
    it('sums to 1.0', () => {
      const sum = Object.values(DEFAULT_MATCH_WEIGHTS).reduce((acc, val) => acc + val, 0)
      expect(sum).toBeCloseTo(1.0, 10)
    })

    it('has all 12 attribute weights', () => {
      expect(Object.keys(DEFAULT_MATCH_WEIGHTS)).toHaveLength(12)
    })

    it('allocates ~60% to primary attributes', () => {
      const primarySum =
        DEFAULT_MATCH_WEIGHTS.skinColor +
        DEFAULT_MATCH_WEIGHTS.hairColor +
        DEFAULT_MATCH_WEIGHTS.topType +
        DEFAULT_MATCH_WEIGHTS.facialHairType +
        DEFAULT_MATCH_WEIGHTS.facialHairColor
      expect(primarySum).toBeCloseTo(0.6, 1)
    })
  })

  describe('DEFAULT_MATCH_THRESHOLDS', () => {
    it('has valid threshold values', () => {
      expect(DEFAULT_MATCH_THRESHOLDS.excellent).toBe(85)
      expect(DEFAULT_MATCH_THRESHOLDS.good).toBe(70)
      expect(DEFAULT_MATCH_THRESHOLDS.fair).toBe(50)
    })

    it('passes validation', () => {
      expect(validateThresholdsOrder(DEFAULT_MATCH_THRESHOLDS)).toBe(true)
    })
  })

  describe('DEFAULT_MATCH_CONFIG', () => {
    it('contains valid weights and thresholds', () => {
      expect(validateWeightsSum(DEFAULT_MATCH_CONFIG.weights)).toBe(true)
      expect(validateThresholdsOrder(DEFAULT_MATCH_CONFIG.thresholds)).toBe(true)
    })
  })

  describe('Preset Configurations', () => {
    it('STRICT_MATCH_CONFIG has higher thresholds', () => {
      expect(STRICT_MATCH_CONFIG.thresholds.excellent).toBeGreaterThan(
        DEFAULT_MATCH_THRESHOLDS.excellent
      )
      expect(STRICT_MATCH_CONFIG.thresholds.good).toBeGreaterThan(DEFAULT_MATCH_THRESHOLDS.good)
      expect(STRICT_MATCH_CONFIG.thresholds.fair).toBeGreaterThan(DEFAULT_MATCH_THRESHOLDS.fair)
    })

    it('RELAXED_MATCH_CONFIG has lower thresholds', () => {
      expect(RELAXED_MATCH_CONFIG.thresholds.excellent).toBeLessThan(
        DEFAULT_MATCH_THRESHOLDS.excellent
      )
      expect(RELAXED_MATCH_CONFIG.thresholds.good).toBeLessThan(DEFAULT_MATCH_THRESHOLDS.good)
      expect(RELAXED_MATCH_CONFIG.thresholds.fair).toBeLessThan(DEFAULT_MATCH_THRESHOLDS.fair)
    })

    it('APPEARANCE_FOCUSED_CONFIG has higher primary weights', () => {
      expect(APPEARANCE_FOCUSED_CONFIG.weights.skinColor).toBeGreaterThan(
        DEFAULT_MATCH_WEIGHTS.skinColor
      )
      expect(APPEARANCE_FOCUSED_CONFIG.weights.hairColor).toBeGreaterThan(
        DEFAULT_MATCH_WEIGHTS.hairColor
      )
    })

    it('STYLE_FOCUSED_CONFIG has higher secondary weights', () => {
      expect(STYLE_FOCUSED_CONFIG.weights.clotheType).toBeGreaterThan(
        DEFAULT_MATCH_WEIGHTS.clotheType
      )
      expect(STYLE_FOCUSED_CONFIG.weights.clotheColor).toBeGreaterThan(
        DEFAULT_MATCH_WEIGHTS.clotheColor
      )
    })

    it('all presets pass validation', () => {
      expect(validateWeightsSum(STRICT_MATCH_CONFIG.weights)).toBe(true)
      expect(validateThresholdsOrder(STRICT_MATCH_CONFIG.thresholds)).toBe(true)

      expect(validateWeightsSum(RELAXED_MATCH_CONFIG.weights)).toBe(true)
      expect(validateThresholdsOrder(RELAXED_MATCH_CONFIG.thresholds)).toBe(true)

      expect(validateWeightsSum(APPEARANCE_FOCUSED_CONFIG.weights)).toBe(true)
      expect(validateThresholdsOrder(APPEARANCE_FOCUSED_CONFIG.thresholds)).toBe(true)

      expect(validateWeightsSum(STYLE_FOCUSED_CONFIG.weights)).toBe(true)
      expect(validateThresholdsOrder(STYLE_FOCUSED_CONFIG.thresholds)).toBe(true)
    })
  })
})
