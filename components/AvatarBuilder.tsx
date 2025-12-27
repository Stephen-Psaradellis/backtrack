/**
 * AvatarBuilder Component
 *
 * Interactive avatar customization UI that allows users to build
 * Avataaars-style avatars by selecting options for hair, eyes, skin,
 * clothes, and accessories. Used for creating physical descriptions
 * in posts and user profiles.
 *
 * @example
 * ```tsx
 * import { AvatarBuilder } from 'components/AvatarBuilder'
 * import { DEFAULT_AVATAR_CONFIG } from 'types/avatar'
 *
 * function AvatarScreen() {
 *   const [config, setConfig] = useState(DEFAULT_AVATAR_CONFIG)
 *
 *   return (
 *     <AvatarBuilder
 *       initialConfig={config}
 *       onChange={setConfig}
 *       onSave={(finalConfig) => {
 *         // Save the avatar
 *       }}
 *     />
 *   )
 * }
 * ```
 */

import React, { useState, useCallback, useMemo, memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native'
import { selectionFeedback, lightFeedback, successFeedback } from '../lib/haptics'
import {
  AvatarConfig,
  AvatarAttribute,
  DEFAULT_AVATAR_CONFIG,
  AVATAR_OPTIONS,
  AVATAR_ATTRIBUTE_LABELS,
} from '../types/avatar'
import { XLargeAvatarPreview, SmallAvatarPreview } from './AvatarPreview'
import { Button, OutlineButton } from './Button'
import {
  AVATAR_CATEGORIES,
  AvatarCategory,
  getOptionLabel,
  getColorSwatch,
  isColorAttribute,
} from '../constants/avatarOptions'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the AvatarBuilder component
 */
export interface AvatarBuilderProps {
  /**
   * Initial avatar configuration
   * @default DEFAULT_AVATAR_CONFIG
   */
  initialConfig?: Partial<AvatarConfig>

  /**
   * Callback fired when any attribute changes
   */
  onChange?: (config: AvatarConfig) => void

  /**
   * Callback fired when user saves the avatar
   */
  onSave?: (config: AvatarConfig) => void

  /**
   * Callback fired when user cancels
   */
  onCancel?: () => void

  /**
   * Whether to show the save/cancel buttons
   * @default true
   */
  showActions?: boolean

  /**
   * Custom save button label
   * @default 'Save Avatar'
   */
  saveLabel?: string

  /**
   * Custom cancel button label
   * @default 'Cancel'
   */
  cancelLabel?: string

  /**
   * Whether to show the randomize button
   * @default true
   */
  showRandomize?: boolean

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

/**
 * Props for the category tab component
 */
interface CategoryTabProps {
  category: AvatarCategory
  isActive: boolean
  onPress: () => void
  testID?: string
}

/**
 * Props for the option selector component
 */
interface OptionSelectorProps {
  attribute: AvatarAttribute
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const OPTION_SIZE = 64
const OPTION_MARGIN = 8
const COLOR_SWATCH_SIZE = 48

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Category tab button
 */
const CategoryTab = memo(function CategoryTab({
  category,
  isActive,
  onPress,
  testID,
}: CategoryTabProps) {
  return (
    <TouchableOpacity
      style={[styles.categoryTab, isActive && styles.categoryTabActive]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={category.label}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text
        style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}
        numberOfLines={1}
      >
        {category.label}
      </Text>
    </TouchableOpacity>
  )
})

/**
 * Option item for non-color attributes
 */
const OptionItem = memo(function OptionItem({
  option,
  isSelected,
  label,
  onPress,
  testID,
  previewConfig,
  attribute,
}: {
  option: string
  isSelected: boolean
  label: string
  onPress: () => void
  testID?: string
  previewConfig: AvatarConfig
  attribute: AvatarAttribute
}) {
  // Create a preview config with this option applied
  const itemConfig = useMemo(
    () => ({
      ...previewConfig,
      [attribute]: option,
    }),
    [previewConfig, attribute, option]
  )

  return (
    <TouchableOpacity
      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <View style={styles.optionPreview}>
        <SmallAvatarPreview config={itemConfig} />
      </View>
      <Text
        style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
})

/**
 * Color swatch option for color attributes
 */
const ColorSwatchItem = memo(function ColorSwatchItem({
  option,
  isSelected,
  label,
  onPress,
  testID,
}: {
  option: string
  isSelected: boolean
  label: string
  onPress: () => void
  testID?: string
}) {
  const color = getColorSwatch(option)

  return (
    <TouchableOpacity
      style={[styles.colorSwatchContainer, isSelected && styles.colorSwatchSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
    >
      <View style={[styles.colorSwatch, { backgroundColor: color }]} />
      <Text
        style={[styles.colorSwatchLabel, isSelected && styles.colorSwatchLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
})

/**
 * Option selector for a single attribute
 */
const OptionSelector = memo(function OptionSelector({
  attribute,
  value,
  options,
  onChange,
  previewConfig,
  testID,
}: OptionSelectorProps & { previewConfig: AvatarConfig }) {
  const isColor = isColorAttribute(attribute)
  const attributeLabel = AVATAR_ATTRIBUTE_LABELS[attribute]

  const renderItem = useCallback(
    ({ item: option }: { item: string }) => {
      const isSelected = option === value
      const label = getOptionLabel(attribute, option)

      if (isColor) {
        return (
          <ColorSwatchItem
            option={option}
            isSelected={isSelected}
            label={label}
            onPress={() => onChange(option)}
            testID={`${testID}-option-${option}`}
          />
        )
      }

      return (
        <OptionItem
          option={option}
          isSelected={isSelected}
          label={label}
          onPress={() => onChange(option)}
          testID={`${testID}-option-${option}`}
          previewConfig={previewConfig}
          attribute={attribute}
        />
      )
    },
    [attribute, value, onChange, isColor, testID, previewConfig]
  )

  const keyExtractor = useCallback((item: string) => item, [])

  return (
    <View style={styles.attributeSection} testID={testID}>
      <Text style={styles.attributeLabel}>{attributeLabel}</Text>
      <FlatList
        data={options as unknown as string[]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsList}
        testID={`${testID}-list`}
      />
    </View>
  )
})

// ============================================================================
// DEBUG LOGGING (Phase 1 Investigation - Remove after fixing)
// ============================================================================

const DEBUG_AVATAR_STATE = __DEV__ // Only log in development

function debugLog(context: string, message: string, data?: unknown) {
  if (DEBUG_AVATAR_STATE) {
    console.log(`[AvatarBuilder:${context}]`, message, data ?? '')
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AvatarBuilder - Interactive avatar customization component
 *
 * Features:
 * - Category-based navigation (Skin, Hair, Eyes, Mouth, Facial Hair, Clothes)
 * - Live preview of avatar as options change
 * - Color swatches for color attributes
 * - Mini previews for style options
 * - Randomize functionality
 * - Save/Cancel actions
 */
export function AvatarBuilder({
  initialConfig,
  onChange,
  onSave,
  onCancel,
  showActions = true,
  saveLabel = 'Save Avatar',
  cancelLabel = 'Cancel',
  showRandomize = true,
  testID = 'avatar-builder',
}: AvatarBuilderProps): JSX.Element {
  // Current avatar configuration
  const [config, setConfig] = useState<AvatarConfig>(() => {
    const initial = {
      ...DEFAULT_AVATAR_CONFIG,
      ...initialConfig,
    }
    debugLog('init', 'Initial config created', initial)
    return initial
  })

  // Debug: Log every render with current config
  debugLog('render', 'Component rendering with config', { topType: config.topType, skinColor: config.skinColor })

  // Currently selected category
  const [activeCategory, setActiveCategory] = useState<string>(AVATAR_CATEGORIES[0].id)

  // Get the active category object
  const currentCategory = useMemo(
    () => AVATAR_CATEGORIES.find((c) => c.id === activeCategory) ?? AVATAR_CATEGORIES[0],
    [activeCategory]
  )

  // Generate a stable key for the avatar preview based on config hash
  // This forces React to re-render XLargeAvatarPreview when any config value changes
  const configKey = useMemo(() => {
    return Object.entries(config)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|')
  }, [config])

  // Handle attribute change
  const handleAttributeChange = useCallback(
    (attribute: AvatarAttribute, value: string) => {
      debugLog('handleAttributeChange', `Changing ${attribute}`, { from: config[attribute], to: value })
      // Trigger selection haptic for option selection
      selectionFeedback()
      const newConfig = {
        ...config,
        [attribute]: value,
      }
      debugLog('handleAttributeChange', 'New config created, calling setConfig', { [attribute]: newConfig[attribute] })
      setConfig(newConfig)
      debugLog('handleAttributeChange', 'setConfig called, calling onChange', { hasOnChange: !!onChange })
      onChange?.(newConfig)
    },
    [config, onChange]
  )

  // Handle randomize
  const handleRandomize = useCallback(() => {
    debugLog('handleRandomize', 'Randomize button pressed')
    // Trigger light haptic for randomize button
    lightFeedback()
    const randomConfig: AvatarConfig = {
      topType: getRandomOption(AVATAR_OPTIONS.topType),
      hairColor: getRandomOption(AVATAR_OPTIONS.hairColor),
      accessoriesType: getRandomOption(AVATAR_OPTIONS.accessoriesType),
      facialHairType: getRandomOption(AVATAR_OPTIONS.facialHairType),
      facialHairColor: getRandomOption(AVATAR_OPTIONS.facialHairColor),
      clotheType: getRandomOption(AVATAR_OPTIONS.clotheType),
      clotheColor: getRandomOption(AVATAR_OPTIONS.clotheColor),
      eyeType: getRandomOption(AVATAR_OPTIONS.eyeType),
      eyebrowType: getRandomOption(AVATAR_OPTIONS.eyebrowType),
      mouthType: getRandomOption(AVATAR_OPTIONS.mouthType),
      skinColor: getRandomOption(AVATAR_OPTIONS.skinColor),
    }
    debugLog('handleRandomize', 'Random config created', { topType: randomConfig.topType, skinColor: randomConfig.skinColor })
    setConfig(randomConfig)
    debugLog('handleRandomize', 'setConfig called, calling onChange', { hasOnChange: !!onChange })
    onChange?.(randomConfig)
  }, [onChange])

  // Handle save
  const handleSave = useCallback(() => {
    // Trigger success haptic on avatar save
    successFeedback()
    onSave?.(config)
  }, [config, onSave])

  // Handle reset to default
  const handleReset = useCallback(() => {
    debugLog('handleReset', 'Reset button pressed')
    // Trigger light haptic for reset button
    lightFeedback()
    const defaultConfig = {
      ...DEFAULT_AVATAR_CONFIG,
      ...initialConfig,
    }
    debugLog('handleReset', 'Default config created', { topType: defaultConfig.topType, skinColor: defaultConfig.skinColor })
    setConfig(defaultConfig)
    debugLog('handleReset', 'setConfig called, calling onChange', { hasOnChange: !!onChange })
    onChange?.(defaultConfig)
  }, [initialConfig, onChange])

  // Handle category tab change
  const handleCategoryChange = useCallback((categoryId: string) => {
    // Trigger selection haptic for category tab change
    selectionFeedback()
    setActiveCategory(categoryId)
  }, [])

  return (
    <View style={styles.container} testID={testID}>
      {/* Avatar Preview */}
      <View style={styles.previewContainer}>
        <XLargeAvatarPreview
          key={configKey}
          config={config}
          testID={`${testID}-preview`}
        />

        {/* Quick actions below preview */}
        {showRandomize && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleRandomize}
              activeOpacity={0.7}
              testID={`${testID}-randomize`}
              accessibilityLabel="Randomize avatar"
            >
              <Text style={styles.quickActionIcon}>🎲</Text>
              <Text style={styles.quickActionText}>Randomize</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleReset}
              activeOpacity={0.7}
              testID={`${testID}-reset`}
              accessibilityLabel="Reset avatar"
            >
              <Text style={styles.quickActionIcon}>↩️</Text>
              <Text style={styles.quickActionText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
        testID={`${testID}-categories`}
      >
        {AVATAR_CATEGORIES.map((category) => (
          <CategoryTab
            key={category.id}
            category={category}
            isActive={category.id === activeCategory}
            onPress={() => handleCategoryChange(category.id)}
            testID={`${testID}-category-${category.id}`}
          />
        ))}
      </ScrollView>

      {/* Category Description */}
      <Text style={styles.categoryDescription}>{currentCategory.description}</Text>

      {/* Option Selectors */}
      <ScrollView
        style={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
        testID={`${testID}-options`}
      >
        {currentCategory.attributes.map((attribute) => (
          <OptionSelector
            key={attribute}
            attribute={attribute}
            value={config[attribute]}
            options={AVATAR_OPTIONS[attribute as keyof typeof AVATAR_OPTIONS]}
            onChange={(value) => handleAttributeChange(attribute, value)}
            previewConfig={config}
            testID={`${testID}-${attribute}`}
          />
        ))}
      </ScrollView>

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actionButtons}>
          {onCancel && (
            <OutlineButton
              title={cancelLabel}
              onPress={onCancel}
              style={styles.cancelButton}
              testID={`${testID}-cancel`}
            />
          )}
          {onSave && (
            <Button
              title={saveLabel}
              onPress={handleSave}
              style={styles.saveButton}
              testID={`${testID}-save`}
            />
          )}
        </View>
      )}
    </View>
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a random option from an array
 */
function getRandomOption<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Compact AvatarBuilder without action buttons
 * Good for embedding in other screens
 */
export const CompactAvatarBuilder = memo(function CompactAvatarBuilder(
  props: Omit<AvatarBuilderProps, 'showActions'>
) {
  return (
    <AvatarBuilder
      {...props}
      showActions={false}
      testID={props.testID ?? 'compact-avatar-builder'}
    />
  )
})

/**
 * Modal-ready AvatarBuilder with full actions
 * Good for use in modal screens
 */
export const ModalAvatarBuilder = memo(function ModalAvatarBuilder(
  props: AvatarBuilderProps
) {
  return (
    <AvatarBuilder
      {...props}
      showActions={true}
      showRandomize={true}
      testID={props.testID ?? 'modal-avatar-builder'}
    />
  )
})

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  quickActionIcon: {
    fontSize: 18,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTabsContent: {
    paddingHorizontal: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryLabelActive: {
    color: '#007AFF',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  attributeSection: {
    marginBottom: 24,
  },
  attributeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsList: {
    paddingRight: 16,
  },
  optionItem: {
    marginRight: OPTION_MARGIN,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  optionItemSelected: {
    opacity: 1,
  },
  optionPreview: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    width: OPTION_SIZE,
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  colorSwatchContainer: {
    marginRight: OPTION_MARGIN,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  colorSwatchSelected: {
    opacity: 1,
  },
  colorSwatch: {
    width: COLOR_SWATCH_SIZE,
    height: COLOR_SWATCH_SIZE,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    maxWidth: COLOR_SWATCH_SIZE,
  },
  colorSwatchLabelSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
})