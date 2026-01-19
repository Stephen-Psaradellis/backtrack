/**
 * Avatar Types - Complete type definitions for the SVG Avatar System
 *
 * This module provides comprehensive TypeScript types for building
 * customizable layered SVG avatars in React Native.
 */

// ============================================================================
// ENUMS - Feature Types
// ============================================================================

/**
 * Hair style options
 */
export enum HairStyle {
  // Short styles
  SHORT_BUZZ = 'short_buzz',
  SHORT_CREW = 'short_crew',
  SHORT_SLICK = 'short_slick',
  SHORT_SPIKY = 'short_spiky',
  SHORT_CURLY = 'short_curly',
  SHORT_WAVY = 'short_wavy',
  SHORT_SIDE_PART = 'short_side_part',
  SHORT_POMPADOUR = 'short_pompadour',

  // Medium styles
  MEDIUM_MESSY = 'medium_messy',
  MEDIUM_STRAIGHT = 'medium_straight',
  MEDIUM_CURLY = 'medium_curly',

  // Long styles
  LONG_STRAIGHT = 'long_straight',
  LONG_WAVY = 'long_wavy',
  LONG_CURLY = 'long_curly',
  LONG_PONYTAIL = 'long_ponytail',
  LONG_BUN = 'long_bun',
  LONG_BRAIDS = 'long_braids',

  // Special styles
  AFRO = 'afro',
  MOHAWK = 'mohawk',
  BALD = 'bald',
  SHAVED = 'shaved',

  // Headwear
  HAT_BEANIE = 'hat_beanie',
  HAT_CAP = 'hat_cap',
  HEADBAND = 'headband',
  HIJAB = 'hijab',
  TURBAN = 'turban',
}

/**
 * Eye style options
 */
export enum EyeStyle {
  DEFAULT = 'default',
  ROUND = 'round',
  NARROW = 'narrow',
  WIDE = 'wide',
  ALMOND = 'almond',
  CLOSED = 'closed',
  HAPPY = 'happy',
  WINK = 'wink',
  WINK_LEFT = 'wink_left',
  SLEEPY = 'sleepy',
  SURPRISED = 'surprised',
  HEARTS = 'hearts',
  STARS = 'stars',
  CRY = 'cry',
  SQUINT = 'squint',
  SIDE = 'side',
  DIZZY = 'dizzy',
  ROLL = 'roll',
}

/**
 * Eyebrow style options
 */
export enum EyebrowStyle {
  DEFAULT = 'default',
  NATURAL = 'natural',
  THICK = 'thick',
  THIN = 'thin',
  ARCHED = 'arched',
  FLAT = 'flat',
  ANGRY = 'angry',
  SAD = 'sad',
  RAISED = 'raised',
  UNIBROW = 'unibrow',
  CONCERNED = 'concerned',
  SKEPTICAL = 'skeptical',
}

/**
 * Nose style options
 */
export enum NoseStyle {
  DEFAULT = 'default',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  POINTED = 'pointed',
  ROUNDED = 'rounded',
  BUTTON = 'button',
  HOOKED = 'hooked',
  FLAT = 'flat',
  WIDE = 'wide',
  NARROW = 'narrow',
}

/**
 * Mouth style options
 */
export enum MouthStyle {
  DEFAULT = 'default',
  SMILE = 'smile',
  BIG_SMILE = 'big_smile',
  GRIN = 'grin',
  LAUGH = 'laugh',
  SMIRK = 'smirk',
  SAD = 'sad',
  FROWN = 'frown',
  SERIOUS = 'serious',
  OPEN = 'open',
  TONGUE = 'tongue',
  KISS = 'kiss',
  SURPRISED = 'surprised',
  EATING = 'eating',
  GRIMACE = 'grimace',
  CONCERNED = 'concerned',
  SCREAM = 'scream',
}

/**
 * Face shape options
 */
export enum FaceShape {
  OVAL = 'oval',
  ROUND = 'round',
  SQUARE = 'square',
  HEART = 'heart',
  OBLONG = 'oblong',
  DIAMOND = 'diamond',
}

