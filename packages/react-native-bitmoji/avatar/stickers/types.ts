/**
 * Sticker System Types
 *
 * Type definitions for the Bitmoji-style sticker system.
 * Stickers combine avatar poses, expressions, and scenes.
 */

import { AvatarConfig, EyeStyle, EyebrowStyle, MouthStyle } from '../types';

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Categories for organizing stickers
 */
export enum StickerCategory {
  GREETINGS = 'greetings',
  REACTIONS = 'reactions',
  EMOTIONS = 'emotions',
  ACTIVITIES = 'activities',
  CELEBRATIONS = 'celebrations',
  FOOD = 'food',
  WEATHER = 'weather',
  LOVE = 'love',
  WORK = 'work',
  SPORTS = 'sports',
  FUNNY = 'funny',
  SEASONAL = 'seasonal',
}

/**
 * Emotions/expressions for stickers
 */
export enum Emotion {
  HAPPY = 'happy',
  EXCITED = 'excited',
  LAUGHING = 'laughing',
  LOVE = 'love',
  COOL = 'cool',
  WINK = 'wink',
  SAD = 'sad',
  CRYING = 'crying',
  ANGRY = 'angry',
  ANNOYED = 'annoyed',
  SURPRISED = 'surprised',
  SHOCKED = 'shocked',
  CONFUSED = 'confused',
  THINKING = 'thinking',
  SKEPTICAL = 'skeptical',
  EMBARRASSED = 'embarrassed',
  NERVOUS = 'nervous',
  SLEEPY = 'sleepy',
  SICK = 'sick',
  NEUTRAL = 'neutral',
}

/**
 * Body poses for stickers
 */
export enum StickerPose {
  // Standing poses
  STANDING = 'standing',
  STANDING_HANDS_ON_HIPS = 'standing_hands_on_hips',
  STANDING_ARMS_CROSSED = 'standing_arms_crossed',

  // Gestures
  WAVING = 'waving',
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
  PEACE_SIGN = 'peace_sign',
  OK_SIGN = 'ok_sign',
  POINTING = 'pointing',
  FACEPALM = 'facepalm',
  SHRUG = 'shrug',
  CLAPPING = 'clapping',
  HEART_HANDS = 'heart_hands',

  // Actions
  SITTING = 'sitting',
  LYING_DOWN = 'lying_down',
  RUNNING = 'running',
  DANCING = 'dancing',
  JUMPING = 'jumping',
  WALKING = 'walking',

  // Activities
  SLEEPING = 'sleeping',
  EATING = 'eating',
  DRINKING = 'drinking',
  WORKING = 'working',
  READING = 'reading',
  THINKING_POSE = 'thinking_pose',
  CELEBRATING = 'celebrating',

  // Face-only (just head/shoulders)
  FACE_ONLY = 'face_only',
  BUST = 'bust',
}

/**
 * Viewing angles for stickers
 */
export enum ViewAngle {
  FRONT = 'front',
  THREE_QUARTER = 'three_quarter',
  SIDE = 'side',
  BACK = 'back',
}

/**
 * Props/items that can appear in stickers
 */
export enum StickerProp {
  // Food & Drink
  COFFEE = 'coffee',
  TEA = 'tea',
  PIZZA = 'pizza',
  BURGER = 'burger',
  TACO = 'taco',
  ICE_CREAM = 'ice_cream',
  CAKE = 'cake',
  WINE = 'wine',
  BEER = 'beer',

  // Objects
  PHONE = 'phone',
  LAPTOP = 'laptop',
  BOOK = 'book',
  HEADPHONES = 'headphones',
  UMBRELLA = 'umbrella',
  GIFT = 'gift',
  BALLOON = 'balloon',
  FLOWER = 'flower',
  HEART = 'heart',

  // Nature
  SUN = 'sun',
  CLOUD = 'cloud',
  RAIN = 'rain',
  SNOW = 'snow',
  RAINBOW = 'rainbow',
  STAR = 'star',
  MOON = 'moon',

  // Sports
  BASKETBALL = 'basketball',
  FOOTBALL = 'football',
  SOCCER_BALL = 'soccer_ball',
  TENNIS_RACKET = 'tennis_racket',

