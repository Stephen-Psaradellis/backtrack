/**
 * Recraft API Client
 *
 * Generates AI avatar SVGs via the generate-avatar Supabase Edge Function.
 * The Recraft API key is kept server-side in Supabase secrets.
 */

import { supabase } from './supabase'

// ============================================================================
// TYPES
// ============================================================================

export interface RecraftGenerationOptions {
  /** The prompt describing the avatar */
  prompt: string
  /** Recraft style (default: 'digital_illustration') */
  style?: string
  /** Image size (default: '1024x1024') */
  size?: string
}

// ============================================================================
// PROMPT CONSTRUCTION
// ============================================================================

export interface AvatarTraits {
  gender: string
  ageRange: string
  bodyType: string
  height: string
  skinTone: string
  faceShape: string
  eyebrowShape: string
  eyeColor: string
  eyeShape: string
  nose: string
  lipStyle: string
  facialHair: string
  frecklesMarks: string
  hairStyle: string
  hairTexture: string
  hairColor: string
  expression: string
  clothing: string
  clothingColor: string
  accessories: string[]
  glassesType: string
  makeup: string
  tattoos: string
  backgroundColor: string
}

/** Default traits for partial initialization */
export const DEFAULT_TRAITS: AvatarTraits = {
  gender: 'androgynous',
  ageRange: 'adult',
  bodyType: 'average',
  height: 'average',
  skinTone: 'medium',
  faceShape: 'oval',
  eyebrowShape: 'natural',
  eyeColor: 'brown',
  eyeShape: 'almond',
  nose: 'medium',
  lipStyle: 'medium',
  facialHair: 'none',
  frecklesMarks: 'none',
  hairStyle: 'short',
  hairTexture: 'straight',
  hairColor: 'brown',
  expression: 'friendly',
  clothing: 'casual t-shirt',
  clothingColor: 'black',
  accessories: [],
  glassesType: 'none',
  makeup: 'none',
  tattoos: 'none',
  backgroundColor: 'white',
}

/**
 * Build a structured Recraft prompt from guided avatar trait selections.
 * Uses labeled sections so Recraft treats each as distinct instructions.
 */
export function buildAvatarPrompt(traits: AvatarTraits): string {
  const lines: string[] = [
    'Bitmoji-style full body cartoon avatar of a single character, front-facing, centered composition.',
    '',
    `CHARACTER: ${traits.ageRange} ${traits.gender} person, ${traits.height} height, ${traits.bodyType} build, ${traits.skinTone} skin tone.`,
  ]

  // FACE section
  const faceParts = [
    `${traits.faceShape} face shape`,
    `${traits.eyebrowShape} eyebrows`,
    `${traits.eyeColor} colored ${traits.eyeShape} eyes`,
    `${traits.nose} nose`,
    `${traits.lipStyle} lips`,
  ]
  let faceSection = `FACE: ${faceParts.join(', ')}.`
  if (traits.frecklesMarks !== 'none') {
    faceSection += ` ${traits.frecklesMarks}.`
  }
  lines.push(faceSection)

  // HAIR section
  if (traits.hairStyle !== 'bald') {
    lines.push(`HAIR: ${traits.hairTexture} ${traits.hairStyle} ${traits.hairColor} hair.`)
  } else {
    lines.push('HAIR: bald head.')
  }

  // EXPRESSION
  lines.push(`EXPRESSION: ${traits.expression} facial expression.`)

  // OUTFIT
  let outfitLine = `OUTFIT: wearing ${traits.clothing} in ${traits.clothingColor}.`
  if (traits.accessories.length > 0) {
    outfitLine += ` Accessories: ${traits.accessories.join(', ')}.`
  }
  lines.push(outfitLine)

  // Conditional sections
  if (traits.facialHair !== 'none') {
    lines.push(`FACIAL HAIR: ${traits.facialHair}.`)
  }
  if (traits.makeup !== 'none') {
    lines.push(`MAKEUP: ${traits.makeup} makeup look.`)
  }
  if (traits.glassesType !== 'none') {
    lines.push(`GLASSES: wearing ${traits.glassesType} glasses.`)
  }
  if (traits.tattoos !== 'none') {
    lines.push(`TATTOOS: ${traits.tattoos} tattoo.`)
  }

  // Style reinforcement
  lines.push('')
  lines.push('Style: clean vector illustration, simple flat shapes, bold outlines, solid colors, exaggerated cartoon proportions.')

  // Background
  if (traits.backgroundColor === 'none') {
    lines.push('Background: transparent.')
  } else if (traits.backgroundColor === 'sunset gradient') {
    lines.push('Background: warm sunset gradient.')
  } else {
    lines.push(`Background: ${traits.backgroundColor}.`)
  }

  return lines.join('\n')
}

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Generate an avatar SVG via the generate-avatar Edge Function.
 * The Recraft API key is kept server-side in Supabase secrets.
 */
