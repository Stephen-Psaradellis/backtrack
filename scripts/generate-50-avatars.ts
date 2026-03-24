/**
 * Generate 50 Random Avatar Configurations
 *
 * Creates randomized AvatarConfig objects for visual analysis.
 * Run: npx ts-node scripts/generate-50-avatars.ts
 */

// Enum value pools (subset of most common options for realistic avatars)
const GENDERS = ['male', 'female', 'neutral'] as const;
const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'oblong', 'diamond', 'triangle', 'inverted_triangle', 'rectangle', 'pear', 'long', 'wide', 'angular', 'soft_square', 'narrow', 'baby_face', 'mature', 'high_cheekbones', 'full_cheeks', 'hollow_cheeks', 'strong_jaw', 'chiseled'] as const;
const EYE_STYLES = ['default', 'round', 'narrow', 'wide', 'almond', 'closed', 'happy', 'wink', 'sleepy', 'surprised', 'squint', 'side'] as const;
const EYEBROW_STYLES = ['default', 'natural', 'thick', 'thin', 'arched', 'flat', 'angry', 'sad', 'raised', 'concerned', 'skeptical'] as const;
const NOSE_STYLES = ['default', 'small', 'medium', 'large', 'pointed', 'rounded', 'button', 'hooked', 'flat', 'wide', 'narrow'] as const;
const MOUTH_STYLES = ['default', 'smile', 'big_smile', 'grin', 'laugh', 'smirk', 'sad', 'frown', 'serious', 'open', 'tongue', 'kiss', 'surprised', 'grimace', 'concerned'] as const;
const FACIAL_HAIR = ['none', 'none', 'none', 'stubble', 'light_beard', 'medium_beard', 'full_beard', 'goatee', 'mustache', 'mustache_fancy', 'sideburns'] as const;
const BODY_TYPES = ['slim', 'average', 'athletic', 'curvy', 'plus_size', 'muscular'] as const;
const ARM_POSES = ['down', 'hips', 'crossed', 'wave', 'peace', 'thumbs_up', 'pointing'] as const;
const LEG_POSES = ['standing', 'crossed', 'wide', 'sitting'] as const;
const HAND_GESTURES = ['open', 'fist', 'peace', 'point', 'thumbs_up', 'wave'] as const;

const HAIR_STYLES_SHORT = ['short_buzz', 'short_crew', 'short_slick', 'short_spiky', 'short_curly', 'short_side_part', 'short_pompadour', 'short_textured_crop', 'short_fade', 'short_undercut', 'short_pixie'];
const HAIR_STYLES_MEDIUM = ['medium_messy', 'medium_straight', 'medium_curly', 'medium_bob', 'medium_bob_angled', 'medium_shag', 'medium_wolf_cut', 'medium_layers', 'medium_curtain_bangs'];
const HAIR_STYLES_LONG = ['long_straight', 'long_wavy', 'long_curly', 'long_ponytail', 'long_bun', 'long_braids', 'long_layers', 'long_beach_waves', 'long_half_up', 'long_side_swept', 'long_center_part', 'long_pigtails'];
const HAIR_STYLES_SPECIAL = ['afro', 'locs', 'box_braids', 'cornrows', 'mohawk', 'bald', 'shaved'];
const HAIR_STYLES_HEADWEAR = ['hat_beanie', 'hat_cap', 'hat_bucket', 'hat_fedora', 'headband', 'hijab', 'turban'];
const ALL_HAIR_STYLES = [...HAIR_STYLES_SHORT, ...HAIR_STYLES_MEDIUM, ...HAIR_STYLES_LONG, ...HAIR_STYLES_SPECIAL, ...HAIR_STYLES_HEADWEAR];

const CLOTHING_STYLES = ['tshirt', 'hoodie', 'vneck', 'scoop_neck', 'blazer', 'sweater', 'tank_top', 'collar_shirt', 'overalls', 'polo', 'henley', 'flannel', 'hawaiian', 'jersey', 'dress_casual', 'jacket_denim', 'jacket_bomber', 'jacket_leather', 'cardigan', 'turtleneck'];
const BOTTOM_STYLES = ['jeans', 'jeans_skinny', 'jeans_wide', 'jeans_ripped', 'chinos', 'dress_pants', 'joggers', 'sweatpants', 'cargo', 'shorts', 'shorts_athletic', 'shorts_denim', 'leggings', 'skirt_mini', 'skirt_midi', 'skirt_pleated', 'track_pants'];
const SHOE_STYLES = ['sneakers', 'sneakers_high', 'boots_chelsea', 'boots_combat', 'boots_work', 'heels', 'sandals', 'flip_flops', 'loafers', 'converse', 'running', 'slides', 'crocs', 'slippers', 'birkenstock', 'yeezy', 'barefoot'];
const ACCESSORIES = ['none', 'none', 'none', 'glasses_round', 'sunglasses', 'earring_small', 'earring_hoop', 'necklace_chain', 'headphones', 'nose_ring', 'hat_baseball'];

