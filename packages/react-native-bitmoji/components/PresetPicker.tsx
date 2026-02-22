/**
 * PresetPicker Component
 *
 * Displays a grid of avatar presets that users can select as starting points.
 * Presets are organized by category (casual, professional, fun, cultural, sporty).
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, darkTheme } from '../constants/theme';
import { Avatar } from '../avatar/Avatar';
import {
  ALL_PRESETS,
  PRESET_CATEGORIES,
  AvatarPreset,
  PresetCategory,
  getPresetsByCategory,
} from '../avatar/presets';
import type { AvatarConfig } from '../avatar/types';

// =============================================================================
// TYPES
// =============================================================================

export interface PresetPickerProps {
  /** Called when a preset is selected */
  onSelect: (config: AvatarConfig) => void;
  /** Whether to show as a modal */
  visible?: boolean;
  /** Called when modal is closed */
  onClose?: () => void;
  /** Whether the picker is inline (not modal) */
  inline?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRESET_SIZE = (SCREEN_WIDTH - 48 - 24) / 3;

// =============================================================================
// CATEGORY TAB
// =============================================================================

interface CategoryTabProps {
  category: { id: PresetCategory; label: string; icon: string };
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
}

function CategoryTab({ category, isActive, onPress, isDark }: CategoryTabProps) {
  return (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        isDark && styles.categoryTabDark,
        isActive && (isDark ? styles.categoryTabActiveDark : styles.categoryTabActiveLight),
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={category.icon as any}
        size={16}
        color={
          isActive
            ? colors.white
            : isDark
            ? darkTheme.textSecondary
            : colors.neutral[600]
        }
      />
      <Text
        style={[
          styles.categoryTabText,
          isDark && styles.categoryTabTextDark,
          isActive && styles.categoryTabTextActive,
        ]}
      >
        {category.label}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// PRESET CARD
// =============================================================================

interface PresetCardProps {
  preset: AvatarPreset;
  onPress: () => void;
  isDark: boolean;
}

function PresetCard({ preset, onPress, isDark }: PresetCardProps) {
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

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.presetCard,
          isDark && styles.presetCardDark,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.presetAvatarContainer}>
          <Avatar config={preset.config} size="lg" />
        </View>
        <Text
          style={[styles.presetName, isDark && styles.presetNameDark]}
          numberOfLines={1}
        >
          {preset.name}
        </Text>
        <Text
          style={[styles.presetDescription, isDark && styles.presetDescriptionDark]}
          numberOfLines={1}
        >
          {preset.description}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PresetPicker({
  onSelect,
  visible = true,
  onClose,
  inline = false,
}: PresetPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeCategory, setActiveCategory] = useState<PresetCategory | 'all'>('all');

  // Filter presets by category
  const filteredPresets = useMemo(() => {
    if (activeCategory === 'all') {
      return ALL_PRESETS;
    }
    return getPresetsByCategory(activeCategory);
  }, [activeCategory]);

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (preset: AvatarPreset) => {
      onSelect(preset.config);
      onClose?.();
    },
    [onSelect, onClose]
  );

  // Content to render
  const content = (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      {!inline && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            Choose a Preset
          </Text>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? darkTheme.textPrimary : colors.neutral[700]}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        <CategoryTab
          category={{ id: 'all' as PresetCategory, label: 'All', icon: 'grid-outline' }}
          isActive={activeCategory === 'all'}
          onPress={() => setActiveCategory('all')}
          isDark={isDark}
        />
        {PRESET_CATEGORIES.map((category) => (
          <CategoryTab
            key={category.id}
            category={category}
            isActive={activeCategory === category.id}
            onPress={() => setActiveCategory(category.id)}
            isDark={isDark}
          />
        ))}
      </ScrollView>

      {/* Presets Grid */}
      <ScrollView
        style={styles.presetsScroll}
        contentContainerStyle={styles.presetsGrid}
        showsVerticalScrollIndicator={false}
      >
        {filteredPresets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onPress={() => handlePresetSelect(preset)}
            isDark={isDark}
          />
        ))}
      </ScrollView>

      {/* Hint */}
      <View style={styles.hint}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={isDark ? darkTheme.textMuted : colors.neutral[400]}
        />
        <Text style={[styles.hintText, isDark && styles.hintTextDark]}>
          Select a preset as a starting point, then customize to your liking
        </Text>
      </View>
    </View>
  );

  // Render as modal or inline
  if (inline) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
          {content}
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  containerDark: {
    backgroundColor: darkTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  headerTitleDark: {
    color: darkTheme.textPrimary,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  tabsScroll: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    gap: 6,
  },
  categoryTabDark: {
    backgroundColor: darkTheme.surface,
  },
  categoryTabActiveLight: {
    backgroundColor: colors.primary[500],
  },
  categoryTabActiveDark: {
    backgroundColor: colors.primary[500],
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  categoryTabTextDark: {
    color: darkTheme.textSecondary,
  },
  categoryTabTextActive: {
    color: colors.white,
  },
  presetsScroll: {
    flex: 1,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  presetCard: {
    width: PRESET_SIZE,
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  presetCardDark: {
    backgroundColor: darkTheme.surface,
    borderColor: darkTheme.glassBorder,
  },
  presetAvatarContainer: {
    width: PRESET_SIZE - 24,
    height: PRESET_SIZE - 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[800],
    textAlign: 'center',
  },
  presetNameDark: {
    color: darkTheme.textPrimary,
  },
  presetDescription: {
    fontSize: 11,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 2,
  },
  presetDescriptionDark: {
    color: darkTheme.textMuted,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  hintText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  hintTextDark: {
    color: darkTheme.textMuted,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '80%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContentDark: {
    backgroundColor: darkTheme.background,
  },
});

export default PresetPicker;
