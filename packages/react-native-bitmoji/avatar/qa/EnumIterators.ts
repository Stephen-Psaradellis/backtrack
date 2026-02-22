/**
 * Enum Iterators
 *
 * Utilities for iterating through all avatar style enums systematically.
 * Provides metadata and iteration helpers for the QA test harness.
 */

import {
  // Feature enums
  FaceShape,
  EyeStyle,
  EyelashStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  HairStyle,
  HairTreatment,
  FacialHairStyle,
  // Face detail enums
  FreckleStyle,
  WrinkleStyle,
  CheekStyle,
  SkinDetail,
  EyeBagsStyle,
  FaceTattooStyle,
  // Teeth
  TeethStyle,
  // Makeup enums
  EyeshadowStyle,
  EyelinerStyle,
  LipstickStyle,
  BlushStyle,
  // Accessory & Clothing
  AccessoryStyle,
  ClothingStyle,
  // Full body enums
  BodyType,
  ArmPose,
  LegPose,
  HandGesture,
  BottomStyle,
  ShoeStyle,
  GrayHairAmount,
  // Color palettes
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CLOTHING_COLORS,
  EYESHADOW_COLORS,
  EYELINER_COLORS,
  LIPSTICK_COLORS,
  BLUSH_COLORS,
  DENTAL_COLORS,
  SHOE_COLORS,
  TATTOO_COLORS,
  BACKGROUND_COLORS,
  AvatarConfig,
} from '../types';
import { EnumMetadata, QACategory } from './types';

// ============================================================================
// ENUM METADATA REGISTRY
// ============================================================================

export const ENUM_METADATA: EnumMetadata[] = [
  // Face category
  {
    name: 'FaceShape',
    displayName: 'Face Shape',
    enumObject: FaceShape,
    configKey: 'faceShape',
    category: 'face',
    description: 'Overall face shape and structure',
  },
  {
    name: 'EyeStyle',
    displayName: 'Eye Style',
    enumObject: EyeStyle,
    configKey: 'eyeStyle',
    category: 'eyes',
    description: 'Eye shape and expression',
  },
  {
    name: 'EyelashStyle',
    displayName: 'Eyelash Style',
    enumObject: EyelashStyle,
    configKey: 'eyelashStyle',
    category: 'eyes',
    description: 'Eyelash length and density',
  },
  {
    name: 'EyebrowStyle',
    displayName: 'Eyebrow Style',
    enumObject: EyebrowStyle,
    configKey: 'eyebrowStyle',
    category: 'eyes',
    description: 'Eyebrow shape and expression',
  },
  {
    name: 'NoseStyle',
    displayName: 'Nose Style',
    enumObject: NoseStyle,
    configKey: 'noseStyle',
    category: 'face',
    description: 'Nose shape and size',
  },
  {
    name: 'MouthStyle',
    displayName: 'Mouth Style',
    enumObject: MouthStyle,
    configKey: 'mouthStyle',
    category: 'face',
    description: 'Mouth expression',
  },
  {
    name: 'TeethStyle',
    displayName: 'Teeth Style',
    enumObject: TeethStyle,
    configKey: 'teethStyle',
    category: 'face',
    description: 'Teeth appearance and dental features',
  },
  // Hair category
  {
    name: 'HairStyle',
    displayName: 'Hair Style',
    enumObject: HairStyle,
    configKey: 'hairStyle',
    category: 'hair',
    description: 'Hair cut and style',
  },
  {
    name: 'HairTreatment',
    displayName: 'Hair Treatment',
    enumObject: HairTreatment,
    configKey: 'hairTreatment',
    category: 'hair',
    description: 'Hair coloring effects (ombre, highlights, etc.)',
  },
  {
    name: 'GrayHairAmount',
    displayName: 'Gray Hair Amount',
    enumObject: GrayHairAmount,
    configKey: 'grayHairAmount',
    category: 'hair',
    description: 'Amount of gray/white hair',
  },
  {
    name: 'FacialHairStyle',
    displayName: 'Facial Hair Style',
    enumObject: FacialHairStyle,
    configKey: 'facialHair',
    category: 'hair',
    description: 'Beard and mustache styles',
  },
  // Face details category
  {
    name: 'FreckleStyle',
    displayName: 'Freckle Style',
    enumObject: FreckleStyle,
    configKey: 'freckles',
    category: 'facial_details',
    description: 'Freckle patterns',
  },
  {
    name: 'WrinkleStyle',
    displayName: 'Wrinkle Style',
    enumObject: WrinkleStyle,
    configKey: 'wrinkles',
    category: 'facial_details',
    description: 'Facial wrinkles and age lines',
  },
  {
    name: 'CheekStyle',
    displayName: 'Cheek Style',
    enumObject: CheekStyle,
    configKey: 'cheekStyle',
    category: 'facial_details',
    description: 'Cheek shape and features',
  },
  {
    name: 'SkinDetail',
    displayName: 'Skin Detail',
    enumObject: SkinDetail,
    configKey: 'skinDetail',
    category: 'facial_details',
    description: 'Moles, scars, birthmarks, etc.',
  },
  {
    name: 'EyeBagsStyle',
    displayName: 'Eye Bags Style',
    enumObject: EyeBagsStyle,
    configKey: 'eyeBags',
    category: 'facial_details',
    description: 'Under-eye bags and dark circles',
  },
  {
    name: 'FaceTattooStyle',
    displayName: 'Face Tattoo Style',
    enumObject: FaceTattooStyle,
    configKey: 'faceTattoo',
    category: 'facial_details',
    description: 'Face and neck tattoos',
  },
  // Makeup category
  {
    name: 'EyeshadowStyle',
    displayName: 'Eyeshadow Style',
    enumObject: EyeshadowStyle,
    configKey: 'eyeshadowStyle',
    category: 'makeup',
    description: 'Eyeshadow application style',
  },
  {
    name: 'EyelinerStyle',
    displayName: 'Eyeliner Style',
    enumObject: EyelinerStyle,
    configKey: 'eyelinerStyle',
    category: 'makeup',
    description: 'Eyeliner style',
  },
  {
    name: 'LipstickStyle',
    displayName: 'Lipstick Style',
    enumObject: LipstickStyle,
    configKey: 'lipstickStyle',
    category: 'makeup',
    description: 'Lip makeup style',
  },
  {
    name: 'BlushStyle',
    displayName: 'Blush Style',
    enumObject: BlushStyle,
    configKey: 'blushStyle',
    category: 'makeup',
    description: 'Blush application style',
  },
  // Accessories & Clothing
  {
    name: 'AccessoryStyle',
    displayName: 'Accessory Style',
    enumObject: AccessoryStyle,
    configKey: 'accessory',
    category: 'accessories',
    description: 'Glasses, earrings, headwear, etc.',
  },
  {
    name: 'ClothingStyle',
    displayName: 'Clothing Style',
    enumObject: ClothingStyle,
    configKey: 'clothing',
    category: 'clothing',
    description: 'Shirt, jacket, dress styles',
  },
  // Full body
  {
    name: 'BodyType',
    displayName: 'Body Type',
    enumObject: BodyType,
    configKey: 'bodyType',
    category: 'body',
    description: 'Body shape and build',
  },
  {
    name: 'ArmPose',
    displayName: 'Arm Pose',
    enumObject: ArmPose,
    configKey: 'armPose',
    category: 'full_body',
    description: 'Arm position and gesture',
  },
  {
    name: 'LegPose',
    displayName: 'Leg Pose',
    enumObject: LegPose,
    configKey: 'legPose',
    category: 'full_body',
    description: 'Leg position',
  },
  {
    name: 'HandGesture',
    displayName: 'Hand Gesture',
    enumObject: HandGesture,
    configKey: 'leftHandGesture',
    category: 'full_body',
    description: 'Hand gestures',
  },
  {
    name: 'BottomStyle',
    displayName: 'Bottom Style',
    enumObject: BottomStyle,
    configKey: 'bottomStyle',
    category: 'clothing',
    description: 'Pants, shorts, skirts',
  },
  {
    name: 'ShoeStyle',
    displayName: 'Shoe Style',
    enumObject: ShoeStyle,
    configKey: 'shoeStyle',
    category: 'clothing',
    description: 'Footwear styles',
  },
];

