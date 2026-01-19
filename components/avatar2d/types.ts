/**
 * 2D Avatar Type Definitions
 *
 * This module defines the types for the 2D component-based avatar system
 * using Avataaars-style customization.
 */

// Core 2D avatar configuration
export interface Avatar2DConfig {
  // Identity
  gender: 'male' | 'female';
  skinTone: string;  // hex color

  // Appearance
  hairStyle: string;
  hairColor: string;
  eyeType: string;
  eyebrowType: string;
  mouthType: string;

  // Optional
  facialHair?: string;
  facialHairColor?: string;
  accessories?: string;
  accessoriesColor?: string;
  clothing?: string;
  clothingColor?: string;
  clothingGraphic?: string;
}

// Stored format (replaces StoredAvatar)
export interface StoredAvatar2D {
  id: string;
  type: '2d';
  config: Avatar2DConfig;
  base64?: string;  // Cached render
  createdAt: string;
  updatedAt: string;
}

// For matching
export interface AvatarMatchCriteria {
  gender: 'male' | 'female';
  skinTone: 'light' | 'medium' | 'dark';  // Simplified for matching
}

// Size variants for display
export type Avatar2DSize = 'sm' | 'md' | 'lg' | 'xl';

// Size mapping in pixels
export const AVATAR_SIZES: Record<Avatar2DSize, number> = {
  sm: 32,
  md: 64,
  lg: 120,
  xl: 200,
};

// Available hair styles (Avataaars)
export const HAIR_STYLES = [
  'shortHairShortFlat',
  'shortHairShortWaved',
  'shortHairShortCurly',
  'shortHairShortRound',
  'shortHairTheCaesar',
  'shortHairTheCaesarSidePart',
  'shortHairDreads01',
  'shortHairDreads02',
  'shortHairFrizzle',
  'shortHairShaggyMullet',
  'shortHairSides',
  'longHairBigHair',
  'longHairBob',
  'longHairBun',
  'longHairCurly',
  'longHairCurvy',
  'longHairDreads',
  'longHairFrida',
  'longHairFro',
  'longHairFroBand',
  'longHairMiaWallace',
  'longHairNotTooLong',
  'longHairShavedSides',
  'longHairStraight',
  'longHairStraight2',
  'longHairStraightStrand',
  'noHair',
  'hatHair1',
  'hatHair2',
  'hatHair3',
  'hatHair4',
  'winterHat1',
  'winterHat2',
  'winterHat3',
  'winterHat4',
  'turban',
  'hijab',
] as const;

// Available eye types
export const EYE_TYPES = [
  'default',
  'close',
  'cry',
  'dizzy',
  'eyeRoll',
  'happy',
  'hearts',
  'side',
  'squint',
  'surprised',
  'wink',
  'winkWacky',
] as const;

// Available eyebrow types
export const EYEBROW_TYPES = [
  'default',
  'defaultNatural',
  'angry',
  'angryNatural',
  'flatNatural',
  'frownNatural',
  'raisedExcited',
  'raisedExcitedNatural',
  'sadConcerned',
  'sadConcernedNatural',
  'unibrowNatural',
  'upDown',
  'upDownNatural',
] as const;

// Available mouth types
export const MOUTH_TYPES = [
  'default',
  'concerned',
  'disbelief',
  'eating',
  'grimace',
  'sad',
  'screamOpen',
  'serious',
  'smile',
  'tongue',
  'twinkle',
  'vomit',
] as const;

// Available facial hair types
export const FACIAL_HAIR_TYPES = [
  'none',
  'beardMedium',
  'beardLight',
  'beardMagestic',
  'moustacheFancy',
  'moustacheMagnum',
] as const;

// Available accessories
export const ACCESSORIES_TYPES = [
  'none',
  'eyepatch',
  'kurt',
  'prescription01',
  'prescription02',
  'round',
  'sunglasses',
  'wayfarers',
] as const;

