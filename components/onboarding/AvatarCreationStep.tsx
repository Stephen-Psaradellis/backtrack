/**
 * Avatar Creation Step (Onboarding)
 *
 * Avatar creation step for onboarding using the new SVG avatar system.
 * Users can fully customize their avatar appearance.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  createStoredAvatar,
  saveCurrentAvatar,
  useAvatarEditor,
  EDITOR_CATEGORIES,
  CategoryTabs,
  OptionGrid,
  ColorPicker,
  type StoredAvatar,
  type AvatarConfig,
  type EditorCategory,
  type CategoryTab,
} from 'react-native-bitmoji';
import { darkTheme } from '../../constants/glassStyles';
import { colors } from '../../constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarCreationStepProps {
  /** Initial avatar config if editing */
  initialAvatar?: StoredAvatar | null;
  /** Called when avatar is created */
  onComplete: (avatar: StoredAvatar) => void;
  /** Called when user wants to skip */
  onSkip?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AvatarCreationStep({
  initialAvatar,
  onComplete,
  onSkip,
}: AvatarCreationStepProps): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editor with existing config or default
  const editor = useAvatarEditor({
    initialConfig: initialAvatar?.config,
  });

  // Convert categories for tabs
  const categoryTabs: CategoryTab[] = EDITOR_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    icon: cat.key,
  }));

  // Get current category config
  const currentCategoryConfig = EDITOR_CATEGORIES.find(
    (c) => c.key === editor.activeCategory
  );

  /**
   * Handle avatar creation complete
   */
  const handleComplete = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const storedAvatar = editor.getStoredAvatar();
      await saveCurrentAvatar(storedAvatar.config);
      onComplete(storedAvatar);
    } catch (error) {
      console.error('Failed to save avatar:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, onComplete, isSaving]);

  /**
   * Handle cancel/skip
   */
  const handleCancel = useCallback(() => {
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  // Get active subcategory config
  const activeSubcategoryConfig = currentCategoryConfig?.subcategories.find(
    (s) => s.key === editor.activeSubcategory
  );

  return (
    <SafeAreaView style={styles.container} testID="onboarding-avatar-step">
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Create Your Avatar</Text>
        <Text style={styles.subtitle}>
          This is how others will see you
        </Text>
      </View>

      {/* Avatar Preview */}
      <View style={styles.previewContainer}>
        <View style={styles.avatarWrapper}>
          <Avatar config={editor.config} size="xl" />
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={editor.randomize}
            activeOpacity={0.7}
          >
            <Ionicons name="shuffle" size={20} color={colors.primary[500]} />
            <Text style={styles.actionButtonText}>Random</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={editor.undo}
            disabled={!editor.canUndo}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-undo"
              size={20}
              color={editor.canUndo ? colors.primary[500] : darkTheme.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={editor.redo}
            disabled={!editor.canRedo}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-redo"
              size={20}
              color={editor.canRedo ? colors.primary[500] : darkTheme.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <CategoryTabs
        categories={categoryTabs}
        activeCategory={editor.activeCategory}
        onSelectCategory={editor.setCategory}
      />

      {/* Subcategory Tabs */}
      {currentCategoryConfig && currentCategoryConfig.subcategories.length > 0 && (
        <View style={styles.subcategoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoryContent}
          >
            {currentCategoryConfig.subcategories.map((sub) => {
              const isActive = sub.key === editor.activeSubcategory;
              return (
                <TouchableOpacity
                  key={sub.key}
                  style={[
                    styles.subcategoryTab,
                    isActive && styles.subcategoryTabActive,
                  ]}
                  onPress={() => editor.setSubcategory(sub.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.subcategoryLabel,
                      isActive && styles.subcategoryLabelActive,
                    ]}
                  >
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Editor Content */}
      <View style={styles.editorContent}>
        {activeSubcategoryConfig?.type === 'colors' && activeSubcategoryConfig.colors && (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ColorPicker
              colors={activeSubcategoryConfig.colors}
              selectedColor={editor.config[activeSubcategoryConfig.configKey] as string}
              onSelect={(color) =>
                editor.updateConfig({ [activeSubcategoryConfig.configKey]: color })
              }
              columns={5}
              size="medium"
            />
          </ScrollView>
        )}
        {activeSubcategoryConfig?.type === 'options' && activeSubcategoryConfig.options && (
          <OptionGrid
            options={activeSubcategoryConfig.options}
            selectedId={editor.config[activeSubcategoryConfig.configKey] as string}
            onSelect={(value) =>
              editor.updateConfig({ [activeSubcategoryConfig.configKey]: value })
            }
            columns={4}
            showLabels
          />
        )}
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleComplete}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: darkTheme.textSecondary,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: darkTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: darkTheme.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary[500],
  },
  subcategoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
    backgroundColor: darkTheme.surface,
  },
  subcategoryContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  subcategoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: darkTheme.surfaceElevated,
    marginRight: 8,
  },
  subcategoryTabActive: {
    backgroundColor: colors.primary[500],
  },
  subcategoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: darkTheme.textSecondary,
  },
  subcategoryLabelActive: {
    color: colors.white,
    fontWeight: '600',
  },
  editorContent: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingVertical: 16,
  },
  bottomButtons: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: darkTheme.surface,
    borderTopWidth: 1,
    borderTopColor: darkTheme.glassBorder,
  },
  saveButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: darkTheme.textMuted,
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default AvatarCreationStep;
