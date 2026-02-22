/**
 * Expression Presets
 *
 * Pre-defined combinations of eye, eyebrow, and mouth styles
 * that create recognizable emotional expressions.
 */

import {
  EyeStyle,
  EyebrowStyle,
  MouthStyle,
} from '../types';
import {
  ExpressionPreset,
  Emotion,
  StickerProp,
} from '../stickers/types';

// =============================================================================
// EXPRESSION PRESETS
// =============================================================================

export const EXPRESSION_PRESETS: ExpressionPreset[] = [
  // HAPPY EXPRESSIONS
  {
    id: 'happy_smile',
    name: 'Happy Smile',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.SMILE,
  },
  {
    id: 'happy_closed_eyes',
    name: 'Blissful',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.BIG_SMILE,
  },
  {
    id: 'content',
    name: 'Content',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.SMILE,
  },

  // EXCITED EXPRESSIONS
  {
    id: 'excited',
    name: 'Excited',
    emotion: Emotion.EXCITED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.BIG_SMILE,
    effects: [StickerProp.SPARKLES],
  },
  {
    id: 'overjoyed',
    name: 'Overjoyed',
    emotion: Emotion.EXCITED,
    eyeStyle: EyeStyle.STARS,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.LAUGH,
    effects: [StickerProp.SPARKLES],
  },

  // LAUGHING EXPRESSIONS
  {
    id: 'laughing',
    name: 'Laughing',
    emotion: Emotion.LAUGHING,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.LAUGH,
  },
  {
    id: 'giggling',
    name: 'Giggling',
    emotion: Emotion.LAUGHING,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.GRIN,
  },
  {
    id: 'lol',
    name: 'LOL',
    emotion: Emotion.LAUGHING,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.OPEN,
    effects: [StickerProp.TEARS],
  },

  // LOVE EXPRESSIONS
  {
    id: 'love',
    name: 'In Love',
    emotion: Emotion.LOVE,
    eyeStyle: EyeStyle.HEARTS,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SMILE,
    effects: [StickerProp.HEART],
  },
  {
    id: 'adoring',
    name: 'Adoring',
    emotion: Emotion.LOVE,
    eyeStyle: EyeStyle.HEARTS,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.BIG_SMILE,
  },
  {
    id: 'kiss',
    name: 'Blowing Kiss',
    emotion: Emotion.LOVE,
    eyeStyle: EyeStyle.WINK,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.KISS,
    effects: [StickerProp.HEART],
  },

  // COOL EXPRESSIONS
  {
    id: 'cool',
    name: 'Cool',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.SMIRK,
  },
  {
    id: 'confident',
    name: 'Confident',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.ARCHED,
    mouthStyle: MouthStyle.SMIRK,
  },

  // WINK EXPRESSIONS
  {
    id: 'wink',
    name: 'Wink',
    emotion: Emotion.WINK,
    eyeStyle: EyeStyle.WINK,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.SMILE,
  },
  {
    id: 'flirty_wink',
    name: 'Flirty Wink',
    emotion: Emotion.WINK,
    eyeStyle: EyeStyle.WINK,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SMIRK,
  },

  // SAD EXPRESSIONS
  {
    id: 'sad',
    name: 'Sad',
    emotion: Emotion.SAD,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.SAD,
  },
  {
    id: 'disappointed',
    name: 'Disappointed',
    emotion: Emotion.SAD,
    eyeStyle: EyeStyle.SLEEPY,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'down',
    name: 'Feeling Down',
    emotion: Emotion.SAD,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.SAD,
  },

  // CRYING EXPRESSIONS
  {
    id: 'crying',
    name: 'Crying',
    emotion: Emotion.CRYING,
    eyeStyle: EyeStyle.CRY,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.SAD,
    effects: [StickerProp.TEARS],
  },
  {
    id: 'sobbing',
    name: 'Sobbing',
    emotion: Emotion.CRYING,
    eyeStyle: EyeStyle.CRY,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.OPEN,
    effects: [StickerProp.TEARS],
  },
  {
    id: 'happy_tears',
    name: 'Happy Tears',
    emotion: Emotion.CRYING,
    eyeStyle: EyeStyle.CRY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.BIG_SMILE,
    effects: [StickerProp.TEARS],
  },

  // ANGRY EXPRESSIONS
  {
    id: 'angry',
    name: 'Angry',
    emotion: Emotion.ANGRY,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.ANGRY,
    mouthStyle: MouthStyle.FROWN,
    effects: [StickerProp.ANGER_VEIN],
  },
  {
    id: 'furious',
    name: 'Furious',
    emotion: Emotion.ANGRY,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.ANGRY,
    mouthStyle: MouthStyle.SCREAM,
    effects: [StickerProp.ANGER_VEIN, StickerProp.FIRE],
  },
  {
    id: 'grumpy',
    name: 'Grumpy',
    emotion: Emotion.ANGRY,
    eyeStyle: EyeStyle.SQUINT,
    eyebrowStyle: EyebrowStyle.ANGRY,
    mouthStyle: MouthStyle.GRIMACE,
  },

  // ANNOYED EXPRESSIONS
  {
    id: 'annoyed',
    name: 'Annoyed',
    emotion: Emotion.ANNOYED,
    eyeStyle: EyeStyle.ROLL,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.SERIOUS,
  },
  {
    id: 'unimpressed',
    name: 'Unimpressed',
    emotion: Emotion.ANNOYED,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'eye_roll',
    name: 'Eye Roll',
    emotion: Emotion.ANNOYED,
    eyeStyle: EyeStyle.ROLL,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SMIRK,
  },

  // SURPRISED EXPRESSIONS
  {
    id: 'surprised',
    name: 'Surprised',
    emotion: Emotion.SURPRISED,
    eyeStyle: EyeStyle.SURPRISED,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SURPRISED,
  },
  {
    id: 'gasping',
    name: 'Gasping',
    emotion: Emotion.SURPRISED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.OPEN,
  },

  // SHOCKED EXPRESSIONS
  {
    id: 'shocked',
    name: 'Shocked',
    emotion: Emotion.SHOCKED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SCREAM,
    effects: [StickerProp.LIGHTNING],
  },
  {
    id: 'mind_blown',
    name: 'Mind Blown',
    emotion: Emotion.SHOCKED,
    eyeStyle: EyeStyle.STARS,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.OPEN,
    effects: [StickerProp.SPARKLES],
  },

  // CONFUSED EXPRESSIONS
  {
    id: 'confused',
    name: 'Confused',
    emotion: Emotion.CONFUSED,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.CONCERNED,
    effects: [StickerProp.QUESTION_MARK],
  },
  {
    id: 'puzzled',
    name: 'Puzzled',
    emotion: Emotion.CONFUSED,
    eyeStyle: EyeStyle.SQUINT,
    eyebrowStyle: EyebrowStyle.SKEPTICAL,
    mouthStyle: MouthStyle.SERIOUS,
    effects: [StickerProp.QUESTION_MARK],
  },

  // THINKING EXPRESSIONS
  {
    id: 'thinking',
    name: 'Thinking',
    emotion: Emotion.THINKING,
    eyeStyle: EyeStyle.SIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SERIOUS,
  },
  {
    id: 'pondering',
    name: 'Pondering',
    emotion: Emotion.THINKING,
    eyeStyle: EyeStyle.SIDE,
    eyebrowStyle: EyebrowStyle.SKEPTICAL,
    mouthStyle: MouthStyle.CONCERNED,
  },

  // SKEPTICAL EXPRESSIONS
  {
    id: 'skeptical',
    name: 'Skeptical',
    emotion: Emotion.SKEPTICAL,
    eyeStyle: EyeStyle.SQUINT,
    eyebrowStyle: EyebrowStyle.SKEPTICAL,
    mouthStyle: MouthStyle.SMIRK,
  },
  {
    id: 'doubtful',
    name: 'Doubtful',
    emotion: Emotion.SKEPTICAL,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.SKEPTICAL,
    mouthStyle: MouthStyle.FROWN,
  },

  // EMBARRASSED EXPRESSIONS
  {
    id: 'embarrassed',
    name: 'Embarrassed',
    emotion: Emotion.EMBARRASSED,
    eyeStyle: EyeStyle.SIDE,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.GRIMACE,
    effects: [StickerProp.SWEAT_DROP],
  },
  {
    id: 'blushing',
    name: 'Blushing',
    emotion: Emotion.EMBARRASSED,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.SMILE,
  },

  // NERVOUS EXPRESSIONS
  {
    id: 'nervous',
    name: 'Nervous',
    emotion: Emotion.NERVOUS,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.GRIMACE,
    effects: [StickerProp.SWEAT_DROP],
  },
  {
    id: 'anxious',
    name: 'Anxious',
    emotion: Emotion.NERVOUS,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.CONCERNED,
    effects: [StickerProp.SWEAT_DROP],
  },

  // SLEEPY EXPRESSIONS
  {
    id: 'sleepy',
    name: 'Sleepy',
    emotion: Emotion.SLEEPY,
    eyeStyle: EyeStyle.SLEEPY,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.DEFAULT,
    effects: [StickerProp.ZZZ],
  },
  {
    id: 'exhausted',
    name: 'Exhausted',
    emotion: Emotion.SLEEPY,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.FROWN,
    effects: [StickerProp.ZZZ],
  },
  {
    id: 'yawning',
    name: 'Yawning',
    emotion: Emotion.SLEEPY,
    eyeStyle: EyeStyle.SLEEPY,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.OPEN,
  },

  // SICK EXPRESSIONS
  {
    id: 'sick',
    name: 'Sick',
    emotion: Emotion.SICK,
    eyeStyle: EyeStyle.SLEEPY,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'dizzy',
    name: 'Dizzy',
    emotion: Emotion.SICK,
    eyeStyle: EyeStyle.DIZZY,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.GRIMACE,
  },

  // NEUTRAL EXPRESSIONS
  {
    id: 'neutral',
    name: 'Neutral',
    emotion: Emotion.NEUTRAL,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.DEFAULT,
  },
  {
    id: 'blank',
    name: 'Blank',
    emotion: Emotion.NEUTRAL,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.SERIOUS,
  },

  // ============================================================================
  // PHASE 2.1 EXPANSION - Additional Expressions
  // ============================================================================

  // MORE HAPPY EXPRESSIONS
  {
    id: 'beaming',
    name: 'Beaming',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.GRIN,
    effects: [StickerProp.SPARKLES],
  },
  {
    id: 'cheerful',
    name: 'Cheerful',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.ROUND,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.BIG_SMILE,
  },
  {
    id: 'pleased',
    name: 'Pleased',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.SMIRK,
  },
  {
    id: 'gleeful',
    name: 'Gleeful',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.LAUGH,
  },
  {
    id: 'delighted',
    name: 'Delighted',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SMILE,
  },

  // MORE LOVE EXPRESSIONS
  {
    id: 'smitten',
    name: 'Smitten',
    emotion: Emotion.LOVE,
    eyeStyle: EyeStyle.HEARTS,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.GRIN,
    effects: [StickerProp.HEART],
  },
  {
    id: 'lovestruck',
    name: 'Lovestruck',
    emotion: Emotion.LOVE,
    eyeStyle: EyeStyle.HEARTS,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.SURPRISED,
    effects: [StickerProp.HEART, StickerProp.SPARKLES],
  },
  {
    id: 'flirty',
    name: 'Flirty',
    emotion: Emotion.LOVE,
    eyeStyle: EyeStyle.WINK,
    eyebrowStyle: EyebrowStyle.ARCHED,
    mouthStyle: MouthStyle.SMIRK,
  },
  {
    id: 'biting_lip',
    name: 'Biting Lip',
    emotion: Emotion.LOVE,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.BITE,
  },

  // PLAYFUL EXPRESSIONS
  {
    id: 'mischievous',
    name: 'Mischievous',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.ARCHED,
    mouthStyle: MouthStyle.GRIN,
  },
  {
    id: 'cheeky',
    name: 'Cheeky',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.WINK,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.TONGUE,
  },
  {
    id: 'silly',
    name: 'Silly',
    emotion: Emotion.LAUGHING,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.TONGUE,
  },
  {
    id: 'goofy',
    name: 'Goofy',
    emotion: Emotion.LAUGHING,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.TONGUE,
  },
  {
    id: 'teasing',
    name: 'Teasing',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.WINK,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.TONGUE,
  },

  // MORE ANGRY/FRUSTRATED EXPRESSIONS
  {
    id: 'frustrated',
    name: 'Frustrated',
    emotion: Emotion.ANGRY,
    eyeStyle: EyeStyle.SQUINT,
    eyebrowStyle: EyebrowStyle.ANGRY,
    mouthStyle: MouthStyle.GRIMACE,
  },
  {
    id: 'livid',
    name: 'Livid',
    emotion: Emotion.ANGRY,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.ANGRY,
    mouthStyle: MouthStyle.FROWN,
    effects: [StickerProp.ANGER_VEIN, StickerProp.FIRE],
  },
  {
    id: 'seething',
    name: 'Seething',
    emotion: Emotion.ANGRY,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.ANGRY,
    mouthStyle: MouthStyle.SERIOUS,
    effects: [StickerProp.ANGER_VEIN],
  },
  {
    id: 'exasperated',
    name: 'Exasperated',
    emotion: Emotion.ANNOYED,
    eyeStyle: EyeStyle.ROLL,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'fed_up',
    name: 'Fed Up',
    emotion: Emotion.ANNOYED,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.GRIMACE,
  },

  // MORE SAD EXPRESSIONS
  {
    id: 'heartbroken',
    name: 'Heartbroken',
    emotion: Emotion.SAD,
    eyeStyle: EyeStyle.CRY,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.FROWN,
    effects: [StickerProp.TEARS],
  },
  {
    id: 'melancholic',
    name: 'Melancholic',
    emotion: Emotion.SAD,
    eyeStyle: EyeStyle.SLEEPY,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.SAD,
  },
  {
    id: 'hopeless',
    name: 'Hopeless',
    emotion: Emotion.SAD,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'wistful',
    name: 'Wistful',
    emotion: Emotion.SAD,
    eyeStyle: EyeStyle.SIDE,
    eyebrowStyle: EyebrowStyle.NATURAL,
    mouthStyle: MouthStyle.CONCERNED,
  },

  // SCARED/FEAR EXPRESSIONS
  {
    id: 'scared',
    name: 'Scared',
    emotion: Emotion.SHOCKED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.GRIMACE,
    effects: [StickerProp.SWEAT_DROP],
  },
  {
    id: 'terrified',
    name: 'Terrified',
    emotion: Emotion.SHOCKED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SCREAM,
    effects: [StickerProp.SWEAT_DROP],
  },
  {
    id: 'petrified',
    name: 'Petrified',
    emotion: Emotion.SHOCKED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.OPEN,
  },
  {
    id: 'spooked',
    name: 'Spooked',
    emotion: Emotion.SHOCKED,
    eyeStyle: EyeStyle.SURPRISED,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SURPRISED,
    effects: [StickerProp.SWEAT_DROP],
  },

  // DETERMINED/FOCUSED EXPRESSIONS
  {
    id: 'determined',
    name: 'Determined',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.SERIOUS,
  },
  {
    id: 'focused',
    name: 'Focused',
    emotion: Emotion.THINKING,
    eyeStyle: EyeStyle.SQUINT,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.SERIOUS,
  },
  {
    id: 'resolute',
    name: 'Resolute',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'intense',
    name: 'Intense',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.ANGRY,
    mouthStyle: MouthStyle.SERIOUS,
  },

  // BORED/TIRED EXPRESSIONS
  {
    id: 'bored',
    name: 'Bored',
    emotion: Emotion.NEUTRAL,
    eyeStyle: EyeStyle.SLEEPY,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'unamused',
    name: 'Unamused',
    emotion: Emotion.ANNOYED,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.SERIOUS,
  },
  {
    id: 'done',
    name: 'Done',
    emotion: Emotion.ANNOYED,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.FLAT,
    mouthStyle: MouthStyle.SERIOUS,
  },
  {
    id: 'drained',
    name: 'Drained',
    emotion: Emotion.SLEEPY,
    eyeStyle: EyeStyle.SLEEPY,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.SAD,
  },

  // SMUG/PROUD EXPRESSIONS
  {
    id: 'smug',
    name: 'Smug',
    emotion: Emotion.COOL,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.ARCHED,
    mouthStyle: MouthStyle.SMIRK,
  },
  {
    id: 'proud',
    name: 'Proud',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.BIG_SMILE,
  },
  {
    id: 'accomplished',
    name: 'Accomplished',
    emotion: Emotion.HAPPY,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.GRIN,
    effects: [StickerProp.SPARKLES],
  },
  {
    id: 'victorious',
    name: 'Victorious',
    emotion: Emotion.EXCITED,
    eyeStyle: EyeStyle.HAPPY,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.LAUGH,
    effects: [StickerProp.SPARKLES],
  },

  // CURIOUS/INTERESTED EXPRESSIONS
  {
    id: 'curious',
    name: 'Curious',
    emotion: Emotion.THINKING,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.DEFAULT,
    effects: [StickerProp.QUESTION_MARK],
  },
  {
    id: 'intrigued',
    name: 'Intrigued',
    emotion: Emotion.THINKING,
    eyeStyle: EyeStyle.NARROW,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SMIRK,
  },
  {
    id: 'fascinated',
    name: 'Fascinated',
    emotion: Emotion.SURPRISED,
    eyeStyle: EyeStyle.STARS,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SMILE,
    effects: [StickerProp.SPARKLES],
  },
  {
    id: 'attentive',
    name: 'Attentive',
    emotion: Emotion.THINKING,
    eyeStyle: EyeStyle.DEFAULT,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SERIOUS,
  },

  // AWKWARD EXPRESSIONS
  {
    id: 'awkward',
    name: 'Awkward',
    emotion: Emotion.EMBARRASSED,
    eyeStyle: EyeStyle.SIDE,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.GRIMACE,
    effects: [StickerProp.SWEAT_DROP],
  },
  {
    id: 'cringe',
    name: 'Cringe',
    emotion: Emotion.EMBARRASSED,
    eyeStyle: EyeStyle.SQUINT,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.GRIMACE,
  },
  {
    id: 'sheepish',
    name: 'Sheepish',
    emotion: Emotion.EMBARRASSED,
    eyeStyle: EyeStyle.CLOSED,
    eyebrowStyle: EyebrowStyle.CONCERNED,
    mouthStyle: MouthStyle.SMILE,
    effects: [StickerProp.SWEAT_DROP],
  },
  {
    id: 'guilty',
    name: 'Guilty',
    emotion: Emotion.EMBARRASSED,
    eyeStyle: EyeStyle.SIDE,
    eyebrowStyle: EyebrowStyle.SAD,
    mouthStyle: MouthStyle.CONCERNED,
    effects: [StickerProp.SWEAT_DROP],
  },

  // DISBELIEF/INCREDULOUS EXPRESSIONS
  {
    id: 'disbelief',
    name: 'Disbelief',
    emotion: Emotion.SURPRISED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.FROWN,
  },
  {
    id: 'incredulous',
    name: 'Incredulous',
    emotion: Emotion.SKEPTICAL,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.SKEPTICAL,
    mouthStyle: MouthStyle.SURPRISED,
  },
  {
    id: 'wtf',
    name: 'WTF',
    emotion: Emotion.CONFUSED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.OPEN,
    effects: [StickerProp.QUESTION_MARK],
  },
  {
    id: 'jaw_drop',
    name: 'Jaw Drop',
    emotion: Emotion.SHOCKED,
    eyeStyle: EyeStyle.WIDE,
    eyebrowStyle: EyebrowStyle.RAISED,
    mouthStyle: MouthStyle.SCREAM,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all presets for a specific emotion
 */
export function getPresetsForEmotion(emotion: Emotion): ExpressionPreset[] {
  return EXPRESSION_PRESETS.filter((preset) => preset.emotion === emotion);
}

/**
 * Get a preset by its ID
 */
export function getPresetById(id: string): ExpressionPreset | undefined {
  return EXPRESSION_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get the default preset for an emotion
 */
export function getDefaultPresetForEmotion(emotion: Emotion): ExpressionPreset | undefined {
  return EXPRESSION_PRESETS.find((preset) => preset.emotion === emotion);
}

/**
 * Search presets by name
 */
export function searchPresets(query: string): ExpressionPreset[] {
  const lowerQuery = query.toLowerCase();
  return EXPRESSION_PRESETS.filter(
    (preset) =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.emotion.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all unique emotions that have presets
 */
export function getAvailableEmotions(): Emotion[] {
  return [...new Set(EXPRESSION_PRESETS.map((preset) => preset.emotion))];
}

/**
 * Apply an expression preset to an avatar config
 */
export function applyExpressionPreset<T extends { eyeStyle?: unknown; eyebrowStyle?: unknown; mouthStyle?: unknown }>(
  config: T,
  preset: ExpressionPreset
): T {
  return {
    ...config,
    eyeStyle: preset.eyeStyle,
    eyebrowStyle: preset.eyebrowStyle,
    mouthStyle: preset.mouthStyle,
  };
}
