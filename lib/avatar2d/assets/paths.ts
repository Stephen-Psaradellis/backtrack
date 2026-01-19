/**
 * SVG Path Data for 2D Avatar System
 *
 * Comprehensive SVG paths for rendering customizable cartoon-style avatars.
 * All paths are designed for a 100x100 viewBox with the face centered.
 *
 * Usage with react-native-svg:
 * ```tsx
 * import { Path } from 'react-native-svg';
 * import { FACE_SHAPES, EYE_STYLES } from './paths';
 *
 * <Path d={FACE_SHAPES.round} fill={skinTone} />
 * ```
 */

// =============================================================================
// FACE SHAPES (5 variations)
// =============================================================================
// All face shapes are centered at (50, 50) with appropriate proportions

export const FACE_SHAPES = {
  /**
   * Round face - circular, friendly appearance
   * Good for: youthful, approachable characters
   */
  round: 'M50,15 C75,15 82,35 82,50 C82,70 75,82 50,82 C25,82 18,70 18,50 C18,35 25,15 50,15 Z',

  /**
   * Oval face - elongated, elegant shape
   * Good for: balanced, classic look
   */
  oval: 'M50,12 C72,12 78,32 78,48 C78,68 72,85 50,85 C28,85 22,68 22,48 C22,32 28,12 50,12 Z',

  /**
   * Square face - angular jawline, strong features
   * Good for: determined, confident characters
   */
  square: 'M50,15 C68,15 78,22 78,35 L78,62 C78,72 72,80 62,82 L38,82 C28,80 22,72 22,62 L22,35 C22,22 32,15 50,15 Z',

  /**
   * Heart face - wider forehead, pointed chin
   * Good for: romantic, expressive characters
   */
  heart: 'M50,12 C72,12 82,28 82,42 C82,55 75,68 62,78 Q50,88 38,78 C25,68 18,55 18,42 C18,28 28,12 50,12 Z',

  /**
   * Long face - vertically stretched oval
   * Good for: mature, sophisticated characters
   */
  long: 'M50,8 C68,8 75,25 75,45 C75,68 68,90 50,90 C32,90 25,68 25,45 C25,25 32,8 50,8 Z',
} as const;

// Face shape outline paths (for border/stroke effects)
export const FACE_SHAPE_OUTLINES = {
  round: 'M50,15 C75,15 82,35 82,50 C82,70 75,82 50,82 C25,82 18,70 18,50 C18,35 25,15 50,15',
  oval: 'M50,12 C72,12 78,32 78,48 C78,68 72,85 50,85 C28,85 22,68 22,48 C22,32 28,12 50,12',
  square: 'M50,15 C68,15 78,22 78,35 L78,62 C78,72 72,80 62,82 L38,82 C28,80 22,72 22,62 L22,35 C22,22 32,15 50,15',
  heart: 'M50,12 C72,12 82,28 82,42 C82,55 75,68 62,78 Q50,88 38,78 C25,68 18,55 18,42 C18,28 28,12 50,12',
  long: 'M50,8 C68,8 75,25 75,45 C75,68 68,90 50,90 C32,90 25,68 25,45 C25,25 32,8 50,8',
} as const;

// =============================================================================
// EYE STYLES (6 variations)
// =============================================================================
// Eyes are positioned at left (38, 42) and right (62, 42)
// Each style provides left and right eye paths

