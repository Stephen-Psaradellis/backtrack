/**
 * App Navigator
 *
 * Main navigation structure for the Backtrack app.
 * Implements a nested navigation pattern:
 * - RootStack: Switches between Auth and Main based on authentication state
 * - AuthStack: Login and password reset screens
 * - MainStack: Authenticated screens with tab navigator
 * - MainTabs: Bottom tab navigation for core app sections
 */

import React, { useRef, useCallback } from 'react'
import { NavigationContainer, LinkingOptions, NavigationState, PartialState } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import * as Linking from 'expo-linking'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'

import { trackScreenView } from '../lib/analytics'

import { useAuth } from '../contexts/AuthContext'
import { Avatar2DDisplay } from '../components/avatar2d'
import { AnimatedTabBar } from '../components/navigation/AnimatedTabBar'
import { AuthScreen } from '../screens/AuthScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { FeedScreen } from '../screens/FeedScreen'
import { MySpotsScreen } from '../screens/MySpotsScreen'
import { CreatePostScreen } from '../screens/CreatePostScreen'
import { LedgerScreen } from '../screens/LedgerScreen'
import { PostDetailScreen } from '../screens/PostDetailScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { ChatListScreen } from '../screens/ChatListScreen'
import AvatarCreatorScreen from '../screens/AvatarCreatorScreen'
import { LegalScreen } from '../screens/LegalScreen'
import { FavoritesScreen } from '../screens/FavoritesScreen'
import { MapSearchScreen } from '../screens/MapSearchScreen'
import type {
  RootStackParamList,
  AuthStackParamList,
  MainStackParamList,
  MainTabParamList,
} from './types'
import { SCREENS, TAB_LABELS } from './types'

// ============================================================================
// STACK AND TAB NAVIGATORS
// ============================================================================

const RootStack = createNativeStackNavigator<RootStackParamList>()
const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const MainStack = createNativeStackNavigator<MainStackParamList>()
const MainTabs = createBottomTabNavigator<MainTabParamList>()

// ============================================================================
// LINKING FALLBACK COMPONENT
// ============================================================================

/**
 * Fallback component shown while NavigationContainer resolves the initial URL
 * This prevents a black screen during deep-linking initialization
 */
function LinkingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF6B47" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )
}


// ============================================================================
// HEADER AVATAR COMPONENT
// ============================================================================

/**
 * Header component displaying the user's avatar
 * Shown in the right side of tab navigator headers
 */
function HeaderAvatar({ onPress }: { onPress?: () => void }) {
  const { profile } = useAuth()

  const hasAvatar = profile?.avatar

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.headerAvatarContainer}
      testID="header-avatar"
      activeOpacity={0.7}
    >
      {hasAvatar ? (
        <Avatar2DDisplay
          avatar={profile.avatar}
          size="sm"
        />
      ) : (
        <View style={styles.headerAvatarPlaceholder} testID="header-avatar-placeholder">
          <Text style={styles.headerAvatarPlaceholderText}>?</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ============================================================================
// TAB NAVIGATOR
// ============================================================================

/**
 * Main tab navigator for authenticated users
 * 5-tab icon-only layout: Feed, MySpots, Map, Chats, Profile
 */
function MainTabNavigator() {
  return (
    <MainTabs.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: true,
      }}
    >
      <MainTabs.Screen
        name={SCREENS.FeedTab}
        component={FeedScreen}
        options={{
          title: TAB_LABELS.FeedTab,
          headerShown: false, // Uses GlobalHeader
        }}
      />
      <MainTabs.Screen
        name={SCREENS.MySpotsTab}
        component={MySpotsScreen}
        options={{
          title: TAB_LABELS.MySpotsTab,
          headerShown: false, // Uses GlobalHeader
        }}
      />
      <MainTabs.Screen
        name={SCREENS.MapTab}
        component={MapSearchScreen}
        options={{
          title: TAB_LABELS.MapTab,
          headerShown: false, // Uses GlobalHeader
        }}
      />
      <MainTabs.Screen
        name={SCREENS.ChatsTab}
        component={ChatListScreen}
        options={{
          title: TAB_LABELS.ChatsTab,
          headerShown: false, // Uses GlobalHeader
        }}
      />
      <MainTabs.Screen
        name={SCREENS.ProfileTab}
        component={ProfileScreen}
        options={{
          title: TAB_LABELS.ProfileTab,
          headerShown: false, // Uses GlobalHeader
        }}
      />
    </MainTabs.Navigator>
  )
}

// ============================================================================
// AUTH STACK NAVIGATOR
// ============================================================================

/**
 * Authentication stack for unauthenticated users
 * Handles login, signup, and password reset flows
 */
function AuthStackNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name={SCREENS.Login} component={AuthScreen} />
    </AuthStack.Navigator>
  )
}

// ============================================================================
// MAIN STACK NAVIGATOR
// ============================================================================

/**
 * Main stack navigator for authenticated users
 * Contains tab navigator and modal screens
 */
function MainStackNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: '',
        headerTintColor: '#FF6B47',
        headerStyle: {
          backgroundColor: '#0F0F13',
        },
        headerTitleStyle: {
          color: '#FFFFFF',
        },
        headerShadowVisible: false,
      }}
    >
      <MainStack.Screen
        name={SCREENS.MainTabs}
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name={SCREENS.CreatePost}
        component={CreatePostScreen}
        options={{
          headerShown: false, // CreatePostScreen has its own header
          presentation: 'modal',
        }}
      />
      <MainStack.Screen
        name={SCREENS.Ledger}
        component={LedgerScreen}
        options={({ route }) => ({
          headerTitle: route.params.locationName,
        })}
      />
      <MainStack.Screen
        name={SCREENS.Favorites}
        component={FavoritesScreen}
        options={{
          headerTitle: 'Your Favorites',
        }}
      />
      <MainStack.Screen
        name={SCREENS.PostDetail}
        component={PostDetailScreen}
        options={{
          headerTitle: 'Post',
        }}
      />
      <MainStack.Screen
        name={SCREENS.Chat}
        component={ChatScreen}
        options={{
          headerTitle: 'Chat',
        }}
      />
      <MainStack.Screen
        name={SCREENS.AvatarCreator}
        component={AvatarCreatorScreen}
        options={{
          headerShown: false, // AvatarCreatorScreen has its own header
          presentation: 'modal',
        }}
      />
      <MainStack.Screen
        name={SCREENS.Legal}
        component={LegalScreen}
        options={{
          headerShown: false, // LegalScreen has its own header
        }}
      />
    </MainStack.Navigator>
  )
}

// ============================================================================
// ROOT NAVIGATOR
// ============================================================================

/**
 * Root navigator that switches between Auth and Main based on auth state
 */
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B47" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name={SCREENS.Main} component={MainStackNavigator} />
      ) : (
        <RootStack.Screen name={SCREENS.Auth} component={AuthStackNavigator} />
      )}
    </RootStack.Navigator>
  )
}

// ============================================================================
// DEEP-LINKING CONFIGURATION
// ============================================================================

/**
 * Prefix for the deep-linking URL scheme
 * Used for push notification deep-linking
 */
const prefix = Linking.createURL('/')

/**
 * Deep-linking configuration for push notifications
 * Maps URLs like:
 * - backtrack://conversation/:conversationId -> Chat screen
 * - backtrack://match/:postId -> PostDetail screen
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'backtrack://'],
  config: {
    screens: {
      Main: {
        screens: {
          // Deep-link for message notifications
          // URL: backtrack://conversation/:conversationId
          Chat: {
            path: 'conversation/:conversationId',
            parse: {
              conversationId: (conversationId: string) => conversationId,
            },
          },
          // Deep-link for match notifications
          // URL: backtrack://match/:postId
          PostDetail: {
            path: 'match/:postId',
            parse: {
              postId: (postId: string) => postId,
            },
          },
          // Main tabs can also be deep-linked
          MainTabs: {
            screens: {
              FeedTab: 'feed',
              MySpotsTab: 'myspots',
              MapTab: 'map',
              ChatsTab: 'chats',
              ProfileTab: 'profile',
            },
          },
        },
      },
      // Auth screens (typically not deep-linked, but available for future use)
      Auth: {
        screens: {
          Login: 'login',
        },
      },
    },
  },
}

// ============================================================================
// APP NAVIGATOR (EXPORTED COMPONENT)
// ============================================================================

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

/**
 * Get the current route name from a navigation state
 */
function getActiveRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined
): string | undefined {
  if (!state) return undefined

  const route = state.routes[state.index ?? 0]

  if (route.state) {
    // Dive into nested navigators
    return getActiveRouteName(route.state as NavigationState)
  }

  return route.name
}

/**
 * Main app navigator wrapped in NavigationContainer
 * This is the top-level navigation component that should be rendered in App.tsx
 * Includes deep-linking configuration for push notification navigation
 */
export function AppNavigator() {
  // Track the current route name for screen view analytics
  const routeNameRef = useRef<string | undefined>(undefined)

  /**
   * Handle navigation state changes to track screen views
   */
  const handleStateChange = useCallback(
    (state: NavigationState | undefined) => {
      const previousRouteName = routeNameRef.current
      const currentRouteName = getActiveRouteName(state)

      if (previousRouteName !== currentRouteName && currentRouteName) {
        // Track screen view (only route name, no params/PII)
        trackScreenView(currentRouteName)
      }

      // Save the current route name for next comparison
      routeNameRef.current = currentRouteName
    },
    []
  )

  /**
   * Set initial route name on container ready
   */
  const handleReady = useCallback(() => {
    // Track initial screen view handled in onStateChange
  }, [])

  return (
    <NavigationContainer
      linking={linking}
      fallback={<LinkingFallback />}
      onStateChange={handleStateChange}
      onReady={handleReady}
    >
      <RootNavigator />
    </NavigationContainer>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F13',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerAvatarContainer: {
    marginRight: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AppNavigator
export { RootNavigator, MainTabNavigator, AuthStackNavigator, MainStackNavigator }