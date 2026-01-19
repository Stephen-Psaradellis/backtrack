/**
 * Mock Data for Onboarding Demo Screens
 *
 * Provides realistic mock posts and location data for the producer and
 * consumer demo screens during onboarding.
 *
 * Uses 2D avatar system for avatar display.
 */

import type { Avatar2DConfig } from '../../components/avatar2d/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mock demo post for producer flow
 * Represents a post the user would create about someone they saw
 */
export interface DemoProducerPost {
  /** Target avatar - the person the poster saw */
  targetAvatarId: string;
  /** Message describing the encounter */
  message: string;
  /** Location name where the encounter happened */
  location: string;
  /** Relative time since posting */
  timeAgo: string;
}

/**
 * Mock demo post for consumer flow
 * Represents a post the user might find about themselves
 */
export interface DemoConsumerPost {
  /** Unique identifier for the post */
  id: string;
  /** Poster's avatar ID - who wrote this post */
  posterAvatarId: string;
  /** Message content of the post */
  message: string;
  /** Location name where the encounter happened */
  location: string;
  /** Relative time since posting */
  timeAgo: string;
  /** Match score showing how well this might match the user (0-100) */
  matchScore?: number;
}

/**
 * Mock location data for demo screens
 */
export interface DemoLocation {
  /** Location name */
  name: string;
  /** Location type/category */
  type: 'coffee' | 'library' | 'park' | 'bookstore' | 'gym' | 'grocery' | 'transit';
  /** Icon emoji for the location type */
  icon: string;
}

// ============================================================================
// AVATAR PRESETS FOR DEMOS
// ============================================================================

/**
 * Available avatar preset IDs for demo scenarios.
 * These correspond to the LOCAL_AVATAR_PRESETS in lib/avatar/defaults.ts
 */
export const DEMO_AVATAR_IDS = [
  'avatar_asian_m',
  'avatar_asian_f',
  'avatar_black_m',
  'avatar_white_f',
  'avatar_hispanic_m',
  'avatar_mena_f',
] as const;

export type DemoAvatarId = (typeof DEMO_AVATAR_IDS)[number];

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
] as const;

// ============================================================================
// PRODUCER DEMO DATA
// ============================================================================

/**
 * Primary mock post for the producer demo screen
 *
 * This represents an example of what a user might post about
 * someone they noticed at a coffee shop.
 */
export const PRODUCER_DEMO_POST: DemoProducerPost = {
  targetAvatarId: 'avatar_asian_f',
  message:
    'You were reading "The Midnight Library" at the corner table. I loved your laugh when your friend made a joke. Would love to chat about books sometime!',
  location: 'Sunrise Coffee Shop',
  timeAgo: 'Just now',
};

/**
 * Alternative producer demo posts for variety
 */
export const PRODUCER_DEMO_POSTS_ALT: readonly DemoProducerPost[] = [
  {
    targetAvatarId: 'avatar_hispanic_m',
    message:
      "You were listening to something that made you smile while waiting for your order. Your energy was so positive - it made my morning better!",
    location: 'Greenleaf Cafe',
    timeAgo: 'Just now',
  },
  {
    targetAvatarId: 'avatar_white_f',
    message:
      "We both reached for the same book in the fiction section. You recommended another author I might like. I'd love to hear more suggestions!",
    location: 'The Book Nook',
    timeAgo: 'Just now',
  },
  {
    targetAvatarId: 'avatar_black_m',
    message:
      "You held the door open for me when my hands were full. Such a small thing but it made my day. Coffee sometime?",
    location: 'Sunrise Coffee Shop',
    timeAgo: 'Just now',
  },
] as const;

// ============================================================================
// CONSUMER DEMO DATA
// ============================================================================

/**
 * Mock posts for the consumer demo screen
 *
 * These represent posts the user might find while browsing
 * that could be about them.
 */
