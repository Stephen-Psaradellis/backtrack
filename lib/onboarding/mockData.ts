/**
 * Mock Data for Onboarding Demo Screens
 *
 * Provides realistic mock posts, avatar configurations, and location data
 * for the producer and consumer demo screens during onboarding.
 *
 * This data is designed to:
 * - Showcase the app's value proposition
 * - Present engaging, relatable scenarios
 * - Demonstrate both posting and browsing flows
 * - Use diverse, inclusive avatar configurations
 *
 * @example
 * ```tsx
 * import { PRODUCER_DEMO_POST, CONSUMER_DEMO_POSTS } from 'lib/onboarding/mockData'
 *
 * // Use in producer demo
 * <MockPostCard
 *   avatar={PRODUCER_DEMO_POST.targetAvatar}
 *   message={PRODUCER_DEMO_POST.message}
 *   location={PRODUCER_DEMO_POST.location}
 * />
 *
 * // Use in consumer demo
 * {CONSUMER_DEMO_POSTS.map(post => (
 *   <MockBrowsePostCard key={post.id} post={post} />
 * ))}
 * ```
 */

import type { AvatarConfig } from '@/types/avatar'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mock demo post for producer flow
 * Represents a post the user would create about someone they saw
 */
export interface DemoProducerPost {
  /** Target avatar - the person the poster saw */
  targetAvatar: AvatarConfig
  /** Message describing the encounter */
  message: string
  /** Location name where the encounter happened */
  location: string
  /** Relative time since posting */
  timeAgo: string
}

/**
 * Mock demo post for consumer flow
 * Represents a post the user might find about themselves
 */
export interface DemoConsumerPost {
  /** Unique identifier for the post */
  id: string
  /** Poster's avatar - who wrote this post */
  posterAvatar: AvatarConfig
  /** Message content of the post */
  message: string
  /** Location name where the encounter happened */
  location: string
  /** Relative time since posting */
  timeAgo: string
  /** Match score showing how well this might match the user (0-100) */
  matchScore?: number
}

/**
 * Mock location data for demo screens
 */
export interface DemoLocation {
  /** Location name */
  name: string
  /** Location type/category */
  type: 'coffee' | 'library' | 'park' | 'bookstore' | 'gym' | 'grocery' | 'transit'
  /** Icon emoji for the location type */
  icon: string
}

// ============================================================================
// AVATAR PRESETS
// ============================================================================

/**
 * Diverse avatar presets for realistic demo scenarios
 * These represent a range of appearances and styles
 */

/** Avatar: Person with long straight hair reading at a coffee shop */
export const AVATAR_PRESET_READER: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'LongHairStraight',
  hairColor: 'Brown',
  accessoriesType: 'Prescription01',
  facialHairType: 'Blank',
  clotheType: 'Hoodie',
  clotheColor: 'PastelBlue',
  eyeType: 'Happy',
  eyebrowType: 'Default',
  mouthType: 'Smile',
  skinColor: 'Light',
}

/** Avatar: Person with short hair wearing a blazer */
export const AVATAR_PRESET_PROFESSIONAL: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'ShortHairShortFlat',
  hairColor: 'BrownDark',
  accessoriesType: 'Blank',
  facialHairType: 'Blank',
  clotheType: 'BlazerShirt',
  clotheColor: 'Black',
  eyeType: 'Default',
  eyebrowType: 'DefaultNatural',
  mouthType: 'Smile',
  skinColor: 'Light',
}

/** Avatar: Person with curly hair and round glasses */
export const AVATAR_PRESET_CURLY: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'LongHairCurly',
  hairColor: 'Black',
  accessoriesType: 'Round',
  facialHairType: 'Blank',
  clotheType: 'GraphicShirt',
  clotheColor: 'Blue01',
  eyeType: 'Happy',
  eyebrowType: 'RaisedExcitedNatural',
  mouthType: 'Twinkle',
  skinColor: 'Brown',
}

/** Avatar: Person with a bun and sweater */
export const AVATAR_PRESET_COZY: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'LongHairBun',
  hairColor: 'Auburn',
  accessoriesType: 'Blank',
  facialHairType: 'Blank',
  clotheType: 'CollarSweater',
  clotheColor: 'PastelGreen',
  eyeType: 'Side',
  eyebrowType: 'DefaultNatural',
  mouthType: 'Default',
  skinColor: 'Pale',
}