export async function generateAvatar(
  options: RecraftGenerationOptions
): Promise<{ svgUrls: string[] }> {
  const { data, error } = await supabase.functions.invoke<{
    svgUrl?: string
    svgUrls?: string[]
    error?: string
  }>(
    'generate-avatar',
    {
      body: {
        prompt: options.prompt,
        style: options.style,
        size: options.size,
      },
    }
  )

  if (error) {
    let msg = error.message || 'Unknown error'
    // FunctionsHttpError stores the Response as context — try to extract the JSON error
    const ctx = (error as any)?.context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const detail = await ctx.json()
        if (detail?.error) msg = detail.error
      } catch {
        // Response body may already be consumed — fall through to generic message
      }
    }
    if (__DEV__) console.error('[generateAvatar] Edge Function error:', msg, error)
    throw new Error(`Avatar generation failed: ${msg}`)
  }

  // Support both new (svgUrls array) and legacy (svgUrl singular) response
  const urls = data?.svgUrls ?? (data?.svgUrl ? [data.svgUrl] : [])

  if (urls.length === 0) {
    if (__DEV__) console.error('[generateAvatar] No svgUrl(s) in response:', data)
    throw new Error('Avatar generation returned no image data')
  }

  return { svgUrls: urls }
}

/**
 * Fetch SVG content from a Recraft-generated URL
 */
