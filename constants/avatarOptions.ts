/**
 * Avatar Builder Options Constants
 *
 * Human-readable labels and organized categories for the avatar customization UI.
 * These constants provide display-friendly names for all Avataaars attributes.
 *
 * @example
 * ```tsx
 * import { AVATAR_CATEGORIES, getOptionLabel } from 'constants/avatarOptions'
 *
 * // Get the label for a specific option
 * const label = getOptionLabel('topType', 'LongHairBob') // "Long Hair Bob"
 *
 * // Iterate through categories for UI
 * AVATAR_CATEGORIES.forEach(category => {
 *   console.log(category.label, category.attributes)
 * })
 * ```
 */

import {
  TopType,
  HairColor,
  AccessoriesType,
  FacialHairType,
  FacialHairColor,
  ClotheType,
  ClotheColor,
  EyeType,
  EyebrowType,
  MouthType,
  SkinColor,
  AvatarAttribute,
  AVATAR_OPTIONS,
} from '../types/avatar'

// ============================================================================
// HUMAN-READABLE LABELS FOR OPTIONS
// ============================================================================

/**
 * Human-readable labels for top/hair types
 */
export const TOP_TYPE_LABELS: Record<TopType, string> = {
  NoHair: 'No Hair',
  Eyepatch: 'Eyepatch',
  Hat: 'Hat',
  Hijab: 'Hijab',
  Turban: 'Turban',
  WinterHat1: 'Winter Hat 1',
  WinterHat2: 'Winter Hat 2',
  WinterHat3: 'Winter Hat 3',
  WinterHat4: 'Winter Hat 4',
  LongHairBigHair: 'Big Hair',
  LongHairBob: 'Bob',
  LongHairBun: 'Bun',
  LongHairCurly: 'Curly Long',
  LongHairCurvy: 'Curvy Long',
  LongHairDreads: 'Long Dreads',
  LongHairFrida: 'Frida',
  LongHairFro: 'Afro Long',
  LongHairFroBand: 'Afro with Band',
  LongHairNotTooLong: 'Medium Length',
  LongHairShavedSides: 'Shaved Sides',
  LongHairMiaWallace: 'Mia Wallace',
  LongHairStraight: 'Straight Long',
  LongHairStraight2: 'Straight Long 2',
  LongHairStraightStrand: 'Straight Strand',
  ShortHairDreads01: 'Short Dreads 1',
  ShortHairDreads02: 'Short Dreads 2',
  ShortHairFrizzle: 'Frizzle',
  ShortHairShaggyMullet: 'Shaggy Mullet',
  ShortHairShortCurly: 'Short Curly',
  ShortHairShortFlat: 'Short Flat',
  ShortHairShortRound: 'Short Round',
  ShortHairShortWaved: 'Short Waved',
  ShortHairSides: 'Sides Only',
  ShortHairTheCaesar: 'Caesar',
  ShortHairTheCaesarSidePart: 'Caesar Side Part',
}

/**
 * Human-readable labels for hair colors
 */
export const HAIR_COLOR_LABELS: Record<HairColor, string> = {
  Auburn: 'Auburn',
  Black: 'Black',
  Blonde: 'Blonde',
  BlondeGolden: 'Golden Blonde',
  Brown: 'Brown',
  BrownDark: 'Dark Brown',
  PastelPink: 'Pink',
  Blue: 'Blue',
  Platinum: 'Platinum',
  Red: 'Red',
  SilverGray: 'Silver/Gray',
}

/**
 * Human-readable labels for accessory types
 */
export const ACCESSORIES_TYPE_LABELS: Record<AccessoriesType, string> = {
  Blank: 'None',
  Kurt: 'Kurt Glasses',
  Prescription01: 'Prescription 1',
  Prescription02: 'Prescription 2',
  Round: 'Round Glasses',
  Sunglasses: 'Sunglasses',
  Wayfarers: 'Wayfarers',
}

/**
 * Human-readable labels for facial hair types
 */
export const FACIAL_HAIR_TYPE_LABELS: Record<FacialHairType, string> = {
  Blank: 'None',
  BeardMedium: 'Medium Beard',
  BeardLight: 'Light Beard',
  BeardMajestic: 'Majestic Beard',
  MoustacheFancy: 'Fancy Moustache',
  MoustacheMagnum: 'Magnum Moustache',
}

/**
 * Human-readable labels for facial hair colors
 */
export const FACIAL_HAIR_COLOR_LABELS: Record<FacialHairColor, string> = {
  Auburn: 'Auburn',
  Black: 'Black',
  Blonde: 'Blonde',
  BlondeGolden: 'Golden Blonde',
  Brown: 'Brown',
  BrownDark: 'Dark Brown',
  Platinum: 'Platinum',
  Red: 'Red',
}

/**
 * Human-readable labels for clothing types
 */