// Available clothing types
export const CLOTHING_TYPES = [
  'blazerShirt',
  'blazerSweater',
  'collarSweater',
  'graphicShirt',
  'hoodie',
  'overall',
  'shirtCrewNeck',
  'shirtScoopNeck',
  'shirtVNeck',
] as const;

// Skin tone presets
export const SKIN_TONE_PRESETS = [
  { name: 'Pale', hex: '#ffdbb4' },
  { name: 'Light', hex: '#f5d7c3' },
  { name: 'Fair', hex: '#eac086' },
  { name: 'Warm', hex: '#d4a574' },
  { name: 'Tan', hex: '#c99d77' },
  { name: 'Medium', hex: '#b08d63' },
  { name: 'Olive', hex: '#c68642' },
  { name: 'Brown', hex: '#8d5524' },
  { name: 'Dark', hex: '#6b4423' },
  { name: 'Deep', hex: '#4a2c2a' },
] as const;

// Hair color presets
export const HAIR_COLOR_PRESETS = [
  { name: 'Black', hex: '#090806' },
  { name: 'Dark Brown', hex: '#2c1810' },
  { name: 'Brown', hex: '#4e3328' },
  { name: 'Auburn', hex: '#5a2d23' },
  { name: 'Red', hex: '#8d3121' },
  { name: 'Ginger', hex: '#b15a40' },
  { name: 'Blonde', hex: '#c9a86c' },
  { name: 'Platinum', hex: '#e8d5b7' },
  { name: 'Gray', hex: '#7a7a7a' },
  { name: 'White', hex: '#d5d5d5' },
  { name: 'Blue', hex: '#3c5a99' },
  { name: 'Pink', hex: '#d35d8a' },
  { name: 'Purple', hex: '#7b5d99' },
  { name: 'Green', hex: '#4a8c5d' },
] as const;

// Clothing color presets
export const CLOTHING_COLOR_PRESETS = [
  { name: 'Navy', hex: '#1a237e' },
  { name: 'Blue', hex: '#5e6cd8' },
  { name: 'Teal', hex: '#00897b' },
  { name: 'Green', hex: '#43a047' },
  { name: 'Red', hex: '#c62828' },
  { name: 'Pink', hex: '#d81b60' },
  { name: 'Purple', hex: '#6a1b9a' },
  { name: 'Orange', hex: '#ef6c00' },
  { name: 'Yellow', hex: '#f9a825' },
  { name: 'Gray', hex: '#616161' },
  { name: 'Black', hex: '#212121' },
  { name: 'White', hex: '#fafafa' },
] as const;

// Default config for new avatars
export const DEFAULT_AVATAR_CONFIG: Avatar2DConfig = {
  gender: 'male',
  skinTone: '#f5d7c3',
  hairStyle: 'shortHairShortFlat',
  hairColor: '#2c1810',
  eyeType: 'default',
  eyebrowType: 'default',
  mouthType: 'smile',
  clothing: 'hoodie',
  clothingColor: '#5e6cd8',
};

// Default female config
export const DEFAULT_FEMALE_CONFIG: Avatar2DConfig = {
  gender: 'female',
  skinTone: '#f5d7c3',
  hairStyle: 'longHairStraight',
  hairColor: '#2c1810',
  eyeType: 'default',
  eyebrowType: 'defaultNatural',
  mouthType: 'smile',
  clothing: 'shirtScoopNeck',
  clothingColor: '#d81b60',
};

// Type guard for StoredAvatar2D
export function isStoredAvatar2D(avatar: unknown): avatar is StoredAvatar2D {
  return (
    typeof avatar === 'object' &&
    avatar !== null &&
    'type' in avatar &&
    (avatar as StoredAvatar2D).type === '2d' &&
    'config' in avatar
  );
}

// Type guard for Avatar2DConfig
export function isAvatar2DConfig(config: unknown): config is Avatar2DConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'gender' in config &&
    'skinTone' in config &&
    'hairStyle' in config
  );
}
