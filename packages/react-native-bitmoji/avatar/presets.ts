/**
 * Avatar Presets
 *
 * Pre-configured avatar templates for quick avatar creation.
 * Users can select a preset as a starting point and customize from there.
 */

import {
  AvatarConfig,
  FaceShape,
  EyeStyle,
  EyebrowStyle,
  NoseStyle,
  MouthStyle,
  HairStyle,
  ClothingStyle,
  FacialHairStyle,
  AccessoryStyle,
  BodyType,
  ArmPose,
  LegPose,
  HandGesture,
  BottomStyle,
  ShoeStyle,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CLOTHING_COLORS,
} from './types';

// =============================================================================
// PRESET INTERFACE
// =============================================================================

export interface AvatarPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  config: AvatarConfig;
}

export type PresetCategory =
  | 'casual'
  | 'professional'
  | 'fun'
  | 'cultural'
  | 'sporty';

// =============================================================================
// CASUAL PRESETS
// =============================================================================

export const CASUAL_PRESETS: AvatarPreset[] = [
  {
    id: 'casual_alex',
    name: 'Alex',
    description: 'Casual and friendly',
    category: 'casual',
    config: {
      gender: 'male',
      faceShape: FaceShape.OVAL,
      skinTone: SKIN_TONES[2].hex,
      eyeStyle: EyeStyle.DEFAULT,
      eyeColor: EYE_COLORS[1].hex,
      eyebrowStyle: EyebrowStyle.DEFAULT,
      noseStyle: NoseStyle.DEFAULT,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.SHORT_TEXTURED_CROP,
      hairColor: HAIR_COLORS[2].hex,
      clothing: ClothingStyle.TSHIRT,
      clothingColor: CLOTHING_COLORS[4].hex,
      bodyType: BodyType.AVERAGE,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.JEANS,
      bottomColor: '#1a237e',
      shoeStyle: ShoeStyle.SNEAKERS,
      shoeColor: '#f5f5f5',
    },
  },
  {
    id: 'casual_maya',
    name: 'Maya',
    description: 'Warm and welcoming',
    category: 'casual',
    config: {
      gender: 'female',
      faceShape: FaceShape.ROUND,
      skinTone: SKIN_TONES[4].hex,
      eyeStyle: EyeStyle.ROUND,
      eyeColor: EYE_COLORS[3].hex,
      eyebrowStyle: EyebrowStyle.NATURAL,
      noseStyle: NoseStyle.SMALL,
      mouthStyle: MouthStyle.BIG_SMILE,
      hairStyle: HairStyle.LONG_WAVY,
      hairColor: HAIR_COLORS[0].hex,
      clothing: ClothingStyle.SCOOP_NECK,
      clothingColor: CLOTHING_COLORS[7].hex,
      bodyType: BodyType.CURVY,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.JEANS_SKINNY,
      bottomColor: '#1a237e',
      shoeStyle: ShoeStyle.FLATS,
      shoeColor: '#d32f2f',
    },
  },
  {
    id: 'casual_jordan',
    name: 'Jordan',
    description: 'Cool and laid back',
    category: 'casual',
    config: {
      gender: 'neutral',
      faceShape: FaceShape.SQUARE,
      skinTone: SKIN_TONES[6].hex,
      eyeStyle: EyeStyle.ALMOND,
      eyeColor: EYE_COLORS[0].hex,
      eyebrowStyle: EyebrowStyle.THICK,
      noseStyle: NoseStyle.WIDE,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.AFRO,
      hairColor: HAIR_COLORS[0].hex,
      clothing: ClothingStyle.HOODIE,
      clothingColor: '#424242',
      bodyType: BodyType.ATHLETIC,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.JOGGERS,
      bottomColor: '#424242',
      shoeStyle: ShoeStyle.SNEAKERS,
      shoeColor: '#f5f5f5',
    },
  },
];

// =============================================================================
// PROFESSIONAL PRESETS
// =============================================================================

export const PROFESSIONAL_PRESETS: AvatarPreset[] = [
  {
    id: 'pro_michael',
    name: 'Michael',
    description: 'Business professional',
    category: 'professional',
    config: {
      gender: 'male',
      faceShape: FaceShape.OBLONG,
      skinTone: SKIN_TONES[1].hex,
      eyeStyle: EyeStyle.DEFAULT,
      eyeColor: EYE_COLORS[2].hex,
      eyebrowStyle: EyebrowStyle.DEFAULT,
      noseStyle: NoseStyle.DEFAULT,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.SHORT_SIDE_PART,
      hairColor: HAIR_COLORS[1].hex,
      clothing: ClothingStyle.BUTTON_UP,
      clothingColor: '#1565c0',
      bodyType: BodyType.AVERAGE,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.DRESS_PANTS,
      bottomColor: '#212121',
      shoeStyle: ShoeStyle.OXFORDS,
      shoeColor: '#3e2723',
    },
  },
  {
    id: 'pro_sophia',
    name: 'Sophia',
    description: 'Executive style',
    category: 'professional',
    config: {
      gender: 'female',
      faceShape: FaceShape.OVAL,
      skinTone: SKIN_TONES[3].hex,
      eyeStyle: EyeStyle.DEFAULT,
      eyeColor: EYE_COLORS[1].hex,
      eyebrowStyle: EyebrowStyle.ARCHED,
      noseStyle: NoseStyle.MEDIUM,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.MEDIUM_BOB,
      hairColor: HAIR_COLORS[1].hex,
      accessory: AccessoryStyle.GLASSES_ROUND,
      clothing: ClothingStyle.BLAZER,
      clothingColor: '#37474f',
      bodyType: BodyType.SLIM,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.SKIRT_MIDI,
      bottomColor: '#37474f',
      shoeStyle: ShoeStyle.HEELS,
      shoeColor: '#1a1a1a',
    },
  },
];