export const CLOTHE_TYPE_LABELS: Record<ClotheType, string> = {
  BlazerShirt: 'Blazer & Shirt',
  BlazerSweater: 'Blazer & Sweater',
  CollarSweater: 'Collar Sweater',
  GraphicShirt: 'Graphic Shirt',
  Hoodie: 'Hoodie',
  Overall: 'Overall',
  ShirtCrewNeck: 'Crew Neck',
  ShirtScoopNeck: 'Scoop Neck',
  ShirtVNeck: 'V-Neck',
}

/**
 * Human-readable labels for clothing colors
 */
export const CLOTHE_COLOR_LABELS: Record<ClotheColor, string> = {
  Black: 'Black',
  Blue01: 'Blue',
  Blue02: 'Navy Blue',
  Blue03: 'Light Blue',
  Gray01: 'Gray',
  Gray02: 'Dark Gray',
  Heather: 'Heather',
  PastelBlue: 'Pastel Blue',
  PastelGreen: 'Pastel Green',
  PastelOrange: 'Pastel Orange',
  PastelRed: 'Pastel Red',
  PastelYellow: 'Pastel Yellow',
  Pink: 'Pink',
  Red: 'Red',
  White: 'White',
}

/**
 * Human-readable labels for eye types
 */
export const EYE_TYPE_LABELS: Record<EyeType, string> = {
  Close: 'Closed',
  Cry: 'Crying',
  Default: 'Default',
  Dizzy: 'Dizzy',
  EyeRoll: 'Eye Roll',
  Happy: 'Happy',
  Hearts: 'Hearts',
  Side: 'Side Glance',
  Squint: 'Squint',
  Surprised: 'Surprised',
  Wink: 'Wink',
  WinkWacky: 'Wacky Wink',
}

/**
 * Human-readable labels for eyebrow types
 */
export const EYEBROW_TYPE_LABELS: Record<EyebrowType, string> = {
  Angry: 'Angry',
  AngryNatural: 'Angry Natural',
  Default: 'Default',
  DefaultNatural: 'Natural',
  FlatNatural: 'Flat Natural',
  RaisedExcited: 'Raised Excited',
  RaisedExcitedNatural: 'Raised Natural',
  SadConcerned: 'Sad Concerned',
  SadConcernedNatural: 'Sad Natural',
  UnibrowNatural: 'Unibrow',
  UpDown: 'Up Down',
  UpDownNatural: 'Up Down Natural',
}

/**
 * Human-readable labels for mouth types
 */
export const MOUTH_TYPE_LABELS: Record<MouthType, string> = {
  Concerned: 'Concerned',
  Default: 'Default',
  Disbelief: 'Disbelief',
  Eating: 'Eating',
  Grimace: 'Grimace',
  Sad: 'Sad',
  ScreamOpen: 'Scream',
  Serious: 'Serious',
  Smile: 'Smile',
  Tongue: 'Tongue Out',
  Twinkle: 'Twinkle',
  Vomit: 'Sick',
}

/**
 * Human-readable labels for skin colors
 */
export const SKIN_COLOR_LABELS: Record<SkinColor, string> = {
  Tanned: 'Tanned',
  Yellow: 'Yellow',
  Pale: 'Pale',
  Light: 'Light',
  Brown: 'Brown',
  DarkBrown: 'Dark Brown',
  Black: 'Black',
}

// ============================================================================
// LABEL LOOKUP
// ============================================================================

/**
 * Map of all option labels by attribute
 */
export const OPTION_LABELS: Record<AvatarAttribute, Record<string, string>> = {
  topType: TOP_TYPE_LABELS,
  hairColor: HAIR_COLOR_LABELS,
  accessoriesType: ACCESSORIES_TYPE_LABELS,
  facialHairType: FACIAL_HAIR_TYPE_LABELS,
  facialHairColor: FACIAL_HAIR_COLOR_LABELS,
  clotheType: CLOTHE_TYPE_LABELS,
  clotheColor: CLOTHE_COLOR_LABELS,
  eyeType: EYE_TYPE_LABELS,
  eyebrowType: EYEBROW_TYPE_LABELS,
  mouthType: MOUTH_TYPE_LABELS,
  skinColor: SKIN_COLOR_LABELS,
}

/**
 * Get human-readable label for an option value
 */
export function getOptionLabel(attribute: AvatarAttribute, value: string): string {
  const labels = OPTION_LABELS[attribute]
  return labels?.[value] ?? value
}

// ============================================================================
// AVATAR CATEGORIES FOR UI
// ============================================================================

/**
 * Category definition for avatar builder UI
 */
export interface AvatarCategory {
  /** Unique category ID */
  id: string
  /** Display label for the category */
  label: string
  /** Icon for the category (emoji) */
  icon: string
  /** Attributes in this category */
  attributes: AvatarAttribute[]
  /** Description for the category */
  description: string
}

/**
 * Organized categories for the avatar builder UI
 * Groups related attributes together for a better UX
 */