  // Effects
  SPARKLES = 'sparkles',
  FIRE = 'fire',
  LIGHTNING = 'lightning',
  TEARS = 'tears',
  SWEAT_DROP = 'sweat_drop',
  ANGER_VEIN = 'anger_vein',
  HEART_EYES = 'heart_eyes',
  ZZZ = 'zzz',
  QUESTION_MARK = 'question_mark',
  EXCLAMATION = 'exclamation',

  // ============================================================================
  // PHASE 2.3 EXPANSION - Additional Props
  // ============================================================================

  // More Food & Drink
  COFFEE_CUP = 'coffee_cup',
  BUBBLE_TEA = 'bubble_tea',
  SMOOTHIE = 'smoothie',
  SODA = 'soda',
  JUICE = 'juice',
  CHAMPAGNE = 'champagne',
  COCKTAIL = 'cocktail',
  SUSHI = 'sushi',
  RAMEN = 'ramen',
  DONUT = 'donut',
  COOKIE = 'cookie',
  CUPCAKE = 'cupcake',
  POPCORN = 'popcorn',
  CANDY = 'candy',
  CHOCOLATE = 'chocolate',
  SALAD = 'salad',
  SANDWICH = 'sandwich',
  HOT_DOG = 'hot_dog',
  FRIES = 'fries',
  APPLE = 'apple',
  AVOCADO = 'avocado',
  WATERMELON = 'watermelon',
  BANANA = 'banana',

  // Tech
  TABLET = 'tablet',
  SMART_WATCH = 'smart_watch',
  CAMERA = 'camera',
  GAMING_CONTROLLER = 'gaming_controller',
  VR_HEADSET_PROP = 'vr_headset_prop',
  SELFIE_STICK = 'selfie_stick',
  DRONE = 'drone',
  ROBOT = 'robot',
  MICROPHONE_PROP = 'microphone_prop',
  SPEAKER = 'speaker',
  TV_SCREEN = 'tv_screen',
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',

  // Musical Instruments
  GUITAR = 'guitar',
  ELECTRIC_GUITAR = 'electric_guitar',
  BASS = 'bass',
  DRUM_STICKS = 'drum_sticks',
  PIANO_KEYS = 'piano_keys',
  SAXOPHONE = 'saxophone',
  TRUMPET = 'trumpet',
  VIOLIN = 'violin',
  DJ_TURNTABLE = 'dj_turntable',
  SYNTHESIZER = 'synthesizer',
  MARACAS = 'maracas',
  TAMBOURINE = 'tambourine',

  // Sports Equipment
  BASEBALL = 'baseball',
  BASEBALL_BAT = 'baseball_bat',
  GOLF_CLUB = 'golf_club',
  HOCKEY_STICK = 'hockey_stick',
  VOLLEYBALL = 'volleyball',
  BOWLING_BALL = 'bowling_ball',
  PING_PONG = 'ping_pong',
  SKATEBOARD = 'skateboard',
  SURFBOARD = 'surfboard',
  SKI = 'ski',
  SNOWBOARD = 'snowboard',
  DUMBBELL = 'dumbbell',
  YOGA_MAT = 'yoga_mat',
  JUMP_ROPE = 'jump_rope',
  BOXING_GLOVES = 'boxing_gloves',

  // Fashion/Beauty
  PURSE = 'purse',
  BACKPACK = 'backpack',
  BRIEFCASE = 'briefcase',
  SHOPPING_BAGS = 'shopping_bags',
  SUNGLASSES_PROP = 'sunglasses_prop',
  HAT_PROP = 'hat_prop',
  SCARF = 'scarf',
  TIE = 'tie',
  LIPSTICK = 'lipstick',
  NAIL_POLISH = 'nail_polish',
  PERFUME = 'perfume',
  MIRROR = 'mirror',
  BRUSH = 'brush',
  CROWN_PROP = 'crown_prop',

