/**
 * SocialShareModal (Feature 5.6)
 *
 * Per-conversation opt-in to reveal verified social handles to the other
 * party. Lists each platform the caller has connected with a checkbox.
 * "Share" inserts conversation_social_shares rows; revoking is per-platform
 * via the row's existing toggle (re-tap).
 *
 * Only opens for conversations with status='active'. The hook (and the RPC
 * behind it) will reject otherwise.
 */

import React, { memo, useCallback, useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { darkTheme } from '../../constants/glassStyles'
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../../lib/socialPlatforms'
import { useVerifiedSocials } from '../../hooks/useVerifiedSocials'
import { useMatchSocials } from '../../hooks/useMatchSocials'

export interface SocialShareModalProps {
    visible: boolean
    onClose: () => void
    conversationId: string
    onOpenConnect?: () => void
    testID?: string
}

export const SocialShareModal = memo(function SocialShareModal({
    visible,
    onClose,
    conversationId,
    onOpenConnect,
    testID = 'social-share-modal',
}: SocialShareModalProps) {
    const { socials, isLoading: loadingMine } = useVerifiedSocials()
    const { me, share, revoke, isLoading: loadingShares } = useMatchSocials(visible ? conversationId : null)
    const [pendingPlatform, setPendingPlatform] = useState<SocialPlatform | null>(null)

    // Initial selection: platforms already shared in this conversation are
    // pre-checked. Local state mirrors current shared set; toggling triggers
    // immediate share/revoke.
    const sharedSet = new Set(me.map(s => s.platform))

    const handleToggle = useCallback(async (platform: SocialPlatform) => {
        setPendingPlatform(platform)
        try {
            if (sharedSet.has(platform)) {
                await revoke(platform)
            } else {
                await share([platform])
            }
        } catch (err) {
            Alert.alert('Could not update', (err as Error).message)
        } finally {
            setPendingPlatform(null)
        }
    }, [sharedSet, share, revoke])

    useEffect(() => {
        if (!visible) setPendingPlatform(null)
    }, [visible])

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} testID={testID}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Share Verified Socials</Text>
                        <TouchableOpacity onPress={onClose} testID={`${testID}-close`}>
                            <Ionicons name="close" size={24} color={darkTheme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Tap a platform to share or revoke. Only platforms you've verified appear here.
                    </Text>

                    {(loadingMine || loadingShares) && socials.length === 0 ? (
                        <ActivityIndicator color={darkTheme.primary} style={styles.loader} />
                    ) : socials.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                You haven't connected any social accounts yet.
                            </Text>
                            {onOpenConnect && (
                                <TouchableOpacity
                                    onPress={onOpenConnect}
                                    style={[styles.button, styles.buttonPrimary]}
                                    testID={`${testID}-open-connect`}
                                >
                                    <Text style={styles.buttonPrimaryText}>Connect an account</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.list}>
                            {socials.map(social => {
                                const meta = SOCIAL_PLATFORMS[social.platform]
                                const isShared = sharedSet.has(social.platform)
                                const isBusy = pendingPlatform === social.platform
                                return (
                                    <TouchableOpacity
                                        key={social.platform}
                                        onPress={() => handleToggle(social.platform)}
                                        disabled={isBusy}
                                        style={[styles.row, isShared && styles.rowActive]}
                                        testID={`${testID}-row-${social.platform}`}
                                    >
                                        <View style={styles.rowLeft}>
                                            <Ionicons name={meta.icon} size={22} color={isShared ? meta.color : darkTheme.textMuted} />
                                            <View style={styles.rowText}>
                                                <Text style={styles.rowLabel}>{meta.label}</Text>
                                                <Text style={styles.rowHandle}>@{social.handle}</Text>
                                            </View>
                                        </View>
                                        {isBusy ? (
                                            <ActivityIndicator size="small" color={darkTheme.textMuted} />
                                        ) : (
                                            <Ionicons
                                                name={isShared ? 'checkmark-circle' : 'ellipse-outline'}
                                                size={22}
                                                color={isShared ? darkTheme.success : darkTheme.textMuted}
                                            />
                                        )}
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    )
})

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: darkTheme.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 32,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: darkTheme.textPrimary,
    },
    subtitle: {
        fontSize: 13,
        color: darkTheme.textMuted,
        marginTop: 6,
        marginBottom: 16,
        lineHeight: 18,
    },
    loader: {
        marginVertical: 32,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 12,
    },
    emptyText: {
        color: darkTheme.textMuted,
        fontSize: 13,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 8,
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: darkTheme.surfaceElevated,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    rowActive: {
        borderColor: `${darkTheme.success}40`,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    rowText: {
        flexShrink: 1,
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: darkTheme.textPrimary,
    },
    rowHandle: {
        fontSize: 12,
        color: darkTheme.textSecondary,
        marginTop: 2,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    buttonPrimary: {
        backgroundColor: darkTheme.primary,
    },
    buttonPrimaryText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
})

export default SocialShareModal
