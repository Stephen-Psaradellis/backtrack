/**
 * ProfileScreen
 *
 * User profile management screen for the Backtrack app.
 * Displays user information and provides account management options.
 *
 * Features:
 * - Display user email and profile information
 * - Edit display name
 * - Create and edit own avatar for matching
 * - Sign out functionality
 * - Profile data refresh on pull
 * - User verification status and badge
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native'

import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { successFeedback, errorFeedback, warningFeedback } from '../lib/haptics'
import { Button, DangerButton, OutlineButton } from '../components/Button'
import {
  clearTutorialCompletion,
  TUTORIAL_FEATURE_LABELS,
  type TutorialFeature,
} from '../utils/tutorialStorage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { LgAvatarSnapshot } from '../components/avatar3d'
import type { StoredAvatar } from '../components/avatar/types'
import { ProfilePhotoGallery } from '../components/ProfilePhotoGallery'
import {
  loadCurrentUserAvatar,
} from '../lib/avatar/storage'
import {
  deleteAccountAndSignOut,
  getDeletionStatus,
  cancelAccountDeletion,
  type DeletionStatus,
} from '../lib/accountDeletion'
import { VerifiedBadge } from '../components/VerifiedBadge'
import { VerificationPrompt } from '../components/VerificationPrompt'
import { StreakCard } from '../components/streaks/StreakCard'
import { useLocationStreaks } from '../hooks/useLocationStreaks'
import { RegularsModeToggle } from '../components/regulars/RegularsModeToggle'
import { FellowRegularsList } from '../components/regulars/RegularsList'
import { NotificationSettings, LocationTrackingSettings } from '../components/settings'

// ============================================================================
// TYPES
// ============================================================================

interface ProfileFormErrors {
  displayName?: string
  general?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ProfileScreen - User profile management screen
 *
 * @example
 * // Used in tab navigation
 * <Tab.Screen name="ProfileTab" component={ProfileScreen} />
 */