  // Celebration/Party
  PARTY_HAT = 'party_hat',
  PARTY_POPPER = 'party_popper',
  STREAMERS = 'streamers',
  CHAMPAGNE_BOTTLE = 'champagne_bottle',
  TROPHY = 'trophy',
  MEDAL = 'medal',
  DIPLOMA = 'diploma',
  PRESENTS = 'presents',
  BALLOONS = 'balloons',
  CAKE_SLICE = 'cake_slice',
  CANDLES = 'candles',
  FIREWORKS = 'fireworks',
  BANNER = 'banner',
  WEDDING_RINGS = 'wedding_rings',
  BABY = 'baby',

  // Nature/Weather
  LEAVES = 'leaves',
  FLOWER_BOUQUET = 'flower_bouquet',
  ROSE = 'rose',
  SUNFLOWER = 'sunflower',
  CACTUS = 'cactus',
  PALM_TREE = 'palm_tree',
  CHRISTMAS_TREE = 'christmas_tree',
  PUMPKIN = 'pumpkin',
  SNOW_FLAKE = 'snow_flake',
  THUNDER_CLOUD = 'thunder_cloud',
  TORNADO = 'tornado',
  WAVE = 'wave',
  LEAF = 'leaf',
  MUSHROOM = 'mushroom',

  // Animals
  DOG = 'dog',
  CAT = 'cat',
  BIRD = 'bird',
  FISH = 'fish',
  BUNNY = 'bunny',
  BEAR = 'bear',
  UNICORN = 'unicorn',
  BUTTERFLY_PROP = 'butterfly_prop',
  BEE = 'bee',
  LADYBUG = 'ladybug',
  PENGUIN = 'penguin',
  PANDA = 'panda',
  KOALA = 'koala',
  SLOTH = 'sloth',
  DINOSAUR = 'dinosaur',
  DRAGON = 'dragon',

  // Tools/Work
  HAMMER = 'hammer',
  WRENCH = 'wrench',
  PAINTBRUSH = 'paintbrush',
  PALETTE = 'palette',
  PEN = 'pen',
  PENCIL = 'pencil',
  SCISSORS = 'scissors',
  RULER = 'ruler',
  MAGNIFYING_GLASS = 'magnifying_glass',
  TELESCOPE = 'telescope',
  MICROSCOPE = 'microscope',
  STETHOSCOPE = 'stethoscope',
  BRIEFCASE_PROP = 'briefcase_prop',
  CALENDAR = 'calendar',
  CLOCK = 'clock',
  HOURGLASS = 'hourglass',

  // Vehicles
  CAR_PROP = 'car_prop',
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
  SCOOTER = 'scooter',
  PLANE_PROP = 'plane_prop',
  HELICOPTER = 'helicopter',
  ROCKET = 'rocket',
  BOAT_PROP = 'boat_prop',
  TRAIN_PROP = 'train_prop',
  BUS = 'bus',
  TAXI = 'taxi',
  UFO = 'ufo',

  // More Effects
  GLOW = 'glow',
  AURA = 'aura',
  BUBBLES = 'bubbles',
  SMOKE = 'smoke',
  STEAM = 'steam',
  EXPLOSION = 'explosion',
  MOTION_LINES = 'motion_lines',
  IMPACT_STAR = 'impact_star',
  THOUGHT_BUBBLE = 'thought_bubble',
  SPEECH_BUBBLE = 'speech_bubble',
  HEART_BROKEN = 'heart_broken',
  HEARTS_MULTIPLE = 'hearts_multiple',
  STARS_MULTIPLE = 'stars_multiple',
  MUSIC_NOTES = 'music_notes',
  DOLLAR_SIGNS = 'dollar_signs',
  CRYPTO = 'crypto',
  THUMBS_UP_PROP = 'thumbs_up_prop',
  THUMBS_DOWN_PROP = 'thumbs_down_prop',
  CHECK_MARK = 'check_mark',
  X_MARK = 'x_mark',
  SKULL = 'skull',
  GHOST = 'ghost',
  ALIEN = 'alien',
  DEVIL_HORNS = 'devil_horns',
  ANGEL_HALO = 'angel_halo',
  ANGEL_WINGS = 'angel_wings',
  DEVIL_TAIL = 'devil_tail',
}

