/**
 * Mouth Component - Multiple mouth styles
 * Enhanced with realistic lip contours, teeth detail, and natural shading
 */

import React from 'react';
import { G, Path, Ellipse, Circle, Rect, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { MouthStyle, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type MouthGradientIds = {
  lipGradient: string;
  mouthInteriorGradient: string;
  tongueGradient: string;
  teethGradient: string;
};

interface MouthProps extends SvgPartProps {
  style: MouthStyle;
  lipColor?: string;
}

const MOUTH_X = 50;
const MOUTH_Y = 62;
const LIP_COLOR = '#c47b7b';
const TONGUE_COLOR = '#d35d6e';
const TEETH_COLOR = '#fffef5';
const MOUTH_INTERIOR = '#3a1515';
const GUM_COLOR = '#e8a0a0';

export function Mouth({ style, lipColor = LIP_COLOR, scale = 1 }: MouthProps) {
  const lipHighlight = adjustBrightness(lipColor, 35);
  const lipShadow = adjustBrightness(lipColor, -25);
  const lipDeepShadow = adjustBrightness(lipColor, -40);
  const tongueHighlight = adjustBrightness(TONGUE_COLOR, 25);
  const tongueShadow = adjustBrightness(TONGUE_COLOR, -20);

  const ids = useGradientIds<MouthGradientIds>(['lipGradient', 'mouthInteriorGradient', 'tongueGradient', 'teethGradient']);
  const lipGradientId = ids.lipGradient;
  const mouthInteriorGradientId = ids.mouthInteriorGradient;
  const tongueGradientId = ids.tongueGradient;
  const teethGradientId = ids.teethGradient;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Lip gradient for natural appearance */}
        <LinearGradient id={lipGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={lipHighlight} />
          <Stop offset="40%" stopColor={lipColor} />
          <Stop offset="100%" stopColor={lipShadow} />
        </LinearGradient>

        {/* Mouth interior gradient for depth */}
        <RadialGradient id={mouthInteriorGradientId} cx="50%" cy="30%" rx="60%" ry="70%">
          <Stop offset="0%" stopColor="#4a2020" />
          <Stop offset="60%" stopColor={MOUTH_INTERIOR} />
          <Stop offset="100%" stopColor="#1a0808" />
        </RadialGradient>

        {/* Tongue gradient */}
        <RadialGradient id={tongueGradientId} cx="50%" cy="30%" rx="60%" ry="60%">
          <Stop offset="0%" stopColor={tongueHighlight} />
          <Stop offset="70%" stopColor={TONGUE_COLOR} />
          <Stop offset="100%" stopColor={tongueShadow} />
        </RadialGradient>

        {/* Teeth gradient for natural appearance */}
        <LinearGradient id={teethGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="30%" stopColor={TEETH_COLOR} />
          <Stop offset="100%" stopColor="#e8e8e0" />
        </LinearGradient>
      </Defs>

      {(() => {
        switch (style) {
          case MouthStyle.SMILE:
            return (
              <G>
                {/* Mouth shadow */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 1} Q${MOUTH_X},${MOUTH_Y + 9} ${MOUTH_X + 8},${MOUTH_Y + 1}`}
                  fill="none"
                  stroke="#00000015"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Upper lip line with pronounced cupid's bow */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y} Q${MOUTH_X - 4},${MOUTH_Y - 1.2} ${MOUTH_X - 1.5},${MOUTH_Y - 0.3}
                      Q${MOUTH_X},${MOUTH_Y + 0.2} ${MOUTH_X + 1.5},${MOUTH_Y - 0.3}
                      Q${MOUTH_X + 4},${MOUTH_Y - 1.2} ${MOUTH_X + 8},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Lower lip curve */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y} Q${MOUTH_X},${MOUTH_Y + 8} ${MOUTH_X + 8},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Cupid's bow definition - center dip */}
                <Path
                  d={`M${MOUTH_X - 1.5},${MOUTH_Y - 0.3} Q${MOUTH_X},${MOUTH_Y + 0.4} ${MOUTH_X + 1.5},${MOUTH_Y - 0.3}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.9}
                  opacity={0.7}
                />
                {/* Lip shadow below lower lip */}
                <Path
                  d={`M${MOUTH_X - 6},${MOUTH_Y + 8.5} Q${MOUTH_X},${MOUTH_Y + 9} ${MOUTH_X + 6},${MOUTH_Y + 8.5}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
                {/* Lip highlight on lower lip */}
                <Path
                  d={`M${MOUTH_X - 4},${MOUTH_Y + 4} Q${MOUTH_X},${MOUTH_Y + 5.5} ${MOUTH_X + 4},${MOUTH_Y + 4}`}
                  fill="none"
                  stroke={lipHighlight}
                  strokeWidth={1}
                  opacity={0.4}
                />
              </G>
            );

          case MouthStyle.BIG_SMILE:
            return (
              <G>
                {/* Mouth interior with gradient - reduced width */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y} Q${MOUTH_X},${MOUTH_Y + 12} ${MOUTH_X + 10},${MOUTH_Y}`}
                  fill={`url(#${mouthInteriorGradientId})`}
                />
                {/* Teeth row with gradient - reduced width */}
                <Path
                  d={`M${MOUTH_X - 7.5},${MOUTH_Y + 0.5} L${MOUTH_X + 7.5},${MOUTH_Y + 0.5} L${MOUTH_X + 6},${MOUTH_Y + 5} L${MOUTH_X - 6},${MOUTH_Y + 5} Z`}
                  fill={`url(#${teethGradientId})`}
                />
                {/* Tooth separators - subtle hints */}
                <G stroke="#d8d8d0" strokeWidth={0.25} opacity={0.4}>
                  <Path d={`M${MOUTH_X - 4},${MOUTH_Y + 0.5} L${MOUTH_X - 3.8},${MOUTH_Y + 5}`} />
                  <Path d={`M${MOUTH_X - 1.2},${MOUTH_Y + 0.5} L${MOUTH_X - 1},${MOUTH_Y + 5}`} />
                  <Path d={`M${MOUTH_X + 1.2},${MOUTH_Y + 0.5} L${MOUTH_X + 1},${MOUTH_Y + 5}`} />
                  <Path d={`M${MOUTH_X + 4},${MOUTH_Y + 0.5} L${MOUTH_X + 3.8},${MOUTH_Y + 5}`} />
                </G>
                {/* Upper lip with pronounced cupid's bow */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y} Q${MOUTH_X - 5},${MOUTH_Y - 2} ${MOUTH_X - 1.5},${MOUTH_Y - 0.8}
                      Q${MOUTH_X},${MOUTH_Y + 0.2} ${MOUTH_X + 1.5},${MOUTH_Y - 0.8}
                      Q${MOUTH_X + 5},${MOUTH_Y - 2} ${MOUTH_X + 10},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
                {/* Lower lip outline */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y} Q${MOUTH_X},${MOUTH_Y + 12} ${MOUTH_X + 10},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={1.5}
                />
                {/* Lip shadow below lower lip */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 12.5} Q${MOUTH_X},${MOUTH_Y + 13} ${MOUTH_X + 8},${MOUTH_Y + 12.5}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
                {/* Lip corner shadow */}
                <Circle cx={MOUTH_X - 9.5} cy={MOUTH_Y + 1} r={1} fill={lipDeepShadow} opacity={0.3} />
                <Circle cx={MOUTH_X + 9.5} cy={MOUTH_Y + 1} r={1} fill={lipDeepShadow} opacity={0.3} />
              </G>
            );

          case MouthStyle.GRIN:
            return (
              <G>
                {/* Mouth interior */}
                <Path
                  d={`M${MOUTH_X - 14},${MOUTH_Y - 2} Q${MOUTH_X},${MOUTH_Y + 12} ${MOUTH_X + 14},${MOUTH_Y - 2}`}
                  fill={`url(#${mouthInteriorGradientId})`}
                />
                {/* Teeth with shine */}
                <Path
                  d={`M${MOUTH_X - 11},${MOUTH_Y - 1} L${MOUTH_X + 11},${MOUTH_Y - 1}
                      Q${MOUTH_X},${MOUTH_Y + 7} ${MOUTH_X - 11},${MOUTH_Y - 1}`}
                  fill={`url(#${teethGradientId})`}
                />
                {/* Tooth gaps */}
                <G stroke="#e0e0d8" strokeWidth={0.4} opacity={0.6}>
                  {[-8, -4, 0, 4, 8].map((offset) => (
                    <Path
                      key={offset}
                      d={`M${MOUTH_X + offset},${MOUTH_Y - 1} L${MOUTH_X + offset * 0.8},${MOUTH_Y + 3}`}
                    />
                  ))}
                </G>
                {/* Lip outline */}
                <Path
                  d={`M${MOUTH_X - 14},${MOUTH_Y - 2} Q${MOUTH_X},${MOUTH_Y + 12} ${MOUTH_X + 14},${MOUTH_Y - 2}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={1.8}
                />
                {/* Dimples at corners */}
                <Circle cx={MOUTH_X - 14} cy={MOUTH_Y - 1} r={1.2} fill={lipDeepShadow} opacity={0.2} />
                <Circle cx={MOUTH_X + 14} cy={MOUTH_Y - 1} r={1.2} fill={lipDeepShadow} opacity={0.2} />
              </G>
            );

          case MouthStyle.LAUGH:
            return (
              <G>
                {/* Mouth opening — smaller, rounder */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={9}
                  ry={7}
                  fill={`url(#${mouthInteriorGradientId})`}
                />
                {/* Teeth row */}
                <Path
                  d={`M${MOUTH_X - 7},${MOUTH_Y - 2} L${MOUTH_X + 7},${MOUTH_Y - 2}
                      L${MOUTH_X + 5},${MOUTH_Y + 1.5} L${MOUTH_X - 5},${MOUTH_Y + 1.5} Z`}
                  fill={`url(#${teethGradientId})`}
                />
                {/* Tooth separators */}
                <G stroke="#e0e0d8" strokeWidth={0.3}>
                  {[-3.5, 0, 3.5].map((offset) => (
                    <Path
                      key={offset}
                      d={`M${MOUTH_X + offset},${MOUTH_Y - 2} L${MOUTH_X + offset * 0.9},${MOUTH_Y + 1.5}`}
                    />
                  ))}
                </G>
                {/* Tongue — smaller */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 6}
                  rx={4.5}
                  ry={3}
                  fill={`url(#${tongueGradientId})`}
                />
                {/* Tongue center line */}
                <Path
                  d={`M${MOUTH_X},${MOUTH_Y + 4} L${MOUTH_X},${MOUTH_Y + 8}`}
                  stroke={tongueShadow}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                {/* Lip outline */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={9}
                  ry={7}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={1.5}
                />
              </G>
            );

          case MouthStyle.SMIRK:
            return (
              <G>
                {/* Shadow */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 3} Q${MOUTH_X - 2},${MOUTH_Y + 1} ${MOUTH_X + 2},${MOUTH_Y + 1}
                      Q${MOUTH_X + 8},${MOUTH_Y - 3} ${MOUTH_X + 10},${MOUTH_Y - 1}`}
                  fill="none"
                  stroke="#00000010"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Main smirk curve */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 2} Q${MOUTH_X - 2},${MOUTH_Y} ${MOUTH_X + 2},${MOUTH_Y}
                      Q${MOUTH_X + 8},${MOUTH_Y - 4} ${MOUTH_X + 10},${MOUTH_Y - 2}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Upper lip suggestion */}
                <Path
                  d={`M${MOUTH_X - 6},${MOUTH_Y + 1} Q${MOUTH_X},${MOUTH_Y - 1} ${MOUTH_X + 6},${MOUTH_Y - 2}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={1}
                  opacity={0.5}
                />
                {/* Raised corner highlight */}
                <Circle cx={MOUTH_X + 10} cy={MOUTH_Y - 3} r={0.8} fill={lipHighlight} opacity={0.4} />
              </G>
            );

          case MouthStyle.SAD:
            return (
              <G>
                {/* Shadow */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y + 5} Q${MOUTH_X},${MOUTH_Y - 5} ${MOUTH_X + 10},${MOUTH_Y + 5}`}
                  fill="none"
                  stroke="#00000010"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Main sad curve */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y + 4} Q${MOUTH_X},${MOUTH_Y - 6} ${MOUTH_X + 10},${MOUTH_Y + 4}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Lower lip fullness */}
                <Path
                  d={`M${MOUTH_X - 6},${MOUTH_Y + 2} Q${MOUTH_X},${MOUTH_Y} ${MOUTH_X + 6},${MOUTH_Y + 2}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={1.2}
                  opacity={0.4}
                />
                {/* Drooped corners */}
                <Circle cx={MOUTH_X - 10} cy={MOUTH_Y + 5} r={0.8} fill={lipDeepShadow} opacity={0.3} />
                <Circle cx={MOUTH_X + 10} cy={MOUTH_Y + 5} r={0.8} fill={lipDeepShadow} opacity={0.3} />
              </G>
            );

          case MouthStyle.FROWN:
            return (
              <G>
                {/* Deep shadow */}
                <Path
                  d={`M${MOUTH_X - 12},${MOUTH_Y + 7} Q${MOUTH_X},${MOUTH_Y - 7} ${MOUTH_X + 12},${MOUTH_Y + 7}`}
                  fill="none"
                  stroke="#00000012"
                  strokeWidth={5}
                  strokeLinecap="round"
                />
                {/* Main frown */}
                <Path
                  d={`M${MOUTH_X - 12},${MOUTH_Y + 6} Q${MOUTH_X},${MOUTH_Y - 8} ${MOUTH_X + 12},${MOUTH_Y + 6}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
                {/* Lower lip detail */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 3} Q${MOUTH_X},${MOUTH_Y - 2} ${MOUTH_X + 8},${MOUTH_Y + 3}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={1.5}
                  opacity={0.3}
                />
              </G>
            );

          case MouthStyle.SERIOUS:
            return (
              <G>
                {/* Shadow */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 1} L${MOUTH_X + 8},${MOUTH_Y + 1}`}
                  fill="none"
                  stroke="#00000010"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Main line */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y} L${MOUTH_X + 8},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Upper lip definition */}
                <Path
                  d={`M${MOUTH_X - 6},${MOUTH_Y - 1} Q${MOUTH_X},${MOUTH_Y - 2} ${MOUTH_X + 6},${MOUTH_Y - 1}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
                {/* Lower lip suggestion */}
                <Path
                  d={`M${MOUTH_X - 5},${MOUTH_Y + 1} Q${MOUTH_X},${MOUTH_Y + 2.5} ${MOUTH_X + 5},${MOUTH_Y + 1}`}
                  fill="none"
                  stroke={lipHighlight}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
              </G>
            );

          case MouthStyle.OPEN:
            return (
              <G>
                {/* Mouth interior */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={7}
                  ry={9}
                  fill={`url(#${mouthInteriorGradientId})`}
                />
                {/* Tongue hint at bottom */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 8}
                  rx={4}
                  ry={2.5}
                  fill={TONGUE_COLOR}
                  opacity={0.6}
                />
                {/* Lip outline */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={7}
                  ry={9}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2}
                />
                {/* Upper lip definition */}
                <Path
                  d={`M${MOUTH_X - 5},${MOUTH_Y - 5} Q${MOUTH_X},${MOUTH_Y - 6.5} ${MOUTH_X + 5},${MOUTH_Y - 5}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={1}
                />
              </G>
            );

          case MouthStyle.TONGUE:
            return (
              <G>
                {/* Smile shadow */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y + 1} Q${MOUTH_X},${MOUTH_Y + 11} ${MOUTH_X + 10},${MOUTH_Y + 1}`}
                  fill="none"
                  stroke="#00000010"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Smile curve */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y} Q${MOUTH_X},${MOUTH_Y + 10} ${MOUTH_X + 10},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Tongue with gradient */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 11}
                  rx={5.5}
                  ry={6.5}
                  fill={`url(#${tongueGradientId})`}
                />
                {/* Tongue center line */}
                <Path
                  d={`M${MOUTH_X},${MOUTH_Y + 7} L${MOUTH_X},${MOUTH_Y + 15}`}
                  fill="none"
                  stroke={tongueShadow}
                  strokeWidth={1}
                  opacity={0.5}
                />
                {/* Tongue highlight */}
                <Ellipse
                  cx={MOUTH_X - 1}
                  cy={MOUTH_Y + 9}
                  rx={2}
                  ry={1.5}
                  fill={tongueHighlight}
                  opacity={0.4}
                />
              </G>
            );

          case MouthStyle.KISS:
            return (
              <G>
                {/* Shadow */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 1}
                  rx={5}
                  ry={6}
                  fill="#00000010"
                />
                {/* Puckered lips outer */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y}
                  rx={4.5}
                  ry={5.5}
                  fill={lipColor}
                />
                {/* Upper lip */}
                <Path
                  d={`M${MOUTH_X - 4},${MOUTH_Y - 2} Q${MOUTH_X},${MOUTH_Y - 4} ${MOUTH_X + 4},${MOUTH_Y - 2}`}
                  fill={lipShadow}
                />
                {/* Lower lip highlight */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={2.5}
                  ry={2}
                  fill={lipHighlight}
                  opacity={0.5}
                />
                {/* Lip pucker highlight */}
                <Circle
                  cx={MOUTH_X - 1.5}
                  cy={MOUTH_Y - 1}
                  r={1.2}
                  fill={lipHighlight}
                  opacity={0.6}
                />
                {/* Center crease */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y}
                  rx={1.5}
                  ry={2}
                  fill={lipDeepShadow}
                  opacity={0.4}
                />
              </G>
            );

          case MouthStyle.SURPRISED:
            return (
              <G>
                {/* Mouth opening with gradient */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={6}
                  ry={8}
                  fill={`url(#${mouthInteriorGradientId})`}
                />
                {/* Tongue hint */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 7}
                  rx={3}
                  ry={2}
                  fill={TONGUE_COLOR}
                  opacity={0.5}
                />
                {/* Lip outline */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={6}
                  ry={8}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.2}
                />
                {/* Upper lip cupid's bow */}
                <Path
                  d={`M${MOUTH_X - 4},${MOUTH_Y - 5} Q${MOUTH_X},${MOUTH_Y - 6.5} ${MOUTH_X + 4},${MOUTH_Y - 5}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={1.2}
                />
                {/* Lower lip highlight */}
                <Path
                  d={`M${MOUTH_X - 3},${MOUTH_Y + 8} Q${MOUTH_X},${MOUTH_Y + 10} ${MOUTH_X + 3},${MOUTH_Y + 8}`}
                  fill="none"
                  stroke={lipHighlight}
                  strokeWidth={1}
                  opacity={0.4}
                />
              </G>
            );

          case MouthStyle.GRIMACE:
            return (
              <G>
                {/* Shadow behind teeth */}
                <Rect
                  x={MOUTH_X - 10}
                  y={MOUTH_Y - 2}
                  width={20}
                  height={10}
                  rx={2}
                  fill="#00000015"
                />
                {/* Teeth background */}
                <Rect
                  x={MOUTH_X - 10}
                  y={MOUTH_Y - 3}
                  width={20}
                  height={10}
                  rx={2}
                  fill={`url(#${teethGradientId})`}
                />
                {/* Gum line at top */}
                <Rect
                  x={MOUTH_X - 9}
                  y={MOUTH_Y - 3}
                  width={18}
                  height={2}
                  fill={GUM_COLOR}
                  opacity={0.5}
                />
                {/* Tooth separators */}
                <G stroke="#d0d0d0" strokeWidth={0.6} opacity={0.7}>
                  {[-6, -2, 2, 6].map((offset) => (
                    <Path
                      key={offset}
                      d={`M${MOUTH_X + offset},${MOUTH_Y - 3} L${MOUTH_X + offset},${MOUTH_Y + 7}`}
                    />
                  ))}
                </G>
                {/* Tooth highlight on front teeth */}
                <Rect
                  x={MOUTH_X - 2}
                  y={MOUTH_Y - 2}
                  width={4}
                  height={8}
                  fill="white"
                  opacity={0.15}
                />
                {/* Lip outline */}
                <Rect
                  x={MOUTH_X - 10}
                  y={MOUTH_Y - 3}
                  width={20}
                  height={10}
                  rx={2}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={1.8}
                />
                {/* Tension lines at corners */}
                <Path
                  d={`M${MOUTH_X - 11},${MOUTH_Y} L${MOUTH_X - 13},${MOUTH_Y + 1}`}
                  stroke={lipShadow}
                  strokeWidth={0.8}
                  opacity={0.4}
                />
                <Path
                  d={`M${MOUTH_X + 11},${MOUTH_Y} L${MOUTH_X + 13},${MOUTH_Y + 1}`}
                  stroke={lipShadow}
                  strokeWidth={0.8}
                  opacity={0.4}
                />
              </G>
            );

          case MouthStyle.CONCERNED:
            return (
              <G>
                {/* Shadow */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y + 3} Q${MOUTH_X - 5},${MOUTH_Y - 1} ${MOUTH_X},${MOUTH_Y + 3}
                      Q${MOUTH_X + 5},${MOUTH_Y + 7} ${MOUTH_X + 10},${MOUTH_Y + 3}`}
                  fill="none"
                  stroke="#00000010"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Wavy concerned line */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y + 2} Q${MOUTH_X - 5},${MOUTH_Y - 2} ${MOUTH_X},${MOUTH_Y + 2}
                      Q${MOUTH_X + 5},${MOUTH_Y + 6} ${MOUTH_X + 10},${MOUTH_Y + 2}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Upper lip hint */}
                <Path
                  d={`M${MOUTH_X - 6},${MOUTH_Y} Q${MOUTH_X},${MOUTH_Y - 1} ${MOUTH_X + 6},${MOUTH_Y + 2}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
              </G>
            );

          case MouthStyle.SCREAM:
            return (
              <G>
                {/* Large mouth opening */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 4}
                  rx={10}
                  ry={12}
                  fill={`url(#${mouthInteriorGradientId})`}
                />
                {/* Uvula/tongue at top back */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y - 3}
                  rx={2.5}
                  ry={4}
                  fill={`url(#${tongueGradientId})`}
                />
                {/* Tongue at bottom */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 12}
                  rx={6}
                  ry={3}
                  fill={TONGUE_COLOR}
                  opacity={0.7}
                />
                {/* Lip outline */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 4}
                  rx={10}
                  ry={12}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                />
                {/* Upper lip tension */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y - 6} Q${MOUTH_X},${MOUTH_Y - 9} ${MOUTH_X + 8},${MOUTH_Y - 6}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={1.2}
                />
              </G>
            );

          case MouthStyle.EATING:
            return (
              <G>
                {/* Puffed cheek shadow */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={9}
                  ry={6}
                  fill={`url(#${mouthInteriorGradientId})`}
                />
                {/* Food/tongue filling */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 3}
                  rx={6}
                  ry={4}
                  fill={TONGUE_COLOR}
                  opacity={0.6}
                />
                {/* Mouth outline */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={9}
                  ry={6}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2}
                />
                {/* Crumbs/chewing indication */}
                <Circle cx={MOUTH_X + 6} cy={MOUTH_Y + 4} r={0.8} fill={lipColor} opacity={0.4} />
              </G>
            );

          case MouthStyle.BITE:
            return (
              <G>
                {/* Lower lip being bitten */}
                <Path
                  d={`M${MOUTH_X - 7},${MOUTH_Y + 1} Q${MOUTH_X},${MOUTH_Y + 5} ${MOUTH_X + 7},${MOUTH_Y + 1}`}
                  fill={lipColor}
                />
                {/* Upper lip shadow */}
                <Path
                  d={`M${MOUTH_X - 6},${MOUTH_Y - 1} Q${MOUTH_X},${MOUTH_Y + 1} ${MOUTH_X + 6},${MOUTH_Y - 1}`}
                  fill={lipShadow}
                  opacity={0.5}
                />
                {/* Teeth showing on lower lip */}
                <Path
                  d={`M${MOUTH_X - 4},${MOUTH_Y + 1.5} L${MOUTH_X + 4},${MOUTH_Y + 1.5} L${MOUTH_X + 4},${MOUTH_Y + 3} L${MOUTH_X - 4},${MOUTH_Y + 3} Z`}
                  fill="#fffef5"
                  stroke="#e8e8e8"
                  strokeWidth={0.3}
                />
                {/* Individual tooth lines */}
                <Path
                  d={`M${MOUTH_X - 2},${MOUTH_Y + 1.5} L${MOUTH_X - 2},${MOUTH_Y + 3}`}
                  stroke="#e8e8e8"
                  strokeWidth={0.3}
                />
                <Path
                  d={`M${MOUTH_X},${MOUTH_Y + 1.5} L${MOUTH_X},${MOUTH_Y + 3}`}
                  stroke="#e8e8e8"
                  strokeWidth={0.3}
                />
                <Path
                  d={`M${MOUTH_X + 2},${MOUTH_Y + 1.5} L${MOUTH_X + 2},${MOUTH_Y + 3}`}
                  stroke="#e8e8e8"
                  strokeWidth={0.3}
                />
                {/* Lower lip highlight under teeth */}
                <Path
                  d={`M${MOUTH_X - 5},${MOUTH_Y + 3.5} Q${MOUTH_X},${MOUTH_Y + 5} ${MOUTH_X + 5},${MOUTH_Y + 3.5}`}
                  fill={lipHighlight}
                  opacity={0.4}
                />
                {/* Lip dimple from biting */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 4}
                  rx={3}
                  ry={1}
                  fill={lipShadow}
                  opacity={0.3}
                />
              </G>
            );

          case MouthStyle.DEFAULT:
          default:
            return (
              <G>
                {/* Shadow */}
                <Path
                  d={`M${MOUTH_X - 7},${MOUTH_Y + 1} Q${MOUTH_X},${MOUTH_Y + 6} ${MOUTH_X + 7},${MOUTH_Y + 1}`}
                  fill="none"
                  stroke="#00000010"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Default smile - reduced width */}
                <Path
                  d={`M${MOUTH_X - 7},${MOUTH_Y} Q${MOUTH_X},${MOUTH_Y + 5.5} ${MOUTH_X + 7},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
                {/* Upper lip with cupid's bow */}
                <Path
                  d={`M${MOUTH_X - 5.5},${MOUTH_Y - 0.3} Q${MOUTH_X - 2},${MOUTH_Y - 0.8} ${MOUTH_X - 1.2},${MOUTH_Y - 0.2}
                      Q${MOUTH_X},${MOUTH_Y + 0.2} ${MOUTH_X + 1.2},${MOUTH_Y - 0.2}
                      Q${MOUTH_X + 2},${MOUTH_Y - 0.8} ${MOUTH_X + 5.5},${MOUTH_Y - 0.3}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.8}
                  opacity={0.5}
                />
                {/* Cupid's bow center definition */}
                <Path
                  d={`M${MOUTH_X - 1.2},${MOUTH_Y - 0.2} Q${MOUTH_X},${MOUTH_Y + 0.4} ${MOUTH_X + 1.2},${MOUTH_Y - 0.2}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.7}
                  opacity={0.4}
                />
                {/* Lip shadow below lower lip */}
                <Path
                  d={`M${MOUTH_X - 5},${MOUTH_Y + 6} Q${MOUTH_X},${MOUTH_Y + 6.5} ${MOUTH_X + 5},${MOUTH_Y + 6}`}
                  fill="none"
                  stroke={lipShadow}
                  strokeWidth={0.7}
                  opacity={0.25}
                />
                {/* Lower lip highlight */}
                <Path
                  d={`M${MOUTH_X - 3.5},${MOUTH_Y + 3} Q${MOUTH_X},${MOUTH_Y + 4} ${MOUTH_X + 3.5},${MOUTH_Y + 3}`}
                  fill="none"
                  stroke={lipHighlight}
                  strokeWidth={0.8}
                  opacity={0.35}
                />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Mouth;