// ============================================================================
// ENUM UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all values from a TypeScript enum
 */
export function getEnumValues<T extends Record<string, string>>(enumObj: T): string[] {
  return Object.values(enumObj);
}

/**
 * Get all keys from a TypeScript enum
 */
export function getEnumKeys<T extends Record<string, string>>(enumObj: T): string[] {
  return Object.keys(enumObj);
}

/**
 * Get enum entries as [key, value] pairs
 */
export function getEnumEntries<T extends Record<string, string>>(
  enumObj: T
): Array<[string, string]> {
  return Object.entries(enumObj);
}

/**
 * Count the number of values in an enum
 */
export function getEnumCount<T extends Record<string, string>>(enumObj: T): number {
  return Object.keys(enumObj).length;
}

// ============================================================================
// METADATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get enum metadata by name
 */
export function getEnumMetadata(enumName: string): EnumMetadata | undefined {
  return ENUM_METADATA.find(meta => meta.name === enumName);
}

/**
 * Get all enums for a specific category
 */
export function getEnumsByCategory(category: QACategory): EnumMetadata[] {
  return ENUM_METADATA.filter(meta => meta.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): QACategory[] {
  return Array.from(new Set(ENUM_METADATA.map(meta => meta.category)));
}

/**
 * Get total variant count across all enums
 */
export function getTotalVariantCount(): number {
  return ENUM_METADATA.reduce((total, meta) => {
    return total + getEnumCount(meta.enumObject);
  }, 0);
}

/**
 * Get variant count for a category
 */
export function getCategoryVariantCount(category: QACategory): number {
  return getEnumsByCategory(category).reduce((total, meta) => {
    return total + getEnumCount(meta.enumObject);
  }, 0);
}

// ============================================================================
// STYLE ITERATION HELPERS
// ============================================================================

export interface StyleVariant {
  enumName: string;
  configKey: keyof AvatarConfig;
  styleKey: string;
  styleValue: string;
  category: QACategory;
}

/**
 * Iterate through all style variants for an enum
 */
export function* iterateEnumStyles(metadata: EnumMetadata): Generator<StyleVariant> {
  for (const [key, value] of getEnumEntries(metadata.enumObject)) {
    yield {
      enumName: metadata.name,
      configKey: metadata.configKey,
      styleKey: key,
      styleValue: value,
      category: metadata.category,
    };
  }
}

/**
 * Iterate through all style variants for a category
 */
export function* iterateCategoryStyles(category: QACategory): Generator<StyleVariant> {
  for (const metadata of getEnumsByCategory(category)) {
    yield* iterateEnumStyles(metadata);
  }
}

/**
 * Iterate through ALL style variants
 */
export function* iterateAllStyles(): Generator<StyleVariant> {
  for (const metadata of ENUM_METADATA) {
    yield* iterateEnumStyles(metadata);
  }
}

/**
 * Get all variants as an array (convenience function)
 */
export function getAllStyleVariants(): StyleVariant[] {
  return Array.from(iterateAllStyles());
}

// ============================================================================
// CONFIG GENERATORS
// ============================================================================

import { DEFAULT_MALE_CONFIG } from '../types';

/**
 * Generate a test config with a specific style applied
 */
export function generateTestConfig(
  variant: StyleVariant,
  baseConfig: Partial<AvatarConfig> = DEFAULT_MALE_CONFIG
): AvatarConfig {
  return {
    ...DEFAULT_MALE_CONFIG,
    ...baseConfig,
    [variant.configKey]: variant.styleValue,
  } as AvatarConfig;
}

/**
 * Generate all test configs for an enum
 */
export function* generateEnumTestConfigs(
  metadata: EnumMetadata,
  baseConfig: Partial<AvatarConfig> = DEFAULT_MALE_CONFIG
): Generator<{ variant: StyleVariant; config: AvatarConfig }> {
  for (const variant of iterateEnumStyles(metadata)) {
    yield {
      variant,
      config: generateTestConfig(variant, baseConfig),
    };
  }
}

// ============================================================================
// COLOR PALETTE ACCESSORS
// ============================================================================

export interface ColorPalette {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colors: Array<{ name: string; hex: string } & Record<string, any>>;
  configKey: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  { name: 'Skin Tones', colors: SKIN_TONES, configKey: 'skinTone' },
  { name: 'Hair Colors', colors: HAIR_COLORS, configKey: 'hairColor' },
  { name: 'Eye Colors', colors: EYE_COLORS, configKey: 'eyeColor' },
  { name: 'Clothing Colors', colors: CLOTHING_COLORS, configKey: 'clothingColor' },
  { name: 'Eyeshadow Colors', colors: EYESHADOW_COLORS, configKey: 'eyeshadowColor' },
  { name: 'Eyeliner Colors', colors: EYELINER_COLORS, configKey: 'eyelinerColor' },
  { name: 'Lipstick Colors', colors: LIPSTICK_COLORS, configKey: 'lipstickColor' },
  { name: 'Blush Colors', colors: BLUSH_COLORS, configKey: 'blushColor' },
  { name: 'Dental Colors', colors: DENTAL_COLORS, configKey: 'dentalColor' },
  { name: 'Shoe Colors', colors: SHOE_COLORS, configKey: 'shoeColor' },
  { name: 'Tattoo Colors', colors: TATTOO_COLORS, configKey: 'faceTattooColor' },
  { name: 'Background Colors', colors: BACKGROUND_COLORS, configKey: 'backgroundColor' },
];

export function getTotalColorCount(): number {
  return COLOR_PALETTES.reduce((total, palette) => total + palette.colors.length, 0);
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface QAStatistics {
  totalEnums: number;
  totalVariants: number;
  totalColors: number;
  byCategory: Record<QACategory, { enumCount: number; variantCount: number }>;
  byEnum: Array<{ name: string; variantCount: number; category: QACategory }>;
}

export function getQAStatistics(): QAStatistics {
  const byCategory: Record<QACategory, { enumCount: number; variantCount: number }> = {} as Record<
    QACategory,
    { enumCount: number; variantCount: number }
  >;

  for (const category of getAllCategories()) {
    const enums = getEnumsByCategory(category);
    byCategory[category] = {
      enumCount: enums.length,
      variantCount: getCategoryVariantCount(category),
    };
  }

  return {
    totalEnums: ENUM_METADATA.length,
    totalVariants: getTotalVariantCount(),
    totalColors: getTotalColorCount(),
    byCategory,
    byEnum: ENUM_METADATA.map(meta => ({
      name: meta.name,
      variantCount: getEnumCount(meta.enumObject),
      category: meta.category,
    })),
  };
}
