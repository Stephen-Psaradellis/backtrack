/**
 * Avatar Selector Component
 *
 * Simple avatar selection with gender toggle and arrow navigation.
 * Features:
 * - Fast thumbnail preview (<0.5s perceived load time)
 * - CDN thumbnail images for quick browsing
 * - 3D preview loads separately in Avatar3DCreator
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AvatarPreset, AvatarGender } from '../types';
import {
  LOCAL_AVATAR_PRESETS,
  fetchCdnAvatars,
  filterAllAvatarPresets,
  prefetchCdnAvatars,
  getAvatarPreset,
  getAvatarThumbnailUrl,
} from '../../../lib/avatar/defaults';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarSelectorProps {
  /** Currently selected avatar ID */
  selectedAvatarId: string;
  /** Called when an avatar is selected */
  onSelectAvatar: (avatarId: string) => void;
  /** Enable CDN avatar loading */
  enableCdnAvatars?: boolean;
  /** Show thumbnail preview in selector */
  showThumbnail?: boolean;
}

// =============================================================================
// AVATAR THUMBNAIL COMPONENT
// =============================================================================

interface AvatarThumbnailProps {
  preset: AvatarPreset;
  size?: number;
}

/**
 * Fast-loading thumbnail preview for avatar selection.
 * Uses CDN-hosted JPG images that load in <100ms on average.
 */
function AvatarThumbnail({ preset, size = 48 }: AvatarThumbnailProps): React.JSX.Element | null {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get thumbnail URL from preset
  const thumbnailUrl = preset.thumbnailUrl || getAvatarThumbnailUrl(preset.id);

  // Reset state when preset changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [preset.id]);

  // Don't render if no thumbnail URL
  if (!thumbnailUrl) {
    return (
      <View style={[thumbnailStyles.placeholder, { width: size, height: size }]}>
        <MaterialCommunityIcons name="account" size={size * 0.5} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={[thumbnailStyles.container, { width: size, height: size }]}>
      {isLoading && (
        <View style={thumbnailStyles.loadingOverlay}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      )}
      {hasError ? (
        <View style={thumbnailStyles.errorPlaceholder}>
          <MaterialCommunityIcons name="account" size={size * 0.5} color="#9CA3AF" />
        </View>
      ) : (
        <Image
          source={{ uri: thumbnailUrl }}
          style={thumbnailStyles.image}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      )}
    </View>
  );
}

const thumbnailStyles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  placeholder: {
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
});

// =============================================================================
// AVATAR SELECTOR COMPONENT
// =============================================================================

