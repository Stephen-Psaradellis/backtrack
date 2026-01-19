/**
 * OptionGrid Component
 *
 * Grid of selectable options for avatar customization.
 * Used for selecting hair styles, eye types, mouth types, etc.
 * Supports both light and dark mode.
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '@/constants/glassStyles';
import { colors } from '@/constants/theme';
import type { CategoryOption } from '../hooks/useAvatarEditor';

// =============================================================================
// TYPES
// =============================================================================

export interface OptionGridProps {
  options: CategoryOption[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  columns?: number;
  showLabels?: boolean;
  emptyMessage?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;

const getItemWidth = (columns: number): number => {
  const totalGap = GRID_GAP * (columns - 1);
  const availableWidth = SCREEN_WIDTH - GRID_PADDING * 2 - totalGap;
  return Math.floor(availableWidth / columns);
};

// =============================================================================
// OPTION ITEM COMPONENT
// =============================================================================

interface OptionItemProps {
  item: CategoryOption;
  isSelected: boolean;
  onPress: () => void;
  width: number;
  showLabel: boolean;
  isDark: boolean;
}

function OptionItem({
  item,
  isSelected,
  onPress,
  width,
  showLabel,
  isDark,
}: OptionItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const containerStyle = [
    styles.optionItem,
    { width, height: showLabel ? width + 24 : width },
    isDark ? styles.optionItemDark : styles.optionItemLight,
    isSelected && (isDark ? styles.optionItemSelectedDark : styles.optionItemSelectedLight),
  ];

  const labelStyle = [
    styles.optionLabel,
    isDark ? styles.optionLabelDark : styles.optionLabelLight,
    isSelected && (isDark ? styles.optionLabelSelectedDark : styles.optionLabelSelectedLight),
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          containerStyle,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.optionContent, { width: width - 16, height: width - 16 }]}>
          {/* Preview placeholder - in real implementation this would show actual avatar preview */}
          <View
            style={[
              styles.optionPreview,
              isDark ? styles.optionPreviewDark : styles.optionPreviewLight,
            ]}
          >
            <Text style={[styles.previewText, isDark && styles.previewTextDark]}>
              {item.label.charAt(0).toUpperCase()}
            </Text>
          </View>
          {isSelected && (
            <View style={[styles.checkmark, isDark && styles.checkmarkDark]}>
              <Ionicons
                name="checkmark"
                size={14}
                color={colors.white}
              />
            </View>
          )}
        </View>
        {showLabel && (
          <Text style={labelStyle} numberOfLines={1}>
            {item.label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OptionGrid({
  options,
  selectedId,
  onSelect,
  columns = 4,
  showLabels = true,
  emptyMessage = 'No options available',
}: OptionGridProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark' || true; // Default to dark for this app

  const itemWidth = getItemWidth(columns);

  const renderItem = useCallback(
    ({ item }: { item: CategoryOption }) => (
      <OptionItem
        item={item}
        isSelected={item.id === selectedId}
        onPress={() => onSelect(item.id)}
        width={itemWidth}
        showLabel={showLabels}
        isDark={isDark}
      />
    ),
    [selectedId, onSelect, itemWidth, showLabels, isDark]
  );

  const keyExtractor = useCallback((item: CategoryOption) => item.id, []);

  if (options.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={isDark ? darkTheme.textMuted : colors.neutral[400]}
        />
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? darkTheme.textMuted : colors.neutral[500] },
          ]}
        >
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={options}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={columns}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.gridContent}
      showsVerticalScrollIndicator={false}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={5}
    />
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  gridContent: {
    padding: GRID_PADDING,
    paddingBottom: 100, // Extra padding for bottom
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  optionItem: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
  },
  optionItemLight: {
    backgroundColor: colors.neutral[100],
    borderColor: 'transparent',
  },
  optionItemDark: {
    backgroundColor: darkTheme.surface,
    borderColor: 'transparent',
  },
  optionItemSelectedLight: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  optionItemSelectedDark: {
    backgroundColor: 'rgba(94, 108, 216, 0.15)',
    borderColor: colors.primary[500],
  },
  optionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  optionPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPreviewLight: {
    backgroundColor: colors.neutral[200],
  },
  optionPreviewDark: {
    backgroundColor: darkTheme.surfaceElevated,
  },
  previewText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  previewTextDark: {
    color: darkTheme.textMuted,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkDark: {
    backgroundColor: colors.primary[500],
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  optionLabelLight: {
    color: colors.neutral[600],
  },
  optionLabelDark: {
    color: darkTheme.textSecondary,
  },
  optionLabelSelectedLight: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  optionLabelSelectedDark: {
    color: colors.primary[400],
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default OptionGrid;
