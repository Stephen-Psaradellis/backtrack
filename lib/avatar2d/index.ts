/**
 * 2D Avatar Library
 *
 * Re-exports all avatar utilities for convenient imports:
 * import { calculateMatchScore, createStoredAvatar } from '@/lib/avatar2d';
 */

// Matching utilities
export {
  categorizeSkinTone,
  extractMatchCriteria,
  compareAvatars,
  calculateMatchScore,
  getMatchDescription,
  getMatchLevel,
  getMatchColor,
} from './matching';

// Storage utilities
export {
  generateAvatarId,
  createStoredAvatar,
  saveCurrentUserAvatar,
  loadCurrentUserAvatar,
  clearLocalAvatarCache,
  updateAvatarConfig,
  createDefaultAvatar,
  serializeAvatarForDb,
  deserializeAvatarFromDb,
  migrateOldAvatar,
  needsAvatarCreation,
  cacheAvatarRender,
} from './storage';

// SVG Path Data
export {
  // Face shapes
  FACE_SHAPES,
  FACE_SHAPE_OUTLINES,
  // Eye styles
  EYE_STYLES,
  SIMPLE_EYE_PATHS,
  // Hair styles
  HAIR_STYLES,
  HAIR_BACK_LAYERS,
  // Nose styles
  NOSE_STYLES,
  NOSE_SHADOWS,
  // Mouth styles
  MOUTH_STYLES,
  SIMPLE_MOUTH_PATHS,
  // Eyebrow styles
  EYEBROW_STYLES,
  EYEBROW_EXPRESSIONS,
  // Structural elements
  EAR_PATHS,
  NECK_PATH,
  CLOTHING_PATHS,
  ACCESSORY_PATHS,
  FACIAL_HAIR_PATHS,
  // Types and utilities
  AVAILABLE_OPTIONS,
  DEFAULT_PATH_CONFIG,
  PRESET_CONFIGS,
  getAvatarPaths,
  getRandomConfig,
} from './assets/paths';

// Types from paths
export type {
  FaceShape,
  EyeStyle,
  HairStyle,
  NoseStyle,
  MouthStyle,
  EyebrowStyle,
  AvatarPathConfig,
} from './assets/paths';