// =============================================================================
// FUN PRESETS
// =============================================================================

export const FUN_PRESETS: AvatarPreset[] = [
  {
    id: 'fun_luna',
    name: 'Luna',
    description: 'Colorful and creative',
    category: 'fun',
    config: {
      gender: 'female',
      faceShape: FaceShape.HEART,
      skinTone: SKIN_TONES[0].hex,
      eyeStyle: EyeStyle.ROUND,
      eyeColor: '#9c27b0',
      eyebrowStyle: EyebrowStyle.NATURAL,
      noseStyle: NoseStyle.BUTTON,
      mouthStyle: MouthStyle.GRIN,
      hairStyle: HairStyle.LONG_SPACE_BUNS,
      hairColor: '#e91e63',
      hairSecondaryColor: '#9c27b0',
      clothing: ClothingStyle.CROP_TOP,
      clothingColor: '#e91e63',
      bodyType: BodyType.SLIM,
      armPose: ArmPose.HIPS,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.PEACE,
      rightHandGesture: HandGesture.PEACE,
      bottomStyle: BottomStyle.SKIRT_MINI,
      bottomColor: '#7b1fa2',
      shoeStyle: ShoeStyle.BOOTS_ANKLE,
      shoeColor: '#1a1a1a',
    },
  },
  {
    id: 'fun_kai',
    name: 'Kai',
    description: 'Energetic gamer',
    category: 'fun',
    config: {
      gender: 'male',
      faceShape: FaceShape.ROUND,
      skinTone: SKIN_TONES[5].hex,
      eyeStyle: EyeStyle.WIDE,
      eyeColor: EYE_COLORS[4].hex,
      eyebrowStyle: EyebrowStyle.RAISED,
      noseStyle: NoseStyle.DEFAULT,
      mouthStyle: MouthStyle.BIG_SMILE,
      hairStyle: HairStyle.SHORT_SPIKY,
      hairColor: '#2196f3',
      accessory: AccessoryStyle.HEADPHONES,
      clothing: ClothingStyle.TSHIRT,
      clothingColor: '#4caf50',
      bodyType: BodyType.AVERAGE,
      armPose: ArmPose.CROSSED,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.THUMBS_UP,
      rightHandGesture: HandGesture.THUMBS_UP,
      bottomStyle: BottomStyle.JOGGERS,
      bottomColor: '#212121',
      shoeStyle: ShoeStyle.SNEAKERS,
      shoeColor: '#4caf50',
    },
  },
  {
    id: 'fun_max',
    name: 'Max',
    description: 'Party animal',
    category: 'fun',
    config: {
      gender: 'neutral',
      faceShape: FaceShape.OVAL,
      skinTone: SKIN_TONES[2].hex,
      eyeStyle: EyeStyle.WINK_LEFT,
      eyeColor: EYE_COLORS[5].hex,
      eyebrowStyle: EyebrowStyle.NATURAL,
      eyebrowColor: '#8d4e32',
      noseStyle: NoseStyle.DEFAULT,
      mouthStyle: MouthStyle.LAUGH,
      hairStyle: HairStyle.MOHAWK,
      hairColor: '#ff5722',
      clothing: ClothingStyle.TANK_TOP,
      clothingColor: '#ffeb3b',
      bodyType: BodyType.ATHLETIC,
      armPose: ArmPose.ARMS_UP,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.ROCK_ON_GESTURE,
      rightHandGesture: HandGesture.ROCK_ON_GESTURE,
      bottomStyle: BottomStyle.SHORTS,
      bottomColor: '#1a237e',
      shoeStyle: ShoeStyle.SNEAKERS_HIGH,
      shoeColor: '#ff5722',
    },
  },
];

// =============================================================================
// CULTURAL PRESETS
// =============================================================================

