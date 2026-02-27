/**
 * Eyes Component - Multiple eye styles with color
 * Enhanced with realistic iris patterns, detailed highlights, and expressive animations
 * Supports heterochromia (different colored eyes) and eyelash styles
 */

import React from 'react';
import { G, Circle, Ellipse, Path, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import { EyeStyle, EyelashStyle, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type DefaultEyeGradientIds = {
  irisGradient: string;
  scleraGradient: string;
  pupilGradient: string;
};

type HeartEyeGradientIds = {
  heartGradient: string;
};

type StarEyeGradientIds = {
  starGradient: string;
};

type CryEyeGradientIds = {
  tearGradient: string;
};

interface EyesProps extends SvgPartProps {
  style: EyeStyle;
  eyeColor: string;
  rightEyeColor?: string;  // For heterochromia - if not provided, uses eyeColor
  eyelashStyle?: EyelashStyle;
  faceWidth?: number; // face ellipse rx value, defaults to ~22
}

const LEFT_EYE_X = 39;
const RIGHT_EYE_X = 61;
const EYE_Y = 44;
const EYE_RADIUS = 5;

function DefaultEye({ cx, cy, eyeColor, radius = EYE_RADIUS, lookDirection = 0 }: {
  cx: number;
  cy: number;
  eyeColor: string;
  radius?: number;
  lookDirection?: number;
}) {
  const irisRadius = radius * 0.65;
  const pupilRadius = radius * 0.3;
  const highlightRadius = irisRadius * 0.3;
  const limbalRingColor = adjustBrightness(eyeColor, -40);

  return (
    <G>
      {/* Sclera (white of eye) - simple white ellipse with thin outline */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={radius}
        ry={radius * 0.85}
        fill="#ffffff"
        stroke="#555555"
        strokeWidth={0.5}
      />

      {/* Iris - flat colored circle with limbal ring */}
      <Circle
        cx={cx + lookDirection}
        cy={cy}
        r={irisRadius}
        fill={eyeColor}
      />

      {/* Limbal ring - thin dark outline around iris */}
      <Circle
        cx={cx + lookDirection}
        cy={cy}
        r={irisRadius}
        fill="none"
        stroke={limbalRingColor}
        strokeWidth={0.4}
      />

      {/* Pupil - simple black circle */}
      <Circle
        cx={cx + lookDirection}
        cy={cy}
        r={pupilRadius}
        fill="#111111"
      />

      {/* Single highlight - white circle upper-left */}
      <Circle
        cx={cx + lookDirection - irisRadius * 0.4}
        cy={cy - irisRadius * 0.4}
        r={highlightRadius}
        fill="white"
        opacity={0.85}
      />
    </G>
  );
}

function ClosedEye({ cx, cy }: { cx: number; cy: number }) {
  const w = EYE_RADIUS; // match open eye size
  return (
    <G>
      {/* Eyelid shadow */}
      <Ellipse
        cx={cx}
        cy={cy + 0.5}
        rx={w + 0.5}
        ry={w * 0.5}
        fill="#00000008"
      />
      {/* Main closed line - gentle downward curve */}
      <Path
        d={`M${cx - w},${cy} Q${cx},${cy + w * 0.5} ${cx + w},${cy}`}
        fill="none"
        stroke="#3a3a3a"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Small lashes */}
      <G stroke="#2c2c2c" strokeWidth={0.5} strokeLinecap="round">
        <Path d={`M${cx - w * 0.8},${cy} L${cx - w},${cy - 1.5}`} />
        <Path d={`M${cx},${cy + w * 0.4} L${cx},${cy - 0.8}`} />
        <Path d={`M${cx + w * 0.8},${cy} L${cx + w},${cy - 1.5}`} />
      </G>
    </G>
  );
}

function HappyEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      {/* Eye crinkle shadow */}
      <Ellipse
        cx={cx}
        cy={cy - 1}
        rx={6}
        ry={3}
        fill="#00000005"
      />
      {/* Main happy curve */}
      <Path
        d={`M${cx - 6},${cy + 2} Q${cx},${cy - 4} ${cx + 6},${cy + 2}`}
        fill="none"
        stroke="#3a3a3a"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {/* Upper crease line */}
      <Path
        d={`M${cx - 5},${cy + 1.5} Q${cx},${cy - 3} ${cx + 5},${cy + 1.5}`}
        fill="none"
        stroke="#4a4a4a"
        strokeWidth={0.6}
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* Happy wrinkles at corners */}
      <Path
        d={`M${cx - 6},${cy + 2} L${cx - 7.5},${cy + 1}`}
        fill="none"
        stroke="#3a3a3a"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.4}
      />
      <Path
        d={`M${cx + 6},${cy + 2} L${cx + 7.5},${cy + 1}`}
        fill="none"
        stroke="#3a3a3a"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.4}
      />
    </G>
  );
}

