/**
 * Avatar Types - Complete type definitions for the SVG Avatar System
 *
 * This module provides comprehensive TypeScript types for building
 * customizable layered SVG avatars in React Native.
 */

// ============================================================================
// ENUMS - Feature Types
// ============================================================================

export enum HairStyle {
  // Short Hair Styles (25)
  SHORT_BUZZ = 'short_buzz',
  SHORT_CREW = 'short_crew',
  SHORT_SLICK = 'short_slick',
  SHORT_SPIKY = 'short_spiky',
  SHORT_CURLY = 'short_curly',
  SHORT_WAVY = 'short_wavy',
  SHORT_SIDE_PART = 'short_side_part',
  SHORT_POMPADOUR = 'short_pompadour',
  SHORT_TEXTURED_CROP = 'short_textured_crop',
  SHORT_FADE = 'short_fade',
  SHORT_TAPER_FADE = 'short_taper_fade',
  SHORT_UNDERCUT = 'short_undercut',
  SHORT_PIXIE = 'short_pixie',
  SHORT_PIXIE_TEXTURED = 'short_pixie_textured',
  SHORT_MILITARY = 'short_military',
  SHORT_CAESAR = 'short_caesar',
  SHORT_IVY_LEAGUE = 'short_ivy_league',
  SHORT_QUIFF = 'short_quiff',
  SHORT_FAUX_HAWK = 'short_faux_hawk',
  SHORT_COILS = 'short_coils',
  SHORT_TWIST_OUT = 'short_twist_out',
  SHORT_FINGER_WAVES = 'short_finger_waves',
  SHORT_SLICKED_BACK = 'short_slicked_back',
  SHORT_MESSY_FRINGE = 'short_messy_fringe',
  SHORT_FLAT_TOP = 'short_flat_top',

  // Medium Hair Styles (20)
  MEDIUM_MESSY = 'medium_messy',
  MEDIUM_STRAIGHT = 'medium_straight',
  MEDIUM_CURLY = 'medium_curly',
  MEDIUM_BOB = 'medium_bob',
  MEDIUM_BOB_ANGLED = 'medium_bob_angled',
  MEDIUM_BOB_LAYERED = 'medium_bob_layered',
  MEDIUM_BOB_BLUNT = 'medium_bob_blunt',
  MEDIUM_LOB = 'medium_lob',
  MEDIUM_SHAG = 'medium_shag',
  MEDIUM_WOLF_CUT = 'medium_wolf_cut',
  MEDIUM_LAYERS = 'medium_layers',
  MEDIUM_CURTAIN_BANGS = 'medium_curtain_bangs',
  MEDIUM_WAVY = 'medium_wavy',
  MEDIUM_CURLY_DEFINED = 'medium_curly_defined',
  MEDIUM_TWIST_OUT = 'medium_twist_out',
  MEDIUM_HALF_UP = 'medium_half_up',
  MEDIUM_SLICKED_BACK = 'medium_slicked_back',
  MEDIUM_SIDE_SWEPT = 'medium_side_swept',
  MEDIUM_FEATHERED = 'medium_feathered',
  MEDIUM_MULLET = 'medium_mullet',

  // Long Hair Styles (25)
  LONG_STRAIGHT = 'long_straight',
  LONG_WAVY = 'long_wavy',
  LONG_CURLY = 'long_curly',
  LONG_PONYTAIL = 'long_ponytail',
  LONG_PONYTAIL_HIGH = 'long_ponytail_high',
  LONG_PONYTAIL_LOW = 'long_ponytail_low',
  LONG_PONYTAIL_SIDE = 'long_ponytail_side',
  LONG_BUN = 'long_bun',
  LONG_BUN_MESSY = 'long_bun_messy',
  LONG_BUN_TOP = 'long_bun_top',
  LONG_CHIGNON = 'long_chignon',
  LONG_BRAIDS = 'long_braids',
  LONG_BRAID_SINGLE = 'long_braid_single',
  LONG_BRAIDS_PIGTAILS = 'long_braids_pigtails',
  LONG_LAYERS = 'long_layers',
  LONG_BEACH_WAVES = 'long_beach_waves',
  LONG_DEFINED_CURLS = 'long_defined_curls',
  LONG_HALF_UP = 'long_half_up',
  LONG_HALF_UP_BUN = 'long_half_up_bun',
  LONG_SIDE_SWEPT = 'long_side_swept',
  LONG_CENTER_PART = 'long_center_part',
  LONG_CURTAIN_BANGS = 'long_curtain_bangs',
  LONG_SPACE_BUNS = 'long_space_buns',
  LONG_PIGTAILS = 'long_pigtails',
  LONG_TWISTS = 'long_twists',

  // Protective & Cultural Styles (15)
  AFRO = 'afro',
  AFRO_PUFF = 'afro_puff',
  AFRO_PUFFS_DOUBLE = 'afro_puffs_double',
  LOCS = 'locs',
  LOCS_SHORT = 'locs_short',
  LOCS_UPDO = 'locs_updo',
  BOX_BRAIDS = 'box_braids',
  BOX_BRAIDS_UPDO = 'box_braids_updo',
  CORNROWS = 'cornrows',
  CORNROWS_INTRICATE = 'cornrows_intricate',
  BANTU_KNOTS = 'bantu_knots',
  TWIST_OUT_LONG = 'twist_out_long',
  FLAT_TWISTS = 'flat_twists',
  SILK_PRESS = 'silk_press',
  NATURAL_CURLS = 'natural_curls',

  // Special Styles (10)
  MOHAWK = 'mohawk',
  MOHAWK_SHORT = 'mohawk_short',
  BALD = 'bald',
  SHAVED = 'shaved',
  SHAVED_SIDES = 'shaved_sides',
  ASYMMETRIC = 'asymmetric',
  OMBRE_STRAIGHT = 'ombre_straight',
  OMBRE_WAVY = 'ombre_wavy',
  BANGS_STRAIGHT = 'bangs_straight',
  BANGS_SIDE = 'bangs_side',

  // Headwear & Coverings (10)
  HAT_BEANIE = 'hat_beanie',
  HAT_CAP = 'hat_cap',
  HAT_BUCKET = 'hat_bucket',
  HAT_FEDORA = 'hat_fedora',
  HEADBAND = 'headband',
  HEADBAND_WIDE = 'headband_wide',
  HIJAB = 'hijab',
  TURBAN = 'turban',
  DURAG = 'durag',
  BANDANA = 'bandana',

}

export enum EyeStyle {
  DEFAULT = 'default',
  ROUND = 'round',
  NARROW = 'narrow',
  WIDE = 'wide',
  ALMOND = 'almond',
  CLOSED = 'closed',
  HAPPY = 'happy',
  WINK = 'wink',
  WINK_LEFT = 'wink_left',
  SLEEPY = 'sleepy',
  SURPRISED = 'surprised',
  HEARTS = 'hearts',
  STARS = 'stars',
  CRY = 'cry',
  SQUINT = 'squint',
  SIDE = 'side',
  DIZZY = 'dizzy',
  ROLL = 'roll',
}

// Eyelash styles for eye enhancements
export enum EyelashStyle {
  NONE = 'none',
  NATURAL = 'natural',
  LIGHT = 'light',
  MEDIUM = 'medium',
  FULL = 'full',
  DRAMATIC = 'dramatic',
  WISPY = 'wispy',
  CAT_EYE = 'cat_eye',
  DOLL = 'doll',
}

export enum EyebrowStyle {
  DEFAULT = 'default',
  NATURAL = 'natural',
  THICK = 'thick',
  THIN = 'thin',
  ARCHED = 'arched',
  FLAT = 'flat',
  ANGRY = 'angry',
  SAD = 'sad',
  RAISED = 'raised',
  UNIBROW = 'unibrow',
  CONCERNED = 'concerned',
  SKEPTICAL = 'skeptical',
}

