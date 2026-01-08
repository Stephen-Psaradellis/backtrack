/**
 * Avatar Browser Component
 *
 * Grid view for selecting from 370+ complete avatar presets.
 * Features:
 * - Fast thumbnail loading from CDN (<1.5s)
 * - Neutral style categories (not ethnicity-based)
 * - Gender and outfit filters
 * - Image caching for seamless avatar switching
 */

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AvatarPreset, AvatarStyle, AvatarGender, AvatarOutfit } from '../types';
import {
  LOCAL_AVATAR_PRESETS,
  fetchCdnAvatars,
  filterAllAvatarPresets,
  getStylesFromPresets,
  getOutfitsFromPresets,
  prefetchCdnAvatars,
} from '../../../lib/avatar/defaults';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarBrowserProps {
  /** Currently selected avatar ID */
  selectedAvatarId: string;
  /** Called when an avatar is selected */
  onSelectAvatar: (avatarId: string) => void;
  /** Show loading state */
  isLoading?: boolean;
  /** Enable CDN avatar loading */
  enableCdnAvatars?: boolean;
}

interface FilterState {
  style: AvatarStyle | null;
  gender: AvatarGender | null;
  outfit: AvatarOutfit | null;
}

// =============================================================================
// IMAGE CACHE - for fast preview loading
// =============================================================================

/** Set of preloaded image URLs */
const preloadedImages = new Set<string>();

/**
 * Preload an image into native cache
 */
function preloadImage(url: string): void {
  if (preloadedImages.has(url)) return;
  preloadedImages.add(url);
  // Use Image.prefetch for RN image cache
  Image.prefetch(url).catch(() => {
    // Silently ignore prefetch errors
    preloadedImages.delete(url);
  });
}

/**
 * Preload images for a batch of avatar presets
 */
function preloadAvatarImages(presets: AvatarPreset[], batchSize = 20): void {
  const batch = presets.slice(0, batchSize);
  batch.forEach((preset) => {
    if (preset.thumbnailUrl) {
      preloadImage(preset.thumbnailUrl);
    }
  });
}