function HeartEye({ cx, cy }: { cx: number; cy: number }) {
  const ids = useGradientIds<HeartEyeGradientIds>(['heartGradient']);
  const heartGradientId = ids.heartGradient;
  return (
    <G>
      <Defs>
        <RadialGradient id={heartGradientId} cx="40%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor="#ff6b9d" />
          <Stop offset="50%" stopColor="#e91e63" />
          <Stop offset="100%" stopColor="#c2185b" />
        </RadialGradient>
      </Defs>
      {/* Heart shadow */}
      <Path
        d={`M${cx},${cy + 5} L${cx - 5.5},${cy + 0.5} A3.2,3.2 0 1,1 ${cx},${cy - 3.5} A3.2,3.2 0 1,1 ${cx + 5.5},${cy + 0.5} Z`}
        fill="#00000015"
      />
      {/* Main heart */}
      <Path
        d={`M${cx},${cy + 4.5} L${cx - 5},${cy} A3,3 0 1,1 ${cx},${cy - 3} A3,3 0 1,1 ${cx + 5},${cy} Z`}
        fill={`url(#${heartGradientId})`}
      />
      {/* Heart highlight */}
      <Circle
        cx={cx - 2}
        cy={cy - 1.5}
        r={1.2}
        fill="white"
        opacity={0.6}
      />
      <Circle
        cx={cx + 1.5}
        cy={cy - 1}
        r={0.6}
        fill="white"
        opacity={0.4}
      />
    </G>
  );
}

function StarEye({ cx, cy }: { cx: number; cy: number }) {
  const size = 5.5;
  const innerSize = size * 0.4;
  const points = 5;
  let path = '';
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? size : innerSize;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    path += `${i === 0 ? 'M' : 'L'}${x},${y} `;
  }
  path += 'Z';

  const ids = useGradientIds<StarEyeGradientIds>(['starGradient']);
  const starGradientId = ids.starGradient;
  return (
    <G>
      <Defs>
        <RadialGradient id={starGradientId} cx="35%" cy="30%" rx="65%" ry="65%">
          <Stop offset="0%" stopColor="#ffeb3b" />
          <Stop offset="50%" stopColor="#ffc107" />
          <Stop offset="100%" stopColor="#ff9800" />
        </RadialGradient>
      </Defs>
      {/* Star shadow */}
      <Path d={path} fill="#00000015" transform={`translate(0.5, 0.5)`} />
      {/* Main star */}
      <Path d={path} fill={`url(#${starGradientId})`} />
      {/* Star highlight */}
      <Circle cx={cx - 1} cy={cy - 1.5} r={1} fill="white" opacity={0.7} />
      {/* Star sparkle */}
      <Path
        d={`M${cx + 2},${cy - 3} L${cx + 2.3},${cy - 2} L${cx + 3},${cy - 2.3} L${cx + 2.3},${cy - 2} L${cx + 2},${cy - 1} L${cx + 1.7},${cy - 2} L${cx + 1},${cy - 2.3} L${cx + 1.7},${cy - 2} Z`}
        fill="white"
        opacity={0.8}
      />
    </G>
  );
}

function DizzyEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      {/* Dizzy circle background */}
      <Circle cx={cx} cy={cy} r={5.5} fill="#f5f5f5" />
      <Circle cx={cx} cy={cy} r={5.5} fill="none" stroke="#4a4a4a" strokeWidth={1.2} />
      {/* Spiral effect */}
      <Path
        d={`M${cx},${cy - 2} A2,2 0 1,1 ${cx},${cy + 2} A2.5,2.5 0 1,0 ${cx},${cy - 3}`}
        fill="none"
        stroke="#6a6a6a"
        strokeWidth={1}
        opacity={0.3}
      />
      {/* X marks */}
      <Path
        d={`M${cx - 3},${cy - 3} L${cx + 3},${cy + 3}`}
        stroke="#3a3a3a"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d={`M${cx + 3},${cy - 3} L${cx - 3},${cy + 3}`}
        stroke="#3a3a3a"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </G>
  );
}

function CryEye({ cx, cy, eyeColor }: { cx: number; cy: number; eyeColor: string }) {
  const ids = useGradientIds<CryEyeGradientIds>(['tearGradient']);
  const tearGradientId = ids.tearGradient;
  return (
    <G>
      <Defs>
        <LinearGradient id={tearGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#90caf9" />
          <Stop offset="50%" stopColor="#64b5f6" />
          <Stop offset="100%" stopColor="#42a5f5" />
        </LinearGradient>
      </Defs>
      {/* Sad, watery eye */}
      <DefaultEye cx={cx} cy={cy} eyeColor={eyeColor} />
      {/* Eye watering effect on lower lid */}
      <Path
        d={`M${cx - 4},${cy + 3.5} Q${cx},${cy + 5} ${cx + 4},${cy + 3.5}`}
        fill="#64b5f680"
      />
      {/* Main tear stream */}
      <Path
        d={`M${cx + 2.5},${cy + 5}
            Q${cx + 3.5},${cy + 8} ${cx + 3},${cy + 11}
            Q${cx + 2.5},${cy + 13} ${cx + 3},${cy + 15}`}
        fill={`url(#${tearGradientId})`}
        stroke="#42a5f5"
        strokeWidth={0.3}
        opacity={0.9}
      />
      {/* Tear drop at bottom */}
      <Ellipse
        cx={cx + 3}
        cy={cy + 15.5}
        rx={2.5}
        ry={3}
        fill={`url(#${tearGradientId})`}
      />
      {/* Tear highlight */}
      <Circle
        cx={cx + 2}
        cy={cy + 14.5}
        r={0.8}
        fill="white"
        opacity={0.7}
      />
      {/* Second smaller tear */}
      <Ellipse
        cx={cx - 1}
        cy={cy + 10}
        rx={1.2}
        ry={1.8}
        fill="#64b5f6"
        opacity={0.6}
      />
    </G>
  );
}

function SleepyEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      {/* Droopy eyelid */}
      <Ellipse
        cx={cx}
        cy={cy + 1}
        rx={5.5}
        ry={3}
        fill="#f5f0e8"
      />
      <Ellipse
        cx={cx}
        cy={cy + 1}
        rx={5.5}
        ry={3}
        fill="none"
        stroke="#5a5a5a"
        strokeWidth={0.5}
      />
      {/* Half-closed eye line */}
      <Path
        d={`M${cx - 5},${cy} Q${cx},${cy + 2} ${cx + 5},${cy}`}
        fill="none"
        stroke="#3a3a3a"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Heavy upper lid */}
      <Path
        d={`M${cx - 5.5},${cy - 0.5}
            Q${cx - 3},${cy - 2} ${cx},${cy - 1.5}
            Q${cx + 3},${cy - 2} ${cx + 5.5},${cy - 0.5}`}
        fill="none"
        stroke="#4a4a4a"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </G>
  );
}