/**
 * Background scenes for stickers
 */
export enum Scene {
  NONE = 'none',
  SOLID_COLOR = 'solid_color',
  GRADIENT = 'gradient',
  OFFICE = 'office',
  HOME = 'home',
  OUTDOORS = 'outdoors',
  BEACH = 'beach',
  PARTY = 'party',
  CAFE = 'cafe',
  GYM = 'gym',
  CITY = 'city',
  SPACE = 'space',
  HEARTS = 'hearts',
  CONFETTI = 'confetti',
  STARS = 'stars',

  // ============================================================================
  // PHASE 2.3 & 3 EXPANSION - Additional Scenes/Backgrounds
  // ============================================================================

  // Living Spaces
  BEDROOM = 'bedroom',
  LIVING_ROOM = 'living_room',
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  BALCONY = 'balcony',
  GARDEN = 'garden',
  BACKYARD = 'backyard',
  ROOFTOP = 'rooftop',
  BASEMENT = 'basement',
  GARAGE = 'garage',
  DORM_ROOM = 'dorm_room',
  STUDIO_APARTMENT = 'studio_apartment',

  // Work/School
  CLASSROOM = 'classroom',
  LIBRARY = 'library',
  CONFERENCE_ROOM = 'conference_room',
  CUBICLE = 'cubicle',
  COWORKING = 'coworking',
  WORKSHOP = 'workshop',
  LAB = 'lab',
  STUDIO_ART = 'studio_art',
  STUDIO_MUSIC = 'studio_music',
  RECEPTION = 'reception',
  BREAK_ROOM = 'break_room',

  // Outdoor Nature
  PARK = 'park',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  LAKE = 'lake',
  RIVER = 'river',
  WATERFALL = 'waterfall',
  DESERT = 'desert',
  JUNGLE = 'jungle',
  MEADOW = 'meadow',
  FARM = 'farm',
  VINEYARD = 'vineyard',
  GARDEN_BOTANICAL = 'garden_botanical',
  CHERRY_BLOSSOMS = 'cherry_blossoms',
  AUTUMN_LEAVES = 'autumn_leaves',
  SNOWY_LANDSCAPE = 'snowy_landscape',
  SUNRISE = 'sunrise',
  SUNSET = 'sunset',
  NIGHT_SKY = 'night_sky',
  NORTHERN_LIGHTS = 'northern_lights',
  UNDERWATER = 'underwater',
  CORAL_REEF = 'coral_reef',

  // Urban
  STREET = 'street',
  ALLEY = 'alley',
  SUBWAY = 'subway',
  TRAIN_STATION = 'train_station',
  AIRPORT = 'airport',
  PARKING_LOT = 'parking_lot',
  ROOFTOP_CITY = 'rooftop_city',
  SKYLINE = 'skyline',
  NEON_CITY = 'neon_city',
  TIMES_SQUARE = 'times_square',
  TOKYO_STREET = 'tokyo_street',
  EUROPEAN_STREET = 'european_street',
  GRAFFITI_WALL = 'graffiti_wall',
  BRICK_WALL = 'brick_wall',
  FIRE_ESCAPE = 'fire_escape',

  // Food/Entertainment
  RESTAURANT = 'restaurant',
  BAR = 'bar',
  NIGHTCLUB = 'nightclub',
  LOUNGE = 'lounge',
  COFFEE_SHOP = 'coffee_shop',
  BAKERY = 'bakery',
  ICE_CREAM_SHOP = 'ice_cream_shop',
  FOOD_TRUCK = 'food_truck',
  FAST_FOOD = 'fast_food',
  SUSHI_BAR = 'sushi_bar',
  PIZZA_PLACE = 'pizza_place',
  MOVIE_THEATER = 'movie_theater',
  CONCERT = 'concert',
  FESTIVAL = 'festival',
  CARNIVAL = 'carnival',
  AMUSEMENT_PARK = 'amusement_park',
  ARCADE = 'arcade',
  BOWLING_ALLEY = 'bowling_alley',
  KARAOKE = 'karaoke',

