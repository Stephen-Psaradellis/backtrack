/**
 * Avatar System - Type Definitions
 *
 * Preset-based avatar system using complete GLB 3D models.
 * Users select from 370+ pre-made, diverse avatar presets from the VALID project CDN.
 *
 * Categories use neutral descriptors (not ethnicity labels).
 */

// =============================================================================
// AVATAR PRESET SYSTEM (Complete GLB Models)
// =============================================================================

/**
 * Appearance style categories for avatar presets.
 * These are neutral descriptors that don't reference specific ethnic groups.
 */
export type AvatarStyle =
  | 'Style A'    // Diverse appearance group 1
  | 'Style B'    // Diverse appearance group 2
  | 'Style C'    // Diverse appearance group 3
  | 'Style D'    // Diverse appearance group 4
  | 'Style E'    // Diverse appearance group 5
  | 'Style F'    // Diverse appearance group 6
  | 'Style G';   // Diverse appearance group 7

/**
 * @deprecated Use AvatarStyle instead. Kept for backward compatibility with stored data.
 */
export type AvatarEthnicity =
  | 'AIAN'
  | 'Asian'
  | 'Black'
  | 'Hispanic'
  | 'MENA'
  | 'NHPI'
  | 'White';

/**
 * Gender options for avatar presets.
 */
export type AvatarGender = 'M' | 'F';

/**
 * Outfit/clothing style categories.
 */
export type AvatarOutfit =
  | 'Casual'
  | 'Business'
  | 'Medical'
  | 'Military'
  | 'Utility';

/**
 * Avatar preset definition - complete pre-made avatar model.
 * These are professionally-made, diverse avatar GLBs.
 */
export interface AvatarPreset {
  /** Unique identifier for the preset */
  id: string;
  /** Display name */
  name: string;
  /** File path or URL to the GLB model */
  file: string;
  /** Style category for filtering (neutral descriptor) */
  style: AvatarStyle;
  /** @deprecated Use style instead. Kept for backward compatibility. */
  ethnicity?: AvatarEthnicity;
  /** Gender for matching/filtering */
  gender: AvatarGender;
  /** Outfit style */
  outfit: AvatarOutfit;
  /** Whether this is a local asset (bundled) or CDN */
  isLocal: boolean;
  /** Size in KB for loading indicators */
  sizeKB?: number;
  /** Thumbnail URL for selection UI (CDN images) */
  thumbnailUrl?: string;
  /** License information */
  license?: string;
  /** Source attribution */
  source?: string;
  /** Descriptive tags */
  tags?: string[];
  /** Character variant number within the style */
  variant?: number;
}

/**
 * Avatar configuration - simplified preset selection.
 * Users select a complete avatar preset instead of building part-by-part.
 */
export interface AvatarConfig {
  /** Selected avatar preset ID */
  avatarId: string;
  /** Cached style from preset (for filtering) */
  style?: AvatarStyle;
  /** @deprecated Use style instead. Kept for backward compatibility. */
  ethnicity?: AvatarEthnicity;
  /** Cached gender from preset (for matching) */
  gender?: AvatarGender;
  /** Cached outfit from preset (for reference) */
  outfit?: AvatarOutfit;
}

/**
 * Stored avatar for database persistence.
 */
export interface StoredAvatar {
  /** Unique identifier (UUID) */
  id: string;
  /** Avatar configuration */
  config: AvatarConfig;
  /** Configuration version for migrations */
  version: number;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last modified timestamp (ISO 8601) */
  updatedAt: string;
  /** Cached snapshot URL if generated */
  snapshotUrl?: string;
}

/**
 * Default avatar ID (fallback when no avatar is selected)
 */
export const DEFAULT_AVATAR_ID = 'avatar_asian_m';

/**
 * Schema version for the avatar system
 */
export const AVATAR_CONFIG_VERSION = 2;

// =============================================================================
// AVATAR DISPLAY PROPS
// =============================================================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const AVATAR_SIZES: Record<AvatarSize, number> = {
  xs: 32,
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
};

export type AvatarView = 'portrait' | 'fullBody';

// =============================================================================
// MATCHING CONFIGURATION
// =============================================================================

/**
 * Weights for preset-based matching.
 * Style matching uses visual similarity, not ethnicity-based categorization.
 */
export const MATCHING_WEIGHTS = {
  /** Visual style similarity */
  style: 0.40,
  /** Gender matching */
  gender: 0.30,
  /** Outfit/clothing matching */
  outfit: 0.30,
  /** @deprecated Use style instead */
  ethnicity: 0.40,
} as const;

// =============================================================================
// ETHNICITY TO STYLE MAPPING (for backward compatibility)
// =============================================================================

/**
 * Maps legacy ethnicity values to new neutral style categories.
 * This allows existing stored data to work with the new system.
 */
export const ETHNICITY_TO_STYLE: Record<AvatarEthnicity, AvatarStyle> = {
  'AIAN': 'Style A',
  'Asian': 'Style B',
  'Black': 'Style C',
  'Hispanic': 'Style D',
  'MENA': 'Style E',
  'NHPI': 'Style F',
  'White': 'Style G',
};

/**
 * Maps style categories back to legacy ethnicity values (for CDN compatibility).
 */
export const STYLE_TO_ETHNICITY: Record<AvatarStyle, AvatarEthnicity> = {
  'Style A': 'AIAN',
  'Style B': 'Asian',
  'Style C': 'Black',
  'Style D': 'Hispanic',
  'Style E': 'MENA',
  'Style F': 'NHPI',
  'Style G': 'White',
};
