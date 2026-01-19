/**
 * Nose Component - Multiple nose styles
 *
 * Renders different nose shapes from small and button-like to larger
 * and more prominent styles.
 */

import React from 'react';
import { G, Path, Ellipse, Circle } from 'react-native-svg';
import { NoseStyle, SvgPartProps } from '../types';

interface NoseProps extends SvgPartProps {
  style: NoseStyle;
  skinTone: string;
}

/**
 * Adjust color brightness for shadows
 */
function adjustBrightness(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Nose positioning constants
const NOSE_X = 50;
const NOSE_Y = 52;

export function Nose({ style, skinTone, scale = 1 }: NoseProps) {
  const shadowColor = adjustBrightness(skinTone, -30);
  const highlightColor = adjustBrightness(skinTone, 20);

  return (
    <G transform={`scale(${scale})`}>
      {(() => {
        switch (style) {
          case NoseStyle.SMALL:
            return (
              <G>
                {/* Simple small curve */}
                <Path
                  d={`M${NOSE_X - 2},${NOSE_Y - 2} Q${NOSE_X},${NOSE_Y + 3} ${NOSE_X + 2},${NOSE_Y - 2}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              </G>
            );

          case NoseStyle.BUTTON:
            return (
              <G>
                {/* Round button nose */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y}
                  rx={4}
                  ry={3}
                  fill={skinTone}
                />
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y}
                  rx={4}
                  ry={3}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.8}
                />
                {/* Highlight */}
                <Circle
                  cx={NOSE_X - 1}
                  cy={NOSE_Y - 1}
                  r={1}
                  fill={highlightColor}
                  opacity={0.5}
                />
              </G>
            );

          case NoseStyle.MEDIUM:
          case NoseStyle.DEFAULT:
            return (
              <G>
                {/* Standard nose shape */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 8}
                      L${NOSE_X},${NOSE_Y + 2}
                      Q${NOSE_X - 4},${NOSE_Y + 4} ${NOSE_X - 4},${NOSE_Y + 2}
                      Q${NOSE_X},${NOSE_Y + 5} ${NOSE_X + 4},${NOSE_Y + 2}
                      Q${NOSE_X + 4},${NOSE_Y + 4} ${NOSE_X},${NOSE_Y + 2}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Nostril hints */}
                <Circle cx={NOSE_X - 2} cy={NOSE_Y + 2} r={0.8} fill={shadowColor} opacity={0.5} />
                <Circle cx={NOSE_X + 2} cy={NOSE_Y + 2} r={0.8} fill={shadowColor} opacity={0.5} />
              </G>
            );

          case NoseStyle.LARGE:
            return (
              <G>
                {/* Larger nose */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 10}
                      Q${NOSE_X + 2},${NOSE_Y - 5} ${NOSE_X + 1},${NOSE_Y}
                      L${NOSE_X + 1},${NOSE_Y + 3}
                      Q${NOSE_X - 6},${NOSE_Y + 6} ${NOSE_X - 6},${NOSE_Y + 3}
                      Q${NOSE_X},${NOSE_Y + 8} ${NOSE_X + 6},${NOSE_Y + 3}
                      Q${NOSE_X + 6},${NOSE_Y + 6} ${NOSE_X + 1},${NOSE_Y + 3}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
                {/* Nostrils */}
                <Ellipse cx={NOSE_X - 3} cy={NOSE_Y + 3} rx={1.5} ry={1} fill={shadowColor} opacity={0.4} />
                <Ellipse cx={NOSE_X + 3} cy={NOSE_Y + 3} rx={1.5} ry={1} fill={shadowColor} opacity={0.4} />
              </G>
            );

          case NoseStyle.POINTED:
            return (
              <G>
                {/* Pointed/angular nose */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 8}
                      L${NOSE_X + 3},${NOSE_Y + 2}
                      L${NOSE_X},${NOSE_Y + 4}
                      L${NOSE_X - 3},${NOSE_Y + 2}
                      Z`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 6} L${NOSE_X},${NOSE_Y}`}
                  stroke={highlightColor}
                  strokeWidth={1}
                  opacity={0.3}
                />
              </G>
            );

          case NoseStyle.ROUNDED:
            return (
              <G>
                {/* Rounded bulbous nose */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 6}
                      Q${NOSE_X + 2},${NOSE_Y - 3} ${NOSE_X + 2},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={5}
                  ry={4}
                  fill={skinTone}
                />
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={5}
                  ry={4}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.8}
                />
                {/* Highlight */}
                <Circle
                  cx={NOSE_X - 1}
                  cy={NOSE_Y}
                  r={1.5}
                  fill={highlightColor}
                  opacity={0.4}
                />
                {/* Nostrils */}
                <Circle cx={NOSE_X - 2} cy={NOSE_Y + 3} r={1} fill={shadowColor} opacity={0.3} />
                <Circle cx={NOSE_X + 2} cy={NOSE_Y + 3} r={1} fill={shadowColor} opacity={0.3} />
              </G>
            );

          case NoseStyle.HOOKED:
            return (
              <G>
                {/* Hook/aquiline nose */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 10}
                      Q${NOSE_X + 5},${NOSE_Y - 5} ${NOSE_X + 3},${NOSE_Y}
                      Q${NOSE_X + 4},${NOSE_Y + 2} ${NOSE_X + 2},${NOSE_Y + 4}
                      Q${NOSE_X},${NOSE_Y + 5} ${NOSE_X - 2},${NOSE_Y + 4}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
                {/* Nostril hint */}
                <Circle cx={NOSE_X - 1} cy={NOSE_Y + 3} r={1} fill={shadowColor} opacity={0.4} />
              </G>
            );

          case NoseStyle.FLAT:
            return (
              <G>
                {/* Flat/wide nose */}
                <Path
                  d={`M${NOSE_X - 1},${NOSE_Y - 4}
                      L${NOSE_X - 1},${NOSE_Y + 1}
                      Q${NOSE_X - 6},${NOSE_Y + 3} ${NOSE_X - 5},${NOSE_Y + 1}
                      L${NOSE_X + 5},${NOSE_Y + 1}
                      Q${NOSE_X + 6},${NOSE_Y + 3} ${NOSE_X + 1},${NOSE_Y + 1}
                      L${NOSE_X + 1},${NOSE_Y - 4}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
                {/* Nostrils */}
                <Ellipse cx={NOSE_X - 3} cy={NOSE_Y + 2} rx={2} ry={1.2} fill={shadowColor} opacity={0.35} />
                <Ellipse cx={NOSE_X + 3} cy={NOSE_Y + 2} rx={2} ry={1.2} fill={shadowColor} opacity={0.35} />
              </G>
            );

          case NoseStyle.WIDE:
            return (
              <G>
                {/* Wide nose */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 6}
                      L${NOSE_X},${NOSE_Y + 1}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={7}
                  ry={4}
                  fill={skinTone}
                />
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={7}
                  ry={4}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.8}
                />
                {/* Nostrils */}
                <Ellipse cx={NOSE_X - 3} cy={NOSE_Y + 3} rx={1.8} ry={1} fill={shadowColor} opacity={0.4} />
                <Ellipse cx={NOSE_X + 3} cy={NOSE_Y + 3} rx={1.8} ry={1} fill={shadowColor} opacity={0.4} />
              </G>
            );

          case NoseStyle.NARROW:
            return (
              <G>
                {/* Narrow/thin nose */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 8}
                      L${NOSE_X},${NOSE_Y + 3}
                      Q${NOSE_X - 2},${NOSE_Y + 4} ${NOSE_X - 2},${NOSE_Y + 2}
                      Q${NOSE_X},${NOSE_Y + 5} ${NOSE_X + 2},${NOSE_Y + 2}
                      Q${NOSE_X + 2},${NOSE_Y + 4} ${NOSE_X},${NOSE_Y + 3}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 6} L${NOSE_X},${NOSE_Y - 2}`}
                  stroke={highlightColor}
                  strokeWidth={0.8}
                  opacity={0.4}
                />
              </G>
            );

          default:
            // Default fallback
            return (
              <Path
                d={`M${NOSE_X - 3},${NOSE_Y} Q${NOSE_X},${NOSE_Y + 5} ${NOSE_X + 3},${NOSE_Y}`}
                fill="none"
                stroke={shadowColor}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
        }
      })()}
    </G>
  );
}

export default Nose;
