/**
 * AvatarSnapshot Component
 *
 * Displays avatar snapshots (pre-rendered 3D images) with loading states.
 *
 * Features:
 * - Displays cached 3D avatar snapshots from Supabase Storage
 * - Shows loading placeholder while generating/fetching
 * - Simple placeholder fallback on error
 * - Multiple size presets for different contexts
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AvatarSnapshot avatar={avatarConfig} size="md" />
 *
 * // In a post card
 * <AvatarSnapshot avatar={post.target_avatar} size="md" />
 *
 * // In chat (smaller size)
 * <AvatarSnapshot avatar={senderAvatar} size="sm" />
 * ```
 */

import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Text,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAvatarSnapshot } from '../../hooks/useAvatarSnapshot';
import { AVATAR_SIZES, type AvatarSize, type AvatarConfig, type StoredAvatar } from '../avatar/types';
import { SNAPSHOT_SIZES, type SnapshotSizePreset } from '../../lib/avatar/snapshotService';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarSnapshotProps {
  /**
   * Avatar configuration or stored avatar to display.
   * If null/undefined, shows placeholder.
   */
  avatar: AvatarConfig | StoredAvatar | null | undefined;

  /**
   * Size preset for the avatar display.
   * Maps to both display size and snapshot resolution.
   * @default 'md'
   */
  size?: AvatarSize;

  /**
   * Additional container style.
   */
  style?: ViewStyle;

  /**
   * Test ID for testing.
   */
  testID?: string;

  /**
   * Called when snapshot is successfully loaded.
   */
  onLoad?: () => void;

  /**
   * Called when snapshot fails to load.
   */
  onError?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Map avatar display sizes to snapshot presets.
 * Smaller sizes use smaller snapshots for performance.
 */
const SIZE_TO_SNAPSHOT_PRESET: Record<AvatarSize, SnapshotSizePreset> = {
  xs: 'thumbnail',  // 32px display -> 128px snapshot
  sm: 'small',      // 48px display -> 256px snapshot
  md: 'medium',     // 80px display -> 512px snapshot
  lg: 'medium',     // 120px display -> 512px snapshot
  xl: 'large',      // 200px display -> 1024px snapshot
};

/**
 * Default placeholder background color
 */
const PLACEHOLDER_BG = '#E5E7EB';

// =============================================================================
// PLACEHOLDER COMPONENT
// =============================================================================

interface PlaceholderProps {
  size: AvatarSize;
  style?: ViewStyle;
  testID?: string;
}

function AvatarPlaceholder({ size, style, testID }: PlaceholderProps): React.JSX.Element {
  const pixelSize = AVATAR_SIZES[size];
  const iconSize = Math.max(pixelSize * 0.5, 16);

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize * 0.1,
        },
        style,
      ]}
      testID={testID}
    >
      <MaterialCommunityIcons
        name="account-circle-outline"
        size={iconSize}
        color="#9CA3AF"
      />
    </View>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract AvatarConfig from various input types
 */
function extractConfig(
  avatar: AvatarConfig | StoredAvatar | null | undefined
): AvatarConfig | null {
  if (!avatar) return null;

  // StoredAvatar has a config property
  if ('config' in avatar && avatar.config) {
    return avatar.config as AvatarConfig;
  }

  // AvatarConfig has avatarId directly
  if ('avatarId' in avatar) {
    return avatar as AvatarConfig;
  }

  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AvatarSnapshot = memo(function AvatarSnapshot({
  avatar,
  size = 'md',
  style,
  testID,
  onLoad,
  onError,
}: AvatarSnapshotProps): React.JSX.Element {
  const [imageError, setImageError] = useState(false);

  // Extract config from avatar
  const config = extractConfig(avatar);

  // Get snapshot preset based on size
  const snapshotPreset = SIZE_TO_SNAPSHOT_PRESET[size];

  // Fetch snapshot URL
  const {
    url,
    isLoading,
    error,
  } = useAvatarSnapshot(config, {
    skip: !config,
    preset: snapshotPreset,
  });

  // Resolve pixel size
  const pixelSize = AVATAR_SIZES[size];

  // Handle image load error
  const handleImageError = useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  // ---------------------------------------------------------------------------
  // Render: No config
  // ---------------------------------------------------------------------------

  if (!config) {
    return (
      <AvatarPlaceholder
        size={size}
        style={style}
        testID={testID}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Loading state
  // ---------------------------------------------------------------------------

  if (isLoading && !url) {
    return (
      <View
        style={[
          styles.container,
          {
            width: pixelSize,
            height: pixelSize,
            borderRadius: pixelSize * 0.1,
          },
          style,
        ]}
        testID={testID}
      >
        <ActivityIndicator
          size="small"
          color="#9CA3AF"
        />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Error or no URL - show placeholder
  // ---------------------------------------------------------------------------

  if (error || !url || imageError) {
    return (
      <AvatarPlaceholder
        size={size}
        style={style}
        testID={testID}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Snapshot image
  // ---------------------------------------------------------------------------

  return (
    <View
      style={[
        styles.imageContainer,
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize * 0.1,
        },
        style,
      ]}
      testID={testID}
    >
      <Image
        source={{ uri: url }}
        style={styles.image}
        resizeMode="cover"
        onLoad={handleImageLoad}
        onError={handleImageError}
        testID={testID ? `${testID}-image` : undefined}
      />
    </View>
  );
});

// =============================================================================
// SIZE PRESET COMPONENTS
// =============================================================================

type PresetProps = Omit<AvatarSnapshotProps, 'size'>;

/**
 * Extra small avatar snapshot (32px) - for inline text, badges
 */
export function XSAvatarSnapshot(props: PresetProps): React.JSX.Element {
  return <AvatarSnapshot {...props} size="xs" />;
}

/**
 * Small avatar snapshot (48px) - for list items, chat messages
 */
export function SmAvatarSnapshot(props: PresetProps): React.JSX.Element {
  return <AvatarSnapshot {...props} size="sm" />;
}

/**
 * Medium avatar snapshot (80px) - for cards, post previews
 */
export function MdAvatarSnapshot(props: PresetProps): React.JSX.Element {
  return <AvatarSnapshot {...props} size="md" />;
}

/**
 * Large avatar snapshot (120px) - for profile sections
 */
export function LgAvatarSnapshot(props: PresetProps): React.JSX.Element {
  return <AvatarSnapshot {...props} size="lg" />;
}

/**
 * Extra large avatar snapshot (200px) - for detail views
 */
export function XLAvatarSnapshot(props: PresetProps): React.JSX.Element {
  return <AvatarSnapshot {...props} size="xl" />;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: PLACEHOLDER_BG,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: PLACEHOLDER_BG,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageContainer: {
    backgroundColor: PLACEHOLDER_BG,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default AvatarSnapshot;
