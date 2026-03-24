/**
 * AvatarSelectionScreen
 *
 * Displays 2 generated avatar options side-by-side for the user to choose from.
 * After selection, saves the chosen avatar and navigates forward.
 */

import React, { useCallback, useState } from 'react'
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CommonActions } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { darkTheme } from '../constants/glassStyles'
import { colors } from '../constants/theme'
import type { MainStackParamList } from '../navigation/types'
import { useAuth } from '../contexts/AuthContext'
import { useAvatarGenerator } from '../hooks/useAvatarGenerator'
import { AvatarDisplay } from '../components/AvatarDisplay'
import { createStoredAvatar, type GeneratedAvatar } from '../types/avatar'

type Props = NativeStackScreenProps<MainStackParamList, 'AvatarSelection'>

export default function AvatarSelectionScreen({ navigation, route }: Props): React.JSX.Element {
  const { user, updateProfile } = useAuth()
  const avatarGen = useAvatarGenerator()

  const { avatars, traits, required } = route.params
  const isRequired = required ?? false
  const { width } = useWindowDimensions()

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selectedAvatar = selectedIndex !== null ? avatars[selectedIndex] : null

  const handleSave = useCallback(async () => {
    if (!selectedAvatar || !user?.id) return

    const storedAvatar = await avatarGen.save(selectedAvatar, user.id)
    if (!storedAvatar) {
      Alert.alert('Save Error', 'Failed to save avatar. Please try again.')
      return
    }

    const { error } = await updateProfile({ avatar: storedAvatar })
    if (error) {
      Alert.alert('Save Error', `Failed to save avatar: ${error.message}`)
      return
    }

    if (!isRequired) {
      navigation.goBack()
      // Also pop the AvatarCreator screen
      navigation.goBack()
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        })
      )
    }
  }, [selectedAvatar, user?.id, avatarGen, updateProfile, navigation, isRequired])

  const handleTryAgain = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  // Size avatars based on screen width
  const avatarSize = Math.min((width - 64) / 2, 160)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Avatar</Text>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Tap to select your favorite</Text>

      {/* Avatar Options */}
      <View style={styles.avatarsContainer}>
        {avatars.map((avatar, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.avatarOption,
              { width: avatarSize + 24, height: avatarSize + 24 },
              selectedIndex === index && styles.avatarOptionSelected,
            ]}
            onPress={() => setSelectedIndex(index)}
            activeOpacity={0.8}
            testID={`avatar-option-${index}`}
          >
            <AvatarDisplay
              avatar={createStoredAvatar(avatar)}
              size="lg"
              testID={`avatar-display-${index}`}
            />
            {selectedIndex === index && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={28} color={colors.primary[500]} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Error */}
      {avatarGen.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{avatarGen.error}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!selectedAvatar || avatarGen.isSaving) && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={!selectedAvatar || avatarGen.isSaving}
          activeOpacity={0.8}
          testID="use-avatar-button"
        >
          {avatarGen.isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Use This Avatar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleTryAgain}
          activeOpacity={0.7}
          testID="try-again-button"
        >
          <Ionicons name="refresh" size={18} color={darkTheme.textSecondary} />
          <Text style={styles.secondaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
    backgroundColor: darkTheme.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  avatarsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  avatarOption: {
    borderRadius: 20,
    backgroundColor: darkTheme.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: `${colors.primary[500]}15`,
  },
  checkBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: darkTheme.background,
    borderRadius: 14,
  },
  errorContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkTheme.glassBorder,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: darkTheme.textSecondary,
  },
})
