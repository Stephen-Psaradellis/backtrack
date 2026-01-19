/**
 * 2D Avatar Components
 *
 * Re-exports all avatar components and types for convenient imports:
 * import { Avatar2DDisplay, Avatar2DCreator } from '@/components/avatar2d';
 */

// Components
export { Avatar2DDisplay, default as Avatar2DDisplayDefault } from './Avatar2DDisplay';
export { Avatar2DCreator, default as Avatar2DCreatorDefault } from './Avatar2DCreator';

// Types and constants
export {
  // Types
  type Avatar2DConfig,
  type StoredAvatar2D,
  type AvatarMatchCriteria,
  type Avatar2DSize,
  // Constants
  AVATAR_SIZES,
  HAIR_STYLES,
  EYE_TYPES,
  EYEBROW_TYPES,
  MOUTH_TYPES,
  FACIAL_HAIR_TYPES,
  ACCESSORIES_TYPES,
  CLOTHING_TYPES,
  SKIN_TONE_PRESETS,
  HAIR_COLOR_PRESETS,
  CLOTHING_COLOR_PRESETS,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  // Type guards
  isStoredAvatar2D,
  isAvatar2DConfig,
} from './types';
