/**
 * Avatar Configuration Types
 *
 * @deprecated These types are from the legacy DiceBear avatar system.
 * The app now uses Ready Player Me avatars via StoredAvatar type.
 * These types are kept for backward compatibility with older code.
 */

/**
 * Avatar rendering style
 * @deprecated Use Ready Player Me avatar system instead
 */
export type AvatarStyle = 'Circle' | 'Transparent'
/**
 * @deprecated Use StoredAvatar from components/ReadyPlayerMe instead
 */
export interface AvatarConfig {
  avatarStyle?: AvatarStyle
  skinColor?: string
  hairColor?: string
  topType?: string
  facialHairType?: string
  facialHairColor?: string
  eyeType?: string
  eyebrowType?: string
  mouthType?: string
  clotheType?: string
  clotheColor?: string
  accessoriesType?: string
  graphicType?: string
}

/**
 * @deprecated Use StoredAvatar from components/ReadyPlayerMe instead
 */
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  avatarStyle: 'Circle',
  skinColor: 'Light',
  hairColor: 'Brown',
  topType: 'ShortHairShortFlat',
  facialHairType: 'Blank',
  facialHairColor: 'Brown',
  eyeType: 'Default',
  eyebrowType: 'Default',
  mouthType: 'Default',
  clotheType: 'BlazerShirt',
  clotheColor: 'Blue',
  accessoriesType: 'Blank',
  graphicType: 'Blank',
}

/**
 * Available options for each avatar configuration property
 * @deprecated Use Ready Player Me avatar system instead
 */
export const AVATAR_OPTIONS = {
  avatarStyle: ['Circle', 'Transparent'] as const,
  skinColor: ['Tanned', 'Yellow', 'Pale', 'Light', 'Brown', 'DarkBrown', 'Black'] as const,
  hairColor: ['Auburn', 'Black', 'Blonde', 'BlondeGolden', 'Brown', 'BrownDark', 'PastelPink', 'Platinum', 'Red', 'SilverGray'] as const,
  topType: [
    'NoHair', 'Eyepatch', 'Hat', 'Hijab', 'Turban', 'WinterHat1', 'WinterHat2', 'WinterHat3', 'WinterHat4',
    'LongHairBigHair', 'LongHairBob', 'LongHairBun', 'LongHairCurly', 'LongHairCurvy', 'LongHairDreads',
    'LongHairFrida', 'LongHairFro', 'LongHairFroBand', 'LongHairNotTooLong', 'LongHairShavedSides',
    'LongHairMiaWallace', 'LongHairStraight', 'LongHairStraight2', 'LongHairStraightStrand',
    'ShortHairDreads01', 'ShortHairDreads02', 'ShortHairFrizzle', 'ShortHairShaggyMullet',
    'ShortHairShortCurly', 'ShortHairShortFlat', 'ShortHairShortRound', 'ShortHairShortWaved',
    'ShortHairSides', 'ShortHairTheCaesar', 'ShortHairTheCaesarSidePart'
  ] as const,
  facialHairType: ['Blank', 'BeardMedium', 'BeardLight', 'BeardMajestic', 'MoustacheFancy', 'MoustacheMagnum'] as const,
  facialHairColor: ['Auburn', 'Black', 'Blonde', 'BlondeGolden', 'Brown', 'BrownDark', 'Platinum', 'Red'] as const,
  eyeType: ['Close', 'Cry', 'Default', 'Dizzy', 'EyeRoll', 'Happy', 'Hearts', 'Side', 'Squint', 'Surprised', 'Wink', 'WinkWacky'] as const,
  eyebrowType: ['Angry', 'AngryNatural', 'Default', 'DefaultNatural', 'FlatNatural', 'RaisedExcited', 'RaisedExcitedNatural', 'SadConcerned', 'SadConcernedNatural', 'UnibrowNatural', 'UpDown', 'UpDownNatural'] as const,
  mouthType: ['Concerned', 'Default', 'Disbelief', 'Eating', 'Grimace', 'Sad', 'ScreamOpen', 'Serious', 'Smile', 'Tongue', 'Twinkle', 'Vomit'] as const,
  clotheType: ['BlazerShirt', 'BlazerSweater', 'CollarSweater', 'GraphicShirt', 'Hoodie', 'Overall', 'ShirtCrewNeck', 'ShirtScoopNeck', 'ShirtVNeck'] as const,
  clotheColor: ['Black', 'Blue01', 'Blue02', 'Blue03', 'Gray01', 'Gray02', 'Heather', 'PastelBlue', 'PastelGreen', 'PastelOrange', 'PastelRed', 'PastelYellow', 'Pink', 'Red', 'White'] as const,
  accessoriesType: ['Blank', 'Kurt', 'Prescription01', 'Prescription02', 'Round', 'Sunglasses', 'Wayfarers'] as const,
  graphicType: ['Bat', 'Cumbia', 'Deer', 'Diamond', 'Hola', 'Pizza', 'Resist', 'Selena', 'Bear', 'SkullOutline', 'Skull'] as const,
}
