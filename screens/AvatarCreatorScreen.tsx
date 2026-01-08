/**
 * AvatarCreatorScreen
 *
 * Full-screen avatar creator for editing the user's own avatar.
 * Uses the 3D preset-based avatar system.
 */

import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AvatarCreator } from '../components/avatar/index';
import type { StoredAvatar } from '../components/avatar/types';
import { saveCurrentUserAvatar } from '../lib/avatar/storage';
import type { MainStackParamList } from '../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

type Props = NativeStackScreenProps<MainStackParamList, 'AvatarCreator'>;

// =============================================================================
// COMPONENT
// =============================================================================

export default function AvatarCreatorScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false);

  // Get initial avatar ID from route params or use default
  const initialAvatarId = route.params?.initialAvatarId;

  /**
   * Handle avatar save
   */
  const handleComplete = useCallback(
    async (avatar: StoredAvatar) => {
      if (isSaving) return;

      setIsSaving(true);

      try {
        // Save to profile
        const result = await saveCurrentUserAvatar(avatar);

        if (result.success) {
          // Navigate back
          navigation.goBack();
        } else {
          Alert.alert('Error', result.error || 'Failed to save avatar');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Error', `Failed to save avatar: ${message}`);
      } finally {
        setIsSaving(false);
      }
    },
    [navigation, isSaving]
  );

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <AvatarCreator
        initialAvatarId={initialAvatarId}
        mode="self"
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </View>
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
});
