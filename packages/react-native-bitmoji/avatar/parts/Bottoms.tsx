/**
 * Bottoms Component - Lower body clothing (pants, shorts, skirts)
 * Renders various bottom styles with proper fit for body types
 */

import React from 'react';
import { G, Path, Rect, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { BottomStyle, BodyType, LegPose, SvgPartProps } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

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
  switch (bodyType) {
    case BodyType.SLIM:
      return { waistWidth: 22, hipWidth: 26, length: 'full' };
    case BodyType.ATHLETIC:
      return { waistWidth: 28, hipWidth: 32, length: 'full' };
    case BodyType.CURVY:
      return { waistWidth: 26, hipWidth: 40, length: 'full' };
    case BodyType.PLUS_SIZE:
      return { waistWidth: 38, hipWidth: 42, length: 'full' };
    case BodyType.MUSCULAR:
      return { waistWidth: 32, hipWidth: 36, length: 'full' };
    case BodyType.AVERAGE:
    default:
      return { waistWidth: 26, hipWidth: 32, length: 'full' };
  }
}

function getLengthY(length: 'short' | 'knee' | 'midi' | 'long' | 'full'): number {
  const waistY = 107;
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

function getBottomLength(style: BottomStyle): 'short' | 'knee' | 'midi' | 'long' | 'full' {
  switch (style) {
    case BottomStyle.SHORTS:
    case BottomStyle.SHORTS_ATHLETIC:
    case BottomStyle.SHORTS_DENIM:
    case BottomStyle.SHORTS_CARGO:
    case BottomStyle.SKIRT_MINI:
      return 'short';
    case BottomStyle.SKIRT_MIDI:
    case BottomStyle.SKIRT_PLEATED:
    case BottomStyle.SKIRT_A_LINE:
      return 'knee';
    case BottomStyle.SKIRT_PENCIL:
      return 'midi';
    case BottomStyle.SKIRT_MAXI:
      return 'long';
    default:
      return 'full';
  }
}

function isSkirt(style: BottomStyle): boolean {
  return [
    BottomStyle.SKIRT_MINI,
    BottomStyle.SKIRT_MIDI,
    BottomStyle.SKIRT_MAXI,
    BottomStyle.SKIRT_PLEATED,
    BottomStyle.SKIRT_PENCIL,
    BottomStyle.SKIRT_A_LINE,
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
  const bottomY = getLengthY(length);
  const waistY = 107;
  const centerX = 50;

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
      case BottomStyle.SKIRT_A_LINE:
        flare = 15;
        break;
      case BottomStyle.SKIRT_PLEATED:
        flare = 12;
        break;
      case BottomStyle.SKIRT_MAXI:
        flare = 10;
        break;
      case BottomStyle.SKIRT_PENCIL:
        flare = -2;
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

        {/* Pleats for pleated skirt */}
        {style === BottomStyle.SKIRT_PLEATED && (
          <G>
            {Array.from({ length: 8 }).map((_, i) => {
              const x = leftHip - flare + ((rightHip + 2 * flare - leftHip) / 8) * (i + 0.5);
              return (
                <Line
                  key={i}
                  x1={x}
                  y1={hipY + 5}
                  x2={x + (i % 2 === 0 ? -2 : 2)}
                  y2={bottomY - 2}
                  stroke={i % 2 === 0 ? shadowColor : highlightColor}
                  strokeWidth={1}
                  opacity={0.4}
                />
              );
            })}
          </G>
        )}

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
  const leftLegX = centerX - dims.hipWidth / 4;
  const rightLegX = centerX + dims.hipWidth / 4;

  // Calculate leg taper based on style
  let legTaper = 0;
  switch (style) {
    case BottomStyle.JEANS_SKINNY:
    case BottomStyle.LEGGINGS:
      legTaper = 3;
      break;
    case BottomStyle.JEANS_WIDE:
    case BottomStyle.CARGO:
    case BottomStyle.SHORTS_CARGO:
      legTaper = -4;
      break;
    case BottomStyle.JOGGERS:
    case BottomStyle.SWEATPANTS:
      legTaper = 1;
      break;
    default:
      legTaper = 1;
  }

  const leftLegPath = `
    M ${leftWaist} ${waistY}
    Q ${leftHip - 2} ${hipY - 5} ${leftHip} ${hipY}
    L ${leftHip} ${bottomY}
    L ${centerX - 2} ${bottomY}
    L ${centerX - 2} ${hipY + 5}
    Q ${centerX - 3} ${hipY} ${leftWaist + dims.waistWidth / 4} ${waistY}
    Z
  `;

  const rightLegPath = `
    M ${rightWaist} ${waistY}
    Q ${rightHip + 2} ${hipY - 5} ${rightHip} ${hipY}
    L ${rightHip} ${bottomY}
    L ${centerX + 2} ${bottomY}
    L ${centerX + 2} ${hipY + 5}
    Q ${centerX + 3} ${hipY} ${rightWaist - dims.waistWidth / 4} ${waistY}
    Z
  `;

  const pantsPath = `
    M ${leftWaist} ${waistY}
    Q ${leftHip - 2} ${hipY - 5} ${leftHip} ${hipY}
    Q ${leftLegX - legWidth - legTaper / 2} ${(hipY + bottomY) / 2} ${leftLegX - legWidth + legTaper} ${bottomY}
    L ${leftLegX + legWidth - legTaper} ${bottomY}
    Q ${leftLegX + legWidth} ${(hipY + bottomY) / 2} ${centerX - 2} ${hipY + 5}
    L ${centerX + 2} ${hipY + 5}
    Q ${rightLegX - legWidth} ${(hipY + bottomY) / 2} ${rightLegX - legWidth + legTaper} ${bottomY}
    L ${rightLegX + legWidth - legTaper} ${bottomY}
    Q ${rightLegX + legWidth + legTaper / 2} ${(hipY + bottomY) / 2} ${rightHip} ${hipY}
    Q ${rightHip + 2} ${hipY - 5} ${rightWaist} ${waistY}
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

      {/* Main pants shape */}
      <Path d={pantsPath} fill={`url(#${gradientId})`} />

      {/* Waistband */}
      <Path
        d={`M ${leftWaist} ${waistY} Q ${centerX} ${waistY + 2} ${rightWaist} ${waistY}
            L ${rightWaist} ${waistY + 5} Q ${centerX} ${waistY + 7} ${leftWaist} ${waistY + 5} Z`}
        fill={shadowColor}
      />

      {/* Fly/zipper area */}
      <Path
        d={`M ${centerX - 2} ${waistY + 5} L ${centerX - 2} ${hipY + 2}
            Q ${centerX} ${hipY + 4} ${centerX + 2} ${hipY + 2}
            L ${centerX + 2} ${waistY + 5}`}
        fill={deepShadow}
        opacity={0.3}
      />

      {/* Inseam shadows */}
      <Path
        d={`M ${centerX} ${hipY + 5}
            Q ${leftLegX + legWidth / 2} ${(hipY + bottomY) / 2 + 5} ${leftLegX + legWidth - legTaper} ${bottomY}`}
        stroke={deepShadow}
        strokeWidth={1}
        fill="none"
        opacity={0.3}
      />
      <Path
        d={`M ${centerX} ${hipY + 5}
            Q ${rightLegX - legWidth / 2} ${(hipY + bottomY) / 2 + 5} ${rightLegX - legWidth + legTaper} ${bottomY}`}
        stroke={deepShadow}
        strokeWidth={1}
        fill="none"
        opacity={0.3}
      />

      {/* Outseam highlights */}
      <Path
        d={`M ${leftHip} ${hipY}
            Q ${leftLegX - legWidth - legTaper / 2} ${(hipY + bottomY) / 2} ${leftLegX - legWidth + legTaper} ${bottomY}`}
        stroke={highlightColor}
        strokeWidth={0.5}
        fill="none"
        opacity={0.2}
      />
      <Path
        d={`M ${rightHip} ${hipY}
            Q ${rightLegX + legWidth + legTaper / 2} ${(hipY + bottomY) / 2} ${rightLegX + legWidth - legTaper} ${bottomY}`}
        stroke={highlightColor}
        strokeWidth={0.5}
        fill="none"
        opacity={0.2}
      />

      {/* Style-specific details */}
      {/* Cargo pockets */}
      {(style === BottomStyle.CARGO || style === BottomStyle.SHORTS_CARGO) && (
        <G>
          <Rect
            x={leftLegX - legWidth + 2}
            y={(hipY + bottomY) / 2 - 5}
            width={legWidth * 1.5}
            height={12}
            fill={shadowColor}
            opacity={0.2}
          />
          <Rect
            x={rightLegX - legWidth / 2}
            y={(hipY + bottomY) / 2 - 5}
            width={legWidth * 1.5}
            height={12}
            fill={shadowColor}
            opacity={0.2}
          />
        </G>
      )}

      {/* Ripped effect for ripped jeans */}
      {style === BottomStyle.JEANS_RIPPED && (
        <G>
          <Path
            d={`M ${leftLegX - 2} ${hipY + 25} Q ${leftLegX} ${hipY + 28} ${leftLegX + 3} ${hipY + 25}`}
            stroke="#f5f5f5"
            strokeWidth={2}
            fill="none"
            opacity={0.6}
          />
          <Path
            d={`M ${rightLegX - 3} ${hipY + 30} Q ${rightLegX} ${hipY + 33} ${rightLegX + 2} ${hipY + 30}`}
            stroke="#f5f5f5"
            strokeWidth={2}
            fill="none"
            opacity={0.6}
          />
        </G>
      )}

      {/* Jogger/sweatpants cuff */}
      {(style === BottomStyle.JOGGERS || style === BottomStyle.SWEATPANTS) && length === 'full' && (
        <G>
          <Path
            d={`M ${leftLegX - legWidth + legTaper} ${bottomY - 4}
                Q ${leftLegX} ${bottomY - 3} ${leftLegX + legWidth - legTaper} ${bottomY - 4}
                L ${leftLegX + legWidth - legTaper} ${bottomY}
                Q ${leftLegX} ${bottomY + 1} ${leftLegX - legWidth + legTaper} ${bottomY}
                Z`}
            fill={shadowColor}
          />
          <Path
            d={`M ${rightLegX - legWidth + legTaper} ${bottomY - 4}
                Q ${rightLegX} ${bottomY - 3} ${rightLegX + legWidth - legTaper} ${bottomY - 4}
                L ${rightLegX + legWidth - legTaper} ${bottomY}
                Q ${rightLegX} ${bottomY + 1} ${rightLegX - legWidth + legTaper} ${bottomY}
                Z`}
            fill={shadowColor}
          />
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