/**
 * Facial hair options (optional)
 */
export enum FacialHairStyle {
  NONE = 'none',
  STUBBLE = 'stubble',
  LIGHT_BEARD = 'light_beard',
  MEDIUM_BEARD = 'medium_beard',
  FULL_BEARD = 'full_beard',
  GOATEE = 'goatee',
  MUSTACHE = 'mustache',
  MUSTACHE_FANCY = 'mustache_fancy',
  SIDEBURNS = 'sideburns',
}

/**
 * Accessory options (optional)
 */
export enum AccessoryStyle {
  NONE = 'none',
  GLASSES_ROUND = 'glasses_round',
  GLASSES_SQUARE = 'glasses_square',
  GLASSES_PRESCRIPTION = 'glasses_prescription',
  SUNGLASSES = 'sunglasses',
  SUNGLASSES_AVIATOR = 'sunglasses_aviator',
  MONOCLE = 'monocle',
  EYEPATCH = 'eyepatch',
  EARRING_SMALL = 'earring_small',
  EARRING_HOOP = 'earring_hoop',
  NOSE_RING = 'nose_ring',
  HEADPHONES = 'headphones',
}

/**
 * Clothing style options
 */
export enum ClothingStyle {
  TSHIRT = 'tshirt',
  VNECK = 'vneck',
  SCOOP_NECK = 'scoop_neck',
  HOODIE = 'hoodie',
  BLAZER = 'blazer',
  SWEATER = 'sweater',
  TANK_TOP = 'tank_top',
  COLLAR_SHIRT = 'collar_shirt',
  OVERALL = 'overall',
}

// ============================================================================
// COLOR TYPES
// ============================================================================

/**
 * Skin tone color palette
 */
export interface SkinTone {
  name: string;
  hex: string;
  shadow: string;  // Darker variant for depth
  highlight: string;  // Lighter variant for highlights
}

/**
 * Hair color option
 */
export interface HairColor {
  name: string;
  hex: string;
  highlight?: string;
}

/**
 * Eye color option
 */
export interface EyeColor {
  name: string;
  hex: string;
  pupil?: string;
}

/**
 * General color option (for clothing, accessories, etc.)
 */
export interface ColorOption {
  name: string;
  hex: string;
}

// ============================================================================
// PREDEFINED COLOR PALETTES
// ============================================================================

export const SKIN_TONES: SkinTone[] = [
  { name: 'Porcelain', hex: '#ffe4c4', shadow: '#e6c9a8', highlight: '#fff5eb' },
  { name: 'Fair', hex: '#ffdbb4', shadow: '#e6c49c', highlight: '#fff0d9' },
  { name: 'Light', hex: '#f5d7c3', shadow: '#dbbfa8', highlight: '#fff1e8' },
  { name: 'Warm Ivory', hex: '#eac086', shadow: '#d1a770', highlight: '#f8d9a0' },
  { name: 'Tan', hex: '#d4a574', shadow: '#ba8d5c', highlight: '#e8bf8e' },
  { name: 'Honey', hex: '#c99d77', shadow: '#b08560', highlight: '#ddb791' },
  { name: 'Olive', hex: '#b08d63', shadow: '#97754c', highlight: '#c9a77d' },
  { name: 'Caramel', hex: '#a67c52', shadow: '#8d643a', highlight: '#c0966c' },
  { name: 'Brown', hex: '#8d5524', shadow: '#743f12', highlight: '#a76f3e' },
  { name: 'Chestnut', hex: '#6b4423', shadow: '#52310f', highlight: '#855e3d' },
  { name: 'Espresso', hex: '#4a2c2a', shadow: '#311815', highlight: '#644644' },
  { name: 'Deep', hex: '#3d2314', shadow: '#241205', highlight: '#57372e' },
];

