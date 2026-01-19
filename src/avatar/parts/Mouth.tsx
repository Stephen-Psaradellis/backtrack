/**
 * Mouth Component - Multiple mouth styles
 *
 * Renders different mouth expressions from smiles to frowns,
 * including open mouths and special expressions.
 */

import React from 'react';
import { G, Path, Ellipse, Circle, Rect } from 'react-native-svg';
import { MouthStyle, SvgPartProps } from '../types';

interface MouthProps extends SvgPartProps {
  style: MouthStyle;
  lipColor?: string;
}

// Mouth positioning constants
const MOUTH_X = 50;
const MOUTH_Y = 62;

// Default colors
const LIP_COLOR = '#c47b7b';
const TONGUE_COLOR = '#d35d6e';
const TEETH_COLOR = '#fffef5';
const MOUTH_INTERIOR = '#3a1515';

export function Mouth({ style, lipColor = LIP_COLOR, scale = 1 }: MouthProps) {
  return (
    <G transform={`scale(${scale})`}>
      {(() => {
        switch (style) {
          case MouthStyle.SMILE:
            return (
              <G>
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y}
                      Q${MOUTH_X},${MOUTH_Y + 10} ${MOUTH_X + 10},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case MouthStyle.BIG_SMILE:
            return (
              <G>
                {/* Open smiling mouth */}
                <Path
                  d={`M${MOUTH_X - 12},${MOUTH_Y}
                      Q${MOUTH_X},${MOUTH_Y + 14} ${MOUTH_X + 12},${MOUTH_Y}`}
                  fill={MOUTH_INTERIOR}
                />
                {/* Upper lip line */}
                <Path
                  d={`M${MOUTH_X - 12},${MOUTH_Y}
                      Q${MOUTH_X},${MOUTH_Y - 2} ${MOUTH_X + 12},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Teeth */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 1}
                      L${MOUTH_X + 8},${MOUTH_Y + 1}
                      L${MOUTH_X + 6},${MOUTH_Y + 5}
                      L${MOUTH_X - 6},${MOUTH_Y + 5} Z`}
                  fill={TEETH_COLOR}
                />
              </G>
            );

          case MouthStyle.GRIN:
            return (
              <G>
                {/* Wide grin */}
                <Path
                  d={`M${MOUTH_X - 14},${MOUTH_Y - 2}
                      Q${MOUTH_X},${MOUTH_Y + 12} ${MOUTH_X + 14},${MOUTH_Y - 2}`}
                  fill={MOUTH_INTERIOR}
                />
                {/* Teeth */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y}
                      L${MOUTH_X + 10},${MOUTH_Y}
                      Q${MOUTH_X},${MOUTH_Y + 6} ${MOUTH_X - 10},${MOUTH_Y} Z`}
                  fill={TEETH_COLOR}
                />
                {/* Lip line */}
                <Path
                  d={`M${MOUTH_X - 14},${MOUTH_Y - 2}
                      Q${MOUTH_X},${MOUTH_Y + 12} ${MOUTH_X + 14},${MOUTH_Y - 2}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={1.5}
                />
              </G>
            );

          case MouthStyle.LAUGH:
            return (
              <G>
                {/* Open laughing mouth */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 3}
                  rx={10}
                  ry={8}
                  fill={MOUTH_INTERIOR}
                />
                {/* Upper teeth */}
                <Path
                  d={`M${MOUTH_X - 7},${MOUTH_Y - 2}
                      L${MOUTH_X + 7},${MOUTH_Y - 2}
                      L${MOUTH_X + 5},${MOUTH_Y + 2}
                      L${MOUTH_X - 5},${MOUTH_Y + 2} Z`}
                  fill={TEETH_COLOR}
                />
                {/* Tongue */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 8}
                  rx={5}
                  ry={4}
                  fill={TONGUE_COLOR}
                />
              </G>
            );

          case MouthStyle.SMIRK:
            return (
              <G>
                {/* Asymmetric smirk */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y + 2}
                      Q${MOUTH_X - 2},${MOUTH_Y} ${MOUTH_X + 2},${MOUTH_Y}
                      Q${MOUTH_X + 8},${MOUTH_Y - 4} ${MOUTH_X + 10},${MOUTH_Y - 2}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case MouthStyle.SAD:
            return (
              <G>
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y + 4}
                      Q${MOUTH_X},${MOUTH_Y - 6} ${MOUTH_X + 10},${MOUTH_Y + 4}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case MouthStyle.FROWN:
            return (
              <G>
                {/* Deep frown */}
                <Path
                  d={`M${MOUTH_X - 12},${MOUTH_Y + 6}
                      Q${MOUTH_X},${MOUTH_Y - 8} ${MOUTH_X + 12},${MOUTH_Y + 6}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case MouthStyle.SERIOUS:
            return (
              <G>
                {/* Straight line */}
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y} L${MOUTH_X + 8},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case MouthStyle.OPEN:
            return (
              <G>
                {/* Open mouth (surprise/talking) */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={7}
                  ry={9}
                  fill={MOUTH_INTERIOR}
                />
                {/* Lip outline */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={7}
                  ry={9}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={1.5}
                />
              </G>
            );

          case MouthStyle.TONGUE:
            return (
              <G>
                {/* Smile with tongue */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y}
                      Q${MOUTH_X},${MOUTH_Y + 10} ${MOUTH_X + 10},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Tongue sticking out */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 10}
                  rx={5}
                  ry={6}
                  fill={TONGUE_COLOR}
                />
                {/* Tongue line */}
                <Path
                  d={`M${MOUTH_X},${MOUTH_Y + 7} L${MOUTH_X},${MOUTH_Y + 14}`}
                  fill="none"
                  stroke="#b54a5a"
                  strokeWidth={1}
                />
              </G>
            );

          case MouthStyle.KISS:
            return (
              <G>
                {/* Puckered lips */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y}
                  rx={4}
                  ry={5}
                  fill={lipColor}
                />
                {/* Lip highlight */}
                <Circle
                  cx={MOUTH_X - 1}
                  cy={MOUTH_Y - 1}
                  r={1.5}
                  fill="#e8a0a0"
                  opacity={0.5}
                />
              </G>
            );

          case MouthStyle.SURPRISED:
            return (
              <G>
                {/* O-shaped mouth */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={6}
                  ry={8}
                  fill={MOUTH_INTERIOR}
                />
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 2}
                  rx={6}
                  ry={8}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2}
                />
              </G>
            );

          case MouthStyle.EATING:
            return (
              <G>
                {/* Chewing expression */}
                <Ellipse
                  cx={MOUTH_X + 3}
                  cy={MOUTH_Y + 2}
                  rx={8}
                  ry={5}
                  fill={MOUTH_INTERIOR}
                />
                {/* Cheek bulge indicator */}
                <Path
                  d={`M${MOUTH_X + 8},${MOUTH_Y}
                      Q${MOUTH_X + 14},${MOUTH_Y + 4} ${MOUTH_X + 10},${MOUTH_Y + 6}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={1}
                  opacity={0.5}
                />
              </G>
            );

          case MouthStyle.GRIMACE:
            return (
              <G>
                {/* Teeth-showing grimace */}
                <Rect
                  x={MOUTH_X - 10}
                  y={MOUTH_Y - 3}
                  width={20}
                  height={10}
                  rx={2}
                  fill={TEETH_COLOR}
                />
                {/* Tooth lines */}
                <Path
                  d={`M${MOUTH_X - 6},${MOUTH_Y - 3} L${MOUTH_X - 6},${MOUTH_Y + 7}
                      M${MOUTH_X - 2},${MOUTH_Y - 3} L${MOUTH_X - 2},${MOUTH_Y + 7}
                      M${MOUTH_X + 2},${MOUTH_Y - 3} L${MOUTH_X + 2},${MOUTH_Y + 7}
                      M${MOUTH_X + 6},${MOUTH_Y - 3} L${MOUTH_X + 6},${MOUTH_Y + 7}`}
                  fill="none"
                  stroke="#d0d0d0"
                  strokeWidth={0.5}
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
                  strokeWidth={1.5}
                />
              </G>
            );

          case MouthStyle.CONCERNED:
            return (
              <G>
                {/* Wavy concerned line */}
                <Path
                  d={`M${MOUTH_X - 10},${MOUTH_Y + 2}
                      Q${MOUTH_X - 5},${MOUTH_Y - 2} ${MOUTH_X},${MOUTH_Y + 2}
                      Q${MOUTH_X + 5},${MOUTH_Y + 6} ${MOUTH_X + 10},${MOUTH_Y + 2}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              </G>
            );

          case MouthStyle.SCREAM:
            return (
              <G>
                {/* Wide open scream */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 4}
                  rx={10}
                  ry={12}
                  fill={MOUTH_INTERIOR}
                />
                {/* Uvula hint */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y - 2}
                  rx={2}
                  ry={3}
                  fill={TONGUE_COLOR}
                />
                {/* Outline */}
                <Ellipse
                  cx={MOUTH_X}
                  cy={MOUTH_Y + 4}
                  rx={10}
                  ry={12}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2}
                />
              </G>
            );

          case MouthStyle.DEFAULT:
          default:
            // Default slight smile
            return (
              <G>
                <Path
                  d={`M${MOUTH_X - 8},${MOUTH_Y}
                      Q${MOUTH_X},${MOUTH_Y + 6} ${MOUTH_X + 8},${MOUTH_Y}`}
                  fill="none"
                  stroke={lipColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Mouth;
