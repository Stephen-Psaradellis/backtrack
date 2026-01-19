/**
 * Avatar Creation Step (Onboarding)
 *
 * Avatar creation step for onboarding using the new 2D avatar system.
 * Users can fully customize their avatar appearance.
 */

import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StoredAvatar2D } from '../avatar2d/types';
import { Avatar2DCreator } from '../avatar2d';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarCreationStepProps {
  /** Initial avatar config if editing */
  initialAvatar?: StoredAvatar2D | null;
  /** Called when avatar is created */
  onComplete: (avatar: StoredAvatar2D) => void;
  /** Called when user wants to skip */
  onSkip?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvatarCreationStep({
  initialAvatar,
  onComplete,
  onSkip,
}: AvatarCreationStepProps): React.JSX.Element {
  /**
   * Handle avatar creation complete
   */
  const handleComplete = useCallback((avatar: StoredAvatar2D) => {
    onComplete(avatar);
  }, [onComplete]);

  /**
   * Handle cancel/skip
   */
  const handleCancel = useCallback(() => {
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  return (
    <SafeAreaView style={styles.container} testID="onboarding-avatar-step">
      <Avatar2DCreator
        initialConfig={initialAvatar?.config}
        onComplete={handleComplete}
        onCancel={onSkip ? handleCancel : undefined}
      />
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default AvatarCreationStep;
