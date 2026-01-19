/**
 * useAvatarEditor Hook
 *
 * Central state management for the Avatar Editor UI.
 * Handles avatar configuration, category selection, and undo/redo.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Avatar2DConfig,
  StoredAvatar2D,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  SKIN_TONE_PRESETS,
  HAIR_COLOR_PRESETS,
  CLOTHING_COLOR_PRESETS,
  HAIR_STYLES,
  EYE_TYPES,
  EYEBROW_TYPES,
  MOUTH_TYPES,
  FACIAL_HAIR_TYPES,
  ACCESSORIES_TYPES,
  CLOTHING_TYPES,
} from '@/components/avatar2d/types';
import { createStoredAvatar } from '@/lib/avatar2d/storage';

// =============================================================================
// TYPES
// =============================================================================

export type EditorCategory =
  | 'face'
  | 'hair'
  | 'eyes'
  | 'nose'
  | 'mouth'
  | 'accessories';

export interface CategoryOption {
  id: string;
  label: string;
  preview?: string; // Optional preview icon
}

export interface ColorOption {
  hex: string;
  name: string;
}

export interface CategoryConfig {
  key: EditorCategory;
  label: string;
  icon: string;
  subcategories: SubcategoryConfig[];
}

export interface SubcategoryConfig {
  key: string;
  label: string;
  type: 'options' | 'colors';
  options?: CategoryOption[];
  colors?: ColorOption[];
  configKey: keyof Avatar2DConfig;
}

export interface AvatarEditorState {
  config: Avatar2DConfig;
  activeCategory: EditorCategory;
  activeSubcategory: string | null;
  isDirty: boolean;
  history: Avatar2DConfig[];
  historyIndex: number;
}

export interface AvatarEditorActions {
  setCategory: (category: EditorCategory) => void;
  setSubcategory: (subcategory: string | null) => void;
  updateConfig: (updates: Partial<Avatar2DConfig>) => void;
  setGender: (gender: 'male' | 'female') => void;
  resetToDefault: () => void;
  randomize: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  getStoredAvatar: () => StoredAvatar2D;
}

// =============================================================================
// CATEGORY CONFIGURATION
// =============================================================================

const formatOptionLabel = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/^\s+/, '')
    .replace('Short Hair', 'Short')
    .replace('Long Hair', 'Long')
    .replace('Shirt', '')
    .trim();
};

const hairOptions: CategoryOption[] = HAIR_STYLES.map((style) => ({
  id: style,
  label: formatOptionLabel(style),
}));

const eyeOptions: CategoryOption[] = EYE_TYPES.map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const eyebrowOptions: CategoryOption[] = EYEBROW_TYPES.map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const mouthOptions: CategoryOption[] = MOUTH_TYPES.map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const facialHairOptions: CategoryOption[] = FACIAL_HAIR_TYPES.map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const accessoriesOptions: CategoryOption[] = ACCESSORIES_TYPES.map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const clothingOptions: CategoryOption[] = CLOTHING_TYPES.map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const skinToneColors: ColorOption[] = SKIN_TONE_PRESETS.map((preset) => ({
  hex: preset.hex,
  name: preset.name,
}));

const hairColors: ColorOption[] = HAIR_COLOR_PRESETS.map((preset) => ({
  hex: preset.hex,
  name: preset.name,
}));

const clothingColors: ColorOption[] = CLOTHING_COLOR_PRESETS.map((preset) => ({
  hex: preset.hex,
  name: preset.name,
}));

export const EDITOR_CATEGORIES: CategoryConfig[] = [
  {
    key: 'face',
    label: 'Face',
    icon: 'face',
    subcategories: [
      {
        key: 'gender',
        label: 'Gender',
        type: 'options',
        options: [
          { id: 'male', label: 'Male' },
          { id: 'female', label: 'Female' },
        ],
        configKey: 'gender',
      },
      {
        key: 'skinTone',
        label: 'Skin Tone',
        type: 'colors',
        colors: skinToneColors,
        configKey: 'skinTone',
      },
      {
        key: 'facialHair',
        label: 'Facial Hair',
        type: 'options',
        options: facialHairOptions,
        configKey: 'facialHair',
      },
    ],
  },
  {
    key: 'hair',
    label: 'Hair',
    icon: 'hair',
    subcategories: [
      {
        key: 'hairStyle',
        label: 'Style',
        type: 'options',
        options: hairOptions,
        configKey: 'hairStyle',
      },
      {
        key: 'hairColor',
        label: 'Color',
        type: 'colors',
        colors: hairColors,
        configKey: 'hairColor',
      },
    ],
  },
  {
    key: 'eyes',
    label: 'Eyes',
    icon: 'eyes',
    subcategories: [
      {
        key: 'eyeType',
        label: 'Style',
        type: 'options',
        options: eyeOptions,
        configKey: 'eyeType',
      },
      {
        key: 'eyebrowType',
        label: 'Eyebrows',
        type: 'options',
        options: eyebrowOptions,
        configKey: 'eyebrowType',
      },
    ],
  },
  {
    key: 'nose',
    label: 'Nose',
    icon: 'nose',
    subcategories: [], // Avataaars doesn't have nose options
  },
  {
    key: 'mouth',
    label: 'Mouth',
    icon: 'mouth',
    subcategories: [
      {
        key: 'mouthType',
        label: 'Style',
        type: 'options',
        options: mouthOptions,
        configKey: 'mouthType',
      },
    ],
  },
  {
    key: 'accessories',
    label: 'Accessories',
    icon: 'accessories',
    subcategories: [
      {
        key: 'accessories',
        label: 'Eyewear',
        type: 'options',
        options: accessoriesOptions,
        configKey: 'accessories',
      },
      {
        key: 'clothing',
        label: 'Clothing',
        type: 'options',
        options: clothingOptions,
        configKey: 'clothing',
      },
      {
        key: 'clothingColor',
        label: 'Clothing Color',
        type: 'colors',
        colors: clothingColors,
        configKey: 'clothingColor',
      },
    ],
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getRandomItem = <T>(array: readonly T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const getRandomColor = (colors: ColorOption[]): string => {
  return colors[Math.floor(Math.random() * colors.length)].hex;
};

const createRandomConfig = (): Avatar2DConfig => {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  return {
    gender,
    skinTone: getRandomColor(skinToneColors),
    hairStyle: getRandomItem(HAIR_STYLES),
    hairColor: getRandomColor(hairColors),
    eyeType: getRandomItem(EYE_TYPES),
    eyebrowType: getRandomItem(EYEBROW_TYPES),
    mouthType: getRandomItem(MOUTH_TYPES),
    facialHair: gender === 'male' ? getRandomItem(FACIAL_HAIR_TYPES) : 'none',
    accessories: getRandomItem(ACCESSORIES_TYPES),
    clothing: getRandomItem(CLOTHING_TYPES),
    clothingColor: getRandomColor(clothingColors),
  };
};

// =============================================================================
// HOOK
// =============================================================================

export interface UseAvatarEditorOptions {
  initialConfig?: Avatar2DConfig;
  maxHistoryLength?: number;
}

export function useAvatarEditor(
  options: UseAvatarEditorOptions = {}
): AvatarEditorState & AvatarEditorActions {
  const { initialConfig = DEFAULT_AVATAR_CONFIG, maxHistoryLength = 50 } =
    options;

  // State
  const [config, setConfig] = useState<Avatar2DConfig>(initialConfig);
  const [activeCategory, setActiveCategory] = useState<EditorCategory>('face');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(
    'skinTone'
  );
  const [history, setHistory] = useState<Avatar2DConfig[]>([initialConfig]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Derived state
  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(initialConfig),
    [config, initialConfig]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Actions
  const setCategory = useCallback((category: EditorCategory) => {
    setActiveCategory(category);
    // Set default subcategory when changing categories
    const categoryConfig = EDITOR_CATEGORIES.find((c) => c.key === category);
    if (categoryConfig && categoryConfig.subcategories.length > 0) {
      setActiveSubcategory(categoryConfig.subcategories[0].key);
    } else {
      setActiveSubcategory(null);
    }
  }, []);

  const setSubcategory = useCallback((subcategory: string | null) => {
    setActiveSubcategory(subcategory);
  }, []);

  const updateConfig = useCallback(
    (updates: Partial<Avatar2DConfig>) => {
      setConfig((prev) => {
        const newConfig = { ...prev, ...updates };

        // Add to history
        setHistory((prevHistory) => {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push(newConfig);
          // Limit history length
          if (newHistory.length > maxHistoryLength) {
            newHistory.shift();
          }
          return newHistory;
        });
        setHistoryIndex((prev) => Math.min(prev + 1, maxHistoryLength - 1));

        return newConfig;
      });
    },
    [historyIndex, maxHistoryLength]
  );

  const setGender = useCallback(
    (gender: 'male' | 'female') => {
      const defaultConfig =
        gender === 'male' ? DEFAULT_AVATAR_CONFIG : DEFAULT_FEMALE_CONFIG;
      const newConfig = {
        ...defaultConfig,
        skinTone: config.skinTone, // Preserve skin tone
      };
      updateConfig(newConfig);
    },
    [config.skinTone, updateConfig]
  );

  const resetToDefault = useCallback(() => {
    updateConfig(DEFAULT_AVATAR_CONFIG);
  }, [updateConfig]);

  const randomize = useCallback(() => {
    const randomConfig = createRandomConfig();
    updateConfig(randomConfig);
  }, [updateConfig]);

  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex((prev) => prev - 1);
      setConfig(history[historyIndex - 1]);
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex((prev) => prev + 1);
      setConfig(history[historyIndex + 1]);
    }
  }, [canRedo, history, historyIndex]);

  const getStoredAvatar = useCallback((): StoredAvatar2D => {
    return createStoredAvatar(config);
  }, [config]);

  return {
    // State
    config,
    activeCategory,
    activeSubcategory,
    isDirty,
    history,
    historyIndex,

    // Actions
    setCategory,
    setSubcategory,
    updateConfig,
    setGender,
    resetToDefault,
    randomize,
    undo,
    redo,
    canUndo,
    canRedo,
    getStoredAvatar,
  };
}

export default useAvatarEditor;