  // Sports/Fitness
  BASKETBALL_COURT = 'basketball_court',
  SOCCER_FIELD = 'soccer_field',
  TENNIS_COURT = 'tennis_court',
  SWIMMING_POOL = 'swimming_pool',
  TRACK_FIELD = 'track_field',
  YOGA_STUDIO = 'yoga_studio',
  BOXING_RING = 'boxing_ring',
  SKATE_PARK = 'skate_park',
  SKI_SLOPE = 'ski_slope',
  GOLF_COURSE = 'golf_course',
  STADIUM = 'stadium',

  // Travel/Landmarks
  EIFFEL_TOWER = 'eiffel_tower',
  STATUE_OF_LIBERTY = 'statue_of_liberty',
  BIG_BEN = 'big_ben',
  TAJ_MAHAL = 'taj_mahal',
  GREAT_WALL = 'great_wall',
  PYRAMIDS = 'pyramids',
  COLOSSEUM = 'colosseum',
  SYDNEY_OPERA = 'sydney_opera',
  HOTEL_LOBBY = 'hotel_lobby',
  HOTEL_ROOM = 'hotel_room',
  CRUISE_SHIP = 'cruise_ship',
  AIRPLANE = 'airplane',
  TRAIN = 'train',
  CAR = 'car',
  BOAT = 'boat',

  // Fantasy/Abstract
  CLOUDS = 'clouds',
  RAINBOW_SKY = 'rainbow_sky',
  GALAXY = 'galaxy',
  NEBULA = 'nebula',
  PLANET = 'planet',
  MOON_SURFACE = 'moon_surface',
  ALIEN_WORLD = 'alien_world',
  MAGICAL_FOREST = 'magical_forest',
  FAIRYTALE_CASTLE = 'fairytale_castle',
  CANDYLAND = 'candyland',
  ABSTRACT_SHAPES = 'abstract_shapes',
  GEOMETRIC = 'geometric',
  TRIPPY = 'trippy',
  GLITCH = 'glitch',
  VAPORWAVE = 'vaporwave',
  PIXEL_ART = 'pixel_art',
  COMIC_BOOK = 'comic_book',
  MANGA = 'manga',
  NEON = 'neon',
  HOLOGRAPHIC = 'holographic',
  METALLIC = 'metallic',
  SPARKLE_BG = 'sparkle_bg',
  FIRE_BG = 'fire_bg',
  WATER_BG = 'water_bg',
  LIGHTNING_BG = 'lightning_bg',

  // Seasonal/Holiday
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter',
  CHRISTMAS = 'christmas',
  HALLOWEEN = 'halloween',
  VALENTINES = 'valentines',
  EASTER = 'easter',
  NEW_YEAR = 'new_year',
  BIRTHDAY = 'birthday',
  GRADUATION = 'graduation',
  WEDDING = 'wedding',
  THANKSGIVING = 'thanksgiving',
  ST_PATRICKS = 'st_patricks',
  FOURTH_OF_JULY = 'fourth_of_july',
  DIWALI = 'diwali',
  HANUKKAH = 'hanukkah',
  LUNAR_NEW_YEAR = 'lunar_new_year',
  MARDI_GRAS = 'mardi_gras',

  // Pattern/Texture Backgrounds
  POLKA_DOTS = 'polka_dots',
  STRIPES = 'stripes',
  CHEVRON = 'chevron',
  PLAID = 'plaid',
  FLORAL = 'floral',
  TROPICAL = 'tropical',
  MARBLE = 'marble',
  WOOD_TEXTURE = 'wood_texture',
  BRICK = 'brick',
  CONCRETE = 'concrete',
  GLITTER_BG = 'glitter_bg',
  BOKEH = 'bokeh',
  BLUR_BG = 'blur_bg',
}

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Expression preset - combines eye, eyebrow, and mouth styles
 */
export interface ExpressionPreset {
  id: string;
  name: string;
  emotion: Emotion;
  eyeStyle: EyeStyle;
  eyebrowStyle: EyebrowStyle;
  mouthStyle: MouthStyle;
  /** Optional effects like blush, tears, sweat */
  effects?: StickerProp[];
}

/**
 * Full sticker definition
 */
