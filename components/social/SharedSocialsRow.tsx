/**
 * SharedSocialsRow (Feature 5.6)
 *
 * Displays the OTHER party's verified, shared handles in a chat header.
 * Each pill is tappable: opens the platform's native app via deep link,
 * falling back to the web profile URL when the app isn't installed.
 *
 * Renders nothing if the other party hasn't shared any platform — keeps
 * the chat header layout-stable.
 */

import React, { memo, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { darkTheme } from '../../constants/glassStyles'
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../../lib/socialPlatforms'

export interface SharedSocialsRowProps {
    socials: { platform: SocialPlatform; handle: string }[]
    /** Optional caption shown above the row, e.g. "They shared their socials". */
    caption?: string
    testID?: string
}

export const SharedSocialsRow = memo(function SharedSocialsRow({
    socials,
    caption,
    testID = 'shared-socials-row',
}: SharedSocialsRowProps) {
    const handleOpen = useCallback(async (platform: SocialPlatform, handle: string) => {
        const meta = SOCIAL_PLATFORMS[platform]
        const appLink = meta.appLink(handle)
        if (appLink) {
            const canOpen = await Linking.canOpenURL(appLink).catch(() => false)
            if (canOpen) {
                await Linking.openURL(appLink)
                return
            }
        }
        const webLink = meta.profileUrl(handle)
        try {
            await Linking.openURL(webLink)
        } catch {
            Alert.alert('Could not open', `Failed to open ${meta.label}.`)
        }
    }, [])

    if (!socials || socials.length === 0) return null

    return (
        <View style={styles.container} testID={testID}>
            {caption && <Text style={styles.caption}>{caption}</Text>}
            <View style={styles.row}>
                {socials.map(s => {
                    const meta = SOCIAL_PLATFORMS[s.platform]
                    return (
                        <TouchableOpacity
                            key={s.platform}
                            style={[styles.pill, { borderColor: `${meta.color}66` }]}
                            onPress={() => handleOpen(s.platform, s.handle)}
                            testID={`${testID}-pill-${s.platform}`}
                            accessibilityRole="link"
                            accessibilityLabel={`${meta.label} ${s.handle}`}
                        >
                            <Ionicons name={meta.icon} size={14} color={meta.color} />
                            <Text style={styles.handle} numberOfLines={1}>@{s.handle}</Text>
                        </TouchableOpacity>
                    )
                })}
            </View>
        </View>
    )
})

const styles = StyleSheet.create({
    container: {
        gap: 4,
    },
    caption: {
        fontSize: 11,
        color: darkTheme.textMuted,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: darkTheme.surfaceElevated,
    },
    handle: {
        fontSize: 12,
        color: darkTheme.textPrimary,
        fontWeight: '500',
    },
})

export default SharedSocialsRow
