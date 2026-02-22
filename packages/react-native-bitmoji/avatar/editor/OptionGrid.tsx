/**
 * OptionGrid Component
 *
 * Grid of selectable options for avatar customization.
 * Used for selecting hair styles, eye types, mouth types, etc.
 * Supports both light and dark mode.
 * Now with mini-avatar previews for visual selection!
 * Phase 2: Added favorites support with heart toggle buttons.
 */

import React, { useRef, useCallback, memo, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, darkTheme } from '../../constants/theme';
import type { CategoryOption } from '../hooks/useAvatarEditor';
import type { AvatarConfig } from '../types';
import { PreviewThumbnail, PreviewType } from '../../components/PreviewThumbnail';

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
  /** The type of preview to show (hairStyle, eyeStyle, etc.) */
  previewType?: PreviewType;
  /** The current avatar config for generating previews */
  avatarConfig?: AvatarConfig;
  /** Category key for favorites functionality */
  categoryKey?: string;
  /** Check if an item is favorited */
  isFavorited?: (category: string, optionId: string) => boolean;
  /** Toggle favorite status */
  onToggleFavorite?: (category: string, optionId: string) => void;
  /** Whether to show only favorites */
  showOnlyFavorites?: boolean;
  /** Enable search bar when options > threshold */
  enableSearch?: boolean;
  /** Threshold for showing search (default 20) */
  searchThreshold?: number;
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
  previewType?: PreviewType;
  avatarConfig?: AvatarConfig;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

function OptionItem({
  item,
  isSelected,
  onPress,
  width,
  showLabel,
  isDark,
  previewType,
  avatarConfig,
  isFavorited,
  onToggleFavorite,
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

  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation();
    onToggleFavorite?.();
  }, [onToggleFavorite]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.optionItem,
          { width, height: showLabel ? width + 24 : width },
          isDark ? styles.optionItemDark : styles.optionItemLight,
          isSelected && (isDark ? styles.optionItemSelectedDark : styles.optionItemSelectedLight),
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.optionContent, { width: width - 16, height: width - 16 }]}>
          <View
            style={[
              styles.optionPreview,
              isDark ? styles.optionPreviewDark : styles.optionPreviewLight,
            ]}
          >
            {previewType && avatarConfig ? (
              <PreviewThumbnail
                type={previewType}
                value={item.id}
                baseConfig={avatarConfig}
                size={width - 20}
              />
            ) : (
              <Text style={[styles.previewText, isDark && styles.previewTextDark]}>
                {item.label.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          {isSelected && (
            <View style={[styles.checkmark, isDark && styles.checkmarkDark]}>
              <Ionicons name="checkmark" size={14} color={colors.white} />
            </View>
          )}
          {/* Favorite heart button */}
          {onToggleFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={16}
                color={isFavorited ? colors.red[500] : (isDark ? darkTheme.textMuted : colors.neutral[400])}
              />
            </TouchableOpacity>
          )}
        </View>
        {showLabel && (
          <Text
            style={[
              styles.optionLabel,
              isDark ? styles.optionLabelDark : styles.optionLabelLight,
              isSelected && (isDark ? styles.optionLabelSelectedDark : styles.optionLabelSelectedLight),
            ]}
            numberOfLines={1}
          >
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
  previewType,
  avatarConfig,
  categoryKey,
  isFavorited,
  onToggleFavorite,
  showOnlyFavorites = false,
  enableSearch = true,
  searchThreshold = 20,
}: OptionGridProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const itemWidth = getItemWidth(columns);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Show search bar if enabled and options exceed threshold
  const showSearchBar = enableSearch && options.length > searchThreshold;

  // Filter options based on search and favorites
  const filteredOptions = useMemo(() => {
    let result = options;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(option =>
        option.label.toLowerCase().includes(query) ||
        option.id.toLowerCase().includes(query)
      );
    }

    // Apply favorites filter
    if (showOnlyFavorites && categoryKey && isFavorited) {
      result = result.filter(option => isFavorited(categoryKey, option.id));
    }

    return result;
  }, [options, searchQuery, showOnlyFavorites, categoryKey, isFavorited]);

  const renderItem = useCallback(
    ({ item }: { item: CategoryOption }) => (
      <OptionItem
        item={item}
        isSelected={item.id === selectedId}
        onPress={() => onSelect(item.id)}
        width={itemWidth}
        showLabel={showLabels}
        isDark={isDark}
        previewType={previewType}
        avatarConfig={avatarConfig}
        isFavorited={categoryKey && isFavorited ? isFavorited(categoryKey, item.id) : undefined}
        onToggleFavorite={
          categoryKey && onToggleFavorite
            ? () => onToggleFavorite(categoryKey, item.id)
            : undefined
        }
      />
    ),
    [selectedId, onSelect, itemWidth, showLabels, isDark, previewType, avatarConfig, categoryKey, isFavorited, onToggleFavorite]
  );

  const keyExtractor = useCallback((item: CategoryOption) => item.id, []);

  // Render search bar component
  const renderSearchBar = () => {
    if (!showSearchBar) return null;
    return (
      <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
        <Ionicons
          name="search-outline"
          size={18}
          color={isDark ? darkTheme.textMuted : colors.neutral[400]}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, isDark && styles.searchInputDark]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={`Search ${options.length} options...`}
          placeholderTextColor={isDark ? darkTheme.textMuted : colors.neutral[400]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons
              name="close-circle"
              size={18}
              color={isDark ? darkTheme.textMuted : colors.neutral[400]}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (filteredOptions.length === 0) {
    return (
      <View style={styles.container}>
        {renderSearchBar()}
        <View style={styles.emptyContainer}>
          <Ionicons
            name={searchQuery ? 'search-outline' : showOnlyFavorites ? 'heart-outline' : 'alert-circle-outline'}
            size={48}
            color={isDark ? darkTheme.textMuted : colors.neutral[400]}
          />
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? darkTheme.textMuted : colors.neutral[500] },
            ]}
          >
            {searchQuery
              ? `No results for "${searchQuery}"`
              : showOnlyFavorites
              ? 'No favorites yet. Tap the heart icon to add favorites!'
              : emptyMessage}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      <FlatList
        data={filteredOptions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={columns}
        columnWrapperStyle={filteredOptions.length > 1 ? styles.row : undefined}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={5}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: GRID_PADDING,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchContainerDark: {
    backgroundColor: darkTheme.surface,
    borderColor: darkTheme.glassBorder,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[900],
    paddingVertical: 0,
  },
  searchInputDark: {
    color: darkTheme.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  gridContent: {
    padding: GRID_PADDING,
    paddingBottom: 100,
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
  favoriteButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
