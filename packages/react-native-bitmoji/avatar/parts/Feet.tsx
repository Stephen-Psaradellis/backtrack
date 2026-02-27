/**
 * Feet Component - Foot and shoe rendering at avatar scale
 * Uses clean rounded shapes for bare feet, with shoe overlay support
 */

import React from 'react';
import { G, Path, Ellipse, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LegPose, ShoeStyle, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type FeetGradientIds = {
  leftFootGradient: string;
  rightFootGradient: string;
  leftShoeGradient: string;
  rightShoeGradient: string;
};

interface FeetProps extends SvgPartProps {
  skinTone: string;
  leftAnkle: { x: number; y: number };
  rightAnkle: { x: number; y: number };
  legPose: LegPose;
  shoeStyle?: ShoeStyle;
  shoeColor?: string;
}

interface FootPaths {
  main: string;
  heelShadow: string;
  topHighlight: { cx: number; cy: number; rx: number; ry: number };
}

function getFootPaths(isLeft: boolean, pose: LegPose): FootPaths {
  const flip = isLeft ? 1 : -1;

  switch (pose) {
    case LegPose.SITTING: {
      return {
        main: `
          M ${-3 * flip} 0
          C ${-4 * flip} 2, ${-5 * flip} 7, ${-3 * flip} 11
          C ${-1 * flip} 14, ${4 * flip} 14, ${7 * flip} 11
          C ${8 * flip} 8, ${7 * flip} 3, ${5 * flip} 0
          Q ${1 * flip} -1, ${-3 * flip} 0
          Z
        `,
        heelShadow: `
          M ${-3 * flip} 1
          C ${-4 * flip} 3, ${-5 * flip} 6, ${-3 * flip} 7
        `,
        topHighlight: { cx: 2 * flip, cy: 5, rx: 4, ry: 4 },
      };
    }

    case LegPose.CROSSED:
    case LegPose.WIDE:
    case LegPose.STANDING:
    default: {
      return {
        main: `
          M ${-4 * flip} 0
          C ${-5 * flip} 1, ${-6 * flip} 3, ${-5 * flip} 5
          C ${-4 * flip} 7, ${-1 * flip} 8, ${3 * flip} 8
          C ${7 * flip} 8, ${11 * flip} 6, ${12 * flip} 4
          C ${13 * flip} 2, ${11 * flip} 0, ${8 * flip} -1
          C ${5 * flip} -1, ${1 * flip} -1, ${-2 * flip} -1
          Q ${-3 * flip} -1, ${-4 * flip} 0
          Z
        `,
        heelShadow: `
          M ${-4 * flip} 2
          C ${-6 * flip} 3, ${-6 * flip} 5, ${-5 * flip} 6
          C ${-4 * flip} 7, ${-3 * flip} 6, ${-3 * flip} 5
        `,
        topHighlight: { cx: 3 * flip, cy: 2, rx: 4, ry: 2 },
      };
    }
  }
}

/** Returns true if the shoe style should show bare feet (no shoe overlay) */
function isBarefoot(style?: ShoeStyle): boolean {
  return !style || style === ShoeStyle.NONE || style === ShoeStyle.BAREFOOT;
}

interface SingleFootProps {
  skinTone: string;
  position: { x: number; y: number };
  isLeft: boolean;
  pose: LegPose;
  footGradientId: string;
}

function SingleFoot({ skinTone, position, isLeft, pose, footGradientId }: SingleFootProps) {
  const paths = getFootPaths(isLeft, pose);
  const shadowColor = adjustBrightness(skinTone, -25);
  const highlightColor = adjustBrightness(skinTone, 15);
  const deepShadow = adjustBrightness(skinTone, -40);

  return (
    <G transform={`translate(${position.x}, ${position.y})`}>
      <Path d={paths.main} fill={`url(#${footGradientId})`} />
      <Path
        d={paths.heelShadow}
        stroke={shadowColor}
        strokeWidth={1.2}
        fill="none"
        opacity={0.25}
      />
      <Ellipse
        cx={paths.topHighlight.cx}
        cy={paths.topHighlight.cy}
        rx={paths.topHighlight.rx}
        ry={paths.topHighlight.ry}
        fill={highlightColor}
        opacity={0.15}
      />
      <Path
        d={`M ${-4 * (isLeft ? 1 : -1)} 7 Q ${2 * (isLeft ? 1 : -1)} 9, ${9 * (isLeft ? 1 : -1)} 6`}
        stroke={deepShadow}
        strokeWidth={0.8}
        fill="none"
        opacity={0.15}
      />
    </G>
  );
}

interface SingleShoeProps {
  shoeStyle: ShoeStyle;
  shoeColor: string;
  position: { x: number; y: number };
  isLeft: boolean;
  pose: LegPose;
  shoeGradientId: string;
}

function SingleShoe({ shoeStyle, shoeColor, position, isLeft, pose, shoeGradientId }: SingleShoeProps) {
  const flip = isLeft ? 1 : -1;
  const sole = adjustBrightness(shoeColor, -40);
  const detail = adjustBrightness(shoeColor, -20);
  const highlight = adjustBrightness(shoeColor, 20);

  const renderShoe = (): React.ReactNode => {
    switch (shoeStyle) {
      case ShoeStyle.SNEAKERS:
        return (
          <G>
            {/* Shoe body */}
            <Path
              d={`M ${-5 * flip} -2 C ${-6 * flip} 0, ${-7 * flip} 4, ${-6 * flip} 6 C ${-5 * flip} 8, ${-1 * flip} 9, ${4 * flip} 9 C ${8 * flip} 9, ${12 * flip} 7, ${13 * flip} 5 C ${14 * flip} 3, ${12 * flip} -1, ${9 * flip} -2 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Sole */}
            <Path
              d={`M ${-6 * flip} 6 C ${-5 * flip} 9, ${-1 * flip} 10, ${4 * flip} 10 C ${9 * flip} 10, ${13 * flip} 8, ${13 * flip} 6`}
              fill={sole}
            />
            {/* Lace area */}
            <Path d={`M ${1 * flip} -1 L ${3 * flip} -1 M ${4 * flip} 0 L ${6 * flip} 0`} stroke={highlight} strokeWidth={0.8} fill="none" />
            {/* Toe cap */}
            <Path d={`M ${10 * flip} 2 Q ${13 * flip} 4, ${12 * flip} 6`} stroke={highlight} strokeWidth={1} fill="none" opacity={0.4} />
          </G>
        );

      case ShoeStyle.SNEAKERS_HIGH:
        return (
          <G>
            {/* High-top shoe body - extended ankle */}
            <Path
              d={`M ${-5 * flip} -6 C ${-6 * flip} -4, ${-7 * flip} 4, ${-6 * flip} 6 C ${-5 * flip} 8, ${-1 * flip} 9, ${4 * flip} 9 C ${8 * flip} 9, ${12 * flip} 7, ${13 * flip} 5 C ${14 * flip} 3, ${12 * flip} -4, ${9 * flip} -6 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Sole */}
            <Path
              d={`M ${-6 * flip} 6 C ${-5 * flip} 9, ${-1 * flip} 10, ${4 * flip} 10 C ${9 * flip} 10, ${13 * flip} 8, ${13 * flip} 6`}
              fill={sole}
            />
            {/* Ankle collar */}
            <Path d={`M ${-5 * flip} -6 Q ${2 * flip} -8, ${9 * flip} -6`} stroke={highlight} strokeWidth={1.5} fill="none" />
            {/* Lace area */}
            <Path d={`M ${1 * flip} -4 L ${3 * flip} -4 M ${1 * flip} -1 L ${3 * flip} -1 M ${4 * flip} 0 L ${6 * flip} 0`} stroke={highlight} strokeWidth={0.8} fill="none" />
            {/* Toe cap */}
            <Path d={`M ${10 * flip} 2 Q ${13 * flip} 4, ${12 * flip} 6`} stroke={highlight} strokeWidth={1} fill="none" opacity={0.4} />
          </G>
        );

      case ShoeStyle.HEELS:
        return (
          <G>
            {/* Pointed toe shoe */}
            <Path
              d={`M ${-4 * flip} -2 C ${-5 * flip} 0, ${-5 * flip} 3, ${-4 * flip} 4 C ${-2 * flip} 6, ${3 * flip} 6, ${8 * flip} 4 C ${12 * flip} 2, ${15 * flip} 0, ${14 * flip} -1 C ${12 * flip} -2, ${5 * flip} -2, ${-4 * flip} -2 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Heel */}
            <Path d={`M ${-4 * flip} 1 L ${-5 * flip} 8 L ${-3 * flip} 8 L ${-3 * flip} 4`} fill={shoeColor} />
            {/* Sole line */}
            <Path d={`M ${-4 * flip} 5 Q ${5 * flip} 7, ${14 * flip} 0`} stroke={sole} strokeWidth={0.8} fill="none" />
          </G>
        );

      case ShoeStyle.SANDALS:
        return (
          <G>
            {/* Sole platform */}
            <Path
              d={`M ${-5 * flip} 4 C ${-4 * flip} 7, ${0} 8, ${4 * flip} 8 C ${9 * flip} 8, ${12 * flip} 6, ${12 * flip} 4 L ${12 * flip} 3 C ${9 * flip} 5, ${-2 * flip} 5, ${-5 * flip} 3 Z`}
              fill={sole}
            />
            {/* Straps */}
            <Path d={`M ${-3 * flip} 2 Q ${3 * flip} -1, ${9 * flip} 2`} stroke={shoeColor} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Path d={`M ${0} 3 Q ${5 * flip} 0, ${10 * flip} 3`} stroke={shoeColor} strokeWidth={2} fill="none" strokeLinecap="round" />
          </G>
        );

      case ShoeStyle.FLIP_FLOPS:
        return (
          <G>
            {/* Thin sole */}
            <Path
              d={`M ${-5 * flip} 5 C ${-4 * flip} 7, ${0} 8, ${4 * flip} 8 C ${9 * flip} 8, ${12 * flip} 6, ${12 * flip} 4 L ${12 * flip} 3 C ${9 * flip} 5, ${-2 * flip} 5, ${-5 * flip} 4 Z`}
              fill={sole}
            />
            {/* V-strap */}
            <Path d={`M ${4 * flip} -1 L ${8 * flip} 4`} stroke={shoeColor} strokeWidth={2} strokeLinecap="round" fill="none" />
            <Path d={`M ${4 * flip} -1 L ${0} 4`} stroke={shoeColor} strokeWidth={2} strokeLinecap="round" fill="none" />
          </G>
        );

      case ShoeStyle.LOAFERS:
        return (
          <G>
            {/* Slip-on shoe body */}
            <Path
              d={`M ${-5 * flip} -1 C ${-6 * flip} 1, ${-6 * flip} 4, ${-5 * flip} 6 C ${-3 * flip} 8, ${2 * flip} 9, ${6 * flip} 8 C ${10 * flip} 7, ${13 * flip} 5, ${14 * flip} 3 C ${14 * flip} 0, ${12 * flip} -1, ${8 * flip} -2 Q ${2 * flip} -2, ${-5 * flip} -1 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Opening cut */}
            <Path d={`M ${-2 * flip} -1 Q ${4 * flip} -3, ${10 * flip} -1`} stroke={detail} strokeWidth={1} fill="none" opacity={0.5} />
            {/* Sole */}
            <Path d={`M ${-5 * flip} 6 Q ${4 * flip} 10, ${14 * flip} 4`} stroke={sole} strokeWidth={1.5} fill="none" />
          </G>
        );

      case ShoeStyle.CONVERSE:
        return (
          <G>
            {/* High-top body */}
            <Path
              d={`M ${-5 * flip} -8 L ${-5 * flip} 5 C ${-4 * flip} 8, ${0} 9, ${5 * flip} 9 C ${10 * flip} 9, ${13 * flip} 7, ${14 * flip} 4 L ${14 * flip} -5 C ${10 * flip} -8, ${-1 * flip} -9, ${-5 * flip} -8 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Rubber toe cap */}
            <Path
              d={`M ${9 * flip} 1 C ${11 * flip} 2, ${14 * flip} 3, ${14 * flip} 5 C ${13 * flip} 8, ${10 * flip} 9, ${7 * flip} 9`}
              fill="#f5f5f5"
            />
            {/* Star detail */}
            <Circle cx={4 * flip} cy={-3} r={2} fill="none" stroke={detail} strokeWidth={0.8} />
            {/* Sole */}
            <Path d={`M ${-5 * flip} 6 Q ${4 * flip} 10, ${14 * flip} 5`} fill={sole} />
            {/* Top rim */}
            <Path d={`M ${-5 * flip} -8 Q ${5 * flip} -10, ${14 * flip} -5`} stroke="#f5f5f5" strokeWidth={1.5} fill="none" />
          </G>
        );

      case ShoeStyle.BOOTS_COMBAT:
        return (
          <G>
            {/* Tall combat boot */}
            <Path
              d={`M ${-6 * flip} -12 L ${-6 * flip} 5 C ${-5 * flip} 9, ${0} 10, ${5 * flip} 10 C ${10 * flip} 10, ${14 * flip} 8, ${14 * flip} 4 L ${14 * flip} -10 C ${10 * flip} -12, ${-2 * flip} -13, ${-6 * flip} -12 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Chunky sole */}
            <Path
              d={`M ${-6 * flip} 6 C ${-5 * flip} 11, ${0} 12, ${5 * flip} 12 C ${10 * flip} 12, ${14 * flip} 9, ${14 * flip} 5`}
              fill={sole}
            />
            {/* Lace-up */}
            <Path d={`M ${0} -10 L ${4 * flip} -10 M ${0} -7 L ${4 * flip} -7 M ${0} -4 L ${4 * flip} -4 M ${0} -1 L ${4 * flip} -1 M ${0} 2 L ${4 * flip} 2`} stroke={detail} strokeWidth={0.8} fill="none" />
            {/* Boot top */}
            <Path d={`M ${-6 * flip} -12 Q ${4 * flip} -14, ${14 * flip} -10`} stroke={detail} strokeWidth={1.5} fill="none" />
          </G>
        );

      case ShoeStyle.RUNNING:
        return (
          <G>
            {/* Athletic shoe body */}
            <Path
              d={`M ${-5 * flip} -2 C ${-6 * flip} 0, ${-7 * flip} 4, ${-6 * flip} 6 C ${-5 * flip} 8, ${-1 * flip} 9, ${4 * flip} 9 C ${8 * flip} 9, ${12 * flip} 7, ${13 * flip} 5 C ${14 * flip} 3, ${13 * flip} -1, ${10 * flip} -3 C ${7 * flip} -4, ${-2 * flip} -3, ${-5 * flip} -2 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Curved sole */}
            <Path
              d={`M ${-7 * flip} 5 C ${-5 * flip} 10, ${0} 11, ${5 * flip} 10 C ${10 * flip} 9, ${13 * flip} 7, ${13 * flip} 5`}
              fill={sole}
            />
            {/* Mesh pattern hint */}
            <Path d={`M ${3 * flip} 0 L ${7 * flip} 0 M ${2 * flip} 2 L ${8 * flip} 2 M ${3 * flip} 4 L ${7 * flip} 4`} stroke={highlight} strokeWidth={0.6} fill="none" opacity={0.4} />
            {/* Swoosh-like detail */}
            <Path d={`M ${-3 * flip} 4 Q ${3 * flip} 0, ${10 * flip} 2`} stroke={highlight} strokeWidth={1.2} fill="none" opacity={0.5} />
          </G>
        );

      case ShoeStyle.CROCS:
        return (
          <G>
            {/* Rounded clog body */}
            <Path
              d={`M ${-5 * flip} -1 C ${-7 * flip} 1, ${-7 * flip} 5, ${-6 * flip} 7 C ${-4 * flip} 9, ${1 * flip} 10, ${6 * flip} 10 C ${11 * flip} 10, ${15 * flip} 8, ${15 * flip} 5 C ${15 * flip} 2, ${14 * flip} -1, ${11 * flip} -2 Q ${4 * flip} -3, ${-5 * flip} -1 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Holes pattern */}
            <Circle cx={2 * flip} cy={1} r={1.2} fill={detail} opacity={0.4} />
            <Circle cx={5 * flip} cy={0} r={1.2} fill={detail} opacity={0.4} />
            <Circle cx={8 * flip} cy={1} r={1.2} fill={detail} opacity={0.4} />
            <Circle cx={3 * flip} cy={4} r={1.2} fill={detail} opacity={0.4} />
            <Circle cx={6 * flip} cy={3} r={1.2} fill={detail} opacity={0.4} />
            <Circle cx={9 * flip} cy={4} r={1.2} fill={detail} opacity={0.4} />
            {/* Heel strap */}
            <Path d={`M ${-5 * flip} 0 Q ${-6 * flip} -3, ${-3 * flip} -2`} stroke={shoeColor} strokeWidth={1.5} fill="none" />
          </G>
        );

      case ShoeStyle.SLIPPERS:
        return (
          <G>
            {/* Soft rounded slipper */}
            <Path
              d={`M ${-5 * flip} -1 C ${-6 * flip} 1, ${-6 * flip} 5, ${-5 * flip} 7 C ${-3 * flip} 9, ${1 * flip} 9, ${5 * flip} 9 C ${9 * flip} 9, ${13 * flip} 7, ${13 * flip} 4 C ${13 * flip} 1, ${11 * flip} -1, ${8 * flip} -2 Q ${2 * flip} -2, ${-5 * flip} -1 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            {/* Soft top highlight */}
            <Ellipse cx={4 * flip} cy={2} rx={5} ry={3} fill={highlight} opacity={0.2} />
          </G>
        );

      default:
        // Fallback generic shoe shape
        return (
          <G>
            <Path
              d={`M ${-5 * flip} -2 C ${-6 * flip} 0, ${-7 * flip} 4, ${-6 * flip} 6 C ${-5 * flip} 8, ${-1 * flip} 9, ${4 * flip} 9 C ${8 * flip} 9, ${12 * flip} 7, ${13 * flip} 5 C ${14 * flip} 3, ${12 * flip} -1, ${9 * flip} -2 Z`}
              fill={`url(#${shoeGradientId})`}
            />
            <Path d={`M ${-6 * flip} 6 Q ${4 * flip} 10, ${13 * flip} 5`} fill={sole} />
          </G>
        );
    }
  };

  return (
    <G transform={`translate(${position.x}, ${position.y})`}>
      {renderShoe()}
    </G>
  );
}

export function Feet({ skinTone, leftAnkle, rightAnkle, legPose, shoeStyle, shoeColor = '#333333', scale = 1 }: FeetProps) {
  const highlightColor = adjustBrightness(skinTone, 15);
  const shadowColor = adjustBrightness(skinTone, -20);
  const midTone = adjustBrightness(skinTone, -8);
  const shoeHighlight = adjustBrightness(shoeColor, 15);
  const shoeShadow = adjustBrightness(shoeColor, -20);

  const ids = useGradientIds<FeetGradientIds>([
    'leftFootGradient',
    'rightFootGradient',
    'leftShoeGradient',
    'rightShoeGradient',
  ]);

  const showBarefoot = isBarefoot(shoeStyle);

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        <LinearGradient id={ids.leftFootGradient} x1="0%" y1="0%" x2="100%" y2="60%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="20%" stopColor={midTone} />
          <Stop offset="50%" stopColor={skinTone} />
          <Stop offset="75%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
        <LinearGradient id={ids.rightFootGradient} x1="100%" y1="0%" x2="0%" y2="60%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="20%" stopColor={midTone} />
          <Stop offset="50%" stopColor={skinTone} />
          <Stop offset="75%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={skinTone} />
        </LinearGradient>
        {!showBarefoot && (
          <>
            <LinearGradient id={ids.leftShoeGradient} x1="0%" y1="0%" x2="100%" y2="60%">
              <Stop offset="0%" stopColor={shoeShadow} />
              <Stop offset="40%" stopColor={shoeColor} />
              <Stop offset="80%" stopColor={shoeHighlight} />
              <Stop offset="100%" stopColor={shoeColor} />
            </LinearGradient>
            <LinearGradient id={ids.rightShoeGradient} x1="100%" y1="0%" x2="0%" y2="60%">
              <Stop offset="0%" stopColor={shoeShadow} />
              <Stop offset="40%" stopColor={shoeColor} />
              <Stop offset="80%" stopColor={shoeHighlight} />
              <Stop offset="100%" stopColor={shoeColor} />
            </LinearGradient>
          </>
        )}
      </Defs>

      {showBarefoot ? (
        <>
          <SingleFoot
            skinTone={skinTone}
            position={leftAnkle}
            isLeft={true}
            pose={legPose}
            footGradientId={ids.leftFootGradient}
          />
          <SingleFoot
            skinTone={skinTone}
            position={rightAnkle}
            isLeft={false}
            pose={legPose}
            footGradientId={ids.rightFootGradient}
          />
        </>
      ) : (
        <>
          <SingleShoe
            shoeStyle={shoeStyle!}
            shoeColor={shoeColor}
            position={leftAnkle}
            isLeft={true}
            pose={legPose}
            shoeGradientId={ids.leftShoeGradient}
          />
          <SingleShoe
            shoeStyle={shoeStyle!}
            shoeColor={shoeColor}
            position={rightAnkle}
            isLeft={false}
            pose={legPose}
            shoeGradientId={ids.rightShoeGradient}
          />
        </>
      )}
    </G>
  );
}

export default Feet;
