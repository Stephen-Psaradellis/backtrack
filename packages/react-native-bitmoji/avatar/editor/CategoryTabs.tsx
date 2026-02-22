/**
 * CategoryTabs Component
 *
 * Horizontal scrollable tabs for avatar editor categories.
 * Supports both light and dark mode with animated selection indicator.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, darkTheme } from '../../constants/theme';
import type { EditorCategory } from '../hooks/useAvatarEditor';

// =============================================================================
// TYPES
// =============================================================================

export interface CategoryTab {
  key: EditorCategory;
  label: string;
  icon: keyof typeof CATEGORY_ICONS;
}

export interface CategoryTabsProps {
  categories: CategoryTab[];
  activeCategory: EditorCategory;
  onSelectCategory: (category: EditorCategory) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = Math.min((SCREEN_WIDTH - 32) / 6, 72);
const TAB_HEIGHT = 64;

const CATEGORY_ICONS = {
  face: 'person-circle-outline',
  hair: 'cut-outline',
  eyes: 'eye-outline',
  nose: 'ellipse-outline',
  mouth: 'happy-outline',
  makeup: 'color-palette-outline',
  accessories: 'glasses-outline',
  body: 'body-outline',
  outfit: 'shirt-outline',
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function CategoryTabs({
  categories,
  activeCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({});

  // Initialize scale animations for each category
  categories.forEach((cat) => {
    if (!scaleAnims.current[cat.key]) {
      scaleAnims.current[cat.key] = new Animated.Value(
        cat.key === activeCategory ? 1 : 0
      );
    }
  });

  // Animate selection changes
  useEffect(() => {
    categories.forEach((cat) => {
      const isActive = cat.key === activeCategory;
      Animated.spring(scaleAnims.current[cat.key], {
        toValue: isActive ? 1 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    });
  }, [activeCategory, categories]);

  // Auto-scroll to active tab
  useEffect(() => {
    const activeIndex = categories.findIndex((c) => c.key === activeCategory);
    if (activeIndex !== -1 && scrollViewRef.current) {
      const scrollX = Math.max(0, activeIndex * TAB_WIDTH - SCREEN_WIDTH / 2 + TAB_WIDTH / 2);
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [activeCategory, categories]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {categories.map((category) => {
          const isActive = category.key === activeCategory;
          const scaleAnim = scaleAnims.current[category.key];

          const backgroundColor = scaleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [
              isDark ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)',
              isDark ? 'rgba(94, 108, 216, 0.2)' : 'rgba(99, 102, 241, 0.15)',
            ],
          });

          const scale = scaleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.05],
          });

          const iconColor = isActive
            ? isDark
              ? colors.primary[400]
              : colors.primary[500]
            : isDark
            ? darkTheme.textMuted
            : colors.neutral[400];

          const textColor = isActive
            ? isDark
              ? colors.primary[400]
              : colors.primary[600]
            : isDark
            ? darkTheme.textMuted
            : colors.neutral[500];

          return (
            <TouchableOpacity
              key={category.key}
              onPress={() => onSelectCategory(category.key)}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.tab,
                  isDark && styles.tabDark,
                  {
                    backgroundColor,
                    transform: [{ scale }],
                  },
                ]}
              >
                <Ionicons
                  name={CATEGORY_ICONS[category.icon] || 'help-circle-outline'}
                  size={24}
                  color={iconColor}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: textColor },
                    isActive && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {category.label}
                </Text>
                {isActive && (
                  <View
                    style={[
                      styles.activeIndicator,
                      { backgroundColor: colors.primary[500] },
                    ]}
                  />
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    backgroundColor: colors.white,
    borderBottomColor: colors.neutral[200],
  },
  containerDark: {
    backgroundColor: darkTheme.surface,
    borderBottomColor: darkTheme.glassBorder,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tabDark: {
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
});

export default CategoryTabs;
