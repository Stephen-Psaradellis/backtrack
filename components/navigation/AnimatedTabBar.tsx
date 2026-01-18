/**
 * Animated Tab Bar
 *
 * Custom bottom tab bar with animated indicator and icon-only design.
 * 5-tab layout: Feed, MySpots, Map, Chats, Profile
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../constants/theme';
import { darkTheme } from '../../constants/glassStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Icon mapping for 5-tab icon-only layout
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  FeedTab: { active: 'home', inactive: 'home-outline' },
  MySpotsTab: { active: 'notifications', inactive: 'notifications-outline' },
  MapTab: { active: 'map', inactive: 'map-outline' },
  ChatsTab: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
};

// Badge configuration for tabs that support notification counts
interface TabBadgeProps {
  count?: number;
  visible?: boolean;
}

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

      {/* Tab buttons - icon only, no text labels */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const iconConfig = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
        const iconName = isFocused ? iconConfig.active : iconConfig.inactive;

        // Get badge from route options (can be set via tabBarBadge)
        const badge = options.tabBarBadge;
        const showBadge = badge !== undefined && badge !== null && badge !== '' && badge !== 0;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || route.name}
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
              <View style={styles.iconContainer}>
                <Ionicons
                  name={iconName}
                  size={26}
                  color={isFocused ? darkTheme.accent : darkTheme.textMuted}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    {typeof badge === 'number' && badge > 0 && (
                      <Animated.Text style={styles.badgeText}>
                        {badge > 99 ? '99+' : badge}
                      </Animated.Text>
                    )}
                  </View>
                )}
              </View>
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
    backgroundColor: darkTheme.cardBackground,
    borderTopWidth: 1,
    borderTopColor: darkTheme.cardBorder,
    paddingTop: 12,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: darkTheme.accent,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: darkTheme.cardBackground,
  },
  badgeText: {
    color: darkTheme.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AnimatedTabBar;
