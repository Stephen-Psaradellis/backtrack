/**
 * Avatar System - Component Exports
 *
 * 3D preset-based avatar system using complete GLB models.
 * For avatar display, use AvatarSnapshot from 'components/avatar3d'.
 */

// =============================================================================
// Types
// =============================================================================

export type {
  AvatarConfig,
  StoredAvatar,
  AvatarPreset,
  AvatarEthnicity,
  AvatarGender,
  AvatarOutfit,
  AvatarSize,
  AvatarView,
} from './types';

// =============================================================================
// Constants
// =============================================================================

export {
  DEFAULT_AVATAR_ID,
  AVATAR_CONFIG_VERSION,
  AVATAR_SIZES,
  MATCHING_WEIGHTS,
} from './types';

// =============================================================================
// Avatar Creator
// =============================================================================

export { AvatarCreator, type AvatarCreatorProps } from './AvatarCreator';
export { AvatarBrowser } from './AvatarCreator/AvatarBrowser';
export { PreviewPanel3D } from './AvatarCreator/PreviewPanel3D';