export const HAIR_COLORS: HairColor[] = [
  { name: 'Black', hex: '#090806', highlight: '#2a2826' },
  { name: 'Dark Brown', hex: '#2c1810', highlight: '#4d3930' },
  { name: 'Brown', hex: '#4e3328', highlight: '#6f5448' },
  { name: 'Auburn', hex: '#5a2d23', highlight: '#7b4e43' },
  { name: 'Red', hex: '#8d3121', highlight: '#ae5241' },
  { name: 'Ginger', hex: '#b15a40', highlight: '#d27b60' },
  { name: 'Blonde', hex: '#c9a86c', highlight: '#e0c98c' },
  { name: 'Platinum', hex: '#e8d5b7', highlight: '#f5ead7' },
  { name: 'Gray', hex: '#7a7a7a', highlight: '#9a9a9a' },
  { name: 'Silver', hex: '#c0c0c0', highlight: '#e0e0e0' },
  { name: 'White', hex: '#e8e8e8', highlight: '#ffffff' },
  { name: 'Blue', hex: '#3c5a99', highlight: '#5c7ab9' },
  { name: 'Pink', hex: '#d35d8a', highlight: '#f37daa' },
  { name: 'Purple', hex: '#7b5d99', highlight: '#9b7db9' },
  { name: 'Green', hex: '#4a8c5d', highlight: '#6aac7d' },
  { name: 'Teal', hex: '#2e8b8b', highlight: '#4eabab' },
];

export const EYE_COLORS: EyeColor[] = [
  { name: 'Dark Brown', hex: '#3d2314', pupil: '#1a0d08' },
  { name: 'Brown', hex: '#634e34', pupil: '#2a2014' },
  { name: 'Hazel', hex: '#8b7355', pupil: '#3d3425' },
  { name: 'Amber', hex: '#b5651d', pupil: '#5a3210' },
  { name: 'Green', hex: '#3d5c3d', pupil: '#1e2e1e' },
  { name: 'Blue-Green', hex: '#3d8b8b', pupil: '#1e4545' },
  { name: 'Blue', hex: '#6b8caf', pupil: '#354657' },
  { name: 'Light Blue', hex: '#8cb4d2', pupil: '#4a6978' },
  { name: 'Gray', hex: '#808080', pupil: '#404040' },
  { name: 'Gray-Blue', hex: '#7393a7', pupil: '#3a4a54' },
];

export const CLOTHING_COLORS: ColorOption[] = [
  { name: 'Navy', hex: '#1a237e' },
  { name: 'Royal Blue', hex: '#3f51b5' },
  { name: 'Sky Blue', hex: '#5e8cd8' },
  { name: 'Teal', hex: '#00897b' },
  { name: 'Forest Green', hex: '#2e7d32' },
  { name: 'Olive', hex: '#6b8e23' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Crimson', hex: '#c62828' },
  { name: 'Coral', hex: '#ff6f61' },
  { name: 'Hot Pink', hex: '#d81b60' },
  { name: 'Purple', hex: '#6a1b9a' },
  { name: 'Lavender', hex: '#9c7ec9' },
  { name: 'Orange', hex: '#ef6c00' },
  { name: 'Gold', hex: '#f9a825' },
  { name: 'Charcoal', hex: '#424242' },
  { name: 'Black', hex: '#212121' },
  { name: 'White', hex: '#fafafa' },
  { name: 'Cream', hex: '#f5f5dc' },
];

// ============================================================================
// AVATAR CONFIG
// ============================================================================

/**
 * Complete avatar configuration interface
 */
export interface AvatarConfig {
  // Identity
  id?: string;
  gender: 'male' | 'female' | 'neutral';

  // Face
  faceShape: FaceShape;
  skinTone: string;  // hex color

  // Eyes
  eyeStyle: EyeStyle;
  eyeColor: string;  // hex color

  // Eyebrows
  eyebrowStyle: EyebrowStyle;
  eyebrowColor?: string;  // defaults to hairColor

  // Nose
  noseStyle: NoseStyle;

  // Mouth
  mouthStyle: MouthStyle;
  lipColor?: string;  // optional lip color

  // Hair
  hairStyle: HairStyle;
  hairColor: string;  // hex color

  // Optional features
  facialHair?: FacialHairStyle;
  facialHairColor?: string;  // defaults to hairColor

  // Accessories
  accessory?: AccessoryStyle;
  accessoryColor?: string;

  // Clothing
  clothing?: ClothingStyle;
  clothingColor?: string;
  clothingSecondaryColor?: string;
}

/**
 * Stored avatar format for persistence
 */
export interface StoredAvatar {
  id: string;
  type: 'svg';
  config: AvatarConfig;
  base64Snapshot?: string;  // Cached PNG render
  createdAt: string;
  updatedAt: string;
}

/**
 * Avatar size variants
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * Size mapping in pixels
 */
export const AVATAR_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 64,
  lg: 96,
  xl: 128,
  xxl: 200,
};

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

