/**
 * Makeup Component - Renders eyeshadow, eyeliner, lipstick, and blush
 */

import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { EyeshadowStyle, EyelinerStyle, LipstickStyle, BlushStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type MakeupGradientIds = {
  eyeshadowLeft: string;
  eyeshadowRight: string;
  lipstick: string;
  blushLeft: string;
  blushRight: string;
};

interface MakeupProps {
  eyeshadowStyle?: EyeshadowStyle;
  eyeshadowColor?: string;
  eyelinerStyle?: EyelinerStyle;
  eyelinerColor?: string;
  lipstickStyle?: LipstickStyle;
  lipstickColor?: string;
  blushStyle?: BlushStyle;
  blushColor?: string;
  skinTone?: string;
}

// Eye positions
const LEFT_EYE_X = 38;
const RIGHT_EYE_X = 62;
const EYE_Y = 44;

function Eyeshadow({ style, color, gradientIdLeft, gradientIdRight }: { style: EyeshadowStyle; color: string; gradientIdLeft: string; gradientIdRight: string }) {
  if (style === EyeshadowStyle.NONE) return null;

  const gradientId1 = gradientIdLeft;
  const gradientId2 = gradientIdRight;
  const darkColor = adjustBrightness(color, -30);
  const lightColor = adjustBrightness(color, 30);

  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId1} cx="50%" cy="70%" rx="60%" ry="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <Stop offset="70%" stopColor={darkColor} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={darkColor} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={gradientId2} cx="50%" cy="70%" rx="60%" ry="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <Stop offset="70%" stopColor={darkColor} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={darkColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {style === EyeshadowStyle.NATURAL && (
        <G>
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y - 4} rx={8} ry={4} fill={`url(#${gradientId1})`} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y - 4} rx={8} ry={4} fill={`url(#${gradientId2})`} />
        </G>
      )}

      {style === EyeshadowStyle.SMOKY && (
        <G>
          {/* Darker base */}
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y - 3} rx={9} ry={5} fill={darkColor} opacity={0.35} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y - 3} rx={9} ry={5} fill={darkColor} opacity={0.35} />
          {/* Gradient overlay */}
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y - 5} rx={7} ry={4} fill={`url(#${gradientId1})`} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y - 5} rx={7} ry={4} fill={`url(#${gradientId2})`} />
          {/* Under eye smudge */}
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y + 4} rx={6} ry={2} fill={darkColor} opacity={0.15} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y + 4} rx={6} ry={2} fill={darkColor} opacity={0.15} />
        </G>
      )}

      {style === EyeshadowStyle.CUT_CREASE && (
        <G>
          {/* Crease definition */}
          <Path
            d={`M${LEFT_EYE_X - 8},${EYE_Y - 3} Q${LEFT_EYE_X},${EYE_Y - 8} ${LEFT_EYE_X + 8},${EYE_Y - 3}`}
            stroke={darkColor}
            strokeWidth={1.5}
            fill="none"
            opacity={0.4}
          />
          <Path
            d={`M${RIGHT_EYE_X - 8},${EYE_Y - 3} Q${RIGHT_EYE_X},${EYE_Y - 8} ${RIGHT_EYE_X + 8},${EYE_Y - 3}`}
            stroke={darkColor}
            strokeWidth={1.5}
            fill="none"
            opacity={0.4}
          />
          {/* Lid color */}
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y - 2} rx={6} ry={3} fill={lightColor} opacity={0.4} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y - 2} rx={6} ry={3} fill={lightColor} opacity={0.4} />
        </G>
      )}

      {style === EyeshadowStyle.WING && (
        <G>
          {/* Extended wing */}
          <Path
            d={`M${LEFT_EYE_X + 6},${EYE_Y - 2} Q${LEFT_EYE_X + 12},${EYE_Y - 6} ${LEFT_EYE_X + 10},${EYE_Y - 8}`}
            fill={color}
            opacity={0.4}
          />
          <Path
            d={`M${RIGHT_EYE_X - 6},${EYE_Y - 2} Q${RIGHT_EYE_X - 12},${EYE_Y - 6} ${RIGHT_EYE_X - 10},${EYE_Y - 8}`}
            fill={color}
            opacity={0.4}
          />
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y - 4} rx={7} ry={4} fill={`url(#${gradientId1})`} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y - 4} rx={7} ry={4} fill={`url(#${gradientId2})`} />
        </G>
      )}

      {style === EyeshadowStyle.SHIMMER && (
        <G>
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y - 4} rx={7} ry={4} fill={color} opacity={0.35} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y - 4} rx={7} ry={4} fill={color} opacity={0.35} />
          {/* Shimmer highlights */}
          <Ellipse cx={LEFT_EYE_X - 2} cy={EYE_Y - 5} rx={2} ry={1.5} fill={lightColor} opacity={0.5} />
          <Ellipse cx={RIGHT_EYE_X + 2} cy={EYE_Y - 5} rx={2} ry={1.5} fill={lightColor} opacity={0.5} />
        </G>
      )}

      {style === EyeshadowStyle.GLITTER && (
        <G>
          <Ellipse cx={LEFT_EYE_X} cy={EYE_Y - 4} rx={7} ry={4} fill={color} opacity={0.4} />
          <Ellipse cx={RIGHT_EYE_X} cy={EYE_Y - 4} rx={7} ry={4} fill={color} opacity={0.4} />
          {/* Glitter specks */}
          {[...Array(8)].map((_, i) => (
            <G key={`glitter-${i}`}>
              <Ellipse
                cx={LEFT_EYE_X - 4 + (i % 4) * 2.5}
                cy={EYE_Y - 6 + Math.floor(i / 4) * 3}
                rx={0.4}
                ry={0.4}
                fill="#ffffff"
                opacity={0.6}
              />
              <Ellipse
                cx={RIGHT_EYE_X - 4 + (i % 4) * 2.5}
                cy={EYE_Y - 6 + Math.floor(i / 4) * 3}
                rx={0.4}
                ry={0.4}
                fill="#ffffff"
                opacity={0.6}
              />
            </G>
          ))}
        </G>
      )}
    </G>
  );
}

