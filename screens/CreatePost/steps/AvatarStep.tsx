/**
 * AvatarStep Component
 *
 * Step in the CreatePost wizard flow. Allows the user to build an
 * avatar describing the person they saw using the SVG avatar editor.
 *
 * @example
 * ```tsx
 * <AvatarStep
 *   avatar={formData.targetAvatar}
 *   onSave={handleAvatarSave}
 *   onBack={handleBack}
 * />
 * ```
 */

import React, { memo, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import {
  Avatar,
  createStoredAvatar,
  useAvatarEditor,
  EDITOR_CATEGORIES,
  CategoryTabs,
  OptionGrid,
  ColorPicker,
  type StoredAvatar,
  type AvatarConfig,
  type CategoryTab,
} from 'react-native-bitmoji'
import { darkTheme } from '../../../constants/glassStyles'
import { colors } from '../../../constants/theme'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the AvatarStep component
 */
export interface AvatarStepProps {
  /**
   * Current avatar (if already created)
   */
  avatar: StoredAvatar | null

  /**
   * Callback fired when user saves the avatar and wants to proceed
   * @param avatar - The created avatar
   */
  onSave: (avatar: StoredAvatar) => void

  /**
   * Callback when user wants to go back to previous step
   */
  onBack: () => void

  /**
   * Test ID prefix for testing purposes
   * @default 'create-post'
   */
  testID?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AvatarStep - Avatar building step in the CreatePost wizard
 *
 * Embeds the SVG avatar editor to let users describe
 * the person they saw. When the avatar is created, it advances to
 * the next step.
 */
export const AvatarStep = memo(function AvatarStep({
  avatar,
  onSave,
  onBack,
  testID = 'create-post',
}: AvatarStepProps): JSX.Element {
  // Initialize editor with existing config or default
  const editor = useAvatarEditor({
    initialConfig: avatar?.config,
  })

  // Convert categories for tabs
  const categoryTabs: CategoryTab[] = useMemo(
    () =>
      EDITOR_CATEGORIES.map((cat) => ({
        key: cat.key,
        label: cat.label,
        icon: cat.key,
      })),
    []
  )

  // Get current category config
  const currentCategoryConfig = useMemo(
    () => EDITOR_CATEGORIES.find((c) => c.key === editor.activeCategory),
    [editor.activeCategory]
  )

  // Get active subcategory config
  const activeSubcategoryConfig = currentCategoryConfig?.subcategories.find(
    (s) => s.key === editor.activeSubcategory
  )

  /**
   * Handle avatar save
   */
  const handleSave = useCallback(() => {
    const storedAvatar = editor.getStoredAvatar()
    onSave(storedAvatar)
  }, [editor, onSave])

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Describe Who You Saw</Text>

        <TouchableOpacity
          style={[styles.headerButton, styles.saveButton]}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>Done</Text>
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
              const isActive = sub.key === editor.activeSubcategory
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
              )
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
  )
})

// ============================================================================
// STYLES
// ============================================================================

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
})

// ============================================================================
// EXPORTS
// ============================================================================

export default AvatarStep
