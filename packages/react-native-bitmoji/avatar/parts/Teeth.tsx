/**
 * Teeth Component - Customizable teeth rendering for mouth styles
 *
 * Renders various teeth styles including natural variations, dental work, and grillz.
 * Used in conjunction with the Mouth component for open-mouth styles.
 */

import React, { memo } from 'react';
import { G, Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TeethStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface TeethProps {
  style?: TeethStyle;
  color?: string;
  /** Position offset X from mouth center */
  offsetX?: number;
  /** Position offset Y */
  offsetY?: number;
  /** Scale factor for teeth */
  scale?: number;
  /** Whether showing upper teeth, lower teeth, or both */
  show?: 'upper' | 'lower' | 'both';
}

type TeethGradientIds = {
  teethGrad: string;
  grillzGrad: string;
  bracesGrad: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEETH_COLOR = '#fffef5';
const GOLD_COLOR = '#ffd700';
const SILVER_COLOR = '#c0c0c0';
const BRACES_METAL_COLOR = '#a8a8a8';
const GUM_COLOR = '#e8a0a0';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface SingleToothProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  gradientId: string;
  variant?: 'normal' | 'gap' | 'missing' | 'chipped' | 'gold' | 'silver';
}

const SingleTooth = memo(function SingleTooth({
  x,
  y,
  width,
  height,
  color,
  gradientId,
  variant = 'normal',
}: SingleToothProps) {
  if (variant === 'missing' || variant === 'gap') {
    return null;
  }

  const toothHeight = variant === 'chipped' ? height * 0.7 : height;
  const fillColor = variant === 'gold' ? GOLD_COLOR : variant === 'silver' ? SILVER_COLOR : `url(#${gradientId})`;

  return (
    <G>
      <Rect
        x={x}
        y={y}
        width={width}
        height={toothHeight}
        rx={0.8}
        fill={fillColor}
        stroke={adjustBrightness(color, -20)}
        strokeWidth={0.2}
      />
      {/* Tooth enamel highlight */}
      <Rect
        x={x + 0.3}
        y={y + 0.3}
        width={width * 0.4}
        height={toothHeight * 0.5}
        rx={0.3}
        fill="#ffffff"
        opacity={0.15}
      />
      {/* Subtle tooth line suggestion - hint at individual teeth */}
      <Path
        d={`M${x + width},${y + 0.5} L${x + width},${y + toothHeight - 0.5}`}
        stroke={adjustBrightness(color, -15)}
        strokeWidth={0.15}
        opacity={0.3}
      />
    </G>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Teeth = memo(function Teeth({
  style = TeethStyle.DEFAULT,
  color = DEFAULT_TEETH_COLOR,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  show = 'upper',
}: TeethProps) {
  const ids = useGradientIds<TeethGradientIds>(['teethGrad', 'grillzGrad', 'bracesGrad']);

  const teethHighlight = adjustBrightness(color, 15);
  const teethShadow = adjustBrightness(color, -15);

  // Base tooth dimensions - reduced width to match smaller mouth
  const toothWidth = 1.9; // reduced from 2.2
  const toothHeight = 3;
  const toothGap = 0.25; // slightly reduced gap
  const startX = 50 - (toothWidth * 3 + toothGap * 2.5) + offsetX;
  const upperY = 62 + offsetY;
  const lowerY = 67 + offsetY;

  // Determine tooth variants based on style
  const getToothVariant = (index: number, isUpper: boolean): SingleToothProps['variant'] => {
    switch (style) {
      case TeethStyle.GAP_FRONT:
        if (index === 2 || index === 3) return 'gap';
        return 'normal';
      case TeethStyle.GAP_MULTIPLE:
        if (index % 2 === 0) return 'gap';
        return 'normal';
      case TeethStyle.MISSING_FRONT:
        if (index === 2 || index === 3) return 'missing';
        return 'normal';
      case TeethStyle.MISSING_SIDE:
        if (index === 0 || index === 5) return 'missing';
        return 'normal';
      case TeethStyle.CHIPPED:
        if (index === 2) return 'chipped';
        return 'normal';
      case TeethStyle.GOLD_TOOTH:
        if (index === 2) return 'gold';
        return 'normal';
      case TeethStyle.GOLD_TEETH_MULTIPLE:
        if (index === 1 || index === 2 || index === 3 || index === 4) return 'gold';
        return 'normal';
      case TeethStyle.SILVER_TOOTH:
        if (index === 2) return 'silver';
        return 'normal';
      default:
        return 'normal';
    }
  };

  // Render upper teeth row
  const renderUpperTeeth = () => {
    if (show === 'lower') return null;

    const teeth = [];
    for (let i = 0; i < 6; i++) {
      const variant = getToothVariant(i, true);
      const x = startX + i * (toothWidth + toothGap);

      // Add gap space for GAP styles
      const gapOffset = (style === TeethStyle.GAP_FRONT && (i === 2 || i === 3)) ? 0.5 : 0;

      teeth.push(
        <SingleTooth
          key={`upper-${i}`}
          x={x + (i >= 3 ? gapOffset : 0)}
          y={upperY}
          width={toothWidth}
          height={toothHeight}
          color={color}
          gradientId={ids.teethGrad}
          variant={variant}
        />
      );
    }
    return <G>{teeth}</G>;
  };

  // Render lower teeth row
  const renderLowerTeeth = () => {
    if (show === 'upper') return null;

    const teeth = [];
    for (let i = 0; i < 6; i++) {
      const variant = getToothVariant(i, false);
      const x = startX + i * (toothWidth + toothGap);

      teeth.push(
        <SingleTooth
          key={`lower-${i}`}
          x={x}
          y={lowerY}
          width={toothWidth * 0.9}
          height={toothHeight * 0.8}
          color={color}
          gradientId={ids.teethGrad}
          variant={variant}
        />
      );
    }
    return <G>{teeth}</G>;
  };

  // Render braces overlay
  const renderBraces = () => {
    if (![TeethStyle.BRACES_METAL, TeethStyle.BRACES_CERAMIC].includes(style)) {
      return null;
    }

    const bracesColor = style === TeethStyle.BRACES_CERAMIC ? '#f0f0f0' : BRACES_METAL_COLOR;
    const wireColor = style === TeethStyle.BRACES_CERAMIC ? '#e0e0e0' : '#808080';

    return (
      <G>
        {/* Horizontal wire */}
        <Path
          d={`M ${startX - 1} ${upperY + toothHeight / 2} L ${startX + 6 * (toothWidth + toothGap)} ${upperY + toothHeight / 2}`}
          stroke={wireColor}
          strokeWidth={0.4}
          fill="none"
        />
        {/* Brackets */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect
            key={`bracket-${i}`}
            x={startX + i * (toothWidth + toothGap) + toothWidth / 2 - 0.6}
            y={upperY + toothHeight / 2 - 0.6}
            width={1.2}
            height={1.2}
            fill={bracesColor}
            stroke={adjustBrightness(bracesColor, -20)}
            strokeWidth={0.1}
          />
        ))}
      </G>
    );
  };

  // Render grillz overlay
  const renderGrillz = () => {
    if (![TeethStyle.GRILLZ, TeethStyle.GRILLZ_DIAMOND].includes(style)) {
      return null;
    }

    const grillzColor = color || GOLD_COLOR;

    return (
      <G>
        <Defs>
          <LinearGradient id={ids.grillzGrad} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={adjustBrightness(grillzColor, 40)} />
            <Stop offset="50%" stopColor={grillzColor} />
            <Stop offset="100%" stopColor={adjustBrightness(grillzColor, -30)} />
          </LinearGradient>
        </Defs>
        {/* Grillz overlay on each tooth */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <G key={`grillz-${i}`}>
            <Rect
              x={startX + i * (toothWidth + toothGap)}
              y={upperY}
              width={toothWidth}
              height={toothHeight}
              rx={0.3}
              fill={`url(#${ids.grillzGrad})`}
            />
            {style === TeethStyle.GRILLZ_DIAMOND && i === 2 && (
              <Circle
                cx={startX + i * (toothWidth + toothGap) + toothWidth / 2}
                cy={upperY + toothHeight / 2}
                r={0.8}
                fill="#b9f2ff"
                stroke="#ffffff"
                strokeWidth={0.2}
              />
            )}
          </G>
        ))}
      </G>
    );
  };

  // Render fangs
  const renderFangs = () => {
    if (![TeethStyle.FANGS, TeethStyle.VAMPIRE_FANGS].includes(style)) {
      return null;
    }

    const fangLength = style === TeethStyle.VAMPIRE_FANGS ? 5 : 3.5;

    return (
      <G>
        {/* Left fang */}
        <Path
          d={`M ${startX + toothWidth + toothGap - 0.5} ${upperY}
              L ${startX + toothWidth + toothGap + 0.5} ${upperY}
              L ${startX + toothWidth + toothGap} ${upperY + fangLength} Z`}
          fill={`url(#${ids.teethGrad})`}
          stroke={teethShadow}
          strokeWidth={0.2}
        />
        {/* Right fang */}
        <Path
          d={`M ${startX + 4 * (toothWidth + toothGap) - 0.5} ${upperY}
              L ${startX + 4 * (toothWidth + toothGap) + 0.5} ${upperY}
              L ${startX + 4 * (toothWidth + toothGap)} ${upperY + fangLength} Z`}
          fill={`url(#${ids.teethGrad})`}
          stroke={teethShadow}
          strokeWidth={0.2}
        />
      </G>
    );
  };

  return (
    <G transform={`scale(${scale})`}>
      <Defs>
        <LinearGradient id={ids.teethGrad} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={teethHighlight} />
          <Stop offset="30%" stopColor={color} />
          <Stop offset="100%" stopColor={teethShadow} />
        </LinearGradient>
      </Defs>

      {/* Gumline shadow - subtle gradient from gum pink to tooth area */}
      {show !== 'lower' && (
        <Path
          d={`M${startX - 0.5},${upperY} L${startX + 6 * (toothWidth + toothGap)},${upperY}`}
          stroke={GUM_COLOR}
          strokeWidth={0.6}
          opacity={0.4}
        />
      )}

      {/* Render appropriate teeth based on style */}
      {style === TeethStyle.GRILLZ || style === TeethStyle.GRILLZ_DIAMOND ? (
        renderGrillz()
      ) : (
        <>
          {renderUpperTeeth()}
          {/* Subtle tooth separation lines */}
          {show !== 'lower' && (
            <G opacity={0.15} stroke={teethShadow} strokeWidth={0.25}>
              <Path d={`M${startX + 2 * (toothWidth + toothGap)},${upperY + 0.5} L${startX + 2 * (toothWidth + toothGap)},${upperY + toothHeight - 0.5}`} />
              <Path d={`M${startX + 3 * (toothWidth + toothGap)},${upperY + 0.5} L${startX + 3 * (toothWidth + toothGap)},${upperY + toothHeight - 0.5}`} />
              <Path d={`M${startX + 4 * (toothWidth + toothGap)},${upperY + 0.5} L${startX + 4 * (toothWidth + toothGap)},${upperY + toothHeight - 0.5}`} />
            </G>
          )}
          {renderLowerTeeth()}
          {renderBraces()}
          {renderFangs()}
        </>
      )}
    </G>
  );
});

export default Teeth;
