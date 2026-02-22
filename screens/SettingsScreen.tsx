/**
 * SettingsScreen
 *
 * Settings and preferences screen extracted from ProfileScreen.
 * Contains all non-profile-essential sections:
 * - Location Streaks
 * - Regulars Mode
 * - Fellow Regulars
 * - Notifications
 * - Location Tracking
 * - Replay Tutorial
 * - Legal
 * - Account (sign out, delete)
 * - App Info Footer
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  darkTheme,
  glassStyles,
} from '../constants/glassStyles'
import { colors } from '../constants/theme'

import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { successFeedback, errorFeedback, warningFeedback, lightFeedback } from '../lib/haptics'
import {
  clearTutorialCompletion,
  TUTORIAL_FEATURE_LABELS,
  type TutorialFeature,
} from '../utils/tutorialStorage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import {
  deleteAccountAndSignOut,
  getDeletionStatus,
  cancelAccountDeletion,
  type DeletionStatus,
} from '../lib/accountDeletion'
import { StreakCard } from '../components/streaks/StreakCard'
import { useLocationStreaks } from '../hooks/useLocationStreaks'
import { RegularsModeToggle } from '../components/regulars/RegularsModeToggle'
import { FellowRegularsList } from '../components/regulars/RegularsList'
import { NotificationSettings, LocationTrackingSettings } from '../components/settings'
import { useGhostMode, type GhostModeDuration } from '../hooks/useGhostMode'
import { useRadar, RADAR_RADIUS_OPTIONS } from '../hooks/useRadar'

// ============================================================================
// COMPONENT
// ============================================================================

export function SettingsScreen(): React.ReactNode {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { user, signOut } = useAuth()
  const { showToast } = useToast()

  // State
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null)

  // Location streaks data
  const { topStreaks, isLoading: isLoadingStreaks, error: streaksError } = useLocationStreaks({ limit: 5 })

  // Ghost mode
  const {
    isGhostMode,
    timeRemaining,
    isLoading: isGhostModeLoading,
    activate: activateGhostMode,
    deactivate: deactivateGhostMode,
  } = useGhostMode()

  // Radar
  const {
    radarEnabled,
    radarRadius,
    toggleRadar,
    setRadarRadius,
  } = useRadar()

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Check for scheduled account deletion
  useFocusEffect(
    useCallback(() => {
      async function checkDeletionStatus() {
        try {
          const status = await getDeletionStatus()
          setDeletionStatus(status)
        } catch (err) {
          console.error('[SettingsScreen] Failed to check deletion status:', err)
          // Non-critical: silently ignore, UI stays in default state
        }
      }
      checkDeletionStatus()
    }, [])
  )

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSignOut = useCallback(async () => {
    await warningFeedback()

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true)
            try {
              const { error } = await signOut()
              if (error) {
                await errorFeedback()
                showToast({
                  message: 'Failed to sign out. Please try again.',
                  variant: 'error',
                })
              }
            } catch {
              await errorFeedback()
              showToast({
                message: 'An unexpected error occurred.',
                variant: 'error',
              })
            } finally {
              setIsSigningOut(false)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }, [signOut])

  const handleDeleteAccount = useCallback(async () => {
    await warningFeedback()

    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data including:\n\n' +
        '\u2022 Your profile and avatar\n' +
        '\u2022 All your posts\n' +
        '\u2022 All your conversations and messages\n' +
        '\u2022 Your photos and favorites\n\n' +
        'This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation - UX-031: removed misleading "Type DELETE" instruction
            Alert.alert(
              'Are you absolutely sure?',
              'This will permanently delete your account and all associated data. This action cannot be reversed.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    if (!user?.id) return

                    setIsDeletingAccount(true)
                    try {
                      const result = await deleteAccountAndSignOut(user.id)
                      if (!result.success) {
                        await errorFeedback()
                        showToast({
                          message: result.message || 'Failed to delete account',
                          variant: 'error',
                        })
                        setIsDeletingAccount(false)
                      }
                    } catch {
                      await errorFeedback()
                      showToast({
                        message: 'An unexpected error occurred',
                        variant: 'error',
                      })
                      setIsDeletingAccount(false)
                    }
                  },
                },
              ],
              { cancelable: true }
            )
          },
        },
      ],
      { cancelable: true }
    )
  }, [user?.id])

  const handleCancelDeletion = useCallback(async () => {
    const result = await cancelAccountDeletion()
    if (result.success) {
      await successFeedback()
      setDeletionStatus({ scheduled: false })
      showToast({
        message: 'Account deletion cancelled',
        variant: 'success',
      })
    } else {
      await errorFeedback()
      showToast({
        message: result.message || 'Failed to cancel deletion',
        variant: 'error',
      })
    }
  }, [showToast])

  const handleReplayTutorial = useCallback(
    async (feature: TutorialFeature) => {
      try {
        const result = await clearTutorialCompletion(feature)

        if (result.success) {
          await successFeedback()

          switch (feature) {
            case 'post_creation':
              navigation.navigate('CreatePost')
              break
            case 'ledger_browsing':
              navigation.navigate('MainTabs', { screen: 'HomeTab' })
              break
            case 'selfie_verification':
              navigation.navigate('CreatePost')
              break
            case 'messaging':
              navigation.navigate('MainTabs', { screen: 'ChatsTab' })
              break
          }
        } else {
          await errorFeedback()
          showToast({
            message: 'Failed to reset tutorial. Please try again.',
            variant: 'error',
          })
        }
      } catch {
        await errorFeedback()
        showToast({
          message: 'An unexpected error occurred.',
          variant: 'error',
        })
      }
    },
    [navigation, showToast]
  )

  const handleGhostModeToggle = useCallback(
    async (duration?: GhostModeDuration) => {
      if (isGhostMode) {
        // Deactivate ghost mode
        const result = await deactivateGhostMode()
        if (result.success) {
          await successFeedback()
          showToast({
            message: 'Ghost Mode deactivated',
            variant: 'success',
          })
        } else {
          await errorFeedback()
          showToast({
            message: result.error || 'Failed to deactivate Ghost Mode',
            variant: 'error',
          })
        }
      } else {
        // Activate ghost mode
        if (!duration) return

        const result = await activateGhostMode(duration)
        if (result.success) {
          await successFeedback()
          showToast({
            message: `Ghost Mode activated for ${duration}`,
            variant: 'success',
          })
        } else {
          await errorFeedback()
          showToast({
            message: result.error || 'Failed to activate Ghost Mode',
            variant: 'error',
          })
        }
      }
    },
    [isGhostMode, activateGhostMode, deactivateGhostMode, showToast]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          testID="settings-back-button"
        >
          <Ionicons name="chevron-back" size={24} color={darkTheme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        testID="settings-screen"
      >
        {/* My Location Streaks Section */}
        <View style={styles.section} testID="settings-streaks-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="flame-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>My Location Streaks</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <Text style={styles.sectionDescription}>
              Track your visits to favorite locations
            </Text>
            {isLoadingStreaks ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size="small" />
              </View>
            ) : streaksError ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="alert-circle-outline" size={32} color={darkTheme.textMuted} />
                <Text style={styles.emptyText}>Could not load streaks</Text>
                <Text style={styles.emptySubtext}>Please try again later</Text>
              </View>
            ) : topStreaks && topStreaks.length > 0 ? (
              <View style={styles.streaksList}>
                {topStreaks.map((streak, index) => (
                  <StreakCard
                    key={streak.id || `${streak.location_id}-${streak.streak_type}`}
                    streak={streak}
                    compact
                    testID={`settings-streak-${index}`}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="flame" size={32} color={darkTheme.textMuted} />
                <Text style={styles.emptyText}>No streaks yet</Text>
                <Text style={styles.emptySubtext}>Visit locations regularly to build streaks!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Regulars Mode Section */}
        <View style={styles.section} testID="settings-regulars-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Regulars Mode</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <RegularsModeToggle />
          </View>
        </View>

        {/* Fellow Regulars Section */}
        <View style={styles.section} testID="settings-fellow-regulars-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="heart-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Fellow Regulars</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <Text style={styles.sectionDescription}>
              People who visit the same spots as you
            </Text>
            <FellowRegularsList showLocations limit={5} />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section} testID="settings-notification-settings-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <NotificationSettings />
          </View>
        </View>

        {/* Location Tracking Section */}
        <View style={styles.section} testID="settings-location-tracking-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Location Tracking</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <LocationTrackingSettings testID="settings-location-tracking" />
          </View>
        </View>

        {/* Ghost Mode Section */}
        <View style={styles.section} testID="settings-ghost-mode-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="eye-off-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Ghost Mode</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <Text style={styles.sectionDescription}>
              Temporarily hide from location-based features while still using the app
            </Text>

            {isGhostMode ? (
              <View style={styles.ghostModeActive}>
                <View style={styles.ghostModeActiveHeader}>
                  <Ionicons name="eye-off" size={24} color={colors.primary[400]} />
                  <Text style={styles.ghostModeActiveText}>Ghost Mode Active</Text>
                </View>
                <Text style={styles.ghostModeTimeRemaining}>
                  Time remaining: {timeRemaining || 'Calculating...'}
                </Text>
                <TouchableOpacity
                  style={styles.ghostModeDeactivateButton}
                  onPress={() => handleGhostModeToggle()}
                  disabled={isGhostModeLoading}
                  testID="settings-ghost-mode-deactivate"
                >
                  {isGhostModeLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.ghostModeDeactivateText}>Deactivate Ghost Mode</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.ghostModeDurations}>
                {isGhostModeLoading && (
                  <View style={styles.ghostModeActivatingRow}>
                    <ActivityIndicator color={darkTheme.textSecondary} size="small" />
                    <Text style={styles.ghostModeActivatingText}>Activating...</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.ghostModeDurationButton, isGhostModeLoading && styles.ghostModeDurationButtonDisabled]}
                  onPress={() => handleGhostModeToggle('1h')}
                  disabled={isGhostModeLoading}
                  testID="settings-ghost-mode-1h"
                >
                  <Ionicons name="time-outline" size={18} color={darkTheme.textSecondary} />
                  <Text style={styles.ghostModeDurationText}>1 Hour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ghostModeDurationButton, isGhostModeLoading && styles.ghostModeDurationButtonDisabled]}
                  onPress={() => handleGhostModeToggle('2h')}
                  disabled={isGhostModeLoading}
                  testID="settings-ghost-mode-2h"
                >
                  <Ionicons name="time-outline" size={18} color={darkTheme.textSecondary} />
                  <Text style={styles.ghostModeDurationText}>2 Hours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ghostModeDurationButton, isGhostModeLoading && styles.ghostModeDurationButtonDisabled]}
                  onPress={() => handleGhostModeToggle('4h')}
                  disabled={isGhostModeLoading}
                  testID="settings-ghost-mode-4h"
                >
                  <Ionicons name="time-outline" size={18} color={darkTheme.textSecondary} />
                  <Text style={styles.ghostModeDurationText}>4 Hours</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Walk-by Radar Section */}
        <View style={styles.section} testID="settings-radar-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="radar-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Walk-by Radar</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <Text style={styles.sectionDescription}>
              Get notified when you pass near others who might click with you
            </Text>

            {/* Radar Toggle */}
            <View style={styles.radarToggleRow}>
              <View style={styles.radarToggleLabel}>
                <Ionicons name="notifications-outline" size={18} color={darkTheme.textSecondary} />
                <Text style={styles.radarToggleText}>Proximity Notifications</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.radarToggle,
                  radarEnabled && styles.radarToggleActive,
                ]}
                onPress={async () => {
                  const result = await toggleRadar()
                  if (result.success) {
                    await successFeedback()
                    showToast({
                      message: radarEnabled ? 'Radar disabled' : 'Radar enabled',
                      variant: 'success',
                    })
                  } else {
                    await errorFeedback()
                    showToast({
                      message: result.error || 'Failed to toggle radar',
                      variant: 'error',
                    })
                  }
                }}
                testID="settings-radar-toggle"
              >
                <View style={[
                  styles.radarToggleKnob,
                  radarEnabled && styles.radarToggleKnobActive,
                ]} />
              </TouchableOpacity>
            </View>

            {radarEnabled && (
              <>
                <View style={styles.divider} />

                {/* Radius Selector */}
                <Text style={styles.radarRadiusLabel}>Detection Radius</Text>
                <View style={styles.radarRadiusOptions}>
                  {RADAR_RADIUS_OPTIONS.map((meters) => (
                    <TouchableOpacity
                      key={meters}
                      style={[
                        styles.radarRadiusButton,
                        radarRadius === meters && styles.radarRadiusButtonActive,
                      ]}
                      onPress={async () => {
                        const result = await setRadarRadius(meters)
                        if (result.success) {
                          await lightFeedback()
                        } else {
                          await errorFeedback()
                          showToast({
                            message: result.error || 'Failed to update radius',
                            variant: 'error',
                          })
                        }
                      }}
                      testID={`settings-radar-radius-${meters}`}
                    >
                      <Text
                        style={[
                          styles.radarRadiusButtonText,
                          radarRadius === meters && styles.radarRadiusButtonTextActive,
                        ]}
                      >
                        {meters}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Replay Tutorial Section */}
        <View style={styles.section} testID="settings-replay-tutorial-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="school-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Replay Tutorial</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <Text style={styles.sectionDescription}>
              Re-watch helpful tips for using Backtrack features
            </Text>
            <View style={styles.replayButtonsContainer}>
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={() => handleReplayTutorial('post_creation')}
                testID="settings-replay-post-creation-button"
              >
                <Ionicons name="create-outline" size={18} color={darkTheme.textSecondary} />
                <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.post_creation}</Text>
                <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={() => handleReplayTutorial('ledger_browsing')}
                testID="settings-replay-ledger-browsing-button"
              >
                <Ionicons name="book-outline" size={18} color={darkTheme.textSecondary} />
                <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.ledger_browsing}</Text>
                <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={() => handleReplayTutorial('selfie_verification')}
                testID="settings-replay-selfie-verification-button"
              >
                <Ionicons name="camera-outline" size={18} color={darkTheme.textSecondary} />
                <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.selfie_verification}</Text>
                <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={() => handleReplayTutorial('messaging')}
                testID="settings-replay-messaging-button"
              >
                <Ionicons name="chatbubble-outline" size={18} color={darkTheme.textSecondary} />
                <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.messaging}</Text>
                <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section} testID="settings-legal-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Legal</Text>
          </View>
          <View style={[glassStyles.card, styles.glassCard]}>
            <TouchableOpacity
              style={styles.legalLink}
              onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
              testID="settings-privacy-policy-link"
            >
              <View style={styles.legalLinkContent}>
                <Ionicons name="shield-outline" size={18} color={darkTheme.textSecondary} />
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={darkTheme.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.legalLink}
              onPress={() => navigation.navigate('Legal', { type: 'terms' })}
              testID="settings-terms-link"
            >
              <View style={styles.legalLinkContent}>
                <Ionicons name="document-outline" size={18} color={darkTheme.textSecondary} />
                <Text style={styles.legalLinkText}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={darkTheme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color={colors.primary[400]} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          {/* Scheduled Deletion Warning */}
          {deletionStatus?.scheduled && (
            <View style={styles.deletionWarning}>
              <View style={styles.deletionWarningHeader}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <Text style={styles.deletionWarningTitle}>
                  Account Scheduled for Deletion
                </Text>
              </View>
              <Text style={styles.deletionWarningText}>
                Your account will be deleted in {deletionStatus.daysRemaining} days.
              </Text>
              <TouchableOpacity
                style={styles.cancelDeletionButton}
                onPress={handleCancelDeletion}
              >
                <Text style={styles.cancelDeletionText}>Cancel Deletion</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[glassStyles.card, styles.glassCard]}>
            {/* Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={isSigningOut || isDeletingAccount}
              testID="settings-sign-out-button"
            >
              <Ionicons name="log-out-outline" size={20} color={darkTheme.textSecondary} />
              <Text style={styles.signOutText}>
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Delete Account Button */}
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount || isSigningOut}
              testID="settings-delete-account-button"
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <View style={styles.deleteAccountContent}>
                <Text style={styles.deleteAccountText}>
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </Text>
                <Text style={styles.deleteAccountHint}>
                  Permanently delete your account and all data
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Footer */}
        <View style={styles.footer}>
          <LinearGradient
            colors={[colors.primary[500], colors.accent[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.footerLogo}
          >
            <Ionicons name="location" size={20} color="#FFF" />
          </LinearGradient>
          <Text style={styles.footerText}>Backtrack</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: darkTheme.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.background,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  sectionDescription: {
    fontSize: 14,
    color: darkTheme.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  glassCard: {
    padding: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 16,
  },

  // Empty states
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: darkTheme.textMuted,
    textAlign: 'center',
  },
  streaksList: {
    gap: 10,
  },

  // Tutorial buttons
  replayButtonsContainer: {
    gap: 8,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tutorialButtonText: {
    flex: 1,
    fontSize: 15,
    color: darkTheme.textSecondary,
    fontWeight: '500',
  },

  // Legal section
  legalLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  legalLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalLinkText: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    fontWeight: '500',
  },

  // Deletion warning
  deletionWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  deletionWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  deletionWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  deletionWarningText: {
    fontSize: 14,
    color: 'rgba(245, 158, 11, 0.8)',
    marginBottom: 12,
  },
  cancelDeletionButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  cancelDeletionText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },

  // Account actions
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  signOutText: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    fontWeight: '500',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  deleteAccountContent: {
    flex: 1,
  },
  deleteAccountText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '500',
  },
  deleteAccountHint: {
    fontSize: 12,
    color: darkTheme.textMuted,
    marginTop: 2,
  },

  // Footer
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  footerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 16,
    color: darkTheme.textPrimary,
    fontWeight: '700',
  },
  footerVersion: {
    fontSize: 13,
    color: darkTheme.textMuted,
  },

  // Ghost Mode styles
  ghostModeActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    gap: 12,
  },
  ghostModeActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ghostModeActiveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[400],
  },
  ghostModeTimeRemaining: {
    fontSize: 14,
    color: darkTheme.textSecondary,
  },
  ghostModeDeactivateButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  ghostModeDeactivateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  ghostModeDurations: {
    gap: 8,
  },
  ghostModeActivatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  ghostModeActivatingText: {
    fontSize: 14,
    color: darkTheme.textSecondary,
  },
  ghostModeDurationButtonDisabled: {
    opacity: 0.4,
  },
  ghostModeDurationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ghostModeDurationText: {
    flex: 1,
    fontSize: 15,
    color: darkTheme.textSecondary,
    fontWeight: '500',
  },

  // Radar styles
  radarToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radarToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radarToggleText: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    fontWeight: '500',
  },
  radarToggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  radarToggleActive: {
    backgroundColor: colors.primary[500],
  },
  radarToggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  radarToggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  radarRadiusLabel: {
    fontSize: 14,
    color: darkTheme.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  radarRadiusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  radarRadiusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  radarRadiusButtonActive: {
    backgroundColor: 'rgba(255, 107, 71, 0.15)',
    borderColor: 'rgba(255, 107, 71, 0.3)',
  },
  radarRadiusButtonText: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    fontWeight: '600',
  },
  radarRadiusButtonTextActive: {
    color: colors.primary[400],
  },
})

export default SettingsScreen