/** Avatar: Person with short wavy hair and earbuds aesthetic */
export const AVATAR_PRESET_MUSIC: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'ShortHairShortWaved',
  hairColor: 'Blonde',
  accessoriesType: 'Blank',
  facialHairType: 'Blank',
  clotheType: 'Hoodie',
  clotheColor: 'Gray01',
  eyeType: 'Wink',
  eyebrowType: 'UpDownNatural',
  mouthType: 'Smile',
  skinColor: 'Tanned',
}

/** Avatar: Person with bob haircut and vintage style */
export const AVATAR_PRESET_VINTAGE: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'LongHairBob',
  hairColor: 'Red',
  accessoriesType: 'Kurt',
  facialHairType: 'Blank',
  clotheType: 'ShirtVNeck',
  clotheColor: 'PastelRed',
  eyeType: 'Default',
  eyebrowType: 'FlatNatural',
  mouthType: 'Twinkle',
  skinColor: 'Light',
}

/** Avatar: Person with short curly hair and friendly appearance */
export const AVATAR_PRESET_FRIENDLY: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'ShortHairShortCurly',
  hairColor: 'Brown',
  accessoriesType: 'Wayfarers',
  facialHairType: 'BeardLight',
  clotheType: 'ShirtCrewNeck',
  clotheColor: 'Heather',
  eyeType: 'Happy',
  eyebrowType: 'DefaultNatural',
  mouthType: 'Smile',
  skinColor: 'DarkBrown',
}

/** Avatar: Person with dreads and relaxed style */
export const AVATAR_PRESET_RELAXED: AvatarConfig = {
  avatarStyle: 'Circle',
  topType: 'ShortHairDreads01',
  hairColor: 'Black',
  accessoriesType: 'Blank',
  facialHairType: 'Blank',
  clotheType: 'Overall',
  clotheColor: 'Blue03',
  eyeType: 'Default',
  eyebrowType: 'Default',
  mouthType: 'Default',
  skinColor: 'Brown',
}

/**
 * Collection of all avatar presets for easy random selection
 */
export const AVATAR_PRESETS: readonly AvatarConfig[] = [
  AVATAR_PRESET_READER,
  AVATAR_PRESET_PROFESSIONAL,
  AVATAR_PRESET_CURLY,
  AVATAR_PRESET_COZY,
  AVATAR_PRESET_MUSIC,
  AVATAR_PRESET_VINTAGE,
  AVATAR_PRESET_FRIENDLY,
  AVATAR_PRESET_RELAXED,
] as const

// ============================================================================
// DEMO LOCATIONS
// ============================================================================

/**
 * Common location types for missed connection scenarios
 */
export const DEMO_LOCATIONS: readonly DemoLocation[] = [
  { name: 'Sunrise Coffee Shop', type: 'coffee', icon: '☕' },
  { name: 'Central Library', type: 'library', icon: '📚' },
  { name: 'Riverside Park', type: 'park', icon: '🌳' },
  { name: 'The Book Nook', type: 'bookstore', icon: '📖' },
  { name: 'Greenleaf Cafe', type: 'coffee', icon: '🍃' },
  { name: 'Metro Station', type: 'transit', icon: '🚇' },
  { name: 'Downtown Gym', type: 'gym', icon: '💪' },
  { name: 'Whole Foods Market', type: 'grocery', icon: '🥑' },
] as const

// ============================================================================
// PRODUCER DEMO DATA
// ============================================================================

/**
 * Primary mock post for the producer demo screen
 *
 * This represents an example of what a user might post about
 * someone they noticed at a coffee shop. The scenario is
 * designed to be relatable and show the app's value.
 */
export const PRODUCER_DEMO_POST: DemoProducerPost = {
  targetAvatar: AVATAR_PRESET_READER,
  message:
    'You were reading "The Midnight Library" at the corner table. I loved your laugh when your friend made a joke. Would love to chat about books sometime!',
  location: 'Sunrise Coffee Shop',
  timeAgo: 'Just now',
}

/**
 * Alternative producer demo posts for variety
 * Can be used for A/B testing or random selection
 */
