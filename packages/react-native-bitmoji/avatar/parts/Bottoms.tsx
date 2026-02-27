/**
 * Bottoms Component - Lower body clothing (pants, shorts, skirts)
 * Renders various bottom styles with proper fit for body types
 */

import React from 'react';
import { G, Path, Rect, Ellipse, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { BottomStyle, BodyType, LegPose, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';
import { getBodyDimensions } from './Body';

type BottomsGradientIds = {
  bottomsGradient: string;
  leftLegBottomGradient: string;
  rightLegBottomGradient: string;
};

interface BottomsProps extends SvgPartProps {
  style: BottomStyle;
  bodyType: BodyType;
  legPose: LegPose;
  color: string;
}

interface BottomDimensions {
  waistWidth: number;
  hipWidth: number;
  length: 'short' | 'knee' | 'midi' | 'long' | 'full';
}

function getBottomDimensions(bodyType: BodyType): BottomDimensions {
  // Use body dimensions for width consistency with Body.tsx torso shape
  const bodyDims = getBodyDimensions(bodyType);
  return {
    waistWidth: bodyDims.waistWidth,
    hipWidth: bodyDims.hipWidth,
    length: 'full',
  };
}

function getLengthY(length: 'short' | 'knee' | 'midi' | 'long' | 'full', waistY: number): number {
  switch (length) {
    case 'short':
      return waistY + 20;
    case 'knee':
      return waistY + 35;
    case 'midi':
      return waistY + 45;
    case 'long':
      return waistY + 55;
    case 'full':
    default:
      return waistY + 68;
  }
}

interface LegPoseOffsets {
  leftOffset: number;
  rightOffset: number;
  bottomYAdjust: number;
  hipWidthAdjust: number;
}

function getLegPoseOffsets(legPose: LegPose): LegPoseOffsets {
  switch (legPose) {
    case LegPose.CROSSED:
      return { leftOffset: 3, rightOffset: -3, bottomYAdjust: 0, hipWidthAdjust: 0 };
    case LegPose.WIDE:
      return { leftOffset: -5, rightOffset: 5, bottomYAdjust: 0, hipWidthAdjust: 4 };
    case LegPose.SITTING:
      return { leftOffset: 0, rightOffset: 0, bottomYAdjust: -33, hipWidthAdjust: 6 };
    case LegPose.STANDING:
    default:
      return { leftOffset: 0, rightOffset: 0, bottomYAdjust: 0, hipWidthAdjust: 0 };
  }
}

function getBottomLength(style: BottomStyle): 'short' | 'knee' | 'midi' | 'long' | 'full' {
  switch (style) {
    // Short
    case BottomStyle.SHORTS:
    case BottomStyle.SHORTS_ATHLETIC:
    case BottomStyle.SKIRT_MINI:
      return 'short';
    // Knee
    case BottomStyle.SKIRT_MIDI:
      return 'knee';
    // Full (all jeans variants, chinos, trousers, etc.)
    case BottomStyle.JEANS:
    case BottomStyle.JEANS_SKINNY:
    case BottomStyle.CHINOS:
    case BottomStyle.DRESS_PANTS:
    case BottomStyle.LEGGINGS:
    case BottomStyle.CARGO:
    case BottomStyle.JOGGERS:
    case BottomStyle.SWEATPANTS:
    case BottomStyle.JUMPSUIT:
      return 'full';
    default:
      return 'full';
  }
}

function isSkirt(style: BottomStyle): boolean {
  return [
    BottomStyle.SKIRT_MINI,
    BottomStyle.SKIRT_MIDI,
  ].includes(style);
}

export function Bottoms({ style, bodyType, legPose, color, scale = 1 }: BottomsProps) {
  // Use stable gradient IDs for consistent rendering (must be called before early return)
  const ids = useGradientIds<BottomsGradientIds>([
    'bottomsGradient', 'leftLegBottomGradient', 'rightLegBottomGradient'
  ]);

  if (style === BottomStyle.NONE) {
    return null;
  }

  const dims = getBottomDimensions(bodyType);
  const length = getBottomLength(style);
  const bodyDims = getBodyDimensions(bodyType);
  const waistY = 72 + bodyDims.torsoLength;
  const centerX = 50;
  const bottomY = getLengthY(length, waistY);

  const shadowColor = adjustBrightness(color, -30);
  const highlightColor = adjustBrightness(color, 20);
  const deepShadow = adjustBrightness(color, -45);

  const gradientId = ids.bottomsGradient;
  const leftLegGradientId = ids.leftLegBottomGradient;
  const rightLegGradientId = ids.rightLegBottomGradient;

  // Waistband coordinates
  const leftWaist = centerX - dims.waistWidth / 2;
  const rightWaist = centerX + dims.waistWidth / 2;
  const leftHip = centerX - dims.hipWidth / 2;
  const rightHip = centerX + dims.hipWidth / 2;
  const hipY = waistY + 15;

  if (isSkirt(style)) {
    // Render skirt styles
    let skirtPath = '';
    let flare = 0;

    switch (style) {
      case BottomStyle.SKIRT_MIDI:
        flare = 8;
        break;
      case BottomStyle.SKIRT_MINI:
        flare = 12;
        break;
      default:
        flare = 8;
    }

    skirtPath = `
      M ${leftWaist} ${waistY}
      Q ${leftHip - 2} ${hipY - 5} ${leftHip} ${hipY}
      Q ${leftHip - flare / 2} ${(hipY + bottomY) / 2} ${leftHip - flare} ${bottomY}
      L ${rightHip + flare} ${bottomY}
      Q ${rightHip + flare / 2} ${(hipY + bottomY) / 2} ${rightHip} ${hipY}
      Q ${rightHip + 2} ${hipY - 5} ${rightWaist} ${waistY}
      Z
    `;

    return (
      <G transform={`scale(${scale})`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={shadowColor} />
            <Stop offset="30%" stopColor={color} />
            <Stop offset="50%" stopColor={highlightColor} />
            <Stop offset="70%" stopColor={color} />
            <Stop offset="100%" stopColor={shadowColor} />
          </LinearGradient>
        </Defs>

        {/* Main skirt shape */}
        <Path d={skirtPath} fill={`url(#${gradientId})`} />

        {/* Waistband */}
        <Path
          d={`M ${leftWaist} ${waistY} Q ${centerX} ${waistY + 2} ${rightWaist} ${waistY}
              L ${rightWaist} ${waistY + 4} Q ${centerX} ${waistY + 6} ${leftWaist} ${waistY + 4} Z`}
          fill={shadowColor}
        />


        {/* Center fold/seam shadow */}
        <Path
          d={`M ${centerX} ${hipY} Q ${centerX - 1} ${(hipY + bottomY) / 2} ${centerX} ${bottomY}`}
          stroke={shadowColor}
          strokeWidth={1}
          fill="none"
          opacity={0.3}
        />

        {/* Hem shadow */}
        <Path
          d={`M ${leftHip - flare} ${bottomY - 2}
              Q ${centerX} ${bottomY + 1} ${rightHip + flare} ${bottomY - 2}`}
          stroke={deepShadow}
          strokeWidth={1.5}
          fill="none"
          opacity={0.3}
        />
      </G>
    );
  }

  // Render pants/shorts styles
  const legWidth = dims.hipWidth / 4;
  const baseLegX = dims.hipWidth / 4;

  // Calculate leg taper based on style
  let legTaper = 0;
  switch (style) {
    // Slim / skinny (taper inward)
    case BottomStyle.JEANS_SKINNY:
    case BottomStyle.LEGGINGS:
      legTaper = 3;
      break;
    // Straight (no taper)
    case BottomStyle.JEANS:
    case BottomStyle.CHINOS:
    case BottomStyle.DRESS_PANTS:
      legTaper = 0;
      break;
    // Wide
    case BottomStyle.CARGO:
      legTaper = -4;
      break;
    // Default slight taper
    case BottomStyle.JOGGERS:
    case BottomStyle.SWEATPANTS:
      legTaper = 1;
      break;
    default:
      legTaper = 1;
  }

  // Apply leg-pose offsets to pants rendering
  const poseOffsets = getLegPoseOffsets(legPose);
  const leftLegX = centerX - baseLegX + poseOffsets.leftOffset;
  const rightLegX = centerX + baseLegX + poseOffsets.rightOffset;
  const poseBottomY = bottomY + poseOffsets.bottomYAdjust;
  const poseHipWidth = dims.hipWidth + poseOffsets.hipWidthAdjust;
  const poseLeftHip = centerX - poseHipWidth / 2;
  const poseRightHip = centerX + poseHipWidth / 2;

  const crotchHalf = 4; // half the crotch gap width (8 units total)

  const leftLegPath = `
    M ${leftWaist} ${waistY}
    Q ${poseLeftHip - 2} ${hipY - 5} ${poseLeftHip} ${hipY}
    L ${poseLeftHip} ${poseBottomY}
    L ${centerX - crotchHalf} ${poseBottomY}
    L ${centerX - crotchHalf} ${hipY + 5}
    Q ${centerX - crotchHalf - 1} ${hipY} ${leftWaist + dims.waistWidth / 4} ${waistY}
    Z
  `;

  const rightLegPath = `
    M ${rightWaist} ${waistY}
    Q ${poseRightHip + 2} ${hipY - 5} ${poseRightHip} ${hipY}
    L ${poseRightHip} ${poseBottomY}
    L ${centerX + crotchHalf} ${poseBottomY}
    L ${centerX + crotchHalf} ${hipY + 5}
    Q ${centerX + crotchHalf + 1} ${hipY} ${rightWaist - dims.waistWidth / 4} ${waistY}
    Z
  `;

  const pantsPath = `
    M ${leftWaist} ${waistY}
    Q ${poseLeftHip - 2} ${hipY - 5} ${poseLeftHip} ${hipY}
    Q ${leftLegX - legWidth - legTaper / 2} ${(hipY + poseBottomY) / 2} ${leftLegX - legWidth + legTaper} ${poseBottomY}
    L ${leftLegX + legWidth - legTaper} ${poseBottomY}
    Q ${leftLegX + legWidth} ${(hipY + poseBottomY) / 2} ${centerX - crotchHalf} ${hipY + 5}
    L ${centerX + crotchHalf} ${hipY + 5}
    Q ${rightLegX - legWidth} ${(hipY + poseBottomY) / 2} ${rightLegX - legWidth + legTaper} ${poseBottomY}
    L ${rightLegX + legWidth - legTaper} ${poseBottomY}
    Q ${rightLegX + legWidth + legTaper / 2} ${(hipY + poseBottomY) / 2} ${poseRightHip} ${hipY}
    Q ${poseRightHip + 2} ${hipY - 5} ${rightWaist} ${waistY}
    Z
  `;

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="25%" stopColor={color} />
          <Stop offset="50%" stopColor={highlightColor} />
          <Stop offset="75%" stopColor={color} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
        <LinearGradient id={leftLegGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={shadowColor} />
          <Stop offset="40%" stopColor={color} />
          <Stop offset="70%" stopColor={highlightColor} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
        <LinearGradient id={rightLegGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="30%" stopColor={highlightColor} />
          <Stop offset="60%" stopColor={color} />
          <Stop offset="100%" stopColor={shadowColor} />
        </LinearGradient>
      </Defs>

      {/* Crotch fill to prevent skin showing between legs */}
      <Path
        d={`M ${centerX - crotchHalf} ${hipY + 5}
            L ${centerX + crotchHalf} ${hipY + 5}
            L ${centerX + crotchHalf + 2} ${poseBottomY}
            L ${centerX - crotchHalf - 2} ${poseBottomY}
            Z`}
        fill={color}
      />
      {/* Main pants shape */}
      <Path d={pantsPath} fill={`url(#${gradientId})`} />

      {/* Waistband */}
      <Path
        d={`M ${leftWaist} ${waistY} Q ${centerX} ${waistY + 2} ${rightWaist} ${waistY}
            L ${rightWaist} ${waistY + 5} Q ${centerX} ${waistY + 7} ${leftWaist} ${waistY + 5} Z`}
        fill={shadowColor}
      />

      {/* Subtle fly detail - small, no extending lines */}
      <Path
        d={`M ${centerX - 1} ${waistY + 5} L ${centerX - 1} ${waistY + 12}
            Q ${centerX} ${waistY + 13} ${centerX + 1} ${waistY + 12}
            L ${centerX + 1} ${waistY + 5}`}
        fill={deepShadow}
        opacity={0.2}
      />

      {/* Outseam highlights */}
      <Path
        d={`M ${poseLeftHip} ${hipY}
            Q ${leftLegX - legWidth - legTaper / 2} ${(hipY + poseBottomY) / 2} ${leftLegX - legWidth + legTaper} ${poseBottomY}`}
        stroke={highlightColor}
        strokeWidth={0.5}
        fill="none"
        opacity={0.2}
      />
      <Path
        d={`M ${poseRightHip} ${hipY}
            Q ${rightLegX + legWidth + legTaper / 2} ${(hipY + poseBottomY) / 2} ${rightLegX + legWidth - legTaper} ${poseBottomY}`}
        stroke={highlightColor}
        strokeWidth={0.5}
        fill="none"
        opacity={0.2}
      />

      {/* Style-specific details */}
      {/* Cargo pockets */}
      {style === BottomStyle.CARGO && (
        <G>
          <Rect
            x={leftLegX - legWidth + 2}
            y={(hipY + poseBottomY) / 2 - 5}
            width={legWidth * 1.5}
            height={12}
            fill={shadowColor}
            opacity={0.2}
          />
          <Rect
            x={rightLegX - legWidth / 2}
            y={(hipY + poseBottomY) / 2 - 5}
            width={legWidth * 1.5}
            height={12}
            fill={shadowColor}
            opacity={0.2}
          />
        </G>
      )}

      {/* Denim twill texture for jeans styles */}
      {style === BottomStyle.JEANS || style === BottomStyle.JEANS_SKINNY ? (
        <G>
          {/* Diagonal twill weave lines — left leg */}
          {[0, 4, 8, 12, 16].map((offset, i) => (
            <Path
              key={`twill-l-${i}`}
              d={`M ${leftHip + offset} ${hipY + 2} L ${leftHip + offset - 6} ${hipY + 14}`}
              stroke={highlightColor}
              strokeWidth={0.4}
              fill="none"
              opacity={0.07}
            />
          ))}
          {/* Diagonal twill weave lines — right leg */}
          {[0, 4, 8, 12, 16].map((offset, i) => (
            <Path
              key={`twill-r-${i}`}
              d={`M ${rightHip - 16 + offset} ${hipY + 2} L ${rightHip - 16 + offset - 6} ${hipY + 14}`}
              stroke={highlightColor}
              strokeWidth={0.4}
              fill="none"
              opacity={0.07}
            />
          ))}
          {/* Whiskering / thigh fade — left leg highlight */}
          <Ellipse
            cx={leftLegX}
            cy={hipY + 18}
            rx={legWidth * 0.7}
            ry={8}
            fill={highlightColor}
            opacity={0.1}
          />
          {/* Whiskering / thigh fade — right leg highlight */}
          <Ellipse
            cx={rightLegX}
            cy={hipY + 18}
            rx={legWidth * 0.7}
            ry={8}
            fill={highlightColor}
            opacity={0.1}
          />
        </G>
      ) : null}


      {/* Jogger/sweatpants cuff */}
      {(style === BottomStyle.JOGGERS || style === BottomStyle.SWEATPANTS) && length === 'full' && (
        <G>
          <Path
            d={`M ${leftLegX - legWidth + legTaper} ${poseBottomY - 4}
                Q ${leftLegX} ${poseBottomY - 3} ${leftLegX + legWidth - legTaper} ${poseBottomY - 4}
                L ${leftLegX + legWidth - legTaper} ${poseBottomY}
                Q ${leftLegX} ${poseBottomY + 1} ${leftLegX - legWidth + legTaper} ${poseBottomY}
                Z`}
            fill={shadowColor}
          />
          <Path
            d={`M ${rightLegX - legWidth + legTaper} ${poseBottomY - 4}
                Q ${rightLegX} ${poseBottomY - 3} ${rightLegX + legWidth - legTaper} ${poseBottomY - 4}
                L ${rightLegX + legWidth - legTaper} ${poseBottomY}
                Q ${rightLegX} ${poseBottomY + 1} ${rightLegX - legWidth + legTaper} ${poseBottomY}
                Z`}
            fill={shadowColor}
          />
        </G>
      )}




      {/* Dress pants crease line */}
      {style === BottomStyle.DRESS_PANTS && (
        <G>
          <Path d={`M ${leftLegX} ${hipY + 5} L ${leftLegX} ${poseBottomY - 2}`} stroke={highlightColor} strokeWidth={0.8} fill="none" opacity={0.25} />
          <Path d={`M ${rightLegX} ${hipY + 5} L ${rightLegX} ${poseBottomY - 2}`} stroke={highlightColor} strokeWidth={0.8} fill="none" opacity={0.25} />
        </G>
      )}


      {/* Leggings subtle sheen */}
      {style === BottomStyle.LEGGINGS && (
        <G>
          <Ellipse cx={leftLegX + 2} cy={(hipY + poseBottomY) / 2} rx={legWidth * 0.5} ry={18} fill={highlightColor} opacity={0.15} />
          <Ellipse cx={rightLegX + 2} cy={(hipY + poseBottomY) / 2} rx={legWidth * 0.5} ry={18} fill={highlightColor} opacity={0.15} />
        </G>
      )}

      {/* Belt loops */}
      <G>
        {[leftWaist + 3, centerX - 5, centerX + 5, rightWaist - 3].map((x, i) => (
          <Rect
            key={i}
            x={x - 1}
            y={waistY - 1}
            width={2}
            height={6}
            fill={shadowColor}
            opacity={0.4}
          />
        ))}
      </G>
    </G>
  );
}

export default Bottoms;