export const CONSUMER_DEMO_POSTS: readonly DemoConsumerPost[] = [
  {
    id: 'demo-consumer-1',
    posterAvatarId: 'avatar_asian_m',
    message:
      'You were wearing a blue scarf and reading at the window seat. Your laugh made my day brighter!',
    location: 'Central Library',
    timeAgo: '2 hours ago',
    matchScore: 85,
  },
  {
    id: 'demo-consumer-2',
    posterAvatarId: 'avatar_mena_f',
    message:
      'We both reached for the last oat milk latte. You let me have it - thanks! Coffee sometime?',
    location: 'Sunrise Coffee Shop',
    timeAgo: '5 hours ago',
    matchScore: 72,
  },
] as const;

/**
 * Extended set of consumer demo posts for fuller demonstration
 */
export const CONSUMER_DEMO_POSTS_EXTENDED: readonly DemoConsumerPost[] = [
  ...CONSUMER_DEMO_POSTS,
  {
    id: 'demo-consumer-3',
    posterAvatarId: 'avatar_white_f',
    message:
      "You were stretching near the yoga mats. Your focus was inspiring. I'd love to know what motivates you!",
    location: 'Downtown Gym',
    timeAgo: '1 day ago',
    matchScore: 68,
  },
  {
    id: 'demo-consumer-4',
    posterAvatarId: 'avatar_hispanic_m',
    message:
      "We shared a smile when that dog started chasing squirrels. You seemed like someone who appreciates the simple joys. Let's connect!",
    location: 'Riverside Park',
    timeAgo: '2 days ago',
    matchScore: 55,
  },
  {
    id: 'demo-consumer-5',
    posterAvatarId: 'avatar_black_m',
    message:
      "You helped me pick up my groceries when my bag broke. Thanks for being so kind!",
    location: 'Whole Foods Market',
    timeAgo: '3 days ago',
    matchScore: 45,
  },
] as const;

// ============================================================================
// DEMO MESSAGES
// ============================================================================

/**
 * Collection of engaging demo messages for various scenarios
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
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a random avatar preset ID from the collection
 */
export function getRandomAvatarId(): DemoAvatarId {
  const randomIndex = Math.floor(Math.random() * DEMO_AVATAR_IDS.length);
  return DEMO_AVATAR_IDS[randomIndex];
}

/**
 * Get a random demo location
 */
export function getRandomDemoLocation(): DemoLocation {
  const randomIndex = Math.floor(Math.random() * DEMO_LOCATIONS.length);
  return DEMO_LOCATIONS[randomIndex];
}

/**
 * Get a random message for a given category
 */
export function getRandomMessage(
  category: keyof typeof DEMO_MESSAGES
): string {
  const messages = DEMO_MESSAGES[category];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

/**
 * Generate a relative time string
 */
export function formatTimeAgo(hoursAgo: number): string {
  if (hoursAgo === 0) return 'Just now';
  if (hoursAgo < 1) return 'Less than an hour ago';
  if (hoursAgo === 1) return '1 hour ago';
  if (hoursAgo < 24) return `${hoursAgo} hours ago`;

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo === 1) return '1 day ago';
  if (daysAgo < 7) return `${daysAgo} days ago`;

  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo === 1) return '1 week ago';
  return `${weeksAgo} weeks ago`;
}

/**
 * Create a mock consumer post with specified parameters
 */
export function createMockConsumerPost(
  options: Partial<DemoConsumerPost> & { id: string }
): DemoConsumerPost {
  return {
    posterAvatarId: options.posterAvatarId ?? getRandomAvatarId(),
    message: options.message ?? getRandomMessage('general'),
    location: options.location ?? getRandomDemoLocation().name,
    timeAgo: options.timeAgo ?? '1 hour ago',
    matchScore: options.matchScore,
    ...options,
  };
}

/**
 * Create a mock producer post with specified parameters
 */
export function createMockProducerPost(
  options?: Partial<DemoProducerPost>
): DemoProducerPost {
  return {
    targetAvatarId: options?.targetAvatarId ?? getRandomAvatarId(),
    message: options?.message ?? getRandomMessage('general'),
    location: options?.location ?? getRandomDemoLocation().name,
    timeAgo: options?.timeAgo ?? 'Just now',
    ...options,
  };
}
