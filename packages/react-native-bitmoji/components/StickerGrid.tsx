/**
 * StickerGrid - Grid display of stickers with lazy rendering
 *
 * Displays stickers in a responsive grid format with support for:
 * - Lazy loading and virtualization for performance
 * - Selection callbacks
 * - Long-press for favorites
 * - Empty state handling
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Text,
} from 'react-native';
import { AvatarConfig } from '../avatar/types';
import { Sticker } from '../avatar/stickers/types';
import { StickerRenderer } from '../avatar/stickers';

// ============================================================================
// TYPES
// ============================================================================

interface StickerGridProps {
  /** Array of stickers to display */
  stickers: Sticker[];
  /** Avatar config to use for rendering stickers */
  avatarConfig: AvatarConfig;
  /** Callback when a sticker is selected */
  onSelect?: (sticker: Sticker) => void;
  /** Callback when a sticker is long-pressed (for favorites) */
  onLongPress?: (sticker: Sticker) => void;
  /** Number of columns in the grid */
  columns?: number;
  /** Size of each sticker cell */
  itemSize?: number;
  /** Selected sticker ID (for highlighting) */
  selectedId?: string;
  /** Set of favorite sticker IDs */
  favorites?: Set<string>;
  /** Show loading indicator */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Header component */
  ListHeaderComponent?: React.ComponentType<unknown> | React.ReactElement | null;
  /** Test ID prefix */
  testID?: string;
}

interface StickerItemProps {
  sticker: Sticker;
  avatarConfig: AvatarConfig;
  size: number;
  isSelected: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

// ============================================================================
// STICKER ITEM COMPONENT
// ============================================================================

const StickerItem = React.memo(function StickerItem({
  sticker,
  avatarConfig,
  size,
  isSelected,
  isFavorite,
  onPress,
  onLongPress,
}: StickerItemProps) {
  return (
    <Pressable
      style={[
        styles.stickerItem,
        { width: size, height: size },
        isSelected && styles.selectedItem,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
    >
      <StickerRenderer
        sticker={sticker}
        avatarConfig={avatarConfig}
        customSize={size - 16} // Account for padding
      />
      {isFavorite && (
        <View style={styles.favoriteIndicator}>
          <Text style={styles.favoriteIcon}>*</Text>
        </View>
      )}
    </Pressable>
  );
});

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StickerGrid({
  stickers,
  avatarConfig,
  onSelect,
  onLongPress,
  columns = 3,
  itemSize: propItemSize,
  selectedId,
  favorites = new Set(),
  isLoading = false,
  emptyMessage = 'No stickers found',
  ListHeaderComponent,
  testID,
}: StickerGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate item size based on columns if not provided
  const itemSize = propItemSize || Math.floor((screenWidth - 32) / columns);

  // Handle sticker selection
  const handleSelect = useCallback(
    (sticker: Sticker) => {
      onSelect?.(sticker);
    },
    [onSelect]
  );

  // Handle long press (for favorites)
  const handleLongPress = useCallback(
    (sticker: Sticker) => {
      onLongPress?.(sticker);
    },
    [onLongPress]
  );

  // Render each sticker item
  const renderItem = useCallback(
    ({ item }: { item: Sticker }) => (
      <StickerItem
        sticker={item}
        avatarConfig={avatarConfig}
        size={itemSize}
        isSelected={item.id === selectedId}
        isFavorite={favorites.has(item.id)}
        onPress={() => handleSelect(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [avatarConfig, itemSize, selectedId, favorites, handleSelect, handleLongPress]
  );

  // Extract key for each item
  const keyExtractor = useCallback((item: Sticker) => item.id, []);

  // Calculate item layout for performance
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: itemSize,
      offset: itemSize * Math.floor(index / columns),
      index,
    }),
    [itemSize, columns]
  );

  // Memoize empty component
  const ListEmptyComponent = useMemo(
    () => (!isLoading ? <EmptyState message={emptyMessage} /> : null),
    [isLoading, emptyMessage]
  );

  return (
    <FlatList
      data={stickers}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={columns}
      contentContainerStyle={styles.gridContainer}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      getItemLayout={getItemLayout}
      windowSize={5}
      maxToRenderPerBatch={12}
      initialNumToRender={12}
      removeClippedSubviews={true}
      testID={testID}
    />
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  gridContainer: {
    padding: 8,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'flex-start',
  },
  stickerItem: {
    padding: 8,
    borderRadius: 12,
    margin: 4,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9e9e9e',
    textAlign: 'center',
  },
});

export default StickerGrid;