export const PRODUCER_DEMO_POSTS_ALT: readonly DemoProducerPost[] = [
  {
    targetAvatar: AVATAR_PRESET_MUSIC,
    message:
      "You were listening to something that made you smile while waiting for your order. Your energy was so positive - it made my morning better!",
    location: 'Greenleaf Cafe',
    timeAgo: 'Just now',
  },
  {
    targetAvatar: AVATAR_PRESET_COZY,
    message:
      "We both reached for the same book in the fiction section. You recommended another author I might like. I'd love to hear more suggestions!",
    location: 'The Book Nook',
    timeAgo: 'Just now',
  },
  {
    targetAvatar: AVATAR_PRESET_FRIENDLY,
    message:
      "You held the door open for me when my hands were full. Such a small thing but it made my day. Coffee sometime?",
    location: 'Sunrise Coffee Shop',
    timeAgo: 'Just now',
  },
] as const

// ============================================================================
// CONSUMER DEMO DATA
// ============================================================================

/**
 * Mock posts for the consumer demo screen
 *
 * These represent posts the user might find while browsing
 * that could be about them. They demonstrate:
 * - Match scoring based on avatar similarity
 * - Different types of encounters
 * - Various locations and timeframes
 */
export const CONSUMER_DEMO_POSTS: readonly DemoConsumerPost[] = [
  {
    id: 'demo-consumer-1',
    posterAvatar: AVATAR_PRESET_PROFESSIONAL,
    message:
      'You were wearing a blue scarf and reading at the window seat. Your laugh made my day brighter!',
    location: 'Central Library',
    timeAgo: '2 hours ago',
    matchScore: 85,
  },
  {
    id: 'demo-consumer-2',
    posterAvatar: AVATAR_PRESET_CURLY,
    message:
      'We both reached for the last oat milk latte. You let me have it - thanks! Coffee sometime?',
    location: 'Sunrise Coffee Shop',
    timeAgo: '5 hours ago',
    matchScore: 72,
  },
] as const

/**
 * Extended set of consumer demo posts for fuller demonstration
 * Includes a wider variety of scenarios and match scores
 */
export const CONSUMER_DEMO_POSTS_EXTENDED: readonly DemoConsumerPost[] = [
  ...CONSUMER_DEMO_POSTS,
  {
    id: 'demo-consumer-3',
    posterAvatar: AVATAR_PRESET_VINTAGE,
    message:
      "You were stretching near the yoga mats. Your focus was inspiring. I'd love to know what motivates you!",
    location: 'Downtown Gym',
    timeAgo: '1 day ago',
    matchScore: 68,
  },
  {
    id: 'demo-consumer-4',
    posterAvatar: AVATAR_PRESET_RELAXED,
    message:
      "We shared a smile when that dog started chasing squirrels. You seemed like someone who appreciates the simple joys. Let's connect!",
    location: 'Riverside Park',
    timeAgo: '2 days ago',
    matchScore: 55,
  },
  {
    id: 'demo-consumer-5',
    posterAvatar: AVATAR_PRESET_MUSIC,
    message:
      "You helped me pick up my groceries when my bag broke. Thanks for being so kind!",
    location: 'Whole Foods Market',
    timeAgo: '3 days ago',
    matchScore: 45,
  },
] as const

// ============================================================================
// DEMO MESSAGES
// ============================================================================

/**
 * Collection of engaging demo messages for various scenarios
 * Organized by encounter type for easy selection
 */
