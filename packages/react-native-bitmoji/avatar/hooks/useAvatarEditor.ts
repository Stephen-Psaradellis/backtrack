/**
 * useAvatarEditor Hook
 *
 * Central state management for the Avatar Editor UI.
 * Handles avatar configuration, category selection, and undo/redo.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  AvatarConfig,
  StoredAvatar,
  DEFAULT_MALE_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CLOTHING_COLORS,
  EYESHADOW_COLORS,
  EYELINER_COLORS,
  LIPSTICK_COLORS,
  BLUSH_COLORS,
  SHOE_COLORS,
  HairStyle,
  EyeStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  FaceShape,
  FacialHairStyle,
  AccessoryStyle,
  ClothingStyle,
  HairTreatment,
  FreckleStyle,
  WrinkleStyle,
  CheekStyle,
  SkinDetail,
  EyeshadowStyle,
  EyelinerStyle,
  LipstickStyle,
  BlushStyle,
  // Full body types
  BodyType,
  ArmPose,
  LegPose,
  HandGesture,
  BottomStyle,
  ShoeStyle,
  // Facial proportions
  FacialProportions,
  DEFAULT_FACIAL_PROPORTIONS,
  // Age variations
  EyeBagsStyle,
  GrayHairAmount,
  // Eye enhancements
  EyelashStyle,
  // Face tattoos
  FaceTattooStyle,
  TATTOO_COLORS,
  // Background
  BACKGROUND_COLORS,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export type EditorCategory =
  | 'face'
  | 'hair'
  | 'eyes'
  | 'nose'
  | 'mouth'
  | 'makeup'
  | 'accessories'
  | 'body'
  | 'outfit';

export interface CategoryOption {
  id: string;
  label: string;
  preview?: string;
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
  type: 'options' | 'colors' | 'sliders';
  options?: CategoryOption[];
  colors?: ColorOption[];
  configKey: keyof AvatarConfig;
}

export interface AvatarEditorState {
  config: AvatarConfig;
  activeCategory: EditorCategory;
  activeSubcategory: string | null;
  isDirty: boolean;
  history: AvatarConfig[];
  historyIndex: number;
}

export interface AvatarEditorActions {
  setCategory: (category: EditorCategory) => void;
  setSubcategory: (subcategory: string | null) => void;
  updateConfig: (updates: Partial<AvatarConfig>) => void;
  setGender: (gender: 'male' | 'female') => void;
  resetToDefault: () => void;
  randomize: () => void;
  randomizeCategory: (category: EditorCategory) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  getStoredAvatar: () => StoredAvatar;
}

// =============================================================================
// CATEGORY CONFIGURATION
// =============================================================================

const formatOptionLabel = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/^\s+/, '')
    .trim();
};

// Create options from enums
const hairOptions: CategoryOption[] = Object.values(HairStyle).map((style) => ({
  id: style,
  label: formatOptionLabel(style),
}));

const eyeOptions: CategoryOption[] = Object.values(EyeStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const eyebrowOptions: CategoryOption[] = Object.values(EyebrowStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const noseOptions: CategoryOption[] = Object.values(NoseStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const mouthOptions: CategoryOption[] = Object.values(MouthStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const facialHairOptions: CategoryOption[] = Object.values(FacialHairStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const accessoriesOptions: CategoryOption[] = Object.values(AccessoryStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const clothingOptions: CategoryOption[] = Object.values(ClothingStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

// New feature options
const faceShapeOptions: CategoryOption[] = Object.values(FaceShape).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const hairTreatmentOptions: CategoryOption[] = Object.values(HairTreatment).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const freckleOptions: CategoryOption[] = Object.values(FreckleStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const wrinkleOptions: CategoryOption[] = Object.values(WrinkleStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const cheekStyleOptions: CategoryOption[] = Object.values(CheekStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const skinDetailOptions: CategoryOption[] = Object.values(SkinDetail).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

// Age variations options
const eyeBagsOptions: CategoryOption[] = Object.values(EyeBagsStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const grayHairAmountOptions: CategoryOption[] = Object.values(GrayHairAmount).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

// Eye enhancement options
const eyelashStyleOptions: CategoryOption[] = Object.values(EyelashStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const eyeshadowStyleOptions: CategoryOption[] = Object.values(EyeshadowStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const eyelinerStyleOptions: CategoryOption[] = Object.values(EyelinerStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const lipstickStyleOptions: CategoryOption[] = Object.values(LipstickStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const blushStyleOptions: CategoryOption[] = Object.values(BlushStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

// Full body options
const bodyTypeOptions: CategoryOption[] = Object.values(BodyType).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const armPoseOptions: CategoryOption[] = Object.values(ArmPose).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const legPoseOptions: CategoryOption[] = Object.values(LegPose).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const handGestureOptions: CategoryOption[] = Object.values(HandGesture).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const bottomStyleOptions: CategoryOption[] = Object.values(BottomStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const shoeStyleOptions: CategoryOption[] = Object.values(ShoeStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const skinToneColors: ColorOption[] = SKIN_TONES.map((tone) => ({
  hex: tone.hex,
  name: tone.name,
}));

const hairColors: ColorOption[] = HAIR_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

const eyeColorOptions: ColorOption[] = EYE_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

const clothingColors: ColorOption[] = CLOTHING_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

// Makeup colors
const eyeshadowColors: ColorOption[] = EYESHADOW_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

const eyelinerColors: ColorOption[] = EYELINER_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

const lipstickColors: ColorOption[] = LIPSTICK_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

const blushColors: ColorOption[] = BLUSH_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

const shoeColors: ColorOption[] = SHOE_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

// Face tattoo options
const faceTattooOptions: CategoryOption[] = Object.values(FaceTattooStyle).map((type) => ({
  id: type,
  label: formatOptionLabel(type),
}));

const tattooColors: ColorOption[] = TATTOO_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
}));

// Background colors
const backgroundColors: ColorOption[] = BACKGROUND_COLORS.map((color) => ({
  hex: color.hex,
  name: color.name,
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
        key: 'faceShape',
        label: 'Face Shape',
        type: 'options',
        options: faceShapeOptions,
        configKey: 'faceShape',
      },
      {
        key: 'facialProportions',
        label: 'Proportions',
        type: 'sliders',
        configKey: 'facialProportions',
      },
      {
        key: 'skinTone',
        label: 'Skin Tone',
        type: 'colors',
        colors: skinToneColors,
        configKey: 'skinTone',
      },
      {
        key: 'freckles',
        label: 'Freckles',
        type: 'options',
        options: freckleOptions,
        configKey: 'freckles',
      },
      {
        key: 'cheekStyle',
        label: 'Cheeks',
        type: 'options',
        options: cheekStyleOptions,
        configKey: 'cheekStyle',
      },
      {
        key: 'wrinkles',
        label: 'Wrinkles',
        type: 'options',
        options: wrinkleOptions,
        configKey: 'wrinkles',
      },
      {
        key: 'eyeBags',
        label: 'Eye Bags',
        type: 'options',
        options: eyeBagsOptions,
        configKey: 'eyeBags',
      },
      {
        key: 'skinDetail',
        label: 'Skin Details',
        type: 'options',
        options: skinDetailOptions,
        configKey: 'skinDetail',
      },
      {
        key: 'facialHair',
        label: 'Facial Hair',
        type: 'options',
        options: facialHairOptions,
        configKey: 'facialHair',
      },
      {
        key: 'faceTattoo',
        label: 'Face Tattoos',
        type: 'options',
        options: faceTattooOptions,
        configKey: 'faceTattoo',
      },
      {
        key: 'faceTattooColor',
        label: 'Tattoo Color',
        type: 'colors',
        colors: tattooColors,
        configKey: 'faceTattooColor',
      },
      {
        key: 'backgroundColor',
        label: 'Background',
        type: 'colors',
        colors: backgroundColors,
        configKey: 'backgroundColor',
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
      {
        key: 'grayHairAmount',
        label: 'Gray Hair',
        type: 'options',
        options: grayHairAmountOptions,
        configKey: 'grayHairAmount',
      },
      {
        key: 'hairTreatment',
        label: 'Treatment',
        type: 'options',
        options: hairTreatmentOptions,
        configKey: 'hairTreatment',
      },
      {
        key: 'hairSecondaryColor',
        label: 'Secondary Color',
        type: 'colors',
        colors: hairColors,
        configKey: 'hairSecondaryColor',
      },
    ],
  },
  {
    key: 'eyes',
    label: 'Eyes',
    icon: 'eyes',
    subcategories: [
      {
        key: 'eyeStyle',
        label: 'Style',
        type: 'options',
        options: eyeOptions,
        configKey: 'eyeStyle',
      },
      {
        key: 'eyeColor',
        label: 'Left Eye',
        type: 'colors',
        colors: eyeColorOptions,
        configKey: 'eyeColor',
      },
      {
        key: 'rightEyeColor',
        label: 'Right Eye',
        type: 'colors',
        colors: eyeColorOptions,
        configKey: 'rightEyeColor',
      },
      {
        key: 'eyelashStyle',
        label: 'Eyelashes',
        type: 'options',
        options: eyelashStyleOptions,
        configKey: 'eyelashStyle',
      },
      {
        key: 'eyebrowStyle',
        label: 'Eyebrows',
        type: 'options',
        options: eyebrowOptions,
        configKey: 'eyebrowStyle',
      },
    ],
  },
  {
    key: 'nose',
    label: 'Nose',
    icon: 'nose',
    subcategories: [
      {
        key: 'noseStyle',
        label: 'Style',
        type: 'options',
        options: noseOptions,
        configKey: 'noseStyle',
      },
    ],
  },
  {
    key: 'mouth',
    label: 'Mouth',
    icon: 'mouth',
    subcategories: [
      {
        key: 'mouthStyle',
        label: 'Style',
        type: 'options',
        options: mouthOptions,
        configKey: 'mouthStyle',
      },
    ],
  },
  {
    key: 'makeup',
    label: 'Makeup',
    icon: 'makeup',
    subcategories: [
      {
        key: 'eyeshadowStyle',
        label: 'Eyeshadow',
        type: 'options',
        options: eyeshadowStyleOptions,
        configKey: 'eyeshadowStyle',
      },
      {
        key: 'eyeshadowColor',
        label: 'Eyeshadow Color',
        type: 'colors',
        colors: eyeshadowColors,
        configKey: 'eyeshadowColor',
      },
      {
        key: 'eyelinerStyle',
        label: 'Eyeliner',
        type: 'options',
        options: eyelinerStyleOptions,
        configKey: 'eyelinerStyle',
      },
      {
        key: 'eyelinerColor',
        label: 'Eyeliner Color',
        type: 'colors',
        colors: eyelinerColors,
        configKey: 'eyelinerColor',
      },
      {
        key: 'lipstickStyle',
        label: 'Lipstick',
        type: 'options',
        options: lipstickStyleOptions,
        configKey: 'lipstickStyle',
      },
      {
        key: 'lipstickColor',
        label: 'Lipstick Color',
        type: 'colors',
        colors: lipstickColors,
        configKey: 'lipstickColor',
      },
      {
        key: 'blushStyle',
        label: 'Blush',
        type: 'options',
        options: blushStyleOptions,
        configKey: 'blushStyle',
      },
      {
        key: 'blushColor',
        label: 'Blush Color',
        type: 'colors',
        colors: blushColors,
        configKey: 'blushColor',
      },
    ],
  },
  {
    key: 'accessories',
    label: 'Accessories',
    icon: 'accessories',
    subcategories: [
      {
        key: 'accessory',
        label: 'Eyewear',
        type: 'options',
        options: accessoriesOptions,
        configKey: 'accessory',
      },
      {
        key: 'clothing',
        label: 'Top',
        type: 'options',
        options: clothingOptions,
        configKey: 'clothing',
      },
      {
        key: 'clothingColor',
        label: 'Top Color',
        type: 'colors',
        colors: clothingColors,
        configKey: 'clothingColor',
      },
    ],
  },
  {
    key: 'body',
    label: 'Body',
    icon: 'body',
    subcategories: [
      {
        key: 'bodyType',
        label: 'Body Type',
        type: 'options',
        options: bodyTypeOptions,
        configKey: 'bodyType',
      },
      {
        key: 'armPose',
        label: 'Arm Pose',
        type: 'options',
        options: armPoseOptions,
        configKey: 'armPose',
      },
      {
        key: 'legPose',
        label: 'Leg Pose',
        type: 'options',
        options: legPoseOptions,
        configKey: 'legPose',
      },
      {
        key: 'leftHandGesture',
        label: 'Left Hand',
        type: 'options',
        options: handGestureOptions,
        configKey: 'leftHandGesture',
      },
      {
        key: 'rightHandGesture',
        label: 'Right Hand',
        type: 'options',
        options: handGestureOptions,
        configKey: 'rightHandGesture',
      },
    ],
  },
  {
    key: 'outfit',
    label: 'Outfit',
    icon: 'outfit',
    subcategories: [
      {
        key: 'bottomStyle',
        label: 'Bottoms',
        type: 'options',
        options: bottomStyleOptions,
        configKey: 'bottomStyle',
      },
      {
        key: 'bottomColor',
        label: 'Bottoms Color',
        type: 'colors',
        colors: clothingColors,
        configKey: 'bottomColor',
      },
      {
        key: 'shoeStyle',
        label: 'Shoes',
        type: 'options',
        options: shoeStyleOptions,
        configKey: 'shoeStyle',
      },
      {
        key: 'shoeColor',
        label: 'Shoe Color',
        type: 'colors',
        colors: shoeColors,
        configKey: 'shoeColor',
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

const createRandomConfig = (): AvatarConfig => {
  const gender: 'male' | 'female' = Math.random() > 0.5 ? 'male' : 'female';
  const eyeColor = getRandomColor(eyeColorOptions);
  return {
    gender,
    skinTone: getRandomColor(skinToneColors),
    faceShape: getRandomItem(Object.values(FaceShape)),
    hairStyle: getRandomItem(Object.values(HairStyle)),
    hairColor: getRandomColor(hairColors),
    eyeStyle: getRandomItem(Object.values(EyeStyle)),
    eyeColor,
    // Heterochromia: 20% chance of different eye colors
    rightEyeColor: Math.random() > 0.8 ? getRandomColor(eyeColorOptions) : undefined,
    eyelashStyle: getRandomItem(Object.values(EyelashStyle)),
    eyebrowStyle: getRandomItem(Object.values(EyebrowStyle)),
    noseStyle: getRandomItem(Object.values(NoseStyle)),
    mouthStyle: getRandomItem(Object.values(MouthStyle)),
    facialHair: gender === 'male' ? getRandomItem(Object.values(FacialHairStyle)) : FacialHairStyle.NONE,
    accessory: getRandomItem(Object.values(AccessoryStyle)),
    clothing: getRandomItem(Object.values(ClothingStyle)),
    clothingColor: getRandomColor(clothingColors),
    // Full body properties
    bodyType: getRandomItem(Object.values(BodyType)),
    armPose: getRandomItem(Object.values(ArmPose)),
    legPose: getRandomItem(Object.values(LegPose)),
    leftHandGesture: getRandomItem(Object.values(HandGesture)),
    rightHandGesture: getRandomItem(Object.values(HandGesture)),
    bottomStyle: getRandomItem(Object.values(BottomStyle)),
    bottomColor: getRandomColor(clothingColors),
    shoeStyle: getRandomItem(Object.values(ShoeStyle)),
    shoeColor: getRandomColor(shoeColors),
  };
};

const createStoredAvatar = (config: AvatarConfig): StoredAvatar => {
  const now = Date.now();
  return {
    id: `avatar_${now}_${Math.random().toString(36).substr(2, 9)}`,
    config,
    createdAt: now,
    updatedAt: now,
  };
};

// =============================================================================
// HOOK
// =============================================================================

export interface UseAvatarEditorOptions {
  initialConfig?: AvatarConfig;
  maxHistoryLength?: number;
}

export function useAvatarEditor(
  options: UseAvatarEditorOptions = {}
): AvatarEditorState & AvatarEditorActions {
  const { initialConfig = DEFAULT_MALE_CONFIG, maxHistoryLength = 50 } = options;

  // State
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [activeCategory, setActiveCategory] = useState<EditorCategory>('face');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>('skinTone');
  const [history, setHistory] = useState<AvatarConfig[]>([initialConfig]);
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
    (updates: Partial<AvatarConfig>) => {
      setConfig((prev) => {
        const newConfig = { ...prev, ...updates };

        setHistory((prevHistory) => {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push(newConfig);
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
      const defaultConfig = gender === 'male' ? DEFAULT_MALE_CONFIG : DEFAULT_FEMALE_CONFIG;
      const newConfig = {
        ...defaultConfig,
        skinTone: config.skinTone,
      };
      updateConfig(newConfig);
    },
    [config.skinTone, updateConfig]
  );

  const resetToDefault = useCallback(() => {
    updateConfig(DEFAULT_MALE_CONFIG);
  }, [updateConfig]);

  const randomize = useCallback(() => {
    const randomConfig = createRandomConfig();
    updateConfig(randomConfig);
  }, [updateConfig]);

  const randomizeCategory = useCallback((category: EditorCategory) => {
    const updates: Partial<AvatarConfig> = {};

    switch (category) {
      case 'face':
        updates.faceShape = getRandomItem(Object.values(FaceShape));
        updates.skinTone = getRandomColor(skinToneColors);
        updates.freckles = getRandomItem(Object.values(FreckleStyle));
        updates.cheekStyle = getRandomItem(Object.values(CheekStyle));
        updates.wrinkles = getRandomItem(Object.values(WrinkleStyle));
        updates.skinDetail = getRandomItem(Object.values(SkinDetail));
        updates.facialHair = config.gender === 'male' ? getRandomItem(Object.values(FacialHairStyle)) : FacialHairStyle.NONE;
        break;
      case 'hair':
        updates.hairStyle = getRandomItem(Object.values(HairStyle));
        updates.hairColor = getRandomColor(hairColors);
        updates.hairTreatment = getRandomItem(Object.values(HairTreatment));
        updates.hairSecondaryColor = getRandomColor(hairColors);
        break;
      case 'eyes':
        updates.eyeStyle = getRandomItem(Object.values(EyeStyle));
        updates.eyeColor = getRandomColor(eyeColorOptions);
        // Heterochromia: 20% chance of different eye colors
        updates.rightEyeColor = Math.random() > 0.8 ? getRandomColor(eyeColorOptions) : undefined;
        updates.eyelashStyle = getRandomItem(Object.values(EyelashStyle));
        updates.eyebrowStyle = getRandomItem(Object.values(EyebrowStyle));
        break;
      case 'nose':
        updates.noseStyle = getRandomItem(Object.values(NoseStyle));
        break;
      case 'mouth':
        updates.mouthStyle = getRandomItem(Object.values(MouthStyle));
        break;
      case 'makeup':
        updates.eyeshadowStyle = getRandomItem(Object.values(EyeshadowStyle));
        updates.eyeshadowColor = getRandomColor(eyeshadowColors);
        updates.eyelinerStyle = getRandomItem(Object.values(EyelinerStyle));
        updates.eyelinerColor = getRandomColor(eyelinerColors);
        updates.lipstickStyle = getRandomItem(Object.values(LipstickStyle));
        updates.lipstickColor = getRandomColor(lipstickColors);
        updates.blushStyle = getRandomItem(Object.values(BlushStyle));
        updates.blushColor = getRandomColor(blushColors);
        break;
      case 'accessories':
        updates.accessory = getRandomItem(Object.values(AccessoryStyle));
        updates.clothing = getRandomItem(Object.values(ClothingStyle));
        updates.clothingColor = getRandomColor(clothingColors);
        break;
      case 'body':
        updates.bodyType = getRandomItem(Object.values(BodyType));
        updates.armPose = getRandomItem(Object.values(ArmPose));
        updates.legPose = getRandomItem(Object.values(LegPose));
        updates.leftHandGesture = getRandomItem(Object.values(HandGesture));
        updates.rightHandGesture = getRandomItem(Object.values(HandGesture));
        break;
      case 'outfit':
        updates.bottomStyle = getRandomItem(Object.values(BottomStyle));
        updates.bottomColor = getRandomColor(clothingColors);
        updates.shoeStyle = getRandomItem(Object.values(ShoeStyle));
        updates.shoeColor = getRandomColor(shoeColors);
        break;
    }

    updateConfig(updates);
  }, [config.gender, updateConfig]);

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

  const getStoredAvatar = useCallback((): StoredAvatar => {
    return createStoredAvatar(config);
  }, [config]);

  return {
    config,
    activeCategory,
    activeSubcategory,
    isDirty,
    history,
    historyIndex,
    setCategory,
    setSubcategory,
    updateConfig,
    setGender,
    resetToDefault,
    randomize,
    randomizeCategory,
    undo,
    redo,
    canUndo,
    canRedo,
    getStoredAvatar,
  };
}

export default useAvatarEditor;
