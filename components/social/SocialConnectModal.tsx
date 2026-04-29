/**
 * SocialConnectModal (Feature 5.6)
 *
 * Settings-side UI for connecting / disconnecting verified social accounts.
 * Shows one row per supported platform with a "Connect" button (or the
 * connected handle + "Disconnect"). Connect spawns the OAuth flow.
 *
 * Privacy: connected handles are PRIVATE here (only the owner sees them).
 * Sharing with a conversation partner is a separate gesture (SocialShareModal).
 */

import React, { memo, useCallback } from 'react'
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
import { SOCIAL_PLATFORMS, SUPPORTED_PLATFORMS, type SocialPlatform } from '../../lib/socialPlatforms'
import { useVerifiedSocials } from '../../hooks/useVerifiedSocials'
import { useConnectSocial } from '../../hooks/useConnectSocial'

export interface SocialConnectModalProps {
    visible: boolean
    onClose: () => void
    testID?: string
}

export const SocialConnectModal = memo(function SocialConnectModal({
    visible,
    onClose,
    testID = 'social-connect-modal',
}: SocialConnectModalProps) {
    const { socials, isLoading, refetch, disconnect } = useVerifiedSocials()
    const { connect, isConnecting } = useConnectSocial()

    const connected = new Map(socials.map(s => [s.platform, s.handle]))

    const handleConnect = useCallback(async (platform: SocialPlatform) => {
        const result = await connect(platform)
        if (result.success) {
            await refetch()
        } else if (result.error) {
            Alert.alert('Could not connect', result.error)
        }
    }, [connect, refetch])

    const handleDisconnect = useCallback((platform: SocialPlatform) => {
        const meta = SOCIAL_PLATFORMS[platform]
        Alert.alert(
            `Disconnect ${meta.label}?`,
            `Your handle will no longer be verified. Anyone you shared it with in conversations will stop seeing it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await disconnect(platform)
                        } catch (err) {
                            Alert.alert('Could not disconnect', (err as Error).message)
                        }
                    },
                },
            ],
        )
    }, [disconnect])

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} testID={testID}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Verified Social Accounts</Text>
                        <TouchableOpacity onPress={onClose} testID={`${testID}-close`}>
                            <Ionicons name="close" size={24} color={darkTheme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Connect via OAuth to verify that the handle is yours. Your handles stay private until
                        you share them with a match.
                    </Text>

                    {isLoading && socials.length === 0 ? (
                        <ActivityIndicator color={darkTheme.primary} style={styles.loader} />
                    ) : (
                        <ScrollView contentContainerStyle={styles.list}>
                            {SUPPORTED_PLATFORMS.map(platform => {
                                const meta = SOCIAL_PLATFORMS[platform]
                                const handle = connected.get(platform)
                                const isConnected = !!handle
                                return (
                                    <View key={platform} style={styles.row} testID={`${testID}-row-${platform}`}>
                                        <View style={styles.rowLeft}>
                                            <Ionicons
                                                name={meta.icon}
                                                size={22}
                                                color={isConnected ? meta.color : darkTheme.textMuted}
                                            />
                                            <View style={styles.rowText}>
                                                <Text style={styles.rowLabel}>{meta.label}</Text>
                                                {isConnected ? (
                                                    <Text style={styles.rowHandle}>@{handle}</Text>
                                                ) : (
                                                    <Text style={styles.rowHandleMuted}>Not connected</Text>
                                                )}
                                            </View>
                                        </View>
                                        {isConnected ? (
                                            <TouchableOpacity
                                                onPress={() => handleDisconnect(platform)}
                                                style={[styles.button, styles.buttonSecondary]}
                                                testID={`${testID}-disconnect-${platform}`}
                                            >
                                                <Text style={styles.buttonSecondaryText}>Disconnect</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => handleConnect(platform)}
                                                disabled={isConnecting}
                                                style={[styles.button, styles.buttonPrimary, isConnecting && styles.buttonDisabled]}
                                                testID={`${testID}-connect-${platform}`}
                                            >
                                                <Text style={styles.buttonPrimaryText}>
                                                    {isConnecting ? '…' : 'Connect'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
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
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
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
    rowHandleMuted: {
        fontSize: 12,
        color: darkTheme.textMuted,
        marginTop: 2,
    },
    button: {
        paddingHorizontal: 14,
        paddingVertical: 8,
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
    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: darkTheme.cardBorder,
    },
    buttonSecondaryText: {
        color: darkTheme.textPrimary,
        fontWeight: '500',
        fontSize: 13,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
})

export default SocialConnectModal
