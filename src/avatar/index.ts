/**
 * Avatar Module - Barrel Export
 *
 * Complete SVG-based avatar system for React Native.
 *
 * Usage:
 * ```tsx
 * import { Avatar, AvatarConfig, HairStyle, EyeStyle } from '@/src/avatar';
 *
 * const config: AvatarConfig = {
 *   gender: 'female',
 *   faceShape: FaceShape.OVAL,
 *   skinTone: '#f5d7c3',
 *   hairStyle: HairStyle.LONG_WAVY,
 *   hairColor: '#2c1810',
 *   eyeStyle: EyeStyle.DEFAULT,
 *   eyeColor: '#634e34',
 *   eyebrowStyle: EyebrowStyle.NATURAL,
 *   noseStyle: NoseStyle.DEFAULT,
 *   mouthStyle: MouthStyle.SMILE,
 * };
 *
 * <Avatar config={config} size="lg" />
 * ```
 */

// Main component
export { Avatar, default as AvatarDefault } from './Avatar';

// Part components (for custom compositions)
export {
  Face,
  Eyes,
  Hair,
  HairBehind,
  Nose,
  Mouth,
  Eyebrows,
} from './parts';

// Types
export type {
  AvatarConfig,
  StoredAvatar,
  AvatarSize,
  SkinTone,
  HairColor,
  EyeColor,
  ColorOption,
  SvgPartProps,
  FacePartPosition,
  ViewBoxConfig,
} from './types';

// Enums
export {
  HairStyle,
  EyeStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  FaceShape,
  FacialHairStyle,
  AccessoryStyle,
  ClothingStyle,
} from './types';

// Constants
export {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CLOTHING_COLORS,
  AVATAR_SIZE_MAP,
  DEFAULT_VIEWBOX,
} from './types';

// Default configs
export {
  DEFAULT_MALE_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  DEFAULT_NEUTRAL_CONFIG,
} from './types';

// Type guards
export {
  isAvatarConfig,
  isStoredAvatar,
} from './types';

// Editor components
export * from './editor';

// Hooks
export * from './hooks';
