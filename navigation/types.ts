/**
 * Navigation Types
 *
 * Type definitions for React Navigation in the Love Ledger app.
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
  /**
   * View details of a specific post
   * Deep-linked from match notifications: loveledger://match/:postId
   */
  PostDetail: { postId: string }
  /**
   * Chat with a specific conversation
   * Deep-linked from message notifications: loveledger://conversation/:conversationId
   */
  Chat: { conversationId: string }
  /** Avatar builder screen */
  AvatarBuilder: {
    /** Initial avatar configuration to edit */
    initialConfig?: AvatarConfig
    /** Callback when avatar is completed (passed via navigation params for serialization) */
    returnScreen?: keyof MainStackParamList
    returnParamKey?: string
  }
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
 */
export type MainTabParamList = {
  /** Home tab - Map view with location discovery */
  HomeTab: undefined
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
export type AvatarBuilderScreenProps = NativeStackScreenProps<MainStackParamList, 'AvatarBuilder'>

// Tab Screen Props with composite navigation (can access both tab and stack navigation)
export type HomeTabScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>,
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
export type AvatarBuilderRouteProp = RouteProp<MainStackParamList, 'AvatarBuilder'>

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
  PostDetail: 'PostDetail' as const,
  Chat: 'Chat' as const,
  AvatarBuilder: 'AvatarBuilder' as const,

  // Tabs
  HomeTab: 'HomeTab' as const,
  ChatsTab: 'ChatsTab' as const,
  ProfileTab: 'ProfileTab' as const,
}

/**
 * Tab icons mapping
 */
export const TAB_ICONS = {
  HomeTab: { focused: 'map', unfocused: 'map-outline' },
  ChatsTab: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  ProfileTab: { focused: 'person', unfocused: 'person-outline' },
} as const

/**
 * Tab labels
 */
export const TAB_LABELS: Record<keyof MainTabParamList, string> = {
  HomeTab: 'Explore',
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
  /** Match notification deep-link: loveledger://match/:postId */
  match: 'match/:postId',
  /** Message notification deep-link: loveledger://conversation/:conversationId */
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
    'PostDetail',
    'Chat',
    'AvatarBuilder',
  ]
  return mainScreens.includes(screenName as keyof MainStackParamList)
}