export function ProfileScreen(): React.ReactNode {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const navigation = useNavigation<any>()
  const {
    user,
    profile,
    signOut,
    updateProfile,
    refreshProfile,
    isLoading: authLoading,
  } = useAuth()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [userAvatar, setUserAvatar] = useState<StoredAvatar | null>(null)
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null)

  // Location streaks data
  const { topStreaks, isLoading: isLoadingStreaks } = useLocationStreaks({ limit: 5 })

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Load avatar when screen comes into focus (to catch updates from avatar creator)
  useFocusEffect(
    useCallback(() => {
      async function loadAvatar() {
        setIsLoadingAvatar(true)
        const result = await loadCurrentUserAvatar()
        setUserAvatar(result.avatar)
        setIsLoadingAvatar(false)
      }
      loadAvatar()
    }, [])
  )

  // Check for scheduled account deletion
  useFocusEffect(
    useCallback(() => {
      async function checkDeletionStatus() {
        const status = await getDeletionStatus()
        setDeletionStatus(status)
      }
      checkDeletionStatus()
    }, [])
  )

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshProfile()
      // Update local state with refreshed data
      setDisplayName(profile?.display_name || '')
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshProfile, profile?.display_name])

  /**
   * Start editing mode
   */
  const handleStartEditing = useCallback(() => {
    setDisplayName(profile?.display_name || '')
    setErrors({})
    setIsEditing(true)
  }, [profile?.display_name])

  /**
   * Cancel editing
   */
  const handleCancelEditing = useCallback(() => {
    setDisplayName(profile?.display_name || '')
    setErrors({})
    setIsEditing(false)
  }, [profile?.display_name])

  /**
   * Save profile changes
   */
  const handleSaveProfile = useCallback(async () => {
    // Validate
    const trimmedName = displayName.trim()
    if (trimmedName.length > 50) {
      await errorFeedback()
      setErrors({ displayName: 'Display name must be 50 characters or less' })
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      const { error } = await updateProfile({
        display_name: trimmedName || null,
      })

      if (error) {
        await errorFeedback()
        setErrors({ general: error.message || 'Failed to update profile' })
      } else {
        await successFeedback()
        setIsEditing(false)
      }
    } catch {
      await errorFeedback()
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsSaving(false)
    }
  }, [displayName, updateProfile])

  /**
   * Handle sign out with confirmation
   */
  const handleSignOut = useCallback(async () => {
    // Trigger warning haptic when showing destructive action confirmation
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
                Alert.alert('Error', 'Failed to sign out. Please try again.')
              }
              // Navigation will be handled automatically by auth state change
            } catch {
              await errorFeedback()
              Alert.alert('Error', 'An unexpected error occurred.')
            } finally {
              setIsSigningOut(false)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }, [signOut])

  /**
   * Handle account deletion with multiple confirmations
   */
  const handleDeleteAccount = useCallback(async () => {
    await warningFeedback()

    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data including:\n\n' +
        '• Your profile and avatar\n' +
        '• All your posts\n' +
        '• All your conversations and messages\n' +
        '• Your photos and favorites\n\n' +
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
            // Second confirmation
            Alert.alert(
              'Are you absolutely sure?',
              'Type "DELETE" to confirm you want to permanently delete your account.',
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
                        Alert.alert('Error', result.message || 'Failed to delete account')
                        setIsDeletingAccount(false)
                      }
                      // If successful, navigation will be handled by auth state change
                    } catch {
                      await errorFeedback()
                      Alert.alert('Error', 'An unexpected error occurred')
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

  /**
   * Handle cancelling scheduled account deletion
   */
  const handleCancelDeletion = useCallback(async () => {
    const result = await cancelAccountDeletion()
    if (result.success) {
      await successFeedback()
      setDeletionStatus({ scheduled: false })
      Alert.alert('Success', 'Account deletion cancelled')
    } else {
      await errorFeedback()
      Alert.alert('Error', result.message || 'Failed to cancel deletion')
    }
  }, [])

  /**
   * Navigate to avatar creator
   */
  const handleOpenAvatarCreator = useCallback(() => {
    navigation.navigate('AvatarCreator', { mode: 'self' })
  }, [navigation])

  /**
   * Handle verification CTA - show info about verification process
   * Verification is completed through the selfie capture in CreatePost flow
   */
  const handleStartVerification = useCallback(() => {
    Alert.alert(
      'Get Verified',
      'Verification is completed when you create a post. The selfie you take during post creation helps verify your identity and builds trust with other users.',
      [
        {
          text: 'OK',
          style: 'default',
        },
      ],
      { cancelable: true }
    )
  }, [])

  /**
   * Handle tutorial replay - clears completion state and navigates to feature
   *
   * @param feature - The tutorial feature to replay
   */
  const handleReplayTutorial = useCallback(
    async (feature: TutorialFeature) => {
      try {
        // Clear the tutorial completion state
        const result = await clearTutorialCompletion(feature)

        if (result.success) {
          await successFeedback()

          // Navigate to the appropriate screen based on feature
          switch (feature) {
            case 'post_creation':
              // Navigate to CreatePost - tooltip shows on the screen
              navigation.navigate('CreatePost')
              break
            case 'ledger_browsing':
              // Navigate to HomeTab - user will tap a location to see Ledger
              navigation.navigate('MainTabs', { screen: 'HomeTab' })
              break
            case 'selfie_verification':
              // Navigate to CreatePost - selfie step is part of the flow
              navigation.navigate('CreatePost')
              break
            case 'messaging':
              // Navigate to ChatsTab - user will open a conversation
              navigation.navigate('MainTabs', { screen: 'ChatsTab' })
              break
          }
        } else {
          await errorFeedback()
          Alert.alert('Error', 'Failed to reset tutorial. Please try again.')
        }
      } catch {
        await errorFeedback()
        Alert.alert('Error', 'An unexpected error occurred.')
      }
    },
    [navigation]
  )

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Show loading if auth is still initializing
  if (authLoading) {
    return (
      <View style={styles.loadingContainer} testID="profile-loading">
        <LoadingSpinner message="Loading profile..." fullScreen />
      </View>
    )
  }

  // Get display values
  const userEmail = user?.email || 'Unknown'
  const userDisplayName = profile?.display_name || 'Not set'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#FF6B47"
          testID="profile-refresh-control"
        />
      }
      testID="profile-screen"
    >
      {/* Profile Header */}
      <View style={styles.headerSection}>
        {/* Avatar Placeholder */}
        <View style={styles.avatarPlaceholder} testID="profile-avatar-placeholder">
          <Text style={styles.avatarText}>
            {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
          </Text>
        </View>

        <View style={styles.emailRow}>
          <Text style={styles.emailText}>{userEmail}</Text>
          {profile?.is_verified && (
            <VerifiedBadge size="md" testID="profile-verified-badge" />
          )}
        </View>
      </View>

      {/* Verification Prompt for Non-Verified Users */}
      {!profile?.is_verified && (
        <VerificationPrompt
          onVerify={handleStartVerification}
          testID="profile-verification-prompt"
        />
      )}

      {/* Profile Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>

        {/* Error Banner */}
        {errors.general && (
          <View style={styles.errorBanner} testID="profile-error-banner">
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        )}

        {/* Display Name */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Display Name</Text>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[styles.input, errors.displayName && styles.inputError]}
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text)
                  setErrors((prev) => ({ ...prev, displayName: undefined }))
                }}
                placeholder="Enter display name"
                placeholderTextColor="#8E8E93"
                maxLength={50}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                editable={!isSaving}
                onSubmitEditing={handleSaveProfile}
                testID="profile-display-name-input"
              />
              {errors.displayName && (
                <Text style={styles.errorText} testID="profile-display-name-error">
{errors.displayName}
                </Text>
              )}
              <View style={styles.editButtonsRow}>
                <OutlineButton
                  title="Cancel"
                  onPress={handleCancelEditing}
                  size="small"
                  disabled={isSaving}
                  testID="profile-cancel-edit-button"
                />
                <Button
                  title="Save"
                  onPress={handleSaveProfile}
                  size="small"
                  loading={isSaving}
                  disabled={isSaving}
                  testID="profile-save-button"
                />
              </View>
            </View>
          ) : (
            <View style={styles.valueRow}>
              <Text style={styles.infoValue}>{userDisplayName}</Text>
              <TouchableOpacity
                onPress={handleStartEditing}
                style={styles.editLink}
                testID="profile-edit-name-button"
              >
                <Text style={styles.editLinkText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Email (read-only) */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{userEmail}</Text>
        </View>

        {/* Member Since */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>{memberSince}</Text>
        </View>
      </View>

      {/* My Avatar Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Avatar</Text>
        <Text style={styles.avatarDescription}>
          Your avatar helps others recognize and match with you
        </Text>
        <View style={styles.avatarSection}>
          {isLoadingAvatar ? (
            <View style={styles.avatarLoading}>
              <LoadingSpinner message="Loading avatar..." />
            </View>
          ) : userAvatar ? (
            <View style={styles.avatarConfigured} testID="profile-avatar-preview">
              <LgAvatarSnapshot
                avatar={userAvatar}
              />
              <View style={styles.avatarInfo}>
                <Text style={styles.avatarLabel}>Your Avatar</Text>
              </View>
              <View style={styles.avatarActions}>
                <Button
                  title="Edit Avatar"
                  onPress={handleOpenAvatarCreator}
                  size="small"
                  disabled={isSavingAvatar}
                  testID="profile-edit-avatar-button"
                />
              </View>
            </View>
          ) : (
            <View style={styles.avatarEmpty} testID="profile-avatar-empty">
              <View style={styles.avatarPlaceholderIcon}>
                <Text style={styles.avatarPlaceholderEmoji}>👤</Text>
              </View>
              <Text style={styles.avatarEmptyText}>
                Create your personalized avatar.
                Customize your face, body, hair, and clothing!
              </Text>
              <Button
                title="Create Avatar"
                onPress={handleOpenAvatarCreator}
                disabled={isSavingAvatar}
                testID="profile-create-avatar-button"
              />
            </View>
          )}
        </View>
      </View>

      {/* Replay Tutorial Section */}
      {/* Verification Photos Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification Photos</Text>
        <Text style={styles.avatarDescription}>
          Photos used to verify your identity when creating posts
        </Text>
        <ProfilePhotoGallery
          maxPhotos={5}
          testID="profile-photo-gallery"
        />
      </View>

      {/* My Location Streaks Section */}
      <View style={styles.section} testID="profile-streaks-section">
        <Text style={styles.sectionTitle}>My Location Streaks</Text>
        <Text style={styles.avatarDescription}>
          Track your visits to favorite locations
        </Text>
        {isLoadingStreaks ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="small" />
          </View>
        ) : topStreaks && topStreaks.length > 0 ? (
          <View style={styles.streaksList}>
            {topStreaks.map((streak, index) => (
              <StreakCard
                key={streak.id || `${streak.location_id}-${streak.streak_type}`}
                streak={streak}
                compact
                testID={`profile-streak-${index}`}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No streaks yet. Visit locations regularly!</Text>
        )}
      </View>

      {/* Regulars Mode Section */}
      <View style={styles.section} testID="profile-regulars-section">
        <RegularsModeToggle />
      </View>

      {/* Fellow Regulars Section */}
      <View style={styles.section} testID="profile-fellow-regulars-section">
        <Text style={styles.sectionTitle}>Fellow Regulars</Text>
        <Text style={styles.avatarDescription}>
          People who visit the same spots as you
        </Text>
        <FellowRegularsList showLocations limit={5} />
      </View>

      {/* Notification Settings Section */}
      <View style={styles.section} testID="profile-notification-settings-section">
        <NotificationSettings />
      </View>

      {/* Location Tracking Settings Section */}
      <View style={styles.section} testID="profile-location-tracking-section">
        <LocationTrackingSettings testID="profile-location-tracking" />
      </View>

      {/* Replay Tutorial Section */}
      <View style={styles.section} testID="profile-replay-tutorial-section">
        <Text style={styles.sectionTitle}>Replay Tutorial</Text>
        <Text style={styles.avatarDescription}>
          Re-watch helpful tips for using Backtrack features
        </Text>
        <View style={styles.replayButtonsContainer}>
          <OutlineButton
            title={TUTORIAL_FEATURE_LABELS.post_creation}
            onPress={() => handleReplayTutorial('post_creation')}
            testID="profile-replay-post-creation-button"
          />
          <OutlineButton
            title={TUTORIAL_FEATURE_LABELS.ledger_browsing}
            onPress={() => handleReplayTutorial('ledger_browsing')}
            testID="profile-replay-ledger-browsing-button"
          />
          <OutlineButton
            title={TUTORIAL_FEATURE_LABELS.selfie_verification}
            onPress={() => handleReplayTutorial('selfie_verification')}
            testID="profile-replay-selfie-verification-button"
          />
          <OutlineButton
            title={TUTORIAL_FEATURE_LABELS.messaging}
            onPress={() => handleReplayTutorial('messaging')}
            testID="profile-replay-messaging-button"
          />
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section} testID="profile-legal-section">
        <Text style={styles.sectionTitle}>Legal</Text>
        <TouchableOpacity
          style={styles.legalLink}
          onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
          testID="profile-privacy-policy-link"
        >
          <Text style={styles.legalLinkText}>Privacy Policy</Text>
          <Text style={styles.legalLinkArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.legalLink}
          onPress={() => navigation.navigate('Legal', { type: 'terms' })}
          testID="profile-terms-link"
        >
          <Text style={styles.legalLinkText}>Terms of Service</Text>
          <Text style={styles.legalLinkArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Developer Tools Section (Dev Only) */}
      {__DEV__ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => navigation.navigate('WebGL3DTest')}
            testID="profile-webgl-test-button"
          >
            <Text style={styles.devButtonText}>Test 3D WebGL</Text>
            <Text style={styles.devButtonHint}>Task 1: WebView POC</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        {/* Scheduled Deletion Warning */}
        {deletionStatus?.scheduled && (
          <View style={styles.deletionWarning}>
            <Text style={styles.deletionWarningTitle}>
              Account Scheduled for Deletion
            </Text>
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

        <DangerButton
          title="Sign Out"
          onPress={handleSignOut}
          loading={isSigningOut}
          disabled={isSigningOut || isDeletingAccount}
          fullWidth
          testID="profile-sign-out-button"
        />

        <View style={styles.deleteAccountContainer}>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount || isSigningOut}
            testID="profile-delete-account-button"
          >
            {isDeletingAccount ? (
              <Text style={styles.deleteAccountText}>Deleting...</Text>
            ) : (
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.deleteAccountHint}>
            Permanently delete your account and all data
          </Text>
        </View>
      </View>

      {/* App Info Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Backtrack</Text>
        <Text style={styles.footerVersion}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B47',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editLinkText: {
    fontSize: 14,
    color: '#FF6B47',
    fontWeight: '600',
  },
  editContainer: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  avatarDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  avatarSection: {
    marginTop: 12,
  },
  avatarLoading: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarConfigured: {
    gap: 12,
  },
  avatarInfo: {
    paddingHorizontal: 12,
  },
  avatarLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  avatarEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  avatarPlaceholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderEmoji: {
    fontSize: 32,
  },
  avatarEmptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  replayButtonsContainer: {
    gap: 8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  streaksList: {
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 16,
  },
  footerVersion: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  deletionWarning: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  deletionWarningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  deletionWarningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
  },
  cancelDeletionButton: {
    backgroundColor: '#856404',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  cancelDeletionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteAccountContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  deleteAccountButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteAccountText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  deleteAccountHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  legalLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  legalLinkText: {
    fontSize: 16,
    color: '#333333',
  },
  legalLinkArrow: {
    fontSize: 16,
    color: '#8E8E93',
  },
  devButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  devButtonHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
})