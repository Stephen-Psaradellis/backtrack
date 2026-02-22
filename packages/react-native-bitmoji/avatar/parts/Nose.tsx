/**
 * Nose Component - Multiple nose styles
 * Enhanced with natural shading, bridge highlights, and detailed nostril rendering
 */

import React from 'react';
import { G, Path, Ellipse, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { NoseStyle, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type NoseGradientIds = {
  noseGradient: string;
  nostrilGradient: string;
};

interface NoseProps extends SvgPartProps {
  style: NoseStyle;
  skinTone: string;
}

const NOSE_X = 50;
const NOSE_Y = 52;

export function Nose({ style, skinTone, scale = 1 }: NoseProps) {
  const shadowColor = adjustBrightness(skinTone, -35);
  const deepShadow = adjustBrightness(skinTone, -50);
  const highlightColor = adjustBrightness(skinTone, 25);
  const brightHighlight = adjustBrightness(skinTone, 40);

  const ids = useGradientIds<NoseGradientIds>(['noseGradient', 'nostrilGradient']);
  const noseGradientId = ids.noseGradient;
  const nostrilGradientId = ids.nostrilGradient;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        {/* Nose bridge gradient */}
        <LinearGradient id={noseGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} stopOpacity="0.3" />
          <Stop offset="40%" stopColor={highlightColor} stopOpacity="0.2" />
          <Stop offset="60%" stopColor={highlightColor} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={shadowColor} stopOpacity="0.3" />
        </LinearGradient>

        {/* Nostril depth gradient */}
        <LinearGradient id={nostrilGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={deepShadow} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
      </Defs>

      {(() => {
        switch (style) {
          case NoseStyle.SMALL:
            return (
              <G>
                {/* Bridge shadow - subtle */}
                <Path
                  d={`M${NOSE_X - 1},${NOSE_Y - 4} Q${NOSE_X},${NOSE_Y - 2} ${NOSE_X + 1},${NOSE_Y - 4}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                {/* Nose tip shadow */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 1}
                  rx={3}
                  ry={2}
                  fill={shadowColor}
                  opacity={0.08}
                />
                {/* Main nose curve */}
                <Path
                  d={`M${NOSE_X - 2.5},${NOSE_Y - 2}
                      Q${NOSE_X - 1},${NOSE_Y + 2} ${NOSE_X},${NOSE_Y + 2.5}
                      Q${NOSE_X + 1},${NOSE_Y + 2} ${NOSE_X + 2.5},${NOSE_Y - 2}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                {/* Tiny highlight on tip */}
                <Circle
                  cx={NOSE_X}
                  cy={NOSE_Y + 1}
                  r={0.8}
                  fill={brightHighlight}
                  opacity={0.35}
                />
              </G>
            );

          case NoseStyle.BUTTON:
            return (
              <G>
                {/* Bridge suggestion */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 5} L${NOSE_X},${NOSE_Y - 2}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.25}
                />
                {/* Button nose base shadow */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 1}
                  rx={4.5}
                  ry={3.5}
                  fill={shadowColor}
                  opacity={0.1}
                />
                {/* Main button shape */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y}
                  rx={4}
                  ry={3.2}
                  fill={skinTone}
                />
                {/* Subtle outline */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y}
                  rx={4}
                  ry={3.2}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.5}
                />
                {/* Main highlight */}
                <Ellipse
                  cx={NOSE_X - 0.8}
                  cy={NOSE_Y - 0.8}
                  rx={1.5}
                  ry={1.2}
                  fill={brightHighlight}
                  opacity={0.5}
                />
                {/* Small nostrils hint */}
                <Circle
                  cx={NOSE_X - 2}
                  cy={NOSE_Y + 1.5}
                  r={0.7}
                  fill={shadowColor}
                  opacity={0.3}
                />
                <Circle
                  cx={NOSE_X + 2}
                  cy={NOSE_Y + 1.5}
                  r={0.7}
                  fill={shadowColor}
                  opacity={0.3}
                />
              </G>
            );

          case NoseStyle.LARGE:
            return (
              <G>
                {/* Bridge shadow lines */}
                <Path
                  d={`M${NOSE_X - 2},${NOSE_Y - 10} Q${NOSE_X - 1},${NOSE_Y - 5} ${NOSE_X - 1},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
                <Path
                  d={`M${NOSE_X + 2},${NOSE_Y - 10} Q${NOSE_X + 1},${NOSE_Y - 5} ${NOSE_X + 1},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.8}
                  opacity={0.3}
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 9} L${NOSE_X},${NOSE_Y - 2}`}
                  fill="none"
                  stroke={brightHighlight}
                  strokeWidth={1.2}
                  opacity={0.35}
                />
                {/* Nose tip base */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={7}
                  ry={4}
                  fill={skinTone}
                />
                {/* Main nose outline */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 10}
                      Q${NOSE_X + 2},${NOSE_Y - 5} ${NOSE_X + 2},${NOSE_Y}
                      Q${NOSE_X + 3},${NOSE_Y + 2} ${NOSE_X + 6},${NOSE_Y + 3}
                      Q${NOSE_X + 3},${NOSE_Y + 6} ${NOSE_X},${NOSE_Y + 5}
                      Q${NOSE_X - 3},${NOSE_Y + 6} ${NOSE_X - 6},${NOSE_Y + 3}
                      Q${NOSE_X - 3},${NOSE_Y + 2} ${NOSE_X - 2},${NOSE_Y}
                      Q${NOSE_X - 2},${NOSE_Y - 5} ${NOSE_X},${NOSE_Y - 10}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
                {/* Nose tip highlight */}
                <Ellipse
                  cx={NOSE_X - 1}
                  cy={NOSE_Y + 1}
                  rx={2}
                  ry={1.5}
                  fill={brightHighlight}
                  opacity={0.35}
                />
                {/* Detailed nostrils */}
                <Ellipse
                  cx={NOSE_X - 3.5}
                  cy={NOSE_Y + 3}
                  rx={2}
                  ry={1.2}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.5}
                />
                <Ellipse
                  cx={NOSE_X + 3.5}
                  cy={NOSE_Y + 3}
                  rx={2}
                  ry={1.2}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.5}
                />
                {/* Under-nose shadow */}
                <Path
                  d={`M${NOSE_X - 5},${NOSE_Y + 5} Q${NOSE_X},${NOSE_Y + 7} ${NOSE_X + 5},${NOSE_Y + 5}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.8}
                  opacity={0.2}
                />
              </G>
            );

          case NoseStyle.POINTED:
            return (
              <G>
                {/* Bridge side shadows */}
                <Path
                  d={`M${NOSE_X - 2},${NOSE_Y - 8} Q${NOSE_X - 1.5},${NOSE_Y - 3} ${NOSE_X - 2},${NOSE_Y + 1}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                <Path
                  d={`M${NOSE_X + 2},${NOSE_Y - 8} Q${NOSE_X + 1.5},${NOSE_Y - 3} ${NOSE_X + 2},${NOSE_Y + 1}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 7} L${NOSE_X},${NOSE_Y + 1}`}
                  stroke={brightHighlight}
                  strokeWidth={1.2}
                  opacity={0.4}
                />
                {/* Main pointed shape */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 8}
                      L${NOSE_X + 4},${NOSE_Y + 2}
                      Q${NOSE_X + 2},${NOSE_Y + 4} ${NOSE_X},${NOSE_Y + 4.5}
                      Q${NOSE_X - 2},${NOSE_Y + 4} ${NOSE_X - 4},${NOSE_Y + 2}
                      Z`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Tip highlight */}
                <Circle
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  r={1}
                  fill={brightHighlight}
                  opacity={0.4}
                />
                {/* Small nostrils */}
                <Ellipse
                  cx={NOSE_X - 2}
                  cy={NOSE_Y + 3}
                  rx={1}
                  ry={0.6}
                  fill={shadowColor}
                  opacity={0.35}
                />
                <Ellipse
                  cx={NOSE_X + 2}
                  cy={NOSE_Y + 3}
                  rx={1}
                  ry={0.6}
                  fill={shadowColor}
                  opacity={0.35}
                />
              </G>
            );

          case NoseStyle.ROUNDED:
            return (
              <G>
                {/* Bridge suggestion */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 6} Q${NOSE_X + 1.5},${NOSE_Y - 3} ${NOSE_X + 1.5},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.8}
                  strokeLinecap="round"
                  opacity={0.4}
                />
                {/* Base shadow */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 3}
                  rx={5.5}
                  ry={4.5}
                  fill={shadowColor}
                  opacity={0.1}
                />
                {/* Main rounded nose */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={5}
                  ry={4}
                  fill={skinTone}
                />
                {/* Outline */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={5}
                  ry={4}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.7}
                  opacity={0.5}
                />
                {/* Main highlight */}
                <Ellipse
                  cx={NOSE_X - 1}
                  cy={NOSE_Y}
                  rx={2}
                  ry={1.5}
                  fill={brightHighlight}
                  opacity={0.45}
                />
                {/* Nostril shadows */}
                <Ellipse
                  cx={NOSE_X - 2.5}
                  cy={NOSE_Y + 3.5}
                  rx={1.3}
                  ry={0.9}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.4}
                />
                <Ellipse
                  cx={NOSE_X + 2.5}
                  cy={NOSE_Y + 3.5}
                  rx={1.3}
                  ry={0.9}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.4}
                />
                {/* Under-tip shadow */}
                <Path
                  d={`M${NOSE_X - 3},${NOSE_Y + 5} Q${NOSE_X},${NOSE_Y + 6.5} ${NOSE_X + 3},${NOSE_Y + 5}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.2}
                />
              </G>
            );

          case NoseStyle.WIDE:
            return (
              <G>
                {/* Bridge shadow */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 6} L${NOSE_X},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1}
                  strokeLinecap="round"
                  opacity={0.3}
                />
                {/* Wide nose base shadow */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 3}
                  rx={8}
                  ry={4.5}
                  fill={shadowColor}
                  opacity={0.08}
                />
                {/* Wide nose base */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={7.5}
                  ry={4}
                  fill={skinTone}
                />
                {/* Outline */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={7.5}
                  ry={4}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.7}
                  opacity={0.5}
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 4} L${NOSE_X},${NOSE_Y}`}
                  stroke={brightHighlight}
                  strokeWidth={1.5}
                  opacity={0.35}
                />
                {/* Tip highlight */}
                <Ellipse
                  cx={NOSE_X - 1}
                  cy={NOSE_Y}
                  rx={2}
                  ry={1.5}
                  fill={brightHighlight}
                  opacity={0.4}
                />
                {/* Wide nostrils */}
                <Ellipse
                  cx={NOSE_X - 4}
                  cy={NOSE_Y + 3}
                  rx={2.2}
                  ry={1.3}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.45}
                />
                <Ellipse
                  cx={NOSE_X + 4}
                  cy={NOSE_Y + 3}
                  rx={2.2}
                  ry={1.3}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.45}
                />
                {/* Nostril rim highlight */}
                <Path
                  d={`M${NOSE_X - 5.5},${NOSE_Y + 2} Q${NOSE_X - 4},${NOSE_Y + 1.5} ${NOSE_X - 2.5},${NOSE_Y + 2}`}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth={0.5}
                  opacity={0.3}
                />
                <Path
                  d={`M${NOSE_X + 5.5},${NOSE_Y + 2} Q${NOSE_X + 4},${NOSE_Y + 1.5} ${NOSE_X + 2.5},${NOSE_Y + 2}`}
                  fill="none"
                  stroke={highlightColor}
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              </G>
            );

          case NoseStyle.NARROW:
            return (
              <G>
                {/* Bridge shadows on sides */}
                <Path
                  d={`M${NOSE_X - 1.5},${NOSE_Y - 8} Q${NOSE_X - 1},${NOSE_Y - 4} ${NOSE_X - 1},${NOSE_Y + 2}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.35}
                />
                <Path
                  d={`M${NOSE_X + 1.5},${NOSE_Y - 8} Q${NOSE_X + 1},${NOSE_Y - 4} ${NOSE_X + 1},${NOSE_Y + 2}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.35}
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 7} L${NOSE_X},${NOSE_Y}`}
                  stroke={brightHighlight}
                  strokeWidth={1}
                  opacity={0.45}
                />
                {/* Main narrow nose shape */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 8}
                      L${NOSE_X},${NOSE_Y + 3}
                      Q${NOSE_X - 2.5},${NOSE_Y + 4.5} ${NOSE_X - 2.5},${NOSE_Y + 2.5}
                      Q${NOSE_X},${NOSE_Y + 5.5} ${NOSE_X + 2.5},${NOSE_Y + 2.5}
                      Q${NOSE_X + 2.5},${NOSE_Y + 4.5} ${NOSE_X},${NOSE_Y + 3}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.9}
                  strokeLinecap="round"
                />
                {/* Tip highlight */}
                <Circle
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  r={0.8}
                  fill={brightHighlight}
                  opacity={0.5}
                />
                {/* Small nostrils */}
                <Ellipse
                  cx={NOSE_X - 1.5}
                  cy={NOSE_Y + 3.5}
                  rx={0.9}
                  ry={0.5}
                  fill={shadowColor}
                  opacity={0.4}
                />
                <Ellipse
                  cx={NOSE_X + 1.5}
                  cy={NOSE_Y + 3.5}
                  rx={0.9}
                  ry={0.5}
                  fill={shadowColor}
                  opacity={0.4}
                />
              </G>
            );

          case NoseStyle.HOOKED:
            return (
              <G>
                {/* Side shadows */}
                <Path
                  d={`M${NOSE_X - 2},${NOSE_Y - 8} Q${NOSE_X - 2},${NOSE_Y - 3} ${NOSE_X - 3},${NOSE_Y + 1}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 7} Q${NOSE_X + 1},${NOSE_Y - 3} ${NOSE_X + 2},${NOSE_Y + 1}`}
                  stroke={brightHighlight}
                  strokeWidth={1}
                  opacity={0.35}
                />
                {/* Main hooked profile */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 8}
                      Q${NOSE_X + 3},${NOSE_Y - 4} ${NOSE_X + 4},${NOSE_Y}
                      Q${NOSE_X + 3},${NOSE_Y + 3} ${NOSE_X},${NOSE_Y + 4}
                      Q${NOSE_X - 3},${NOSE_Y + 3} ${NOSE_X - 3},${NOSE_Y + 1}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                />
                {/* Tip */}
                <Circle
                  cx={NOSE_X + 1}
                  cy={NOSE_Y + 2}
                  r={1}
                  fill={brightHighlight}
                  opacity={0.35}
                />
                {/* Nostrils */}
                <Ellipse
                  cx={NOSE_X - 2}
                  cy={NOSE_Y + 3}
                  rx={1.2}
                  ry={0.7}
                  fill={shadowColor}
                  opacity={0.4}
                />
                <Ellipse
                  cx={NOSE_X + 2}
                  cy={NOSE_Y + 3}
                  rx={1.2}
                  ry={0.7}
                  fill={shadowColor}
                  opacity={0.4}
                />
              </G>
            );

          case NoseStyle.FLAT:
            return (
              <G>
                {/* Very subtle bridge */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 4} L${NOSE_X},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.5}
                  opacity={0.2}
                />
                {/* Flat base shadow */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 2}
                  rx={6}
                  ry={2.5}
                  fill={shadowColor}
                  opacity={0.08}
                />
                {/* Flat nose shape */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 1}
                  rx={5.5}
                  ry={2.2}
                  fill={skinTone}
                />
                {/* Outline */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y + 1}
                  rx={5.5}
                  ry={2.2}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.4}
                />
                {/* Center highlight */}
                <Ellipse
                  cx={NOSE_X}
                  cy={NOSE_Y}
                  rx={2}
                  ry={1}
                  fill={brightHighlight}
                  opacity={0.4}
                />
                {/* Wide flat nostrils */}
                <Ellipse
                  cx={NOSE_X - 3}
                  cy={NOSE_Y + 1.5}
                  rx={1.5}
                  ry={0.8}
                  fill={shadowColor}
                  opacity={0.35}
                />
                <Ellipse
                  cx={NOSE_X + 3}
                  cy={NOSE_Y + 1.5}
                  rx={1.5}
                  ry={0.8}
                  fill={shadowColor}
                  opacity={0.35}
                />
              </G>
            );

          case NoseStyle.MEDIUM:
          case NoseStyle.DEFAULT:
          default:
            return (
              <G>
                {/* Bridge side shadows */}
                <Path
                  d={`M${NOSE_X - 2},${NOSE_Y - 8} Q${NOSE_X - 1.5},${NOSE_Y - 4} ${NOSE_X - 2},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                <Path
                  d={`M${NOSE_X + 2},${NOSE_Y - 8} Q${NOSE_X + 1.5},${NOSE_Y - 4} ${NOSE_X + 2},${NOSE_Y}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.6}
                  opacity={0.3}
                />
                {/* Bridge highlight */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 7} L${NOSE_X},${NOSE_Y}`}
                  stroke={brightHighlight}
                  strokeWidth={1.2}
                  opacity={0.4}
                />
                {/* Main nose shape */}
                <Path
                  d={`M${NOSE_X},${NOSE_Y - 8}
                      L${NOSE_X},${NOSE_Y + 2}
                      Q${NOSE_X - 4.5},${NOSE_Y + 4.5} ${NOSE_X - 4.5},${NOSE_Y + 2}
                      Q${NOSE_X},${NOSE_Y + 6} ${NOSE_X + 4.5},${NOSE_Y + 2}
                      Q${NOSE_X + 4.5},${NOSE_Y + 4.5} ${NOSE_X},${NOSE_Y + 2}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Tip highlight */}
                <Circle
                  cx={NOSE_X}
                  cy={NOSE_Y + 1}
                  r={1.2}
                  fill={brightHighlight}
                  opacity={0.4}
                />
                {/* Nostrils with depth */}
                <Ellipse
                  cx={NOSE_X - 2.5}
                  cy={NOSE_Y + 3}
                  rx={1.2}
                  ry={0.8}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.45}
                />
                <Ellipse
                  cx={NOSE_X + 2.5}
                  cy={NOSE_Y + 3}
                  rx={1.2}
                  ry={0.8}
                  fill={`url(#${nostrilGradientId})`}
                  opacity={0.45}
                />
                {/* Under-nose shadow */}
                <Path
                  d={`M${NOSE_X - 3},${NOSE_Y + 5} Q${NOSE_X},${NOSE_Y + 6.5} ${NOSE_X + 3},${NOSE_Y + 5}`}
                  fill="none"
                  stroke={shadowColor}
                  strokeWidth={0.5}
                  opacity={0.15}
                />
              </G>
            );
        }
      })()}
    </G>
  );
}

export default Nose;