export enum NoseStyle {
  DEFAULT = 'default',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  POINTED = 'pointed',
  ROUNDED = 'rounded',
  BUTTON = 'button',
  HOOKED = 'hooked',
  FLAT = 'flat',
  WIDE = 'wide',
  NARROW = 'narrow',
}

export enum MouthStyle {
  DEFAULT = 'default',
  SMILE = 'smile',
  BIG_SMILE = 'big_smile',
  GRIN = 'grin',
  LAUGH = 'laugh',
  SMIRK = 'smirk',
  SAD = 'sad',
  FROWN = 'frown',
  SERIOUS = 'serious',
  OPEN = 'open',
  TONGUE = 'tongue',
  KISS = 'kiss',
  SURPRISED = 'surprised',
  EATING = 'eating',
  GRIMACE = 'grimace',
  CONCERNED = 'concerned',
  SCREAM = 'scream',
  BITE = 'bite',
}

export enum FaceShape {
  // Classic Shapes
  OVAL = 'oval',
  ROUND = 'round',
  SQUARE = 'square',
  HEART = 'heart',
  OBLONG = 'oblong',
  DIAMOND = 'diamond',
  TRIANGLE = 'triangle',
  INVERTED_TRIANGLE = 'inverted_triangle',
  RECTANGLE = 'rectangle',
  PEAR = 'pear',
  LONG = 'long',
  WIDE = 'wide',
  ANGULAR = 'angular',
  SOFT_SQUARE = 'soft_square',
  NARROW = 'narrow',
  // New Shapes (Phase 1.4)
  BABY_FACE = 'baby_face',
  MATURE = 'mature',
  HIGH_CHEEKBONES = 'high_cheekbones',
  FULL_CHEEKS = 'full_cheeks',
  HOLLOW_CHEEKS = 'hollow_cheeks',
  STRONG_JAW = 'strong_jaw',
  STRONG_JAW_WIDE = 'strong_jaw_wide',
  SOFT_FEATURES = 'soft_features',
  DEFINED_FEATURES = 'defined_features',
  CHISELED = 'chiseled',
}

export enum FacialHairStyle {
  NONE = 'none',
  STUBBLE = 'stubble',
  LIGHT_BEARD = 'light_beard',
  MEDIUM_BEARD = 'medium_beard',
  FULL_BEARD = 'full_beard',
  GOATEE = 'goatee',
  MUSTACHE = 'mustache',
  MUSTACHE_FANCY = 'mustache_fancy',
  SIDEBURNS = 'sideburns',
}

// Hair Treatment System - for multi-color hair effects
export enum HairTreatment {
  NONE = 'none',
  // Ombré styles
  OMBRE_SUBTLE = 'ombre_subtle',
  OMBRE_DRAMATIC = 'ombre_dramatic',
  OMBRE_REVERSE = 'ombre_reverse',
  // Highlights
  HIGHLIGHTS_BABYLIGHTS = 'highlights_babylights',
  HIGHLIGHTS_BALAYAGE = 'highlights_balayage',
  HIGHLIGHTS_CHUNKY = 'highlights_chunky',
  HIGHLIGHTS_FACE_FRAMING = 'highlights_face_framing',
  // Tips
  TIPS_COLORED = 'tips_colored',
  TIPS_FROSTED = 'tips_frosted',
  // Roots
  ROOTS_GROWN_OUT = 'roots_grown_out',
  ROOTS_DARK = 'roots_dark',
  // Streaks
  STREAK_SINGLE = 'streak_single',
  STREAKS_MULTIPLE = 'streaks_multiple',
  STREAK_SKUNK = 'streak_skunk',
  // Two-tone
  TWO_TONE_SPLIT = 'two_tone_split',
  TWO_TONE_UNDER = 'two_tone_under',
  // Special
  RAINBOW_TIPS = 'rainbow_tips',
  PEEKABOO = 'peekaboo',
}

// Face Details System
export enum FreckleStyle {
  NONE = 'none',
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  NOSE_ONLY = 'nose_only',
  CHEEKS_ONLY = 'cheeks_only',
}

export enum WrinkleStyle {
  NONE = 'none',
  FOREHEAD_LIGHT = 'forehead_light',
  FOREHEAD = 'forehead',
  FOREHEAD_DEEP = 'forehead_deep',
  CROW_FEET = 'crow_feet',
  CROW_FEET_DEEP = 'crow_feet_deep',
  SMILE_LINES = 'smile_lines',
  SMILE_LINES_DEEP = 'smile_lines_deep',
  UNDER_EYE = 'under_eye',
  UNDER_EYE_DEEP = 'under_eye_deep',
  FULL_LIGHT = 'full_light',
  FULL = 'full',
  FULL_HEAVY = 'full_heavy',
  MATURE = 'mature',
}

// Eye bags for age variations
export enum EyeBagsStyle {
  NONE = 'none',
  LIGHT = 'light',
  MODERATE = 'moderate',
  HEAVY = 'heavy',
  DARK_CIRCLES = 'dark_circles',
  PUFFY = 'puffy',
}

// Gray hair percentage for age variations
export enum GrayHairAmount {
  NONE = 'none',
  TOUCH = 'touch',           // 5-10% gray
  LIGHT = 'light',           // 20-30% gray
  MODERATE = 'moderate',      // 40-50% gray
  SALT_PEPPER = 'salt_pepper', // 50-60% gray
  MOSTLY_GRAY = 'mostly_gray', // 70-80% gray
  FULL_GRAY = 'full_gray',    // 90-100% gray
  WHITE = 'white',            // Pure white
}

export enum CheekStyle {
  NONE = 'none',
  DIMPLES = 'dimples',
  HIGH_CHEEKBONES = 'high_cheekbones',
  ROUND = 'round',
  HOLLOW = 'hollow',
}

export enum SkinDetail {
  NONE = 'none',
  MOLE_LEFT_CHEEK = 'mole_left_cheek',
  MOLE_RIGHT_CHEEK = 'mole_right_cheek',
  MOLE_CHIN = 'mole_chin',
  BEAUTY_MARK = 'beauty_mark',
  SCAR_EYEBROW = 'scar_eyebrow',
  SCAR_CHEEK = 'scar_cheek',

  // ============================================================================
  // PHASE 1.4 EXPANSION - Additional Skin Details
  // ============================================================================
  // More Moles/Beauty Marks
  MOLE_LIP = 'mole_lip',
  MOLE_NOSE = 'mole_nose',
  MOLE_FOREHEAD = 'mole_forehead',
  MOLE_TEMPLE = 'mole_temple',
  MOLE_NECK = 'mole_neck',
  BEAUTY_MARKS_MULTIPLE = 'beauty_marks_multiple',

  // More Scars
  SCAR_FOREHEAD = 'scar_forehead',
  SCAR_CHIN = 'scar_chin',
  SCAR_LIP = 'scar_lip',
  SCAR_NOSE = 'scar_nose',
  SCAR_TEMPLE = 'scar_temple',
  SCAR_NECK = 'scar_neck',
  SCAR_LIGHTNING = 'scar_lightning',
  SCAR_SURGICAL = 'scar_surgical',
  SCAR_BURNS = 'scar_burns',
  SCAR_ACNE = 'scar_acne',

  // Birthmarks
  BIRTHMARK_CHEEK = 'birthmark_cheek',
  BIRTHMARK_FOREHEAD = 'birthmark_forehead',
  BIRTHMARK_CHIN = 'birthmark_chin',
  BIRTHMARK_NECK = 'birthmark_neck',
  BIRTHMARK_TEMPLE = 'birthmark_temple',
  BIRTHMARK_PORT_WINE = 'birthmark_port_wine',
  BIRTHMARK_CAFE_AU_LAIT = 'birthmark_cafe_au_lait',

