/**
 * Animated Tab Bar
 *
 * Custom bottom tab bar with animated indicator, icons, and text labels.
 * 5-tab layout: Feed, History, Map, Chats, Me
 * Uses react-native-reanimated for performant UI-thread animations.
 */

import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../constants/theme';
import { darkTheme } from '../../constants/glassStyles';

// Icon mapping for 5-tab layout
const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  FeedTab: { active: 'home', inactive: 'home-outline' },
  HistoryTab: { active: 'time', inactive: 'time-outline' },
  MapTab: { active: 'map', inactive: 'map-outline' },
  ChatsTab: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
};

// User-facing text labels for each tab
const TAB_LABELS: Record<string, string> = {
  FeedTab: 'Feed',
  HistoryTab: 'History',
  MapTab: 'Map',
  ChatsTab: 'Chats',
  ProfileTab: 'Me',
};

// Badge configuration for tabs that support notification counts
interface TabBadgeProps {
  count?: number;
  visible?: boolean;
}

// ============================================================================
// TAB ITEM COMPONENT
// Extracted to its own component so useAnimatedStyle is called at the top
// level of a component, not inside a .map() callback - fixing Rules of Hooks.
// ============================================================================

interface TabItemProps {
  route: { key: string; name: string };
  index: number;
  isFocused: boolean;
  options: { tabBarBadge?: number | string; tabBarAccessibilityLabel?: string };
  scaleValue: SharedValue<number>;
  onPress: () => void;
}

function TabItem({ route, index, isFocused, options, scaleValue, onPress }: TabItemProps) {
  const iconConfig = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  const iconName = isFocused ? iconConfig.active : iconConfig.inactive;
  const label = TAB_LABELS[route.name] || route.name;

  const badge = options.tabBarBadge;
  const showBadge = badge !== undefined && badge !== null && badge !== '' && badge !== 0;

  // useAnimatedStyle is now called at the top level of a component — no Rules of Hooks violation
  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <TouchableOpacity
      key={route.key}
      accessibilityRole="tab"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel || `${label} tab${showBadge ? `, ${badge} notifications` : ''}`}
      accessibilityHint={isFocused ? undefined : `Double tap to navigate to ${label}`}
      onPress={onPress}
      style={styles.tab}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View style={[styles.tabContent, tabAnimatedStyle]}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconName}
            size={24}
            color={isFocused ? darkTheme.accent : darkTheme.textMuted}
          />
          {showBadge && (
            <View style={styles.badge}>
              {typeof badge === 'number' && badge > 0 && (
                <Text style={styles.badgeText}>
                  {badge > 99 ? '99+' : badge}
                </Text>
              )}
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? darkTheme.primary : darkTheme.textSecondary,
              fontWeight: isFocused ? '600' : '400',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================================================
// ANIMATED TAB BAR
// ============================================================================

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const tabCount = state.routes.length;
  const tabWidth = screenWidth / tabCount;

  // P-033: Initialize shared values once with useRef to prevent recreation on re-renders
  const indicatorPosition = React.useRef(useSharedValue(state.index * tabWidth)).current;
  // Each tab gets its own SharedValue for scale; stored in a ref so it's stable
  const scales = React.useRef<SharedValue<number>[]>(
    state.routes.map(() => useSharedValue(1))
  ).current;

  // Animate indicator on tab change
  useEffect(() => {
    indicatorPosition.value = withSpring(state.index * tabWidth, {
      damping: 10,
      stiffness: 68,
    });
  }, [state.index, tabWidth]);

  const handleTabPress = (route: typeof state.routes[0], index: number, isFocused: boolean) => {
    // Scale animation sequence: shrink then spring back
    scales[index].value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 300, mass: 0.8 })
    );

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  // Animated style for indicator
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value + 12 }],
  }));

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
          },
          indicatorStyle,
        ]}
      />

      {/* Tab buttons — rendered via TabItem so each useAnimatedStyle is at a component top level */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        return (
          <TabItem
            key={route.key}
            route={route}
            index={index}
            isFocused={isFocused}
            options={options}
            scaleValue={scales[index]}
            onPress={() => handleTabPress(route, index, isFocused)}
          />
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
    backgroundColor: darkTheme.error,
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
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default AnimatedTabBar;
