/**
 * Avatar Service
 *
 * Service for saving and loading Ready Player Me avatars to/from the database.
 */

import { createClient } from './supabase/client'
import type { StoredAvatar } from '../components/ReadyPlayerMe'
import type { Profile, ProfileUpdate } from '../types/database'

// ============================================================================
// Types
// ============================================================================

export interface AvatarSaveResult {
  success: boolean
  error?: string
}

export interface AvatarLoadResult {
  avatar: StoredAvatar | null
  error?: string
}

// ============================================================================
// Save Avatar
// ============================================================================

/**
 * Save a Ready Player Me avatar to the user's profile
 */
export async function saveUserAvatar(
  userId: string,
  avatar: StoredAvatar
): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient()
    const update: ProfileUpdate = {
      rpm_avatar: avatar,
      rpm_avatar_id: avatar.avatarId,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)

    if (error) {
      console.error('[avatarService] Failed to save avatar:', error)
      return { success: false, error: error.message }
    }

    console.log('[avatarService] Avatar saved successfully:', avatar.avatarId)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[avatarService] Error saving avatar:', message)
    return { success: false, error: message }
  }
}

/**
 * Save the current user's avatar (using auth session)
 */
export async function saveCurrentUserAvatar(
  avatar: StoredAvatar
): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    return saveUserAvatar(user.id, avatar)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// ============================================================================
// Load Avatar
// ============================================================================

/**
 * Load a user's Ready Player Me avatar from their profile
 */
export async function loadUserAvatar(
  userId: string
): Promise<AvatarLoadResult> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('rpm_avatar, rpm_avatar_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[avatarService] Failed to load avatar:', error)
      return { avatar: null, error: error.message }
    }

    return { avatar: data?.rpm_avatar as StoredAvatar | null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[avatarService] Error loading avatar:', message)
    return { avatar: null, error: message }
  }
}

/**
 * Load the current user's avatar (using auth session)
 */
export async function loadCurrentUserAvatar(): Promise<AvatarLoadResult> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { avatar: null, error: 'Not authenticated' }
    }

    return loadUserAvatar(user.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { avatar: null, error: message }
  }
}

// ============================================================================
// Delete Avatar
// ============================================================================

/**
 * Remove the avatar from a user's profile
 */
export async function deleteUserAvatar(
  userId: string
): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient()
    const update: ProfileUpdate = {
      rpm_avatar: null,
      rpm_avatar_id: null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId)

    if (error) {
      console.error('[avatarService] Failed to delete avatar:', error)
      return { success: false, error: error.message }
    }

    console.log('[avatarService] Avatar deleted successfully')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[avatarService] Error deleting avatar:', message)
    return { success: false, error: message }
  }
}

/**
 * Delete the current user's avatar (using auth session)
 */
export async function deleteCurrentUserAvatar(): Promise<AvatarSaveResult> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    return deleteUserAvatar(user.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// ============================================================================
// Check Avatar Exists
// ============================================================================

/**
 * Check if a user has an RPM avatar configured
 */
export async function hasUserAvatar(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('rpm_avatar_id')
      .eq('id', userId)
      .single()

    if (error) {
      return false
    }

    return !!data?.rpm_avatar_id
  } catch {
    return false
  }
}

/**
 * Check if the current user has an RPM avatar configured
 */
export async function hasCurrentUserAvatar(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    return hasUserAvatar(user.id)
  } catch {
    return false
  }
}