  // Skin Conditions
  VITILIGO_FACE = 'vitiligo_face',
  VITILIGO_PATCHES = 'vitiligo_patches',
  ROSACEA = 'rosacea',
  ACNE_LIGHT = 'acne_light',
  ACNE_MODERATE = 'acne_moderate',
}

// ============================================================================
// PHASE 1.4 EXPANSION - Face Tattoo System
// ============================================================================
export enum FaceTattooStyle {
  NONE = 'none',
  // Tear drops
  TEARDROP_SINGLE = 'teardrop_single',
  TEARDROP_MULTIPLE = 'teardrop_multiple',
  // Face symbols
  CROSS_UNDER_EYE = 'cross_under_eye',
  STAR_FACE = 'star_face',
  HEART_CHEEK = 'heart_cheek',
  SPIDER_WEB = 'spider_web',
  ROSE_FACE = 'rose_face',
  BUTTERFLY_FACE = 'butterfly_face',
  SNAKE_FACE = 'snake_face',
  FLAMES_FACE = 'flames_face',
  TRIBAL_FACE = 'tribal_face',
  // Modern/rapper style
  NUMBER_FACE = 'number_face',
  WORD_FACE = 'word_face',
  BARCODE_FACE = 'barcode_face',
  SOUNDWAVE_FACE = 'soundwave_face',
  MONEY_SIGN = 'money_sign',
  LIGHTNING_BOLT_FACE = 'lightning_bolt_face',
  // Traditional
  MAORI_MOKO = 'maori_moko',
  POLYNESIAN_FACE = 'polynesian_face',
  DOTWORK_FACE = 'dotwork_face',
  GEOMETRIC_FACE = 'geometric_face',
  // Locations
  FOREHEAD_TATTOO = 'forehead_tattoo',
  TEMPLE_TATTOO = 'temple_tattoo',
  NECK_FRONT = 'neck_front',
  NECK_SIDE = 'neck_side',
  BEHIND_EAR = 'behind_ear',
}

// ============================================================================
// PHASE 1.4 EXPANSION - Teeth Customization
// ============================================================================
export enum TeethStyle {
  DEFAULT = 'default',
  // Natural variations
  PERFECT = 'perfect',
  SLIGHTLY_CROOKED = 'slightly_crooked',
  GAP_FRONT = 'gap_front',
  GAP_MULTIPLE = 'gap_multiple',
  OVERBITE = 'overbite',
  UNDERBITE = 'underbite',
  BUCK_TEETH = 'buck_teeth',
  SMALL = 'small',
  LARGE = 'large',
  // Missing teeth
  MISSING_FRONT = 'missing_front',
  MISSING_SIDE = 'missing_side',
  MISSING_MULTIPLE = 'missing_multiple',
  BABY_TEETH_MISSING = 'baby_teeth_missing',
  // Dental work
  BRACES_METAL = 'braces_metal',
  BRACES_CERAMIC = 'braces_ceramic',
  BRACES_LINGUAL = 'braces_lingual',
  INVISALIGN = 'invisalign',
  RETAINER = 'retainer',
  GOLD_TOOTH = 'gold_tooth',
  GOLD_TEETH_MULTIPLE = 'gold_teeth_multiple',
  GRILLZ = 'grillz',
  GRILLZ_DIAMOND = 'grillz_diamond',
  GRILLZ_COLORFUL = 'grillz_colorful',
  SILVER_TOOTH = 'silver_tooth',
  FANGS = 'fangs',
  VAMPIRE_FANGS = 'vampire_fangs',
  // Age/condition
  YELLOWED = 'yellowed',
  STAINED = 'stained',
  CHIPPED = 'chipped',
  WORN = 'worn',
  DENTURES = 'dentures',
}