export const EYE_STYLES = {
  /**
   * Normal eyes - standard round eyes with highlights
   */
  normal: {
    left: {
      outer: 'M32,42 A6,6 0 1,1 44,42 A6,6 0 1,1 32,42',
      pupil: 'M35,42 A3,3 0 1,1 41,42 A3,3 0 1,1 35,42',
      highlight: 'M35,40 A1.5,1.5 0 1,1 38,40 A1.5,1.5 0 1,1 35,40',
    },
    right: {
      outer: 'M56,42 A6,6 0 1,1 68,42 A6,6 0 1,1 56,42',
      pupil: 'M59,42 A3,3 0 1,1 65,42 A3,3 0 1,1 59,42',
      highlight: 'M59,40 A1.5,1.5 0 1,1 62,40 A1.5,1.5 0 1,1 59,40',
    },
  },

  /**
   * Wide eyes - larger, more expressive
   */
  wide: {
    left: {
      outer: 'M30,42 A8,8 0 1,1 46,42 A8,8 0 1,1 30,42',
      pupil: 'M34,42 A4,4 0 1,1 42,42 A4,4 0 1,1 34,42',
      highlight: 'M34,39 A2,2 0 1,1 38,39 A2,2 0 1,1 34,39',
    },
    right: {
      outer: 'M54,42 A8,8 0 1,1 70,42 A8,8 0 1,1 54,42',
      pupil: 'M58,42 A4,4 0 1,1 66,42 A4,4 0 1,1 58,42',
      highlight: 'M58,39 A2,2 0 1,1 62,39 A2,2 0 1,1 58,39',
    },
  },

  /**
   * Narrow eyes - squinted, mysterious look
   */
  narrow: {
    left: {
      outer: 'M32,42 Q38,38 44,42 Q38,46 32,42',
      pupil: 'M36,42 A2,1.5 0 1,1 40,42 A2,1.5 0 1,1 36,42',
      highlight: 'M36,41 A1,0.5 0 1,1 38,41 A1,0.5 0 1,1 36,41',
    },
    right: {
      outer: 'M56,42 Q62,38 68,42 Q62,46 56,42',
      pupil: 'M60,42 A2,1.5 0 1,1 64,42 A2,1.5 0 1,1 60,42',
      highlight: 'M60,41 A1,0.5 0 1,1 62,41 A1,0.5 0 1,1 60,41',
    },
  },

  /**
   * Almond eyes - elegant, angled shape
   */
  almond: {
    left: {
      outer: 'M30,43 Q34,36 42,38 Q46,40 46,44 Q44,48 36,48 Q30,47 30,43',
      pupil: 'M35,43 A3,3 0 1,1 41,43 A3,3 0 1,1 35,43',
      highlight: 'M35,41 A1.5,1.5 0 1,1 38,41 A1.5,1.5 0 1,1 35,41',
    },
    right: {
      outer: 'M54,44 Q54,40 58,38 Q66,36 70,43 Q70,47 64,48 Q56,48 54,44',
      pupil: 'M59,43 A3,3 0 1,1 65,43 A3,3 0 1,1 59,43',
      highlight: 'M62,41 A1.5,1.5 0 1,1 65,41 A1.5,1.5 0 1,1 62,41',
    },
  },

  /**
   * Round eyes - perfectly circular, cute appearance
   */
  round: {
    left: {
      outer: 'M31,42 A7,7 0 1,1 45,42 A7,7 0 1,1 31,42',
      pupil: 'M34,42 A4,4 0 1,1 42,42 A4,4 0 1,1 34,42',
      highlight: 'M34,39 A2,2 0 1,1 38,39 A2,2 0 1,1 34,39',
    },
    right: {
      outer: 'M55,42 A7,7 0 1,1 69,42 A7,7 0 1,1 55,42',
      pupil: 'M58,42 A4,4 0 1,1 66,42 A4,4 0 1,1 58,42',
      highlight: 'M61,39 A2,2 0 1,1 65,39 A2,2 0 1,1 61,39',
    },
  },

  /**
   * Sleepy eyes - half-closed, relaxed look
   */
  sleepy: {
    left: {
      outer: 'M32,44 Q38,40 44,44 Q38,48 32,44',
      pupil: 'M36,44 A2,1 0 1,1 40,44 A2,1 0 1,1 36,44',
      highlight: '', // No highlight for sleepy eyes
    },
    right: {
      outer: 'M56,44 Q62,40 68,44 Q62,48 56,44',
      pupil: 'M60,44 A2,1 0 1,1 64,44 A2,1 0 1,1 60,44',
      highlight: '',
    },
  },
} as const;

