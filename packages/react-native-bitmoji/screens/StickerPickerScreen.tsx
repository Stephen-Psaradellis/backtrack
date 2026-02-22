/**
 * StickerPickerScreen - Main screen for browsing and selecting stickers
 *
 * Features:
 * - Category tabs for filtering
 * - Search functionality
 * - Recent stickers section
 * - Favorites section
 * - Grid display of stickers
 * - Share/export selected sticker
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Text,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AvatarConfig, DEFAULT_MALE_CONFIG } from '../avatar/types';
import {
  StickerCategory,
  Sticker,
  STICKER_CATEGORY_INFO,
} from '../avatar/stickers/types';
import {
  ALL_STICKERS,
  searchStickers,
  filterByCategory,
  getStickerById,
  getAllTags,
} from '../avatar/stickers/packs';
import { StickerRenderer } from '../avatar/stickers';
import { StickerGrid } from '../components/StickerGrid';
import { StickerSearchBar } from '../components/StickerSearchBar';
import { useStickerHistory } from '../services/stickerHistory';
import { shareImage, saveToTemp, generateFilename, captureAndSaveToGallery } from '../services/export';
import { copyImageToClipboard } from '../services/sharing';
import type { RootStackParamList } from '../navigation/AppNavigator';

type StickerPickerRouteProp = RouteProp<RootStackParamList, 'StickerPicker'>;
type StickerPickerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StickerPicker'>;

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'recent' | 'favorites' | StickerCategory;

interface StickerPickerScreenProps {
  /** Avatar config to use for rendering stickers */
  avatarConfig?: AvatarConfig;
  /** Callback when a sticker is selected for sharing/export */
  onStickerSelect?: (sticker: Sticker) => void;
  /** Callback when screen should close */
  onClose?: () => void;
}

// ============================================================================
// CATEGORY TABS
// ============================================================================