// Grillz/Dental jewelry colors
export const DENTAL_COLORS: ColorOption[] = [
  { name: 'Gold', hex: '#ffd700' },
  { name: 'White Gold', hex: '#f5f5f5' },
  { name: 'Rose Gold', hex: '#b76e79' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Platinum', hex: '#e5e4e2' },
  { name: 'Diamond', hex: '#b9f2ff' },
  { name: 'Ruby', hex: '#e0115f' },
  { name: 'Emerald', hex: '#50c878' },
  { name: 'Sapphire', hex: '#0f52ba' },
  { name: 'Rainbow', hex: '#ff6b6b' },
];

// Makeup System
export enum EyeshadowStyle {
  NONE = 'none',
  NATURAL = 'natural',
  SMOKY = 'smoky',
  CUT_CREASE = 'cut_crease',
  WING = 'wing',
  SHIMMER = 'shimmer',
  GLITTER = 'glitter',
}

export enum EyelinerStyle {
  NONE = 'none',
  THIN = 'thin',
  WING = 'wing',
  CAT_EYE = 'cat_eye',
  THICK = 'thick',
  SMUDGED = 'smudged',
  GRAPHIC = 'graphic',
}

export enum LipstickStyle {
  NONE = 'none',
  NATURAL = 'natural',
  MATTE = 'matte',
  GLOSSY = 'glossy',
  OMBRE = 'ombre',
  BOLD = 'bold',
  STAINED = 'stained',
}

export enum BlushStyle {
  NONE = 'none',
  SUBTLE = 'subtle',
  ROSY = 'rosy',
  SUN_KISSED = 'sun_kissed',
  CONTOUR = 'contour',
  DRAPING = 'draping',
}

export enum AccessoryStyle {
  NONE = 'none',
  // Glasses
  GLASSES_ROUND = 'glasses_round',
  GLASSES_SQUARE = 'glasses_square',
  GLASSES_PRESCRIPTION = 'glasses_prescription',
  GLASSES_CAT_EYE = 'glasses_cat_eye',
  GLASSES_OVAL = 'glasses_oval',
  GLASSES_RECTANGLE = 'glasses_rectangle',
  GLASSES_BROWLINE = 'glasses_browline',
  // Sunglasses
  SUNGLASSES = 'sunglasses',
  SUNGLASSES_AVIATOR = 'sunglasses_aviator',
  SUNGLASSES_WAYFARER = 'sunglasses_wayfarer',
  SUNGLASSES_ROUND = 'sunglasses_round',
  SUNGLASSES_OVERSIZED = 'sunglasses_oversized',
  SUNGLASSES_SPORT = 'sunglasses_sport',
  // Special eyewear
  MONOCLE = 'monocle',
  EYEPATCH = 'eyepatch',
  // Earrings
  EARRING_SMALL = 'earring_small',
  EARRING_HOOP = 'earring_hoop',
  EARRING_HOOP_LARGE = 'earring_hoop_large',
  EARRING_DANGLE = 'earring_dangle',
  EARRING_STUD = 'earring_stud',
  EARRING_MULTIPLE = 'earring_multiple',
  // Piercings
  NOSE_RING = 'nose_ring',
  NOSE_STUD = 'nose_stud',
  SEPTUM = 'septum',
  LIP_RING = 'lip_ring',
  EYEBROW_PIERCING = 'eyebrow_piercing',
  // Necklaces
  NECKLACE_CHAIN = 'necklace_chain',
  NECKLACE_PENDANT = 'necklace_pendant',
  NECKLACE_CHOKER = 'necklace_choker',
  NECKLACE_PEARLS = 'necklace_pearls',
  // Headwear/Sports Accessories
  HEADBAND = 'headband',
  HEADBAND_ATHLETIC = 'headband_athletic',
  SWEATBAND = 'sweatband',
  // Other
  HEADPHONES = 'headphones',
  HEADPHONES_OVER_EAR = 'headphones_over_ear',
  EARBUDS = 'earbuds',

}

export enum ClothingStyle {
  // T-Shirts
  TSHIRT = 'tshirt',
  TSHIRT_CREW = 'tshirt_crew',
  TSHIRT_GRAPHIC = 'tshirt_graphic',
  TSHIRT_STRIPED = 'tshirt_striped',
  VNECK = 'vneck',
  SCOOP_NECK = 'scoop_neck',
  // Casual
  POLO = 'polo',
  HENLEY = 'henley',
  TANK_TOP = 'tank_top',
  TANK_ATHLETIC = 'tank_athletic',
  CROP_TOP = 'crop_top',
  // Shirts
  COLLAR_SHIRT = 'collar_shirt',
  BUTTON_UP = 'button_up',
  BUTTON_UP_OPEN = 'button_up_open',
  FLANNEL = 'flannel',
  HAWAIIAN = 'hawaiian',
  DENIM_SHIRT = 'denim_shirt',
  // Sweaters & Hoodies
  SWEATER = 'sweater',
  SWEATER_CABLE = 'sweater_cable',
  CARDIGAN = 'cardigan',
  TURTLENECK = 'turtleneck',
  HOODIE = 'hoodie',
  HOODIE_ZIP = 'hoodie_zip',
  SWEATSHIRT = 'sweatshirt',
  // Formal
  BLAZER = 'blazer',
  SUIT_JACKET = 'suit_jacket',
  VEST = 'vest',
  BLOUSE = 'blouse',
  DRESS_SHIRT = 'dress_shirt',
  // Outerwear
  JACKET_DENIM = 'jacket_denim',
  JACKET_LEATHER = 'jacket_leather',
  JACKET_BOMBER = 'jacket_bomber',
  JACKET_VARSITY = 'jacket_varsity',
  COAT = 'coat',
  // Athletic
  JERSEY = 'jersey',
  SPORTS_BRA = 'sports_bra',
  ATHLETIC_TOP = 'athletic_top',
  // Dresses
  DRESS_CASUAL = 'dress_casual',
  DRESS_FORMAL = 'dress_formal',
  // Special
  OVERALL = 'overall',
  OVERALLS = 'overalls',
  SUSPENDERS = 'suspenders',

}

// ============================================================================
// FULL BODY SYSTEM - Phase 1 & 2
// ============================================================================

export enum BodyType {
  SLIM = 'slim',
  AVERAGE = 'average',
  ATHLETIC = 'athletic',
  CURVY = 'curvy',
  PLUS_SIZE = 'plus_size',
  MUSCULAR = 'muscular',
}

export enum ArmPose {
  DOWN = 'down',
  HIPS = 'hips',
  CROSSED = 'crossed',
  WAVE = 'wave',
  PEACE = 'peace',
  THUMBS_UP = 'thumbs_up',
  POINTING = 'pointing',
  HANDS_IN_POCKETS = 'hands_in_pockets',
  ARMS_BEHIND_BACK = 'arms_behind_back',
  ONE_HAND_HIP = 'one_hand_hip',
  ARMS_UP = 'arms_up',
  ARMS_OUT = 'arms_out',
  SHRUG = 'shrug',
  FLEXING = 'flexing',
  PRAYING = 'praying',
  FIST_PUMP = 'fist_pump',
  HEART_HANDS = 'heart_hands',
  SELFIE = 'selfie',
}

export enum LegPose {
  STANDING = 'standing',
  CROSSED = 'crossed',
  WIDE = 'wide',
  SITTING = 'sitting',
  STANDING_RELAXED = 'standing_relaxed',
  STANDING_WEIGHT_SHIFT = 'standing_weight_shift',
  WALKING = 'walking',
  KNEELING = 'kneeling',
}

export enum HandGesture {
  OPEN = 'open',
  FIST = 'fist',
  PEACE = 'peace',
  POINT = 'point',
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
  WAVE = 'wave',
  OK = 'ok',
  ROCK_ON_GESTURE = 'rock_on_gesture',
  HOLDING = 'holding',
  FINGER_GUN = 'finger_gun',
  RELAXED = 'relaxed',
}

export enum BottomStyle {
  NONE = 'none',
  // Pants
  JEANS = 'jeans',
  JEANS_SKINNY = 'jeans_skinny',
  CHINOS = 'chinos',
  DRESS_PANTS = 'dress_pants',
  JOGGERS = 'joggers',
  SWEATPANTS = 'sweatpants',
  CARGO = 'cargo',
  // Shorts
  SHORTS = 'shorts',
  SHORTS_ATHLETIC = 'shorts_athletic',
  // Skirts
  SKIRT_MINI = 'skirt_mini',
  SKIRT_MIDI = 'skirt_midi',
  // Other
  LEGGINGS = 'leggings',
  JUMPSUIT = 'jumpsuit',
}

export enum ShoeStyle {
  NONE = 'none',
  BAREFOOT = 'barefoot',
  // Casual
  SNEAKERS = 'sneakers',
  SNEAKERS_HIGH = 'sneakers_high',
  CONVERSE = 'converse',
  LOAFERS = 'loafers',
  // Athletic
  RUNNING = 'running',
  SANDALS = 'sandals',
  // Formal
  OXFORDS = 'oxfords',
  HEELS = 'heels',
  FLATS = 'flats',
  // Boots
  BOOTS_ANKLE = 'boots_ankle',
  BOOTS_COMBAT = 'boots_combat',
  BOOTS_COWBOY = 'boots_cowboy',
  // Other
  SOCKS_ONLY = 'socks_only',
  FLIP_FLOPS = 'flip_flops',
  CROCS = 'crocs',
  SLIPPERS = 'slippers',
}

// Shoe colors
export const SHOE_COLORS: ColorOption[] = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Brown', hex: '#6b4423' },
  { name: 'Tan', hex: '#c9a86c' },
  { name: 'Navy', hex: '#1a237e' },
  { name: 'Red', hex: '#c62828' },
  { name: 'Pink', hex: '#d81b60' },
  { name: 'Gray', hex: '#757575' },
];

export const TATTOO_COLORS: ColorOption[] = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Dark Gray', hex: '#3d3d3d' },
  { name: 'Navy', hex: '#1a237e' },
  { name: 'Dark Green', hex: '#1b5e20' },
  { name: 'Dark Red', hex: '#8b0000' },
  { name: 'Burgundy', hex: '#722f37' },
  { name: 'Brown', hex: '#4e342e' },
  { name: 'Blue', hex: '#1565c0' },
  { name: 'Purple', hex: '#6a1b9a' },
  { name: 'Red', hex: '#c62828' },
  { name: 'Green', hex: '#2e7d32' },
  { name: 'Orange', hex: '#e65100' },
];

export const BACKGROUND_COLORS: ColorOption[] = [
  // Neutrals
  { name: 'White', hex: '#ffffff' },
  { name: 'Light Gray', hex: '#f5f5f5' },
  { name: 'Gray', hex: '#e0e0e0' },
  { name: 'Dark Gray', hex: '#9e9e9e' },
  { name: 'Charcoal', hex: '#424242' },
  { name: 'Black', hex: '#212121' },
  // Pastels
  { name: 'Blush Pink', hex: '#fce4ec' },
  { name: 'Lavender', hex: '#e8eaf6' },
  { name: 'Mint', hex: '#e0f2f1' },
  { name: 'Peach', hex: '#fff3e0' },
  { name: 'Sky Blue', hex: '#e3f2fd' },
  { name: 'Lemon', hex: '#fffde7' },
  // Vibrant
  { name: 'Pink', hex: '#f48fb1' },
  { name: 'Purple', hex: '#ce93d8' },
  { name: 'Blue', hex: '#64b5f6' },
  { name: 'Teal', hex: '#4db6ac' },
  { name: 'Green', hex: '#81c784' },
  { name: 'Yellow', hex: '#fff176' },
  { name: 'Orange', hex: '#ffb74d' },
  { name: 'Red', hex: '#e57373' },
  // Gradients (represented as single colors, could be extended)
  { name: 'Sunset', hex: '#ff7043' },
  { name: 'Ocean', hex: '#00bcd4' },
  { name: 'Forest', hex: '#2e7d32' },
  { name: 'Berry', hex: '#7b1fa2' },
];