function Eyeliner({ style, color }: { style: EyelinerStyle; color: string }) {
  if (style === EyelinerStyle.NONE) return null;

  return (
    <G>
      {style === EyelinerStyle.THIN && (
        <G>
          <Path
            d={`M${LEFT_EYE_X - 7},${EYE_Y} Q${LEFT_EYE_X},${EYE_Y - 2} ${LEFT_EYE_X + 7},${EYE_Y}`}
            stroke={color}
            strokeWidth={0.6}
            fill="none"
          />
          <Path
            d={`M${RIGHT_EYE_X - 7},${EYE_Y} Q${RIGHT_EYE_X},${EYE_Y - 2} ${RIGHT_EYE_X + 7},${EYE_Y}`}
            stroke={color}
            strokeWidth={0.6}
            fill="none"
          />
        </G>
      )}

      {style === EyelinerStyle.WING && (
        <G>
          <Path
            d={`M${LEFT_EYE_X - 7},${EYE_Y} Q${LEFT_EYE_X},${EYE_Y - 2} ${LEFT_EYE_X + 7},${EYE_Y} L${LEFT_EYE_X + 10},${EYE_Y - 4} L${LEFT_EYE_X + 8},${EYE_Y}`}
            fill={color}
          />
          <Path
            d={`M${RIGHT_EYE_X + 7},${EYE_Y} Q${RIGHT_EYE_X},${EYE_Y - 2} ${RIGHT_EYE_X - 7},${EYE_Y} L${RIGHT_EYE_X - 10},${EYE_Y - 4} L${RIGHT_EYE_X - 8},${EYE_Y}`}
            fill={color}
          />
        </G>
      )}

      {style === EyelinerStyle.CAT_EYE && (
        <G>
          <Path
            d={`M${LEFT_EYE_X - 7},${EYE_Y + 1} Q${LEFT_EYE_X},${EYE_Y - 2} ${LEFT_EYE_X + 7},${EYE_Y - 1} L${LEFT_EYE_X + 12},${EYE_Y - 6} L${LEFT_EYE_X + 9},${EYE_Y - 1}`}
            fill={color}
          />
          <Path
            d={`M${RIGHT_EYE_X + 7},${EYE_Y + 1} Q${RIGHT_EYE_X},${EYE_Y - 2} ${RIGHT_EYE_X - 7},${EYE_Y - 1} L${RIGHT_EYE_X - 12},${EYE_Y - 6} L${RIGHT_EYE_X - 9},${EYE_Y - 1}`}
            fill={color}
          />
        </G>
      )}

      {style === EyelinerStyle.THICK && (
        <G>
          <Path
            d={`M${LEFT_EYE_X - 7},${EYE_Y + 1} Q${LEFT_EYE_X},${EYE_Y - 4} ${LEFT_EYE_X + 7},${EYE_Y + 1} L${LEFT_EYE_X + 7},${EYE_Y} Q${LEFT_EYE_X},${EYE_Y - 2} ${LEFT_EYE_X - 7},${EYE_Y} Z`}
            fill={color}
          />
          <Path
            d={`M${RIGHT_EYE_X - 7},${EYE_Y + 1} Q${RIGHT_EYE_X},${EYE_Y - 4} ${RIGHT_EYE_X + 7},${EYE_Y + 1} L${RIGHT_EYE_X + 7},${EYE_Y} Q${RIGHT_EYE_X},${EYE_Y - 2} ${RIGHT_EYE_X - 7},${EYE_Y} Z`}
            fill={color}
          />
        </G>
      )}

      {style === EyelinerStyle.SMUDGED && (
        <G>
          <Path
            d={`M${LEFT_EYE_X - 7},${EYE_Y} Q${LEFT_EYE_X},${EYE_Y - 2} ${LEFT_EYE_X + 7},${EYE_Y}`}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            opacity={0.7}
          />
          <Path
            d={`M${LEFT_EYE_X - 6},${EYE_Y + 1} Q${LEFT_EYE_X},${EYE_Y} ${LEFT_EYE_X + 6},${EYE_Y + 1}`}
            stroke={color}
            strokeWidth={1}
            fill="none"
            opacity={0.3}
          />
          <Path
            d={`M${RIGHT_EYE_X - 7},${EYE_Y} Q${RIGHT_EYE_X},${EYE_Y - 2} ${RIGHT_EYE_X + 7},${EYE_Y}`}
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            opacity={0.7}
          />
          <Path
            d={`M${RIGHT_EYE_X - 6},${EYE_Y + 1} Q${RIGHT_EYE_X},${EYE_Y} ${RIGHT_EYE_X + 6},${EYE_Y + 1}`}
            stroke={color}
            strokeWidth={1}
            fill="none"
            opacity={0.3}
          />
        </G>
      )}

      {style === EyelinerStyle.GRAPHIC && (
        <G>
          {/* Bold graphic liner */}
          <Path
            d={`M${LEFT_EYE_X - 7},${EYE_Y} L${LEFT_EYE_X + 8},${EYE_Y} L${LEFT_EYE_X + 14},${EYE_Y - 8} L${LEFT_EYE_X + 10},${EYE_Y - 6} L${LEFT_EYE_X + 6},${EYE_Y - 1} L${LEFT_EYE_X - 7},${EYE_Y - 1} Z`}
            fill={color}
          />
          <Path
            d={`M${RIGHT_EYE_X + 7},${EYE_Y} L${RIGHT_EYE_X - 8},${EYE_Y} L${RIGHT_EYE_X - 14},${EYE_Y - 8} L${RIGHT_EYE_X - 10},${EYE_Y - 6} L${RIGHT_EYE_X - 6},${EYE_Y - 1} L${RIGHT_EYE_X + 7},${EYE_Y - 1} Z`}
            fill={color}
          />
        </G>
      )}
    </G>
  );
}

