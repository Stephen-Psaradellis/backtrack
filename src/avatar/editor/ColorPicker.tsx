/**
 * ColorPicker Component
 *
 * Color selector for avatar customization (skin tone, hair color, clothing color).
 * Displays color swatches in a grid with selection indicator.
 * Supports both light and dark mode.
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { darkTheme } from '@/constants/glassStyles';
import { colors } from '@/constants/theme';
import type { ColorOption } from '../hooks/useAvatarEditor';

// =============================================================================
// TYPES
// =============================================================================

export interface ColorPickerProps {
  colors: ColorOption[];
  selectedColor: string | undefined;
  onSelect: (color: string) => void;
  columns?: number;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;

const SWATCH_SIZES = {
  small: 40,
  medium: 48,
  large: 56,
};

const getSwatchSize = (columns: number, size: 'small' | 'medium' | 'large'): number => {
  const fixedSize = SWATCH_SIZES[size];
  const totalGap = GRID_GAP * (columns - 1);
  const availableWidth = SCREEN_WIDTH - GRID_PADDING * 2 - totalGap;
  const calculatedSize = Math.floor(availableWidth / columns);
  return Math.min(fixedSize, calculatedSize);
};

// =============================================================================
// COLOR SWATCH COMPONENT
// =============================================================================

interface ColorSwatchProps {
  color: ColorOption;
  isSelected: boolean;
  onPress: () => void;
  size: number;
  showLabel: boolean;
  isDark: boolean;
}

function ColorSwatch({
  color,
  isSelected,
  onPress,
  size,
  showLabel,
  isDark,
}: ColorSwatchProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
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

  // Determine if the color is light (for contrast)
  const isLightColor = isColorLight(color.hex);
  const checkmarkColor = isLightColor ? colors.neutral[800] : colors.white;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      style={styles.swatchContainer}
    >
      <Animated.View
        style={[
          styles.swatchWrapper,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Selection ring */}
        {isSelected && (
          <View
            style={[
              styles.selectionRing,
              {
                width: size + 8,
                height: size + 8,
                borderRadius: (size + 8) / 2,
                borderColor: isDark ? colors.white : colors.primary[500],
              },
            ]}
          />
        )}

        {/* Color swatch */}
        <View
          style={[
            styles.swatch,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color.hex,
            },
            // Add subtle border for very light colors
            isLightColor && styles.swatchLightBorder,
          ]}
        >
          {/* Checkmark for selected */}
          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <Ionicons
                name="checkmark"
                size={size * 0.4}
                color={checkmarkColor}
              />
            </View>
          )}
        </View>

        {/* Label */}
        {showLabel && (
          <Text
            style={[
              styles.swatchLabel,
              { color: isDark ? darkTheme.textSecondary : colors.neutral[600] },
            ]}
            numberOfLines={1}
          >
            {color.name}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isColorLight(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ColorPicker({
  colors: colorOptions,
  selectedColor,
  onSelect,
  columns = 5,
  showLabels = false,
  size = 'medium',
}: ColorPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark' || true; // Default to dark for this app

  const swatchSize = getSwatchSize(columns, size);

  const renderItem = useCallback(
    ({ item }: { item: ColorOption }) => (
      <ColorSwatch
        color={item}
        isSelected={item.hex === selectedColor}
        onPress={() => onSelect(item.hex)}
        size={swatchSize}
        showLabel={showLabels}
        isDark={isDark}
      />
    ),
    [selectedColor, onSelect, swatchSize, showLabels, isDark]
  );

  const keyExtractor = useCallback((item: ColorOption) => item.hex, []);

  return (
    <View style={styles.container}>
      {/* Current color preview */}
      {selectedColor && (
        <View style={[styles.previewContainer, isDark && styles.previewContainerDark]}>
          <View
            style={[
              styles.previewSwatch,
              { backgroundColor: selectedColor },
              isColorLight(selectedColor) && styles.swatchLightBorder,
            ]}
          />
          <View style={styles.previewInfo}>
            <Text style={[styles.previewLabel, isDark && styles.previewLabelDark]}>
              Selected Color
            </Text>
            <Text style={[styles.previewValue, isDark && styles.previewValueDark]}>
              {colorOptions.find((c) => c.hex === selectedColor)?.name || selectedColor}
            </Text>
          </View>
        </View>
      )}

      {/* Color grid */}
      <FlatList
        data={colorOptions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={columns}
        columnWrapperStyle={[styles.row, { gap: GRID_GAP }]}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: GRID_PADDING,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
  },
  previewContainerDark: {
    backgroundColor: darkTheme.surface,
  },
  previewSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[500],
    marginBottom: 2,
  },
  previewLabelDark: {
    color: darkTheme.textMuted,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  previewValueDark: {
    color: darkTheme.textPrimary,
  },
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 24,
  },
  row: {
    marginBottom: GRID_GAP,
    justifyContent: 'flex-start',
  },
  swatchContainer: {
    alignItems: 'center',
  },
  swatchWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectionRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  swatchLightBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 60,
  },
});

export default ColorPicker;
