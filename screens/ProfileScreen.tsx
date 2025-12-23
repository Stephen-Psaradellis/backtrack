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
        setErrors({ general: error.message || 'Failed to update profile' })
      } else {
        setIsEditing(false)
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsSaving(false)
    }
  }, [displayName, updateProfile])

  /**
   * Handle sign out with confirmation
   */
  const handleSignOut = useCallback(async () => {
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
                Alert.alert('Error', 'Failed to sign out. Please try again.')
              }
              // Navigation will be handled automatically by auth state change
            } catch {
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
          Alert.alert('Error', error.message || 'Failed to save avatar')
        } else {
          setIsAvatarModalVisible(false)
          // Refresh profile to get updated avatar
          await refreshProfile()
        }
      } catch {
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
                Alert.alert('Error', error.message || 'Failed to remove avatar')
              } else {
                await refreshProfile()
              }
            } catch {
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
            <Text style={styles.modalTitle}>
              {currentAvatarConfig ? 'Edit Your Avatar' : 'Create Your Avatar'}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {/* Avatar Builder */}
          {isSavingAvatar ? (
            <View style={styles.modalLoading}>
              <LoadingSpinner message="Saving avatar..." />
            </View>
          ) : (
            <AvatarBuilder
              initialConfig={currentAvatarConfig || DEFAULT_AVATAR_CONFIG}
              onSave={handleSaveAvatar}
              onCancel={handleCloseAvatarBuilder}
              saveLabel={currentAvatarConfig ? 'Save Changes' : 'Create Avatar'}
              cancelLabel="Cancel"
              showRandomize={true}
              testID="profile-avatar-builder"
            />
          )}
        </SafeAreaView>
      </Modal>
    </ScrollView>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  // Header Section
  headerSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emailText: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Section Styles
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },

  // Info Row Styles
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Edit Styles
  editContainer: {
    marginTop: 8,
  },
  editLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editLinkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },

  // Input Styles
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F9F9F9',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
  },
  avatarDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
    marginTop: -8,
  },
  avatarConfigured: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  avatarEmpty: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarPlaceholderIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholderEmoji: {
    fontSize: 48,
  },
  avatarEmptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  modalCloseButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  modalHeaderSpacer: {
    minWidth: 60,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  footerVersion: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default ProfileScreen
