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
                {/* Left eyebrow - base fill with natural arch */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 0.8}
                      Q${LEFT_BROW_X + 3},${BROW_Y - 1.5} ${LEFT_BROW_X + 6},${BROW_Y - 2.2}
                      Q${LEFT_BROW_X + 9},${BROW_Y - 1.5} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 0.8}
                      Q${LEFT_BROW_X + 9},${BROW_Y - 2.8} ${LEFT_BROW_X + 6},${BROW_Y - 3.5}
                      Q${LEFT_BROW_X + 3},${BROW_Y - 2.8} ${LEFT_BROW_X},${BROW_Y - 0.2}
                      Z`}
                  fill={eyebrowColor}
                  opacity={0.85}
                />
                {/* Left brow hair strokes - multiple thin paths grouped */}
                <G opacity={0.7}>
                  <Path d={`M${LEFT_BROW_X + 0.5},${BROW_Y + 0.5} L${LEFT_BROW_X + 1.5},${BROW_Y - 1}`} stroke={darkColor} strokeWidth={0.35} strokeLinecap="round" />
                  <Path d={`M${LEFT_BROW_X + 1.8},${BROW_Y} L${LEFT_BROW_X + 2.8},${BROW_Y - 1.8}`} stroke={darkColor} strokeWidth={0.4} strokeLinecap="round" />
                  <Path d={`M${LEFT_BROW_X + 3.2},${BROW_Y - 0.8} L${LEFT_BROW_X + 4.5},${BROW_Y - 2.8}`} stroke={eyebrowColor} strokeWidth={0.45} strokeLinecap="round" />
                  <Path d={`M${LEFT_BROW_X + 5},${BROW_Y - 1.2} L${LEFT_BROW_X + 6.2},${BROW_Y - 3}`} stroke={darkColor} strokeWidth={0.5} strokeLinecap="round" />
                  <Path d={`M${LEFT_BROW_X + 6.8},${BROW_Y - 1.5} L${LEFT_BROW_X + 8},${BROW_Y - 2.5}`} stroke={darkColor} strokeWidth={0.45} strokeLinecap="round" />
                  <Path d={`M${LEFT_BROW_X + 8.5},${BROW_Y - 0.5} L${LEFT_BROW_X + 9.8},${BROW_Y - 1.2}`} stroke={darkColor} strokeWidth={0.4} strokeLinecap="round" />
                  <Path d={`M${LEFT_BROW_X + 10.2},${BROW_Y + 0.2} L${LEFT_BROW_X + 11.2},${BROW_Y + 0.5}`} stroke={lightColor} strokeWidth={0.35} strokeLinecap="round" />
                </G>

                {/* Right eyebrow - base fill with natural arch */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 0.8}
                      Q${RIGHT_BROW_X + 3},${BROW_Y - 1.5} ${RIGHT_BROW_X + 6},${BROW_Y - 2.2}
                      Q${RIGHT_BROW_X + 9},${BROW_Y - 1.5} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 0.8}
                      Q${RIGHT_BROW_X + 9},${BROW_Y - 2.8} ${RIGHT_BROW_X + 6},${BROW_Y - 3.5}
                      Q${RIGHT_BROW_X + 3},${BROW_Y - 2.8} ${RIGHT_BROW_X},${BROW_Y - 0.2}
                      Z`}
                  fill={eyebrowColor}
                  opacity={0.85}
                />
                {/* Right brow hair strokes - multiple thin paths grouped */}
                <G opacity={0.7}>
                  <Path d={`M${RIGHT_BROW_X + 0.5},${BROW_Y + 0.5} L${RIGHT_BROW_X + 1.5},${BROW_Y - 1}`} stroke={lightColor} strokeWidth={0.35} strokeLinecap="round" />
                  <Path d={`M${RIGHT_BROW_X + 1.8},${BROW_Y} L${RIGHT_BROW_X + 2.8},${BROW_Y - 1.8}`} stroke={darkColor} strokeWidth={0.4} strokeLinecap="round" />
                  <Path d={`M${RIGHT_BROW_X + 3.2},${BROW_Y - 0.8} L${RIGHT_BROW_X + 4.5},${BROW_Y - 2.8}`} stroke={eyebrowColor} strokeWidth={0.45} strokeLinecap="round" />
                  <Path d={`M${RIGHT_BROW_X + 5},${BROW_Y - 1.2} L${RIGHT_BROW_X + 6.2},${BROW_Y - 3}`} stroke={darkColor} strokeWidth={0.5} strokeLinecap="round" />
                  <Path d={`M${RIGHT_BROW_X + 6.8},${BROW_Y - 1.5} L${RIGHT_BROW_X + 8},${BROW_Y - 2.5}`} stroke={darkColor} strokeWidth={0.45} strokeLinecap="round" />
                  <Path d={`M${RIGHT_BROW_X + 8.5},${BROW_Y - 0.5} L${RIGHT_BROW_X + 9.8},${BROW_Y - 1.2}`} stroke={darkColor} strokeWidth={0.4} strokeLinecap="round" />
                  <Path d={`M${RIGHT_BROW_X + 10.2},${BROW_Y + 0.2} L${RIGHT_BROW_X + 11.2},${BROW_Y + 0.5}`} stroke={darkColor} strokeWidth={0.35} strokeLinecap="round" />
                </G>
              </G>
            );

          case EyebrowStyle.THICK:
            return (
              <G>
                {/* Left thick eyebrow - filled shape with more vertical height */}
                <Path
                  d={`M${LEFT_BROW_X - 1},${BROW_Y + 2}
                      Q${LEFT_BROW_X + 2},${BROW_Y - 1} ${LEFT_BROW_X + 6},${BROW_Y - 2}
                      Q${LEFT_BROW_X + 10},${BROW_Y - 1} ${LEFT_BROW_X + BROW_WIDTH + 1},${BROW_Y + 1}
                      Q${LEFT_BROW_X + 10},${BROW_Y - 4} ${LEFT_BROW_X + 6},${BROW_Y - 6}
                      Q${LEFT_BROW_X + 2},${BROW_Y - 4} ${LEFT_BROW_X - 1},${BROW_Y - 1}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right thick eyebrow - filled shape with more vertical height */}
                <Path
                  d={`M${RIGHT_BROW_X - 1},${BROW_Y + 1}
                      Q${RIGHT_BROW_X + 2},${BROW_Y - 1} ${RIGHT_BROW_X + 6},${BROW_Y - 2}
                      Q${RIGHT_BROW_X + 10},${BROW_Y - 1} ${RIGHT_BROW_X + BROW_WIDTH + 1},${BROW_Y + 2}
                      Q${RIGHT_BROW_X + 10},${BROW_Y - 4} ${RIGHT_BROW_X + 6},${BROW_Y - 6}
                      Q${RIGHT_BROW_X + 2},${BROW_Y - 4} ${RIGHT_BROW_X - 1},${BROW_Y - 1}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.THIN:
            return (
              <G>
                {/* Left thin eyebrow - narrower filled shape */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 0.75}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 1.25} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 0.75}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 2.75} ${LEFT_BROW_X},${BROW_Y - 0.75}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right thin eyebrow - narrower filled shape */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 0.75}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 1.25} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 0.75}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 2.75} ${RIGHT_BROW_X},${BROW_Y - 0.75}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.ARCHED:
            return (
              <G>
                {/* Left arched eyebrow - dramatic high arch filled */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 2.3}
                      Q${LEFT_BROW_X + 3},${BROW_Y - 1.7} ${LEFT_BROW_X + 6},${BROW_Y - 3.7}
                      Q${LEFT_BROW_X + 9},${BROW_Y - 2.7} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 1.3}
                      Q${LEFT_BROW_X + 9},${BROW_Y - 5.3} ${LEFT_BROW_X + 6},${BROW_Y - 6.3}
                      Q${LEFT_BROW_X + 3},${BROW_Y - 4.3} ${LEFT_BROW_X},${BROW_Y - 0.3}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right arched eyebrow - dramatic high arch filled */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 1.3}
                      Q${RIGHT_BROW_X + 3},${BROW_Y - 2.7} ${RIGHT_BROW_X + 6},${BROW_Y - 3.7}
                      Q${RIGHT_BROW_X + 9},${BROW_Y - 1.7} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 2.3}
                      Q${RIGHT_BROW_X + 9},${BROW_Y - 4.3} ${RIGHT_BROW_X + 6},${BROW_Y - 6.3}
                      Q${RIGHT_BROW_X + 3},${BROW_Y - 5.3} ${RIGHT_BROW_X},${BROW_Y - 0.3}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.FLAT:
            return (
              <G>
                {/* Left flat eyebrow - filled rectangle with rounded ends */}
                <Path
                  d={`M${LEFT_BROW_X + 1.3},${BROW_Y - 1.3}
                      L${LEFT_BROW_X + BROW_WIDTH - 1.3},${BROW_Y - 1.3}
                      Q${LEFT_BROW_X + BROW_WIDTH},${BROW_Y - 1.3} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y}
                      Q${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 1.3} ${LEFT_BROW_X + BROW_WIDTH - 1.3},${BROW_Y + 1.3}
                      L${LEFT_BROW_X + 1.3},${BROW_Y + 1.3}
                      Q${LEFT_BROW_X},${BROW_Y + 1.3} ${LEFT_BROW_X},${BROW_Y}
                      Q${LEFT_BROW_X},${BROW_Y - 1.3} ${LEFT_BROW_X + 1.3},${BROW_Y - 1.3}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right flat eyebrow - filled rectangle with rounded ends */}
                <Path
                  d={`M${RIGHT_BROW_X + 1.3},${BROW_Y - 1.3}
                      L${RIGHT_BROW_X + BROW_WIDTH - 1.3},${BROW_Y - 1.3}
                      Q${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 1.3} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y}
                      Q${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 1.3} ${RIGHT_BROW_X + BROW_WIDTH - 1.3},${BROW_Y + 1.3}
                      L${RIGHT_BROW_X + 1.3},${BROW_Y + 1.3}
                      Q${RIGHT_BROW_X},${BROW_Y + 1.3} ${RIGHT_BROW_X},${BROW_Y}
                      Q${RIGHT_BROW_X},${BROW_Y - 1.3} ${RIGHT_BROW_X + 1.3},${BROW_Y - 1.3}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.ANGRY:
            return (
              <G>
                {/* Left angry eyebrow - angled down toward center, filled wedge */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 4.6}
                      Q${LEFT_BROW_X + 6},${BROW_Y + 1.6} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y - 2.4}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 1.6} ${LEFT_BROW_X},${BROW_Y + 1.4}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right angry eyebrow - angled down toward center, filled wedge */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 2.4}
                      Q${RIGHT_BROW_X + 6},${BROW_Y + 1.6} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 4.6}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 1.6} ${RIGHT_BROW_X},${BROW_Y + 1.4}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.SAD:
            return (
              <G>
                {/* Left sad eyebrow - angled up toward center, filled */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - 1.7}
                      Q${LEFT_BROW_X + 6},${BROW_Y + 1.3} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 4.3}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 1.3} ${LEFT_BROW_X},${BROW_Y - 4.3}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right sad eyebrow - angled up toward center, filled */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 4.3}
                      Q${RIGHT_BROW_X + 6},${BROW_Y + 1.3} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 1.7}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 1.3} ${RIGHT_BROW_X},${BROW_Y - 4.3}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.RAISED:
            return (
              <G>
                {/* Left raised eyebrow — moderate lift, filled */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 0.2}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 3.8} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 0.2}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 6.2} ${LEFT_BROW_X},${BROW_Y - 2.2}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right raised eyebrow — moderate lift, filled */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 0.2}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 3.8} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 0.2}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 6.2} ${RIGHT_BROW_X},${BROW_Y - 2.2}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.UNIBROW:
            return (
              <G>
                {/* Connected unibrow - filled shape across entire bridge */}
                <Path
                  d={`M${LEFT_BROW_X - 2},${BROW_Y + 2.5}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 1.5} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 1.5}
                      Q${CENTER_X},${BROW_Y - 0.5} ${RIGHT_BROW_X},${BROW_Y + 1.5}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 1.5} ${RIGHT_BROW_X + BROW_WIDTH + 2},${BROW_Y + 2.5}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 4.5} ${RIGHT_BROW_X},${BROW_Y - 1.5}
                      Q${CENTER_X},${BROW_Y - 3.5} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y - 1.5}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 4.5} ${LEFT_BROW_X - 2},${BROW_Y - 0.5}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.CONCERNED:
            return (
              <G>
                {/* Left concerned - slight inner raise, filled */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 0.25}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 1.75} ${LEFT_BROW_X + 8},${BROW_Y + 0.25}
                      Q${LEFT_BROW_X + 10},${BROW_Y + 1.25} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 2.25}
                      Q${LEFT_BROW_X + 10},${BROW_Y - 1.25} ${LEFT_BROW_X + 8},${BROW_Y - 2.25}
                      Q${LEFT_BROW_X + 4},${BROW_Y - 4.25} ${LEFT_BROW_X},${BROW_Y - 2.25}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right concerned - slight inner raise, filled */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + 2.25}
                      Q${RIGHT_BROW_X + 2},${BROW_Y + 1.25} ${RIGHT_BROW_X + 4},${BROW_Y + 0.25}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 1.75} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y + 0.25}
                      Q${RIGHT_BROW_X + 8},${BROW_Y - 4.25} ${RIGHT_BROW_X + 4},${BROW_Y - 2.25}
                      Q${RIGHT_BROW_X + 2},${BROW_Y - 1.25} ${RIGHT_BROW_X},${BROW_Y - 2.25}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.SKEPTICAL:
            return (
              <G>
                {/* Left eyebrow - normal position, filled */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y + 1.25}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 0.75} ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + 1.25}
                      Q${LEFT_BROW_X + 6},${BROW_Y - 3.25} ${LEFT_BROW_X},${BROW_Y - 1.25}
                      Z`}
                  fill={eyebrowColor}
                />

                {/* Right eyebrow - raised high for skeptical look, filled */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y - 2.75}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 6.75} ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - 2.75}
                      Q${RIGHT_BROW_X + 6},${BROW_Y - 9.25} ${RIGHT_BROW_X},${BROW_Y - 5.25}
                      Z`}
                  fill={eyebrowColor}
                />
              </G>
            );

          case EyebrowStyle.DEFAULT:
          default:
            const thicknessVal = strokeWidth / 2;
            return (
              <G>
                {/* Left default eyebrow - filled crescent */}
                <Path
                  d={`M${LEFT_BROW_X},${BROW_Y - tiltOffset + thicknessVal}
                      Q${LEFT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount - thicknessVal}
                      ${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + tiltOffset + thicknessVal}
                      Q${LEFT_BROW_X + BROW_WIDTH},${BROW_Y + tiltOffset - thicknessVal}
                      ${LEFT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount + thicknessVal}
                      Q${LEFT_BROW_X},${BROW_Y - tiltOffset - thicknessVal}
                      ${LEFT_BROW_X},${BROW_Y - tiltOffset + thicknessVal}
                      Z`}
                  fill={eyebrowColor}
                />
                {/* Left brow hair texture */}
                <G opacity={0.25}>
                  <Path d={`M${LEFT_BROW_X + 3},${BROW_Y - tiltOffset} L${LEFT_BROW_X + 5},${BROW_Y - archAmount}`} stroke={darkColor} strokeWidth={0.35} />
                  <Path d={`M${LEFT_BROW_X + 7},${BROW_Y - archAmount + 0.5} L${LEFT_BROW_X + 9},${BROW_Y + tiltOffset - 0.5}`} stroke={darkColor} strokeWidth={0.35} />
                </G>

                {/* Right default eyebrow - filled crescent */}
                <Path
                  d={`M${RIGHT_BROW_X},${BROW_Y + tiltOffset + thicknessVal}
                      Q${RIGHT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount - thicknessVal}
                      ${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - tiltOffset + thicknessVal}
                      Q${RIGHT_BROW_X + BROW_WIDTH},${BROW_Y - tiltOffset - thicknessVal}
                      ${RIGHT_BROW_X + BROW_WIDTH / 2},${BROW_Y - archAmount + thicknessVal}
                      Q${RIGHT_BROW_X},${BROW_Y + tiltOffset - thicknessVal}
                      ${RIGHT_BROW_X},${BROW_Y + tiltOffset + thicknessVal}
                      Z`}
                  fill={eyebrowColor}
                />
                {/* Right brow hair texture */}
                <G opacity={0.25}>
                  <Path d={`M${RIGHT_BROW_X + 3},${BROW_Y + tiltOffset} L${RIGHT_BROW_X + 5},${BROW_Y - archAmount}`} stroke={darkColor} strokeWidth={0.35} />
                  <Path d={`M${RIGHT_BROW_X + 7},${BROW_Y - archAmount + 0.5} L${RIGHT_BROW_X + 9},${BROW_Y - tiltOffset - 0.5}`} stroke={darkColor} strokeWidth={0.35} />
                </G>
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Eyebrows;