// Simple eye paths (single path per eye for simpler rendering)
export const SIMPLE_EYE_PATHS = {
  normal: {
    left: 'M38,42 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0',
    right: 'M62,42 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0',
  },
  wide: {
    left: 'M38,42 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0',
    right: 'M62,42 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0',
  },
  narrow: {
    left: 'M33,42 Q38,38 43,42 Q38,45 33,42 Z',
    right: 'M57,42 Q62,38 67,42 Q62,45 57,42 Z',
  },
  almond: {
    left: 'M32,42 Q35,37 42,39 Q45,42 42,46 Q35,47 32,42 Z',
    right: 'M58,39 Q65,37 68,42 Q65,47 58,46 Q55,42 58,39 Z',
  },
  round: {
    left: 'M38,42 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0',
    right: 'M62,42 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0',
  },
  sleepy: {
    left: 'M33,43 Q38,39 43,43 L43,45 Q38,42 33,45 Z',
    right: 'M57,43 Q62,39 67,43 L67,45 Q62,42 57,45 Z',
  },
} as const;

// =============================================================================
// HAIR STYLES (8 variations)
// =============================================================================
// Hair paths fit over the face shapes, starting from forehead area

export const HAIR_STYLES = {
  /**
   * Short hair - close-cropped style
   */
  short: 'M25,32 Q25,12 50,10 Q75,12 75,32 Q72,35 68,36 L65,28 Q50,22 35,28 L32,36 Q28,35 25,32 Z',

  /**
   * Medium hair - shoulder-length style
   */
  medium: 'M20,30 Q20,10 50,8 Q80,10 80,30 L82,55 Q82,65 75,68 L72,45 Q65,35 50,32 Q35,35 28,45 L25,68 Q18,65 18,55 L20,30 Z',

  /**
   * Long hair - flowing past shoulders
   */
  long: 'M18,30 Q18,8 50,5 Q82,8 82,30 L85,65 Q85,85 75,90 L72,50 L68,38 Q55,28 50,28 Q45,28 32,38 L28,50 L25,90 Q15,85 15,65 L18,30 Z',

  /**
   * Curly hair - voluminous curls
   */
  curly: 'M18,35 Q15,25 22,18 Q28,12 35,14 Q38,8 50,8 Q62,8 65,14 Q72,12 78,18 Q85,25 82,35 Q88,40 85,50 Q88,60 82,65 Q80,50 75,42 Q72,35 65,32 L60,28 Q55,25 50,25 Q45,25 40,28 L35,32 Q28,35 25,42 Q20,50 18,65 Q12,60 15,50 Q12,40 18,35 Z',

  /**
   * Straight hair - smooth, sleek style
   */
  straight: 'M20,28 Q20,10 50,8 Q80,10 80,28 L80,75 Q78,80 72,82 L72,40 Q65,32 50,30 Q35,32 28,40 L28,82 Q22,80 20,75 L20,28 Z',

  /**
   * Ponytail - hair pulled back with tail
   */
  ponytail: 'M25,30 Q25,12 50,10 Q75,12 75,30 Q72,34 68,35 L65,25 Q50,18 35,25 L32,35 Q28,34 25,30 Z M72,25 Q78,22 82,28 Q88,35 85,45 Q82,55 78,58 Q75,50 75,40 Q75,30 72,25 Z',

  /**
   * Bun - hair gathered in a bun on top
   */
  bun: 'M25,32 Q25,15 50,12 Q75,15 75,32 Q72,35 68,36 L65,28 Q50,22 35,28 L32,36 Q28,35 25,32 Z M40,8 A12,10 0 1,1 60,8 A12,10 0 1,1 40,8 Z',

  /**
   * Bald - no hair (just a scalp highlight)
   */
  bald: 'M50,18 Q58,18 62,22 Q58,20 50,20 Q42,20 38,22 Q42,18 50,18 Z',
} as const;

