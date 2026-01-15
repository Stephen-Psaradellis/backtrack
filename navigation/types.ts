/**
 * Navigation Types
 *
 * Type definitions for React Navigation in the Backtrack app.
 * Provides typed navigation hooks and screen props for type-safe navigation.
 */

import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { BottomTabScreenProps, BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps, CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { AvatarConfig } from '../types/avatar'

// ============================================================================
// STACK NAVIGATOR PARAM LISTS
// ============================================================================

/**
 * Authentication stack parameter list
 * Used when user is not logged in
 */
export type AuthStackParamList = {
  /** Login/Signup screen */
  Login: undefined
  /** Password reset screen */
  ForgotPassword: undefined
}

/**
 * Main app stack parameter list
 * Used when user is authenticated
 */
export type MainStackParamList = {
  /** Main tab navigator */
  MainTabs: NavigatorScreenParams<MainTabParamList>
  /** Create a new post - optionally with pre-selected location */
  CreatePost: { locationId?: string }
  /** View posts at a specific location */
  Ledger: { locationId: string; locationName: string }
  /** Favorites screen for managing saved locations */
  Favorites: undefined
  /**
   * View details of a specific post
   * Deep-linked from match notifications: backtrack://match/:postId
   */
  PostDetail: { postId: string }
  /**
   * Chat with a specific conversation
   * Deep-linked from message notifications: backtrack://conversation/:conversationId
   */
  Chat: { conversationId: string }
  /** Avatar creator screen */
  AvatarCreator: {
    /** Initial avatar ID to edit */
    initialAvatarId?: string
  }
  /** Legal documents screen (privacy policy, terms of service) */
  Legal: {
    /** Type of legal document to display */
    type: 'privacy' | 'terms'
  }
  /** WebGL 3D Test screen (development only) */
  WebGL3DTest: undefined
}

/**
 * Root stack parameter list
 * Top-level navigation that switches between Auth and Main stacks
 */
export type RootStackParamList = {
  /** Authentication flow (login, signup, forgot password) */
  Auth: NavigatorScreenParams<AuthStackParamList>
  /** Main app flow (after authentication) */
  Main: NavigatorScreenParams<MainStackParamList>
}

// ============================================================================
// TAB NAVIGATOR PARAM LISTS
// ============================================================================

/**
 * Main tab navigator parameter list
 * Bottom tab navigation for authenticated users
 * 5-tab icon-only layout: Feed, MySpots, Map, Chats, Profile
 */
export type MainTabParamList = {
  /** Feed tab - Browse all posts */
  FeedTab: undefined
  /** My Spots tab - User's posts and matches with notification badges */
  MySpotsTab: undefined
  /** Map tab - Map view with location discovery */
  MapTab: undefined
  /** Chat list tab - All conversations */
  ChatsTab: undefined
  /** Profile tab - User settings and avatar */
  ProfileTab: undefined
}

// ============================================================================
// SCREEN PROPS TYPES
// ============================================================================

// Auth Stack Screen Props
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>
export type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>

// Main Stack Screen Props
export type CreatePostScreenProps = NativeStackScreenProps<MainStackParamList, 'CreatePost'>
export type LedgerScreenProps = NativeStackScreenProps<MainStackParamList, 'Ledger'>
export type PostDetailScreenProps = NativeStackScreenProps<MainStackParamList, 'PostDetail'>
export type ChatScreenProps = NativeStackScreenProps<MainStackParamList, 'Chat'>
export type AvatarCreatorScreenProps = NativeStackScreenProps<MainStackParamList, 'AvatarCreator'>

// Tab Screen Props with composite navigation (can access both tab and stack navigation)
export type FeedTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'FeedTab'>,
  NativeStackScreenProps<MainStackParamList>
>

export type MySpotsTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MySpotsTab'>,
  NativeStackScreenProps<MainStackParamList>
>

export type MapTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MapTab'>,
  NativeStackScreenProps<MainStackParamList>
>

export type ChatsTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ChatsTab'>,
  NativeStackScreenProps<MainStackParamList>
>

export type ProfileTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ProfileTab'>,
  NativeStackScreenProps<MainStackParamList>
>

// ============================================================================
// NAVIGATION PROP TYPES
// ============================================================================

/**
 * Navigation prop for screens in the Auth stack
 */
export type AuthStackNavigationProp = NativeStackNavigationProp<AuthStackParamList>

/**
 * Navigation prop for screens in the Main stack
 */
export type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>

/**
 * Navigation prop for screens in the Main tabs with access to stack navigation
 */
export type MainTabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<MainStackParamList>
>

/**
 * Root navigation prop for switching between Auth and Main
 */
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>

// ============================================================================
// ROUTE PROP TYPES
// ============================================================================

export type CreatePostRouteProp = RouteProp<MainStackParamList, 'CreatePost'>
export type LedgerRouteProp = RouteProp<MainStackParamList, 'Ledger'>
export type PostDetailRouteProp = RouteProp<MainStackParamList, 'PostDetail'>
export type ChatRouteProp = RouteProp<MainStackParamList, 'Chat'>
export type AvatarCreatorRouteProp = RouteProp<MainStackParamList, 'AvatarCreator'>


// ============================================================================
// NAVIGATION CONSTANTS
// ============================================================================

/**
 * Screen names for type-safe navigation
 */
export const SCREENS = {
  // Auth Stack
  Login: 'Login' as const,
  ForgotPassword: 'ForgotPassword' as const,

  // Root Stack
  Auth: 'Auth' as const,
  Main: 'Main' as const,

  // Main Stack
  MainTabs: 'MainTabs' as const,
  CreatePost: 'CreatePost' as const,
  Ledger: 'Ledger' as const,
  Favorites: 'Favorites' as const,
  PostDetail: 'PostDetail' as const,
  Chat: 'Chat' as const,
  AvatarCreator: 'AvatarCreator' as const,
  Legal: 'Legal' as const,
  WebGL3DTest: 'WebGL3DTest' as const,

  // Tabs (5-tab icon-only layout)
  FeedTab: 'FeedTab' as const,
  MySpotsTab: 'MySpotsTab' as const,
  MapTab: 'MapTab' as const,
  ChatsTab: 'ChatsTab' as const,
  ProfileTab: 'ProfileTab' as const,
}

/**
 * Tab icons mapping (5-tab icon-only layout)
 */
export const TAB_ICONS = {
  FeedTab: { focused: 'home', unfocused: 'home-outline' },
  MySpotsTab: { focused: 'notifications', unfocused: 'notifications-outline' },
  MapTab: { focused: 'map', unfocused: 'map-outline' },
  ChatsTab: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  ProfileTab: { focused: 'person', unfocused: 'person-outline' },
} as const

/**
 * Tab labels (kept for accessibility, not displayed in icon-only layout)
 */
export const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  FeedTab: 'Feed',
  MySpotsTab: 'My Spots',
  MapTab: 'Map',
  ChatsTab: 'Chats',
  ProfileTab: 'Profile',
}

