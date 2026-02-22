import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

export interface ToastProps {
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss: () => void;
}

const VARIANT_CONFIG = {
  info: {
    icon: 'information-circle' as const,
    color: COLORS.info.main,
    hapticType: Haptics.NotificationFeedbackType.Success,
  },
  success: {
    icon: 'checkmark-circle' as const,
    color: COLORS.success.main,
    hapticType: Haptics.NotificationFeedbackType.Success,
  },
  warning: {
    icon: 'warning' as const,
    color: COLORS.warning.main,
    hapticType: Haptics.NotificationFeedbackType.Warning,
  },
  error: {
    icon: 'close-circle' as const,
    color: COLORS.error.main,
    hapticType: Haptics.NotificationFeedbackType.Error,
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  action,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = VARIANT_CONFIG[variant];

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          // Swipe up threshold met - dismiss
          animateOut();
        } else {
          // Reset position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  useEffect(() => {
    // Trigger haptic feedback
    try {
      Haptics.notificationAsync(config.hapticType);
    } catch (error) {
      // Haptics may not be available on all devices
      console.warn('Haptic feedback unavailable:', error);
    }

    // Animate in
    animateIn();
  }, []);

  const handleActionPress = () => {
    if (action) {
      action.onPress();
      animateOut();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + SPACING.sm,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.toast}>
        {/* Variant Icon */}
        <Ionicons name={config.icon} size={24} color={config.color} style={styles.icon} />

        {/* Message */}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        {/* Action Button */}
        {action && (
          <TouchableOpacity onPress={handleActionPress} style={styles.actionButton}>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}

        {/* Close Button */}
        <TouchableOpacity onPress={animateOut} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass.background,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  icon: {
    marginRight: SPACING.sm,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  actionButton: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  closeButton: {
    marginLeft: SPACING.xs,
    padding: SPACING.xs,
  },
});
