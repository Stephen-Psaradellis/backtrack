/**
 * Avatar System - Library Exports
 *
 * Core avatar functionality: defaults, storage, matching, snapshots, and preloading.
 */

// Defaults and creation utilities
export {
  // Avatar preset system
  AVATAR_CDN,
  LOCAL_AVATAR_PRESETS,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_AVATAR_ID,
  AVATAR_CONFIG_VERSION,
  getAvatarPreset,
  getAvatarUrl,
  filterAvatarPresets,
  getAvailableEthnicities,
  getAvailableOutfits,
  createAvatarConfig,
  createStoredAvatar,
  createDefaultStoredAvatar,
  getRandomAvatarId,
  createRandomStoredAvatar,
  normalizeAvatarConfig,
  normalizeStoredAvatar,
} from './defaults';

// Avatar matching
export {
  // Types
  type MatchQuality,
  type MatchResult,
  type MatchingConfig,
  type PostWithAvatar,
  // Constants
  DEFAULT_MATCHING_CONFIG,
  QUALITY_THRESHOLDS,
  OUTFIT_SIMILARITY,
  // Functions
  compareAvatars,
  quickMatch,
  filterMatchingPosts,
  getPostsWithMatchScores,
  getMatchDescription,
  explainMatch,
  getMatchQualityColor,
  getMatchScoreColor,
} from './matching';

// Avatar preloading
export {
  // Types
  type AvatarLoadingStatus,
  type AvatarLoadingState,
  type PreloadOptions,
  type BatchPreloadResult,
  type CacheStats,
  // Hooks
  useAvatarLoadingState,
  usePreloadingStatus,
  usePreloadAvatar,
  // Main loader object
  avatarLoader,
} from './avatarLoader';

// Storage operations
export {
  // Types
  type AvatarSaveResult,
  type AvatarLoadResult,

  // Profile avatar operations
  saveUserAvatar,
  saveCurrentUserAvatar,
  saveCurrentUserAvatarConfig,
  loadUserAvatar,
  loadCurrentUserAvatar,
  deleteUserAvatar,
  deleteCurrentUserAvatar,
  hasUserAvatar,
  hasCurrentUserAvatar,

  // Post avatar operations
  updatePostTargetAvatar,
  loadPostTargetAvatar,

  // Batch operations
  loadMultipleUserAvatars,

  // Convenience object
  avatarStorage,
} from './storage';

// Snapshot service (3D avatar snapshots)
export {
  // Types
  type SnapshotOptions,
  type SnapshotResult,
  type UploadResult,
  type SnapshotExistsResult,
  type SnapshotGenerator,
  type SnapshotSizePreset,

  // Constants
  AVATAR_SNAPSHOTS_BUCKET,
  DEFAULT_SNAPSHOT_FORMAT,
  DEFAULT_SNAPSHOT_SIZE,
  SNAPSHOT_SIZES,

  // Hash functions
  hashConfig,
  hashConfigWithOptions,

  // Path helpers
  getSnapshotPath,
  getSnapshotUrl,

  // Storage operations
  checkSnapshotExists,
  uploadSnapshot,
  deleteSnapshot,

  // Main API
  getOrCreateSnapshot,
  getCachedSnapshotUrl,
  uploadPreGeneratedSnapshot,

  // Memory cache
  getMemoryCachedUrl,
  setMemoryCachedUrl,
  clearMemoryCache,
  getCachedSnapshotUrlWithMemory,

  // Convenience object
  snapshotService,
} from './snapshotService';
