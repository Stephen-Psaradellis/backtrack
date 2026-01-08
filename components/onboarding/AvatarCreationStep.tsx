/**
 * Avatar Creation Step (Onboarding)
 *
 * Simplified avatar selection step for onboarding.
 * Users select from preset avatars to create their profile avatar.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AvatarConfig, StoredAvatar } from '../avatar/types';
import { createStoredAvatar, LOCAL_AVATAR_PRESETS } from '../../lib/avatar/defaults';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarCreationStepProps {
  /** Initial avatar ID if editing */
  initialAvatarId?: string;
  /** Called when avatar is created */
  onComplete: (avatar: StoredAvatar) => void;
  /** Called when user wants to skip */
  onSkip?: () => void;
  /** Title override */
  title?: string;
  /** Subtitle override */
  subtitle?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvatarCreationStep({
  initialAvatarId,
  onComplete,
  onSkip,
  title = 'Create Your Avatar',
  subtitle = 'Choose an avatar that looks like you',
}: AvatarCreationStepProps): React.JSX.Element {
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    initialAvatarId || LOCAL_AVATAR_PRESETS[0].id
  );

  /**
   * Handle avatar selection
   */
  const handleSelectAvatar = useCallback((avatarId: string) => {
    setSelectedAvatarId(avatarId);
  }, []);

  /**
   * Handle continue
   */
  const handleContinue = useCallback(() => {
    const storedAvatar = createStoredAvatar(selectedAvatarId);
    onComplete(storedAvatar);
  }, [selectedAvatarId, onComplete]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Avatar Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {LOCAL_AVATAR_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.avatarCard,
                selectedAvatarId === preset.id && styles.avatarCardSelected,
              ]}
              onPress={() => handleSelectAvatar(preset.id)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarPreview}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={64}
                  color={selectedAvatarId === preset.id ? '#6366F1' : '#9CA3AF'}
                />
              </View>
              <Text
                style={[
                  styles.avatarName,
                  selectedAvatarId === preset.id && styles.avatarNameSelected,
                ]}
                numberOfLines={1}
              >
                {preset.name}
              </Text>
              <Text style={styles.avatarMeta}>
                {preset.ethnicity} • {preset.gender === 'M' ? 'Male' : 'Female'}
              </Text>
              {selectedAvatarId === preset.id && (
                <View style={styles.checkmark}>
                  <MaterialCommunityIcons name="check-circle" size={24} color="#6366F1" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  avatarCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  avatarNameSelected: {
    color: '#4F46E5',
  },
  avatarMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  continueButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default AvatarCreationStep;
