/**
 * Hair Component - Multiple hair styles with color
 *
 * Renders different hair styles from short buzz cuts to long flowing hair,
 * including special styles like afro, mohawk, and headwear options.
 */

import React from 'react';
import { G, Path, Ellipse, Rect, Circle } from 'react-native-svg';
import { HairStyle, SvgPartProps } from '../types';

interface HairProps extends SvgPartProps {
  style: HairStyle;
  hairColor: string;
}

/**
 * Adjust color brightness for highlights/shadows
 */
function adjustBrightness(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function Hair({ style, hairColor, scale = 1 }: HairProps) {
  const highlight = adjustBrightness(hairColor, 25);
  const shadow = adjustBrightness(hairColor, -20);

  return (
    <G transform={`scale(${scale})`}>
      {(() => {
        switch (style) {
          case HairStyle.BALD:
            // No hair rendered
            return null;

          case HairStyle.SHAVED:
            return (
              <G>
                {/* Very short stubble effect */}
                <Path
                  d="M25,30 Q25,12 50,10 Q75,12 75,30 Q75,35 70,38 L30,38 Q25,35 25,30 Z"
                  fill={hairColor}
                  opacity={0.3}
                />
              </G>
            );

          case HairStyle.SHORT_BUZZ:
            return (
              <G>
                <Path
                  d="M25,32 Q25,14 50,12 Q75,14 75,32 Q75,36 72,38 L65,28 Q50,22 35,28 L28,38 Q25,36 25,32 Z"
                  fill={hairColor}
                />
              </G>
            );

          case HairStyle.SHORT_CREW:
            return (
              <G>
                <Path
                  d="M24,34 Q24,12 50,10 Q76,12 76,34 Q76,38 72,40 L68,26 Q50,18 32,26 L28,40 Q24,38 24,34 Z"
                  fill={hairColor}
                />
                {/* Top highlight */}
                <Path
                  d="M30,28 Q50,18 70,28 Q50,22 30,28 Z"
                  fill={highlight}
                  opacity={0.3}
                />
              </G>
            );

          case HairStyle.SHORT_SLICK:
            return (
              <G>
                <Path
                  d="M24,35 Q24,14 50,10 Q76,14 76,35 L72,28 Q50,20 28,28 Z"
                  fill={hairColor}
                />
                {/* Slicked back lines */}
                <Path
                  d="M35,22 Q45,18 55,22 M32,26 Q45,20 58,26"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={1}
                  opacity={0.4}
                />
              </G>
            );

          case HairStyle.SHORT_SPIKY:
            return (
              <G>
                <Path
                  d="M28,35 L32,8 L38,28 L45,5 L50,25 L55,6 L62,28 L68,10 L72,35 Q50,30 28,35 Z"
                  fill={hairColor}
                />
                {/* Spike highlights */}
                <Path
                  d="M34,15 L38,28 M47,12 L50,25 M63,18 L62,28"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
              </G>
            );

          case HairStyle.SHORT_CURLY:
            return (
              <G>
                {/* Base curly shape */}
                <Path
                  d="M22,36 Q20,25 25,18 Q28,12 35,10 Q45,6 55,10 Q65,8 72,18 Q78,25 76,36
                     Q72,32 68,34 Q65,28 60,30 Q55,24 50,28 Q45,24 40,30 Q35,28 32,34 Q28,32 22,36 Z"
                  fill={hairColor}
                />
                {/* Curl details */}
                <Circle cx="30" cy="22" r="4" fill={hairColor} />
                <Circle cx="40" cy="18" r="4" fill={hairColor} />
                <Circle cx="50" cy="16" r="4" fill={hairColor} />
                <Circle cx="60" cy="18" r="4" fill={hairColor} />
                <Circle cx="70" cy="22" r="4" fill={hairColor} />
                {/* Highlights */}
                <Circle cx="32" cy="20" r="1.5" fill={highlight} opacity={0.4} />
                <Circle cx="50" cy="14" r="1.5" fill={highlight} opacity={0.4} />
                <Circle cx="68" cy="20" r="1.5" fill={highlight} opacity={0.4} />
              </G>
            );

          case HairStyle.SHORT_WAVY:
            return (
              <G>
                <Path
                  d="M24,36 Q22,20 30,14 Q40,8 50,10 Q60,8 70,14 Q78,20 76,36
                     Q70,32 65,35 Q55,28 50,32 Q45,28 35,35 Q30,32 24,36 Z"
                  fill={hairColor}
                />
                {/* Wave details */}
                <Path
                  d="M30,25 Q40,20 50,24 Q60,20 70,25"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={2}
                  opacity={0.3}
                />
              </G>
            );

          case HairStyle.SHORT_SIDE_PART:
            return (
              <G>
                <Path
                  d="M24,35 Q24,14 50,10 Q76,14 76,35 L72,28 Q50,20 28,28 Z"
                  fill={hairColor}
                />
                {/* Part line */}
                <Path
                  d="M35,14 L35,32"
                  fill="none"
                  stroke={shadow}
                  strokeWidth={1.5}
                />
                {/* Side swept effect */}
                <Path
                  d="M35,14 Q55,12 72,20"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={1.5}
                  opacity={0.3}
                />
              </G>
            );

          case HairStyle.SHORT_POMPADOUR:
            return (
              <G>
                <Path
                  d="M24,38 Q24,18 50,14 Q76,18 76,38 L72,32 Q50,25 28,32 Z"
                  fill={hairColor}
                />
                {/* Pompadour volume on top */}
                <Path
                  d="M30,28 Q35,5 50,2 Q65,5 70,28 Q50,22 30,28 Z"
                  fill={hairColor}
                />
                <Path
                  d="M38,18 Q50,8 62,18"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={2}
                  opacity={0.4}
                />
              </G>
            );

          case HairStyle.MEDIUM_MESSY:
            return (
              <G>
                <Path
                  d="M20,42 Q18,25 25,16 Q35,6 50,8 Q65,6 75,16 Q82,25 80,42
                     L75,38 Q70,30 65,38 Q58,32 50,36 Q42,32 35,38 Q30,30 25,38 Z"
                  fill={hairColor}
                />
                {/* Messy strands */}
                <Path
                  d="M25,20 L22,12 M35,15 L33,6 M50,14 L50,4 M65,15 L67,6 M75,20 L78,12"
                  fill="none"
                  stroke={hairColor}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </G>
            );

          case HairStyle.MEDIUM_STRAIGHT:
            return (
              <G>
                <Path
                  d="M20,45 Q18,22 30,14 Q42,8 50,10 Q58,8 70,14 Q82,22 80,45
                     L78,40 L75,32 L70,38 L65,32 L60,36 L55,32 L50,35 L45,32 L40,36 L35,32 L30,38 L25,32 L22,40 Z"
                  fill={hairColor}
                />
              </G>
            );

          case HairStyle.MEDIUM_CURLY:
            return (
              <G>
                {/* Volume */}
                <Ellipse cx="50" cy="25" rx="32" ry="22" fill={hairColor} />
                {/* Curls */}
                <Circle cx="25" cy="30" r="6" fill={hairColor} />
                <Circle cx="75" cy="30" r="6" fill={hairColor} />
                <Circle cx="30" cy="18" r="5" fill={hairColor} />
                <Circle cx="70" cy="18" r="5" fill={hairColor} />
                <Circle cx="40" cy="12" r="5" fill={hairColor} />
                <Circle cx="60" cy="12" r="5" fill={hairColor} />
                <Circle cx="50" cy="10" r="5" fill={hairColor} />
                {/* Side curls */}
                <Circle cx="22" cy="42" r="5" fill={hairColor} />
                <Circle cx="78" cy="42" r="5" fill={hairColor} />
                {/* Highlights */}
                <Circle cx="40" cy="10" r="2" fill={highlight} opacity={0.3} />
                <Circle cx="60" cy="10" r="2" fill={highlight} opacity={0.3} />
              </G>
            );

          case HairStyle.LONG_STRAIGHT:
            return (
              <G>
                {/* Back hair */}
                <Path
                  d="M15,40 L15,90 Q15,95 25,95 L75,95 Q85,95 85,90 L85,40 Q85,15 50,10 Q15,15 15,40 Z"
                  fill={hairColor}
                />
                {/* Front/top hair */}
                <Path
                  d="M22,38 Q20,18 50,12 Q80,18 78,38 L75,32 L65,36 L55,32 L50,34 L45,32 L35,36 L25,32 Z"
                  fill={hairColor}
                />
                {/* Shine */}
                <Path
                  d="M35,45 L35,85 M45,42 L45,88 M55,42 L55,88 M65,45 L65,85"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={2}
                  opacity={0.2}
                />
              </G>
            );

          case HairStyle.LONG_WAVY:
            return (
              <G>
                {/* Back wavy hair */}
                <Path
                  d="M15,40 Q12,55 18,70 Q15,85 25,95 L75,95 Q85,85 82,70 Q88,55 85,40
                     Q85,15 50,10 Q15,15 15,40 Z"
                  fill={hairColor}
                />
                {/* Front hair */}
                <Path
                  d="M22,40 Q20,18 50,12 Q80,18 78,40 L75,34 Q65,28 50,32 Q35,28 25,34 Z"
                  fill={hairColor}
                />
                {/* Wave lines */}
                <Path
                  d="M20,50 Q25,55 20,65 Q25,75 22,85
                     M80,50 Q75,55 80,65 Q75,75 78,85"
                  fill="none"
                  stroke={shadow}
                  strokeWidth={2}
                  opacity={0.3}
                />
              </G>
            );

          case HairStyle.LONG_CURLY:
            return (
              <G>
                {/* Base volume */}
                <Ellipse cx="50" cy="55" rx="40" ry="45" fill={hairColor} />
                {/* Top curls */}
                <Circle cx="25" cy="25" r="8" fill={hairColor} />
                <Circle cx="75" cy="25" r="8" fill={hairColor} />
                <Circle cx="35" cy="15" r="7" fill={hairColor} />
                <Circle cx="65" cy="15" r="7" fill={hairColor} />
                <Circle cx="50" cy="12" r="8" fill={hairColor} />
                {/* Side curls */}
                <Circle cx="12" cy="45" r="7" fill={hairColor} />
                <Circle cx="88" cy="45" r="7" fill={hairColor} />
                <Circle cx="15" cy="60" r="6" fill={hairColor} />
                <Circle cx="85" cy="60" r="6" fill={hairColor} />
                <Circle cx="18" cy="75" r="5" fill={hairColor} />
                <Circle cx="82" cy="75" r="5" fill={hairColor} />
                {/* Face frame */}
                <Path
                  d="M22,40 Q20,20 50,14 Q80,20 78,40"
                  fill={hairColor}
                />
              </G>
            );

          case HairStyle.LONG_PONYTAIL:
            return (
              <G>
                {/* Main ponytail behind */}
                <Path
                  d="M45,20 Q40,35 42,95 L58,95 Q60,35 55,20"
                  fill={hairColor}
                />
                {/* Hair tie */}
                <Ellipse cx="50" cy="22" rx="6" ry="3" fill={shadow} />
                {/* Front hair */}
                <Path
                  d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,30 Q50,22 28,30 Z"
                  fill={hairColor}
                />
                {/* Ponytail highlights */}
                <Path
                  d="M48,30 L48,90 M52,30 L52,90"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={1.5}
                  opacity={0.3}
                />
              </G>
            );

          case HairStyle.LONG_BUN:
            return (
              <G>
                {/* Front hair */}
                <Path
                  d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,30 Q50,22 28,30 Z"
                  fill={hairColor}
                />
                {/* Bun on top */}
                <Circle cx="50" cy="8" r="10" fill={hairColor} />
                {/* Bun detail */}
                <Path
                  d="M42,8 Q50,2 58,8"
                  fill="none"
                  stroke={shadow}
                  strokeWidth={1.5}
                />
                <Circle cx="50" cy="6" r="3" fill={highlight} opacity={0.3} />
              </G>
            );

          case HairStyle.LONG_BRAIDS:
            return (
              <G>
                {/* Front hair */}
                <Path
                  d="M24,38 Q22,16 50,12 Q78,16 76,38 L72,30 Q50,22 28,30 Z"
                  fill={hairColor}
                />
                {/* Left braid */}
                <Path
                  d="M20,40 Q15,50 20,60 Q15,70 20,80 Q15,90 22,95"
                  fill="none"
                  stroke={hairColor}
                  strokeWidth={8}
                  strokeLinecap="round"
                />
                {/* Right braid */}
                <Path
                  d="M80,40 Q85,50 80,60 Q85,70 80,80 Q85,90 78,95"
                  fill="none"
                  stroke={hairColor}
                  strokeWidth={8}
                  strokeLinecap="round"
                />
                {/* Braid details */}
                <Path
                  d="M18,45 L22,48 M18,55 L22,58 M18,65 L22,68 M18,75 L22,78 M18,85 L22,88"
                  fill="none"
                  stroke={shadow}
                  strokeWidth={1}
                />
                <Path
                  d="M82,45 L78,48 M82,55 L78,58 M82,65 L78,68 M82,75 L78,78 M82,85 L78,88"
                  fill="none"
                  stroke={shadow}
                  strokeWidth={1}
                />
              </G>
            );

          case HairStyle.AFRO:
            return (
              <G>
                {/* Large afro shape */}
                <Ellipse cx="50" cy="35" rx="42" ry="35" fill={hairColor} />
                {/* Texture circles */}
                <Circle cx="20" cy="30" r="8" fill={hairColor} />
                <Circle cx="80" cy="30" r="8" fill={hairColor} />
                <Circle cx="15" cy="45" r="6" fill={hairColor} />
                <Circle cx="85" cy="45" r="6" fill={hairColor} />
                <Circle cx="30" cy="10" r="7" fill={hairColor} />
                <Circle cx="70" cy="10" r="7" fill={hairColor} />
                <Circle cx="50" cy="5" r="8" fill={hairColor} />
                {/* Face cutout overlay effect */}
                <Path
                  d="M28,42 Q30,35 40,35 L60,35 Q70,35 72,42 L72,55 Q72,70 50,75 Q28,70 28,55 Z"
                  fill="none"
                />
              </G>
            );

          case HairStyle.MOHAWK:
            return (
              <G>
                {/* Shaved sides */}
                <Path
                  d="M25,35 Q25,20 35,20 L35,45 L25,45 Q25,40 25,35 Z"
                  fill={hairColor}
                  opacity={0.2}
                />
                <Path
                  d="M75,35 Q75,20 65,20 L65,45 L75,45 Q75,40 75,35 Z"
                  fill={hairColor}
                  opacity={0.2}
                />
                {/* Mohawk strip */}
                <Path
                  d="M40,45 L38,2 Q50,-5 62,2 L60,45 Q50,42 40,45 Z"
                  fill={hairColor}
                />
                {/* Highlight */}
                <Path
                  d="M45,40 L44,8 Q50,5 56,8 L55,40"
                  fill="none"
                  stroke={highlight}
                  strokeWidth={2}
                  opacity={0.3}
                />
              </G>
            );

          case HairStyle.HAT_BEANIE:
            return (
              <G>
                {/* Hair peeking out */}
                <Path
                  d="M22,42 Q25,38 30,40 L70,40 Q75,38 78,42"
                  fill={hairColor}
                />
                {/* Beanie */}
                <Path
                  d="M20,42 Q15,25 50,18 Q85,25 80,42 L20,42 Z"
                  fill="#404040"
                />
                {/* Beanie fold */}
                <Rect x="20" y="36" width="60" height="8" fill="#505050" rx="2" />
                {/* Pom pom */}
                <Circle cx="50" cy="12" r="5" fill="#505050" />
              </G>
            );

          case HairStyle.HAT_CAP:
            return (
              <G>
                {/* Hair peeking out back */}
                <Path
                  d="M22,45 L22,55 Q22,65 30,65 L70,65 Q78,65 78,55 L78,45"
                  fill={hairColor}
                />
                {/* Cap */}
                <Path
                  d="M18,38 Q15,25 50,20 Q85,25 82,38 L18,38 Z"
                  fill="#2c5282"
                />
                {/* Bill */}
                <Path
                  d="M20,38 Q10,38 15,45 L35,42 L20,38 Z"
                  fill="#1a365d"
                />
                {/* Cap detail */}
                <Path
                  d="M50,22 L50,38"
                  fill="none"
                  stroke="#1a365d"
                  strokeWidth={1}
                />
              </G>
            );

          case HairStyle.HEADBAND:
            return (
              <G>
                {/* Hair */}
                <Path
                  d="M22,40 Q20,15 50,10 Q80,15 78,40 L75,32 Q50,22 25,32 Z"
                  fill={hairColor}
                />
                {/* Headband */}
                <Path
                  d="M22,30 Q50,24 78,30 Q78,35 78,35 Q50,28 22,35 Q22,32 22,30 Z"
                  fill="#e53e3e"
                />
              </G>
            );

          case HairStyle.HIJAB:
            return (
              <G>
                {/* Hijab covering */}
                <Path
                  d="M15,45 Q10,30 25,20 Q40,10 50,12 Q60,10 75,20 Q90,30 85,45
                     L88,95 L12,95 L15,45 Z"
                  fill="#6b46c1"
                />
                {/* Inner edge */}
                <Path
                  d="M25,38 Q25,28 50,25 Q75,28 75,38"
                  fill="none"
                  stroke="#553c9a"
                  strokeWidth={2}
                />
                {/* Fold detail */}
                <Path
                  d="M30,50 L25,95 M70,50 L75,95"
                  fill="none"
                  stroke="#553c9a"
                  strokeWidth={1}
                  opacity={0.5}
                />
              </G>
            );

          case HairStyle.TURBAN:
            return (
              <G>
                {/* Turban wrap */}
                <Path
                  d="M18,45 Q12,28 50,15 Q88,28 82,45 L82,38 Q82,20 50,18 Q18,20 18,38 Z"
                  fill="#dd6b20"
                />
                {/* Wrap layers */}
                <Path
                  d="M22,35 Q50,28 78,35 M25,28 Q50,22 75,28 M28,22 Q50,18 72,22"
                  fill="none"
                  stroke="#c05621"
                  strokeWidth={1.5}
                />
                {/* Center jewel */}
                <Circle cx="50" cy="25" r="3" fill="#ffd700" />
              </G>
            );

          default:
            // Fallback to short crew if style not recognized
            return (
              <G>
                <Path
                  d="M24,34 Q24,12 50,10 Q76,12 76,34 Q76,38 72,40 L68,26 Q50,18 32,26 L28,40 Q24,38 24,34 Z"
                  fill={hairColor}
                />
              </G>
            );
        }
      })()}
    </G>
  );
}

/**
 * Hair behind component - for long hair that goes behind the face
 * Should be rendered before Face component
 */
export function HairBehind({ style, hairColor, scale = 1 }: HairProps) {
  // Only render for long hair styles
  const longStyles = [
    HairStyle.LONG_STRAIGHT,
    HairStyle.LONG_WAVY,
    HairStyle.LONG_CURLY,
    HairStyle.LONG_BRAIDS,
    HairStyle.MEDIUM_STRAIGHT,
    HairStyle.MEDIUM_CURLY,
    HairStyle.HIJAB,
  ];

  if (!longStyles.includes(style)) {
    return null;
  }

  return (
    <G transform={`scale(${scale})`}>
      {(() => {
        switch (style) {
          case HairStyle.LONG_STRAIGHT:
          case HairStyle.LONG_WAVY:
          case HairStyle.MEDIUM_STRAIGHT:
            return (
              <Rect x="18" y="35" width="64" height="60" fill={hairColor} />
            );

          case HairStyle.LONG_CURLY:
          case HairStyle.MEDIUM_CURLY:
            return (
              <Ellipse cx="50" cy="60" rx="38" ry="40" fill={hairColor} />
            );

          case HairStyle.LONG_BRAIDS:
            return (
              <G>
                <Rect x="18" y="35" width="20" height="55" fill={hairColor} />
                <Rect x="62" y="35" width="20" height="55" fill={hairColor} />
              </G>
            );

          case HairStyle.HIJAB:
            return (
              <Rect x="15" y="40" width="70" height="55" fill="#6b46c1" />
            );

          default:
            return null;
        }
      })()}
    </G>
  );
}

export default Hair;
