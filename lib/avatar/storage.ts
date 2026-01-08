/**
 * Custom Avatar System - Storage Service
 *
 * Supabase CRUD operations for custom avatars.
 * Replaces lib/avatarService.ts for the new avatar system.
 */

import { createClient } from '../supabase/client';
import type { StoredAvatar, AvatarConfig } from '../../components/avatar/types';
import { createStoredAvatar, normalizeStoredAvatar } from './defaults';

// =============================================================================
// Types
// =============================================================================

export interface AvatarSaveResult {
  success: boolean;
  avatar?: StoredAvatar;
  error?: string;
}

export interface AvatarLoadResult {
  avatar: StoredAvatar | null;
  error?: string;
}

// =============================================================================
// Profile Avatar Operations (User's Own Avatar)
// =============================================================================

/**
 * Save a custom avatar to a user's profile
 */
export async function saveUserAvatar(
  userId: string,
  avatar: StoredAvatar
): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient();

    // Update the avatar's updatedAt timestamp
    const updatedAvatar: StoredAvatar = {
      ...avatar,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .update({
        avatar: updatedAvatar,
        avatar_version: avatar.version,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id')
      .single();

    if (error) {
      console.error('[avatar/storage] Failed to save avatar:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      console.error('[avatar/storage] No rows updated - profile not found for userId:', userId);
      return { success: false, error: 'Profile not found' };
    }

    console.log('[avatar/storage] Avatar saved successfully for profile:', data.id);
    return { success: true, avatar: updatedAvatar };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[avatar/storage] Error saving avatar:', message);
    return { success: false, error: message };
  }
}

/**
 * Save avatar for the current authenticated user
 */
export async function saveCurrentUserAvatar(
  avatar: StoredAvatar
): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    return saveUserAvatar(user.id, avatar);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Save avatar config (creates a StoredAvatar automatically)
 */
export async function saveCurrentUserAvatarConfig(
  config: AvatarConfig
): Promise<AvatarSaveResult> {
  const avatar = createStoredAvatar(config.avatarId);
  return saveCurrentUserAvatar(avatar);
}

/**
 * Load a user's custom avatar from their profile
 */
export async function loadUserAvatar(
  userId: string
): Promise<AvatarLoadResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar, avatar_version')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[avatar/storage] Failed to load avatar:', error);
      return { avatar: null, error: error.message };
    }

    if (!data?.avatar) {
      return { avatar: null };
    }

    // Normalize the avatar to ensure all fields are present
    const avatar = normalizeStoredAvatar(data.avatar as Partial<StoredAvatar>);
    return { avatar };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[avatar/storage] Error loading avatar:', message);
    return { avatar: null, error: message };
  }
}

/**
 * Load avatar for the current authenticated user
 */
export async function loadCurrentUserAvatar(): Promise<AvatarLoadResult> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { avatar: null, error: 'Not authenticated' };
    }

    return loadUserAvatar(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { avatar: null, error: message };
  }
}

/**
 * Delete a user's avatar
 */
export async function deleteUserAvatar(
  userId: string
): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar: null,
        avatar_version: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[avatar/storage] Failed to delete avatar:', error);
      return { success: false, error: error.message };
    }

    console.log('[avatar/storage] Avatar deleted successfully');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[avatar/storage] Error deleting avatar:', message);
    return { success: false, error: message };
  }
}

/**
 * Delete avatar for the current authenticated user
 */
export async function deleteCurrentUserAvatar(): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    return deleteUserAvatar(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Check if a user has a custom avatar configured
 */
export async function hasUserAvatar(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar')
      .eq('id', userId)
      .single();

    if (error) {
      return false;
    }

    return !!data?.avatar;
  } catch {
    return false;
  }
}

/**
 * Check if the current user has a custom avatar configured
 */
export async function hasCurrentUserAvatar(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    return hasUserAvatar(user.id);
  } catch {
    return false;
  }
}

// =============================================================================
// Target Avatar Operations (For Posts)
// =============================================================================

/**
 * Update the target avatar for a post
 */
export async function updatePostTargetAvatar(
  postId: string,
  avatar: StoredAvatar
): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('posts')
      .update({
        target_avatar_v2: avatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      console.error('[avatar/storage] Failed to update post avatar:', error);
      return { success: false, error: error.message };
    }

    return { success: true, avatar };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Load a post's target avatar
 */
export async function loadPostTargetAvatar(
  postId: string
): Promise<AvatarLoadResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('target_avatar_v2')
      .eq('id', postId)
      .single();

    if (error) {
      console.error('[avatar/storage] Failed to load post avatar:', error);
      return { avatar: null, error: error.message };
    }

    if (!data?.target_avatar_v2) {
      return { avatar: null };
    }

    const avatar = normalizeStoredAvatar(
      data.target_avatar_v2 as Partial<StoredAvatar>
    );
    return { avatar };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { avatar: null, error: message };
  }
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Load avatars for multiple users
 */
export async function loadMultipleUserAvatars(
  userIds: string[]
): Promise<Map<string, StoredAvatar | null>> {
  const result = new Map<string, StoredAvatar | null>();

  if (userIds.length === 0) {
    return result;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, avatar')
      .in('id', userIds);

    if (error) {
      console.error('[avatar/storage] Failed to load avatars:', error);
      userIds.forEach((id) => result.set(id, null));
      return result;
    }

    // Build map from results
    const dataMap = new Map(
      data?.map((row) => [row.id, row.avatar]) || []
    );

    // Fill in results, normalizing avatars
    for (const userId of userIds) {
      const rawAvatar = dataMap.get(userId);
      if (rawAvatar) {
        result.set(
          userId,
          normalizeStoredAvatar(rawAvatar as Partial<StoredAvatar>)
        );
      } else {
        result.set(userId, null);
      }
    }

    return result;
  } catch (err) {
    console.error('[avatar/storage] Error loading avatars:', err);
    userIds.forEach((id) => result.set(id, null));
    return result;
  }
}

// =============================================================================
// Index Exports
// =============================================================================

export const avatarStorage = {
  // Profile operations
  save: saveCurrentUserAvatar,
  saveConfig: saveCurrentUserAvatarConfig,
  load: loadCurrentUserAvatar,
  delete: deleteCurrentUserAvatar,
  exists: hasCurrentUserAvatar,

  // User-specific operations
  saveForUser: saveUserAvatar,
  loadForUser: loadUserAvatar,
  deleteForUser: deleteUserAvatar,
  existsForUser: hasUserAvatar,

  // Post operations
  updatePostAvatar: updatePostTargetAvatar,
  loadPostAvatar: loadPostTargetAvatar,

  // Batch operations
  loadMultiple: loadMultipleUserAvatars,
};

export default avatarStorage;
