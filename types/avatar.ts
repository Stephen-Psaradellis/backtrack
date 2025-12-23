/**
 * Avatar Configuration Types
 *
 * Type definitions for the Avataaars character builder system.
 * These types define all customizable attributes for creating
 * physical descriptions of users and persons of interest.
 *
 * Based on the Avataaars library: https://avataaars.com/
 */

// ============================================================================
// TOP / HAIR TYPES
// ============================================================================

/**
 * Available top/hair styles for avatars
 */
export type TopType =
  | 'NoHair'
  | 'Eyepatch'
  | 'Hat'
  | 'Hijab'
  | 'Turban'
  | 'WinterHat1'
  | 'WinterHat2'
  | 'WinterHat3'
  | 'WinterHat4'
  | 'LongHairBigHair'
  | 'LongHairBob'
  | 'LongHairBun'
  | 'LongHairCurly'
  | 'LongHairCurvy'
  | 'LongHairDreads'
  | 'LongHairFrida'
  | 'LongHairFro'
  | 'LongHairFroBand'
  | 'LongHairNotTooLong'
  | 'LongHairShavedSides'
  | 'LongHairMiaWallace'
  | 'LongHairStraight'
  | 'LongHairStraight2'
  | 'LongHairStraightStrand'
  | 'ShortHairDreads01'
  | 'ShortHairDreads02'
  | 'ShortHairFrizzle'
  | 'ShortHairShaggyMullet'
  | 'ShortHairShortCurly'
  | 'ShortHairShortFlat'
  | 'ShortHairShortRound'
  | 'ShortHairShortWaved'
  | 'ShortHairSides'
  | 'ShortHairTheCaesar'
  | 'ShortHairTheCaesarSidePart'

/**
 * Available hair colors
 */
export type HairColor =
  | 'Auburn'
  | 'Black'
  | 'Blonde'
  | 'BlondeGolden'
  | 'Brown'
  | 'BrownDark'
  | 'PastelPink'
  | 'Blue'
  | 'Platinum'
  | 'Red'
  | 'SilverGray'

// ============================================================================
// ACCESSORIES
// ============================================================================

/**
 * Available accessory types (glasses, etc.)
 */
export type AccessoriesType =
  | 'Blank'
  | 'Kurt'
  | 'Prescription01'
  | 'Prescription02'
  | 'Round'
  | 'Sunglasses'
  | 'Wayfarers'

// ============================================================================
// FACIAL HAIR
// ============================================================================

/**
 * Available facial hair styles
 */
export type FacialHairType =
  | 'Blank'
  | 'BeardMedium'
  | 'BeardLight'
  | 'BeardMajestic'
  | 'MoustacheFancy'
  | 'MoustacheMagnum'

/**
 * Available facial hair colors
 */
export type FacialHairColor =
  | 'Auburn'
  | 'Black'
  | 'Blonde'
  | 'BlondeGolden'
  | 'Brown'
  | 'BrownDark'
  | 'Platinum'
  | 'Red'

// ============================================================================
// CLOTHING
// ============================================================================

/**
 * Available clothing types
 */
export type ClotheType =
  | 'BlazerShirt'
  | 'BlazerSweater'
  | 'CollarSweater'
  | 'GraphicShirt'
  | 'Hoodie'
  | 'Overall'
  | 'ShirtCrewNeck'
  | 'ShirtScoopNeck'
  | 'ShirtVNeck'

/**
 * Available clothing colors
 */
export type ClotheColor =
  | 'Black'
  | 'Blue01'
  | 'Blue02'
  | 'Blue03'
  | 'Gray01'
  | 'Gray02'
  | 'Heather'
  | 'PastelBlue'
  | 'PastelGreen'
  | 'PastelOrange'
  | 'PastelRed'
  | 'PastelYellow'
  | 'Pink'
  | 'Red'
  | 'White'

/**
 * Available graphic types (shirt graphics)
 */