function Lipstick({ style, color, gradientId: passedGradientId }: { style: LipstickStyle; color: string; gradientId: string }) {
  if (style === LipstickStyle.NONE) return null;

  const gradientId = passedGradientId;
  const darkColor = adjustBrightness(color, -30);
  const lightColor = adjustBrightness(color, 40);

  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={lightColor} stopOpacity="0.8" />
          <Stop offset="50%" stopColor={color} stopOpacity="1" />
          <Stop offset="100%" stopColor={darkColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {(style === LipstickStyle.NATURAL || style === LipstickStyle.STAINED) && (
        <G>
          {/* Subtle lip tint */}
          <Ellipse cx={50} cy={62} rx={7} ry={4} fill={color} opacity={style === LipstickStyle.STAINED ? 0.4 : 0.25} />
        </G>
      )}

      {style === LipstickStyle.MATTE && (
        <G>
          {/* Upper lip */}
          <Path
            d="M43,60 Q47,58 50,59 Q53,58 57,60 L55,62 Q50,61 45,62 Z"
            fill={color}
          />
          {/* Lower lip */}
          <Path
            d="M44,62 Q50,67 56,62 Q50,64 44,62 Z"
            fill={darkColor}
          />
        </G>
      )}

      {style === LipstickStyle.GLOSSY && (
        <G>
          {/* Upper lip */}
          <Path
            d="M43,60 Q47,58 50,59 Q53,58 57,60 L55,62 Q50,61 45,62 Z"
            fill={`url(#${gradientId})`}
          />
          {/* Lower lip */}
          <Path
            d="M44,62 Q50,67 56,62 Q50,64 44,62 Z"
            fill={color}
          />
          {/* Gloss highlight */}
          <Ellipse cx={50} cy={64} rx={4} ry={1.5} fill="#ffffff" opacity={0.4} />
          <Ellipse cx={49} cy={60} rx={2} ry={0.8} fill="#ffffff" opacity={0.3} />
        </G>
      )}

      {style === LipstickStyle.OMBRE && (
        <G>
          {/* Outer darker color */}
          <Path
            d="M43,60 Q47,58 50,59 Q53,58 57,60 L55,62 Q50,61 45,62 Z"
            fill={darkColor}
          />
          <Path
            d="M44,62 Q50,67 56,62 Q50,64 44,62 Z"
            fill={darkColor}
          />
          {/* Inner lighter color */}
          <Ellipse cx={50} cy={62} rx={4} ry={2} fill={lightColor} opacity={0.6} />
        </G>
      )}

      {style === LipstickStyle.BOLD && (
        <G>
          {/* Full bold lip color */}
          <Path
            d="M42,60 Q47,57 50,58 Q53,57 58,60 L56,62 Q50,61 44,62 Z"
            fill={color}
          />
          <Path
            d="M43,62 Q50,68 57,62 Q50,64 43,62 Z"
            fill={darkColor}
          />
          {/* Slight highlight */}
          <Ellipse cx={50} cy={60} rx={2} ry={0.8} fill={lightColor} opacity={0.3} />
        </G>
      )}
    </G>
  );
}

