/**
 * GlobalHeader
 *
 * Global header component for tab screens with consistent layout:
 * Layout: [+ Post FAB] | [Logo] | [Avatar]
 *         |  [Check In] [Live View]  |
 *
 * Features:
 * - '+' FAB navigates to CreatePost
 * - CheckInButton integration
 * - User avatar from profile
 * - Live View button (placeholder)
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from 'react-native-bitmoji';
import { CheckInButton } from '../checkin';
import { BacktrackLogo } from '../ui/BacktrackLogo';
import { selectionFeedback } from '../../lib/haptics';
import { colors, shadows } from '../../constants/theme';
import { darkTheme } from '../../constants/glassStyles';
import type { MainTabNavigationProp } from '../../navigation/types';

// ============================================================================
// TYPES
// ============================================================================

export interface GlobalHeaderProps {
  /** Show the Check In button (default: false) */
  showCheckIn?: boolean;
  /** Show the Live View button (default: false) */
  showLiveView?: boolean;
  /** Custom handler for post button (default: navigates to CreatePost) */
  onPostPress?: () => void;
  /** Custom handler for avatar press */
  onAvatarPress?: () => void;
  /** Custom handler for live view press */
  onLiveViewPress?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GlobalHeader({
  showCheckIn = false,
  showLiveView = false,
  onPostPress,
  onAvatarPress,
  onLiveViewPress,
}: GlobalHeaderProps): React.ReactNode {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MainTabNavigationProp>();
  const { profile } = useAuth();

  const hasAvatar = profile?.avatar;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePostPress = useCallback(() => {
    selectionFeedback();
    if (onPostPress) {
      onPostPress();
    } else {
      navigation.navigate('CreatePost', {});
    }
  }, [navigation, onPostPress]);

  const handleAvatarPress = useCallback(() => {
    selectionFeedback();
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      // Default: navigate to Profile tab
      navigation.navigate('ProfileTab');
    }
  }, [navigation, onAvatarPress]);

  const handleLiveViewPress = useCallback(() => {
    selectionFeedback();
    if (onLiveViewPress) {
      onLiveViewPress();
    }
    // Placeholder: Live View functionality TBD
  }, [onLiveViewPress]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Row: [+ Post] | [Logo] | [Avatar] */}
      <View style={styles.topRow}>
        {/* Post FAB */}
        <TouchableOpacity
          style={styles.postButton}
          onPress={handlePostPress}
          activeOpacity={0.8}
          testID="global-header-post-button"
          accessibilityRole="button"
          accessibilityLabel="Create a new post"
        >
          <Ionicons name="add" size={24} color={darkTheme.textPrimary} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <BacktrackLogo size="medium" />
        </View>

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={handleAvatarPress}
          activeOpacity={0.7}
          testID="global-header-avatar"
          accessibilityRole="button"
          accessibilityLabel="View profile"
        >
          {hasAvatar ? (
            <Avatar
              config={profile.avatar?.config}
              size="sm"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color={darkTheme.textMuted} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Row: [Check In] [Live View] (conditional) */}
      {(showCheckIn || showLiveView) && (
        <View style={styles.bottomRow}>
          {showCheckIn && (
            <CheckInButton testID="global-header-checkin" />
          )}
          {showLiveView && (
            <TouchableOpacity
              style={styles.liveViewButton}
              onPress={handleLiveViewPress}
              activeOpacity={0.8}
              testID="global-header-live-view"
              accessibilityRole="button"
              accessibilityLabel="Open live view"
            >
              <Ionicons name="radio" size={18} color={darkTheme.accent} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: darkTheme.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.cardBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: darkTheme.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  liveViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: darkTheme.cardBackground,
    borderWidth: 1,
    borderColor: darkTheme.accent,
    gap: 6,
  },
});

export default GlobalHeader;