// ============================================================================
// COLOR TYPES
// ============================================================================

export interface SkinTone {
  name: string;
  hex: string;
  shadow: string;
  highlight: string;
}

export interface HairColor {
  name: string;
  hex: string;
  highlight?: string;
}

export interface EyeColor {
  name: string;
  hex: string;
  pupil?: string;
}

export interface ColorOption {
  name: string;
  hex: string;
}

// ============================================================================
// PREDEFINED COLOR PALETTES
// ============================================================================

export const SKIN_TONES: SkinTone[] = [
  // Very Light / Cool Undertones
  { name: 'Porcelain', hex: '#ffe4c4', shadow: '#e6c9a8', highlight: '#fff5eb' },
  { name: 'Porcelain Pink', hex: '#fde0d9', shadow: '#e4c5be', highlight: '#fff2ee' },
  { name: 'Porcelain Neutral', hex: '#fce4d8', shadow: '#e3c9bc', highlight: '#fff6f0' },
  { name: 'Fair', hex: '#ffdbb4', shadow: '#e6c49c', highlight: '#fff0d9' },
  { name: 'Fair Rose', hex: '#fcd5c5', shadow: '#e3baaa', highlight: '#ffebe0' },
  { name: 'Fair Peach', hex: '#fdd9bc', shadow: '#e4bea1', highlight: '#ffefd7' },

  // Light / Warm Undertones
  { name: 'Light', hex: '#f5d7c3', shadow: '#dbbfa8', highlight: '#fff1e8' },
  { name: 'Light Beige', hex: '#f3d3b8', shadow: '#d9b99d', highlight: '#ffeddc' },
  { name: 'Light Golden', hex: '#f5d5a8', shadow: '#dcbc8d', highlight: '#ffefca' },
  { name: 'Cream', hex: '#f7dcc4', shadow: '#dec1a9', highlight: '#fff6e6' },
  { name: 'Warm Ivory', hex: '#eac086', shadow: '#d1a770', highlight: '#f8d9a0' },
  { name: 'Ivory', hex: '#f0d5be', shadow: '#d7baa3', highlight: '#ffefdd' },

  // Light-Medium
  { name: 'Sand', hex: '#e8c8a0', shadow: '#cfad85', highlight: '#fee2ba' },
  { name: 'Warm Beige', hex: '#e5c4a1', shadow: '#cca986', highlight: '#fedebb' },
  { name: 'Almond', hex: '#ddb896', shadow: '#c49d7b', highlight: '#f7d2b0' },
  { name: 'Natural', hex: '#dab590', shadow: '#c19a75', highlight: '#f4cfaa' },

  // Medium / Neutral Undertones
  { name: 'Tan', hex: '#d4a574', shadow: '#ba8d5c', highlight: '#e8bf8e' },
  { name: 'Warm Tan', hex: '#d0a070', shadow: '#b78855', highlight: '#e4ba8a' },
  { name: 'Golden Tan', hex: '#cfa067', shadow: '#b6874c', highlight: '#e9ba81' },
  { name: 'Honey', hex: '#c99d77', shadow: '#b08560', highlight: '#ddb791' },
  { name: 'Bronze', hex: '#c69765', shadow: '#ad7e4a', highlight: '#e0b17f' },
  { name: 'Sienna', hex: '#c08b5a', shadow: '#a7723f', highlight: '#daa574' },

  // Medium-Dark / Warm Undertones
  { name: 'Olive', hex: '#b08d63', shadow: '#97754c', highlight: '#c9a77d' },
  { name: 'Warm Olive', hex: '#a88858', shadow: '#8f6f3d', highlight: '#c2a272' },
  { name: 'Toffee', hex: '#a68360', shadow: '#8d6a47', highlight: '#c09d7a' },
  { name: 'Caramel', hex: '#a67c52', shadow: '#8d643a', highlight: '#c0966c' },
  { name: 'Cinnamon', hex: '#9e744a', shadow: '#855b31', highlight: '#b88e64' },
  { name: 'Amber', hex: '#a07550', shadow: '#875c37', highlight: '#ba8f6a' },

  // Dark / Rich Undertones
  { name: 'Brown', hex: '#8d5524', shadow: '#743f12', highlight: '#a76f3e' },
  { name: 'Warm Brown', hex: '#8a5020', shadow: '#713a0e', highlight: '#a46a3a' },
  { name: 'Cocoa', hex: '#7d4a22', shadow: '#643410', highlight: '#97643c' },
  { name: 'Chestnut', hex: '#6b4423', shadow: '#52310f', highlight: '#855e3d' },
  { name: 'Mahogany', hex: '#6a3d1f', shadow: '#51280d', highlight: '#845739' },
  { name: 'Walnut', hex: '#5f3820', shadow: '#46230e', highlight: '#79523a' },

  // Deep / Cool & Neutral Undertones
  { name: 'Espresso', hex: '#4a2c2a', shadow: '#311815', highlight: '#644644' },
  { name: 'Deep Brown', hex: '#4d2d24', shadow: '#341812', highlight: '#67473e' },
  { name: 'Rich Espresso', hex: '#452820', shadow: '#2c130e', highlight: '#5f423a' },
  { name: 'Deep', hex: '#3d2314', shadow: '#241205', highlight: '#57372e' },
  { name: 'Ebony', hex: '#3a2014', shadow: '#210b04', highlight: '#543a2e' },
  { name: 'Deep Ebony', hex: '#352018', shadow: '#1c0b06', highlight: '#4f3a32' },
];

