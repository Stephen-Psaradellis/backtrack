/**
 * Avatar Types - Re-exports
 *
 * This file provides re-exports from the main avatar types module.
 * The avatar system is in components/avatar/types.
 */

// Re-export types for backward compatibility
export type { AvatarConfig, StoredAvatar } from '../components/avatar/types';

// Re-export the default config from lib/avatar/defaults
export { DEFAULT_AVATAR_CONFIG } from '../lib/avatar/defaults';