// Hair style back layers (for hair that goes behind the head)
export const HAIR_BACK_LAYERS = {
  short: '', // No back layer
  medium: 'M22,45 L22,70 Q22,78 30,80 L30,55 Q30,48 35,45 Z M78,45 L78,70 Q78,78 70,80 L70,55 Q70,48 65,45 Z',
  long: 'M18,45 L18,88 Q18,95 28,98 L28,55 Q28,48 35,42 Z M82,45 L82,88 Q82,95 72,98 L72,55 Q72,48 65,42 Z',
  curly: 'M15,45 Q12,55 15,65 Q12,75 18,82 L22,55 Q22,48 28,42 Z M85,45 Q88,55 85,65 Q88,75 82,82 L78,55 Q78,48 72,42 Z',
  straight: 'M22,42 L22,85 Q22,90 28,92 L28,48 Q32,38 38,35 Z M78,42 L78,85 Q78,90 72,92 L72,48 Q68,38 62,35 Z',
  ponytail: '',
  bun: '',
  bald: '',
} as const;

// =============================================================================
// NOSE STYLES (5 variations)
// =============================================================================
// Noses are centered around (50, 52)

export const NOSE_STYLES = {
  /**
   * Normal nose - balanced, subtle curve
   */
  normal: 'M48,48 Q50,54 52,48',

  /**
   * Small nose - petite, minimal definition
   */
  small: 'M49,50 Q50,53 51,50',

  /**
   * Wide nose - broader nostril area
   */
  wide: 'M45,50 Q47,48 50,52 Q53,48 55,50 Q53,55 50,54 Q47,55 45,50',

  /**
   * Pointed nose - longer with defined tip
   */
  pointed: 'M48,45 L50,56 L52,45',

  /**
   * Button nose - small, round, upturned
   */
  button: 'M47,52 A3,2 0 1,0 53,52 Q50,55 47,52',
} as const;

// Nose shadows/accents for depth
export const NOSE_SHADOWS = {
  normal: 'M46,52 Q48,55 50,52',
  small: 'M48,52 Q49,54 50,52',
  wide: 'M44,53 Q47,56 50,54 Q53,56 56,53',
  pointed: 'M47,52 Q50,58 53,52',
  button: 'M46,53 Q50,56 54,53',
} as const;

// =============================================================================
// MOUTH STYLES (6 variations)
// =============================================================================
// Mouths are centered around (50, 62)

export const MOUTH_STYLES = {
  /**
   * Smile - happy, curved upward
   */
  smile: {
    outline: 'M40,62 Q50,72 60,62',
    fill: '', // Open mouth: 'M40,62 Q50,72 60,62 Q50,66 40,62'
  },

  /**
   * Grin - wide smile showing teeth
   */
  grin: {
    outline: 'M38,60 Q50,72 62,60',
    fill: 'M38,60 Q50,72 62,60 Q50,64 38,60', // Teeth area
    teeth: 'M40,62 L60,62 L60,66 Q50,70 40,66 Z',
  },

  /**
   * Neutral - straight line, no emotion
   */
  neutral: {
    outline: 'M42,62 L58,62',
    fill: '',
  },

  /**
   * Frown - sad, curved downward
   */
  frown: {
    outline: 'M40,65 Q50,58 60,65',
    fill: '',
  },

  /**
   * Open - mouth open in surprise/speaking
   */
  open: {
    outline: 'M42,58 Q50,56 58,58 Q60,65 58,70 Q50,72 42,70 Q40,65 42,58',
    fill: 'M42,58 Q50,56 58,58 Q60,65 58,70 Q50,72 42,70 Q40,65 42,58',
    tongue: 'M44,68 Q50,72 56,68 Q50,70 44,68',
  },

  /**
   * Smirk - asymmetrical, knowing smile
   */
  smirk: {
    outline: 'M42,62 Q48,64 54,62 Q58,60 62,58',
    fill: '',
  },
} as const;