/**
 * Default male avatar configuration
 */
export const DEFAULT_MALE_CONFIG: AvatarConfig = {
  gender: 'male',
  faceShape: FaceShape.OVAL,
  skinTone: '#f5d7c3',
  eyeStyle: EyeStyle.DEFAULT,
  eyeColor: '#634e34',
  eyebrowStyle: EyebrowStyle.DEFAULT,
  noseStyle: NoseStyle.DEFAULT,
  mouthStyle: MouthStyle.SMILE,
  hairStyle: HairStyle.SHORT_CREW,
  hairColor: '#2c1810',
  clothing: ClothingStyle.HOODIE,
  clothingColor: '#3f51b5',
};

/**
 * Default female avatar configuration
 */
export const DEFAULT_FEMALE_CONFIG: AvatarConfig = {
  gender: 'female',
  faceShape: FaceShape.OVAL,
  skinTone: '#f5d7c3',
  eyeStyle: EyeStyle.DEFAULT,
  eyeColor: '#634e34',
  eyebrowStyle: EyebrowStyle.NATURAL,
  noseStyle: NoseStyle.SMALL,
  mouthStyle: MouthStyle.SMILE,
  hairStyle: HairStyle.LONG_WAVY,
  hairColor: '#2c1810',
  clothing: ClothingStyle.SCOOP_NECK,
  clothingColor: '#d81b60',
};

/**
 * Default neutral avatar configuration
 */
export const DEFAULT_NEUTRAL_CONFIG: AvatarConfig = {
  gender: 'neutral',
  faceShape: FaceShape.OVAL,
  skinTone: '#f5d7c3',
  eyeStyle: EyeStyle.DEFAULT,
  eyeColor: '#634e34',
  eyebrowStyle: EyebrowStyle.NATURAL,
  noseStyle: NoseStyle.DEFAULT,
  mouthStyle: MouthStyle.SMILE,
  hairStyle: HairStyle.MEDIUM_MESSY,
  hairColor: '#2c1810',
  clothing: ClothingStyle.TSHIRT,
  clothingColor: '#00897b',
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for AvatarConfig
 */
export function isAvatarConfig(value: unknown): value is AvatarConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.gender === 'string' &&
    typeof config.faceShape === 'string' &&
    typeof config.skinTone === 'string' &&
    typeof config.eyeStyle === 'string' &&
    typeof config.eyeColor === 'string' &&
    typeof config.hairStyle === 'string' &&
    typeof config.hairColor === 'string'
  );
}

/**
 * Type guard for StoredAvatar
 */
export function isStoredAvatar(value: unknown): value is StoredAvatar {
  if (typeof value !== 'object' || value === null) return false;
  const avatar = value as Record<string, unknown>;
  return (
    typeof avatar.id === 'string' &&
    avatar.type === 'svg' &&
    isAvatarConfig(avatar.config)
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Props common to all SVG part components
 */
export interface SvgPartProps {
  color?: string;
  secondaryColor?: string;
  scale?: number;
}

/**
 * Face part positioning data
 */
export interface FacePartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * ViewBox configuration for SVG
 */
export interface ViewBoxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_VIEWBOX: ViewBoxConfig = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};