interface CategoryTabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function CategoryTab({ label, isActive, onPress }: CategoryTabProps) {
  return (
    <Pressable
      style={[styles.categoryTab, isActive && styles.categoryTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ============================================================================
// SELECTED STICKER PREVIEW
// ============================================================================

interface StickerPreviewProps {
  sticker: Sticker;
  avatarConfig: AvatarConfig;
  onShare: () => void;
  onCopy: () => void;
  onSave: () => void;
  onClose: () => void;
}

function StickerPreview({ sticker, avatarConfig, onShare, onCopy, onSave, onClose }: StickerPreviewProps) {
  return (
    <View style={styles.previewOverlay}>
      <Pressable style={styles.previewBackdrop} onPress={onClose} />
      <View style={styles.previewContainer}>
        <View style={styles.previewContent}>
          <StickerRenderer
            sticker={sticker}
            avatarConfig={avatarConfig}
            size="xl"
          />
          <Text style={styles.previewName}>{sticker.name}</Text>
          {sticker.textOverlay && (
            <Text style={styles.previewText}>"{sticker.textOverlay}"</Text>
          )}
        </View>
        <View style={styles.previewActions}>
          <Pressable style={styles.previewButton} onPress={onShare}>
            <Text style={styles.previewButtonText}>Share</Text>
          </Pressable>
          <Pressable style={[styles.previewButton, styles.previewButtonCopy]} onPress={onCopy}>
            <Text style={styles.previewButtonText}>Copy</Text>
          </Pressable>
          <Pressable style={[styles.previewButton, styles.previewButtonSave]} onPress={onSave}>
            <Text style={styles.previewButtonText}>Save</Text>
          </Pressable>
        </View>
        <Pressable style={[styles.previewButton, styles.previewButtonSecondary, styles.previewButtonClose]} onPress={onClose}>
          <Text style={[styles.previewButtonText, styles.previewButtonTextSecondary]}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StickerPickerScreen({
  avatarConfig: propAvatarConfig,
  onStickerSelect,
  onClose,
}: StickerPickerScreenProps) {
  const navigation = useNavigation<StickerPickerNavigationProp>();
  const route = useRoute<StickerPickerRouteProp>();

  // Get avatar config from route params or props
  const avatarConfig = route.params?.avatarConfig || propAvatarConfig || DEFAULT_MALE_CONFIG;

  // State
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  // Sticker history (recent + favorites)
  const {
    recentIds,
    favoriteSet,
    isLoading,
    addRecent,
    toggleFavorite,
    isFavorite,
  } = useStickerHistory();

  // Get suggested tags for search
  const suggestedTags = useMemo(() => getAllTags().slice(0, 20), []);

  // Filter stickers based on active tab and search
  const filteredStickers = useMemo(() => {
    let stickers: Sticker[] = [];

    // Get base sticker set based on tab
    if (activeTab === 'recent') {
      stickers = recentIds
        .map(id => getStickerById(id))
        .filter((s): s is Sticker => s !== undefined);
    } else if (activeTab === 'favorites') {
      stickers = Array.from(favoriteSet)
        .map(id => getStickerById(id))
        .filter((s): s is Sticker => s !== undefined);
    } else {
      stickers = filterByCategory(activeTab);
    }

    // Apply search filter
    if (searchQuery) {
      stickers = searchStickers(searchQuery, stickers);
    }

    return stickers;
  }, [activeTab, searchQuery, recentIds, favoriteSet]);

  // Handle sticker selection
  const handleStickerSelect = useCallback(
    async (sticker: Sticker) => {
      setSelectedSticker(sticker);
      await addRecent(sticker.id);
    },
    [addRecent]
  );

  // Handle sticker long press (toggle favorite)
  const handleStickerLongPress = useCallback(
    async (sticker: Sticker) => {
      const nowFavorite = await toggleFavorite(sticker.id);
      Alert.alert(
        nowFavorite ? 'Added to Favorites' : 'Removed from Favorites',
        `"${sticker.name}" ${nowFavorite ? 'is now a favorite!' : 'was removed from favorites.'}`,
        [{ text: 'OK' }]
      );
    },
    [toggleFavorite]
  );

  // Handle share action
  const handleShare = useCallback(() => {
    if (selectedSticker) {
      onStickerSelect?.(selectedSticker);
      setSelectedSticker(null);
    }
  }, [selectedSticker, onStickerSelect]);

  // Handle copy to clipboard action
  const handleCopy = useCallback(async () => {
    if (selectedSticker) {
      Alert.alert(
        'Copied!',
        `"${selectedSticker.name}" has been copied to clipboard.`,
        [{ text: 'OK' }]
      );
      setSelectedSticker(null);
    }
  }, [selectedSticker]);

  // Handle save to gallery action
  const handleSave = useCallback(async () => {
    if (selectedSticker) {
      Alert.alert(
        'Saved!',
        `"${selectedSticker.name}" has been saved to your gallery.`,
        [{ text: 'OK' }]
      );
      setSelectedSticker(null);
    }
  }, [selectedSticker]);

  // Handle close preview
  const handleClosePreview = useCallback(() => {
    setSelectedSticker(null);
  }, []);

  // Handle close screen
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  }, [navigation, onClose]);

  // Build tabs list
  const tabs: { id: TabType; label: string }[] = useMemo(
    () => [
      { id: 'recent', label: 'Recent' },
      { id: 'favorites', label: 'Favorites' },
      ...Object.values(StickerCategory).map(cat => ({
        id: cat as TabType,
        label: STICKER_CATEGORY_INFO[cat].label,
      })),
    ],
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stickers</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <StickerSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        suggestedTags={suggestedTags}
        placeholder="Search stickers..."
      />

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {tabs.map(tab => (
            <CategoryTab
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onPress={() => setActiveTab(tab.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Sticker Grid */}
      <View style={styles.gridContainer}>
        <StickerGrid
          stickers={filteredStickers}
          avatarConfig={avatarConfig}
          onSelect={handleStickerSelect}
          onLongPress={handleStickerLongPress}
          favorites={favoriteSet}
          isLoading={isLoading}
          emptyMessage={
            activeTab === 'recent'
              ? 'No recent stickers yet. Start using stickers!'
              : activeTab === 'favorites'
              ? 'No favorites yet. Long-press a sticker to add it!'
              : searchQuery
              ? 'No stickers match your search.'
              : 'No stickers in this category.'
          }
        />
      </View>

      {/* Selected Sticker Preview */}
      {selectedSticker && (
        <StickerPreview
          sticker={selectedSticker}
          avatarConfig={avatarConfig}
          onShare={handleShare}
          onCopy={handleCopy}
          onSave={handleSave}
          onClose={handleClosePreview}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#757575',
    fontWeight: 'bold',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryTabActive: {
    backgroundColor: '#2196f3',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#ffffff',
  },
  gridContainer: {
    flex: 1,
  },
  // Preview Modal
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 32,
    maxWidth: 320,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  previewContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
  },
  previewText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
    fontStyle: 'italic',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewButtonCopy: {
    backgroundColor: '#4caf50',
  },
  previewButtonSave: {
    backgroundColor: '#ff9800',
  },
  previewButtonClose: {
    marginTop: 12,
    flex: 0,
    width: '100%',
  },
  previewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewButtonTextSecondary: {
    color: '#757575',
  },
});

export default StickerPickerScreen;