export function AvatarSelector({
  selectedAvatarId,
  onSelectAvatar,
  enableCdnAvatars = true,
}: AvatarSelectorProps): React.JSX.Element {
  // Determine initial gender from selected avatar
  const initialGender = useMemo(() => {
    const preset = getAvatarPreset(selectedAvatarId);
    return preset?.gender || 'M';
  }, [selectedAvatarId]);

  const [gender, setGender] = useState<AvatarGender>(initialGender);
  const [allPresets, setAllPresets] = useState<AvatarPreset[]>(LOCAL_AVATAR_PRESETS);
  const [isCdnLoading, setIsCdnLoading] = useState(false);
  const [cdnLoaded, setCdnLoaded] = useState(false);

  // Load CDN avatars on mount
  useEffect(() => {
    if (!enableCdnAvatars || cdnLoaded) return;

    prefetchCdnAvatars();
    setIsCdnLoading(true);

    fetchCdnAvatars()
      .then((cdnAvatars) => {
        setAllPresets([...LOCAL_AVATAR_PRESETS, ...cdnAvatars]);
        setCdnLoaded(true);
      })
      .catch((error) => {
        console.warn('[AvatarSelector] Failed to load CDN avatars:', error);
      })
      .finally(() => {
        setIsCdnLoading(false);
      });
  }, [enableCdnAvatars, cdnLoaded]);

  // Filter avatars by selected gender
  const filteredPresets = useMemo(() => {
    return filterAllAvatarPresets(allPresets, { gender });
  }, [allPresets, gender]);

  // Find current index in filtered list
  const currentIndex = useMemo(() => {
    const index = filteredPresets.findIndex((p) => p.id === selectedAvatarId);
    return index >= 0 ? index : 0;
  }, [filteredPresets, selectedAvatarId]);

  // Get current avatar preset
  const currentPreset = filteredPresets[currentIndex] || filteredPresets[0];

  // Handle gender change
  const handleGenderChange = useCallback(
    (newGender: AvatarGender) => {
      if (newGender === gender) return;
      setGender(newGender);

      // Select first avatar of new gender
      const genderPresets = filterAllAvatarPresets(allPresets, { gender: newGender });
      if (genderPresets.length > 0) {
        onSelectAvatar(genderPresets[0].id);
      }
    },
    [gender, allPresets, onSelectAvatar]
  );

  // Navigate to previous avatar
  const handlePrevious = useCallback(() => {
    if (filteredPresets.length === 0) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredPresets.length - 1;
    onSelectAvatar(filteredPresets[newIndex].id);
  }, [currentIndex, filteredPresets, onSelectAvatar]);

  // Navigate to next avatar
  const handleNext = useCallback(() => {
    if (filteredPresets.length === 0) return;
    const newIndex = currentIndex < filteredPresets.length - 1 ? currentIndex + 1 : 0;
    onSelectAvatar(filteredPresets[newIndex].id);
  }, [currentIndex, filteredPresets, onSelectAvatar]);

  // Check if navigation is possible
  const canNavigate = filteredPresets.length > 1;

  // Preload adjacent avatar thumbnails for smooth navigation
  const adjacentPresets = useMemo(() => {
    if (filteredPresets.length <= 1) return [];
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredPresets.length - 1;
    const nextIndex = currentIndex < filteredPresets.length - 1 ? currentIndex + 1 : 0;
    return [filteredPresets[prevIndex], filteredPresets[nextIndex]].filter(Boolean);
  }, [filteredPresets, currentIndex]);

  // Prefetch adjacent thumbnails using Image.prefetch
  useEffect(() => {
    adjacentPresets.forEach((preset) => {
      const thumbnailUrl = preset?.thumbnailUrl || getAvatarThumbnailUrl(preset?.id || '');
      if (thumbnailUrl) {
        Image.prefetch(thumbnailUrl).catch(() => {
          // Silently ignore prefetch errors
        });
      }
    });
  }, [adjacentPresets]);

  return (
    <View style={styles.container}>
      {/* Gender Toggle */}
      <View style={styles.genderToggle}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'M' && styles.genderButtonActive]}
          onPress={() => handleGenderChange('M')}
          activeOpacity={0.7}
          accessibilityLabel="Male"
          accessibilityRole="button"
          accessibilityState={{ selected: gender === 'M' }}
        >
          <Text style={[styles.genderButtonText, gender === 'M' && styles.genderButtonTextActive]}>
            Male
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'F' && styles.genderButtonActive]}
          onPress={() => handleGenderChange('F')}
          activeOpacity={0.7}
          accessibilityLabel="Female"
          accessibilityRole="button"
          accessibilityState={{ selected: gender === 'F' }}
        >
          <Text style={[styles.genderButtonText, gender === 'F' && styles.genderButtonTextActive]}>
            Female
          </Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Row */}
      <View style={styles.navigationRow}>
        {/* Left Arrow */}
        <TouchableOpacity
          style={[styles.arrowButton, !canNavigate && styles.arrowButtonDisabled]}
          onPress={handlePrevious}
          disabled={!canNavigate}
          activeOpacity={0.7}
          accessibilityLabel="Previous avatar"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={32}
            color={canNavigate ? '#6366F1' : '#D1D5DB'}
          />
        </TouchableOpacity>

        {/* Avatar Info with Thumbnail */}
        <View style={styles.avatarInfo}>
          {isCdnLoading ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : currentPreset ? (
            <>
              {/* Thumbnail preview for fast visual feedback */}
              <AvatarThumbnail preset={currentPreset} />
              <Text style={styles.avatarName} numberOfLines={1}>
                {currentPreset.name}
              </Text>
              <Text style={styles.avatarPosition}>
                {currentIndex + 1} of {filteredPresets.length}
              </Text>
            </>
          ) : (
            <Text style={styles.noAvatarText}>No avatars available</Text>
          )}
        </View>

        {/* Right Arrow */}
        <TouchableOpacity
          style={[styles.arrowButton, !canNavigate && styles.arrowButtonDisabled]}
          onPress={handleNext}
          disabled={!canNavigate}
          activeOpacity={0.7}
          accessibilityLabel="Next avatar"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={32}
            color={canNavigate ? '#6366F1' : '#D1D5DB'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  // Gender Toggle
  genderToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  genderButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minWidth: 100,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderButtonTextActive: {
    color: '#6366F1',
  },

  // Navigation Row
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  avatarInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  avatarPosition: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  noAvatarText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default AvatarSelector;
