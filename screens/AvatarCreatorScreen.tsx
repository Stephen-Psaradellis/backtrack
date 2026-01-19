/**
 * AvatarCreatorScreen
 *
 * Full-screen avatar creator for editing the user's own avatar.
 * Uses the 2D component-based avatar system.
 */

import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View, StatusBar } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Avatar2DCreator, type StoredAvatar2D } from '../components/avatar2d';
import { saveCurrentUserAvatar } from '../lib/avatar2d/storage';
import { darkTheme } from '../constants/glassStyles';
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

  /**
   * Handle avatar save
   */
  const handleComplete = useCallback(
    async (avatar: StoredAvatar2D) => {
      if (isSaving) return;

      setIsSaving(true);

      try {
        // Save to local storage
        await saveCurrentUserAvatar(avatar);
        // Navigate back
        navigation.goBack();
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
      <StatusBar barStyle="light-content" />
      <Avatar2DCreator
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
    backgroundColor: darkTheme.background,
  },
});