export async function fetchSvgContent(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch SVG: ${response.status}`)
  }
  return response.text()
}

// ============================================================================
// TRAIT OPTIONS (for UI selectors)
// ============================================================================

export const GENDER_OPTIONS = [
  { id: 'masculine', label: 'Masculine' },
  { id: 'feminine', label: 'Feminine' },
  { id: 'androgynous', label: 'Androgynous' },
]

export const AGE_RANGE_OPTIONS = [
  { id: 'young adult', label: 'Young Adult' },
  { id: 'adult', label: 'Adult' },
  { id: 'middle-aged', label: 'Middle-Aged' },
  { id: 'mature', label: 'Mature' },
]

export const BODY_TYPE_OPTIONS = [
  { id: 'slim', label: 'Slim' },
  { id: 'petite', label: 'Petite' },
  { id: 'average', label: 'Average' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'curvy', label: 'Curvy' },
  { id: 'tall-slim', label: 'Tall & Slim' },
  { id: 'stocky', label: 'Stocky' },
  { id: 'muscular', label: 'Muscular' },
  { id: 'plus-size', label: 'Plus-size' },
]

export const HEIGHT_OPTIONS = [
  { id: 'short', label: 'Short' },
  { id: 'average', label: 'Average' },
  { id: 'tall', label: 'Tall' },
]

export const SKIN_TONE_OPTIONS = [
  { id: 'very light', label: 'Very Light', color: '#FDEBD0' },
  { id: 'light', label: 'Light', color: '#F5CBA7' },
  { id: 'light medium', label: 'Light Medium', color: '#DEB887' },
  { id: 'medium light', label: 'Medium Light', color: '#D4A574' },
  { id: 'medium', label: 'Medium', color: '#C68642' },
  { id: 'medium tan', label: 'Medium Tan', color: '#A67B5B' },
  { id: 'medium dark', label: 'Medium Dark', color: '#8D5524' },
  { id: 'dark', label: 'Dark', color: '#5C3A1E' },
  { id: 'very dark', label: 'Very Dark', color: '#3B2210' },
]

export const FACE_SHAPE_OPTIONS = [
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'square', label: 'Square' },
  { id: 'heart', label: 'Heart' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'oblong', label: 'Oblong' },
  { id: 'triangle', label: 'Triangle' },
]

export const EYEBROW_SHAPE_OPTIONS = [
  { id: 'thin', label: 'Thin' },
  { id: 'natural', label: 'Natural' },
  { id: 'thick', label: 'Thick' },
  { id: 'arched', label: 'Arched' },
  { id: 'straight', label: 'Straight' },
  { id: 'bushy', label: 'Bushy' },
]

export const EYE_COLOR_OPTIONS = [
  { id: 'brown', label: 'Brown', color: '#634E34' },
  { id: 'dark brown', label: 'Dark Brown', color: '#3B2F2F' },
  { id: 'blue', label: 'Blue', color: '#4A90D9' },
  { id: 'light blue', label: 'Light Blue', color: '#87CEEB' },
  { id: 'green', label: 'Green', color: '#3D9970' },
  { id: 'hazel', label: 'Hazel', color: '#8E7618' },
  { id: 'gray', label: 'Gray', color: '#8B8F8E' },
  { id: 'amber', label: 'Amber', color: '#FFBF00' },
  { id: 'black', label: 'Black', color: '#1C1C1C' },
  { id: 'violet', label: 'Violet', color: '#7F00FF' },
  { id: 'heterochromia', label: 'Heterochromia', color: '#4A90D9' },
  { id: 'honey', label: 'Honey', color: '#EB9605' },
]

export const EYE_SHAPE_OPTIONS = [
  { id: 'round', label: 'Round' },
  { id: 'almond', label: 'Almond' },
  { id: 'hooded', label: 'Hooded' },
  { id: 'monolid', label: 'Monolid' },
  { id: 'downturned', label: 'Downturned' },
  { id: 'upturned', label: 'Upturned' },
  { id: 'deep-set', label: 'Deep-set' },
  { id: 'wide-set', label: 'Wide-set' },
]

export const NOSE_OPTIONS = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'prominent', label: 'Prominent' },
  { id: 'button', label: 'Button' },
  { id: 'wide', label: 'Wide' },
  { id: 'upturned', label: 'Upturned' },
  { id: 'aquiline', label: 'Aquiline' },
  { id: 'flat', label: 'Flat' },
]

export const LIP_STYLE_OPTIONS = [
  { id: 'thin', label: 'Thin' },
  { id: 'medium', label: 'Medium' },
  { id: 'full', label: 'Full' },
  { id: "cupid's bow", label: "Cupid's Bow" },
  { id: 'wide', label: 'Wide' },
  { id: 'asymmetric', label: 'Asymmetric' },
  { id: 'bow-shaped', label: 'Bow-shaped' },
  { id: 'downturned', label: 'Downturned' },
]

export const FACIAL_HAIR_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'short beard', label: 'Short Beard' },
  { id: 'full beard', label: 'Full Beard' },
  { id: 'goatee', label: 'Goatee' },
  { id: 'mustache', label: 'Mustache' },
  { id: 'handlebar mustache', label: 'Handlebar' },
  { id: 'mutton chops', label: 'Mutton Chops' },
  { id: 'chin strap', label: 'Chin Strap' },
  { id: 'soul patch', label: 'Soul Patch' },
]

export const FRECKLES_MARKS_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'freckles', label: 'Freckles' },
  { id: 'beauty mark', label: 'Beauty Mark' },
  { id: 'dimples', label: 'Dimples' },
  { id: 'birthmark', label: 'Birthmark' },
]

export const HAIR_STYLE_OPTIONS = [
  { id: 'short', label: 'Short' },
  { id: 'medium length', label: 'Medium' },
  { id: 'long', label: 'Long' },
  { id: 'bald', label: 'Bald' },
  { id: 'braided', label: 'Braids' },
  { id: 'afro', label: 'Afro' },
  { id: 'buzzcut', label: 'Buzzcut' },
  { id: 'locs', label: 'Locs' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'pixie cut', label: 'Pixie Cut' },
  { id: 'bob', label: 'Bob' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'man bun', label: 'Man Bun' },
  { id: 'side part', label: 'Side Part' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'cornrows', label: 'Cornrows' },
  { id: 'space buns', label: 'Space Buns' },
  { id: 'shag', label: 'Shag' },
  { id: 'curtain bangs', label: 'Curtain Bangs' },
  { id: 'wolf cut', label: 'Wolf Cut' },
  { id: 'mullet', label: 'Mullet' },
]

export const HAIR_TEXTURE_OPTIONS = [
  { id: 'straight', label: 'Straight' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'curly', label: 'Curly' },
  { id: 'coily', label: 'Coily' },
  { id: 'kinky', label: 'Kinky' },
]

export const HAIR_COLOR_OPTIONS = [
  { id: 'black', label: 'Black', color: '#1C1C1C' },
  { id: 'dark brown', label: 'Dark Brown', color: '#3B2F2F' },
  { id: 'brown', label: 'Brown', color: '#6B4226' },
  { id: 'light brown', label: 'Light Brown', color: '#A0785A' },
  { id: 'blonde', label: 'Blonde', color: '#E8D44D' },
  { id: 'platinum', label: 'Platinum', color: '#E5E4E2' },
  { id: 'strawberry blonde', label: 'Strawberry Blonde', color: '#D4A76A' },
  { id: 'red', label: 'Red', color: '#B7410E' },
  { id: 'auburn', label: 'Auburn', color: '#922724' },
  { id: 'gray', label: 'Gray', color: '#9E9E9E' },
  { id: 'white', label: 'White', color: '#E8E8E8' },
  { id: 'blue', label: 'Blue', color: '#4A90D9' },
  { id: 'pink', label: 'Pink', color: '#FF69B4' },
  { id: 'purple', label: 'Purple', color: '#8B5CF6' },
  { id: 'green', label: 'Green', color: '#22C55E' },
  { id: 'ombre', label: 'Ombre', color: '#8B6914' },
]

export const EXPRESSION_OPTIONS = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'cool', label: 'Cool' },
  { id: 'mysterious', label: 'Mysterious' },
  { id: 'playful', label: 'Playful' },
  { id: 'chill', label: 'Chill' },
  { id: 'confident', label: 'Confident' },
  { id: 'shy', label: 'Shy' },
  { id: 'sassy', label: 'Sassy' },
  { id: 'dreamy', label: 'Dreamy' },
  { id: 'smirking', label: 'Smirking' },
  { id: 'winking', label: 'Winking' },
]

export const CLOTHING_OPTIONS = [
  { id: 'casual t-shirt', label: 'Casual' },
  { id: 'formal shirt', label: 'Formal' },
  { id: 'sporty outfit', label: 'Sporty' },
  { id: 'artsy outfit', label: 'Artsy' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'leather jacket', label: 'Leather Jacket' },
  { id: 'denim jacket', label: 'Denim Jacket' },
  { id: 'crop top', label: 'Crop Top' },
  { id: 'sweater', label: 'Sweater' },
  { id: 'tank top', label: 'Tank Top' },
  { id: 'blazer', label: 'Blazer' },
  { id: 'flannel', label: 'Flannel' },
  { id: 'sundress', label: 'Sundress' },
  { id: 'overalls', label: 'Overalls' },
  { id: 'turtleneck', label: 'Turtleneck' },
  { id: 'graphic tee', label: 'Graphic Tee' },
  { id: 'cardigan', label: 'Cardigan' },
  { id: 'jumpsuit', label: 'Jumpsuit' },
]

export const CLOTHING_COLOR_OPTIONS = [
  { id: 'black', label: 'Black', color: '#1C1C1C' },
  { id: 'white', label: 'White', color: '#F5F5F5' },
  { id: 'navy', label: 'Navy', color: '#1E3A5F' },
  { id: 'red', label: 'Red', color: '#DC2626' },
  { id: 'forest green', label: 'Green', color: '#166534' },
  { id: 'burgundy', label: 'Burgundy', color: '#800020' },
  { id: 'pastel pink', label: 'Pink', color: '#F9A8D4' },
  { id: 'mustard', label: 'Mustard', color: '#CA8A04' },
  { id: 'lavender', label: 'Lavender', color: '#C4B5FD' },
  { id: 'denim blue', label: 'Denim', color: '#4A6FA5' },
]

export const ACCESSORY_OPTIONS = [
  { id: 'hat', label: 'Hat' },
  { id: 'earrings', label: 'Earrings' },
  { id: 'headband', label: 'Headband' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'nose ring', label: 'Nose Ring' },
  { id: 'choker', label: 'Choker' },
  { id: 'watch', label: 'Watch' },
  { id: 'bandana', label: 'Bandana' },
  { id: 'necklace', label: 'Necklace' },
  { id: 'bracelets', label: 'Bracelets' },
  { id: 'lip ring', label: 'Lip Ring' },
  { id: 'eyebrow piercing', label: 'Brow Piercing' },
  { id: 'hair clips', label: 'Hair Clips' },
  { id: 'sunglasses', label: 'Sunglasses' },
]

export const GLASSES_TYPE_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'round', label: 'Round' },
  { id: 'square', label: 'Square' },
  { id: 'cat-eye', label: 'Cat-Eye' },
  { id: 'aviator', label: 'Aviator' },
  { id: 'wireframe', label: 'Wireframe' },
  { id: 'reading', label: 'Reading' },
]

export const MAKEUP_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'natural', label: 'Natural' },
  { id: 'glamorous', label: 'Glamorous' },
  { id: 'bold lip', label: 'Bold Lip' },
  { id: 'smoky eye', label: 'Smoky Eye' },
  { id: 'winged eyeliner', label: 'Winged Liner' },
  { id: 'blush emphasis', label: 'Blush' },
  { id: 'no-makeup-makeup', label: 'No-Makeup Look' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'goth', label: 'Goth' },
]

export const TATTOOS_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'arm sleeve', label: 'Arm Sleeve' },
  { id: 'small wrist', label: 'Small Wrist' },
  { id: 'neck', label: 'Neck' },
  { id: 'hand', label: 'Hand' },
]

export const BACKGROUND_COLOR_OPTIONS = [
  { id: 'white', label: 'White', color: '#FFFFFF' },
  { id: 'light blue', label: 'Light Blue', color: '#DBEAFE' },
  { id: 'pink', label: 'Pink', color: '#FCE7F3' },
  { id: 'mint', label: 'Mint', color: '#D1FAE5' },
  { id: 'lavender', label: 'Lavender', color: '#EDE9FE' },
  { id: 'sunset gradient', label: 'Sunset', color: '#FDE68A' },
  { id: 'none', label: 'Transparent', color: '#1C1C24' },
]

// ============================================================================
// TAB GROUPINGS
// ============================================================================

export type TabId = 'basics' | 'face' | 'hair' | 'style' | 'extras'

export const AVATAR_TABS: Array<{ id: TabId; label: string }> = [
  { id: 'basics', label: 'Basics' },
  { id: 'face', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'style', label: 'Style' },
  { id: 'extras', label: 'Extras' },
]

/** Onboarding uses a reduced tab set */
export const ONBOARDING_TABS: Array<{ id: TabId; label: string }> = [
  { id: 'basics', label: 'Basics' },
  { id: 'face', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'style', label: 'Style' },
]
