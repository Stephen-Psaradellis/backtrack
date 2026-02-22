import { memo, useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { darkTheme } from '../../constants/glassStyles'
import { colors } from '../../constants/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ============================================================================
// Types
// ============================================================================

export interface WelcomeScreenProps {
  /** Callback when user completes onboarding or skips */
  onComplete: () => void
}

interface OnboardingSlide {
  id: string
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
}

// ============================================================================
// Slides Data
// ============================================================================

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'compass-outline',
    title: 'Spot Someone',
    description:
      'Notice someone interesting at a café, gym, or event? Remember the moment.',
  },
  {
    id: '2',
    icon: 'create-outline',
    title: 'Post Your Sighting',
    description:
      'Describe who you saw, when, and where. Your post is anonymous until matched.',
  },
  {
    id: '3',
    icon: 'heart-outline',
    title: 'Get Matched',
    description:
      'If they post about you too, it\'s a match! Both of you noticed each other.',
  },
  {
    id: '4',
    icon: 'chatbubbles-outline',
    title: 'Start Talking',
    description:
      'Break the ice and start a conversation. You already have something in common!',
  },
]

// ============================================================================
// Slide Component
// ============================================================================

interface SlideProps {
  item: OnboardingSlide
}

const Slide = memo(function Slide({ item }: SlideProps) {
  return (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={64} color={colors.primary[500]} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  )
})

// ============================================================================
// Pagination Dots Component
// ============================================================================

interface PaginationDotsProps {
  activeIndex: number
  total: number
}

const PaginationDots = memo(function PaginationDots({
  activeIndex,
  total,
}: PaginationDotsProps) {
  return (
    <View style={styles.pagination}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[styles.dot, index === activeIndex && styles.dotActive]}
        />
      ))}
    </View>
  )
})

// ============================================================================
// Main Component
// ============================================================================

/**
 * Welcome screen carousel for the onboarding flow.
 *
 * Native React Native implementation using FlatList with horizontal paging.
 * Shows 4 onboarding slides introducing the Backtrack concept.
 */
function WelcomeScreenComponent({ onComplete }: WelcomeScreenProps) {
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollX = useRef(new Animated.Value(0)).current

  const isLastSlide = currentIndex === SLIDES.length - 1

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x
      const index = Math.round(offsetX / SCREEN_WIDTH)
      setCurrentIndex(index)
    },
    []
  )

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      onComplete()
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    }
  }, [currentIndex, isLastSlide, onComplete])

  const handleSkip = useCallback(() => {
    onComplete()
  }, [onComplete])

  const renderItem = useCallback(
    ({ item }: { item: OnboardingSlide }) => <Slide item={item} />,
    []
  )

  const keyExtractor = useCallback((item: OnboardingSlide) => item.id, [])

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity
        onPress={handleSkip}
        style={styles.skipButton}
        activeOpacity={0.7}
        accessibilityLabel="Skip onboarding"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
            listener: handleScroll,
          }
        )}
        scrollEventThrottle={16}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <PaginationDots activeIndex={currentIndex} total={SLIDES.length} />

        <TouchableOpacity
          onPress={handleNext}
          style={styles.nextButton}
          activeOpacity={0.8}
          accessibilityLabel={
            isLastSlide ? 'Get started with Backtrack' : 'Next slide'
          }
          accessibilityRole="button"
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },

  // Skip button
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: darkTheme.textDisabled,
  },

  // Slide
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 120,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 71, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 16,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    alignItems: 'center',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    backgroundColor: colors.primary[500],
    width: 24,
  },

  // Next button
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minHeight: 56,
    gap: 8,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.white,
  },
})

// ============================================================================
// Memoized Export
// ============================================================================

function arePropsEqual(
  prevProps: WelcomeScreenProps,
  nextProps: WelcomeScreenProps
): boolean {
  return prevProps.onComplete === nextProps.onComplete
}

/**
 * Memoized WelcomeScreen component.
 * Native carousel onboarding flow for Backtrack.
 */
export const WelcomeScreen = memo(WelcomeScreenComponent, arePropsEqual)

WelcomeScreen.displayName = 'WelcomeScreen'

export default WelcomeScreen