export const CULTURAL_PRESETS: AvatarPreset[] = [
  {
    id: 'cultural_amara',
    name: 'Amara',
    description: 'Natural beauty',
    category: 'cultural',
    config: {
      gender: 'female',
      faceShape: FaceShape.OVAL,
      skinTone: SKIN_TONES[8].hex,
      eyeStyle: EyeStyle.ALMOND,
      eyeColor: EYE_COLORS[0].hex,
      eyebrowStyle: EyebrowStyle.NATURAL,
      noseStyle: NoseStyle.WIDE,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.BOX_BRAIDS,
      hairColor: HAIR_COLORS[0].hex,
      clothing: ClothingStyle.SCOOP_NECK,
      clothingColor: '#ff9800',
      bodyType: BodyType.CURVY,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.SKIRT_MIDI,
      bottomColor: '#ffb300',
      shoeStyle: ShoeStyle.SANDALS,
      shoeColor: '#5d4037',
    },
  },
  {
    id: 'cultural_aisha',
    name: 'Aisha',
    description: 'Elegant and modest',
    category: 'cultural',
    config: {
      gender: 'female',
      faceShape: FaceShape.OVAL,
      skinTone: SKIN_TONES[5].hex,
      eyeStyle: EyeStyle.ALMOND,
      eyeColor: EYE_COLORS[0].hex,
      eyebrowStyle: EyebrowStyle.NATURAL,
      noseStyle: NoseStyle.DEFAULT,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.HIJAB,
      hairColor: '#00695c',
      clothing: ClothingStyle.TURTLENECK,
      clothingColor: '#00695c',
      bodyType: BodyType.AVERAGE,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.SKIRT_MIDI,
      bottomColor: '#00695c',
      shoeStyle: ShoeStyle.FLATS,
      shoeColor: '#5d4037',
    },
  },
];

// =============================================================================
// SPORTY PRESETS
// =============================================================================

export const SPORTY_PRESETS: AvatarPreset[] = [
  {
    id: 'sporty_tyler',
    name: 'Tyler',
    description: 'Basketball star',
    category: 'sporty',
    config: {
      gender: 'male',
      faceShape: FaceShape.SQUARE,
      skinTone: SKIN_TONES[7].hex,
      eyeStyle: EyeStyle.DEFAULT,
      eyeColor: EYE_COLORS[0].hex,
      eyebrowStyle: EyebrowStyle.THICK,
      noseStyle: NoseStyle.WIDE,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.SHORT_FADE,
      hairColor: HAIR_COLORS[0].hex,
      clothing: ClothingStyle.TANK_ATHLETIC,
      clothingColor: '#f44336',
      bodyType: BodyType.ATHLETIC,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.SHORTS_ATHLETIC,
      bottomColor: '#f44336',
      shoeStyle: ShoeStyle.SNEAKERS_HIGH,
      shoeColor: '#f5f5f5',
    },
  },
  {
    id: 'sporty_emma',
    name: 'Emma',
    description: 'Fitness enthusiast',
    category: 'sporty',
    config: {
      gender: 'female',
      faceShape: FaceShape.OVAL,
      skinTone: SKIN_TONES[2].hex,
      eyeStyle: EyeStyle.DEFAULT,
      eyeColor: EYE_COLORS[2].hex,
      eyebrowStyle: EyebrowStyle.NATURAL,
      noseStyle: NoseStyle.DEFAULT,
      mouthStyle: MouthStyle.SMILE,
      hairStyle: HairStyle.LONG_PONYTAIL_HIGH,
      hairColor: HAIR_COLORS[5].hex,
      accessory: AccessoryStyle.HEADBAND,
      clothing: ClothingStyle.TANK_ATHLETIC,
      clothingColor: '#e91e63',
      bodyType: BodyType.ATHLETIC,
      armPose: ArmPose.DOWN,
      legPose: LegPose.STANDING,
      leftHandGesture: HandGesture.OPEN,
      rightHandGesture: HandGesture.OPEN,
      bottomStyle: BottomStyle.LEGGINGS,
      bottomColor: '#1a1a1a',
      shoeStyle: ShoeStyle.RUNNING,
      shoeColor: '#e91e63',
    },
  },
];

// =============================================================================
// ALL PRESETS
// =============================================================================

export const ALL_PRESETS: AvatarPreset[] = [
  ...CASUAL_PRESETS,
  ...PROFESSIONAL_PRESETS,
  ...FUN_PRESETS,
  ...CULTURAL_PRESETS,
  ...SPORTY_PRESETS,
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): AvatarPreset[] {
  return ALL_PRESETS.filter(preset => preset.category === category);
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): AvatarPreset | undefined {
  return ALL_PRESETS.find(preset => preset.id === id);
}

/**
 * Get preset categories with labels
 */
export const PRESET_CATEGORIES: { id: PresetCategory; label: string; icon: string }[] = [
  { id: 'casual', label: 'Casual', icon: 'person-outline' },
  { id: 'professional', label: 'Professional', icon: 'briefcase-outline' },
  { id: 'fun', label: 'Fun', icon: 'happy-outline' },
  { id: 'cultural', label: 'Cultural', icon: 'globe-outline' },
  { id: 'sporty', label: 'Sporty', icon: 'fitness-outline' },
];
