/**
 * ExpressionRenderer - Applies expression presets to avatar rendering
 *
 * This component takes an expression preset and renders the corresponding
 * eye, eyebrow, and mouth styles with optional effects.
 */

import React from 'react';
import { G } from 'react-native-svg';
import { AvatarConfig, EyeStyle, EyebrowStyle, MouthStyle } from '../types';
import { ExpressionPreset, StickerProp } from '../stickers/types';
import { Eyes } from './Eyes';
import { Eyebrows } from './Eyebrows';
import { Mouth } from './Mouth';

interface ExpressionRendererProps {
  /** Expression preset to apply */
  preset: ExpressionPreset;
  /** Avatar configuration for colors and styles */
  config: AvatarConfig;
  /** Position transforms */
  transforms?: {
    eyeY?: number;
    eyeScale?: number;
    eyebrowY?: number;
    mouthY?: number;
    mouthScale?: number;
  };
}

/**
 * Default position values matching Avatar.tsx
 */
const DEFAULT_TRANSFORMS = {
  eyeY: 44,
  eyeScale: 1,
  eyebrowY: 36,
  mouthY: 65,
  mouthScale: 1,
};

/**
 * ExpressionRenderer applies expression presets to render facial features
 * with the correct emotional styling.
 */
export function ExpressionRenderer({
  preset,
  config,
  transforms = DEFAULT_TRANSFORMS,
}: ExpressionRendererProps) {
  const eyeY = transforms.eyeY ?? DEFAULT_TRANSFORMS.eyeY;
  const eyeScale = transforms.eyeScale ?? DEFAULT_TRANSFORMS.eyeScale;
  const eyebrowY = transforms.eyebrowY ?? DEFAULT_TRANSFORMS.eyebrowY;
  const mouthY = transforms.mouthY ?? DEFAULT_TRANSFORMS.mouthY;
  const mouthScale = transforms.mouthScale ?? DEFAULT_TRANSFORMS.mouthScale;

  const eyebrowColor = config.eyebrowColor || config.hairColor;

  return (
    <G>
      {/* Mouth with expression style */}
      <G transform={`translate(0, ${mouthY - 65}) scale(${mouthScale})`} origin="50, 65">
        <Mouth
          style={preset.mouthStyle as MouthStyle}
          lipColor={config.lipColor}
        />
      </G>

      {/* Eyes with expression style */}
      <G transform={`translate(0, ${eyeY - 44}) scale(${eyeScale})`} origin="50, 44">
        <Eyes
          style={preset.eyeStyle as EyeStyle}
          eyeColor={config.eyeColor}
          rightEyeColor={config.rightEyeColor}
          eyelashStyle={config.eyelashStyle}
        />
      </G>

      {/* Eyebrows with expression style */}
      <G transform={`translate(0, ${eyebrowY - 36})`}>
        <Eyebrows
          style={preset.eyebrowStyle as EyebrowStyle}
          eyebrowColor={eyebrowColor}
        />
      </G>
    </G>
  );
}

/**
 * Applies an expression preset to an avatar config
 * Returns a new config with the expression styles applied
 */
export function applyExpressionToConfig(
  config: AvatarConfig,
  preset: ExpressionPreset
): AvatarConfig {
  return {
    ...config,
    eyeStyle: preset.eyeStyle as EyeStyle,
    eyebrowStyle: preset.eyebrowStyle as EyebrowStyle,
    mouthStyle: preset.mouthStyle as MouthStyle,
  };
}

/**
 * Get expression-related effects that should be rendered
 */
export function getExpressionEffects(preset: ExpressionPreset): StickerProp[] {
  return preset.effects || [];
}

export default ExpressionRenderer;
