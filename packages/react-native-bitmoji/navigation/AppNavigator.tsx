/**
 * AppNavigator - Main navigation configuration
 *
 * Handles navigation between screens:
 * - Onboarding (first-time users)
 * - Avatar Editor (main customization)
 * - Sticker Picker (browse and share stickers)
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AvatarConfig } from '../avatar/types';

// Screen imports
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AvatarEditorScreen } from '../screens/AvatarEditorScreen';
import { StickerPickerScreen } from '../screens/StickerPickerScreen';
import { AvatarGalleryScreen } from '../screens/AvatarGalleryScreen';
import { QATestScreen } from '../screens/QATestScreen';

// =============================================================================
// TYPES
// =============================================================================

export type RootStackParamList = {
  Onboarding: undefined;
  AvatarEditor: {
    initialConfig?: AvatarConfig;
    isNewUser?: boolean;
  };
  StickerPicker: {
    avatarConfig?: AvatarConfig;
  };
  AvatarGallery: undefined;
  QATest: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// =============================================================================
// NAVIGATOR
// =============================================================================

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  /** Whether user has completed onboarding */
  hasCompletedOnboarding?: boolean;
  /** Initial avatar config if user has one saved */
  initialAvatarConfig?: AvatarConfig;
}

export function AppNavigator({
  hasCompletedOnboarding = false,
  initialAvatarConfig,
}: AppNavigatorProps) {
  const initialRoute = hasCompletedOnboarding ? 'AvatarEditor' : 'Onboarding';

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
        />
        <Stack.Screen
          name="AvatarEditor"
          component={AvatarEditorScreen}
          initialParams={{ initialConfig: initialAvatarConfig }}
        />
        <Stack.Screen
          name="StickerPicker"
          component={StickerPickerScreen}
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="AvatarGallery"
          component={AvatarGalleryScreen}
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="QATest"
          component={QATestScreen}
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