function Blush({ style, color, skinTone, gradientIdLeft, gradientIdRight }: { style: BlushStyle; color: string; skinTone: string; gradientIdLeft: string; gradientIdRight: string }) {
  if (style === BlushStyle.NONE) return null;

  const gradientId1 = gradientIdLeft;
  const gradientId2 = gradientIdRight;

  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId1} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <Stop offset="70%" stopColor={color} stopOpacity="0.15" />
          <Stop offset="100%" stopColor={skinTone} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={gradientId2} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <Stop offset="70%" stopColor={color} stopOpacity="0.15" />
          <Stop offset="100%" stopColor={skinTone} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {style === BlushStyle.SUBTLE && (
        <G>
          <Ellipse cx={34} cy={54} rx={6} ry={4} fill={`url(#${gradientId1})`} />
          <Ellipse cx={66} cy={54} rx={6} ry={4} fill={`url(#${gradientId2})`} />
        </G>
      )}

      {style === BlushStyle.ROSY && (
        <G>
          <Ellipse cx={34} cy={54} rx={7} ry={5} fill={color} opacity={0.3} />
          <Ellipse cx={66} cy={54} rx={7} ry={5} fill={color} opacity={0.3} />
        </G>
      )}

      {style === BlushStyle.SUN_KISSED && (
        <G>
          {/* Nose bridge blush */}
          <Ellipse cx={50} cy={54} rx={8} ry={3} fill={color} opacity={0.2} />
          {/* Cheek blush */}
          <Ellipse cx={34} cy={52} rx={5} ry={4} fill={color} opacity={0.25} />
          <Ellipse cx={66} cy={52} rx={5} ry={4} fill={color} opacity={0.25} />
        </G>
      )}

      {style === BlushStyle.CONTOUR && (
        <G>
          {/* Contour shadows */}
          <Path
            d="M28,48 Q32,58 36,65"
            stroke={adjustBrightness(color, -40)}
            strokeWidth={4}
            fill="none"
            opacity={0.15}
          />
          <Path
            d="M72,48 Q68,58 64,65"
            stroke={adjustBrightness(color, -40)}
            strokeWidth={4}
            fill="none"
            opacity={0.15}
          />
          {/* Blush highlight */}
          <Ellipse cx={35} cy={52} rx={5} ry={3} fill={color} opacity={0.25} />
          <Ellipse cx={65} cy={52} rx={5} ry={3} fill={color} opacity={0.25} />
        </G>
      )}

      {style === BlushStyle.DRAPING && (
        <G>
          {/* Extended draping blush */}
          <Path
            d="M28,44 Q34,54 38,60"
            stroke={color}
            strokeWidth={8}
            fill="none"
            opacity={0.2}
          />
          <Path
            d="M72,44 Q66,54 62,60"
            stroke={color}
            strokeWidth={8}
            fill="none"
            opacity={0.2}
          />
        </G>
      )}
    </G>
  );
}

