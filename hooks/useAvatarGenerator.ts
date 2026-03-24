/**
 * useAvatarGenerator Hook
 *
 * Manages the AI avatar generation flow:
 * - Trait selection state
 * - Prompt construction
 * - Recraft API generation
 * - Supabase Storage upload
 * - AsyncStorage caching
 * - Profile update
 */

import { useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  generateAvatar,
  fetchSvgContent,
  buildAvatarPrompt,
  type AvatarTraits,
} from '../lib/recraftApi'
import { supabase } from '../lib/supabase'
import type { GeneratedAvatar, StoredAvatar } from '../types/avatar'
import { createStoredAvatar } from '../types/avatar'

// ============================================================================
// CONSTANTS
// ============================================================================

const AVATAR_CACHE_KEY = '@avatar/current_svg'
const AVATAR_DATA_KEY = '@avatar/current_data'

// ============================================================================
// TYPES
// ============================================================================

export interface UseAvatarGeneratorResult {
  /** Whether avatar is currently being generated */
  isGenerating: boolean
  /** Whether avatar is currently being saved */
  isSaving: boolean
  /** Error message if generation or save failed */
  error: string | null
  /** The most recently generated avatar data */
  generatedAvatar: GeneratedAvatar | null
  /** All generated avatar options (from last generation) */
  generatedAvatars: GeneratedAvatar[]
  /** Generate avatars from traits (returns array of 2) */
  generate: (traits: AvatarTraits, style?: string) => Promise<GeneratedAvatar[]>
  /** Save the generated avatar to Supabase Storage + profile */
  save: (avatar: GeneratedAvatar, userId: string) => Promise<StoredAvatar | null>
  /** Clear error state */
  clearError: () => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useAvatarGenerator(): UseAvatarGeneratorResult {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAvatar, setGeneratedAvatar] = useState<GeneratedAvatar | null>(null)
  const [generatedAvatars, setGeneratedAvatars] = useState<GeneratedAvatar[]>([])

  const clearError = useCallback(() => setError(null), [])

  /**
   * Generate avatars from trait selections (returns array of 2)
   */
  const generate = useCallback(
    async (traits: AvatarTraits, style?: string): Promise<GeneratedAvatar[]> => {
      setIsGenerating(true)
      setError(null)

      try {
        const prompt = buildAvatarPrompt(traits)
        const { svgUrls } = await generateAvatar({
          prompt,
          style: style ?? 'digital_illustration',
        })

        // Return avatars immediately with URLs only — SVG content
        // is fetched lazily during save to avoid blocking the UI.
        const now = Date.now()
        const avatars: GeneratedAvatar[] = svgUrls.map((url) => ({
          url,
          svg: '',
          prompt,
          style: style ?? 'digital_illustration',
          createdAt: now,
          updatedAt: now,
        }))

        setGeneratedAvatars(avatars)
        setGeneratedAvatar(avatars[0] ?? null)
        return avatars
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Avatar generation failed'
        setError(message)
        if (__DEV__) console.error('[AvatarGenerator] Generation failed:', err)
        return []
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  /**
   * Save generated avatar:
   * 1. Upload SVG to Supabase Storage avatars/ bucket
   * 2. Cache SVG locally in AsyncStorage
   * 3. Return StoredAvatar for profile update
   */
  const save = useCallback(
    async (avatar: GeneratedAvatar, userId: string): Promise<StoredAvatar | null> => {
      setIsSaving(true)
      setError(null)

      try {
        let publicUrl = avatar.url

        // Lazy-fetch SVG content if not already loaded
        let svgContent = avatar.svg
        if (!svgContent) {
          try {
            svgContent = await fetchSvgContent(avatar.url)
          } catch {
            if (__DEV__) console.warn('[AvatarGenerator] Could not fetch SVG content for save')
          }
        }

        // Upload to Supabase Storage if we have SVG content
        if (svgContent) {
          const fileName = `${userId}/${Date.now()}.svg`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, svgContent, {
              contentType: 'image/svg+xml',
              upsert: true,
            })

          if (uploadError) {
            if (__DEV__) console.warn('[AvatarGenerator] Storage upload failed, using Recraft URL:', uploadError)
          } else if (uploadData) {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(uploadData.path)
            publicUrl = urlData.publicUrl
          }
        }

        // Update avatar with storage URL
        const savedAvatar: GeneratedAvatar = {
          ...avatar,
          url: publicUrl,
          updatedAt: Date.now(),
        }

        // Cache locally
        await AsyncStorage.setItem(AVATAR_CACHE_KEY, svgContent || '')
        await AsyncStorage.setItem(AVATAR_DATA_KEY, JSON.stringify(savedAvatar))

        const storedAvatar = createStoredAvatar(savedAvatar)
        setGeneratedAvatar(savedAvatar)
        return storedAvatar
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save avatar'
        setError(message)
        if (__DEV__) console.error('[AvatarGenerator] Save failed:', err)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  return {
    isGenerating,
    isSaving,
    error,
    generatedAvatar,
    generatedAvatars,
    generate,
    save,
    clearError,
  }
}

// ============================================================================
// UTILITY: Load cached avatar
// ============================================================================

/**
 * Load the cached avatar data from AsyncStorage
 */
export async function loadCachedAvatar(): Promise<GeneratedAvatar | null> {
  try {
    const dataStr = await AsyncStorage.getItem(AVATAR_DATA_KEY)
    if (!dataStr) return null
    return JSON.parse(dataStr) as GeneratedAvatar
  } catch {
    return null
  }
}

/**
 * Load the cached SVG string from AsyncStorage
 */
export async function loadCachedAvatarSvg(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AVATAR_CACHE_KEY)
  } catch {
    return null
  }
}