// ============================================================================
// NOTIFICATION DEEP-LINK TYPES
// ============================================================================

/**
 * Notification types that can trigger navigation
 */
export type NotificationType = 'match' | 'message'

/**
 * Deep-link parameter types for notification-triggered navigation
 */
export type NotificationDeepLinkParams = {
  /** Match notification navigates to PostDetail with postId */
  match: MainStackParamList['PostDetail']
  /** Message notification navigates to Chat with conversationId */
  message: MainStackParamList['Chat']
}

/**
 * Helper type to get navigation params for a notification type
 */
export type NotificationNavParams<T extends NotificationType> = NotificationDeepLinkParams[T]

/**
 * Deep-link URL patterns for notifications
 * Used by AppNavigator linking configuration
 */
export const NOTIFICATION_DEEP_LINK_PATHS = {
  /** Match notification deep-link: backtrack://match/:postId */
  match: 'match/:postId',
  /** Message notification deep-link: backtrack://conversation/:conversationId */
  message: 'conversation/:conversationId',
} as const

/**
 * Target screens for notification types
 */
export const NOTIFICATION_TARGET_SCREENS: Record<NotificationType, keyof MainStackParamList> = {
  match: 'PostDetail',
  message: 'Chat',
} as const

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a screen name belongs to the auth stack
 */
export function isAuthScreen(screenName: string): screenName is keyof AuthStackParamList {
  return screenName === 'Login' || screenName === 'ForgotPassword'
}

/**
 * Check if a screen name belongs to the main stack
 */
export function isMainScreen(screenName: string): screenName is keyof MainStackParamList {
  const mainScreens: (keyof MainStackParamList)[] = [
    'MainTabs',
    'CreatePost',
    'Ledger',
    'Favorites',
    'PostDetail',
    'Chat',
    'AvatarCreator',
  ]
  return mainScreens.includes(screenName as keyof MainStackParamList)
}