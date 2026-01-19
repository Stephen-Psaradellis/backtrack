/**
 * AvatarEditorScreen
 *
 * Full-screen avatar editor with:
 * - Real-time avatar preview at top
 * - Category tabs (Face, Hair, Eyes, Nose, Mouth, Accessories)
 * - Selection grid for each category
 * - Color picker for applicable options
 *
 * Supports both light and dark mode.
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { darkTheme } from '@/constants/glassStyles';
import { colors } from '@/constants/theme';
import { saveCurrentUserAvatar } from '@/lib/avatar2d/storage';
import type { MainStackParamList } from '@/navigation/types';
import type { StoredAvatar2D, Avatar2DConfig } from '@/components/avatar2d/types';

// Import editor components
import { CategoryTabs, type CategoryTab } from '../avatar/editor/CategoryTabs';
import { OptionGrid } from '../avatar/editor/OptionGrid';
import { ColorPicker } from '../avatar/editor/ColorPicker';
import { PreviewPanel } from '../avatar/editor/PreviewPanel';
import {
  useAvatarEditor,
  EDITOR_CATEGORIES,
  type EditorCategory,
  type SubcategoryConfig,
} from '../avatar/hooks/useAvatarEditor';

// =============================================================================
// TYPES
// =============================================================================

type Props = NativeStackScreenProps<MainStackParamList, 'AvatarCreator'>;

// =============================================================================
// SUBCATEGORY TABS COMPONENT
// =============================================================================

interface SubcategoryTabsProps {
  subcategories: SubcategoryConfig[];
  activeSubcategory: string | null;
  onSelect: (key: string) => void;
  isDark: boolean;
}

function SubcategoryTabs({
  subcategories,
  activeSubcategory,
  onSelect,
  isDark,
}: SubcategoryTabsProps) {
  if (subcategories.length === 0) {
    return null;
  }

  return (
    <View style={[styles.subcategoryContainer, isDark && styles.subcategoryContainerDark]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subcategoryContent}
      >
        {subcategories.map((sub) => {
          const isActive = sub.key === activeSubcategory;
          return (
            <TouchableOpacity
              key={sub.key}
              style={[
                styles.subcategoryTab,
                isDark && styles.subcategoryTabDark,
                isActive && (isDark ? styles.subcategoryTabActiveDark : styles.subcategoryTabActiveLight),
              ]}
              onPress={() => onSelect(sub.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.subcategoryLabel,
                  isDark && styles.subcategoryLabelDark,
                  isActive && (isDark ? styles.subcategoryLabelActiveDark : styles.subcategoryLabelActiveLight),
                ]}
              >
                {sub.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// EDITOR CONTENT COMPONENT
// =============================================================================

interface EditorContentProps {
  config: Avatar2DConfig;
  activeCategory: EditorCategory;
  activeSubcategory: string | null;
  onUpdateConfig: (updates: Partial<Avatar2DConfig>) => void;
  isDark: boolean;
}

function EditorContent({
  config,
  activeCategory,
  activeSubcategory,
  onUpdateConfig,
  isDark,
}: EditorContentProps) {
  const categoryConfig = EDITOR_CATEGORIES.find((c) => c.key === activeCategory);

  if (!categoryConfig) {
    return (
      <View style={styles.emptyContent}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={isDark ? darkTheme.textMuted : colors.neutral[400]}
        />
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? darkTheme.textMuted : colors.neutral[500] },
          ]}
        >
          Category not found
        </Text>
      </View>
    );
  }

  // Handle nose category (no options in Avataaars)
  if (activeCategory === 'nose') {
    return (
      <View style={styles.emptyContent}>
        <Ionicons
          name="information-circle-outline"
          size={48}
          color={isDark ? darkTheme.textMuted : colors.neutral[400]}
        />
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? darkTheme.textMuted : colors.neutral[500] },
          ]}
        >
          Nose style is fixed in this avatar system
        </Text>
      </View>
    );
  }

  const subcategory = categoryConfig.subcategories.find(
    (s) => s.key === activeSubcategory
  );

  if (!subcategory) {
    return (
      <View style={styles.emptyContent}>
        <Text
          style={[
            styles.emptyText,
            { color: isDark ? darkTheme.textMuted : colors.neutral[500] },
          ]}
        >
          Select an option above
        </Text>
      </View>
    );
  }

  const handleSelect = (value: string) => {
    onUpdateConfig({ [subcategory.configKey]: value });
  };

  // Render color picker
  if (subcategory.type === 'colors' && subcategory.colors) {
    return (
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ColorPicker
          colors={subcategory.colors}
          selectedColor={config[subcategory.configKey] as string | undefined}
          onSelect={handleSelect}
          columns={5}
          size="medium"
        />
      </ScrollView>
    );
  }

  // Render option grid
  if (subcategory.type === 'options' && subcategory.options) {
    return (
      <OptionGrid
        options={subcategory.options}
        selectedId={config[subcategory.configKey] as string | undefined}
        onSelect={handleSelect}
        columns={4}
        showLabels
      />
    );
  }

  return null;
}

// =============================================================================
// MAIN SCREEN COMPONENT
// =============================================================================

export default function AvatarEditorScreen({ navigation, route }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark' || true; // Default to dark

  const [isSaving, setIsSaving] = useState(false);

  // Initialize editor state
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

  // Handle save
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const avatar = editor.getStoredAvatar();
      await saveCurrentUserAvatar(avatar);
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to save avatar: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [editor, navigation, isSaving]);

  // Handle cancel
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
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, isDark && styles.cancelTextDark]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
          Edit Avatar
        </Text>

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
      <PreviewPanel
        config={editor.config}
        onRandomize={editor.randomize}
        onUndo={editor.undo}
        onRedo={editor.redo}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        isDirty={editor.isDirty}
      />

      {/* Category Tabs */}
      <CategoryTabs
        categories={categoryTabs}
        activeCategory={editor.activeCategory}
        onSelectCategory={editor.setCategory}
      />

      {/* Subcategory Tabs */}
      {currentCategoryConfig && (
        <SubcategoryTabs
          subcategories={currentCategoryConfig.subcategories}
          activeSubcategory={editor.activeSubcategory}
          onSelect={editor.setSubcategory}
          isDark={isDark}
        />
      )}

      {/* Editor Content */}
      <View style={[styles.editorContent, isDark && styles.editorContentDark]}>
        <EditorContent
          config={editor.config}
          activeCategory={editor.activeCategory}
          activeSubcategory={editor.activeSubcategory}
          onUpdateConfig={editor.updateConfig}
          isDark={isDark}
        />
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
    backgroundColor: colors.neutral[50],
  },
  containerDark: {
    backgroundColor: darkTheme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  headerDark: {
    backgroundColor: darkTheme.surface,
    borderBottomColor: darkTheme.glassBorder,
  },
  headerButton: {
    minWidth: 60,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  headerTitleDark: {
    color: darkTheme.textPrimary,
  },
  cancelText: {
    fontSize: 16,
    color: colors.neutral[600],
  },
  cancelTextDark: {
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
  subcategoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  subcategoryContainerDark: {
    backgroundColor: darkTheme.surface,
    borderBottomColor: darkTheme.glassBorder,
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
    backgroundColor: colors.neutral[100],
    marginRight: 8,
  },
  subcategoryTabDark: {
    backgroundColor: darkTheme.surfaceElevated,
  },
  subcategoryTabActiveLight: {
    backgroundColor: colors.primary[500],
  },
  subcategoryTabActiveDark: {
    backgroundColor: colors.primary[500],
  },
  subcategoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[600],
  },
  subcategoryLabelDark: {
    color: darkTheme.textSecondary,
  },
  subcategoryLabelActiveLight: {
    color: colors.white,
    fontWeight: '600',
  },
  subcategoryLabelActiveDark: {
    color: colors.white,
    fontWeight: '600',
  },
  editorContent: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  editorContentDark: {
    backgroundColor: darkTheme.background,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingVertical: 16,
  },
  emptyContent: {
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
