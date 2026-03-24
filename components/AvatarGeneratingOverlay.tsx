/**
 * AvatarGeneratingOverlay
 *
 * Full-screen animated overlay shown while avatars are being generated.
 * Uses React Native's built-in Animated API for reliable cross-platform animation.
 * Particles scatter outward, then coalesce into a silhouette shape, then pulse.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { StyleSheet, View, Text, Dimensions, Animated, Easing } from 'react-native'

import { darkTheme } from '../constants/glassStyles'
import { colors } from '../constants/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CENTER_X = SCREEN_WIDTH / 2
const CENTER_Y = SCREEN_HEIGHT * 0.38

const LOADING_MESSAGES = [
  'Mixing your features...',
  'Choosing the perfect look...',
  'Adding some personality...',
  'Almost there...',
  'Adding final touches...',
]

const PARTICLE_COLORS = [
  colors.primary[500],
  colors.primary[400],
  '#FF8A65',
  '#CE93D8',
  '#4FC3F7',
  '#81C784',
]

interface ParticleConfig {
  startX: number
  startY: number
  endX: number
  endY: number
  size: number
  color: string
  floatDelay: number
}

const PARTICLE_COUNT = 20

function createParticleConfigs(): ParticleConfig[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2
    const scatterRadius = 100 + Math.random() * 80
    return {
      startX: Math.cos(angle) * scatterRadius * (0.8 + Math.random() * 0.4),
      startY: Math.sin(angle) * scatterRadius * (0.8 + Math.random() * 0.4),
      endX: (Math.random() - 0.5) * 40,
      endY: -50 + (i / PARTICLE_COUNT) * 120,
      size: 8 + Math.random() * 10,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      floatDelay: Math.random() * 1000,
    }
  })
}

interface SparkleData {
  x: number
  y: number
  delay: number
}

function createSparkles(): SparkleData[] {
  return Array.from({ length: 10 }, (_, i) => ({
    x: (Math.random() - 0.5) * SCREEN_WIDTH * 0.8,
    y: (Math.random() - 0.5) * SCREEN_HEIGHT * 0.5,
    delay: i * 400,
  }))
}

function AnimatedParticle({
  config,
  coalesce,
  floatAnim,
}: {
  config: ParticleConfig
  coalesce: Animated.Value
  floatAnim: Animated.Value
}) {
  const translateX = coalesce.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startX, config.endX],
  })
  const translateY = Animated.add(
    coalesce.interpolate({
      inputRange: [0, 1],
      outputRange: [config.startY, config.endY],
    }),
    // Float bobbing: each particle has a phase offset via floatDelay
    Animated.multiply(
      floatAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0],
      }),
      8
    )
  )
  const opacity = coalesce.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.5, 0.85, 1],
  })
  const scale = coalesce.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.4, 1.3, 0.9],
  })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        backgroundColor: config.color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  )
}

function AnimatedSparkle({
  sparkle,
  blinkAnim,
}: {
  sparkle: SparkleData
  blinkAnim: Animated.Value
}) {
  // Stagger sparkle blinks using the delay as a phase offset
  const phase = sparkle.delay / 4000
  const opacity = blinkAnim.interpolate({
    inputRange: [phase, phase + 0.1, phase + 0.2, phase + 0.3],
    outputRange: [0, 0.8, 0.8, 0],
    extrapolate: 'clamp',
  })
  const scale = blinkAnim.interpolate({
    inputRange: [phase, phase + 0.1, phase + 0.2, phase + 0.3],
    outputRange: [0, 1.2, 1.2, 0],
    extrapolate: 'clamp',
  })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: CENTER_X + sparkle.x,
        top: CENTER_Y + sparkle.y,
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#FFFFFF',
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

interface Props {
  visible: boolean
}

export function AvatarGeneratingOverlay({ visible }: Props) {
  const [messageIndex, setMessageIndex] = useState(0)

  const particleConfigs = useMemo(() => createParticleConfigs(), [])
  const sparkles = useMemo(() => createSparkles(), [])

  // Animation values
  const coalesce = useRef(new Animated.Value(0)).current
  const floatAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const blinkAnim = useRef(new Animated.Value(0)).current
  const fadeIn = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      // Reset when hidden
      coalesce.setValue(0)
      floatAnim.setValue(0)
      pulseAnim.setValue(1)
      blinkAnim.setValue(0)
      fadeIn.setValue(0)
      setMessageIndex(0)
      return
    }

    // Fade in overlay
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Phase 1: Coalesce particles (0 → 1 over 3.5s)
    Animated.timing(coalesce, {
      toValue: 1,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()

    // Continuous float bobbing
    Animated.loop(
      Animated.timing(floatAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      })
    ).start()

    // Pulse the whole particle group after coalescing
    const pulseTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.94,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start()
    }, 3500)

    // Sparkle blink loop
    Animated.loop(
      Animated.timing(blinkAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()

    // Cycle loading messages
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2200)

    return () => {
      clearTimeout(pulseTimer)
      clearInterval(msgInterval)
      coalesce.stopAnimation()
      floatAnim.stopAnimation()
      pulseAnim.stopAnimation()
      blinkAnim.stopAnimation()
      fadeIn.stopAnimation()
    }
  }, [visible])

  if (!visible) return null

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeIn }]}>
      {/* Sparkles (behind particles) */}
      {sparkles.map((s, i) => (
        <AnimatedSparkle key={`s-${i}`} sparkle={s} blinkAnim={blinkAnim} />
      ))}

      {/* Particles */}
      <Animated.View
        style={[
          styles.particleContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {particleConfigs.map((config, i) => (
          <AnimatedParticle
            key={`p-${i}`}
            config={config}
            coalesce={coalesce}
            floatAnim={floatAnim}
          />
        ))}
      </Animated.View>

      {/* Loading text */}
      <View style={styles.textContainer}>
        <Text style={styles.loadingText}>{LOADING_MESSAGES[messageIndex]}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 19, 0.94)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleContainer: {
    width: 1,
    height: 1,
    position: 'absolute',
    left: CENTER_X,
    top: CENTER_Y,
  },
  textContainer: {
    position: 'absolute',
    bottom: '25%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    color: darkTheme.textPrimary,
    textAlign: 'center',
  },
})
