/**
 * Avatar Types
 *
 * Defines the GeneratedAvatar type for AI-generated avatars (Recraft)
 * and provides backward-compatible StoredAvatar for database compatibility.
 */

// ============================================================================
// NEW AI-GENERATED AVATAR TYPES
// ============================================================================

/**
 * AI-generated avatar data shape
 * Used for Recraft-generated SVG avatars
 */
export interface GeneratedAvatar {
  /** Supabase Storage public URL */
  url: string
  /** Raw SVG string for offline/local rendering */
  svg: string
  /** The constructed prompt (for regeneration) */
  prompt: string
  /** Recraft style used */
  style: string
  /** Creation timestamp */
  createdAt: number
  /** Last update timestamp */
  updatedAt: number
}

/**
 * Avatar size presets
 */
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Size map for avatar dimensions in pixels
 */
export const AVATAR_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 36,
  md: 64,
  lg: 96,
  xl: 160,
}

// ============================================================================
// BACKWARD-COMPATIBLE TYPES
// ============================================================================

/**
 * StoredAvatar - backward-compatible type that works with both
 * old bitmoji configs and new AI-generated avatars.
 *
 * Old shape: { id, config: AvatarConfig, createdAt, updatedAt }
 * New shape: { id, generatedAvatar: GeneratedAvatar, createdAt, updatedAt }
 */
export interface StoredAvatar {
  id?: string
  /** Legacy bitmoji config (deprecated, kept for backward compat) */
  config?: Record<string, unknown>
  /** New AI-generated avatar data */
  generatedAvatar?: GeneratedAvatar
  createdAt?: number
  updatedAt?: number
}

/**
 * Legacy AvatarConfig type for backward compat
 */
export type AvatarConfig = Record<string, unknown>

/**
 * Default empty configs (no longer used for generation, kept for type compat)
 */
export const DEFAULT_MALE_CONFIG: AvatarConfig = {}
export const DEFAULT_FEMALE_CONFIG: AvatarConfig = {}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if a StoredAvatar has an AI-generated avatar
 */
export function hasGeneratedAvatar(avatar: StoredAvatar | null | undefined): boolean {
  return !!avatar?.generatedAvatar?.svg || !!avatar?.generatedAvatar?.url
}

/**
 * Get the SVG string from a StoredAvatar (if available)
 */
export function getAvatarSvg(avatar: StoredAvatar | null | undefined): string | null {
  return avatar?.generatedAvatar?.svg ?? null
}

/**
 * Get the URL from a StoredAvatar (if available)
 */
export function getAvatarUrl(avatar: StoredAvatar | null | undefined): string | null {
  return avatar?.generatedAvatar?.url ?? null
}

/**
 * Create a StoredAvatar from a GeneratedAvatar
 */
export function createStoredAvatar(generated: GeneratedAvatar): StoredAvatar {
  return {
    id: `avatar-${Date.now()}`,
    generatedAvatar: generated,
    createdAt: generated.createdAt,
    updatedAt: generated.updatedAt,
  }
}
