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
 * - Verification status and badge
 * - Profile data refresh on pull
 * - Navigation to Settings screen for preferences and account actions
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { FloatingActionButtons } from '../components/navigation/FloatingActionButtons'
import { SCREENS } from '../navigation/types'
import {
  darkTheme,
  darkGradients,
  glassStyles,
  darkButtonStyles,
  darkTypography,
  darkLayout,
} from '../constants/glassStyles'
import { colors, spacing } from '../constants/theme'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { successFeedback, errorFeedback } from '../lib/haptics'
import { captureException } from '../lib/sentry'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { AvatarDisplay } from '../components/AvatarDisplay'
import { loadCachedAvatar } from '../hooks/useAvatarGenerator'
import { hasGeneratedAvatar, createStoredAvatar, type StoredAvatar, type GeneratedAvatar } from '../types/avatar'
import { ProfilePhotoGallery } from '../components/ProfilePhotoGallery'
import { VerifiedBadge } from '../components/VerifiedBadge'
import { VerificationPrompt } from '../components/VerificationPrompt'
import { AchievementBadge } from '../components/AchievementBadge'
import { useAchievements } from '../hooks/useAchievements'
import { TrustProgress } from '../components/TrustProgress'
import { useTrustLevel } from '../hooks/useTrustLevel'

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
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()
  const {
    user,
    profile,
    signOut,
    updateProfile,
    refreshProfile,
    isLoading: authLoading,
  } = useAuth()
  const { trustLevel, trustPoints } = useTrustLevel()

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [userAvatar, setUserAvatar] = useState<GeneratedAvatar | null>(null)
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true)

  // Achievements
  const {
    earnedAchievements,
    totalCount,
    earnedCount,
    loading: achievementsLoading,
    leaderboard,
    leaderboardLoading,
    currentStreak,
    loadLeaderboard,
  } = useAchievements()

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Load avatar when screen comes into focus (to catch updates from avatar creator)
  useFocusEffect(
    useCallback(() => {
      async function loadAvatar() {
        setIsLoadingAvatar(true)
        try {
          // Try loading from profile first, then cache
          if (profile?.avatar?.generatedAvatar) {
            setUserAvatar(profile.avatar.generatedAvatar)
          } else {
            const cached = await loadCachedAvatar()
            setUserAvatar(cached)
          }
        } catch (err) {
          if (__DEV__) console.error('[ProfileScreen] Failed to load avatar:', err)
        } finally {
          setIsLoadingAvatar(false)
        }
      }
      loadAvatar()
      // Load leaderboard on screen focus
      loadLeaderboard().catch((err) => {
        if (__DEV__) console.error('[ProfileScreen] Failed to load leaderboard:', err)
      })
    }, [loadLeaderboard, profile?.avatar])
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
    } catch (error) {
      captureException(error, { operation: 'handleSaveProfile' })
      await errorFeedback()
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsSaving(false)
    }
  }, [displayName, updateProfile])

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
    showToast({
      message: 'Verification is completed when you create a post. The selfie you take helps verify your identity.',
      variant: 'info',
      duration: 5000,
    })
  }, [showToast])

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
      <FloatingActionButtons testID="profile-floating-actions" isVisible={false} />
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
      {/* Hero Header with Gradient - UX-008: use safe area insets instead of hardcoded paddingTop */}
      <LinearGradient
        colors={[colors.primary[500], colors.accent[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroGradient, { paddingTop: insets.top + 16 }]}
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
            accessibilityRole="button"
            accessibilityLabel="Get verified to build trust with other users"
            accessibilityHint="Double tap to learn about verification"
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

      {/* Trust Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Trust Level</Text>
        </View>
        <TrustProgress
          trustLevel={trustLevel}
          trustPoints={trustPoints}
          testID="profile-trust-progress"
        />
      </View>

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
                  accessibilityLabel="Display name"
                  accessibilityHint="Enter your display name, up to 50 characters"
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
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing"
                  >
                    <Text style={[darkButtonStyles.ghostText, darkButtonStyles.smallText]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, darkButtonStyles.small]}
                    onPress={handleSaveProfile}
                    disabled={isSaving}
                    testID="profile-save-button"
                    accessibilityRole="button"
                    accessibilityLabel={isSaving ? 'Saving changes' : 'Save display name changes'}
                    accessibilityState={{ disabled: isSaving }}
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
                  accessibilityRole="button"
                  accessibilityLabel="Edit display name"
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
                <AvatarDisplay
                  avatar={createStoredAvatar(userAvatar)}
                  size="lg"
                />
                <TouchableOpacity
                  style={styles.editAvatarButton}
                  onPress={handleOpenAvatarCreator}
                  disabled={isSavingAvatar}
                  testID="profile-create-avatar-button"
                >
                  <LinearGradient
                    colors={[colors.primary[500], colors.primary[600]]}
                    style={styles.editAvatarGradient}
                  >
                    <Ionicons name="brush" size={16} color="#FFF" />
                    <Text style={styles.editAvatarText}>Create Avatar</Text>
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

      {/* Streak Leaderboard Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flame" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Streak Leaderboard</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          {/* Current User's Streak */}
          <View style={styles.currentStreakContainer}>
            <View style={styles.currentStreakIcon}>
              <Ionicons name="flame" size={32} color="#FF6347" />
            </View>
            <View style={styles.currentStreakText}>
              <Text style={styles.currentStreakLabel}>Your Current Streak</Text>
              <Text style={styles.currentStreakValue}>{currentStreak} days</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Leaderboard */}
          <Text style={styles.leaderboardTitle}>Top Streakers</Text>
          {leaderboardLoading ? (
            <View style={styles.leaderboardLoading}>
              <LoadingSpinner message="Loading leaderboard..." />
            </View>
          ) : leaderboard.length > 0 ? (
            <View style={styles.leaderboardList} testID="profile-leaderboard">
              {leaderboard.map((entry, index) => (
                <View key={entry.user_id} style={styles.leaderboardEntry}>
                  <View style={styles.leaderboardRank}>
                    <Text style={[
                      styles.leaderboardRankText,
                      index === 0 && styles.leaderboardRankGold,
                      index === 1 && styles.leaderboardRankSilver,
                      index === 2 && styles.leaderboardRankBronze,
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardName} numberOfLines={1}>
                      {entry.display_name || 'Anonymous'}
                    </Text>
                    {entry.location_name && (
                      <Text style={styles.leaderboardLocation} numberOfLines={1}>
                        at {entry.location_name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.leaderboardStreak}>
                    <Ionicons name="flame" size={16} color="#FF6347" />
                    <Text style={styles.leaderboardStreakText}>{entry.current_streak}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.leaderboardEmpty}>
              <Ionicons name="flame-outline" size={48} color="rgba(255, 255, 255, 0.15)" />
              <Text style={styles.leaderboardEmptyText}>
                No streaks yet
              </Text>
              <Text style={styles.leaderboardEmptySubtext}>
                Check in daily to build your streak!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Achievements Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy-outline" size={20} color={colors.primary[400]} />
          <Text style={styles.sectionTitle}>Achievements</Text>
        </View>
        <View style={[glassStyles.card, styles.glassCard]}>
          <View style={styles.achievementHeader}>
            <Text style={styles.achievementCount}>
              {earnedCount}/{totalCount} Earned
            </Text>
            {!achievementsLoading && earnedCount > 0 && (
              <View style={styles.achievementProgress}>
                <View style={styles.achievementProgressBar}>
                  <View
                    style={[
                      styles.achievementProgressFill,
                      { width: `${(earnedCount / totalCount) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {achievementsLoading ? (
            <View style={styles.achievementLoading}>
              <LoadingSpinner message="Loading achievements..." />
            </View>
          ) : earnedAchievements.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementScroll}
              testID="profile-achievements-scroll"
            >
              {earnedAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementBadgeWrapper}>
                  <AchievementBadge
                    achievement={achievement}
                    size="medium"
                    showProgress={false}
                    testID={`achievement-badge-${achievement.id}`}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.achievementEmpty}>
              <Ionicons name="trophy" size={48} color="rgba(255, 255, 255, 0.15)" />
              <Text style={styles.achievementEmptyText}>
                No achievements yet
              </Text>
              <Text style={styles.achievementEmptySubtext}>
                Explore, connect, and create posts to earn badges!
              </Text>
            </View>
          )}
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

      {/* Settings Row - navigate to SettingsScreen */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={() => navigation.navigate(SCREENS.Settings)}
          style={styles.settingsRow}
          activeOpacity={0.7}
          testID="profile-settings-button"
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          accessibilityHint="Double tap to access app settings and preferences"
        >
          <Ionicons name="settings-outline" size={22} color={darkTheme.textSecondary} />
          <Text style={styles.settingsText}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={darkTheme.textMuted} />
        </TouchableOpacity>
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
    paddingBottom: spacing[10],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.background,
  },

  // Hero Gradient Header - UX-008: paddingTop now applied dynamically via insets
  heroGradient: {
    paddingBottom: spacing[8],
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
    marginBottom: spacing[4],
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: spacing[1],
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
    bottom: spacing[1],
    right: spacing[1],
    backgroundColor: darkTheme.background,
    borderRadius: 14,
    padding: spacing[0.5],
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing[1],
  },
  heroEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  heroEmail: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    marginTop: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
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
    padding: spacing[4],
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
    marginRight: spacing[3],
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
    marginTop: spacing[0.5],
  },

  // Sections
  section: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  glassCard: {
    padding: spacing[5],
  },

  // Info rows
  infoRow: {
    marginBottom: spacing[1],
  },
  infoLabel: {
    fontSize: 11,
    color: darkTheme.textMuted,
    fontWeight: '600',
    marginBottom: spacing[1.5],
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
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
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
    marginVertical: spacing[4],
  },

  // Edit mode
  editContainer: {
    gap: spacing[3],
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
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
    marginTop: spacing[1],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: spacing[3.5],
    marginBottom: spacing[4],
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
    gap: spacing[3],
    marginTop: spacing[2],
  },
  saveButton: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  saveButtonGradient: {
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    borderRadius: 10,
  },

  // Avatar section
  avatarDescription: {
    fontSize: 14,
    color: darkTheme.textMuted,
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  avatarSection: {
    marginTop: spacing[2],
  },
  avatarLoading: {
    paddingVertical: spacing[10],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarConfigured: {
    alignItems: 'center',
    gap: spacing[4],
  },
  editAvatarButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  editAvatarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: 12,
  },
  editAvatarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarEmpty: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[4],
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
    marginTop: spacing[2] * -1,
  },
  createAvatarButton: {
    overflow: 'hidden',
    borderRadius: 14,
    marginTop: spacing[2],
  },
  createAvatarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[7],
    borderRadius: 14,
  },
  createAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Achievements section
  achievementHeader: {
    marginBottom: spacing[4],
  },
  achievementCount: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginBottom: spacing[2],
  },
  achievementProgress: {
    marginTop: spacing[2],
  },
  achievementProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: colors.primary[400],
    borderRadius: 3,
  },
  achievementLoading: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  achievementScroll: {
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  achievementBadgeWrapper: {
    marginRight: spacing[2],
  },
  achievementEmpty: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  achievementEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textSecondary,
    marginTop: spacing[3],
  },
  achievementEmptySubtext: {
    fontSize: 14,
    color: darkTheme.textMuted,
    textAlign: 'center',
    marginTop: spacing[1.5],
    paddingHorizontal: spacing[6],
  },

  // Leaderboard section
  currentStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 99, 71, 0.1)',
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 99, 71, 0.2)',
  },
  currentStreakIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 99, 71, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  currentStreakText: {
    flex: 1,
  },
  currentStreakLabel: {
    fontSize: 13,
    color: darkTheme.textMuted,
    fontWeight: '500',
    marginBottom: spacing[1],
  },
  currentStreakValue: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  leaderboardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leaderboardLoading: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  leaderboardList: {
    gap: spacing[2],
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  leaderboardRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  leaderboardRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: darkTheme.textSecondary,
  },
  leaderboardRankGold: {
    color: '#FFD700',
  },
  leaderboardRankSilver: {
    color: '#C0C0C0',
  },
  leaderboardRankBronze: {
    color: '#CD7F32',
  },
  leaderboardInfo: {
    flex: 1,
    marginRight: spacing[2],
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginBottom: spacing[0.5],
  },
  leaderboardLocation: {
    fontSize: 12,
    color: darkTheme.textMuted,
  },
  leaderboardStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(255, 99, 71, 0.15)',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: 12,
  },
  leaderboardStreakText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6347',
  },
  leaderboardEmpty: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  leaderboardEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textSecondary,
    marginTop: spacing[3],
  },
  leaderboardEmptySubtext: {
    fontSize: 14,
    color: darkTheme.textMuted,
    textAlign: 'center',
    marginTop: spacing[1.5],
  },

  // Settings row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    borderRadius: 16,
    padding: spacing[4.5],
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textPrimary,
    marginLeft: spacing[3.5],
  },
})
