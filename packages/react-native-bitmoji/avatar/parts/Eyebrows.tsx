/**
 * Eyebrows Component - Multiple eyebrow styles
 * Enhanced with hair texture simulation, natural gradients, and detailed strokes
 * Phase 2.4: Added adjustable thickness, arch, length, and tilt
 */

import React from 'react';
import { G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { EyebrowStyle, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type EyebrowGradientIds = {
  browGradientLeft: string;
  browGradientRight: string;
};

// Eyebrow adjustment props (all values from -1 to 1, 0 is default)
interface EyebrowAdjustments {
  thickness?: number;  // -1 (thinner) to 1 (thicker)
  arch?: number;       // -1 (flat) to 1 (high arch)
  length?: number;     // -1 (shorter) to 1 (longer)
  tilt?: number;       // -1 (angled down) to 1 (angled up)
}

interface EyebrowsProps extends SvgPartProps {
  style: EyebrowStyle;
  eyebrowColor: string;
  adjustments?: EyebrowAdjustments;
}

const BASE_LEFT_BROW_X = 33;
const BASE_RIGHT_BROW_X = 57;
const BASE_BROW_Y = 35;
const BASE_BROW_WIDTH = 12;
const CENTER_X = 50;

// Hair stroke pattern generator for natural eyebrow texture
function HairStrokes({ x, y, width, curve, color, direction = 'up' }: {
  x: number;
  y: number;
  width: number;
  curve: number;
  color: string;
  direction?: 'up' | 'down' | 'flat';
}) {
  const strokes = [];
  const numStrokes = Math.floor(width / 1.5);
  const strokeColor = adjustBrightness(color, 10);

  for (let i = 0; i < numStrokes; i++) {
    const progress = i / numStrokes;
    const xPos = x + progress * width;
    const yOffset = direction === 'up' ? -Math.sin(progress * Math.PI) * curve
      : direction === 'down' ? Math.sin(progress * Math.PI) * curve
      : 0;
    const baseY = y + yOffset;
    const strokeLength = 1.5 + ((i * 7) % 10) * 0.1;
    const angle = direction === 'up' ? -0.3 - progress * 0.4
      : direction === 'down' ? 0.3 + progress * 0.4
      : -0.1 + progress * 0.2;

    strokes.push(
      <Path
        key={i}
        d={`M${xPos},${baseY} l${Math.sin(angle) * strokeLength},${-Math.cos(angle) * strokeLength}`}
        stroke={strokeColor}
        strokeWidth={0.4}
        strokeLinecap="round"
        opacity={0.3 + ((i * 3) % 10) * 0.03}
      />
    );
  }
  return <G>{strokes}</G>;
}

export function Eyebrows({ style, eyebrowColor, adjustments = {}, scale = 1 }: EyebrowsProps) {
  const lightColor = adjustBrightness(eyebrowColor, 20);
  const darkColor = adjustBrightness(eyebrowColor, -20);

  const ids = useGradientIds<EyebrowGradientIds>(['browGradientLeft', 'browGradientRight']);
  const gradientIdLeft = ids.browGradientLeft;
  const gradientIdRight = ids.browGradientRight;

  // Apply adjustments (all values -1 to 1)
  const thickness = adjustments.thickness ?? 0;
  const arch = adjustments.arch ?? 0;
  const length = adjustments.length ?? 0;
  const tilt = adjustments.tilt ?? 0;

  // Calculate adjusted values
  const strokeWidth = 2.2 + (thickness * 1.2); // Range: 1.0 to 3.4
  const archAmount = 2 + (arch * 3); // Range: -1 to 5 (curve height)
  const browWidth = BASE_BROW_WIDTH + (length * 3); // Range: 9 to 15
  const tiltOffset = tilt * 2; // Range: -2 to 2 (end point Y offset)

  // Adjusted positions
  const LEFT_BROW_X = BASE_LEFT_BROW_X;
  const RIGHT_BROW_X = BASE_RIGHT_BROW_X;
  const BROW_Y = BASE_BROW_Y;
  const BROW_WIDTH = browWidth;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Left eyebrow gradient - tapers from thick to thin */}
        <LinearGradient id={gradientIdLeft} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={eyebrowColor} stopOpacity="0.85" />
          <Stop offset="30%" stopColor={eyebrowColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={lightColor} stopOpacity="0.7" />
        </LinearGradient>

        {/* Right eyebrow gradient - tapers from thick to thin (mirrored) */}
        <LinearGradient id={gradientIdRight} x1="100%" y1="0%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor={eyebrowColor} stopOpacity="0.85" />
          <Stop offset="30%" stopColor={eyebrowColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={lightColor} stopOpacity="0.7" />
        </LinearGradient>
      </Defs>

      {(() => {
        switch (style) {
          case EyebrowStyle.NATURAL:
            return (
              <G>
                {/* Left eyebrow - natural arch */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 3},${BROW_Y - 2.5} ${LEFT_BROW_X + 6},${BROW_Y - 3}
                      Q${LEFT_BROW_X + 9},${BROW_Y - 2.5} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
                {/* Hair texture overlay */}
                <HairStrokes x={LEFT_BROW_X} y={BROW_Y - 1} width={BROW_WIDTH} curve={2.5} color={eyebrowColor} direction="up" />

                {/* Right eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 3},${BROW_Y - 2.5} ${RIGHT_BROW_X + 6},${BROW_Y - 3}
                      Q${RIGHT_BROW_X + 9},${BROW_Y - 2.5} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
                <HairStrokes x={RIGHT_BROW_X} y={BROW_Y - 1} width={BROW_WIDTH} curve={2.5} color={eyebrowColor} direction="up" />
              </G>
            );

          case EyebrowStyle.THICK:
            return (
              <G>
                {/* Left thick eyebrow - filled shape */}
                <Path
                  d={`M${LEFT_BROW_X - 1},${BROW_Y + 1.5}
                      Q${LEFT_BROW_X + 2},${BROW_Y - 1} ${LEFT_BROW_X + 6},${BROW_Y - 4}
                      Q${LEFT_BROW_X + 10},${BROW_Y - 3} ${LEFT_BROW_X + BROW_WIDTH + 1},${BROW_Y}
                      Q${LEFT_BROW_X + 8},${BROW_Y + 1} ${LEFT_BROW_X + 6},${BROW_Y + 2}
                      Q${LEFT_BROW_X + 3},${BROW_Y + 2} ${LEFT_BROW_X - 1},${BROW_Y + 1.5}`}
                  fill={eyebrowColor}
                />
                {/* Top highlight */}
                <Path
                  d={`M${LEFT_BROW_X + 2},${BROW_Y - 2} Q${LEFT_BROW_X + 6},${BROW_Y - 4} ${LEFT_BROW_X + 9},${BROW_Y - 2.5}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
                {/* Hair strokes for texture */}
                <G stroke={darkColor} strokeWidth={0.5} opacity={0.4}>
                  <Path d={`M${LEFT_BROW_X + 2},${BROW_Y + 1} L${LEFT_BROW_X + 3},${BROW_Y - 2}`} />
                  <Path d={`M${LEFT_BROW_X + 5},${BROW_Y + 1.5} L${LEFT_BROW_X + 6},${BROW_Y - 3}`} />
                  <Path d={`M${LEFT_BROW_X + 8},${BROW_Y + 0.5} L${LEFT_BROW_X + 9},${BROW_Y - 2}`} />
                  <Path d={`M${LEFT_BROW_X + 11},${BROW_Y} L${LEFT_BROW_X + 11},${BROW_Y - 1.5}`} />
                </G>

                {/* Right thick eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X - 1},${BROW_Y}
                      Q${RIGHT_BROW_X + 2},${BROW_Y - 3} ${RIGHT_BROW_X + 6},${BROW_Y - 4}
                      Q${RIGHT_BROW_X + 10},${BROW_Y - 1} ${RIGHT_BROW_X + BROW_WIDTH + 1},${BROW_Y + 1.5}
                      Q${RIGHT_BROW_X + 9},${BROW_Y + 2} ${RIGHT_BROW_X + 6},${BROW_Y + 2}
                      Q${RIGHT_BROW_X + 4},${BROW_Y + 1} ${RIGHT_BROW_X - 1},${BROW_Y}`}
                  fill={eyebrowColor}
                />
                <Path
                  d={`M${RIGHT_BROW_X + 3},${BROW_Y - 2.5} Q${RIGHT_BROW_X + 6},${BROW_Y - 4} ${RIGHT_BROW_X + 10},${BROW_Y - 2}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
                <G stroke={darkColor} strokeWidth={0.5} opacity={0.4}>
                  <Path d={`M${RIGHT_BROW_X + 1},${BROW_Y} L${RIGHT_BROW_X + 1},${BROW_Y - 1.5}`} />
                  <Path d={`M${RIGHT_BROW_X + 4},${BROW_Y + 0.5} L${RIGHT_BROW_X + 3},${BROW_Y - 2}`} />
                  <Path d={`M${RIGHT_BROW_X + 7},${BROW_Y + 1.5} L${RIGHT_BROW_X + 6},${BROW_Y - 3}`} />
                  <Path d={`M${RIGHT_BROW_X + 10},${BROW_Y + 1} L${RIGHT_BROW_X + 9},${BROW_Y - 2}`} />
                </G>
              </G>
            );

          case EyebrowStyle.THIN:
            return (
              <G>
                {/* Left thin eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 2} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                {/* Subtle hair detail */}
                <G stroke={lightColor} strokeWidth={0.3} opacity={0.4}>
                  <Path d={`M${LEFT_BROW_X + 3},${BROW_Y - 0.5} L${LEFT_BROW_X + 4},${BROW_Y - 1.5}`} />
                  <Path d={`M${LEFT_BROW_X + 6},${BROW_Y - 1} L${LEFT_BROW_X + 7},${BROW_Y - 2}`} />
                  <Path d={`M${LEFT_BROW_X + 9},${BROW_Y - 0.5} L${LEFT_BROW_X + 10},${BROW_Y - 1.5}`} />
                </G>

                {/* Right thin eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 2} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
                <G stroke={lightColor} strokeWidth={0.3} opacity={0.4}>
                  <Path d={`M${RIGHT_BROW_X + 3},${BROW_Y - 0.5} L${RIGHT_BROW_X + 2},${BROW_Y - 1.5}`} />
                  <Path d={`M${RIGHT_BROW_X + 6},${BROW_Y - 1} L${RIGHT_BROW_X + 5},${BROW_Y - 2}`} />
                  <Path d={`M${RIGHT_BROW_X + 9},${BROW_Y - 0.5} L${RIGHT_BROW_X + 8},${BROW_Y - 1.5}`} />
                </G>
              </G>
            );

          case EyebrowStyle.ARCHED:
            return (
              <G>
                {/* Left arched eyebrow - dramatic high arch */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 1}
                      Q${LEFT_BROW_X + 3},${BROW_Y - 3} ${LEFT_BROW_X + 6},${BROW_Y - 5}
                      Q${LEFT_BROW_X + 9},${BROW_Y - 4} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                {/* Arch highlight */}
                <Path
                  d={`M${LEFT_BROW_X + 4},${BROW_Y - 3.5} Q${LEFT_BROW_X + 6},${BROW_Y - 5} ${LEFT_BROW_X + 8},${BROW_Y - 4}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.6}
                  opacity={0.35}
                />
                <HairStrokes x={LEFT_BROW_X} y={BROW_Y - 1} width={BROW_WIDTH} curve={4} color={eyebrowColor} direction="up" />

                {/* Right arched eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 3},${BROW_Y - 4} ${RIGHT_BROW_X + 6},${BROW_Y - 5}
                      Q${RIGHT_BROW_X + 9},${BROW_Y - 3} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 1}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${RIGHT_BROW_X + 4},${BROW_Y - 4} Q${RIGHT_BROW_X + 6},${BROW_Y - 5} ${RIGHT_BROW_X + 8},${BROW_Y - 3.5}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.6}
                  opacity={0.35}
                />
                <HairStrokes x={RIGHT_BROW_X} y={BROW_Y - 1} width={BROW_WIDTH} curve={4} color={eyebrowColor} direction="up" />
              </G>
            );

          case EyebrowStyle.FLAT:
            return (
              <G>
                {/* Left flat eyebrow */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y} L${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                {/* Top edge highlight */}
                <Path
                  d={`M${LEFT_BROW_X + 2},${BROW_Y - 1} L${LEFT_BROW_X + 10},${BROW_Y - 1}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.5}
                  opacity={0.3}
                />

                {/* Right flat eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y} L${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${RIGHT_BROW_X + 2},${BROW_Y - 1} L${RIGHT_BROW_X + 10},${BROW_Y - 1}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              </G>
            );

          case EyebrowStyle.ANGRY:
            return (
              <G>
                {/* Left angry eyebrow - angled down toward center */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 3}
                      Q${LEFT_BROW_X + 6},${BROW_Y} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y - 4}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                />
                {/* Furrow emphasis */}
                <Path
                  d={`M${LEFT_BROW_X + 10},${BROW_Y - 3} L${LEFT_BROW_X + 13},${BROW_Y - 2}`}
                  fill="none"
                  stroke={darkColor}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
                {/* Hair texture */}
                <G stroke={darkColor} strokeWidth={0.5} opacity={0.35}>
                  <Path d={`M${LEFT_BROW_X + 2},${BROW_Y + 2} L${LEFT_BROW_X + 3},${BROW_Y + 0.5}`} />
                  <Path d={`M${LEFT_BROW_X + 5},${BROW_Y + 1} L${LEFT_BROW_X + 6},${BROW_Y - 1}`} />
                  <Path d={`M${LEFT_BROW_X + 9},${BROW_Y - 1} L${LEFT_BROW_X + 10},${BROW_Y - 3}`} />
                </G>

                {/* Right angry eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 4}
                      Q${RIGHT_BROW_X + 6},${BROW_Y} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 3}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${RIGHT_BROW_X - 1},${BROW_Y - 2} L${RIGHT_BROW_X + 2},${BROW_Y - 3}`}
                  fill="none"
                  stroke={darkColor}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
                <G stroke={darkColor} strokeWidth={0.5} opacity={0.35}>
                  <Path d={`M${RIGHT_BROW_X + 3},${BROW_Y - 1} L${RIGHT_BROW_X + 2},${BROW_Y - 3}`} />
                  <Path d={`M${RIGHT_BROW_X + 7},${BROW_Y + 1} L${RIGHT_BROW_X + 6},${BROW_Y - 1}`} />
                  <Path d={`M${RIGHT_BROW_X + 10},${BROW_Y + 2} L${RIGHT_BROW_X + 9},${BROW_Y + 0.5}`} />
                </G>
              </G>
            );

          case EyebrowStyle.SAD:
            return (
              <G>
                {/* Left sad eyebrow - angled up toward center */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - 3}
                      Q${LEFT_BROW_X + 6},${BROW_Y} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 3}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                <HairStrokes x={LEFT_BROW_X} y={BROW_Y} width={BROW_WIDTH} curve={2} color={eyebrowColor} direction="down" />

                {/* Right sad eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 3}
                      Q${RIGHT_BROW_X + 6},${BROW_Y} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 3}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                <HairStrokes x={RIGHT_BROW_X} y={BROW_Y} width={BROW_WIDTH} curve={2} color={eyebrowColor} direction="down" />
              </G>
            );

          case EyebrowStyle.RAISED:
            return (
              <G>
                {/* Left raised eyebrow - high position */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - 2}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 7} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y - 2}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                {/* Surprised arch highlight */}
                <Path
                  d={`M${LEFT_BROW_X + 3},${BROW_Y - 4} Q${LEFT_BROW_X + 6},${BROW_Y - 7} ${LEFT_BROW_X + 9},${BROW_Y - 4}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.6}
                  opacity={0.4}
                />
                <HairStrokes x={LEFT_BROW_X} y={BROW_Y - 3} width={BROW_WIDTH} curve={4} color={eyebrowColor} direction="up" />

                {/* Right raised eyebrow */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 2}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 7} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 2}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${RIGHT_BROW_X + 3},${BROW_Y - 4} Q${RIGHT_BROW_X + 6},${BROW_Y - 7} ${RIGHT_BROW_X + 9},${BROW_Y - 4}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.6}
                  opacity={0.4}
                />
                <HairStrokes x={RIGHT_BROW_X} y={BROW_Y - 3} width={BROW_WIDTH} curve={4} color={eyebrowColor} direction="up" />
              </G>
            );

          case EyebrowStyle.UNIBROW:
            return (
              <G>
                {/* Connected unibrow */}
                <Path
                  d={`M${LEFT_BROW_X - 2},${BROW_Y + 1}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 3} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}
                      Q${CENTER_X},${BROW_Y - 2} ${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 3} ${RIGHT_BROW_X + BROW_WIDTH + 2},${BROW_Y + 1}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Center bridge thickening */}
                <Path
                  d={`M${LEFT_BROW_X + 10},${BROW_Y} Q${CENTER_X},${BROW_Y - 1} ${RIGHT_BROW_X + 2},${BROW_Y}`}
                  fill="none"
                  stroke={eyebrowColor}
                  strokeWidth={2}
                />
                {/* Top highlight */}
                <Path
                  d={`M${LEFT_BROW_X + 3},${BROW_Y - 2} Q${CENTER_X},${BROW_Y - 3} ${RIGHT_BROW_X + 9},${BROW_Y - 2}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                {/* Hair texture across */}
                <G stroke={darkColor} strokeWidth={0.4} opacity={0.3}>
                  <Path d={`M${LEFT_BROW_X + 3},${BROW_Y} L${LEFT_BROW_X + 4},${BROW_Y - 2}`} />
                  <Path d={`M${LEFT_BROW_X + 8},${BROW_Y - 0.5} L${LEFT_BROW_X + 9},${BROW_Y - 2}`} />
                  <Path d={`M${CENTER_X - 2},${BROW_Y - 1} L${CENTER_X - 1},${BROW_Y - 2}`} />
                  <Path d={`M${CENTER_X + 2},${BROW_Y - 1} L${CENTER_X + 1},${BROW_Y - 2}`} />
                  <Path d={`M${RIGHT_BROW_X + 4},${BROW_Y - 0.5} L${RIGHT_BROW_X + 3},${BROW_Y - 2}`} />
                  <Path d={`M${RIGHT_BROW_X + 9},${BROW_Y} L${RIGHT_BROW_X + 8},${BROW_Y - 2}`} />
                </G>
              </G>
            );

          case EyebrowStyle.CONCERNED:
            return (
              <G>
                {/* Left concerned - slight inner raise */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - 1}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 3} ${LEFT_BROW_X + 8},${BROW_Y - 1}
                      Q${LEFT_BROW_X + 10},${BROW_Y} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 1}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />

                {/* Right concerned */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 1}
                      Q${RIGHT_BROW_X + 2},${BROW_Y} ${RIGHT_BROW_X + 4},${BROW_Y - 1}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 3} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 1}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case EyebrowStyle.SKEPTICAL:
            return (
              <G>
                {/* Left eyebrow - normal position */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 2} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <HairStrokes x={LEFT_BROW_X} y={BROW_Y - 0.5} width={BROW_WIDTH} curve={1.5} color={eyebrowColor} direction="up" />

                {/* Right eyebrow - raised high for skeptical look */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 4}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 8} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 4}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${RIGHT_BROW_X + 3},${BROW_Y - 5.5} Q${RIGHT_BROW_X + 6},${BROW_Y - 8} ${RIGHT_BROW_X + 9},${BROW_Y - 5.5}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.5}
                  opacity={0.4}
                />
                <HairStrokes x={RIGHT_BROW_X} y={BROW_Y - 5} width={BROW_WIDTH} curve={3} color={eyebrowColor} direction="up" />
              </G>
            );

          case EyebrowStyle.DEFAULT:
          default:
            return (
              <G>
                {/* Left default eyebrow - with adjustments */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - tiltOffset}
                      Q${LEFT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + tiltOffset}`}
                  fill="none"
                  stroke={`url(#${gradientIdLeft})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
                {/* Subtle top highlight */}
                <Path
                  d={`M${LEFT_BROW_X + BROW_WIDTH * 0.25},${BROW_Y - archAmount * 0.3 - tiltOffset * 0.5}
                      Q${LEFT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount * 0.8}
                      ${LEFT_BROW_X + BROW_WIDTH * 0.75},${BROW_Y - archAmount * 0.3 + tiltOffset * 0.5}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.4}
                  opacity={0.3}
                />

                {/* Right default eyebrow - with adjustments (mirrored) */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + tiltOffset}
                      Q${RIGHT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - tiltOffset}`}
                  fill="none"
                  stroke={`url(#${gradientIdRight})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${RIGHT_BROW_X + BROW_WIDTH * 0.25},${BROW_Y - archAmount * 0.3 + tiltOffset * 0.5}
                      Q${RIGHT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount * 0.8}
                      ${RIGHT_BROW_X + BROW_WIDTH * 0.75},${BROW_Y - archAmount * 0.3 - tiltOffset * 0.5}`}
                  fill="none"
                  stroke={lightColor}
                  strokeWidth={0.4}
                  opacity={0.3}
                />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Eyebrows;