export const AVATAR_CATEGORIES: AvatarCategory[] = [
  {
    id: 'skin',
    label: 'Skin',
    icon: '🖐️',
    attributes: ['skinColor'],
    description: 'Choose skin tone',
  },
  {
    id: 'hair',
    label: 'Hair',
    icon: '💇',
    attributes: ['topType', 'hairColor'],
    description: 'Choose hairstyle and color',
  },
  {
    id: 'eyes',
    label: 'Eyes',
    icon: '👁️',
    attributes: ['eyeType', 'eyebrowType', 'accessoriesType'],
    description: 'Choose eyes, eyebrows, and glasses',
  },
  {
    id: 'mouth',
    label: 'Mouth',
    icon: '👄',
    attributes: ['mouthType'],
    description: 'Choose mouth expression',
  },
  {
    id: 'facial-hair',
    label: 'Facial Hair',
    icon: '🧔',
    attributes: ['facialHairType', 'facialHairColor'],
    description: 'Choose facial hair style and color',
  },
  {
    id: 'clothes',
    label: 'Clothes',
    icon: '👕',
    attributes: ['clotheType', 'clotheColor'],
    description: 'Choose clothing style and color',
  },
]

/**
 * Get category by ID
 */
export function getCategoryById(id: string): AvatarCategory | undefined {
  return AVATAR_CATEGORIES.find((category) => category.id === id)
}

/**
 * Get category for an attribute
 */
export function getCategoryForAttribute(attribute: AvatarAttribute): AvatarCategory | undefined {
  return AVATAR_CATEGORIES.find((category) => category.attributes.includes(attribute))
}

// ============================================================================
// ATTRIBUTE CONFIGURATION
// ============================================================================

/**
 * Configuration for an avatar attribute in the builder UI
 */
export interface AttributeConfig {
  /** Attribute key */
  attribute: AvatarAttribute
  /** Display label */
  label: string
  /** Available options */
  options: readonly string[]
  /** Option labels map */
  optionLabels: Record<string, string>
}

/**
 * Get complete configuration for an attribute
 */
export function getAttributeConfig(attribute: AvatarAttribute): AttributeConfig {
  const options = AVATAR_OPTIONS[attribute as keyof typeof AVATAR_OPTIONS] as readonly string[]
  const optionLabels = OPTION_LABELS[attribute]

  const labelMap: Record<AvatarAttribute, string> = {
    topType: 'Hair Style',
    hairColor: 'Hair Color',
    accessoriesType: 'Glasses',
    facialHairType: 'Facial Hair',
    facialHairColor: 'Facial Hair Color',
    clotheType: 'Clothing',
    clotheColor: 'Clothing Color',
    eyeType: 'Eyes',
    eyebrowType: 'Eyebrows',
    mouthType: 'Mouth',
    skinColor: 'Skin Tone',
  }

  return {
    attribute,
    label: labelMap[attribute],
    options,
    optionLabels,
  }
}

// ============================================================================
// COLOR OPTIONS FOR SWATCHES
// ============================================================================

/**
 * Visual color representation for color-type options
 * Used to display color swatches in the UI
 */
export const COLOR_SWATCHES: Record<string, string> = {
  // Hair colors
  Auburn: '#A55728',
  Black: '#2C1B18',
  Blonde: '#B58143',
  BlondeGolden: '#D6B370',
  Brown: '#724133',
  BrownDark: '#4A312C',
  PastelPink: '#F59797',
  Blue: '#65C0FF',
  Platinum: '#ECDCBF',
  Red: '#C93305',
  SilverGray: '#A7A7A7',
  // Skin colors
  Tanned: '#FD9841',
  Yellow: '#F8D25C',
  Pale: '#FFDBB4',
  Light: '#EDB98A',
  // Brown is shared with hair
  DarkBrown: '#614335',
  // Black is shared with hair
  // Clothing colors
  Blue01: '#5199E4',
  Blue02: '#25557C',
  Blue03: '#65C9FF',
  Gray01: '#929598',
  Gray02: '#3C4F5C',
  Heather: '#3C4F5C',
  PastelBlue: '#B1E2FF',
  PastelGreen: '#A7FFC4',
  PastelOrange: '#FFDEB5',
  PastelRed: '#FFAFB9',
  PastelYellow: '#FFFFB1',
  Pink: '#FF488E',
  // Red, Black, White are standard
  White: '#FFFFFF',
}

/**
 * Get visual color for a color option
 * Falls back to a default if not found
 */
export function getColorSwatch(colorOption: string): string {
  return COLOR_SWATCHES[colorOption] ?? '#CCCCCC'
}

/**
 * Check if an attribute is a color attribute
 */
export function isColorAttribute(attribute: AvatarAttribute): boolean {
  return ['hairColor', 'facialHairColor', 'clotheColor', 'skinColor'].includes(attribute)
}
