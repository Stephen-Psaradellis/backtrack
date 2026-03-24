/**
 * MatchCelebration Component
 *
 * Full-screen celebration modal shown when two users match.
 * Features animated title, avatar display, confetti effect, and action buttons.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AvatarDisplay } from './AvatarDisplay';
import type { StoredAvatar } from '../types/avatar';
import { darkTheme, darkGradients, darkButtonStyles, darkTypography } from '../constants/glassStyles';
import { spacing } from '../constants/theme';
import { mediumFeedback } from '../lib/haptics';

// ============================================================================
// TYPES
// ============================================================================

export interface MatchCelebrationProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when "Say Hello" button is pressed */
  onSayHello: () => void;
  /** Callback when "Keep Browsing" button is pressed */
  onDismiss: () => void;
  /** The matched user's avatar (DiceBear v2 stored avatar) */
  matchedAvatar: StoredAvatar | null;
  /** Current user's avatar (DiceBear v2 stored avatar) */
  myAvatar: StoredAvatar | null;
  /** Location name where the match occurred */
  locationName?: string;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFETTI_COUNT = 25;
const AVATAR_SIZE = 120;

/**
 * Confetti particle configuration
 */
interface ConfettiParticle {
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: Animated.Value;
  translateY: Animated.Value;
  translateX: Animated.Value;
}

const CONFETTI_COLORS = [
  darkTheme.primary,
  darkTheme.accent,
  darkTheme.primaryGlow,
  darkTheme.accentGlow,
];

// ============================================================================
// COMPONENT
// ============================================================================

export function MatchCelebration({
  visible,
  onSayHello,
  onDismiss,
  matchedAvatar,
  myAvatar,
  locationName,
  testID = 'match-celebration',
}: MatchCelebrationProps): React.ReactNode {
  const { width, height } = useWindowDimensions();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiParticles = useRef<ConfettiParticle[]>([]);

  // Initialize confetti particles
  if (confettiParticles.current.length === 0) {
    confettiParticles.current = Array.from({ length: CONFETTI_COUNT }, () => ({
      x: Math.random() * width,
      y: -50 - Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
    }));
  }

  // Trigger animations when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Haptic feedback on show
      mediumFeedback();

      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiParticles.current.forEach(particle => {
        particle.rotation.setValue(0);
        particle.translateY.setValue(0);
        particle.translateX.setValue(0);
      });

      // Animate title scale-in
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Fade in content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Animate confetti particles
      confettiParticles.current.forEach((particle, index) => {
        const delay = index * 30;
        const duration = 2000 + Math.random() * 1000;
        const fallDistance = height + 100;
        const drift = (Math.random() - 0.5) * 100;

        Animated.parallel([
          // Fall down
          Animated.timing(particle.translateY, {
            toValue: fallDistance,
            duration,
            delay,
            useNativeDriver: true,
          }),
          // Drift horizontally
          Animated.timing(particle.translateX, {
            toValue: drift,
            duration,
            delay,
            useNativeDriver: true,
          }),
          // Rotate
          Animated.timing(particle.rotation, {
            toValue: 360 * (2 + Math.random() * 2),
            duration,
            delay,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible, scaleAnim, fadeAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID={testID}
    >
      {/* Dark gradient background */}
      <LinearGradient
        colors={darkGradients.background.colors}
        start={darkGradients.background.start}
        end={darkGradients.background.end}
        style={styles.overlay}
      >
        {/* Confetti particles */}
        {confettiParticles.current.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                transform: [
                  { translateY: particle.translateY },
                  { translateX: particle.translateX },
                  {
                    rotate: particle.rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* Main content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Animated title */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.title} testID={`${testID}-title`}>
              It's a Match!
            </Text>
            {locationName && (
              <Text style={styles.subtitle} testID={`${testID}-location`}>
                at {locationName}
              </Text>
            )}
          </Animated.View>

          {/* Avatars side by side */}
          <View style={styles.avatarsContainer} testID={`${testID}-avatars`}>
            <View style={styles.avatarWrapper}>
              {myAvatar ? (
                <AvatarDisplay
                  avatar={myAvatar}
                  pixelSize={AVATAR_SIZE}
                  testID={`${testID}-my-avatar`}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, styles.avatar]}>
                  <Text style={styles.placeholderText}>You</Text>
                </View>
              )}
            </View>

            <View style={styles.heartIcon}>
              <Text style={styles.heartText}>💗</Text>
            </View>

            <View style={styles.avatarWrapper}>
              {matchedAvatar ? (
                <AvatarDisplay
                  avatar={matchedAvatar}
                  pixelSize={AVATAR_SIZE}
                  testID={`${testID}-matched-avatar`}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, styles.avatar]}>
                  <Text style={styles.placeholderText}>?</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonsContainer}>
            {/* Primary: Say Hello */}
            <TouchableOpacity
              onPress={onSayHello}
              style={styles.primaryButtonWrapper}
              testID={`${testID}-say-hello`}
            >
              <LinearGradient
                colors={darkGradients.button.colors}
                start={darkGradients.button.start}
                end={darkGradients.button.end}
                style={darkButtonStyles.primary}
              >
                <Text style={darkButtonStyles.primaryText}>Say Hello</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary: Keep Browsing */}
            <TouchableOpacity
              onPress={onDismiss}
              style={darkButtonStyles.secondary}
              testID={`${testID}-keep-browsing`}
            >
              <Text style={darkButtonStyles.secondaryText}>Keep Browsing</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing[12],
  },
  title: {
    ...darkTypography.hero,
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    ...darkTypography.subtitle,
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[12],
    gap: spacing[6],
  },
  avatarWrapper: {
    borderWidth: 4,
    borderColor: darkTheme.primary,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    padding: 4,
    backgroundColor: darkTheme.background,
  },
  avatar: {
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: darkTheme.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: darkTheme.textSecondary,
  },
  heartIcon: {
    backgroundColor: 'transparent',
  },
  heartText: {
    fontSize: 48,
  },
  buttonsContainer: {
    width: '100%',
    gap: spacing[4],
  },
  primaryButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 4,
  },
});

export default MatchCelebration;