export type GraphicType =
  | 'Bat'
  | 'Cumbia'
  | 'Deer'
  | 'Diamond'
  | 'Hola'
  | 'Pizza'
  | 'Resist'
  | 'Selena'
  | 'Bear'
  | 'SkullOutline'
  | 'Skull'

// ============================================================================
// EYES
// ============================================================================

/**
 * Available eye types/expressions
 */
export type EyeType =
  | 'Close'
  | 'Cry'
  | 'Default'
  | 'Dizzy'
  | 'EyeRoll'
  | 'Happy'
  | 'Hearts'
  | 'Side'
  | 'Squint'
  | 'Surprised'
  | 'Wink'
  | 'WinkWacky'

// ============================================================================
// EYEBROWS
// ============================================================================

/**
 * Available eyebrow types/expressions
 */
export type EyebrowType =
  | 'Angry'
  | 'AngryNatural'
  | 'Default'
  | 'DefaultNatural'
  | 'FlatNatural'
  | 'RaisedExcited'
  | 'RaisedExcitedNatural'
  | 'SadConcerned'
  | 'SadConcernedNatural'
  | 'UnibrowNatural'
  | 'UpDown'
  | 'UpDownNatural'

// ============================================================================
// MOUTH
// ============================================================================

/**
 * Available mouth types/expressions
 */
export type MouthType =
  | 'Concerned'
  | 'Default'
  | 'Disbelief'
  | 'Eating'
  | 'Grimace'
  | 'Sad'
  | 'ScreamOpen'
  | 'Serious'
  | 'Smile'
  | 'Tongue'
  | 'Twinkle'
  | 'Vomit'

// ============================================================================
// SKIN
// ============================================================================

/**
 * Available skin tones
 */
export type SkinColor =
  | 'Tanned'
  | 'Yellow'
  | 'Pale'
  | 'Light'
  | 'Brown'
  | 'DarkBrown'
  | 'Black'

// ============================================================================
// AVATAR STYLE
// ============================================================================

/**
 * Avatar rendering style
 */
export type AvatarStyle = 'Circle' | 'Transparent'

// ============================================================================
// MAIN AVATAR CONFIGURATION
// ============================================================================

/**
 * Complete avatar configuration object
 *
 * This interface defines all customizable attributes for an avatar.
 * All fields are optional to allow flexible matching and partial updates.
 * It is stored as JSONB in the database for profiles.own_avatar and posts.target_avatar.
 */
export interface AvatarConfig {
  /** Avatar rendering style */
  avatarStyle?: AvatarStyle
  /** Hair/hat style */
  topType?: TopType
  /** Glasses or other face accessories */
  accessoriesType?: AccessoriesType
  /** Hair color (applicable when topType is a hair style) */
  hairColor?: HairColor
  /** Facial hair style (beard, moustache) */
  facialHairType?: FacialHairType
  /** Facial hair color */
  facialHairColor?: FacialHairColor
  /** Clothing type */
  clotheType?: ClotheType
  /** Clothing color */
  clotheColor?: ClotheColor
  /** Graphic type (shirt graphics) */
  graphicType?: GraphicType
  /** Eye type/expression */
  eyeType?: EyeType
  /** Eyebrow type/expression */
  eyebrowType?: EyebrowType
  /** Mouth type/expression */
  mouthType?: MouthType
  /** Skin tone */
  skinColor?: SkinColor
}

/**
 * Partial avatar configuration for matching algorithm
 * All fields are optional to allow flexible matching
 */
export type PartialAvatarConfig = Partial<AvatarConfig>

/**
 * Default avatar configuration
 * Used when creating a new avatar or resetting to defaults
 */
