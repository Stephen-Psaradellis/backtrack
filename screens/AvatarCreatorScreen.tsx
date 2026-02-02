/**
 * AvatarCreatorScreen
 *
 * Full-screen avatar creator for editing the user's own avatar.
 * Uses the new SVG-based avatar system.
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  StatusBar,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Avatar,
  saveCurrentAvatar,
  useAvatarEditor,
  EDITOR_CATEGORIES,
  CategoryTabs,
  OptionGrid,
  ColorPicker,
  type StoredAvatar,
  type EditorCategory,
  type CategoryTab,
} from 'react-native-bitmoji';
import { darkTheme } from '../constants/glassStyles';
import { colors } from '../constants/theme';
import type { MainStackParamList } from '../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

type Props = NativeStackScreenProps<MainStackParamList, 'AvatarCreator'>;

// =============================================================================
// COMPONENT
// =============================================================================

export default function AvatarCreatorScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editor with existing config or default
  const editor = useAvatarEditor({
    initialConfig: route.params?.initialConfig,
  });

  // Convert categories for tabs
  const categoryTabs: CategoryTab[] = useMemo(
    () =>
      EDITOR_CATEGORIES.map((cat) => ({
        key: cat.key,
        label: cat.label,
        icon: cat.key,
      })),
    []
  );

  // Get current category config
  const currentCategoryConfig = useMemo(
    () => EDITOR_CATEGORIES.find((c) => c.key === editor.activeCategory),
    [editor.activeCategory]
  );

  // Get active subcategory config
  const activeSubcategoryConfig = currentCategoryConfig?.subcategories.find(
    (s) => s.key === editor.activeSubcategory
  );

  /**
   * Handle avatar save
   */
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const storedAvatar = editor.getStoredAvatar();
      await saveCurrentAvatar(storedAvatar.config);
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to save avatar: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [editor, navigation, isSaving]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    if (editor.isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [editor.isDirty, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Avatar</Text>

        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.glassBorder,
    backgroundColor: darkTheme.surface,
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.textPrimary,
  },
  cancelText: {
    fontSize: 16,
    color: darkTheme.textSecondary,
  },
  saveButton: {
    alignItems: 'flex-end',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[500],
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
});