function SquintEye({ cx, cy, eyeColor }: { cx: number; cy: number; eyeColor: string }) {
  const irisRadius = 2.5;
  const pupilRadius = 1.2;
  return (
    <G>
      {/* Squinted eye opening */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={5}
        ry={2.5}
        fill="white"
      />
      <Ellipse
        cx={cx}
        cy={cy}
        rx={5}
        ry={2.5}
        fill="none"
        stroke="#5a5a5a"
        strokeWidth={0.5}
      />
      {/* Partial iris visible */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={irisRadius}
        ry={irisRadius * 0.7}
        fill={eyeColor}
      />
      {/* Pupil */}
      <Ellipse
        cx={cx}
        cy={cy}
        rx={pupilRadius}
        ry={pupilRadius * 0.7}
        fill="#1a1a1a"
      />
      {/* Upper eyelid crease */}
      <Path
        d={`M${cx - 6},${cy - 1} Q${cx},${cy - 3} ${cx + 6},${cy - 1}`}
        fill="none"
        stroke="#4a4a4a"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Lower eyelid crease */}
      <Path
        d={`M${cx - 5},${cy + 2} Q${cx},${cy + 3.5} ${cx + 5},${cy + 2}`}
        fill="none"
        stroke="#5a5a5a"
        strokeWidth={1}
        strokeLinecap="round"
      />
      {/* Highlight */}
      <Circle cx={cx - 1} cy={cy - 0.5} r={0.6} fill="white" opacity={0.8} />
    </G>
  );
}

function RollEye({ cx, cy, eyeColor }: { cx: number; cy: number; eyeColor: string }) {
  const irisRadius = 3.5;
  const pupilRadius = 1.5;
  return (
    <G>
      {/* Eyeball */}
      <Ellipse cx={cx} cy={cy} rx={5} ry={4.5} fill="white" />
      <Ellipse cx={cx} cy={cy} rx={5} ry={4.5} fill="none" stroke="#6a6a7a" strokeWidth={0.4} opacity={0.6} />
      {/* Rolled up iris (positioned high) */}
      <Circle cx={cx} cy={cy - 2} r={irisRadius} fill={eyeColor} />
      <Circle cx={cx} cy={cy - 2} r={irisRadius + 0.3} fill="none" stroke={adjustBrightness(eyeColor, -50)} strokeWidth={0.4} />
      {/* Pupil (also high) */}
      <Circle cx={cx} cy={cy - 2} r={pupilRadius} fill="#1a1a1a" />
      {/* Lower sclera visible */}
      <Ellipse cx={cx} cy={cy + 2} rx={4} ry={1.5} fill="#f8f8fa" opacity={0.5} />
      {/* Highlight */}
      <Circle cx={cx - 1} cy={cy - 2.5} r={0.8} fill="white" opacity={0.9} />
    </G>
  );
}

// ============================================================================
// EYELASH COMPONENT
// ============================================================================

interface EyelashProps {
  cx: number;
  cy: number;
  style: EyelashStyle;
  isLeft: boolean;
}

function Eyelashes({ cx, cy, style, isLeft }: EyelashProps) {
  if (style === EyelashStyle.NONE) return null;

  const mirror = isLeft ? 1 : -1;
  const baseColor = '#1a1a1a';
  const softColor = '#3a3a3a';

  switch (style) {
    case EyelashStyle.NATURAL:
      return (
        <G stroke={baseColor} strokeLinecap="round">
          <Path d={`M${cx - 4 * mirror},${cy - 3} L${cx - 5 * mirror},${cy - 5}`} strokeWidth={0.6} />
          <Path d={`M${cx - 2 * mirror},${cy - 4} L${cx - 2.5 * mirror},${cy - 6}`} strokeWidth={0.5} />
          <Path d={`M${cx},${cy - 4.5} L${cx},${cy - 6.5}`} strokeWidth={0.5} />
          <Path d={`M${cx + 2 * mirror},${cy - 4} L${cx + 2 * mirror},${cy - 6}`} strokeWidth={0.5} />
          <Path d={`M${cx + 4 * mirror},${cy - 3} L${cx + 4.5 * mirror},${cy - 5}`} strokeWidth={0.6} />
        </G>
      );

    case EyelashStyle.LIGHT:
      return (
        <G stroke={softColor} strokeLinecap="round">
          <Path d={`M${cx - 3 * mirror},${cy - 3.5} L${cx - 3.5 * mirror},${cy - 5}`} strokeWidth={0.4} />
          <Path d={`M${cx},${cy - 4.5} L${cx},${cy - 5.5}`} strokeWidth={0.4} />
          <Path d={`M${cx + 3 * mirror},${cy - 3.5} L${cx + 3.5 * mirror},${cy - 5}`} strokeWidth={0.4} />
        </G>
      );

    case EyelashStyle.MEDIUM:
      return (
        <G stroke={baseColor} strokeLinecap="round">
          <Path d={`M${cx - 5 * mirror},${cy - 2.5} L${cx - 6 * mirror},${cy - 4.5}`} strokeWidth={0.7} />
          <Path d={`M${cx - 3 * mirror},${cy - 3.5} L${cx - 4 * mirror},${cy - 6}`} strokeWidth={0.6} />
          <Path d={`M${cx - 1 * mirror},${cy - 4} L${cx - 1.5 * mirror},${cy - 6.5}`} strokeWidth={0.6} />
          <Path d={`M${cx + 1 * mirror},${cy - 4} L${cx + 1 * mirror},${cy - 6.5}`} strokeWidth={0.6} />
          <Path d={`M${cx + 3 * mirror},${cy - 3.5} L${cx + 3.5 * mirror},${cy - 6}`} strokeWidth={0.6} />
          <Path d={`M${cx + 5 * mirror},${cy - 2.5} L${cx + 5.5 * mirror},${cy - 4.5}`} strokeWidth={0.7} />
        </G>
      );

    case EyelashStyle.FULL:
      return (
        <G stroke={baseColor} strokeLinecap="round">
          {/* Upper lashes - dense */}
          <Path d={`M${cx - 5.5 * mirror},${cy - 2} L${cx - 7 * mirror},${cy - 4}`} strokeWidth={0.8} />
          <Path d={`M${cx - 4 * mirror},${cy - 3} L${cx - 5.5 * mirror},${cy - 6}`} strokeWidth={0.7} />
          <Path d={`M${cx - 2.5 * mirror},${cy - 3.5} L${cx - 3 * mirror},${cy - 7}`} strokeWidth={0.7} />
          <Path d={`M${cx - 1 * mirror},${cy - 4} L${cx - 1 * mirror},${cy - 7.5}`} strokeWidth={0.6} />
          <Path d={`M${cx + 0.5 * mirror},${cy - 4} L${cx + 0.5 * mirror},${cy - 7.5}`} strokeWidth={0.6} />
          <Path d={`M${cx + 2 * mirror},${cy - 3.5} L${cx + 2.5 * mirror},${cy - 7}`} strokeWidth={0.7} />
          <Path d={`M${cx + 4 * mirror},${cy - 3} L${cx + 5 * mirror},${cy - 6}`} strokeWidth={0.7} />
          <Path d={`M${cx + 5.5 * mirror},${cy - 2} L${cx + 6.5 * mirror},${cy - 4}`} strokeWidth={0.8} />
          {/* Lower lashes - subtle */}
          <Path d={`M${cx - 3 * mirror},${cy + 3.5} L${cx - 3.5 * mirror},${cy + 5}`} strokeWidth={0.4} opacity={0.5} />
          <Path d={`M${cx},${cy + 4} L${cx},${cy + 5.5}`} strokeWidth={0.4} opacity={0.5} />
          <Path d={`M${cx + 3 * mirror},${cy + 3.5} L${cx + 3.5 * mirror},${cy + 5}`} strokeWidth={0.4} opacity={0.5} />
        </G>
      );

    case EyelashStyle.DRAMATIC:
      return (
        <G stroke={baseColor} strokeLinecap="round">
          {/* Very long, thick upper lashes */}
          <Path d={`M${cx - 6 * mirror},${cy - 1.5} L${cx - 8 * mirror},${cy - 4}`} strokeWidth={1} />
          <Path d={`M${cx - 4.5 * mirror},${cy - 2.5} L${cx - 6.5 * mirror},${cy - 7}`} strokeWidth={0.9} />
          <Path d={`M${cx - 3 * mirror},${cy - 3.5} L${cx - 4 * mirror},${cy - 8}`} strokeWidth={0.8} />
          <Path d={`M${cx - 1.5 * mirror},${cy - 4} L${cx - 2 * mirror},${cy - 9}`} strokeWidth={0.8} />
          <Path d={`M${cx},${cy - 4.2} L${cx},${cy - 9}`} strokeWidth={0.7} />
          <Path d={`M${cx + 1.5 * mirror},${cy - 4} L${cx + 1.5 * mirror},${cy - 9}`} strokeWidth={0.8} />
          <Path d={`M${cx + 3 * mirror},${cy - 3.5} L${cx + 3.5 * mirror},${cy - 8}`} strokeWidth={0.8} />
          <Path d={`M${cx + 4.5 * mirror},${cy - 2.5} L${cx + 6 * mirror},${cy - 7}`} strokeWidth={0.9} />
          <Path d={`M${cx + 6 * mirror},${cy - 1.5} L${cx + 7.5 * mirror},${cy - 4}`} strokeWidth={1} />
          {/* Lower lashes */}
          <Path d={`M${cx - 4 * mirror},${cy + 3} L${cx - 5 * mirror},${cy + 5.5}`} strokeWidth={0.5} opacity={0.6} />
          <Path d={`M${cx - 2 * mirror},${cy + 3.5} L${cx - 2.5 * mirror},${cy + 6}`} strokeWidth={0.5} opacity={0.6} />
          <Path d={`M${cx},${cy + 4} L${cx},${cy + 6.5}`} strokeWidth={0.5} opacity={0.6} />
          <Path d={`M${cx + 2 * mirror},${cy + 3.5} L${cx + 2.5 * mirror},${cy + 6}`} strokeWidth={0.5} opacity={0.6} />
          <Path d={`M${cx + 4 * mirror},${cy + 3} L${cx + 4.5 * mirror},${cy + 5.5}`} strokeWidth={0.5} opacity={0.6} />
        </G>
      );

    case EyelashStyle.WISPY:
      return (
        <G stroke={baseColor} strokeLinecap="round">
          {/* Varying lengths, thin, wispy look */}
          <Path d={`M${cx - 5 * mirror},${cy - 2} L${cx - 6 * mirror},${cy - 5}`} strokeWidth={0.5} />
          <Path d={`M${cx - 4 * mirror},${cy - 3} L${cx - 4 * mirror},${cy - 4.5}`} strokeWidth={0.4} />
          <Path d={`M${cx - 3 * mirror},${cy - 3.5} L${cx - 3.5 * mirror},${cy - 7}`} strokeWidth={0.5} />
          <Path d={`M${cx - 1.5 * mirror},${cy - 4} L${cx - 1.5 * mirror},${cy - 5.5}`} strokeWidth={0.4} />
          <Path d={`M${cx - 0.5 * mirror},${cy - 4} L${cx - 0.5 * mirror},${cy - 7.5}`} strokeWidth={0.5} />
          <Path d={`M${cx + 1 * mirror},${cy - 4} L${cx + 1 * mirror},${cy - 6}`} strokeWidth={0.4} />
          <Path d={`M${cx + 2.5 * mirror},${cy - 3.5} L${cx + 3 * mirror},${cy - 7}`} strokeWidth={0.5} />
          <Path d={`M${cx + 4 * mirror},${cy - 3} L${cx + 4 * mirror},${cy - 5}`} strokeWidth={0.4} />
          <Path d={`M${cx + 5 * mirror},${cy - 2} L${cx + 5.5 * mirror},${cy - 5.5}`} strokeWidth={0.5} />
        </G>
      );

    case EyelashStyle.CAT_EYE:
      return (
        <G stroke={baseColor} strokeLinecap="round">
          {/* Short inner, progressively longer outer */}
          <Path d={`M${cx - 5 * mirror},${cy - 2} L${cx - 5.5 * mirror},${cy - 3.5}`} strokeWidth={0.5} />
          <Path d={`M${cx - 3.5 * mirror},${cy - 3} L${cx - 4 * mirror},${cy - 4.5}`} strokeWidth={0.5} />
          <Path d={`M${cx - 2 * mirror},${cy - 3.5} L${cx - 2.5 * mirror},${cy - 5}`} strokeWidth={0.5} />
          <Path d={`M${cx - 0.5 * mirror},${cy - 4} L${cx - 0.5 * mirror},${cy - 5.5}`} strokeWidth={0.5} />
          <Path d={`M${cx + 1 * mirror},${cy - 4} L${cx + 1.5 * mirror},${cy - 6}`} strokeWidth={0.6} />
          <Path d={`M${cx + 2.5 * mirror},${cy - 3.5} L${cx + 3.5 * mirror},${cy - 7}`} strokeWidth={0.7} />
          <Path d={`M${cx + 4 * mirror},${cy - 3} L${cx + 6 * mirror},${cy - 7.5}`} strokeWidth={0.8} />
          <Path d={`M${cx + 5 * mirror},${cy - 2} L${cx + 7.5 * mirror},${cy - 6}`} strokeWidth={0.9} />
          <Path d={`M${cx + 5.5 * mirror},${cy - 1} L${cx + 8 * mirror},${cy - 4}`} strokeWidth={1} />
        </G>
      );

    case EyelashStyle.DOLL:
      return (
        <G stroke={baseColor} strokeLinecap="round">
          {/* Very full, evenly spaced, doll-like */}
          <Path d={`M${cx - 5.5 * mirror},${cy - 2} L${cx - 6.5 * mirror},${cy - 5}`} strokeWidth={0.7} />
          <Path d={`M${cx - 4.5 * mirror},${cy - 2.5} L${cx - 5.5 * mirror},${cy - 6}`} strokeWidth={0.7} />
          <Path d={`M${cx - 3.5 * mirror},${cy - 3} L${cx - 4 * mirror},${cy - 7}`} strokeWidth={0.7} />
          <Path d={`M${cx - 2.5 * mirror},${cy - 3.5} L${cx - 3 * mirror},${cy - 7.5}`} strokeWidth={0.7} />
          <Path d={`M${cx - 1.5 * mirror},${cy - 4} L${cx - 1.5 * mirror},${cy - 8}`} strokeWidth={0.7} />
          <Path d={`M${cx - 0.5 * mirror},${cy - 4.2} L${cx - 0.5 * mirror},${cy - 8}`} strokeWidth={0.7} />
          <Path d={`M${cx + 0.5 * mirror},${cy - 4.2} L${cx + 0.5 * mirror},${cy - 8}`} strokeWidth={0.7} />
          <Path d={`M${cx + 1.5 * mirror},${cy - 4} L${cx + 1.5 * mirror},${cy - 8}`} strokeWidth={0.7} />
          <Path d={`M${cx + 2.5 * mirror},${cy - 3.5} L${cx + 3 * mirror},${cy - 7.5}`} strokeWidth={0.7} />
          <Path d={`M${cx + 3.5 * mirror},${cy - 3} L${cx + 4 * mirror},${cy - 7}`} strokeWidth={0.7} />
          <Path d={`M${cx + 4.5 * mirror},${cy - 2.5} L${cx + 5.5 * mirror},${cy - 6}`} strokeWidth={0.7} />
          <Path d={`M${cx + 5.5 * mirror},${cy - 2} L${cx + 6.5 * mirror},${cy - 5}`} strokeWidth={0.7} />
        </G>
      );

    default:
      return null;
  }
}

export function Eyes({ style, eyeColor, rightEyeColor, eyelashStyle = EyelashStyle.NONE, faceWidth, scale = 1 }: EyesProps) {
  // Use rightEyeColor for heterochromia, or fall back to eyeColor for both eyes
  const leftEyeColor = eyeColor;
  const actualRightEyeColor = rightEyeColor || eyeColor;

  // Compute dynamic eye positions based on face width
  const faceRx = faceWidth || 22; // default face rx
  const leftEyeX = 50 - faceRx * 0.45;
  const rightEyeX = 50 + faceRx * 0.45;
  const eyeY = EYE_Y; // Y stays the same

  // Render eyelashes for styles that show the eye opening
  const renderEyelashes = eyelashStyle !== EyelashStyle.NONE &&
    style !== EyeStyle.CLOSED &&
    style !== EyeStyle.HAPPY &&
    style !== EyeStyle.SLEEPY;

  return (
    <G transform={`scale(${scale})`}>
      {(() => {
        switch (style) {
          case EyeStyle.CLOSED:
            return (
              <G>
                <ClosedEye cx={leftEyeX} cy={EYE_Y} />
                <ClosedEye cx={rightEyeX} cy={EYE_Y} />
              </G>
            );
          case EyeStyle.HAPPY:
            return (
              <G>
                <HappyEye cx={leftEyeX} cy={EYE_Y} />
                <HappyEye cx={rightEyeX} cy={EYE_Y} />
              </G>
            );
          case EyeStyle.WINK:
            return (
              <G>
                <DefaultEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} />
                <ClosedEye cx={rightEyeX} cy={EYE_Y} />
                {renderEyelashes && <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />}
              </G>
            );
          case EyeStyle.WINK_LEFT:
            return (
              <G>
                <ClosedEye cx={leftEyeX} cy={EYE_Y} />
                <DefaultEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} />
                {renderEyelashes && <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />}
              </G>
            );
          case EyeStyle.SLEEPY:
            return (
              <G>
                <SleepyEye cx={leftEyeX} cy={EYE_Y} />
                <SleepyEye cx={rightEyeX} cy={EYE_Y} />
              </G>
            );
          case EyeStyle.SURPRISED:
            return (
              <G>
                <DefaultEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} radius={5.2} />
                <DefaultEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} radius={5.2} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.WIDE:
            return (
              <G>
                <DefaultEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} radius={4.8} />
                <DefaultEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} radius={4.8} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.NARROW:
            return (
              <G>
                <DefaultEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} radius={3.2} />
                <DefaultEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} radius={3.2} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.ALMOND:
            return (
              <G>
                <DefaultEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} radius={4.2} />
                <DefaultEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} radius={4.2} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.SIDE:
            return (
              <G>
                <DefaultEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} lookDirection={2} />
                <DefaultEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} lookDirection={2} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.SQUINT:
            return (
              <G>
                <SquintEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} />
                <SquintEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.ROLL:
            return (
              <G>
                <RollEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} />
                <RollEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.HEARTS:
            return (
              <G>
                <HeartEye cx={leftEyeX} cy={EYE_Y} />
                <HeartEye cx={rightEyeX} cy={EYE_Y} />
              </G>
            );
          case EyeStyle.STARS:
            return (
              <G>
                <StarEye cx={leftEyeX} cy={EYE_Y} />
                <StarEye cx={rightEyeX} cy={EYE_Y} />
              </G>
            );
          case EyeStyle.DIZZY:
            return (
              <G>
                <DizzyEye cx={leftEyeX} cy={EYE_Y} />
                <DizzyEye cx={rightEyeX} cy={EYE_Y} />
              </G>
            );
          case EyeStyle.CRY:
            return (
              <G>
                <CryEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} />
                <CryEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
          case EyeStyle.ROUND:
          case EyeStyle.DEFAULT:
          default:
            return (
              <G>
                <DefaultEye cx={leftEyeX} cy={EYE_Y} eyeColor={leftEyeColor} />
                <DefaultEye cx={rightEyeX} cy={EYE_Y} eyeColor={actualRightEyeColor} />
                {renderEyelashes && (
                  <>
                    <Eyelashes cx={leftEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={true} />
                    <Eyelashes cx={rightEyeX} cy={EYE_Y} style={eyelashStyle} isLeft={false} />
                  </>
                )}
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Eyes;