export const DEFAULT_AVATAR_CONFIG: Required<AvatarConfig> = {
  avatarStyle: 'Circle',
  topType: 'ShortHairShortFlat',
  accessoriesType: 'Blank',
  hairColor: 'Brown',
  facialHairType: 'Blank',
  facialHairColor: 'Brown',
  clotheType: 'ShirtCrewNeck',
  clotheColor: 'Blue01',
  graphicType: 'Bat',
  eyeType: 'Default',
  eyebrowType: 'Default',
  mouthType: 'Default',
  skinColor: 'Light',
}

// ============================================================================
// AVATAR OPTIONS (for UI selection)
// ============================================================================

/**
 * Options for avatar builder UI
 * Each array contains all valid values for a specific attribute
 */
export const AVATAR_OPTIONS = {
  topType: [
    'NoHair',
    'Eyepatch',
    'Hat',
    'Hijab',
    'Turban',
    'WinterHat1',
    'WinterHat2',
    'WinterHat3',
    'WinterHat4',
    'LongHairBigHair',
    'LongHairBob',
    'LongHairBun',
    'LongHairCurly',
    'LongHairCurvy',
    'LongHairDreads',
    'LongHairFrida',
    'LongHairFro',
    'LongHairFroBand',
    'LongHairMiaWallace',
    'LongHairNotTooLong',
    'LongHairShavedSides',
    'LongHairStraight',
    'LongHairStraight2',
    'LongHairStraightStrand',
    'ShortHairDreads01',
    'ShortHairDreads02',
    'ShortHairFrizzle',
    'ShortHairShaggyMullet',
    'ShortHairShortCurly',
    'ShortHairShortFlat',
    'ShortHairShortRound',
    'ShortHairShortWaved',
    'ShortHairSides',
    'ShortHairTheCaesar',
    'ShortHairTheCaesarSidePart',
  ] as const satisfies readonly TopType[],

  accessoriesType: [
    'Blank',
    'Kurt',
    'Prescription01',
    'Prescription02',
    'Round',
    'Sunglasses',
    'Wayfarers',
  ] as const satisfies readonly AccessoriesType[],

  hairColor: [
    'Auburn',
    'Black',
    'Blonde',
    'BlondeGolden',
    'Brown',
    'BrownDark',
    'PastelPink',
    'Blue',
    'Platinum',
    'Red',
    'SilverGray',
  ] as const satisfies readonly HairColor[],

  facialHairType: [
    'Blank',
    'BeardMedium',
    'BeardLight',
    'BeardMajestic',
    'MoustacheFancy',
    'MoustacheMagnum',
  ] as const satisfies readonly FacialHairType[],

  facialHairColor: [
    'Auburn',
    'Black',
    'Blonde',
    'BlondeGolden',
    'Brown',
    'BrownDark',
    'Platinum',
    'Red',
  ] as const satisfies readonly FacialHairColor[],

  clotheType: [
    'BlazerShirt',
    'BlazerSweater',
    'CollarSweater',
    'GraphicShirt',
    'Hoodie',
    'Overall',
    'ShirtCrewNeck',
    'ShirtScoopNeck',
    'ShirtVNeck',
  ] as const satisfies readonly ClotheType[],

  clotheColor: [
    'Black',
    'Blue01',
    'Blue02',
    'Blue03',
    'Gray01',
    'Gray02',
    'Heather',
    'PastelBlue',
    'PastelGreen',
    'PastelOrange',
    'PastelRed',
    'PastelYellow',
    'Pink',
    'Red',
    'White',
  ] as const satisfies readonly ClotheColor[],

  graphicType: [
    'Bat',
    'Cumbia',
    'Deer',
    'Diamond',
    'Hola',
    'Pizza',
    'Resist',
    'Selena',
    'Bear',
    'SkullOutline',
    'Skull',
  ] as const satisfies readonly GraphicType[],

  eyeType: [
    'Close',
    'Cry',
    'Default',
    'Dizzy',
    'EyeRoll',
    'Happy',
    'Hearts',
    'Side',
    'Squint',
    'Surprised',
    'Wink',
    'WinkWacky',
  ] as const satisfies readonly EyeType[],

  eyebrowType: [
    'Angry',
    'AngryNatural',
    'Default',
    'DefaultNatural',
    'FlatNatural',
    'RaisedExcited',
    'RaisedExcitedNatural',
    'SadConcerned',
    'SadConcernedNatural',
    'UnibrowNatural',
    'UpDown',
    'UpDownNatural',
  ] as const satisfies readonly EyebrowType[],

  mouthType: [
    'Concerned',
    'Default',
    'Disbelief',
    'Eating',
    'Grimace',
    'Sad',
    'ScreamOpen',
    'Serious',
    'Smile',
    'Tongue',
    'Twinkle',
    'Vomit',
  ] as const satisfies readonly MouthType[],

  skinColor: [
    'Tanned',
    'Yellow',
    'Pale',
    'Light',
    'Brown',
    'DarkBrown',
    'Black',
  ] as const satisfies readonly SkinColor[],

  avatarStyle: ['Circle', 'Transparent'] as const satisfies readonly AvatarStyle[],
} as const

