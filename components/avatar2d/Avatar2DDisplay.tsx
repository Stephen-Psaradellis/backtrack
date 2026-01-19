/**
 * Avatar2DDisplay Component
 *
 * Renders a 2D avatar using DiceBear's Avataaars API.
 * All assets come from https://www.dicebear.com/styles/avataaars/
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import {
  StoredAvatar2D,
  Avatar2DConfig,
  Avatar2DSize,
  AVATAR_SIZES,
  DEFAULT_AVATAR_CONFIG,
  isStoredAvatar2D,
} from './types';

interface Avatar2DDisplayProps {
  avatar?: StoredAvatar2D | Avatar2DConfig | null;
  size?: Avatar2DSize;
  style?: ViewStyle;
  showBorder?: boolean;
  borderColor?: string;
}

// Helper to extract config from either type
function getConfig(avatar?: StoredAvatar2D | Avatar2DConfig | null): Avatar2DConfig {
  if (!avatar) return DEFAULT_AVATAR_CONFIG;
  const rawConfig = isStoredAvatar2D(avatar) ? avatar.config : avatar;
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...rawConfig,
  };
}

// Map our hair styles to DiceBear top options
const HAIR_STYLE_MAP: Record<string, string> = {
  shortHairShortFlat: 'shortFlat',
  shortHairShortWaved: 'shortWaved',
  shortHairShortCurly: 'shortCurly',
  shortHairShortRound: 'shortRound',
  shortHairTheCaesar: 'theCaesar',
  shortHairTheCaesarSidePart: 'theCaesarAndSidePart',
  shortHairDreads01: 'dreads01',
  shortHairDreads02: 'dreads02',
  shortHairFrizzle: 'frizzle',
  shortHairShaggyMullet: 'shaggyMullet',
  shortHairSides: 'sides',
  longHairBigHair: 'bigHair',
  longHairBob: 'bob',
  longHairBun: 'bun',
  longHairCurly: 'curly',
  longHairCurvy: 'curvy',
  longHairDreads: 'dreads',
  longHairFrida: 'frida',
  longHairFro: 'fro',
  longHairFroBand: 'froBand',
  longHairMiaWallace: 'miaWallace',
  longHairNotTooLong: 'longButNotTooLong',
  longHairShavedSides: 'shavedSides',
  longHairStraight: 'straight01',
  longHairStraight2: 'straight02',
  longHairStraightStrand: 'straightAndStrand',
  noHair: 'noHair',
  hatHair1: 'hat',
  hatHair2: 'hat',
  hatHair3: 'hat',
  hatHair4: 'hat',
  winterHat1: 'winterHat1',
  winterHat2: 'winterHat02',
  winterHat3: 'winterHat03',
  winterHat4: 'winterHat04',
  turban: 'turban',
  hijab: 'hijab',
};

// Map our eye types to DiceBear eyes options
const EYE_TYPE_MAP: Record<string, string> = {
  default: 'default',
  close: 'closed',
  cry: 'cry',
  dizzy: 'xDizzy',
  eyeRoll: 'eyeRoll',
  happy: 'happy',
  hearts: 'hearts',
  side: 'side',
  squint: 'squint',
  surprised: 'surprised',
  wink: 'wink',
  winkWacky: 'winkWacky',
};

// Map our eyebrow types to DiceBear eyebrows options
const EYEBROW_TYPE_MAP: Record<string, string> = {
  default: 'default',
  defaultNatural: 'defaultNatural',
  angry: 'angry',
  angryNatural: 'angryNatural',
  flatNatural: 'flatNatural',
  frownNatural: 'frownNatural',
  raisedExcited: 'raisedExcited',
  raisedExcitedNatural: 'raisedExcitedNatural',
  sadConcerned: 'sadConcerned',
  sadConcernedNatural: 'sadConcernedNatural',
  unibrowNatural: 'unibrowNatural',
  upDown: 'upDown',
  upDownNatural: 'upDownNatural',
};

// Map our mouth types to DiceBear mouth options
const MOUTH_TYPE_MAP: Record<string, string> = {
  default: 'default',
  concerned: 'concerned',
  disbelief: 'disbelief',
  eating: 'eating',
  grimace: 'grimace',
  sad: 'sad',
  screamOpen: 'screamOpen',
  serious: 'serious',
  smile: 'smile',
  tongue: 'tongue',
  twinkle: 'twinkle',
  vomit: 'vomit',
};

// Map our facial hair types to DiceBear facialHair options
const FACIAL_HAIR_MAP: Record<string, string> = {
  none: '',
  beardMedium: 'beardMedium',
  beardLight: 'beardLight',
  beardMagestic: 'beardMajestic',
  moustacheFancy: 'moustacheFancy',
  moustacheMagnum: 'moustacheMagnum',
};

// Map our accessories to DiceBear accessories options
const ACCESSORIES_MAP: Record<string, string> = {
  none: '',
  eyepatch: 'eyepatch',
  kurt: 'kurt',
  prescription01: 'prescription01',
  prescription02: 'prescription02',
  round: 'round',
  sunglasses: 'sunglasses',
  wayfarers: 'wayfarers',
};

// Map our clothing types to DiceBear clothing options
const CLOTHING_MAP: Record<string, string> = {
  blazerShirt: 'blazerAndShirt',
  blazerSweater: 'blazerAndSweater',
  collarSweater: 'collarAndSweater',
  graphicShirt: 'graphicShirt',
  hoodie: 'hoodie',
  overall: 'overall',
  shirtCrewNeck: 'shirtCrewNeck',
  shirtScoopNeck: 'shirtScoopNeck',
  shirtVNeck: 'shirtVNeck',
};

// Map skin tone hex to DiceBear skinColor (hex without #)
// DiceBear skinColor options: 614335, d08b5b, ae5d29, edb98a, ffdbb4, fd9841, f8d25c
function getSkinColor(hex: string): string {
  const skinMap: Record<string, string> = {
    '#ffdbb4': 'ffdbb4',
    '#f5d7c3': 'ffdbb4',
    '#eac086': 'edb98a',
    '#d4a574': 'edb98a',
    '#c99d77': 'd08b5b',
    '#b08d63': 'd08b5b',
    '#c68642': 'fd9841',
    '#8d5524': 'ae5d29',
    '#6b4423': '614335',
    '#4a2c2a': '614335',
  };
  return skinMap[hex.toLowerCase()] || 'edb98a';
}

// Build DiceBear URL from config
function buildDiceBearUrl(config: Avatar2DConfig, size: number): string {
  const baseUrl = 'https://api.dicebear.com/9.x/avataaars/svg';

  const params = new URLSearchParams();

  // Size
  params.set('size', size.toString());

  // Skin color (hex without #)
  params.set('skinColor', getSkinColor(config.skinTone));

  // Hair/Top
  const topStyle = HAIR_STYLE_MAP[config.hairStyle] || 'shortFlat';
  params.set('top', topStyle);

  // Hair color (hex without #)
  if (config.hairColor) {
    params.set('hairColor', config.hairColor.replace('#', ''));
  }

  // Eyes
  const eyeStyle = EYE_TYPE_MAP[config.eyeType] || 'default';
  params.set('eyes', eyeStyle);

  // Eyebrows
  const eyebrowStyle = EYEBROW_TYPE_MAP[config.eyebrowType] || 'default';
  params.set('eyebrows', eyebrowStyle);

  // Mouth
  const mouthStyle = MOUTH_TYPE_MAP[config.mouthType] || 'default';
  params.set('mouth', mouthStyle);

  // Facial hair (optional)
  if (config.facialHair && config.facialHair !== 'none') {
    const facialHairStyle = FACIAL_HAIR_MAP[config.facialHair];
    if (facialHairStyle) {
      params.set('facialHair', facialHairStyle);
      params.set('facialHairProbability', '100');
    }
  }

  // Accessories (optional)
  if (config.accessories && config.accessories !== 'none') {
    const accessoriesStyle = ACCESSORIES_MAP[config.accessories];
    if (accessoriesStyle) {
      params.set('accessories', accessoriesStyle);
      params.set('accessoriesProbability', '100');
    }
  }

  // Clothing
  if (config.clothing) {
    const clothingStyle = CLOTHING_MAP[config.clothing] || 'shirtCrewNeck';
    params.set('clothing', clothingStyle);

    // Clothing color (hex without #)
    if (config.clothingColor) {
      params.set('clothingColor', config.clothingColor.replace('#', ''));
    }
  }

  return `${baseUrl}?${params.toString()}`;
}

export const Avatar2DDisplay: React.FC<Avatar2DDisplayProps> = ({
  avatar,
  size = 'md',
  style,
  showBorder = false,
  borderColor = '#6366f1',
}) => {
  const config = getConfig(avatar);
  const pixelSize = AVATAR_SIZES[size];

  // Build DiceBear URL
  const avatarUrl = useMemo(() => {
    return buildDiceBearUrl(config, pixelSize * 2); // 2x for retina
  }, [config, pixelSize]);

  const containerStyle: ViewStyle = {
    width: pixelSize,
    height: pixelSize,
    borderRadius: pixelSize / 2,
    overflow: 'hidden',
    backgroundColor: '#e8e8e8',
    ...(showBorder && {
      borderWidth: 2,
      borderColor,
    }),
  };

  return (
    <View style={[containerStyle, style]}>
      <SvgUri
        width={pixelSize}
        height={pixelSize}
        uri={avatarUrl}
      />
    </View>
  );
};

export default Avatar2DDisplay;
