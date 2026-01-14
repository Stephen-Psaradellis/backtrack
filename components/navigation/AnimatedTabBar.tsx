/**
 * Animated Tab Bar
 *
 * Custom bottom tab bar with animated indicator and modern styling.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Icon mapping for tabs
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  HomeTab: { active: 'home', inactive: 'home-outline' },
  FavoritesTab: { active: 'heart', inactive: 'heart-outline' },
  ChatsTab: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
};

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;
  const tabWidth = SCREEN_WIDTH / tabCount;

  // Animated values
  const indicatorPosition = useRef(new Animated.Value(state.index * tabWidth)).current;
  const scales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  // Animate indicator on tab change
  useEffect(() => {
    Animated.spring(indicatorPosition, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();
  }, [state.index, tabWidth, indicatorPosition]);

  const handleTabPress = (route: typeof state.routes[0], index: number, isFocused: boolean) => {
    // Scale animation
    Animated.sequence([
      Animated.timing(scales[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scales[index], {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {/* Animated indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: tabWidth - 24,
            transform: [
              {
                translateX: Animated.add(
                  indicatorPosition,
                  new Animated.Value(12)
                ),
              },
            ],
          },
        ]}
      />

      {/* Tab buttons */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const iconConfig = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
        const iconName = isFocused ? iconConfig.active : iconConfig.inactive;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={() => handleTabPress(route, index, isFocused)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[
                styles.tabContent,
                { transform: [{ scale: scales[index] }] },
              ]}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? colors.primary[500] : colors.neutral[400]}
                style={styles.icon}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? colors.primary[500] : colors.neutral[400],
                    fontWeight: isFocused ? '600' : '500',
                  },
                ]}
              >
                {typeof label === 'string' ? label : route.name}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 8,
    ...Platform.select({
      ios: {
        ...shadows.native.md,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: colors.primary[500],
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});

export default AnimatedTabBar;
