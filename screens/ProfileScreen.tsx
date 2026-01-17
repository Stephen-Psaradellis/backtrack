/**
 * ProfileScreen
 *
 * User profile management screen for the Backtrack app.
 * Modern dark theme with glassmorphism design.
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
  StatusBar,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { GlobalHeader } from '../components/navigation/GlobalHeader'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import {
  darkTheme,
  darkGradients,
  glassStyles,
  darkButtonStyles,
  darkTypography,
  darkLayout,
} from '../constants/glassStyles'
import { colors } from '../constants/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
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
      <View style={styles.container} testID="profile-loading">
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Loading profile..." fullScreen />
        </View>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FloatingActionButtons testID="profile-floating-actions" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[400]}
            progressBackgroundColor={darkTheme.surface}
            testID="profile-refresh-control"
          />
        }
        showsVerticalScrollIndicator={false}
        testID="profile-screen"
      >
      {/* Hero Header with Gradient */}
      <LinearGradient
        colors={[colors.primary[500], colors.accent[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Decorative circles */}
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />

        {/* Avatar */}
        <View style={styles.heroAvatarContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
            style={styles.avatarRing}
          >
            <View style={styles.avatarPlaceholder} testID="profile-avatar-placeholder">
              <Text style={styles.avatarText}>
                {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
              </Text>
            </View>
          </LinearGradient>

          {/* Verified badge */}
          {profile?.is_verified && (
            <View style={styles.verifiedBadgeOverlay}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            </View>
          )}
        </View>

        {/* Name and Email */}
        <Text style={styles.heroName}>{userDisplayName}</Text>
        <View style={styles.heroEmailRow}>
          <Text style={styles.heroEmail}>{userEmail}</Text>
        </View>

        {/* Member since badge */}
        <View style={styles.memberBadge}>
          <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.memberBadgeText}>Member since {memberSince}</Text>
        </View>
      </LinearGradient>

      {/* Verification Prompt for Non-Verified Users */}
      {!profile?.is_verified && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.verifyCard}
            onPress={handleStartVerification}
            activeOpacity={0.8}
            testID="profile-verification-prompt"
          >
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
              style={styles.verifyCardGradient}
            >
              <View style={styles.verifyIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              </View>
              <View style={styles.verifyContent}>
                <Text style={styles.verifyTitle}>Get Verified</Text>
                <Text style={styles.verifySubtitle}>Build trust with other users</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Profile Information</Text>
        </View>

        <View style={[glassStyles.card, styles.glassCard]}>
          {/* Error Banner */}
          {errors.general && (
            <View style={styles.errorBanner} testID="profile-error-banner">
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
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
                  placeholderTextColor={darkTheme.textMuted}
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
                  <TouchableOpacity
                    style={[darkButtonStyles.ghost, darkButtonStyles.small]}
                    onPress={handleCancelEditing}
                    disabled={isSaving}
                    testID="profile-cancel-edit-button"
                  >
                    <Text style={[darkButtonStyles.ghostText, darkButtonStyles.smallText]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, darkButtonStyles.small]}
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                    testID="profile-save-button"
                  >
                    <LinearGradient
                      colors={[colors.primary[500], colors.primary[600]]}
                      style={styles.saveButtonGradient}
                    >
                      <Text style={[darkButtonStyles.primaryText, darkButtonStyles.smallText]}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
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
                  <Ionicons name="pencil" size={14} color={colors.primary[400]} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Email (read-only) */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userEmail}</Text>
          </View>
        </View>
      </View>

      {/* My Avatar Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>My Avatar</Text>
        </View>

        <View style={[glassStyles.card, styles.glassCard]}>
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
                <LgAvatarSnapshot avatar={userAvatar} />
                <TouchableOpacity
                  style={styles.editAvatarButton}
                  onPress={handleOpenAvatarCreator}
                  disabled={isSavingAvatar}
                  testID="profile-edit-avatar-button"
                >
                  <LinearGradient
                    colors={[colors.primary[500], colors.primary[600]]}
                    style={styles.editAvatarGradient}
                  >
                    <Ionicons name="brush" size={16} color="#FFF" />
                    <Text style={styles.editAvatarText}>Edit Avatar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.avatarEmpty} testID="profile-avatar-empty">
                <LinearGradient
                  colors={['rgba(255,107,71,0.15)', 'rgba(139,92,246,0.15)']}
                  style={styles.avatarEmptyGradient}
                >
                  <Ionicons name="person-add" size={40} color={colors.primary[400]} />
                </LinearGradient>
                <Text style={styles.avatarEmptyText}>
                  Create your personalized avatar
                </Text>
                <Text style={styles.avatarEmptySubtext}>
                  Customize your face, body, hair, and clothing!
                </Text>
                <TouchableOpacity
                  style={styles.createAvatarButton}
                  onPress={handleOpenAvatarCreator}
                  disabled={isSavingAvatar}
                  testID="profile-create-avatar-button"
                >
                  <LinearGradient
                    colors={[colors.primary[500], colors.accent[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createAvatarGradient}
                  >
                    <Text style={styles.createAvatarText}>Create Avatar</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Verification Photos Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="camera-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Verification Photos</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <Text style={styles.avatarDescription}>
            Photos used to verify your identity when creating posts
          </Text>
          <ProfilePhotoGallery
            maxPhotos={5}
            testID="profile-photo-gallery"
          />
        </View>
      </View>

      {/* My Location Streaks Section */}
      <View style={styles.section} testID="profile-streaks-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="flame-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>My Location Streaks</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
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
            <View style={styles.emptyStateContainer}>
              <Ionicons name="flame" size={32} color={darkTheme.textMuted} />
              <Text style={styles.emptyText}>No streaks yet</Text>
              <Text style={styles.emptySubtext}>Visit locations regularly to build streaks!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Regulars Mode Section */}
      <View style={styles.section} testID="profile-regulars-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Regulars Mode</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <RegularsModeToggle />
        </View>
      </View>

      {/* Fellow Regulars Section */}
      <View style={styles.section} testID="profile-fellow-regulars-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="heart-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Fellow Regulars</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <Text style={styles.avatarDescription}>
            People who visit the same spots as you
          </Text>
          <FellowRegularsList showLocations limit={5} />
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.section} testID="profile-notification-settings-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Notifications</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <NotificationSettings />
        </View>
      </View>

      <View style={styles.section} testID="profile-location-tracking-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Location Tracking</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <LocationTrackingSettings testID="profile-location-tracking" />
        </View>
      </View>

      {/* Replay Tutorial Section */}
      <View style={styles.section} testID="profile-replay-tutorial-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="school-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Replay Tutorial</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <Text style={styles.avatarDescription}>
            Re-watch helpful tips for using Backtrack features
          </Text>
          <View style={styles.replayButtonsContainer}>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={() => handleReplayTutorial('post_creation')}
              testID="profile-replay-post-creation-button"
            >
              <Ionicons name="create-outline" size={18} color={darkTheme.textSecondary} />
              <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.post_creation}</Text>
              <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={() => handleReplayTutorial('ledger_browsing')}
              testID="profile-replay-ledger-browsing-button"
            >
              <Ionicons name="book-outline" size={18} color={darkTheme.textSecondary} />
              <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.ledger_browsing}</Text>
              <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={() => handleReplayTutorial('selfie_verification')}
              testID="profile-replay-selfie-verification-button"
            >
              <Ionicons name="camera-outline" size={18} color={darkTheme.textSecondary} />
              <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.selfie_verification}</Text>
              <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={() => handleReplayTutorial('messaging')}
              testID="profile-replay-messaging-button"
            >
              <Ionicons name="chatbubble-outline" size={18} color={darkTheme.textSecondary} />
              <Text style={styles.tutorialButtonText}>{TUTORIAL_FEATURE_LABELS.messaging}</Text>
              <Ionicons name="play-circle-outline" size={18} color={colors.primary[400]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section} testID="profile-legal-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Legal</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <TouchableOpacity
            style={styles.legalLink}
            onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
            testID="profile-privacy-policy-link"
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
            testID="profile-terms-link"
          >
            <View style={styles.legalLinkContent}>
              <Ionicons name="document-outline" size={18} color={darkTheme.textSecondary} />
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={darkTheme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Developer Tools Section (Dev Only) */}
      {__DEV__ && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="code-slash-outline" size={20} color={colors.accent[400]} />
            <Text style={styles.sectionTitle}>Developer Tools</Text>
          </View>
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => navigation.navigate('WebGL3DTest')}
            testID="profile-webgl-test-button"
          >
            <LinearGradient
              colors={[colors.accent[600], colors.accent[800]]}
              style={styles.devButtonGradient}
            >
              <View style={styles.devButtonContent}>
                <Ionicons name="cube-outline" size={22} color={colors.accent[300]} />
                <View style={styles.devButtonTextContainer}>
                  <Text style={styles.devButtonText}>Test 3D WebGL</Text>
                  <Text style={styles.devButtonHint}>Task 1: WebView POC</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.accent[300]} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

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
            testID="profile-sign-out-button"
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
            testID="profile-delete-account-button"
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
// STYLES - Modern Dark Theme with Glassmorphism
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
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

  // Hero Gradient Header
  heroGradient: {
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecor1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroAvatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  verifiedBadgeOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: darkTheme.background,
    borderRadius: 14,
    padding: 2,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEmail: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
  },
  memberBadgeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },

  // Verification Card
  verifyCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  verifyCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  verifyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verifyContent: {
    flex: 1,
  },
  verifyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  verifySubtitle: {
    fontSize: 13,
    color: darkTheme.textMuted,
    marginTop: 2,
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
  glassCard: {
    padding: 20,
  },

  // Info rows
  infoRow: {
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: darkTheme.textMuted,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    color: darkTheme.textPrimary,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 107, 71, 0.1)',
    borderRadius: 8,
  },
  editLinkText: {
    fontSize: 14,
    color: colors.primary[400],
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 16,
  },

  // Edit mode
  editContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: darkTheme.textPrimary,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  saveButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  // Avatar section
  avatarDescription: {
    fontSize: 14,
    color: darkTheme.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  avatarSection: {
    marginTop: 8,
  },
  avatarLoading: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarConfigured: {
    alignItems: 'center',
    gap: 16,
  },
  editAvatarButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  editAvatarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  editAvatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  avatarEmptyGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    textAlign: 'center',
  },
  avatarEmptySubtext: {
    fontSize: 14,
    color: darkTheme.textMuted,
    textAlign: 'center',
    marginTop: -8,
  },
  createAvatarButton: {
    overflow: 'hidden',
    borderRadius: 14,
    marginTop: 8,
  },
  createAvatarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  createAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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

  // Dev tools
  devButton: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  devButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  devButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  devButtonTextContainer: {
    gap: 2,
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent[200],
  },
  devButtonHint: {
    fontSize: 12,
    color: colors.accent[400],
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
})