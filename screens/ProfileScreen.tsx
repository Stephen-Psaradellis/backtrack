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
  Modal,
  SafeAreaView,
} from 'react-native'

import { useAuth } from '../contexts/AuthContext'
import { successFeedback, errorFeedback, warningFeedback } from '../lib/haptics'
import { Button, DangerButton, OutlineButton } from '../components/Button'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { LargeAvatarPreview } from '../components/AvatarPreview'
import { AvatarBuilder } from '../components/AvatarBuilder'
import { AvatarConfig, DEFAULT_AVATAR_CONFIG } from '../types/avatar'
import { isValidAvatarConfig } from '../components/AvatarPreview'

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
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)

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
   * Open avatar builder modal
   */
  const handleOpenAvatarBuilder = useCallback(() => {
    setIsAvatarModalVisible(true)
  }, [])

  /**
   * Close avatar builder modal
   */
  const handleCloseAvatarBuilder = useCallback(() => {
    setIsAvatarModalVisible(false)
  }, [])

  /**
   * Save avatar to profile
   */
  const handleSaveAvatar = useCallback(
    async (avatarConfig: AvatarConfig) => {
      setIsSavingAvatar(true)

      try {
        const { error } = await updateProfile({
          own_avatar: avatarConfig,
        })

        if (error) {
          await errorFeedback()
          Alert.alert('Error', error.message || 'Failed to save avatar')
        } else {
          await successFeedback()
          setIsAvatarModalVisible(false)
          // Refresh profile to get updated avatar
          await refreshProfile()
        }
      } catch {
        await errorFeedback()
        Alert.alert('Error', 'An unexpected error occurred while saving avatar')
      } finally {
        setIsSavingAvatar(false)
      }
    },
    [updateProfile, refreshProfile]
  )

  /**
   * Delete/remove avatar from profile
   */
  const handleRemoveAvatar = useCallback(async () => {
    // Trigger warning haptic when showing destructive action confirmation
    await warningFeedback()

    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your avatar? This will affect matching.',
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
            try {
              const { error } = await updateProfile({
                own_avatar: null,
              })

              if (error) {
                await errorFeedback()
                Alert.alert('Error', error.message || 'Failed to remove avatar')
              } else {
                await successFeedback()
                await refreshProfile()
              }
            } catch {
              await errorFeedback()
              Alert.alert('Error', 'An unexpected error occurred')
            } finally {
              setIsSavingAvatar(false)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }, [updateProfile, refreshProfile])

  // Get current avatar config if it exists
  const currentAvatarConfig =
    profile?.own_avatar && isValidAvatarConfig(profile.own_avatar)
      ? (profile.own_avatar as AvatarConfig)
      : null

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

        <Text style={styles.emailText}>{userEmail}</Text>
      </View>

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
          {currentAvatarConfig ? (
            <View style={styles.avatarConfigured} testID="profile-avatar-preview">
              <LargeAvatarPreview config={currentAvatarConfig} />
              <View style={styles.avatarActions}>
                <Button
                  title="Edit Avatar"
                  onPress={handleOpenAvatarBuilder}
                  size="small"
                  disabled={isSavingAvatar}
                  testID="profile-edit-avatar-button"
                />
                <OutlineButton
                  title="Remove"
                  onPress={handleRemoveAvatar}
                  size="small"
                  disabled={isSavingAvatar}
                  testID="profile-remove-avatar-button"
                />
              </View>
            </View>
          ) : (
            <View style={styles.avatarEmpty} testID="profile-avatar-empty">
              <View style={styles.avatarPlaceholderIcon}>
                <Text style={styles.avatarPlaceholderEmoji}>👤</Text>
              </View>
              <Text style={styles.avatarEmptyText}>
                Create your avatar to help others recognize you and improve matching!
              </Text>
              <Button
                title="Create Avatar"
                onPress={handleOpenAvatarBuilder}
                disabled={isSavingAvatar}
                testID="profile-create-avatar-button"
              />
            </View>
          )}
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

      {/* Avatar Builder Modal */}
      <Modal
        visible={isAvatarModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseAvatarBuilder}
        testID="profile-avatar-modal"
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={handleCloseAvatarBuilder}
              style={styles.modalCloseButton}
              disabled={isSavingAvatar}
              testID="profile-avatar-modal-close"
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Your Avatar</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Avatar Builder */}
          <AvatarBuilder
            initialConfig={currentAvatarConfig || DEFAULT_AVATAR_CONFIG}
            onSave={handleSaveAvatar}
            isSaving={isSavingAvatar}
            testID="profile-avatar-builder"
          />
        </SafeAreaView>
      </Modal>
    </ScrollView>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
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
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emailText: {
    fontSize: 16,
    color: '#3C3C43',
    fontWeight: '500',
  },

  // Section Styles
  section: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 4,
  },

  // Info Row
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Edit Mode
  editContainer: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorBannerText: {
    color: '#C41C00',
    fontSize: 13,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  editLink: {
    padding: 4,
  },
  editLinkText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Avatar Section
  avatarDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  avatarSection: {
    marginTop: 12,
  },
  avatarConfigured: {
    alignItems: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  avatarEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  avatarPlaceholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholderEmoji: {
    fontSize: 32,
  },
  avatarEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 16,
    backgroundColor: '#F2F2F7',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3C43',
  },
  footerVersion: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalCloseButton: {
    padding: 8,
    width: 60,
  },
  modalCloseText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
  },
})