/**
 * Type for avatar attribute keys
 */
export type AvatarAttribute = keyof AvatarConfig

/**
 * Human-readable labels for avatar attributes (for UI)
 */
export const AVATAR_OPTION_LABELS: Record<AvatarAttribute, string> = {
  avatarStyle: 'Style',
  topType: 'Hair / Head',
  accessoriesType: 'Accessories',
  hairColor: 'Hair Color',
  facialHairType: 'Facial Hair',
  facialHairColor: 'Facial Hair Color',
  clotheType: 'Clothes',
  clotheColor: 'Clothes Color',
  graphicType: 'Graphic',
  eyeType: 'Eyes',
  eyebrowType: 'Eyebrows',
  mouthType: 'Mouth',
  skinColor: 'Skin Color',
}

/**
 * Attributes that are most important for physical matching
 * These should be weighted higher in the matching algorithm
 */
export const PRIMARY_MATCHING_ATTRIBUTES: AvatarAttribute[] = [
  'skinColor',
  'topType',
  'hairColor',
  'facialHairType',
  'accessoriesType',
]

/**
 * Attributes that are less important for matching
 * These represent expression/style choices rather than physical traits
 */
export const SECONDARY_MATCHING_ATTRIBUTES: AvatarAttribute[] = [
  'eyeType',
  'eyebrowType',
  'mouthType',
  'clotheType',
  'clotheColor',
  'facialHairColor',
  'graphicType',
  'avatarStyle',
]

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Type for avatar option keys
 */
export type AvatarOptionKey = keyof typeof AVATAR_OPTIONS

/**
 * Type for avatar option values
 */
export type AvatarOptionValue<K extends AvatarOptionKey> = (typeof AVATAR_OPTIONS)[K][number]

/**
 * Type guard to check if a value is a valid avatar option
 */
export function isValidAvatarOption<K extends AvatarOptionKey>(
  key: K,
  value: unknown
): value is AvatarOptionValue<K> {
  const options = AVATAR_OPTIONS[key] as readonly string[]
  return typeof value === 'string' && options.includes(value)
}

/**
 * Validates an entire avatar configuration
 * Returns true if all provided options are valid
 */
export function isValidAvatarConfig(config: unknown): config is AvatarConfig {
  if (typeof config !== 'object' || config === null) {
    return false
  }

  const avatarConfig = config as Record<string, unknown>

  for (const [key, value] of Object.entries(avatarConfig)) {
    if (key in AVATAR_OPTIONS) {
      if (!isValidAvatarOption(key as AvatarOptionKey, value)) {
        return false
      }
    }
  }

  return true
}

/**
 * Creates a complete avatar config with defaults for missing values
 */
export function createAvatarConfig(partial?: Partial<AvatarConfig>): Required<AvatarConfig> {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...partial,
  }
}