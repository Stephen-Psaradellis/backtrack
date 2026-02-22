/**
 * FaceDetails Component - Renders freckles, wrinkles, dimples, eye bags, and skin details
 */

import React from 'react';
import { G, Circle, Path, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { FreckleStyle, WrinkleStyle, CheekStyle, SkinDetail, EyeBagsStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

type FaceDetailsGradientIds = {
  eyeBagLeft: string;
  eyeBagRight: string;
};

interface FaceDetailsProps {
  skinTone: string;
  freckles?: FreckleStyle;
  wrinkles?: WrinkleStyle;
  cheekStyle?: CheekStyle;
  skinDetail?: SkinDetail;
  eyeBags?: EyeBagsStyle;
}

// Freckle positions - randomized but consistent layout
const FRECKLE_POSITIONS = {
  full: [
    // Nose bridge
    { x: 48, y: 52, r: 0.6 },
    { x: 52, y: 51, r: 0.5 },
    { x: 50, y: 54, r: 0.5 },
    // Left cheek
    { x: 35, y: 50, r: 0.7 },
    { x: 33, y: 52, r: 0.5 },
    { x: 37, y: 54, r: 0.6 },
    { x: 34, y: 56, r: 0.5 },
    { x: 38, y: 51, r: 0.4 },
    { x: 32, y: 54, r: 0.5 },
    // Right cheek
    { x: 65, y: 50, r: 0.7 },
    { x: 67, y: 52, r: 0.5 },
    { x: 63, y: 54, r: 0.6 },
    { x: 66, y: 56, r: 0.5 },
    { x: 62, y: 51, r: 0.4 },
    { x: 68, y: 54, r: 0.5 },
  ],
  noseOnly: [
    { x: 48, y: 52, r: 0.6 },
    { x: 52, y: 51, r: 0.5 },
    { x: 50, y: 54, r: 0.5 },
    { x: 49, y: 50, r: 0.4 },
    { x: 51, y: 53, r: 0.5 },
  ],
  cheeksOnly: [
    { x: 35, y: 50, r: 0.7 },
    { x: 33, y: 52, r: 0.5 },
    { x: 37, y: 54, r: 0.6 },
    { x: 65, y: 50, r: 0.7 },
    { x: 67, y: 52, r: 0.5 },
    { x: 63, y: 54, r: 0.6 },
  ],
};

function Freckles({ style, color }: { style: FreckleStyle; color: string }) {
  if (style === FreckleStyle.NONE) return null;

  let positions = FRECKLE_POSITIONS.full;
  let opacity = 0.3;

  switch (style) {
    case FreckleStyle.LIGHT:
      opacity = 0.2;
      positions = FRECKLE_POSITIONS.full.slice(0, 8);
      break;
    case FreckleStyle.MEDIUM:
      opacity = 0.3;
      positions = FRECKLE_POSITIONS.full.slice(0, 12);
      break;
    case FreckleStyle.HEAVY:
      opacity = 0.4;
      positions = FRECKLE_POSITIONS.full;
      break;
    case FreckleStyle.NOSE_ONLY:
      opacity = 0.35;
      positions = FRECKLE_POSITIONS.noseOnly;
      break;
    case FreckleStyle.CHEEKS_ONLY:
      opacity = 0.3;
      positions = FRECKLE_POSITIONS.cheeksOnly;
      break;
  }

  return (
    <G>
      {positions.map((pos, i) => (
        <Circle
          key={`freckle-${i}`}
          cx={pos.x}
          cy={pos.y}
          r={pos.r}
          fill={color}
          opacity={opacity + ((i % 5) * 0.02 - 0.04)}
        />
      ))}
    </G>
  );
}

function Wrinkles({ style, color }: { style: WrinkleStyle; color: string }) {
  if (style === WrinkleStyle.NONE) return null;

  // Determine opacity based on intensity
  const isLight = style.includes('LIGHT');
  const isDeep = style.includes('DEEP');
  const isHeavy = style === WrinkleStyle.FULL_HEAVY || style === WrinkleStyle.MATURE;
  const baseOpacity = isLight ? 0.08 : isDeep || isHeavy ? 0.18 : 0.12;
  const strokeMultiplier = isDeep || isHeavy ? 1.3 : 1;

  // Check which wrinkle types to show
  const showForehead = style.includes('FOREHEAD') || style.includes('FULL') || style === WrinkleStyle.MATURE;
  const showCrowFeet = style.includes('CROW_FEET') || style.includes('FULL') || style === WrinkleStyle.MATURE;
  const showSmileLines = style.includes('SMILE_LINES') || style.includes('FULL') || style === WrinkleStyle.MATURE;
  const showUnderEye = style.includes('UNDER_EYE') || style.includes('FULL') || style === WrinkleStyle.MATURE;

  return (
    <G>
      {/* Forehead lines */}
      {showForehead && (
        <G>
          <Path
            d="M38,28 Q50,26 62,28"
            stroke={color}
            strokeWidth={0.4 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity}
          />
          <Path
            d="M40,31 Q50,29 60,31"
            stroke={color}
            strokeWidth={0.3 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity * 0.8}
          />
          {!isLight && (
            <Path
              d="M42,34 Q50,32 58,34"
              stroke={color}
              strokeWidth={0.25 * strokeMultiplier}
              fill="none"
              opacity={baseOpacity * 0.6}
            />
          )}
          {(isDeep || isHeavy) && (
            <Path
              d="M44,37 Q50,35 56,37"
              stroke={color}
              strokeWidth={0.2 * strokeMultiplier}
              fill="none"
              opacity={baseOpacity * 0.5}
            />
          )}
        </G>
      )}

      {/* Crow's feet */}
      {showCrowFeet && (
        <G>
          {/* Left crow's feet */}
          <Path
            d="M26,42 Q28,44 25,46"
            stroke={color}
            strokeWidth={0.3 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity}
          />
          <Path
            d="M25,43 Q27,45 24,47"
            stroke={color}
            strokeWidth={0.25 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity * 0.8}
          />
          {(isDeep || isHeavy) && (
            <Path
              d="M24,44 Q26,46 23,48"
              stroke={color}
              strokeWidth={0.2 * strokeMultiplier}
              fill="none"
              opacity={baseOpacity * 0.6}
            />
          )}
          {/* Right crow's feet */}
          <Path
            d="M74,42 Q72,44 75,46"
            stroke={color}
            strokeWidth={0.3 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity}
          />
          <Path
            d="M75,43 Q73,45 76,47"
            stroke={color}
            strokeWidth={0.25 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity * 0.8}
          />
          {(isDeep || isHeavy) && (
            <Path
              d="M76,44 Q74,46 77,48"
              stroke={color}
              strokeWidth={0.2 * strokeMultiplier}
              fill="none"
              opacity={baseOpacity * 0.6}
            />
          )}
        </G>
      )}

      {/* Smile lines (nasolabial folds) */}
      {showSmileLines && (
        <G>
          <Path
            d="M38,56 Q36,62 40,68"
            stroke={color}
            strokeWidth={0.35 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity}
          />
          <Path
            d="M62,56 Q64,62 60,68"
            stroke={color}
            strokeWidth={0.35 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity}
          />
          {(isDeep || isHeavy) && (
            <G>
              <Path
                d="M37,58 Q35,64 39,70"
                stroke={color}
                strokeWidth={0.2 * strokeMultiplier}
                fill="none"
                opacity={baseOpacity * 0.5}
              />
              <Path
                d="M63,58 Q65,64 61,70"
                stroke={color}
                strokeWidth={0.2 * strokeMultiplier}
                fill="none"
                opacity={baseOpacity * 0.5}
              />
            </G>
          )}
        </G>
      )}

      {/* Under-eye lines */}
      {showUnderEye && (
        <G>
          <Path
            d="M32,48 Q36,49 40,48"
            stroke={color}
            strokeWidth={0.25 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity * 0.7}
          />
          <Path
            d="M60,48 Q64,49 68,48"
            stroke={color}
            strokeWidth={0.25 * strokeMultiplier}
            fill="none"
            opacity={baseOpacity * 0.7}
          />
          {(isDeep || isHeavy) && (
            <G>
              <Path
                d="M33,49 Q36,50 39,49"
                stroke={color}
                strokeWidth={0.2 * strokeMultiplier}
                fill="none"
                opacity={baseOpacity * 0.5}
              />
              <Path
                d="M61,49 Q64,50 67,49"
                stroke={color}
                strokeWidth={0.2 * strokeMultiplier}
                fill="none"
                opacity={baseOpacity * 0.5}
              />
            </G>
          )}
        </G>
      )}

      {/* Marionette lines (mature face) */}
      {isHeavy && (
        <G>
          <Path
            d="M40,68 Q38,72 40,76"
            stroke={color}
            strokeWidth={0.25}
            fill="none"
            opacity={baseOpacity * 0.6}
          />
          <Path
            d="M60,68 Q62,72 60,76"
            stroke={color}
            strokeWidth={0.25}
            fill="none"
            opacity={baseOpacity * 0.6}
          />
        </G>
      )}
    </G>
  );
}

function Cheeks({ style, skinTone }: { style: CheekStyle; skinTone: string }) {
  if (style === CheekStyle.NONE) return null;

  const shadowColor = adjustBrightness(skinTone, -30);
  const highlightColor = adjustBrightness(skinTone, 25);

  return (
    <G>
      {style === CheekStyle.DIMPLES && (
        <G>
          {/* Left dimple */}
          <Ellipse
            cx={36}
            cy={58}
            rx={1.5}
            ry={2}
            fill={shadowColor}
            opacity={0.2}
          />
          {/* Right dimple */}
          <Ellipse
            cx={64}
            cy={58}
            rx={1.5}
            ry={2}
            fill={shadowColor}
            opacity={0.2}
          />
        </G>
      )}

      {style === CheekStyle.HIGH_CHEEKBONES && (
        <G>
          {/* Left cheekbone highlight */}
          <Ellipse
            cx={34}
            cy={50}
            rx={6}
            ry={3}
            fill={highlightColor}
            opacity={0.25}
          />
          {/* Right cheekbone highlight */}
          <Ellipse
            cx={66}
            cy={50}
            rx={6}
            ry={3}
            fill={highlightColor}
            opacity={0.25}
          />
          {/* Subtle contour shadow below */}
          <Path
            d="M28,54 Q34,56 40,54"
            fill={shadowColor}
            opacity={0.1}
          />
          <Path
            d="M60,54 Q66,56 72,54"
            fill={shadowColor}
            opacity={0.1}
          />
        </G>
      )}

      {style === CheekStyle.ROUND && (
        <G>
          {/* Left round cheek */}
          <Ellipse
            cx={35}
            cy={54}
            rx={7}
            ry={5}
            fill={highlightColor}
            opacity={0.15}
          />
          {/* Right round cheek */}
          <Ellipse
            cx={65}
            cy={54}
            rx={7}
            ry={5}
            fill={highlightColor}
            opacity={0.15}
          />
        </G>
      )}

      {style === CheekStyle.HOLLOW && (
        <G>
          {/* Left hollow shadow */}
          <Path
            d="M28,52 Q32,58 36,62"
            stroke={shadowColor}
            strokeWidth={3}
            fill="none"
            opacity={0.12}
          />
          {/* Right hollow shadow */}
          <Path
            d="M72,52 Q68,58 64,62"
            stroke={shadowColor}
            strokeWidth={3}
            fill="none"
            opacity={0.12}
          />
        </G>
      )}
    </G>
  );
}

function EyeBags({ style, skinTone, gradientIdLeft, gradientIdRight }: { style: EyeBagsStyle; skinTone: string; gradientIdLeft: string; gradientIdRight: string }) {
  if (style === EyeBagsStyle.NONE) return null;

  const shadowColor = adjustBrightness(skinTone, -35);
  const darkCircleColor = '#8b7b8b'; // Purplish undertone for dark circles

  // Determine intensity
  const isLight = style === EyeBagsStyle.LIGHT;
  const isModerate = style === EyeBagsStyle.MODERATE;
  const isHeavy = style === EyeBagsStyle.HEAVY;
  const isDarkCircles = style === EyeBagsStyle.DARK_CIRCLES;
  const isPuffy = style === EyeBagsStyle.PUFFY;

  const baseOpacity = isLight ? 0.1 : isModerate ? 0.18 : isHeavy ? 0.25 : 0.2;
  const bagColor = isDarkCircles ? darkCircleColor : shadowColor;

  return (
    <G>
      <Defs>
        <RadialGradient id={gradientIdLeft} cx="50%" cy="30%" rx="100%" ry="100%">
          <Stop offset="0%" stopColor={bagColor} stopOpacity={baseOpacity} />
          <Stop offset="100%" stopColor={bagColor} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={gradientIdRight} cx="50%" cy="30%" rx="100%" ry="100%">
          <Stop offset="0%" stopColor={bagColor} stopOpacity={baseOpacity} />
          <Stop offset="100%" stopColor={bagColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Left eye bag */}
      <Ellipse
        cx={38}
        cy={isPuffy ? 49 : 50}
        rx={isPuffy ? 7 : 6}
        ry={isPuffy ? 4 : 3}
        fill={`url(#${gradientIdLeft})`}
      />
      {/* Right eye bag */}
      <Ellipse
        cx={62}
        cy={isPuffy ? 49 : 50}
        rx={isPuffy ? 7 : 6}
        ry={isPuffy ? 4 : 3}
        fill={`url(#${gradientIdRight})`}
      />

      {/* Crease line for moderate/heavy */}
      {(isModerate || isHeavy) && (
        <G>
          <Path
            d="M32,49 Q38,51 44,49"
            stroke={shadowColor}
            strokeWidth={0.3}
            fill="none"
            opacity={baseOpacity * 0.6}
          />
          <Path
            d="M56,49 Q62,51 68,49"
            stroke={shadowColor}
            strokeWidth={0.3}
            fill="none"
            opacity={baseOpacity * 0.6}
          />
        </G>
      )}

      {/* Extra puffiness highlight */}
      {isPuffy && (
        <G>
          <Ellipse
            cx={38}
            cy={48}
            rx={5}
            ry={2}
            fill={adjustBrightness(skinTone, 15)}
            opacity={0.15}
          />
          <Ellipse
            cx={62}
            cy={48}
            rx={5}
            ry={2}
            fill={adjustBrightness(skinTone, 15)}
            opacity={0.15}
          />
        </G>
      )}
    </G>
  );
}

function SkinDetails({ detail, skinTone }: { detail: SkinDetail; skinTone: string }) {
  if (detail === SkinDetail.NONE) return null;

  const moleColor = adjustBrightness(skinTone, -50);
  const scarColor = adjustBrightness(skinTone, -15);
  const birthmarkColor = adjustBrightness(skinTone, -20);
  const vitiligoColor = adjustBrightness(skinTone, 40);
  const rosaceaColor = '#d68080'; // Reddish tint

  return (
    <G>
      {/* ============ EXISTING MOLES ============ */}
      {detail === SkinDetail.MOLE_LEFT_CHEEK && (
        <Circle cx={34} cy={56} r={1} fill={moleColor} opacity={0.6} />
      )}

      {detail === SkinDetail.MOLE_RIGHT_CHEEK && (
        <Circle cx={66} cy={56} r={1} fill={moleColor} opacity={0.6} />
      )}

      {detail === SkinDetail.MOLE_CHIN && (
        <Circle cx={52} cy={72} r={1} fill={moleColor} opacity={0.6} />
      )}

      {detail === SkinDetail.BEAUTY_MARK && (
        <Circle cx={64} cy={52} r={0.8} fill={moleColor} opacity={0.7} />
      )}

      {/* ============ NEW MOLES ============ */}
      {detail === SkinDetail.MOLE_LIP && (
        <Circle cx={45} cy={65} r={1.2} fill={moleColor} opacity={0.6} />
      )}

      {detail === SkinDetail.MOLE_NOSE && (
        <Circle cx={48} cy={54} r={0.9} fill={moleColor} opacity={0.55} />
      )}

      {detail === SkinDetail.MOLE_FOREHEAD && (
        <Circle cx={42} cy={28} r={1} fill={moleColor} opacity={0.5} />
      )}

      {detail === SkinDetail.MOLE_TEMPLE && (
        <Circle cx={25} cy={38} r={0.9} fill={moleColor} opacity={0.55} />
      )}

      {detail === SkinDetail.MOLE_NECK && (
        <Circle cx={45} cy={82} r={1.1} fill={moleColor} opacity={0.5} />
      )}

      {detail === SkinDetail.BEAUTY_MARKS_MULTIPLE && (
        <G>
          <Circle cx={64} cy={52} r={0.7} fill={moleColor} opacity={0.65} />
          <Circle cx={36} cy={48} r={0.6} fill={moleColor} opacity={0.55} />
          <Circle cx={58} cy={62} r={0.5} fill={moleColor} opacity={0.5} />
          <Circle cx={42} cy={70} r={0.6} fill={moleColor} opacity={0.55} />
        </G>
      )}

      {/* ============ EXISTING SCARS ============ */}
      {detail === SkinDetail.SCAR_EYEBROW && (
        <G>
          <Path d="M34,36 L36,34 L38,36" stroke={scarColor} strokeWidth={0.5} fill="none" opacity={0.25} />
          <Path d="M34.5,35 L36,33.5 L37.5,35" stroke={skinTone} strokeWidth={0.3} fill="none" opacity={0.15} />
        </G>
      )}

      {detail === SkinDetail.SCAR_CHEEK && (
        <G>
          <Path d="M68,52 L72,56" stroke={scarColor} strokeWidth={0.5} fill="none" opacity={0.2} />
          <Path d="M68.5,52.5 L71.5,55.5" stroke={skinTone} strokeWidth={0.3} fill="none" opacity={0.1} />
        </G>
      )}

      {/* ============ NEW SCARS ============ */}
      {detail === SkinDetail.SCAR_FOREHEAD && (
        <G>
          <Path d="M42,30 L58,30" stroke={scarColor} strokeWidth={0.6} fill="none" opacity={0.2} />
          <Path d="M43,30 L57,30" stroke={skinTone} strokeWidth={0.3} fill="none" opacity={0.1} />
        </G>
      )}

      {detail === SkinDetail.SCAR_CHIN && (
        <G>
          <Path d="M48,73 L52,75" stroke={scarColor} strokeWidth={0.5} fill="none" opacity={0.2} />
          <Path d="M48.5,73.5 L51.5,74.5" stroke={skinTone} strokeWidth={0.25} fill="none" opacity={0.1} />
        </G>
      )}

      {detail === SkinDetail.SCAR_LIP && (
        <G>
          <Path d="M48,63 L48,67" stroke={scarColor} strokeWidth={0.4} fill="none" opacity={0.22} />
          <Path d="M48.2,63.5 L48.2,66.5" stroke={skinTone} strokeWidth={0.2} fill="none" opacity={0.12} />
        </G>
      )}

      {detail === SkinDetail.SCAR_NOSE && (
        <G>
          <Path d="M46,50 L54,50" stroke={scarColor} strokeWidth={0.45} fill="none" opacity={0.18} />
          <Path d="M47,50 L53,50" stroke={skinTone} strokeWidth={0.2} fill="none" opacity={0.1} />
        </G>
      )}

      {detail === SkinDetail.SCAR_TEMPLE && (
        <G>
          <Path d="M24,40 L28,36" stroke={scarColor} strokeWidth={0.5} fill="none" opacity={0.2} />
          <Path d="M24.5,39.5 L27.5,36.5" stroke={skinTone} strokeWidth={0.25} fill="none" opacity={0.1} />
        </G>
      )}

      {detail === SkinDetail.SCAR_NECK && (
        <G>
          <Path d="M42,80 L48,82" stroke={scarColor} strokeWidth={0.5} fill="none" opacity={0.18} />
          <Path d="M42.5,80.5 L47.5,81.5" stroke={skinTone} strokeWidth={0.25} fill="none" opacity={0.1} />
        </G>
      )}

      {detail === SkinDetail.SCAR_LIGHTNING && (
        <G>
          <Path d="M38,26 L40,30 L36,34 L38,38" stroke={scarColor} strokeWidth={0.6} fill="none" opacity={0.25} />
          <Path d="M38.3,26.5 L40,30 L36.3,33.5 L38,37.5" stroke={skinTone} strokeWidth={0.3} fill="none" opacity={0.12} />
        </G>
      )}

      {detail === SkinDetail.SCAR_SURGICAL && (
        <G>
          {/* Main line */}
          <Path d="M60,48 L70,56" stroke={scarColor} strokeWidth={0.4} fill="none" opacity={0.2} />
          {/* Stitch marks */}
          <Path d="M62,48 L61,50 M64,50 L63,52 M66,52 L65,54 M68,54 L67,56" stroke={scarColor} strokeWidth={0.25} fill="none" opacity={0.15} />
        </G>
      )}

      {detail === SkinDetail.SCAR_BURNS && (
        <G>
          <Ellipse cx={68} cy={54} rx={5} ry={4} fill={scarColor} opacity={0.12} />
          <Path d="M65,52 Q68,53 70,52 M66,55 Q68,56 70,55" stroke={scarColor} strokeWidth={0.3} fill="none" opacity={0.15} />
        </G>
      )}

      {detail === SkinDetail.SCAR_ACNE && (
        <G>
          {/* Scattered small indented marks */}
          <Circle cx={35} cy={52} r={0.6} fill={scarColor} opacity={0.15} />
          <Circle cx={38} cy={55} r={0.5} fill={scarColor} opacity={0.12} />
          <Circle cx={33} cy={58} r={0.55} fill={scarColor} opacity={0.14} />
          <Circle cx={65} cy={53} r={0.6} fill={scarColor} opacity={0.15} />
          <Circle cx={68} cy={56} r={0.5} fill={scarColor} opacity={0.13} />
          <Circle cx={63} cy={59} r={0.55} fill={scarColor} opacity={0.14} />
          <Circle cx={45} cy={60} r={0.5} fill={scarColor} opacity={0.12} />
          <Circle cx={55} cy={58} r={0.5} fill={scarColor} opacity={0.12} />
        </G>
      )}

      {/* ============ BIRTHMARKS ============ */}
      {detail === SkinDetail.BIRTHMARK_CHEEK && (
        <Path d="M66,52 Q69,54 67,57 Q64,55 66,52" fill={birthmarkColor} opacity={0.25} />
      )}

      {detail === SkinDetail.BIRTHMARK_FOREHEAD && (
        <Path d="M55,28 Q58,26 60,29 Q57,31 55,28" fill={birthmarkColor} opacity={0.22} />
      )}

      {detail === SkinDetail.BIRTHMARK_CHIN && (
        <Path d="M48,72 Q50,74 52,72 Q51,70 48,72" fill={birthmarkColor} opacity={0.2} />
      )}

      {detail === SkinDetail.BIRTHMARK_NECK && (
        <Path d="M55,82 Q58,80 60,83 Q56,85 55,82" fill={birthmarkColor} opacity={0.2} />
      )}

      {detail === SkinDetail.BIRTHMARK_TEMPLE && (
        <Path d="M26,36 Q28,34 30,37 Q27,39 26,36" fill={birthmarkColor} opacity={0.22} />
      )}

      {detail === SkinDetail.BIRTHMARK_PORT_WINE && (
        <G>
          {/* Port wine stain - larger reddish patch */}
          <Path d="M28,42 Q35,38 40,45 Q38,52 32,54 Q26,50 28,42" fill="#a05050" opacity={0.2} />
          <Path d="M30,44 Q34,42 36,46 Q34,50 31,50 Q28,48 30,44" fill="#8b4040" opacity={0.15} />
        </G>
      )}

      {detail === SkinDetail.BIRTHMARK_CAFE_AU_LAIT && (
        <G>
          {/* Cafe-au-lait - light brown patch */}
          <Ellipse cx={65} cy={55} rx={6} ry={4} fill={adjustBrightness(skinTone, -15)} opacity={0.3} />
          <Ellipse cx={66} cy={56} rx={4} ry={2.5} fill={adjustBrightness(skinTone, -10)} opacity={0.2} />
        </G>
      )}

      {/* ============ SKIN CONDITIONS ============ */}
      {detail === SkinDetail.VITILIGO_FACE && (
        <G>
          {/* Depigmented patches across face */}
          <Path d="M30,45 Q38,42 42,50 Q38,58 30,55 Q28,50 30,45" fill={vitiligoColor} opacity={0.5} />
          <Path d="M55,48 Q62,44 68,50 Q64,58 56,56 Q52,52 55,48" fill={vitiligoColor} opacity={0.45} />
          <Path d="M45,60 Q50,58 55,62 Q52,68 46,66 Q43,64 45,60" fill={vitiligoColor} opacity={0.4} />
        </G>
      )}

      {detail === SkinDetail.VITILIGO_PATCHES && (
        <G>
          {/* Smaller scattered patches */}
          <Ellipse cx={34} cy={52} rx={4} ry={3} fill={vitiligoColor} opacity={0.45} />
          <Ellipse cx={66} cy={54} rx={3.5} ry={2.5} fill={vitiligoColor} opacity={0.4} />
          <Ellipse cx={50} cy={65} rx={3} ry={2} fill={vitiligoColor} opacity={0.35} />
        </G>
      )}

      {detail === SkinDetail.ROSACEA && (
        <G>
          {/* Redness on cheeks and nose */}
          <Ellipse cx={35} cy={52} rx={8} ry={6} fill={rosaceaColor} opacity={0.2} />
          <Ellipse cx={65} cy={52} rx={8} ry={6} fill={rosaceaColor} opacity={0.2} />
          <Ellipse cx={50} cy={54} rx={4} ry={5} fill={rosaceaColor} opacity={0.18} />
          {/* Subtle blood vessel hints */}
          <Path d="M32,50 Q34,52 32,54" stroke={rosaceaColor} strokeWidth={0.3} fill="none" opacity={0.2} />
          <Path d="M68,50 Q66,52 68,54" stroke={rosaceaColor} strokeWidth={0.3} fill="none" opacity={0.2} />
        </G>
      )}

      {detail === SkinDetail.ACNE_LIGHT && (
        <G>
          {/* Few small spots */}
          <Circle cx={36} cy={54} r={0.8} fill="#d08080" opacity={0.35} />
          <Circle cx={64} cy={52} r={0.7} fill="#d08080" opacity={0.3} />
          <Circle cx={48} cy={58} r={0.6} fill="#c87878" opacity={0.28} />
        </G>
      )}

      {detail === SkinDetail.ACNE_MODERATE && (
        <G>
          {/* More scattered spots */}
          <Circle cx={35} cy={52} r={0.9} fill="#d08080" opacity={0.4} />
          <Circle cx={38} cy={56} r={0.7} fill="#c87878" opacity={0.35} />
          <Circle cx={33} cy={58} r={0.6} fill="#d08080" opacity={0.32} />
          <Circle cx={65} cy={51} r={0.85} fill="#d08080" opacity={0.38} />
          <Circle cx={62} cy={55} r={0.7} fill="#c87878" opacity={0.35} />
          <Circle cx={68} cy={54} r={0.6} fill="#d08080" opacity={0.3} />
          <Circle cx={45} cy={60} r={0.7} fill="#c87878" opacity={0.32} />
          <Circle cx={55} cy={59} r={0.65} fill="#d08080" opacity={0.3} />
          <Circle cx={50} cy={56} r={0.55} fill="#c87878" opacity={0.28} />
        </G>
      )}
    </G>
  );
}

export function FaceDetails({
  skinTone,
  freckles = FreckleStyle.NONE,
  wrinkles = WrinkleStyle.NONE,
  cheekStyle = CheekStyle.NONE,
  skinDetail = SkinDetail.NONE,
  eyeBags = EyeBagsStyle.NONE,
}: FaceDetailsProps) {
  const freckleColor = adjustBrightness(skinTone, -40);
  const wrinkleColor = adjustBrightness(skinTone, -25);

  // Use stable gradient IDs for consistent rendering
  const ids = useGradientIds<FaceDetailsGradientIds>(['eyeBagLeft', 'eyeBagRight']);

  return (
    <G>
      <Cheeks style={cheekStyle} skinTone={skinTone} />
      <Freckles style={freckles} color={freckleColor} />
      <Wrinkles style={wrinkles} color={wrinkleColor} />
      <EyeBags style={eyeBags} skinTone={skinTone} gradientIdLeft={ids.eyeBagLeft} gradientIdRight={ids.eyeBagRight} />
      <SkinDetails detail={skinDetail} skinTone={skinTone} />
    </G>
  );
}

export default FaceDetails;
