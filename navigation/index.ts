/**
 * Navigation Module
 *
 * Exports all navigation-related components and types.
 * Import from this file for clean navigation access.
 *
 * @example
 * import { AppNavigator, SCREENS } from './navigation'
 * import type { MainStackNavigationProp } from './navigation'
 */

// Main navigator component
export { AppNavigator, default } from './AppNavigator'

// Sub-navigators (for testing or custom composition)
export {
  RootNavigator,
  MainTabNavigator,
  AuthStackNavigator,
  MainStackNavigator,
} from './AppNavigator'

// Type exports
export type {
  // Param lists
  RootStackParamList,
  AuthStackParamList,
  MainStackParamList,
  MainTabParamList,

  // Screen props
  LoginScreenProps,
  ForgotPasswordScreenProps,
  CreatePostScreenProps,
  LedgerScreenProps,
  PostDetailScreenProps,
  ChatScreenProps,
  AvatarCreatorScreenProps,
  HomeTabScreenProps,
  ChatsTabScreenProps,
  ProfileTabScreenProps,

  // Navigation props
  AuthStackNavigationProp,
  MainStackNavigationProp,
  MainTabNavigationProp,
  RootNavigationProp,

  // Route props
  CreatePostRouteProp,
  LedgerRouteProp,
  PostDetailRouteProp,
  ChatRouteProp,
  AvatarCreatorRouteProp,
} from './types'

// Constants
export { SCREENS, TAB_ICONS, TAB_LABELS, isAuthScreen, isMainScreen } from './types'