export interface Sticker {
  id: string;
  name: string;
  category: StickerCategory;
  emotion: Emotion;
  pose: StickerPose;
  viewAngle?: ViewAngle;
  scene?: Scene;
  sceneColor?: string;
  props?: StickerProp[];
  textOverlay?: string;
  tags: string[];
  /** Whether this sticker is face-only or full body */
  isFaceOnly?: boolean;
}

/**
 * Sticker pack - collection of related stickers
 */
export interface StickerPack {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  stickers: Sticker[];
  category?: StickerCategory;
  isPremium?: boolean;
}

/**
 * Rendered sticker with avatar applied
 */
export interface RenderedSticker {
  sticker: Sticker;
  avatarConfig: AvatarConfig;
  /** Base64 PNG or SVG string */
  imageData?: string;
  width: number;
  height: number;
}

/**
 * Sticker search/filter options
 */
export interface StickerFilter {
  query?: string;
  category?: StickerCategory;
  emotion?: Emotion;
  pose?: StickerPose;
  tags?: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Category display info
 */
export const STICKER_CATEGORY_INFO: Record<StickerCategory, { label: string; icon: string }> = {
  [StickerCategory.GREETINGS]: { label: 'Greetings', icon: 'hand-wave' },
  [StickerCategory.REACTIONS]: { label: 'Reactions', icon: 'thumbs-up' },
  [StickerCategory.EMOTIONS]: { label: 'Emotions', icon: 'happy' },
  [StickerCategory.ACTIVITIES]: { label: 'Activities', icon: 'bicycle' },
  [StickerCategory.CELEBRATIONS]: { label: 'Celebrations', icon: 'balloon' },
  [StickerCategory.FOOD]: { label: 'Food', icon: 'pizza' },
  [StickerCategory.WEATHER]: { label: 'Weather', icon: 'partly-sunny' },
  [StickerCategory.LOVE]: { label: 'Love', icon: 'heart' },
  [StickerCategory.WORK]: { label: 'Work', icon: 'briefcase' },
  [StickerCategory.SPORTS]: { label: 'Sports', icon: 'football' },
  [StickerCategory.FUNNY]: { label: 'Funny', icon: 'happy' },
  [StickerCategory.SEASONAL]: { label: 'Seasonal', icon: 'leaf' },
};

/**
 * Emotion display info
 */
export const EMOTION_INFO: Record<Emotion, { label: string; emoji: string }> = {
  [Emotion.HAPPY]: { label: 'Happy', emoji: '😊' },
  [Emotion.EXCITED]: { label: 'Excited', emoji: '🤩' },
  [Emotion.LAUGHING]: { label: 'Laughing', emoji: '😂' },
  [Emotion.LOVE]: { label: 'Love', emoji: '😍' },
  [Emotion.COOL]: { label: 'Cool', emoji: '😎' },
  [Emotion.WINK]: { label: 'Wink', emoji: '😉' },
  [Emotion.SAD]: { label: 'Sad', emoji: '😢' },
  [Emotion.CRYING]: { label: 'Crying', emoji: '😭' },
  [Emotion.ANGRY]: { label: 'Angry', emoji: '😠' },
  [Emotion.ANNOYED]: { label: 'Annoyed', emoji: '😒' },
  [Emotion.SURPRISED]: { label: 'Surprised', emoji: '😲' },
  [Emotion.SHOCKED]: { label: 'Shocked', emoji: '😱' },
  [Emotion.CONFUSED]: { label: 'Confused', emoji: '😕' },
  [Emotion.THINKING]: { label: 'Thinking', emoji: '🤔' },
  [Emotion.SKEPTICAL]: { label: 'Skeptical', emoji: '🤨' },
  [Emotion.EMBARRASSED]: { label: 'Embarrassed', emoji: '😳' },
  [Emotion.NERVOUS]: { label: 'Nervous', emoji: '😬' },
  [Emotion.SLEEPY]: { label: 'Sleepy', emoji: '😴' },
  [Emotion.SICK]: { label: 'Sick', emoji: '🤒' },
  [Emotion.NEUTRAL]: { label: 'Neutral', emoji: '😐' },
};
