/**
 * Ready Player Me Components
 *
 * Integration with Ready Player Me for realistic, customizable avatars.
 */

// Main components
export { ReadyPlayerMeCreator } from './ReadyPlayerMeCreator'
export {
  RPMAvatarPreview,
  XSAvatarPreview,
  SmallAvatarPreview,
  MediumAvatarPreview,
  LargeAvatarPreview,
  XLAvatarPreview,
  FullBodyAvatarPreview,
  AVATAR_SIZES,
} from './RPMAvatarPreview'

// Utility functions
export {
  getRenderUrl,
  getPortraitUrl,
  getFullBodyUrl,
  getModelUrl,
  extractAvatarId,
  isValidAvatarId,
  toStoredAvatar,
  createStoredAvatar,
  getPresetRenderUrl,
  RENDER_PRESETS,
} from './utils'

// Types
export type {
  RPMGender,
  RPMBodyType,
  RPMAvatarMetadata,
  RPMAvatarData,
  StoredAvatar,
  RPMEventName,
  RPMEvent,
  RPMAvatarExportedEvent,
  RPMCreatorConfig,
  ReadyPlayerMeCreatorProps,
  RPMAvatarPreviewProps,
  RPMCameraType,
  RPMExpression,
  RPMRenderOptions,
} from './types'
export type { AvatarSizePreset } from './RPMAvatarPreview'