export const HAIR_COLORS: HairColor[] = [
  // Natural Blacks & Dark Browns
  { name: 'Black', hex: '#090806', highlight: '#2a2826' },
  { name: 'Jet Black', hex: '#0a0908', highlight: '#252320' },
  { name: 'Blue Black', hex: '#0d0e18', highlight: '#282938' },
  { name: 'Soft Black', hex: '#1a1814', highlight: '#3a3834' },
  { name: 'Dark Brown', hex: '#2c1810', highlight: '#4d3930' },
  { name: 'Espresso', hex: '#241a12', highlight: '#453b32' },
  { name: 'Chocolate', hex: '#3b2219', highlight: '#5c4339' },

  // Medium Browns
  { name: 'Brown', hex: '#4e3328', highlight: '#6f5448' },
  { name: 'Chestnut', hex: '#5d3a28', highlight: '#7e5b48' },
  { name: 'Warm Brown', hex: '#5c3d2e', highlight: '#7d5e4e' },
  { name: 'Milk Chocolate', hex: '#4a3525', highlight: '#6b5645' },
  { name: 'Medium Brown', hex: '#5a4030', highlight: '#7b6150' },
  { name: 'Mocha', hex: '#4d3c32', highlight: '#6e5d52' },

  // Auburn & Red-Brown
  { name: 'Auburn', hex: '#5a2d23', highlight: '#7b4e43' },
  { name: 'Light Auburn', hex: '#7a3d2f', highlight: '#9b5e4f' },
  { name: 'Dark Auburn', hex: '#4a2018', highlight: '#6b4138' },
  { name: 'Copper', hex: '#8b4726', highlight: '#ac6846' },
  { name: 'Russet', hex: '#7c3b28', highlight: '#9d5c48' },

  // Reds & Gingers
  { name: 'Red', hex: '#8d3121', highlight: '#ae5241' },
  { name: 'Bright Red', hex: '#a62a20', highlight: '#c74b40' },
  { name: 'Deep Red', hex: '#6b2018', highlight: '#8c4138' },
  { name: 'Ginger', hex: '#b15a40', highlight: '#d27b60' },
  { name: 'Light Ginger', hex: '#c66d4d', highlight: '#e78e6d' },
  { name: 'Strawberry', hex: '#c47a58', highlight: '#e59b78' },
  { name: 'Strawberry Blonde', hex: '#d4956a', highlight: '#f5b68a' },

  // Blondes
  { name: 'Dark Blonde', hex: '#a0824d', highlight: '#c1a36d' },
  { name: 'Honey Blonde', hex: '#b89c65', highlight: '#d9bd85' },
  { name: 'Blonde', hex: '#c9a86c', highlight: '#e0c98c' },
  { name: 'Golden Blonde', hex: '#d4b068', highlight: '#f5d188' },
  { name: 'Light Blonde', hex: '#dfc483', highlight: '#ffe5a3' },
  { name: 'Ash Blonde', hex: '#c4b89a', highlight: '#e5d9ba' },
  { name: 'Sandy Blonde', hex: '#d9c288', highlight: '#fae3a8' },
  { name: 'Platinum', hex: '#e8d5b7', highlight: '#f5ead7' },
  { name: 'Champagne', hex: '#e5d4c0', highlight: '#fff5e0' },

  // Grays & Silvers
  { name: 'Dark Gray', hex: '#555555', highlight: '#757575' },
  { name: 'Gray', hex: '#7a7a7a', highlight: '#9a9a9a' },
  { name: 'Light Gray', hex: '#9a9a9a', highlight: '#bababa' },
  { name: 'Silver', hex: '#c0c0c0', highlight: '#e0e0e0' },
  { name: 'Steel Gray', hex: '#8a9aa0', highlight: '#aabac0' },
  { name: 'Salt & Pepper', hex: '#6a6a70', highlight: '#8a8a90' },
  { name: 'White', hex: '#e8e8e8', highlight: '#ffffff' },

  // Fashion Colors - Blues
  { name: 'Navy Blue', hex: '#1a2a4a', highlight: '#3a4a6a' },
  { name: 'Blue', hex: '#3c5a99', highlight: '#5c7ab9' },
  { name: 'Royal Blue', hex: '#4169e1', highlight: '#6189ff' },
  { name: 'Sky Blue', hex: '#6fa8dc', highlight: '#8fc8fc' },
  { name: 'Pastel Blue', hex: '#a4c8e8', highlight: '#c4e8ff' },

  // Fashion Colors - Pinks & Purples
  { name: 'Pink', hex: '#d35d8a', highlight: '#f37daa' },
  { name: 'Hot Pink', hex: '#e6478a', highlight: '#ff67aa' },
  { name: 'Rose Pink', hex: '#c77c8e', highlight: '#e79cae' },
  { name: 'Pastel Pink', hex: '#f0b8c8', highlight: '#ffd8e8' },
  { name: 'Rose Gold', hex: '#c9a0a0', highlight: '#e9c0c0' },
  { name: 'Purple', hex: '#7b5d99', highlight: '#9b7db9' },
  { name: 'Violet', hex: '#8a5cc0', highlight: '#aa7ce0' },
  { name: 'Lavender', hex: '#b095c8', highlight: '#d0b5e8' },
  { name: 'Lilac', hex: '#c8a4d4', highlight: '#e8c4f4' },

  // Fashion Colors - Greens & Teals
  { name: 'Green', hex: '#4a8c5d', highlight: '#6aac7d' },
  { name: 'Emerald', hex: '#2d8a5a', highlight: '#4daa7a' },
  { name: 'Forest Green', hex: '#2a6a40', highlight: '#4a8a60' },
  { name: 'Mint', hex: '#7ac9a0', highlight: '#9ae9c0' },
  { name: 'Teal', hex: '#2e8b8b', highlight: '#4eabab' },
  { name: 'Turquoise', hex: '#40a8a0', highlight: '#60c8c0' },
  { name: 'Cyan', hex: '#50b0c8', highlight: '#70d0e8' },

  // Fashion Colors - Other
  { name: 'Orange', hex: '#d85820', highlight: '#f87840' },
  { name: 'Coral', hex: '#e06050', highlight: '#ff8070' },
  { name: 'Yellow', hex: '#d4b030', highlight: '#f4d050' },
  { name: 'Silver Blue', hex: '#8aa8c0', highlight: '#aac8e0' },
  { name: 'Rainbow Tip', hex: '#d060a0', highlight: '#f080c0' },
];

export const EYE_COLORS: EyeColor[] = [
  // Browns - Most common eye color worldwide
  { name: 'Dark Brown', hex: '#3d2314', pupil: '#1a0d08' },
  { name: 'Espresso Brown', hex: '#2c1a10', pupil: '#150c05' },
  { name: 'Brown', hex: '#634e34', pupil: '#2a2014' },
  { name: 'Warm Brown', hex: '#6b4420', pupil: '#352210' },
  { name: 'Chestnut', hex: '#704020', pupil: '#382010' },
  { name: 'Honey Brown', hex: '#7a5a30', pupil: '#3d2d18' },
  { name: 'Light Brown', hex: '#8b6942', pupil: '#463521' },

  // Hazels - Green/Brown mix
  { name: 'Hazel', hex: '#8b7355', pupil: '#3d3425' },
  { name: 'Dark Hazel', hex: '#6a5a40', pupil: '#352d20' },
  { name: 'Green Hazel', hex: '#7a8855', pupil: '#3d4428' },
  { name: 'Golden Hazel', hex: '#9a7840', pupil: '#4d3c20' },

  // Ambers - Rare golden color
  { name: 'Amber', hex: '#b5651d', pupil: '#5a3210' },
  { name: 'Light Amber', hex: '#c9872a', pupil: '#654315' },
  { name: 'Copper', hex: '#b87333', pupil: '#5c3a1a' },

  // Greens
  { name: 'Green', hex: '#3d5c3d', pupil: '#1e2e1e' },
  { name: 'Dark Green', hex: '#2a472a', pupil: '#152415' },
  { name: 'Emerald', hex: '#3a8a50', pupil: '#1d4528' },
  { name: 'Forest Green', hex: '#4a6a4a', pupil: '#253525' },
  { name: 'Sage Green', hex: '#6a8a6a', pupil: '#354535' },
  { name: 'Light Green', hex: '#7aaa7a', pupil: '#3d553d' },

  // Blue-Greens (Teal/Turquoise)
  { name: 'Blue-Green', hex: '#3d8b8b', pupil: '#1e4545' },
  { name: 'Teal', hex: '#2a7a7a', pupil: '#153d3d' },
  { name: 'Turquoise', hex: '#4aa0a0', pupil: '#255050' },

  // Blues
  { name: 'Blue', hex: '#6b8caf', pupil: '#354657' },
  { name: 'Deep Blue', hex: '#4a6a8a', pupil: '#253545' },
  { name: 'Navy Blue', hex: '#3a5070', pupil: '#1d2838' },
  { name: 'Light Blue', hex: '#8cb4d2', pupil: '#4a6978' },
  { name: 'Sky Blue', hex: '#a0c8e8', pupil: '#506474' },
  { name: 'Ice Blue', hex: '#b0d8f0', pupil: '#586c78' },
  { name: 'Sapphire', hex: '#5a7aaa', pupil: '#2d3d55' },

  // Grays
  { name: 'Gray', hex: '#808080', pupil: '#404040' },
  { name: 'Dark Gray', hex: '#606060', pupil: '#303030' },
  { name: 'Light Gray', hex: '#a0a0a0', pupil: '#505050' },
  { name: 'Gray-Blue', hex: '#7393a7', pupil: '#3a4a54' },
  { name: 'Gray-Green', hex: '#789888', pupil: '#3c4c44' },
  { name: 'Silver Gray', hex: '#a8b8c0', pupil: '#545c60' },

  // Fantasy/Rare Colors
  { name: 'Violet', hex: '#7a5a9a', pupil: '#3d2d4d' },
  { name: 'Purple', hex: '#8050a0', pupil: '#402850' },
  { name: 'Red', hex: '#aa3030', pupil: '#551818' },
  { name: 'Crimson', hex: '#8a2828', pupil: '#451414' },
  { name: 'Pink', hex: '#c8809a', pupil: '#64404d' },
  { name: 'Gold', hex: '#c9a030', pupil: '#655018' },
  { name: 'White', hex: '#e0e0e8', pupil: '#707074' },
  { name: 'Black', hex: '#1a1a1a', pupil: '#0a0a0a' },
];