// Color pools
const SKIN_TONES = ['#fae7d0', '#f5d7c3', '#f0c8a0', '#e0a878', '#c88c5c', '#a67040', '#8b5e3c', '#6b4226', '#4a2c17', '#3d2010', '#f5e0d0', '#e8c4a0', '#d4a97a', '#c49060', '#a07050'];
const HAIR_COLORS = ['#2c1810', '#1a0f0a', '#4a2c1a', '#6b3a20', '#8b5e3c', '#c4813d', '#d4a050', '#e8c878', '#f0d890', '#dbb06b', '#8b2500', '#c44000', '#e06030', '#a02020', '#d03030', '#1a1a1a', '#3a3a3a', '#606060', '#909090', '#c0c0c0', '#ffffff'];
const EYE_COLORS = ['#634e34', '#3b2f1a', '#8b7355', '#2e536f', '#3a7ca5', '#5c8a4a', '#3d6b3d', '#5a7247', '#6b6b6b', '#4a4a6a', '#8b4513'];
const CLOTHING_COLORS = ['#1a237e', '#283593', '#3f51b5', '#5c6bc0', '#d81b60', '#e91e63', '#f44336', '#ff5722', '#ff9800', '#ffc107', '#4caf50', '#2e7d32', '#006064', '#00695c', '#4e342e', '#5d4037', '#263238', '#37474f', '#1a1a1a', '#f5f5f5', '#ffffff', '#9c27b0', '#7b1fa2'];
const SHOE_COLORS = ['#1a1a1a', '#333333', '#5d4037', '#8d6e63', '#ffffff', '#f5f5f5', '#d32f2f', '#1976d2', '#388e3c'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickColor(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface RandomAvatarConfig {
  id: string;
  gender: string;
  faceShape: string;
  skinTone: string;
  eyeStyle: string;
  eyeColor: string;
  eyebrowStyle: string;
  noseStyle: string;
  mouthStyle: string;
  hairStyle: string;
  hairColor: string;
  facialHair: string;
  accessory: string;
  clothing: string;
  clothingColor: string;
  bodyType: string;
  armPose: string;
  legPose: string;
  leftHandGesture: string;
  rightHandGesture: string;
  bottomStyle: string;
  bottomColor: string;
  shoeStyle: string;
  shoeColor: string;
}

function generateRandomAvatar(index: number): RandomAvatarConfig {
  const gender = pick(GENDERS);
  const isMale = gender === 'male';
  const isFemale = gender === 'female';

  return {
    id: `avatar_${String(index + 1).padStart(2, '0')}`,
    gender,
    faceShape: pick(FACE_SHAPES),
    skinTone: pickColor(SKIN_TONES),
    eyeStyle: pick(EYE_STYLES),
    eyeColor: pickColor(EYE_COLORS),
    eyebrowStyle: pick(EYEBROW_STYLES),
    noseStyle: pick(NOSE_STYLES),
    mouthStyle: pick(MOUTH_STYLES),
    hairStyle: pick(ALL_HAIR_STYLES),
    hairColor: pickColor(HAIR_COLORS),
    facialHair: isFemale ? 'none' : pick(FACIAL_HAIR),
    accessory: pick(ACCESSORIES),
    clothing: pick(CLOTHING_STYLES),
    clothingColor: pickColor(CLOTHING_COLORS),
    bodyType: pick(BODY_TYPES),
    armPose: pick(ARM_POSES),
    legPose: pick(LEG_POSES),
    leftHandGesture: pick(HAND_GESTURES),
    rightHandGesture: pick(HAND_GESTURES),
    bottomStyle: pick(BOTTOM_STYLES),
    bottomColor: pickColor(CLOTHING_COLORS),
    shoeStyle: pick(SHOE_STYLES),
    shoeColor: pickColor(SHOE_COLORS),
  };
}

// Generate 50 avatars
const avatars: RandomAvatarConfig[] = [];
for (let i = 0; i < 50; i++) {
  avatars.push(generateRandomAvatar(i));
}

// Output as JSON
console.log(JSON.stringify(avatars, null, 2));
