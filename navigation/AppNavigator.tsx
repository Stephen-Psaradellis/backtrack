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

import React from 'react'
import { NavigationContainer, LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import * as Linking from 'expo-linking'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'

import { useAuth } from '../contexts/AuthContext'
import { SmAvatarSnapshot } from '../components/avatar3d'
import { AnimatedTabBar } from '../components/navigation/AnimatedTabBar'
import { AuthScreen } from '../screens/AuthScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { CreatePostScreen } from '../screens/CreatePostScreen'
import { LedgerScreen } from '../screens/LedgerScreen'
import { PostDetailScreen } from '../screens/PostDetailScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { ChatListScreen } from '../screens/ChatListScreen'
import AvatarCreatorScreen from '../screens/AvatarCreatorScreen'
import { LegalScreen } from '../screens/LegalScreen'
import { WebGL3DTestScreen } from '../screens/WebGL3DTestScreen'
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
        <SmAvatarSnapshot
          avatar={profile.avatar}
          testID="header-avatar-preview"
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
 * Provides bottom navigation for core app sections
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
        name={SCREENS.HomeTab}
        component={HomeScreen}
        options={{
          title: TAB_LABELS.HomeTab,
          headerTitle: 'Backtrack',
          // eslint-disable-next-line react/no-unstable-nested-components
          headerRight: () => <HeaderAvatar />,
        }}
      />
      <MainTabs.Screen
        name={SCREENS.ChatsTab}
        component={ChatListScreen}
        options={{
          title: TAB_LABELS.ChatsTab,
          headerTitle: 'Conversations',
          // eslint-disable-next-line react/no-unstable-nested-components
          headerRight: () => <HeaderAvatar />,
        }}
      />
      <MainTabs.Screen
        name={SCREENS.ProfileTab}
        component={ProfileScreen}
        options={{
          title: TAB_LABELS.ProfileTab,
          headerTitle: 'Profile',
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
      <MainStack.Screen
        name={SCREENS.WebGL3DTest}
        component={WebGL3DTestScreen}
        options={{
          headerShown: false, // WebGL3DTestScreen has its own header
          presentation: 'modal',
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
              HomeTab: 'home',
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

/**
 * Main app navigator wrapped in NavigationContainer
 * This is the top-level navigation component that should be rendered in App.tsx
 * Includes deep-linking configuration for push notification navigation
 */
export function AppNavigator() {
  return (
    <NavigationContainer linking={linking} fallback={<LinkingFallback />}>
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
    backgroundColor: '#FAFAF9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#78716C',
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
    backgroundColor: '#E7E5E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#78716C',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AppNavigator
export { RootNavigator, MainTabNavigator, AuthStackNavigator, MainStackNavigator }