// =============================================================================
// FILTER CHIP COMPONENT
// =============================================================================

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const FilterChip = memo(function FilterChip({
  label,
  isActive,
  onPress,
}: FilterChipProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// =============================================================================
// FILTER BAR COMPONENT
// =============================================================================

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableStyles: AvatarStyle[];
  availableOutfits: AvatarOutfit[];
}

function FilterBar({
  filters,
  onFilterChange,
  availableStyles,
  availableOutfits,
}: FilterBarProps): React.JSX.Element {
  const handleStyleToggle = useCallback(
    (style: AvatarStyle) => {
      onFilterChange({
        ...filters,
        style: filters.style === style ? null : style,
      });
    },
    [filters, onFilterChange]
  );

  const handleGenderToggle = useCallback(
    (gender: AvatarGender) => {
      onFilterChange({
        ...filters,
        gender: filters.gender === gender ? null : gender,
      });
    },
    [filters, onFilterChange]
  );

  const handleOutfitToggle = useCallback(
    (outfit: AvatarOutfit) => {
      onFilterChange({
        ...filters,
        outfit: filters.outfit === outfit ? null : outfit,
      });
    },
    [filters, onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    onFilterChange({ style: null, gender: null, outfit: null });
  }, [onFilterChange]);

  const hasFilters = filters.style || filters.gender || filters.outfit;

  return (
    <View style={styles.filterBar}>
      {/* Gender filters */}
      <View style={styles.filterRow}>
        <FilterChip
          label="Male"
          isActive={filters.gender === 'M'}
          onPress={() => handleGenderToggle('M')}
        />
        <FilterChip
          label="Female"
          isActive={filters.gender === 'F'}
          onPress={() => handleGenderToggle('F')}
        />
        {hasFilters && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearFilters}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Style filters - scrollable row (using neutral labels) */}
      {availableStyles.length > 1 && (
        <View style={styles.filterRowScrollable}>
          {availableStyles.map((style) => (
            <FilterChip
              key={style}
              label={style}
              isActive={filters.style === style}
              onPress={() => handleStyleToggle(style)}
            />
          ))}
        </View>
      )}

      {/* Outfit filters */}
      {availableOutfits.length > 1 && (
        <View style={styles.filterRowScrollable}>
          {availableOutfits.map((outfit) => (
            <FilterChip
              key={outfit}
              label={outfit}
              isActive={filters.outfit === outfit}
              onPress={() => handleOutfitToggle(outfit)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// AVATAR CARD COMPONENT
// =============================================================================

interface AvatarCardProps {
  preset: AvatarPreset;
  isSelected: boolean;
  onPress: () => void;
}

const AvatarCard = memo(function AvatarCard({
  preset,
  isSelected,
  onPress,
}: AvatarCardProps): React.JSX.Element {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate a placeholder color based on avatar ID
  const placeholderColor = useMemo(() => {
    const colors = ['#E8EAF6', '#E3F2FD', '#E0F7FA', '#E8F5E9', '#FFF3E0', '#FCE4EC'];
    let hash = 0;
    for (let i = 0; i < preset.id.length; i++) {
      hash = preset.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [preset.id]);

  // Check if we have a thumbnail URL
  const hasThumbnail = !!preset.thumbnailUrl;

  // Handle image load start
  const handleLoadStart = useCallback(() => {
    setIsImageLoading(true);
  }, []);

  // Handle image load complete
  const handleLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  // Handle image error
  const handleError = useCallback(() => {
    setIsImageLoading(false);
    setHasError(true);
  }, []);

  return (
    <TouchableOpacity
      style={[styles.avatarCard, isSelected && styles.avatarCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Select ${preset.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      {/* Avatar preview area */}
      <View style={[styles.avatarPreview, { backgroundColor: placeholderColor }]}>
        {hasThumbnail && !hasError ? (
          <>
            <Image
              source={{ uri: preset.thumbnailUrl }}
              style={styles.avatarImage}
              onLoadStart={handleLoadStart}
              onLoad={handleLoad}
              onError={handleError}
              resizeMode="cover"
              // Enable native image caching
              fadeDuration={150}
            />
            {isImageLoading && (
              <ActivityIndicator
                style={styles.imageLoader}
                size="small"
                color="#6366F1"
              />
            )}
          </>
        ) : (
          <View style={styles.placeholderContent}>
            <MaterialCommunityIcons
              name={preset.gender === 'M' ? 'account' : 'account'}
              size={48}
              color="#9CA3AF"
            />
          </View>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#6366F1" />
          </View>
        )}

        {/* CDN badge for non-local avatars */}
        {!preset.isLocal && (
          <View style={styles.cdnBadge}>
            <MaterialCommunityIcons name="cloud" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Avatar info */}
      <View style={styles.avatarInfo}>
        <Text style={styles.avatarName} numberOfLines={1}>
          {preset.name}
        </Text>
        <View style={styles.avatarTags}>
          <View style={[styles.tag, preset.gender === 'M' ? styles.tagMale : styles.tagFemale]}>
            <Text style={styles.tagText}>{preset.gender === 'M' ? 'M' : 'F'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// =============================================================================
// AVATAR BROWSER COMPONENT
// =============================================================================

export function AvatarBrowser({
  selectedAvatarId,
  onSelectAvatar,
  isLoading: externalLoading = false,
  enableCdnAvatars = true,
}: AvatarBrowserProps): React.JSX.Element {
  const [filters, setFilters] = useState<FilterState>({
    style: null,
    gender: null,
    outfit: null,
  });

  // State for all avatars (local + CDN)
  const [allPresets, setAllPresets] = useState<AvatarPreset[]>(LOCAL_AVATAR_PRESETS);
  const [isCdnLoading, setIsCdnLoading] = useState(false);
  const [cdnLoaded, setCdnLoaded] = useState(false);

  // Prefetch CDN avatars on mount
  useEffect(() => {
    if (!enableCdnAvatars || cdnLoaded) return;

    // Start prefetching immediately for fast load
    prefetchCdnAvatars();

    setIsCdnLoading(true);
    const startTime = performance.now();

    fetchCdnAvatars()
      .then((cdnAvatars) => {
        const loadTime = performance.now() - startTime;
        console.log(`[AvatarBrowser] CDN manifest loaded in ${loadTime.toFixed(0)}ms (${cdnAvatars.length} avatars)`);

        // Combine local and CDN presets
        setAllPresets([...LOCAL_AVATAR_PRESETS, ...cdnAvatars]);
        setCdnLoaded(true);

        // Preload first batch of images for fast preview
        preloadAvatarImages(cdnAvatars, 30);
      })
      .catch((error) => {
        console.warn('[AvatarBrowser] Failed to load CDN avatars:', error);
      })
      .finally(() => {
        setIsCdnLoading(false);
      });
  }, [enableCdnAvatars, cdnLoaded]);

  // Get available filter options from loaded presets
  const availableStyles = useMemo(
    () => getStylesFromPresets(allPresets),
    [allPresets]
  );
  const availableOutfits = useMemo(
    () => getOutfitsFromPresets(allPresets),
    [allPresets]
  );

  // Filter available presets
  const filteredPresets = useMemo(() => {
    return filterAllAvatarPresets(allPresets, {
      style: filters.style ?? undefined,
      gender: filters.gender ?? undefined,
      outfit: filters.outfit ?? undefined,
    });
  }, [allPresets, filters]);

  // Preload images when filter changes
  useEffect(() => {
    preloadAvatarImages(filteredPresets, 20);
  }, [filteredPresets]);

  // Show combined loading state
  const isLoading = externalLoading || isCdnLoading;

  // Render avatar card
  const renderAvatarCard = useCallback(
    ({ item }: { item: AvatarPreset }) => (
      <AvatarCard
        preset={item}
        isSelected={item.id === selectedAvatarId}
        onPress={() => onSelectAvatar(item.id)}
      />
    ),
    [selectedAvatarId, onSelectAvatar]
  );

  // Key extractor
  const keyExtractor = useCallback((item: AvatarPreset) => item.id, []);

  // Header with count
  const totalCount = allPresets.length;
  const filteredCount = filteredPresets.length;

  // Optimized FlatList settings for fast rendering
  const getItemLayout = useCallback(
    (_: ArrayLike<AvatarPreset> | null | undefined, index: number) => ({
      length: 180, // Approximate item height
      offset: 180 * Math.floor(index / 2),
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        availableStyles={availableStyles}
        availableOutfits={availableOutfits}
      />

      {/* Avatar count */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {filteredCount === totalCount
            ? `${totalCount} avatars`
            : `${filteredCount} of ${totalCount} avatars`}
        </Text>
        {isCdnLoading && (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.loadingInlineText}>Loading more...</Text>
          </View>
        )}
      </View>

      {/* Avatar grid */}
      {isLoading && allPresets.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading avatars...</Text>
        </View>
      ) : filteredPresets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-search" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No avatars match your filters</Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => setFilters({ style: null, gender: null, outfit: null })}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPresets}
          renderItem={renderAvatarCard}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
          // Update optimization
          extraData={selectedAvatarId}
        />
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Filter bar
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterRowScrollable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#6366F1',
  },
  clearButton: {
    marginLeft: 'auto',
    padding: 4,
  },

  // Avatar count bar
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  countText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingInlineText: {
    fontSize: 12,
    color: '#6366F1',
  },

  // Avatar grid
  gridContent: {
    padding: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // Avatar card
  avatarCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarCardSelected: {
    borderColor: '#6366F1',
  },
  avatarPreview: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLoader: {
    position: 'absolute',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  cdnBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    borderRadius: 8,
    padding: 4,
  },
  avatarInfo: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  avatarTags: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  tagMale: {
    backgroundColor: '#DBEAFE',
  },
  tagFemale: {
    backgroundColor: '#FCE7F3',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default AvatarBrowser;
