/**
 * Verified Social Platforms (Feature 5.6)
 *
 * Single source of truth for the supported set of platforms, their display
 * metadata, and deep-link templates used to open the native app from a
 * shared handle in chat.
 */

import type { ComponentProps } from 'react'
import type { Ionicons } from '@expo/vector-icons'

export type SocialPlatform = 'instagram' | 'twitter' | 'tiktok'

export interface SocialPlatformMeta {
    id: SocialPlatform
    label: string
    /** Lowercase singular noun for prose ("your instagram"). */
    noun: string
    /** Ionicons glyph used to brand the platform pill / button. */
    icon: ComponentProps<typeof Ionicons>['name']
    /** Brand color (used for connected-state accents only). */
    color: string
    /** Builds a URL/scheme that opens the native app or web page for a handle. */
    profileUrl: (handle: string) => string
    /** Builds the iOS/Android native app deep-link for a handle, if one exists. */
    appLink: (handle: string) => string | null
}

export const SOCIAL_PLATFORMS: Record<SocialPlatform, SocialPlatformMeta> = {
    instagram: {
        id: 'instagram',
        label: 'Instagram',
        noun: 'instagram',
        icon: 'logo-instagram',
        color: '#E1306C',
        profileUrl: (handle) => `https://instagram.com/${encodeURIComponent(handle)}`,
        appLink: (handle) => `instagram://user?username=${encodeURIComponent(handle)}`,
    },
    twitter: {
        id: 'twitter',
        label: 'X / Twitter',
        noun: 'X',
        icon: 'logo-twitter',
        color: '#1DA1F2',
        profileUrl: (handle) => `https://x.com/${encodeURIComponent(handle)}`,
        appLink: (handle) => `twitter://user?screen_name=${encodeURIComponent(handle)}`,
    },
    tiktok: {
        id: 'tiktok',
        label: 'TikTok',
        noun: 'TikTok',
        icon: 'logo-tiktok',
        color: '#000000',
        profileUrl: (handle) => `https://tiktok.com/@${encodeURIComponent(handle)}`,
        appLink: (handle) => `snssdk1233://user/profile/${encodeURIComponent(handle)}`,
    },
}

export const SUPPORTED_PLATFORMS: SocialPlatform[] = ['instagram', 'twitter', 'tiktok']