// Simple mouth paths (single line per style)
export const SIMPLE_MOUTH_PATHS = {
  smile: 'M40,60 Q50,70 60,60',
  grin: 'M36,58 Q50,72 64,58',
  neutral: 'M42,62 L58,62',
  frown: 'M40,66 Q50,58 60,66',
  open: 'M44,58 Q50,56 56,58 Q58,64 56,70 Q50,72 44,70 Q42,64 44,58 Z',
  smirk: 'M42,62 Q50,66 58,60 L62,58',
} as const;

// =============================================================================
// EYEBROW STYLES (4 variations)
// =============================================================================
// Eyebrows positioned above eyes around y=33

export const EYEBROW_STYLES = {
  /**
   * Normal eyebrows - natural arch
   */
  normal: {
    left: 'M32,34 Q38,30 44,33',
    right: 'M56,33 Q62,30 68,34',
  },

  /**
   * Thick eyebrows - bold, prominent
   */
  thick: {
    left: 'M30,35 Q35,28 45,32 Q38,34 32,35 Z',
    right: 'M55,32 Q65,28 70,35 L68,35 Q62,34 55,32 Z',
  },

  /**
   * Thin eyebrows - delicate, refined
   */
  thin: {
    left: 'M33,34 Q38,32 43,34',
    right: 'M57,34 Q62,32 67,34',
  },

  /**
   * Arched eyebrows - dramatically curved
   */
  arched: {
    left: 'M30,38 Q34,28 44,32',
    right: 'M56,32 Q66,28 70,38',
  },
} as const;

// Eyebrow expressions (can combine with base styles)
export const EYEBROW_EXPRESSIONS = {
  /**
   * Raised - surprised expression
   */
  raised: {
    left: 'M32,30 Q38,25 44,28',
    right: 'M56,28 Q62,25 68,30',
  },

  /**
   * Furrowed - angry/concerned expression
   */
  furrowed: {
    left: 'M32,32 Q36,36 44,30',
    right: 'M56,30 Q64,36 68,32',
  },

  /**
   * Worried - asymmetrical concern
   */
  worried: {
    left: 'M32,36 Q38,30 44,32',
    right: 'M56,32 Q62,30 68,36',
  },
} as const;

// =============================================================================
// EAR PATHS
// =============================================================================
// Ears positioned at sides of face

export const EAR_PATHS = {
  left: 'M20,42 Q15,38 16,48 Q15,58 20,55 Q22,50 20,42',
  right: 'M80,42 Q85,38 84,48 Q85,58 80,55 Q78,50 80,42',
} as const;

// =============================================================================
// NECK PATH
// =============================================================================

export const NECK_PATH = 'M40,78 L40,95 L60,95 L60,78 Q55,82 50,82 Q45,82 40,78' as const;

// =============================================================================
// CLOTHING/BODY PATHS
// =============================================================================

export const CLOTHING_PATHS = {
  /**
   * T-shirt/crew neck
   */
  tshirt: 'M30,88 Q30,82 40,82 Q45,85 50,85 Q55,85 60,82 Q70,82 70,88 L75,100 L25,100 Z',

  /**
   * V-neck
   */
  vneck: 'M30,88 Q30,82 40,82 L50,95 L60,82 Q70,82 70,88 L75,100 L25,100 Z',

  /**
   * Collared shirt
   */
  collared: 'M30,88 Q30,82 38,82 L42,88 L50,82 L58,88 L62,82 Q70,82 70,88 L75,100 L25,100 Z',

  /**
   * Hoodie
   */
  hoodie: 'M28,86 Q28,80 38,80 Q42,82 50,82 Q58,82 62,80 Q72,80 72,86 L76,100 L24,100 Z M38,80 Q40,76 50,76 Q60,76 62,80',

  /**
   * Tank top
   */
  tanktop: 'M35,88 Q38,82 45,82 Q48,85 50,85 Q52,85 55,82 Q62,82 65,88 L70,100 L30,100 Z',
} as const;

// =============================================================================
// ACCESSORIES
// =============================================================================