export const CLOTHING_COLORS: ColorOption[] = [
  { name: 'Navy', hex: '#1a237e' },
  { name: 'Royal Blue', hex: '#3f51b5' },
  { name: 'Sky Blue', hex: '#5e8cd8' },
  { name: 'Teal', hex: '#00897b' },
  { name: 'Forest Green', hex: '#2e7d32' },
  { name: 'Olive', hex: '#6b8e23' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Crimson', hex: '#c62828' },
  { name: 'Coral', hex: '#ff6f61' },
  { name: 'Hot Pink', hex: '#d81b60' },
  { name: 'Purple', hex: '#6a1b9a' },
  { name: 'Lavender', hex: '#9c7ec9' },
  { name: 'Orange', hex: '#ef6c00' },
  { name: 'Gold', hex: '#f9a825' },
  { name: 'Charcoal', hex: '#424242' },
  { name: 'Black', hex: '#212121' },
  { name: 'White', hex: '#fafafa' },
  { name: 'Cream', hex: '#f5f5dc' },
];

// Makeup Color Palettes
export const EYESHADOW_COLORS: ColorOption[] = [
  // Neutrals
  { name: 'Nude', hex: '#d4b8a0' },
  { name: 'Taupe', hex: '#8b7355' },
  { name: 'Brown', hex: '#6b4423' },
  { name: 'Espresso', hex: '#3d2314' },
  { name: 'Champagne', hex: '#f5e6d3' },
  { name: 'Bronze', hex: '#cd7f32' },
  { name: 'Gold', hex: '#d4af37' },
  { name: 'Copper', hex: '#b87333' },
  // Colors
  { name: 'Rose', hex: '#c77c8e' },
  { name: 'Mauve', hex: '#a67b8a' },
  { name: 'Plum', hex: '#8e4585' },
  { name: 'Purple', hex: '#7b5d99' },
  { name: 'Navy', hex: '#1a2a4a' },
  { name: 'Teal', hex: '#2e8b8b' },
  { name: 'Olive', hex: '#6b8e23' },
  { name: 'Forest', hex: '#2e7d32' },
  // Bold
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Hot Pink', hex: '#e6478a' },
  { name: 'Electric Blue', hex: '#4169e1' },
];

export const EYELINER_COLORS: ColorOption[] = [
  { name: 'Black', hex: '#0a0a0a' },
  { name: 'Dark Brown', hex: '#2c1810' },
  { name: 'Brown', hex: '#4e3328' },
  { name: 'Gray', hex: '#555555' },
  { name: 'Navy', hex: '#1a2a4a' },
  { name: 'Purple', hex: '#4a2c6a' },
  { name: 'Teal', hex: '#1a5a5a' },
  { name: 'White', hex: '#f0f0f0' },
];

export const LIPSTICK_COLORS: ColorOption[] = [
  // Nudes
  { name: 'Nude Pink', hex: '#c9a0a0' },
  { name: 'Nude Peach', hex: '#d4a088' },
  { name: 'Nude Brown', hex: '#b08878' },
  { name: 'Mauve', hex: '#b07080' },
  // Pinks
  { name: 'Baby Pink', hex: '#f0b8c8' },
  { name: 'Rose', hex: '#c77c8e' },
  { name: 'Hot Pink', hex: '#e6478a' },
  { name: 'Fuchsia', hex: '#c81878' },
  // Reds
  { name: 'Coral', hex: '#e06050' },
  { name: 'Classic Red', hex: '#c41e3a' },
  { name: 'Berry Red', hex: '#8e354a' },
  { name: 'Deep Red', hex: '#6b2018' },
  { name: 'Wine', hex: '#722f37' },
  // Bold
  { name: 'Plum', hex: '#6b3a5a' },
  { name: 'Berry', hex: '#8b3a62' },
  { name: 'Oxblood', hex: '#4a0e0e' },
  { name: 'Orange Red', hex: '#d85820' },
  // Special
  { name: 'Clear Gloss', hex: '#f5e6e6' },
  { name: 'Brown', hex: '#6b4423' },
  { name: 'Black', hex: '#1a1a1a' },
];

export const BLUSH_COLORS: ColorOption[] = [
  { name: 'Soft Pink', hex: '#f0b8c8' },
  { name: 'Rose', hex: '#e8a0b0' },
  { name: 'Peach', hex: '#f5c0a0' },
  { name: 'Coral', hex: '#e8a090' },
  { name: 'Berry', hex: '#c88090' },
  { name: 'Mauve', hex: '#c0a0b0' },
  { name: 'Apricot', hex: '#f0b090' },
  { name: 'Plum', hex: '#b08090' },
  { name: 'Bronze', hex: '#c0a080' },
  { name: 'Terracotta', hex: '#c88060' },
];

// ============================================================================
// FACIAL PROPORTIONS
// ============================================================================

export interface FacialProportions {
  // Eye adjustments (-1 to 1 scale where 0 is default)
  eyeSpacing: number;       // -1 (closer) to 1 (wider)
  eyeSize: number;          // -1 (smaller) to 1 (larger)
  eyeHeight: number;        // -1 (lower) to 1 (higher)
  // Nose adjustments
  noseSize: number;         // -1 (smaller) to 1 (larger)
  nosePosition: number;     // -1 (higher) to 1 (lower)
  // Mouth adjustments
  mouthSize: number;        // -1 (smaller) to 1 (larger)
  mouthPosition: number;    // -1 (higher) to 1 (lower)
  // Face shape adjustments
  faceWidth: number;        // -1 (narrower) to 1 (wider)
  jawWidth: number;         // -1 (narrower) to 1 (wider)
  foreheadHeight: number;   // -1 (shorter) to 1 (taller)
  chinShape: number;        // -1 (pointed) to 1 (round)
  // Eyebrow adjustments (Phase 2.4)
  eyebrowHeight: number;    // -1 (lower) to 1 (higher)
  eyebrowSpacing: number;   // -1 (closer) to 1 (wider)
  eyebrowThickness: number; // -1 (thinner) to 1 (thicker)
  eyebrowArch: number;      // -1 (flat) to 1 (high arch)
  eyebrowLength: number;    // -1 (shorter) to 1 (longer)
  eyebrowTilt: number;      // -1 (angled down) to 1 (angled up)
}

export const DEFAULT_FACIAL_PROPORTIONS: FacialProportions = {
  eyeSpacing: 0,
  eyeSize: 0,
  eyeHeight: 0,
  noseSize: 0,
  nosePosition: 0,
  mouthSize: 0,
  mouthPosition: 0,
  faceWidth: 0,
  jawWidth: 0,
  foreheadHeight: 0,
  chinShape: 0,
  eyebrowHeight: 0,
  eyebrowSpacing: 0,
  eyebrowThickness: 0,
  eyebrowArch: 0,
  eyebrowLength: 0,
  eyebrowTilt: 0,
};

// ============================================================================
// AVATAR CONFIG
// ============================================================================

export interface AvatarConfig {
  id?: string;
  gender: 'male' | 'female' | 'neutral';
  faceShape: FaceShape;
  skinTone: string;
  eyeStyle: EyeStyle;
  eyeColor: string;
  // Eye enhancements (Phase 2.3)
  rightEyeColor?: string;       // For heterochromia - different right eye color
  eyelashStyle?: EyelashStyle;
  eyebrowStyle: EyebrowStyle;
  eyebrowColor?: string;
  noseStyle: NoseStyle;
  mouthStyle: MouthStyle;
  lipColor?: string;
  hairStyle: HairStyle;
  hairColor: string;
  // Hair treatment for multi-color effects
  hairTreatment?: HairTreatment;
  hairSecondaryColor?: string;
  // Face details
  freckles?: FreckleStyle;
  wrinkles?: WrinkleStyle;
  cheekStyle?: CheekStyle;
  skinDetail?: SkinDetail;
  // Age variations (Phase 1.3)
  eyeBags?: EyeBagsStyle;
  grayHairAmount?: GrayHairAmount;
  // Makeup
  eyeshadowStyle?: EyeshadowStyle;
  eyeshadowColor?: string;
  eyelinerStyle?: EyelinerStyle;
  eyelinerColor?: string;
  lipstickStyle?: LipstickStyle;
  lipstickColor?: string;
  blushStyle?: BlushStyle;
  blushColor?: string;
  // Facial hair & accessories
  facialHair?: FacialHairStyle;
  facialHairColor?: string;
  accessory?: AccessoryStyle;
  accessoryColor?: string;
  clothing?: ClothingStyle;
  clothingColor?: string;
  clothingSecondaryColor?: string;
  // Full body system (Phase 1 & 2)
  bodyType?: BodyType;
  armPose?: ArmPose;
  legPose?: LegPose;
  leftHandGesture?: HandGesture;
  rightHandGesture?: HandGesture;
  bottomStyle?: BottomStyle;
  bottomColor?: string;
  shoeStyle?: ShoeStyle;
  shoeColor?: string;
  // Facial proportions (Phase 1.2)
  facialProportions?: FacialProportions;
  // Phase 1.4 Expansion - Face Tattoos
  faceTattoo?: FaceTattooStyle;
  faceTattooColor?: string;
  // Phase 1.4 Expansion - Teeth Customization
  teethStyle?: TeethStyle;
  teethColor?: string; // For grillz/gold teeth color
  // Background customization
  backgroundColor?: string;
}

export interface StoredAvatar {
  id: string;
  type?: 'svg';
  name?: string;
  config: AvatarConfig;
  base64Snapshot?: string;
  createdAt: number;
  updatedAt: number;
}

export function isStoredAvatar(value: unknown): value is StoredAvatar {
  if (typeof value !== 'object' || value === null) return false;
  const stored = value as Record<string, unknown>;
  return (
    typeof stored.id === 'string' &&
    typeof stored.config === 'object' &&
    stored.config !== null &&
    typeof stored.createdAt === 'number' &&
    typeof stored.updatedAt === 'number' &&
    isAvatarConfig(stored.config)
  );
}

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const AVATAR_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 64,
  lg: 96,
  xl: 128,
  xxl: 200,
};

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_MALE_CONFIG: AvatarConfig = {
  gender: 'male',
  faceShape: FaceShape.OVAL,
  skinTone: '#f5d7c3',
  eyeStyle: EyeStyle.DEFAULT,
  eyeColor: '#634e34',
  eyebrowStyle: EyebrowStyle.DEFAULT,
  noseStyle: NoseStyle.DEFAULT,
  mouthStyle: MouthStyle.SMILE,
  hairStyle: HairStyle.SHORT_CREW,
  hairColor: '#2c1810',
  clothing: ClothingStyle.HOODIE,
  clothingColor: '#3f51b5',
  // Full body defaults
  bodyType: BodyType.AVERAGE,
  armPose: ArmPose.DOWN,
  legPose: LegPose.STANDING,
  leftHandGesture: HandGesture.OPEN,
  rightHandGesture: HandGesture.OPEN,
  bottomStyle: BottomStyle.JEANS,
  bottomColor: '#1a237e',
  shoeStyle: ShoeStyle.SNEAKERS,
  shoeColor: '#f5f5f5',
};