export const DEMO_MESSAGES = {
  /** Coffee shop encounters */
  coffeeShop: [
    'You were reading at the corner table. I loved your concentration and wished I could ask what book it was!',
    'We made eye contact while waiting for our orders. Your smile made my morning.',
    "You helped me when I spilled my coffee. Thank you for being so kind!",
    "I overheard you talking about travel - I'd love to hear your recommendations!",
  ],

  /** Library/bookstore encounters */
  bookish: [
    'We both reached for the same book. Great taste! Would love to discuss it sometime.',
    "You were so absorbed in your book, I didn't want to interrupt. What were you reading?",
    'I noticed we have similar taste in genres. Fellow mystery fan?',
  ],

  /** Park/outdoor encounters */
  outdoor: [
    'You were playing guitar by the fountain. Your music was beautiful!',
    "We shared a bench and watched the sunset. It was a peaceful moment I won't forget.",
    'Your dog came over to say hi. You seemed like someone I would enjoy talking to.',
  ],

  /** Transit encounters */
  transit: [
    'We caught each other\'s eye on the morning commute. Your smile made the crowded train bearable!',
    'You gave up your seat for someone. Random acts of kindness are rare - thank you.',
  ],

  /** Gym encounters */
  fitness: [
    'Your workout form is impressive! Would love some tips sometime.',
    'We always seem to be at the gym at the same time. Maybe we should say hi?',
  ],

  /** General friendly encounters */
  general: [
    'You held the door open for me. Such a small thing but it made my day.',
    "We exchanged smiles while waiting in line. You seemed friendly and approachable.",
    "Something about your energy was really positive. I hope we cross paths again!",
  ],
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a random avatar preset from the collection
 *
 * @returns Random AvatarConfig
 *
 * @example
 * const randomAvatar = getRandomAvatarPreset()
 */
export function getRandomAvatarPreset(): AvatarConfig {
  const randomIndex = Math.floor(Math.random() * AVATAR_PRESETS.length)
  return AVATAR_PRESETS[randomIndex]
}

/**
 * Get a random demo location
 *
 * @returns Random DemoLocation
 *
 * @example
 * const randomLocation = getRandomDemoLocation()
 * console.log(randomLocation.name) // e.g., "Sunrise Coffee Shop"
 */
export function getRandomDemoLocation(): DemoLocation {
  const randomIndex = Math.floor(Math.random() * DEMO_LOCATIONS.length)
  return DEMO_LOCATIONS[randomIndex]
}

/**
 * Get a random message for a given category
 *
 * @param category - Message category to select from
 * @returns Random message string
 *
 * @example
 * const message = getRandomMessage('coffeeShop')
 */
export function getRandomMessage(
  category: keyof typeof DEMO_MESSAGES
): string {
  const messages = DEMO_MESSAGES[category]
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

/**
 * Generate a relative time string
 *
 * @param hoursAgo - Number of hours ago
 * @returns Formatted time string
 *
 * @example
 * formatTimeAgo(0) // "Just now"
 * formatTimeAgo(2) // "2 hours ago"
 * formatTimeAgo(25) // "1 day ago"
 */
export function formatTimeAgo(hoursAgo: number): string {
  if (hoursAgo === 0) return 'Just now'
  if (hoursAgo < 1) return 'Less than an hour ago'
  if (hoursAgo === 1) return '1 hour ago'
  if (hoursAgo < 24) return `${hoursAgo} hours ago`

  const daysAgo = Math.floor(hoursAgo / 24)
  if (daysAgo === 1) return '1 day ago'
  if (daysAgo < 7) return `${daysAgo} days ago`

  const weeksAgo = Math.floor(daysAgo / 7)
  if (weeksAgo === 1) return '1 week ago'
  return `${weeksAgo} weeks ago`
}

/**
 * Create a mock consumer post with specified parameters
 *
 * @param options - Post configuration options
 * @returns Configured DemoConsumerPost
 *
 * @example
 * const post = createMockConsumerPost({
 *   id: 'custom-1',
 *   matchScore: 80,
 *   location: 'Custom Location',
 * })
 */
export function createMockConsumerPost(
  options: Partial<DemoConsumerPost> & { id: string }
): DemoConsumerPost {
  return {
    posterAvatar: options.posterAvatar ?? getRandomAvatarPreset(),
    message: options.message ?? getRandomMessage('general'),
    location: options.location ?? getRandomDemoLocation().name,
    timeAgo: options.timeAgo ?? '1 hour ago',
    matchScore: options.matchScore,
    ...options,
  }
}

/**
 * Create a mock producer post with specified parameters
 *
 * @param options - Post configuration options
 * @returns Configured DemoProducerPost
 *
 * @example
 * const post = createMockProducerPost({
 *   location: 'Custom Cafe',
 *   message: 'Custom message here',
 * })
 */
export function createMockProducerPost(
  options?: Partial<DemoProducerPost>
): DemoProducerPost {
  return {
    targetAvatar: options?.targetAvatar ?? getRandomAvatarPreset(),
    message: options?.message ?? getRandomMessage('general'),
    location: options?.location ?? getRandomDemoLocation().name,
    timeAgo: options?.timeAgo ?? 'Just now',
    ...options,
  }
}