export const ACCESSORY_PATHS = {
  /**
   * Round glasses
   */
  roundGlasses: {
    left: 'M30,42 A8,8 0 1,1 46,42 A8,8 0 1,1 30,42',
    right: 'M54,42 A8,8 0 1,1 70,42 A8,8 0 1,1 54,42',
    bridge: 'M46,42 L54,42',
    temples: 'M30,40 L18,36 M70,40 L82,36',
  },

  /**
   * Square glasses
   */
  squareGlasses: {
    left: 'M28,36 L46,36 L46,50 L28,50 Z',
    right: 'M54,36 L72,36 L72,50 L54,50 Z',
    bridge: 'M46,42 L54,42',
    temples: 'M28,38 L18,34 M72,38 L82,34',
  },

  /**
   * Sunglasses
   */
  sunglasses: {
    left: 'M26,38 Q28,34 38,34 Q48,34 48,42 Q48,50 38,50 Q28,50 26,42 Z',
    right: 'M52,42 Q52,34 62,34 Q72,34 74,38 Q74,42 72,50 Q62,50 52,42 Z',
    bridge: 'M48,40 L52,40',
    temples: 'M26,38 L16,34 M74,38 L84,34',
  },

  /**
   * Hat (baseball cap style)
   */
  hat: {
    cap: 'M20,28 Q20,15 50,12 Q80,15 80,28 L82,32 L18,32 Z',
    brim: 'M15,32 Q15,28 50,28 Q85,28 85,32 Q85,36 50,35 Q15,36 15,32 Z',
  },

  /**
   * Earrings (studs)
   */
  earrings: {
    left: 'M18,52 A2,2 0 1,1 22,52 A2,2 0 1,1 18,52',
    right: 'M78,52 A2,2 0 1,1 82,52 A2,2 0 1,1 78,52',
  },

  /**
   * Earrings (hoops)
   */
  hoopEarrings: {
    left: 'M14,50 A6,8 0 1,1 14,66 A6,8 0 1,1 14,50',
    right: 'M86,50 A6,8 0 1,1 86,66 A6,8 0 1,1 86,50',
  },
} as const;

// =============================================================================
// FACIAL HAIR
// =============================================================================

export const FACIAL_HAIR_PATHS = {
  /**
   * Full beard
   */
  fullBeard: 'M28,55 Q28,62 32,70 Q38,80 50,82 Q62,80 68,70 Q72,62 72,55 L68,58 Q55,65 50,65 Q45,65 32,58 Z',

  /**
   * Goatee
   */
  goatee: 'M42,62 Q42,68 45,72 Q50,76 55,72 Q58,68 58,62 Q55,65 50,65 Q45,65 42,62',

  /**
   * Mustache
   */
  mustache: 'M38,58 Q42,55 50,56 Q58,55 62,58 Q58,62 50,60 Q42,62 38,58',

  /**
   * Stubble (represented as small dots pattern)
   */
  stubble: 'M32,60 Q32,65 35,68 M38,62 Q38,68 42,72 M45,63 Q45,70 48,74 M52,63 Q52,70 55,74 M58,62 Q58,68 62,72 M65,60 Q65,65 68,68',

  /**
   * Soul patch
   */
  soulPatch: 'M47,68 Q50,66 53,68 Q53,74 50,76 Q47,74 47,68',

  /**
   * Handlebar mustache
   */
  handlebar: 'M35,56 Q40,52 50,54 Q60,52 65,56 Q68,58 70,55 Q65,60 58,58 Q50,60 42,58 Q35,60 30,55 Q32,58 35,56',
} as const;

// =============================================================================
// HELPER TYPES
// =============================================================================

export type FaceShape = keyof typeof FACE_SHAPES;
export type EyeStyle = keyof typeof EYE_STYLES;
export type HairStyle = keyof typeof HAIR_STYLES;
export type NoseStyle = keyof typeof NOSE_STYLES;
export type MouthStyle = keyof typeof MOUTH_STYLES;
export type EyebrowStyle = keyof typeof EYEBROW_STYLES;