export const DEFAULT_FEMALE_CONFIG: AvatarConfig = {
  gender: 'female',
  faceShape: FaceShape.OVAL,
  skinTone: '#f5d7c3',
  eyeStyle: EyeStyle.DEFAULT,
  eyeColor: '#634e34',
  eyebrowStyle: EyebrowStyle.NATURAL,
  noseStyle: NoseStyle.SMALL,
  mouthStyle: MouthStyle.SMILE,
  hairStyle: HairStyle.LONG_WAVY,
  hairColor: '#2c1810',
  clothing: ClothingStyle.SCOOP_NECK,
  clothingColor: '#d81b60',
  // Full body defaults
  bodyType: BodyType.AVERAGE,
  armPose: ArmPose.DOWN,
  legPose: LegPose.STANDING,
  leftHandGesture: HandGesture.OPEN,
  rightHandGesture: HandGesture.OPEN,
  bottomStyle: BottomStyle.JEANS_SKINNY,
  bottomColor: '#1a237e',
  shoeStyle: ShoeStyle.FLATS,
  shoeColor: '#1a1a1a',
};

export const DEFAULT_NEUTRAL_CONFIG: AvatarConfig = {
  gender: 'neutral',
  faceShape: FaceShape.OVAL,
  skinTone: '#f5d7c3',
  eyeStyle: EyeStyle.DEFAULT,
  eyeColor: '#634e34',
  eyebrowStyle: EyebrowStyle.NATURAL,
  noseStyle: NoseStyle.DEFAULT,
  mouthStyle: MouthStyle.SMILE,
  hairStyle: HairStyle.MEDIUM_MESSY,
  hairColor: '#2c1810',
  clothing: ClothingStyle.TSHIRT,
  clothingColor: '#00897b',
  // Full body defaults
  bodyType: BodyType.AVERAGE,
  armPose: ArmPose.DOWN,
  legPose: LegPose.STANDING,
  leftHandGesture: HandGesture.OPEN,
  rightHandGesture: HandGesture.OPEN,
  bottomStyle: BottomStyle.JEANS,
  bottomColor: '#1a237e',
  shoeStyle: ShoeStyle.SNEAKERS,
  shoeColor: '#f5f5f5',
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAvatarConfig(value: unknown): value is AvatarConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.gender === 'string' &&
    typeof config.faceShape === 'string' &&
    typeof config.skinTone === 'string' &&
    typeof config.eyeStyle === 'string' &&
    typeof config.eyeColor === 'string' &&
    typeof config.hairStyle === 'string' &&
    typeof config.hairColor === 'string'
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface SvgPartProps {
  color?: string;
  secondaryColor?: string;
  scale?: number;
}

export interface FacePartPosition {
  x: number;
  y: number;
}

export interface ViewBoxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_VIEWBOX: ViewBoxConfig = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};
