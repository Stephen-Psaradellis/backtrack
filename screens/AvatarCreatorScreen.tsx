/**
 * AvatarCreatorScreen
 *
 * Screen for creating and editing avatars using Ready Player Me.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import {
  ReadyPlayerMeCreator,
  RPMAvatarPreview,
  XLAvatarPreview,
  toStoredAvatar,
  type RPMAvatarData,
  type StoredAvatar,
} from '../components/ReadyPlayerMe'
import {
  saveCurrentUserAvatar,
  loadCurrentUserAvatar,
} from '../lib/avatarService'

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'preview' | 'creator'

// ============================================================================
// Component
// ============================================================================

export function AvatarCreatorScreen(): JSX.Element {
  const navigation = useNavigation()
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [avatar, setAvatar] = useState<StoredAvatar | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load existing avatar on mount
  useEffect(() => {
    async function loadAvatar() {
      setIsLoading(true)
      const result = await loadCurrentUserAvatar()
      if (result.avatar) {
        setAvatar(result.avatar)
      }
      setIsLoading(false)
    }
    loadAvatar()
  }, [])

  // Handle avatar creation complete
  const handleAvatarCreated = useCallback(async (data: RPMAvatarData) => {
    console.log('[AvatarCreatorScreen] Avatar created:', data)

    // Convert to stored format
    const storedAvatar = toStoredAvatar(data)
    setAvatar(storedAvatar)
    setViewMode('preview')

    // Save to database
    setIsSaving(true)
    const result = await saveCurrentUserAvatar(storedAvatar)
    setIsSaving(false)

    if (result.success) {
      Alert.alert(
        'Avatar Created!',
        'Your avatar has been saved to your profile.',
        [{ text: 'OK' }]
      )
    } else {
      Alert.alert(
        'Avatar Created',
        `Your avatar was created but could not be saved: ${result.error}`,
        [{ text: 'OK' }]
      )
    }
  }, [])

  // Handle close/cancel
  const handleClose = useCallback(() => {
    if (avatar) {
      // Return to preview mode
      setViewMode('preview')
    } else {
      // Go back
      navigation.goBack()
    }
  }, [avatar, navigation])

  // Handle create new avatar
  const handleCreateNew = useCallback(() => {
    setViewMode('creator')
  }, [])

  // Handle edit existing avatar
  const handleEdit = useCallback(() => {
    setViewMode('creator')
  }, [])

  // Render creator mode
  if (viewMode === 'creator') {
    return (
      <ReadyPlayerMeCreator
        onAvatarCreated={handleAvatarCreated}
        onClose={handleClose}
        config={{
          subdomain: 'demo', // TODO: Replace with your subdomain
          bodyType: 'fullbody',
          quickStart: true,
        }}
      />
    )
  }

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your avatar...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Render preview mode
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Avatar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.savingText}>Saving avatar...</Text>
        </View>
      )}

      <View style={styles.content}>
        {avatar ? (
          <>
            {/* Avatar preview */}
            <View style={styles.avatarContainer}>
              <XLAvatarPreview
                avatarId={avatar.avatarId}
                fullBody
                testID="avatar-preview"
              />
            </View>

            {/* Avatar info */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Avatar ID</Text>
              <Text style={styles.infoValue}>{avatar.avatarId}</Text>

              <Text style={styles.infoLabel}>Body Type</Text>
              <Text style={styles.infoValue}>{avatar.bodyType}</Text>

              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{avatar.gender}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEdit}
              >
                <Text style={styles.editButtonText}>Edit Avatar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateNew}
              >
                <Text style={styles.createButtonText}>Create New</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* No avatar - prompt to create */}
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>?</Text>
              </View>
              <Text style={styles.emptyTitle}>No Avatar Yet</Text>
              <Text style={styles.emptyDescription}>
                Create your personalized avatar using Ready Player Me.
                You can customize your face, body, hair, and clothing.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateNew}
            >
              <Text style={styles.createButtonText}>Create Avatar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  savingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 48,
    color: '#ccc',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
})

export default AvatarCreatorScreen