// Full list of all available options
export const AVAILABLE_OPTIONS = {
  faceShapes: Object.keys(FACE_SHAPES) as FaceShape[],
  eyeStyles: Object.keys(EYE_STYLES) as EyeStyle[],
  hairStyles: Object.keys(HAIR_STYLES) as HairStyle[],
  noseStyles: Object.keys(NOSE_STYLES) as NoseStyle[],
  mouthStyles: Object.keys(MOUTH_STYLES) as MouthStyle[],
  eyebrowStyles: Object.keys(EYEBROW_STYLES) as EyebrowStyle[],
} as const;

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export interface AvatarPathConfig {
  faceShape: FaceShape;
  eyeStyle: EyeStyle;
  hairStyle: HairStyle;
  noseStyle: NoseStyle;
  mouthStyle: MouthStyle;
  eyebrowStyle: EyebrowStyle;
}

export const DEFAULT_PATH_CONFIG: AvatarPathConfig = {
  faceShape: 'oval',
  eyeStyle: 'normal',
  hairStyle: 'medium',
  noseStyle: 'normal',
  mouthStyle: 'smile',
  eyebrowStyle: 'normal',
};

export const PRESET_CONFIGS: Record<string, AvatarPathConfig> = {
  friendly: {
    faceShape: 'round',
    eyeStyle: 'wide',
    hairStyle: 'short',
    noseStyle: 'button',
    mouthStyle: 'grin',
    eyebrowStyle: 'normal',
  },
  elegant: {
    faceShape: 'oval',
    eyeStyle: 'almond',
    hairStyle: 'long',
    noseStyle: 'pointed',
    mouthStyle: 'smile',
    eyebrowStyle: 'arched',
  },
  serious: {
    faceShape: 'square',
    eyeStyle: 'narrow',
    hairStyle: 'short',
    noseStyle: 'normal',
    mouthStyle: 'neutral',
    eyebrowStyle: 'thick',
  },
  cute: {
    faceShape: 'round',
    eyeStyle: 'round',
    hairStyle: 'curly',
    noseStyle: 'small',
    mouthStyle: 'smile',
    eyebrowStyle: 'thin',
  },
  mysterious: {
    faceShape: 'long',
    eyeStyle: 'sleepy',
    hairStyle: 'straight',
    noseStyle: 'pointed',
    mouthStyle: 'smirk',
    eyebrowStyle: 'arched',
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all paths for a complete avatar configuration
 */
export function getAvatarPaths(config: AvatarPathConfig) {
  return {
    face: FACE_SHAPES[config.faceShape],
    faceOutline: FACE_SHAPE_OUTLINES[config.faceShape],
    hair: HAIR_STYLES[config.hairStyle],
    hairBack: HAIR_BACK_LAYERS[config.hairStyle],
    eyes: EYE_STYLES[config.eyeStyle],
    simpleEyes: SIMPLE_EYE_PATHS[config.eyeStyle],
    nose: NOSE_STYLES[config.noseStyle],
    noseShadow: NOSE_SHADOWS[config.noseStyle],
    mouth: MOUTH_STYLES[config.mouthStyle],
    simpleMouth: SIMPLE_MOUTH_PATHS[config.mouthStyle],
    eyebrows: EYEBROW_STYLES[config.eyebrowStyle],
    ears: EAR_PATHS,
    neck: NECK_PATH,
  };
}

/**
 * Get a random avatar configuration
 */
export function getRandomConfig(): AvatarPathConfig {
  const randomFrom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

  return {
    faceShape: randomFrom(AVAILABLE_OPTIONS.faceShapes),
    eyeStyle: randomFrom(AVAILABLE_OPTIONS.eyeStyles),
    hairStyle: randomFrom(AVAILABLE_OPTIONS.hairStyles),
    noseStyle: randomFrom(AVAILABLE_OPTIONS.noseStyles),
    mouthStyle: randomFrom(AVAILABLE_OPTIONS.mouthStyles),
    eyebrowStyle: randomFrom(AVAILABLE_OPTIONS.eyebrowStyles),
  };
}
