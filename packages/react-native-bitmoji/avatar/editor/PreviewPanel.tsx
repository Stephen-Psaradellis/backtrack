/**
 * PreviewPanel Component
 *
 * Avatar preview panel with real-time updates.
 * Shows the current avatar configuration and provides action buttons.
 * Supports both light and dark mode.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../Avatar';
import { FullBodyAvatar } from '../FullBodyAvatar';
import { ExpressionPicker } from '../expressions/ExpressionPicker';
import { applyExpressionPreset } from '../expressions/presets';
import { colors, darkTheme } from '../../constants/theme';
import type { AvatarConfig } from '../types';
import type { EditorCategory } from '../hooks/useAvatarEditor';
import type { ExpressionPreset } from '../stickers/types';

// =============================================================================
// TYPES
// =============================================================================

export interface PreviewPanelProps {
  config: AvatarConfig;
  activeCategory?: EditorCategory;
  onRandomize?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isDirty?: boolean;
  /** Callback when expression is applied */
  onExpressionSelect?: (updates: Partial<AvatarConfig>) => void;
  /** Callback when share is pressed */
  onShare?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = Math.min(SCREEN_WIDTH * 0.5, 200);

// =============================================================================
// COMPONENT
// =============================================================================

export function PreviewPanel({
  config,
  activeCategory,
  onRandomize,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isDirty = false,
  onExpressionSelect,
  onShare,
}: PreviewPanelProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Expression picker modal state
  const [showExpressionPicker, setShowExpressionPicker] = useState(false);

  // Always show full body view
  const showFullBody = true;

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Handle expression selection
  const handleExpressionSelect = useCallback((preset: ExpressionPreset) => {
    if (onExpressionSelect) {
      // Extract only the expression-related updates
      onExpressionSelect({
        eyeStyle: preset.eyeStyle,
        eyebrowStyle: preset.eyebrowStyle,
        mouthStyle: preset.mouthStyle,
      });
    }
    setShowExpressionPicker(false);
  }, [onExpressionSelect]);

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
      <LinearGradient
        colors={
          isDark
            ? ['rgba(94, 108, 216, 0.08)', 'rgba(139, 92, 246, 0.05)', 'transparent']
            : ['rgba(99, 102, 241, 0.08)', 'rgba(139, 92, 246, 0.05)', 'transparent']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.previewWrapper}>
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

        <Animated.View
          style={[
            styles.avatarContainer,
            showFullBody ? styles.avatarContainerFullBody : null,
            {
              width: showFullBody ? PREVIEW_SIZE * 0.75 : PREVIEW_SIZE,
              height: showFullBody ? PREVIEW_SIZE * 1.5 : PREVIEW_SIZE,
              borderRadius: showFullBody ? 10 : PREVIEW_SIZE / 2,
              transform: [{ rotate: spin }],
              backgroundColor: config.backgroundColor || (isDark ? darkTheme.surface : colors.white),
            },
            isDark && !config.backgroundColor && styles.avatarContainerDark,
          ]}
        >
          {showFullBody ? (
            <FullBodyAvatar config={config} customSize={PREVIEW_SIZE * 0.75 - 16} backgroundColor={config.backgroundColor} />
          ) : (
            <Avatar config={config} customSize={PREVIEW_SIZE - 16} backgroundColor={config.backgroundColor} />
          )}
        </Animated.View>

        {isDirty && (
          <View style={[styles.dirtyBadge, isDark && styles.dirtyBadgeDark]}>
            <Ionicons name="pencil" size={10} color={colors.white} />
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
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

        {/* Expression Picker Button */}
        {onExpressionSelect && (
          <TouchableOpacity
            style={[styles.expressionButton, isDark && styles.expressionButtonDark]}
            onPress={() => setShowExpressionPicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="happy-outline"
              size={20}
              color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
            />
          </TouchableOpacity>
        )}

        {/* Share Button */}
        {onShare && (
          <TouchableOpacity
            style={[styles.expressionButton, isDark && styles.expressionButtonDark]}
            onPress={onShare}
            activeOpacity={0.7}
          >
            <Ionicons
              name="share-outline"
              size={20}
              color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Expression Picker Modal */}
      <Modal
        visible={showExpressionPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExpressionPicker(false)}
      >
        <SafeAreaView style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
          <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
            <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
              Choose Expression
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowExpressionPicker(false)}
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
              />
            </TouchableOpacity>
          </View>
          <ExpressionPicker
            avatarConfig={config}
            onSelect={handleExpressionSelect}
          />
        </SafeAreaView>
      </Modal>
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
  avatarContainerFullBody: {
    overflow: 'hidden',
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
  // Expression button styles
  expressionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  expressionButtonDark: {
    backgroundColor: darkTheme.surface,
    borderColor: darkTheme.glassBorder,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalContainerDark: {
    backgroundColor: darkTheme.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  modalHeaderDark: {
    borderBottomColor: darkTheme.glassBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  modalTitleDark: {
    color: darkTheme.textPrimary,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
});

export default PreviewPanel;