export function Makeup({
  eyeshadowStyle = EyeshadowStyle.NONE,
  eyeshadowColor = '#8b7355',
  eyelinerStyle = EyelinerStyle.NONE,
  eyelinerColor = '#0a0a0a',
  lipstickStyle = LipstickStyle.NONE,
  lipstickColor = '#c41e3a',
  blushStyle = BlushStyle.NONE,
  blushColor = '#e8a0b0',
  skinTone = '#f5d7c3',
}: MakeupProps) {
  // Use stable gradient IDs for consistent rendering
  const ids = useGradientIds<MakeupGradientIds>([
    'eyeshadowLeft', 'eyeshadowRight', 'lipstick', 'blushLeft', 'blushRight'
  ]);

  return (
    <G>
      {/* Blush is rendered first (under other features) */}
      <Blush style={blushStyle} color={blushColor} skinTone={skinTone} gradientIdLeft={ids.blushLeft} gradientIdRight={ids.blushRight} />
      {/* Eye makeup rendered before eyes */}
      <Eyeshadow style={eyeshadowStyle} color={eyeshadowColor} gradientIdLeft={ids.eyeshadowLeft} gradientIdRight={ids.eyeshadowRight} />
      <Eyeliner style={eyelinerStyle} color={eyelinerColor} />
      {/* Lipstick is rendered with/over mouth */}
      <Lipstick style={lipstickStyle} color={lipstickColor} gradientId={ids.lipstick} />
    </G>
  );
}

export default Makeup;
