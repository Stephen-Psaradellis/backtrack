/**
 * ExpressionPicker Component
 *
 * UI for selecting pre-defined expression presets.
 * Shows expressions grouped by emotion category.
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, darkTheme } from '../../constants/theme';
import { AvatarConfig } from '../types';
import { Avatar } from '../Avatar';
import {
  ExpressionPreset,
  Emotion,
  EMOTION_INFO,
} from '../stickers/types';
import {
  EXPRESSION_PRESETS,
  getPresetsForEmotion,
  getAvailableEmotions,
  applyExpressionPreset,
} from './presets';

// =============================================================================
// TYPES
// =============================================================================

interface ExpressionPickerProps {
  /** Current avatar config to preview expressions on */
  avatarConfig: AvatarConfig;
  /** Called when an expression is selected */
  onSelect: (preset: ExpressionPreset) => void;
  /** Currently selected expression ID */
  selectedId?: string;
  /** Filter to show only specific emotions */
  emotionFilter?: Emotion[];
}

// =============================================================================
// EXPRESSION PREVIEW ITEM
// =============================================================================

interface ExpressionItemProps {
  preset: ExpressionPreset;
  avatarConfig: AvatarConfig;
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
}

const ExpressionItem = memo(function ExpressionItem({
  preset,
  avatarConfig,
  isSelected,
  onPress,
  isDark,
}: ExpressionItemProps) {
  // Apply the preset to create a preview config
  const previewConfig = useMemo(
    () => applyExpressionPreset(avatarConfig, preset),
    [avatarConfig, preset]
  );

  return (
    <TouchableOpacity
      style={[
        styles.expressionItem,
        isDark ? styles.expressionItemDark : styles.expressionItemLight,
        isSelected && (isDark ? styles.expressionItemSelectedDark : styles.expressionItemSelectedLight),
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.previewContainer}>
        <Avatar
          config={previewConfig}
          size="sm"
          customSize={56}
          backgroundColor={isDark ? darkTheme.surface : '#f5f5f5'}
        />
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={12} color={colors.white} />
          </View>
        )}
      </View>
      <Text
        style={[
          styles.expressionName,
          isDark ? styles.expressionNameDark : styles.expressionNameLight,
          isSelected && styles.expressionNameSelected,
        ]}
        numberOfLines={1}
      >
        {preset.name}
      </Text>
    </TouchableOpacity>
  );
});

// =============================================================================
// EMOTION SECTION
// =============================================================================

interface EmotionSectionProps {
  emotion: Emotion;
  presets: ExpressionPreset[];
  avatarConfig: AvatarConfig;
  selectedId?: string;
  onSelect: (preset: ExpressionPreset) => void;
  isDark: boolean;
}

const EmotionSection = memo(function EmotionSection({
  emotion,
  presets,
  avatarConfig,
  selectedId,
  onSelect,
  isDark,
}: EmotionSectionProps) {
  const emotionInfo = EMOTION_INFO[emotion];

  return (
    <View style={styles.emotionSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emotionInfo.emoji}</Text>
        <Text
          style={[
            styles.sectionTitle,
            isDark ? styles.sectionTitleDark : styles.sectionTitleLight,
          ]}
        >
          {emotionInfo.label}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.expressionRow}
      >
        {presets.map((preset) => (
          <ExpressionItem
            key={preset.id}
            preset={preset}
            avatarConfig={avatarConfig}
            isSelected={preset.id === selectedId}
            onPress={() => onSelect(preset)}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </View>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ExpressionPicker({
  avatarConfig,
  onSelect,
  selectedId,
  emotionFilter,
}: ExpressionPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Get emotions to display
  const emotions = useMemo(() => {
    const available = getAvailableEmotions();
    if (emotionFilter && emotionFilter.length > 0) {
      return available.filter((e) => emotionFilter.includes(e));
    }
    return available;
  }, [emotionFilter]);

  // Group presets by emotion
  const presetsByEmotion = useMemo(() => {
    const result: Record<Emotion, ExpressionPreset[]> = {} as Record<Emotion, ExpressionPreset[]>;
    emotions.forEach((emotion) => {
      result[emotion] = getPresetsForEmotion(emotion);
    });
    return result;
  }, [emotions]);

  const handleSelect = useCallback(
    (preset: ExpressionPreset) => {
      onSelect(preset);
    },
    [onSelect]
  );

  return (
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      showsVerticalScrollIndicator={false}
    >
      {emotions.map((emotion) => (
        <EmotionSection
          key={emotion}
          emotion={emotion}
          presets={presetsByEmotion[emotion] || []}
          avatarConfig={avatarConfig}
          selectedId={selectedId}
          onSelect={handleSelect}
          isDark={isDark}
        />
      ))}
    </ScrollView>
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
  emotionSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitleLight: {
    color: colors.neutral[800],
  },
  sectionTitleDark: {
    color: darkTheme.textPrimary,
  },
  expressionRow: {
    paddingHorizontal: 12,
    gap: 12,
  },
  expressionItem: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    width: 80,
  },
  expressionItemLight: {
    backgroundColor: colors.neutral[100],
    borderColor: 'transparent',
  },
  expressionItemDark: {
    backgroundColor: darkTheme.surface,
    borderColor: 'transparent',
  },
  expressionItemSelectedLight: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  expressionItemSelectedDark: {
    backgroundColor: 'rgba(94, 108, 216, 0.15)',
    borderColor: colors.primary[500],
  },
  previewContainer: {
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  expressionName: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  expressionNameLight: {
    color: colors.neutral[600],
  },
  expressionNameDark: {
    color: darkTheme.textSecondary,
  },
  expressionNameSelected: {
    color: colors.primary[600],
    fontWeight: '600',
  },
});

export default ExpressionPicker;
