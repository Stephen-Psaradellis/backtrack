/**
 * SwipeableCardStack Component
 *
 * Tinder-style swipeable card stack for browsing posts.
 * Features:
 * - 3 visible cards in stack (top card interactive, 2 behind slightly scaled/offset)
 * - PanResponder for swipe gestures (left = skip, right = interested)
 * - Stamp overlays appear based on swipe direction
 * - Spring physics on release (snap back or fly off)
 * - Cards behind animate up when top card is removed
 * - Uses standard Animated API (not reanimated)
 */

import React, { useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ViewStyle,
} from 'react-native'
import { darkTheme } from '../constants/glassStyles'
import { spacing } from '../constants/theme'
import type { Post, PostWithDetails } from '../types/database'

// ============================================================================
// TYPES
// ============================================================================

export interface SwipeableCardStackProps<T extends Post | PostWithDetails> {
  /**
   * Array of posts to display as cards
   */
  posts: T[]

  /**
   * Callback when card is swiped right (interested)
   */
  onSwipeRight: (post: T) => void

  /**
   * Callback when card is swiped left (skip)
   */
  onSwipeLeft: (post: T) => void

  /**
   * Render function for each card
   * Receives the post data and should return the card content
   */
  renderCard: (post: T) => React.ReactNode

  /**
   * Test ID for testing
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREEN_WIDTH = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height

/** Horizontal swipe threshold to trigger action (in pixels) */
const SWIPE_THRESHOLD = 120

/** Rotation multiplier based on horizontal position */
const ROTATION_MULTIPLIER = 0.02

/** Animation duration for spring back */
const SPRING_CONFIG = {
  tension: 40,
  friction: 7,
  useNativeDriver: true,
}

/** Animation config for flying off screen */
const FLY_OFF_CONFIG = {
  tension: 65,
  friction: 5,
  useNativeDriver: true,
}

/** Stack card scales and offsets */
const CARD_SCALES = [1, 0.95, 0.9]
const CARD_OFFSETS = [0, 10, 20]

/** Stamp opacity threshold */
const STAMP_OPACITY_THRESHOLD = 50

// ============================================================================
// COMPONENT
// ============================================================================

export function SwipeableCardStack<T extends Post | PostWithDetails>({
  posts,
  onSwipeRight,
  onSwipeLeft,
  renderCard,
  testID = 'swipeable-card-stack',
}: SwipeableCardStackProps<T>): React.ReactNode {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [currentIndex, setCurrentIndex] = useState(0)
  const position = useRef(new Animated.ValueXY()).current
  const rotate = useRef(new Animated.Value(0)).current
  const stampOpacity = useRef(new Animated.Value(0)).current

  // Track which direction user is swiping (for stamp overlay)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  // Background card animations
  const cardScales = useRef([
    new Animated.Value(CARD_SCALES[0]),
    new Animated.Value(CARD_SCALES[1]),
    new Animated.Value(CARD_SCALES[2]),
  ]).current

  const cardOffsets = useRef([
    new Animated.Value(CARD_OFFSETS[0]),
    new Animated.Value(CARD_OFFSETS[1]),
    new Animated.Value(CARD_OFFSETS[2]),
  ]).current

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle successful swipe (card removed from stack)
   */
  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    const swipedPost = posts[currentIndex]
    if (!swipedPost) return

    // Call appropriate callback
    if (direction === 'right') {
      onSwipeRight(swipedPost)
    } else {
      onSwipeLeft(swipedPost)
    }

    // Move to next card
    setCurrentIndex(prev => prev + 1)

    // Reset position and rotation for next card
    position.setValue({ x: 0, y: 0 })
    rotate.setValue(0)
    stampOpacity.setValue(0)
    setSwipeDirection(null)

    // Animate background cards moving up
    animateCardsUp()
  }, [currentIndex, posts, onSwipeRight, onSwipeLeft, position, rotate, stampOpacity])

  /**
   * Animate background cards moving up in the stack
   */
  const animateCardsUp = useCallback(() => {
    // Each card moves up one position
    Animated.parallel([
      // Card at index 1 becomes top card (index 0)
      Animated.parallel([
        Animated.spring(cardScales[1], {
          toValue: CARD_SCALES[0],
          ...SPRING_CONFIG,
        }),
        Animated.spring(cardOffsets[1], {
          toValue: CARD_OFFSETS[0],
          ...SPRING_CONFIG,
        }),
      ]),
      // Card at index 2 moves to index 1
      Animated.parallel([
        Animated.spring(cardScales[2], {
          toValue: CARD_SCALES[1],
          ...SPRING_CONFIG,
        }),
        Animated.spring(cardOffsets[2], {
          toValue: CARD_OFFSETS[1],
          ...SPRING_CONFIG,
        }),
      ]),
    ]).start(() => {
      // Reset animations for next set
      cardScales[0].setValue(CARD_SCALES[0])
      cardScales[1].setValue(CARD_SCALES[1])
      cardScales[2].setValue(CARD_SCALES[2])
      cardOffsets[0].setValue(CARD_OFFSETS[0])
      cardOffsets[1].setValue(CARD_OFFSETS[1])
      cardOffsets[2].setValue(CARD_OFFSETS[2])
    })
  }, [cardScales, cardOffsets])

  /**
   * Reset card to center position with spring animation
   */
  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        ...SPRING_CONFIG,
      }),
      Animated.spring(rotate, {
        toValue: 0,
        ...SPRING_CONFIG,
      }),
      Animated.spring(stampOpacity, {
        toValue: 0,
        ...SPRING_CONFIG,
      }),
    ]).start()
    setSwipeDirection(null)
  }, [position, rotate, stampOpacity])

  /**
   * Animate card flying off screen
   */
  const swipeOffScreen = useCallback((direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 100 : -(SCREEN_WIDTH + 100)
    const y = 0

    Animated.parallel([
      Animated.spring(position, {
        toValue: { x, y },
        ...FLY_OFF_CONFIG,
      }),
      Animated.spring(stampOpacity, {
        toValue: 1,
        ...FLY_OFF_CONFIG,
      }),
    ]).start(() => handleSwipeComplete(direction))
  }, [position, stampOpacity, handleSwipeComplete])

  // ---------------------------------------------------------------------------
  // PAN RESPONDER
  // ---------------------------------------------------------------------------

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        // Update position
        position.setValue({ x: gesture.dx, y: gesture.dy })

        // Update rotation based on horizontal movement
        const rotation = gesture.dx * ROTATION_MULTIPLIER
        rotate.setValue(rotation)

        // Update stamp opacity based on swipe distance
        const absX = Math.abs(gesture.dx)
        if (absX > STAMP_OPACITY_THRESHOLD) {
          const opacity = Math.min((absX - STAMP_OPACITY_THRESHOLD) / SWIPE_THRESHOLD, 1)
          stampOpacity.setValue(opacity)
          setSwipeDirection(gesture.dx > 0 ? 'right' : 'left')
        } else {
          stampOpacity.setValue(0)
          setSwipeDirection(null)
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const { dx, dy } = gesture

        // Check if swipe threshold met
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          // Swipe off screen
          const direction = dx > 0 ? 'right' : 'left'
          swipeOffScreen(direction)
        } else {
          // Snap back to center
          resetPosition()
        }
      },
    })
  ).current

  // ---------------------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Get visible cards (current + next 2)
   */
  const getVisibleCards = () => {
    return [
      posts[currentIndex],
      posts[currentIndex + 1],
      posts[currentIndex + 2],
    ].filter(Boolean)
  }

  /**
   * Render individual card in stack
   */
  const renderStackCard = (post: T, index: number) => {
    const isTopCard = index === 0
    const actualIndex = currentIndex + index

    // Top card gets pan responder and animations
    if (isTopCard) {
      const rotateInterpolate = rotate.interpolate({
        inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        outputRange: ['-15deg', '0deg', '15deg'],
        extrapolate: 'clamp',
      })

      const animatedStyle: Animated.WithAnimatedValue<ViewStyle> = {
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { rotate: rotateInterpolate },
        ],
      }

      return (
        <Animated.View
          key={`card-${actualIndex}`}
          style={[styles.card, animatedStyle]}
          {...panResponder.panHandlers}
          testID={`${testID}-card-${actualIndex}`}
        >
          {/* Card content */}
          {renderCard(post)}

          {/* Stamp overlays */}
          {swipeDirection === 'right' && (
            <Animated.View
              style={[
                styles.stampOverlay,
                styles.stampRight,
                { opacity: stampOpacity },
              ]}
            >
              <Text style={styles.stampText}>INTERESTED</Text>
            </Animated.View>
          )}
          {swipeDirection === 'left' && (
            <Animated.View
              style={[
                styles.stampOverlay,
                styles.stampLeft,
                { opacity: stampOpacity },
              ]}
            >
              <Text style={styles.stampText}>SKIP</Text>
            </Animated.View>
          )}
        </Animated.View>
      )
    }

    // Background cards (static position with scale and offset)
    const scaleValue = cardScales[index] || CARD_SCALES[index]
    const offsetValue = cardOffsets[index] || CARD_OFFSETS[index]

    return (
      <Animated.View
        key={`card-${actualIndex}`}
        style={[
          styles.card,
          styles.cardBackground,
          {
            transform: [
              { scale: scaleValue },
              { translateY: offsetValue },
            ],
          },
        ]}
        pointerEvents="none"
        testID={`${testID}-card-${actualIndex}`}
      >
        {renderCard(post)}
      </Animated.View>
    )
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const visibleCards = getVisibleCards()

  // No more cards
  if (visibleCards.length === 0) {
    return (
      <View style={styles.emptyContainer} testID={`${testID}-empty`}>
        <Text style={styles.emptyText}>No more posts</Text>
        <Text style={styles.emptySubtext}>Check back later for new connections</Text>
      </View>
    )
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Render cards in reverse order so top card is on top */}
      {visibleCards.reverse().map((post, index) =>
        renderStackCard(post, visibleCards.length - 1 - index)
      )}
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },

  // Card
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - spacing[8],
    height: SCREEN_HEIGHT * 0.65,
    backgroundColor: darkTheme.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.cardBorder,
    overflow: 'hidden',
  },
  cardBackground: {
    // Background cards are below the top card
    zIndex: -1,
  },

  // Stamp overlays
  stampOverlay: {
    position: 'absolute',
    top: spacing[8],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 8,
    borderWidth: 4,
    transform: [{ rotate: '-15deg' }],
  },
  stampRight: {
    right: spacing[6],
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: '#34C759',
  },
  stampLeft: {
    left: spacing[6],
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
    transform: [{ rotate: '15deg' }],
  },
  stampText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: darkTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: darkTheme.textSecondary,
    textAlign: 'center',
  },
})
