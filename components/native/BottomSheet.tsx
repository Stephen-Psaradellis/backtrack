/**
 * BottomSheet and Dialog Components
 *
 * Custom implementations using React Native's built-in Modal, Animated, and PanResponder APIs.
 * No external dependencies required.
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Pressable,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, borderRadius, typography, spacing } from '../../constants/theme';

const BACKDROP_OPACITY = 0.5;
const ANIMATION_DURATION = 300;
const DRAG_THRESHOLD = 100; // Pixels to drag down before dismissing

// ============================================================================
// BottomSheet Component
// ============================================================================

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[]; // Heights in pixels, e.g., [300, 500]
  title?: string;
  showHandle?: boolean; // Drag handle bar at top (default true)
  closeOnBackdrop?: boolean; // default true
}

export default function BottomSheet({
  visible,
  onClose,
  children,
  snapPoints = [400],
  title,
  showHandle = true,
  closeOnBackdrop = true,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const sheetHeight = snapPoints[0] || 400;

  // Animation values
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Track drag state
  const isDragging = useRef(false);
  const lastGestureY = useRef(0);

  // Pan responder for drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drags
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        lastGestureY.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward drags
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          lastGestureY.current = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;

        // If dragged down more than threshold, close
        if (gestureState.dy > DRAG_THRESHOLD) {
          handleClose();
        } else {
          // Spring back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  // Open animation
  useEffect(() => {
    if (visible) {
      // Reset position
      translateY.setValue(SCREEN_HEIGHT);

      // Animate in
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: BACKDROP_OPACITY,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [visible]);

  // Close animation
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeOnBackdrop ? handleClose : undefined}
      >
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />
      </Pressable>

      {/* Sheet Container */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight + insets.bottom,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            {/* Drag Handle */}
            {showHandle && (
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
            )}

            {/* Title */}
            {title && (
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
              </View>
            )}

            {/* Content */}
            <View style={[styles.content, { paddingBottom: insets.bottom }]}>
              {children}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Dialog Component
// ============================================================================

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'danger';
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export function Dialog({
  visible,
  onClose,
  title,
  description,
  primaryAction,
  secondaryAction,
}: DialogProps) {
  // Animation values
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Open animation
  useEffect(() => {
    if (visible) {
      // Reset
      scale.setValue(0.9);
      opacity.setValue(0);

      // Animate in
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: BACKDROP_OPACITY,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [visible]);

  // Close animation
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handlePrimaryAction = () => {
    primaryAction?.onPress();
    handleClose();
  };

  const handleSecondaryAction = () => {
    secondaryAction?.onPress();
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />
      </Pressable>

      {/* Dialog Container */}
      <View style={styles.dialogContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
          accessible
          accessibilityRole="alert"
        >
          {/* Title */}
          <Text style={styles.dialogTitle}>{title}</Text>

          {/* Description */}
          {description && (
            <Text style={styles.dialogDescription}>{description}</Text>
          )}

          {/* Actions */}
          {(primaryAction || secondaryAction) && (
            <View style={styles.dialogActions}>
              {secondaryAction && (
                <Pressable
                  onPress={handleSecondaryAction}
                  style={({ pressed }) => [
                    styles.dialogButton,
                    styles.dialogButtonSecondary,
                    pressed && styles.dialogButtonPressed,
                  ]}
                  accessibilityLabel={secondaryAction.label}
                  accessibilityRole="button"
                >
                  <Text style={styles.dialogButtonTextSecondary}>
                    {secondaryAction.label}
                  </Text>
                </Pressable>
              )}

              {primaryAction && (
                <Pressable
                  onPress={handlePrimaryAction}
                  style={({ pressed }) => [
                    styles.dialogButton,
                    styles.dialogButtonPrimary,
                    primaryAction.variant === 'danger' &&
                      styles.dialogButtonDanger,
                    pressed && styles.dialogButtonPressed,
                  ]}
                  accessibilityLabel={primaryAction.label}
                  accessibilityRole="button"
                >
                  <Text style={styles.dialogButtonTextPrimary}>
                    {primaryAction.label}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Shared
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black,
  },

  // BottomSheet
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  keyboardAvoid: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.surface.overlay,
    borderRadius: borderRadius.full,
  },
  titleContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },

  // Dialog
  dialogContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  dialog: {
    backgroundColor: colors.surface.cardElevated,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  dialogTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  dialogDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    marginBottom: spacing[6],
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  dialogButton: {
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.DEFAULT,
    minWidth: 80,
    alignItems: 'center',
  },
  dialogButtonPrimary: {
    backgroundColor: colors.primary[500],
  },
  dialogButtonDanger: {
    backgroundColor: colors.error.main,
  },
  dialogButtonSecondary: {
    backgroundColor: 'transparent',
  },
  dialogButtonPressed: {
    opacity: 0.8,
  },
  dialogButtonTextPrimary: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  dialogButtonTextSecondary: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
