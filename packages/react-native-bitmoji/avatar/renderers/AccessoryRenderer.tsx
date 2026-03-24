/**
 * AccessoryRenderer - Modular accessory rendering component
 *
 * Extracted from Avatar.tsx for better maintainability.
 * Renders various accessory styles as SVG elements.
 */

import React, { memo } from 'react';
import { G, Defs, Ellipse, Path, Circle, Rect, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { AccessoryStyle } from '../types';
import { adjustBrightness, useGradientIds } from '../utils';

// ============================================================================
// TYPES
// ============================================================================

export interface AccessoryRendererProps {
  type: AccessoryStyle;
  color?: string;
}

type GradientIds = {
  accessoryGrad: string;
  lens: string;
  frame: string;
  lensGrad: string;
  cup: string;
  cushion: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AccessoryRenderer = memo(function AccessoryRenderer({
  type,
  color = '#1a1a2e',
}: AccessoryRendererProps) {
  if (type === AccessoryStyle.NONE) return null;

  const frameHighlight = adjustBrightness(color, 30);
  const frameShadow = adjustBrightness(color, -30);

  // Use stable gradient IDs instead of Math.random()
  const ids = useGradientIds<GradientIds>(['accessoryGrad', 'lens', 'frame', 'lensGrad', 'cup', 'cushion']);

  switch (type) {
    case AccessoryStyle.GLASSES_ROUND:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Lens tint */}
          <Circle cx="39" cy="44" r="7" fill={color} opacity={0.05} />
          <Circle cx="61" cy="44" r="7" fill={color} opacity={0.05} />
          {/* Frames - thinner strokes */}
          <Circle cx="39" cy="44" r="7.5" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={0.6} />
          <Circle cx="61" cy="44" r="7.5" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={0.6} />
          {/* Lens reflection dots */}
          <Circle cx="36" cy="41.5" r="1" fill="white" opacity={0.3} />
          <Circle cx="58" cy="41.5" r="1" fill="white" opacity={0.3} />
          {/* Bridge with detail */}
          <Path d="M46.5,44 Q50,42.5 53.5,44" stroke={color} strokeWidth={0.8} fill="none" />
          <Ellipse cx="50" cy="44.5" rx="1.5" ry="1" fill={color} opacity={0.15} />
          {/* Temple arms with detail */}
          <Path d="M31.5,43.5 L24,41.5" stroke={color} strokeWidth={0.7} />
          <Path d="M68.5,43.5 L76,41.5" stroke={color} strokeWidth={0.7} />
          {/* Temple hinges */}
          <Circle cx="31.5" cy="43.5" r="0.8" fill={frameShadow} />
          <Circle cx="68.5" cy="43.5" r="0.8" fill={frameShadow} />
          {/* Frame reflection */}
          <Path d="M33,40 Q36,39 39,40" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.5} />
          <Path d="M55,40 Q58,39 61,40" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.5} />
        </G>
      );

    case AccessoryStyle.GLASSES_SQUARE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Lens tint */}
          <Rect x="32" y="39.5" width="14" height="9" rx="1" fill={color} opacity={0.05} />
          <Rect x="54" y="39.5" width="14" height="9" rx="1" fill={color} opacity={0.05} />
          {/* Frames - thinner strokes */}
          <Rect x="31" y="38.5" width="16" height="11" rx="2" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={0.6} />
          <Rect x="53" y="38.5" width="16" height="11" rx="2" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={0.6} />
          {/* Lens reflection dots */}
          <Circle cx="35" cy="41" r="1" fill="white" opacity={0.3} />
          <Circle cx="57" cy="41" r="1" fill="white" opacity={0.3} />
          {/* Bridge with detail */}
          <Path d="M47,44 L53,44" stroke={color} strokeWidth={0.8} />
          <Rect x="49" y="43" width="2" height="2" rx="0.5" fill={color} opacity={0.15} />
          {/* Temple arms with detail */}
          <Path d="M31,42 L24,40" stroke={color} strokeWidth={0.7} />
          <Path d="M69,42 L76,40" stroke={color} strokeWidth={0.7} />
          {/* Temple hinges */}
          <Rect x="30.5" y="41.5" width="1" height="1" rx="0.3" fill={frameShadow} />
          <Rect x="68.5" y="41.5" width="1" height="1" rx="0.3" fill={frameShadow} />
          {/* Corner highlights */}
          <Path d="M32,39.5 L35,39.5" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.5} />
          <Path d="M54,39.5 L57,39.5" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.5} />
        </G>
      );

    case AccessoryStyle.GLASSES_PRESCRIPTION:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
            <RadialGradient id={ids.lens} cx="30%" cy="30%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Lens with refraction effect */}
          <Circle cx="39" cy="44" r="7.5" fill={`url(#${ids.lens})`} />
          <Circle cx="61" cy="44" r="7.5" fill={`url(#${ids.lens})`} />
          {/* Frames - slightly thicker for prescription but still refined */}
          <Circle cx="39" cy="44" r="8" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={0.75} />
          <Circle cx="61" cy="44" r="8" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={0.75} />
          {/* Lens reflection dots */}
          <Circle cx="36" cy="41" r="1" fill="white" opacity={0.3} />
          <Circle cx="58" cy="41" r="1" fill="white" opacity={0.3} />
          {/* Bridge with detail */}
          <Path d="M47,44 L53,44" stroke={color} strokeWidth={0.9} />
          <Ellipse cx="50" cy="44.5" rx="1.5" ry="1" fill={color} opacity={0.15} />
          {/* Temple arms with detail */}
          <Path d="M31,44 L24,42" stroke={color} strokeWidth={0.7} />
          <Path d="M69,44 L76,42" stroke={color} strokeWidth={0.7} />
          {/* Temple hinges */}
          <Circle cx="31" cy="44" r="0.8" fill={frameShadow} />
          <Circle cx="69" cy="44" r="0.8" fill={frameShadow} />
          {/* Frame highlights */}
          <Circle cx="39" cy="44" r="8" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.4} />
          <Circle cx="61" cy="44" r="8" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.4} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#3d3d3d" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0a0a15" />
            </LinearGradient>
            <LinearGradient id={ids.lensGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2a2a3e" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0f0f1a" />
            </LinearGradient>
          </Defs>
          {/* Lenses with gradient - darker fill */}
          <Rect x="28" y="38" width="19" height="14" rx="3" fill={`url(#${ids.lensGrad})`} opacity={0.85} />
          <Rect x="53" y="38" width="19" height="14" rx="3" fill={`url(#${ids.lensGrad})`} opacity={0.85} />
          {/* Frame edges */}
          <Rect x="28" y="38" width="19" height="14" rx="3" fill="none" stroke="#0a0a15" strokeWidth={0.5} />
          <Rect x="53" y="38" width="19" height="14" rx="3" fill="none" stroke="#0a0a15" strokeWidth={0.5} />
          {/* Bridge */}
          <Path d="M47,44 L53,44" stroke="#1a1a2e" strokeWidth={3} />
          {/* Temples */}
          <Path d="M28,42 L22,40" stroke="#1a1a2e" strokeWidth={2} />
          <Path d="M72,42 L78,40" stroke="#1a1a2e" strokeWidth={2} />
          {/* Reflections */}
          <Path d="M31,40 L37,40 L31,46" fill="white" opacity={0.15} />
          <Path d="M56,40 L62,40 L56,46" fill="white" opacity={0.15} />
          {/* Secondary reflection */}
          <Path d="M42,48 L45,50" fill="none" stroke="white" strokeWidth={1} opacity={0.1} />
          <Path d="M67,48 L70,50" fill="none" stroke="white" strokeWidth={1} opacity={0.1} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES_AVIATOR:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2a2a3e" />
              <Stop offset="40%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0f0f1a" />
            </LinearGradient>
            <LinearGradient id={ids.frame} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#e0e0e0" />
              <Stop offset="50%" stopColor="#c0c0c0" />
              <Stop offset="100%" stopColor="#909090" />
            </LinearGradient>
          </Defs>
          {/* Lenses */}
          <Path d="M28,40 Q28,52 38,52 Q48,52 48,44 L48,40 Q48,36 38,36 Q28,36 28,40 Z" fill={`url(#${ids.accessoryGrad})`} />
          <Path d="M52,40 Q52,52 62,52 Q72,52 72,44 L72,40 Q72,36 62,36 Q52,36 52,40 Z" fill={`url(#${ids.accessoryGrad})`} />
          {/* Metal frame edge */}
          <Path d="M28,40 Q28,52 38,52 Q48,52 48,44 L48,40 Q48,36 38,36 Q28,36 28,40 Z" fill="none" stroke={`url(#${ids.frame})`} strokeWidth={1} />
          <Path d="M52,40 Q52,52 62,52 Q72,52 72,44 L72,40 Q72,36 62,36 Q52,36 52,40 Z" fill="none" stroke={`url(#${ids.frame})`} strokeWidth={1} />
          {/* Metal bridge */}
          <Path d="M48,42 L52,42" stroke={`url(#${ids.frame})`} strokeWidth={2} />
          {/* Nose pads */}
          <Ellipse cx="48" cy="44" rx="1" ry="2" fill="#c0c0c0" />
          <Ellipse cx="52" cy="44" rx="1" ry="2" fill="#c0c0c0" />
          {/* Temples */}
          <Path d="M28,40 L22,38" stroke={`url(#${ids.frame})`} strokeWidth={2} />
          <Path d="M72,40 L78,38" stroke={`url(#${ids.frame})`} strokeWidth={2} />
          {/* Reflections */}
          <Path d="M32,38 L40,40 L32,44" fill="white" opacity={0.12} />
          <Path d="M56,38 L64,40 L56,44" fill="white" opacity={0.12} />
        </G>
      );

    case AccessoryStyle.MONOCLE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#d4af37" />
              <Stop offset="50%" stopColor="#b8960c" />
              <Stop offset="100%" stopColor="#8b7200" />
            </LinearGradient>
            <RadialGradient id={ids.lens} cx="30%" cy="30%" rx="60%" ry="60%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          {/* Lens */}
          <Circle cx="62" cy="44" r="8.5" fill={`url(#${ids.lens})`} />
          {/* Gold frame - thinner */}
          <Circle cx="62" cy="44" r="9" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.8} />
          {/* Decorative rim */}
          <Circle cx="62" cy="44" r="10.2" fill="none" stroke="#b8960c" strokeWidth={0.4} opacity={0.5} />
          {/* Chain - refined */}
          <Path d="M71,44 L75,48 Q77,54 77,65" fill="none" stroke="#b8960c" strokeWidth={0.8} />
          {/* Chain links detail */}
          <Circle cx="76" cy="55" r="0.8" fill="none" stroke="#b8960c" strokeWidth={0.4} />
          <Circle cx="77" cy="62" r="0.8" fill="none" stroke="#b8960c" strokeWidth={0.4} />
          {/* Frame highlight */}
          <Path d="M56,40 Q62,38 68,40" fill="none" stroke="#d4af37" strokeWidth={0.5} opacity={0.6} />
          {/* Inner frame detail */}
          <Circle cx="62" cy="44" r="7.5" fill="none" stroke="#d4af37" strokeWidth={0.3} opacity={0.3} />
        </G>
      );

    case AccessoryStyle.EYEPATCH:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2d2d2d" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0a0a15" />
            </LinearGradient>
          </Defs>
          {/* Patch - better proportioned to eye */}
          <Ellipse cx="38" cy="44" rx="10" ry="8.5" fill={`url(#${ids.accessoryGrad})`} />
          {/* Patch edge stitching */}
          <Ellipse cx="38" cy="44" rx="9.2" ry="7.7" fill="none" stroke="#3d3d3d" strokeWidth={0.4} strokeDasharray="1.5,1.5" />
          {/* Straps - thinner */}
          <Path d="M28,41 L23,36" stroke="#1a1a2e" strokeWidth={2} />
          <Path d="M48,41 L76,36" stroke="#1a1a2e" strokeWidth={2} />
          {/* Strap highlight */}
          <Path d="M28.5,41 L24,37" stroke="#3d3d3d" strokeWidth={0.4} opacity={0.5} />
          <Path d="M48.5,41 L75,36.5" stroke="#3d3d3d" strokeWidth={0.4} opacity={0.5} />
          {/* Fabric texture detail */}
          <Path d="M34,44 L42,44 M38,40 L38,48" fill="none" stroke="#2d2d2d" strokeWidth={0.4} opacity={0.3} />
          <Path d="M35,42 L41,46 M35,46 L41,42" fill="none" stroke="#252525" strokeWidth={0.3} opacity={0.2} />
        </G>
      );

    case AccessoryStyle.EARRING_SMALL:
      return (
        <G>
          <Defs>
            <RadialGradient id={ids.accessoryGrad} cx="30%" cy="30%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#fff5cc" />
              <Stop offset="50%" stopColor="#ffd700" />
              <Stop offset="100%" stopColor="#b8960c" />
            </RadialGradient>
          </Defs>
          {/* Left stud earring - proper ear positioning */}
          <Circle cx="18" cy="50" r="2" fill={`url(#${ids.accessoryGrad})`} />
          <Circle cx="17.4" cy="49.4" r="0.7" fill="#ffffff" opacity={0.6} />
          <Circle cx="18" cy="50" r="1.5" fill="none" stroke="#b8960c" strokeWidth={0.2} opacity={0.4} />
          {/* Right stud earring (mirrored) */}
          <Circle cx="82" cy="50" r="2" fill={`url(#${ids.accessoryGrad})`} />
          <Circle cx="82.6" cy="49.4" r="0.7" fill="#ffffff" opacity={0.6} />
          <Circle cx="82" cy="50" r="1.5" fill="none" stroke="#b8960c" strokeWidth={0.2} opacity={0.4} />
        </G>
      );

    case AccessoryStyle.EARRING_HOOP:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fff5cc" />
              <Stop offset="30%" stopColor="#ffd700" />
              <Stop offset="70%" stopColor="#b8960c" />
              <Stop offset="100%" stopColor="#8b7200" />
            </LinearGradient>
          </Defs>
          {/* Left hoop - better proportioned */}
          <Circle cx="18" cy="53" r="4" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.2} />
          <Path d="M15.5,50.5 Q18,49 20.5,50.5" fill="none" stroke="#fff5cc" strokeWidth={0.4} opacity={0.5} />
          <Circle cx="18" cy="53" r="3.2" fill="none" stroke="#b8960c" strokeWidth={0.25} opacity={0.5} />
          {/* Right hoop (mirrored) */}
          <Circle cx="82" cy="53" r="4" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1.2} />
          <Path d="M79.5,50.5 Q82,49 84.5,50.5" fill="none" stroke="#fff5cc" strokeWidth={0.4} opacity={0.5} />
          <Circle cx="82" cy="53" r="3.2" fill="none" stroke="#b8960c" strokeWidth={0.25} opacity={0.5} />
        </G>
      );

    case AccessoryStyle.NOSE_RING:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#e8e8e8" />
              <Stop offset="50%" stopColor="#c0c0c0" />
              <Stop offset="100%" stopColor="#909090" />
            </LinearGradient>
          </Defs>
          {/* Septum ring - better proportioned */}
          <Circle cx="50" cy="56.5" r="2.2" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={1} />
          {/* Highlight */}
          <Path d="M48.3,55 Q50,54.2 51.7,55" fill="none" stroke="#e8e8e8" strokeWidth={0.35} opacity={0.6} />
          {/* Inner detail */}
          <Circle cx="50" cy="56.5" r="1.5" fill="none" stroke="#c0c0c0" strokeWidth={0.25} opacity={0.3} />
        </G>
      );

    case AccessoryStyle.HEADPHONES:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#404040" />
              <Stop offset="50%" stopColor="#2d2d2d" />
              <Stop offset="100%" stopColor="#1a1a1a" />
            </LinearGradient>
            <RadialGradient id={ids.cup} cx="40%" cy="40%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#505050" />
              <Stop offset="100%" stopColor="#2d2d2d" />
            </RadialGradient>
            <RadialGradient id={ids.cushion} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#4a4a4a" />
              <Stop offset="70%" stopColor="#3d3d3d" />
              <Stop offset="100%" stopColor="#2d2d2d" />
            </RadialGradient>
          </Defs>
          {/* Headband - reduced size, better curve following head shape */}
          <Path d="M22,35 Q22,14 50,12 Q78,14 78,35" fill="none" stroke={`url(#${ids.accessoryGrad})`} strokeWidth={3.5} />
          {/* Headband padding detail */}
          <Path d="M38,18 Q50,14 62,18" fill="none" stroke="#3d3d3d" strokeWidth={2.8} />
          {/* Inner highlight */}
          <Path d="M26,26 Q50,18 74,26" fill="none" stroke={frameHighlight} strokeWidth={0.7} opacity={0.5} />
          {/* Headband shading */}
          <Path d="M24,30 Q50,20 76,30" fill="none" stroke="#1a1a1a" strokeWidth={0.5} opacity={0.3} />
          {/* Left cup - reduced size by 25% */}
          <Ellipse cx="18" cy="42" rx="4.5" ry="5.25" fill={`url(#${ids.cup})`} />
          <Ellipse cx="18" cy="42" rx="3.4" ry="4.1" fill={`url(#${ids.cushion})`} />
          {/* Left cup padding detail (ear cushion) */}
          <Ellipse cx="18" cy="42" rx="2.8" ry="3.4" fill="#3a3a3a" />
          <Ellipse cx="18" cy="42" rx="1.9" ry="2.6" fill="#2d2d2d" />
          <Circle cx="18" cy="42" r="1.1" fill="#252525" />
          {/* Speaker mesh detail */}
          <Path d="M16.5,40.5 L19.5,40.5 M16.5,42 L19.5,42 M16.5,43.5 L19.5,43.5" fill="none" stroke="#353535" strokeWidth={0.25} opacity={0.5} />
          {/* Right cup - reduced size by 25% */}
          <Ellipse cx="82" cy="42" rx="4.5" ry="5.25" fill={`url(#${ids.cup})`} />
          <Ellipse cx="82" cy="42" rx="3.4" ry="4.1" fill={`url(#${ids.cushion})`} />
          {/* Right cup padding detail (ear cushion) */}
          <Ellipse cx="82" cy="42" rx="2.8" ry="3.4" fill="#3a3a3a" />
          <Ellipse cx="82" cy="42" rx="1.9" ry="2.6" fill="#2d2d2d" />
          <Circle cx="82" cy="42" r="1.1" fill="#252525" />
          {/* Speaker mesh detail */}
          <Path d="M80.5,40.5 L83.5,40.5 M80.5,42 L83.5,42 M80.5,43.5 L83.5,43.5" fill="none" stroke="#353535" strokeWidth={0.25} opacity={0.5} />
          {/* Cup highlights */}
          <Path d="M14,37 Q18,35 22,37" fill="none" stroke="#505050" strokeWidth={0.6} opacity={0.4} />
          <Path d="M78,37 Q82,35 86,37" fill="none" stroke="#505050" strokeWidth={0.6} opacity={0.4} />
          {/* Subtle shading on cups */}
          <Ellipse cx="17" cy="40" rx="1.5" ry="1.8" fill="#505050" opacity={0.15} />
          <Ellipse cx="83" cy="40" rx="1.5" ry="1.8" fill="#505050" opacity={0.15} />
        </G>
      );

    // ============================================================================
    // HIGH-PRIORITY ACCESSORIES (Phase 2.2)
    // ============================================================================

    case AccessoryStyle.GLASSES_CAT_EYE:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Cat-eye frames - upswept corners with thinner strokes */}
          <Path
            d="M28,42 Q28,48 34,48 L42,48 Q48,48 48,42 L48,40 Q48,35 44,34 L32,34 Q28,35 28,40 Z"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={0.65}
          />
          <Path
            d="M52,42 Q52,48 58,48 L66,48 Q72,48 72,42 L72,40 Q72,35 68,34 L56,34 Q52,35 52,40 Z"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={0.65}
          />
          {/* Lens tint */}
          <Path d="M29,42 Q29,47 34,47 L42,47 Q47,47 47,42 L47,40 Q47,36 44,35 L32,35 Q29,36 29,40 Z" fill={color} opacity={0.05} />
          <Path d="M53,42 Q53,47 58,47 L66,47 Q71,47 71,42 L71,40 Q71,36 68,35 L56,35 Q53,36 53,40 Z" fill={color} opacity={0.05} />
          {/* Lens reflection dots */}
          <Circle cx="33" cy="38" r="1" fill="white" opacity={0.3} />
          <Circle cx="57" cy="38" r="1" fill="white" opacity={0.3} />
          {/* Bridge with detail */}
          <Path d="M48,42 Q50,40.5 52,42" stroke={color} strokeWidth={0.8} fill="none" />
          <Ellipse cx="50" cy="42" rx="1.5" ry="0.8" fill={color} opacity={0.15} />
          {/* Temple arms with detail */}
          <Path d="M28,38 L22,36" stroke={color} strokeWidth={0.7} />
          <Path d="M72,38 L78,36" stroke={color} strokeWidth={0.7} />
          {/* Temple hinges */}
          <Circle cx="28" cy="38" r="0.7" fill={frameShadow} />
          <Circle cx="72" cy="38" r="0.7" fill={frameShadow} />
          {/* Frame reflection - enhanced on upswept corners */}
          <Path d="M30,36 Q36,34 42,36" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.5} />
          <Path d="M54,36 Q60,34 66,36" fill="none" stroke={frameHighlight} strokeWidth={0.4} opacity={0.5} />
        </G>
      );

    case AccessoryStyle.SUNGLASSES_WAYFARER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#3d3d3d" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0a0a15" />
            </LinearGradient>
            <LinearGradient id={ids.lensGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2a2a3e" />
              <Stop offset="50%" stopColor="#1a1a2e" />
              <Stop offset="100%" stopColor="#0f0f1a" />
            </LinearGradient>
          </Defs>
          {/* Wayfarer shape - slightly trapezoidal */}
          <Path
            d="M26,38 L46,38 L44,52 L28,52 Z"
            fill={`url(#${ids.lensGrad})`}
            stroke="#1a1a2e"
            strokeWidth={2}
          />
          <Path
            d="M54,38 L74,38 L72,52 L56,52 Z"
            fill={`url(#${ids.lensGrad})`}
            stroke="#1a1a2e"
            strokeWidth={2}
          />
          {/* Bridge */}
          <Path d="M46,42 L54,42" stroke="#1a1a2e" strokeWidth={2.5} />
          {/* Temples */}
          <Path d="M26,40 L22,38" stroke="#1a1a2e" strokeWidth={2.5} />
          <Path d="M74,40 L78,38" stroke="#1a1a2e" strokeWidth={2.5} />
          {/* Reflections */}
          <Path d="M29,40 L35,40 L29,46" fill="white" opacity={0.12} />
          <Path d="M57,40 L63,40 L57,46" fill="white" opacity={0.12} />
        </G>
      );

    case AccessoryStyle.NECKLACE_CHAIN:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#c0c0c0" />
              <Stop offset="30%" stopColor="#e8e8e8" />
              <Stop offset="50%" stopColor="#d0d0d0" />
              <Stop offset="70%" stopColor="#e8e8e8" />
              <Stop offset="100%" stopColor="#c0c0c0" />
            </LinearGradient>
          </Defs>
          {/* Chain necklace - proper drape curve following neck/collar */}
          <Path
            d="M26,76 Q32,82 42,85 Q50,86 58,85 Q68,82 74,76"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={1.2}
          />
          {/* Chain links detail */}
          <Path d="M30,78 L32,80 M38,83 L40,84 M48,85.5 L52,85.5 M60,84 L62,83 M68,80 L70,78"
            fill="none" stroke="#e8e8e8" strokeWidth={0.4} opacity={0.5} />
          {/* Subtle shadow under chain */}
          <Path
            d="M27,76.5 Q33,82.5 42,85.5 Q50,86.5 58,85.5 Q67,82.5 73,76.5"
            fill="none"
            stroke="#909090"
            strokeWidth={0.5}
            opacity={0.2}
          />
        </G>
      );

    case AccessoryStyle.NECKLACE_CHOKER:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#2d2d2d" />
              <Stop offset="50%" stopColor="#1a1a1a" />
              <Stop offset="100%" stopColor="#0d0d0d" />
            </LinearGradient>
          </Defs>
          {/* Choker band - follows neck curve */}
          <Path
            d="M24,73 Q38,71 50,71 Q62,71 76,73"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={3.5}
          />
          {/* Band edges for dimension */}
          <Path d="M24.5,72 Q38,70 50,70 Q62,70 75.5,72" fill="none" stroke="#3d3d3d" strokeWidth={0.4} opacity={0.5} />
          <Path d="M24.5,74 Q38,72 50,72 Q62,72 75.5,74" fill="none" stroke="#0d0d0d" strokeWidth={0.4} opacity={0.5} />
          {/* Center decoration */}
          <Circle cx="50" cy="71.5" r="2.5" fill="#c0c0c0" />
          <Circle cx="50" cy="71.5" r="1.8" fill="#909090" />
          <Circle cx="49.3" cy="70.8" r="0.7" fill="#e8e8e8" opacity={0.6} />
        </G>
      );

    case AccessoryStyle.HEADBAND:
      return (
        <G>
          <Defs>
            <LinearGradient id={ids.accessoryGrad} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={frameHighlight} />
              <Stop offset="50%" stopColor={color} />
              <Stop offset="100%" stopColor={frameShadow} />
            </LinearGradient>
          </Defs>
          {/* Headband - follows head curve properly */}
          <Path
            d="M24,28 Q26,20 35,16 Q50,14 65,16 Q74,20 76,28"
            fill="none"
            stroke={`url(#${ids.accessoryGrad})`}
            strokeWidth={4.5}
          />
          {/* Inner edge detail */}
          <Path d="M25,27.5 Q27,20.5 35,16.5 Q50,14.5 65,16.5 Q73,20.5 75,27.5" fill="none" stroke={frameHighlight} strokeWidth={0.5} opacity={0.4} />
          {/* Outer edge shadow */}
          <Path d="M24.5,29 Q26.5,21 35.5,17 Q50,15 64.5,17 Q73.5,21 75.5,29" fill="none" stroke={frameShadow} strokeWidth={0.5} opacity={0.3} />
          {/* Fabric texture hint */}
          <Path d="M40,18 L42,18 M48,15.5 L52,15.5 M58,18 L60,18" fill="none" stroke={color} strokeWidth={0.3} opacity={0.2} />
        </G>
      );

    default:
      return null;
  }
});

export default AccessoryRenderer;
