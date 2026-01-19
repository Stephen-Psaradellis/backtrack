/**
 * PreviewPanel Component
 *
 * Avatar preview panel with real-time updates.
 * Shows the current avatar configuration and provides action buttons.
 * Supports both light and dark mode.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar2DDisplay } from '@/components/avatar2d/Avatar2DDisplay';
import { darkTheme, darkGradients } from '@/constants/glassStyles';
import { colors } from '@/constants/theme';
import type { Avatar2DConfig } from '@/components/avatar2d/types';

// =============================================================================
// TYPES
// =============================================================================

export interface PreviewPanelProps {
  config: Avatar2DConfig;
  onRandomize?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isDirty?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_SIZE = Math.min(SCREEN_WIDTH * 0.5, 200);

// =============================================================================
// COMPONENT
// =============================================================================

export function PreviewPanel({
  config,
  onRandomize,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isDirty = false,
}: PreviewPanelProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark' || true; // Default to dark for this app

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for the avatar container when dirty
  useEffect(() => {
    if (isDirty) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isDirty, pulseAnim]);

  const handleRandomize = () => {
    // Spin animation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });
    onRandomize?.();
  };

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Background gradient */}
      <LinearGradient
        colors={isDark
          ? ['rgba(94, 108, 216, 0.08)', 'rgba(139, 92, 246, 0.05)', 'transparent']
          : ['rgba(255, 107, 71, 0.08)', 'rgba(139, 92, 246, 0.05)', 'transparent']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Avatar preview */}
      <View style={styles.previewWrapper}>
        {/* Glow effect when dirty */}
        {isDirty && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowOpacity,
                width: PREVIEW_SIZE + 40,
                height: PREVIEW_SIZE + 40,
                borderRadius: (PREVIEW_SIZE + 40) / 2,
              },
            ]}
          />
        )}

        {/* Avatar container */}
        <Animated.View
          style={[
            styles.avatarContainer,
            {
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              transform: [{ rotate: spin }],
            },
            isDark && styles.avatarContainerDark,
          ]}
        >
          <Avatar2DDisplay avatar={config} size="xl" />
        </Animated.View>

        {/* Dirty indicator */}
        {isDirty && (
          <View style={[styles.dirtyBadge, isDark && styles.dirtyBadgeDark]}>
            <Ionicons name="pencil" size={10} color={colors.white} />
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {/* Undo button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isDark && styles.actionButtonDark,
            !canUndo && styles.actionButtonDisabled,
          ]}
          onPress={onUndo}
          disabled={!canUndo}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-undo"
            size={20}
            color={
              canUndo
                ? isDark
                  ? darkTheme.textPrimary
                  : colors.neutral[700]
                : isDark
                ? darkTheme.textDisabled
                : colors.neutral[300]
            }
          />
        </TouchableOpacity>

        {/* Randomize button */}
        <TouchableOpacity
          style={[styles.randomButton, isDark && styles.randomButtonDark]}
          onPress={handleRandomize}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary[500], colors.accent[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.randomButtonGradient}
          >
            <Ionicons name="shuffle" size={22} color={colors.white} />
            <Text style={styles.randomButtonText}>Random</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Redo button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isDark && styles.actionButtonDark,
            !canRedo && styles.actionButtonDisabled,
          ]}
          onPress={onRedo}
          disabled={!canRedo}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-redo"
            size={20}
            color={
              canRedo
                ? isDark
                  ? darkTheme.textPrimary
                  : colors.neutral[700]
                : isDark
                ? darkTheme.textDisabled
                : colors.neutral[300]
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: colors.neutral[50],
  },
  containerDark: {
    backgroundColor: darkTheme.backgroundAlt,
  },
  previewWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowEffect: {
    position: 'absolute',
    backgroundColor: colors.primary[500],
    ...Platform.select({
      ios: {
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatarContainerDark: {
    backgroundColor: darkTheme.surface,
  },
  dirtyBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  dirtyBadgeDark: {
    borderColor: darkTheme.backgroundAlt,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  actionButtonDark: {
    backgroundColor: darkTheme.surface,
    borderColor: darkTheme.glassBorder,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  randomButton: {
    overflow: 'hidden',
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  randomButtonDark: {},
  randomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  randomButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PreviewPanel;
