/**
 * Expression Coherence Validator
 * Ensures facial feature combinations are visually coherent
 */

import { EyeStyle, MouthStyle, EyebrowStyle } from '../types';

interface ExpressionGroup {
  eyes: EyeStyle[];
  mouths: MouthStyle[];
  eyebrows: EyebrowStyle[];
}

// Compatible expression groups
const HAPPY_GROUP: ExpressionGroup = {
  eyes: [EyeStyle.HAPPY, EyeStyle.STARS, EyeStyle.WINK, EyeStyle.WINK_LEFT, EyeStyle.DEFAULT],
  mouths: [MouthStyle.SMILE, MouthStyle.BIG_SMILE, MouthStyle.GRIN, MouthStyle.LAUGH, MouthStyle.DEFAULT],
  eyebrows: [EyebrowStyle.RAISED, EyebrowStyle.DEFAULT, EyebrowStyle.NATURAL],
};

const SAD_GROUP: ExpressionGroup = {
  eyes: [EyeStyle.CRY, EyeStyle.SLEEPY, EyeStyle.DEFAULT],
  mouths: [MouthStyle.FROWN, MouthStyle.SAD, MouthStyle.SERIOUS, MouthStyle.DEFAULT],
  eyebrows: [EyebrowStyle.SAD, EyebrowStyle.CONCERNED, EyebrowStyle.DEFAULT, EyebrowStyle.NATURAL],
};

const ANGRY_GROUP: ExpressionGroup = {
  eyes: [EyeStyle.NARROW, EyeStyle.SQUINT, EyeStyle.DEFAULT],
  mouths: [MouthStyle.FROWN, MouthStyle.GRIMACE, MouthStyle.SERIOUS, MouthStyle.DEFAULT],
  eyebrows: [EyebrowStyle.ANGRY, EyebrowStyle.FLAT, EyebrowStyle.DEFAULT, EyebrowStyle.NATURAL],
};

const EXPRESSION_GROUPS = [HAPPY_GROUP, SAD_GROUP, ANGRY_GROUP];

/**
 * Checks if an expression combination is coherent.
 * Returns the original values if coherent, or adjusted values if not.
 *
 * Strategy: If eyes belong to one emotional group but mouth belongs to
 * a conflicting group, we adjust the mouth to match the eye emotion
 * (eyes are more prominent in conveying emotion).
 */
export function validateExpression(
  eyes: EyeStyle,
  mouth: MouthStyle,
  eyebrows: EyebrowStyle
): { eyes: EyeStyle; mouth: MouthStyle; eyebrows: EyebrowStyle } {
  // Find which group the eyes belong to
  const eyeGroup = EXPRESSION_GROUPS.find((g) => g.eyes.includes(eyes));
  if (!eyeGroup) return { eyes, mouth, eyebrows }; // Unknown style, pass through

  // Check if mouth is compatible with the eye group
  const mouthCompatible = eyeGroup.mouths.includes(mouth);

  // Check if eyebrows are compatible
  const eyebrowCompatible = eyeGroup.eyebrows.includes(eyebrows);

  return {
    eyes,
    mouth: mouthCompatible ? mouth : eyeGroup.mouths[eyeGroup.mouths.length - 1], // fallback to DEFAULT
    eyebrows: eyebrowCompatible ? eyebrows : eyeGroup.eyebrows[eyeGroup.eyebrows.length - 1],
  };
}
