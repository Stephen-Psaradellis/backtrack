/**
 * App Navigator
 *
 * Main navigation structure for the Love Ledger app.
 * Implements a nested navigation pattern:
 * - RootStack: Switches between Auth and Main based on authentication state
 * - AuthStack: Login and password reset screens
 * - MainStack: Authenticated screens with tab navigator
 * - MainTabs: Bottom tab navigation for core app sections
 */

import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'

import { useAuth } from '../contexts/AuthContext'
import { SmallAvatarPreview } from '../components/ReadyPlayerMe'
import { AuthScreen } from '../screens/AuthScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { CreatePostScreen } from '../screens/CreatePostScreen'
import { LedgerScreen } from '../screens/LedgerScreen'
import { PostDetailScreen } from '../screens/PostDetailScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { ChatListScreen } from '../screens/ChatListScreen'
import { AvatarCreatorScreen } from '../screens/AvatarCreatorScreen'
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
// PLACEHOLDER SCREENS
// These will be replaced with actual screen implementations in later phases
// ============================================================================

/**
 * Placeholder screen component for screens not yet implemented
 */
function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSubtitle}>Coming soon...</Text>
    </View>
  )
}

// Auth Screens (Phase 4)
// LoginScreen is now imported from '../screens/AuthScreen'

function ForgotPasswordScreen() {
  return <PlaceholderScreen title="Forgot Password" />
}

// Tab Screens (Phases 5, 9, 11)
// HomeScreen is now imported from '../screens/HomeScreen'
// ChatListScreen is now imported from '../screens/ChatListScreen'
// ProfileScreen is now imported from '../screens/ProfileScreen'

// Stack Screens (Phases 7, 8, 9)
// CreatePostScreen is now imported from '../screens/CreatePostScreen'
// LedgerScreen is now imported from '../screens/LedgerScreen'
// PostDetailScreen is now imported from '../screens/PostDetailScreen'
// ChatScreen is now imported from '../screens/ChatScreen'


// ============================================================================
// HEADER AVATAR COMPONENT
// ============================================================================

/**
 * Header component displaying the user's avatar
 * Shown in the right side of tab navigator headers
 */
function HeaderAvatar({ onPress }: { onPress?: () => void }) {
  const { profile } = useAuth()

  const hasAvatar = profile?.rpm_avatar_id

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.headerAvatarContainer}
      testID="header-avatar"
      activeOpacity={0.7}
    >
      {hasAvatar ? (
        <SmallAvatarPreview
          avatarId={profile.rpm_avatar_id!}
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
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <MainTabs.Screen
        name={SCREENS.HomeTab}
        component={HomeScreen}
        options={{
          title: TAB_LABELS.HomeTab,
          headerTitle: 'Love Ledger',
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
      <AuthStack.Screen
        name={SCREENS.ForgotPassword}
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          headerTitle: 'Reset Password',
          presentation: 'modal',
        }}
      />
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
        headerTintColor: '#007AFF',
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
        <ActivityIndicator size="large" color="#007AFF" />
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
// APP NAVIGATOR (EXPORTED COMPONENT)
// ============================================================================

/**
 * Main app navigator wrapped in NavigationContainer
 * This is the top-level navigation component that should be rendered in App.tsx
 */
export function AppNavigator() {
  return (
    <NavigationContainer>
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
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E5EA',
    borderTopWidth: 1,
    paddingTop: 4,
    paddingBottom: 4,
    height: 56,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
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
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AppNavigator
export { RootNavigator, MainTabNavigator, AuthStackNavigator, MainStackNavigator }