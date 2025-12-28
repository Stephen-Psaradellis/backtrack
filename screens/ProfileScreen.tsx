/**
 * ProfileScreen
 *
 * User profile management screen for the Love Ledger app.
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
import {
  LargeAvatarPreview,
  type StoredAvatar,
} from '../components/ReadyPlayerMe'
import { ProfilePhotoGallery } from '../components/ProfilePhotoGallery'
import {
  loadCurrentUserAvatar,
  deleteCurrentUserAvatar,
} from '../lib/avatarService'
import { VerifiedBadge } from '../components/VerifiedBadge'
import { VerificationPrompt } from '../components/VerificationPrompt'

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
export function ProfileScreen(): JSX.Element {
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
  const [rpmAvatar, setRpmAvatar] = useState<StoredAvatar | null>(null)
  const [isLoadingRpmAvatar, setIsLoadingRpmAvatar] = useState(true)

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Load RPM avatar when screen comes into focus (to catch updates from avatar creator)
  useFocusEffect(
    useCallback(() => {
      async function loadRpmAvatar() {
        setIsLoadingRpmAvatar(true)
        const result = await loadCurrentUserAvatar()
        setRpmAvatar(result.avatar)
        setIsLoadingRpmAvatar(false)
      }
      loadRpmAvatar()
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
   * Navigate to RPM avatar creator
   */
  const handleOpenRpmAvatarCreator = useCallback(() => {
    navigation.navigate('AvatarCreator')
  }, [navigation])

  /**
   * Remove RPM avatar from profile
   */
  const handleRemoveRpmAvatar = useCallback(async () => {
    await warningFeedback()

    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your avatar?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsSavingAvatar(true)
            const result = await deleteCurrentUserAvatar()
            if (result.success) {
              await successFeedback()
              setRpmAvatar(null)
            } else {
              await errorFeedback()
              Alert.alert('Error', result.error || 'Failed to remove avatar')
            }
            setIsSavingAvatar(false)
          },
        },
      ],
      { cancelable: true }
    )
  }, [])

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
          tintColor="#007AFF"
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
          {isLoadingRpmAvatar ? (
            <View style={styles.avatarLoading}>
              <LoadingSpinner message="Loading avatar..." />
            </View>
          ) : rpmAvatar ? (
            <View style={styles.avatarConfigured} testID="profile-rpm-avatar-preview">
              <LargeAvatarPreview
                avatarId={rpmAvatar.avatarId}
                fullBody
              />
              <View style={styles.rpmAvatarInfo}>
                <Text style={styles.rpmAvatarLabel}>Ready Player Me Avatar</Text>
              </View>
              <View style={styles.avatarActions}>
                <Button
                  title="Edit Avatar"
                  onPress={handleOpenRpmAvatarCreator}
                  size="small"
                  disabled={isSavingAvatar}
                  testID="profile-edit-rpm-avatar-button"
                />
                <OutlineButton
                  title="Remove"
                  onPress={handleRemoveRpmAvatar}
                  size="small"
                  disabled={isSavingAvatar}
                  testID="profile-remove-rpm-avatar-button"
                />
              </View>
            </View>
          ) : (
            <View style={styles.avatarEmpty} testID="profile-avatar-empty">
              <View style={styles.avatarPlaceholderIcon}>
                <Text style={styles.avatarPlaceholderEmoji}>👤</Text>
              </View>
              <Text style={styles.avatarEmptyText}>
                Create your personalized avatar using Ready Player Me.
                Customize your face, body, hair, and clothing!
              </Text>
              <Button
                title="Create Avatar"
                onPress={handleOpenRpmAvatarCreator}
                disabled={isSavingAvatar}
                testID="profile-create-avatar-button"
              />
            </View>
          )}
        </View>
      </View>

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

      {/* Replay Tutorial Section */}
      <View style={styles.section} testID="profile-replay-tutorial-section">
        <Text style={styles.sectionTitle}>Replay Tutorial</Text>
        <Text style={styles.avatarDescription}>
          Re-watch helpful tips for using Love Ledger features
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

      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <DangerButton
          title="Sign Out"
          onPress={handleSignOut}
          loading={isSigningOut}
          disabled={isSigningOut}
          fullWidth
          testID="profile-sign-out-button"
        />
      </View>

      {/* App Info Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Love Ledger</Text>
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
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
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
  rpmAvatarInfo: {
    paddingHorizontal: 12,
  },
  rpmAvatarLabel: {
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
  footerVersion: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
})