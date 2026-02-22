/**
 * BackgroundRenderer - Renders scene backgrounds for stickers
 *
 * Supports various background styles from the Scene enum:
 * - Solid colors and gradients
 * - Pattern backgrounds (confetti, hearts, stars)
 * - Scene illustrations (office, beach, party, etc.)
 */

import React, { useMemo, memo, useId, type JSX } from 'react';
import { G, Rect, Defs, LinearGradient, RadialGradient, Stop, Circle, Path, Ellipse } from 'react-native-svg';
import { Scene } from './types';

interface BackgroundRendererProps {
  scene: Scene;
  sceneColor?: string;
  width?: number;
  height?: number;
}

/**
 * Hook to generate stable gradient IDs for background scenes
 */
function useBackgroundIds(count: number = 3): string[] {
  const baseId = useId().replace(/:/g, '_');
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => `bg_${baseId}_${i}`);
  }, [baseId, count]);
}

/**
 * Renders confetti particles scattered across the background
 */
function ConfettiBackground({ width = 200, height = 200 }: { width?: number; height?: number }) {
  const confettiColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb8fce', '#85c1e9', '#f8b500', '#ff85a2'];
  const particles: JSX.Element[] = [];

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    const rotation = Math.random() * 360;
    const size = 2 + Math.random() * 4;

    if (i % 3 === 0) {
      // Rectangle confetti
      particles.push(
        <Rect
          key={`conf_${i}`}
          x={x}
          y={y}
          width={size}
          height={size * 2}
          fill={color}
          transform={`rotate(${rotation}, ${x + size / 2}, ${y + size})`}
          opacity={0.8}
        />
      );
    } else if (i % 3 === 1) {
      // Circle confetti
      particles.push(
        <Circle
          key={`conf_${i}`}
          cx={x}
          cy={y}
          r={size / 2}
          fill={color}
          opacity={0.8}
        />
      );
    } else {
      // Triangle/ribbon confetti
      particles.push(
        <Path
          key={`conf_${i}`}
          d={`M ${x} ${y} L ${x + size} ${y + size * 1.5} L ${x - size} ${y + size * 1.5} Z`}
          fill={color}
          transform={`rotate(${rotation}, ${x}, ${y + size * 0.75})`}
          opacity={0.8}
        />
      );
    }
  }

  return <G>{particles}</G>;
}

/**
 * Renders floating hearts
 */
function HeartsBackground({ width = 200, height = 200 }: { width?: number; height?: number }) {
  const heartColors = ['#ff6b9d', '#ff85a2', '#ffa5b4', '#ffb6c1', '#e75480', '#ff1493'];
  const hearts: JSX.Element[] = [];

  for (let i = 0; i < 15; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = heartColors[Math.floor(Math.random() * heartColors.length)];
    const scale = 0.3 + Math.random() * 0.7;
    const opacity = 0.4 + Math.random() * 0.4;

    hearts.push(
      <Path
        key={`heart_${i}`}
        d={`M ${x} ${y + 5 * scale}
            C ${x - 5 * scale} ${y} ${x - 10 * scale} ${y + 5 * scale} ${x} ${y + 12 * scale}
            C ${x + 10 * scale} ${y + 5 * scale} ${x + 5 * scale} ${y} ${x} ${y + 5 * scale}`}
        fill={color}
        opacity={opacity}
      />
    );
  }

  return <G>{hearts}</G>;
}

/**
 * Renders twinkling stars
 */
function StarsBackground({ width = 200, height = 200 }: { width?: number; height?: number }) {
  const starColors = ['#ffd700', '#ffec8b', '#fff8dc', '#f0e68c', '#ffffff'];
  const stars: JSX.Element[] = [];

  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const color = starColors[Math.floor(Math.random() * starColors.length)];
    const size = 2 + Math.random() * 4;
    const opacity = 0.6 + Math.random() * 0.4;

    // 4-point star shape
    const points = [];
    for (let j = 0; j < 8; j++) {
      const angle = (j * Math.PI) / 4;
      const r = j % 2 === 0 ? size : size / 3;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }

    stars.push(
      <Path
        key={`star_${i}`}
        d={`M ${points.join(' L ')} Z`}
        fill={color}
        opacity={opacity}
      />
    );
  }

  return <G>{stars}</G>;
}

/**
 * Renders a simple office scene
 */
function OfficeScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#e8f4f8" />
          <Stop offset="100%" stopColor="#b8d4e3" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Window */}
      <Rect x="120" y="10" width="60" height="50" rx="2" fill="#87ceeb" stroke="#8b7355" strokeWidth={2} />
      <Path d="M 150 10 L 150 60" stroke="#8b7355" strokeWidth={1.5} />
      <Path d="M 120 35 L 180 35" stroke="#8b7355" strokeWidth={1.5} />
      {/* Desk */}
      <Rect x="0" y="140" width="200" height="60" fill="#8b7355" />
      <Rect x="0" y="140" width="200" height="8" fill="#a0826d" />
      {/* Plant */}
      <Ellipse cx="170" cy="135" rx="15" ry="12" fill="#2e7d32" />
      <Rect x="165" y="135" width="10" height="15" fill="#5d4037" />
    </G>
  );
}

/**
 * Renders a home/living room scene
 */
function HomeScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#fff8e7" />
          <Stop offset="100%" stopColor="#ffe4b5" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Couch */}
      <Rect x="10" y="130" width="120" height="50" rx="8" fill="#8b4513" />
      <Rect x="15" y="135" width="50" height="35" rx="4" fill="#a0522d" />
      <Rect x="70" y="135" width="50" height="35" rx="4" fill="#a0522d" />
      {/* Lamp */}
      <Rect x="155" y="80" width="6" height="60" fill="#696969" />
      <Path d="M 140 80 Q 158 60 176 80 Z" fill="#f5deb3" />
      {/* Picture frame */}
      <Rect x="60" y="20" width="40" height="30" rx="2" fill="#daa520" stroke="#8b7355" strokeWidth={2} />
      <Rect x="65" y="25" width="30" height="20" fill="#87ceeb" />
    </G>
  );
}

/**
 * Renders a beach scene
 */
function BeachScene({ gradientId, sandGradId }: { gradientId: string; sandGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="50%" stopColor="#00bfff" />
          <Stop offset="100%" stopColor="#1e90ff" />
        </LinearGradient>
        <LinearGradient id={sandGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#f4d03f" />
          <Stop offset="100%" stopColor="#d4ac0d" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="120" fill={`url(#${gradientId})`} />
      {/* Sun */}
      <Circle cx="160" cy="30" r="20" fill="#ffd700" />
      {/* Ocean */}
      <Rect x="0" y="100" width="200" height="30" fill="#1e90ff" opacity={0.8} />
      <Path d="M 0 110 Q 25 105 50 110 Q 75 115 100 110 Q 125 105 150 110 Q 175 115 200 110"
            stroke="#ffffff" strokeWidth={2} fill="none" opacity={0.5} />
      {/* Sand */}
      <Rect x="0" y="130" width="200" height="70" fill={`url(#${sandGradId})`} />
      {/* Palm tree */}
      <Rect x="20" y="90" width="8" height="50" fill="#8b4513" />
      <Path d="M 24 90 Q 0 70 10 60" stroke="#228b22" strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path d="M 24 90 Q 48 70 38 60" stroke="#228b22" strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path d="M 24 90 Q 24 60 24 55" stroke="#228b22" strokeWidth={8} fill="none" strokeLinecap="round" />
    </G>
  );
}

/**
 * Renders a party scene
 */
function PartyScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="70%">
          <Stop offset="0%" stopColor="#9b59b6" />
          <Stop offset="50%" stopColor="#8e44ad" />
          <Stop offset="100%" stopColor="#6c3483" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Disco lights */}
      <Circle cx="30" cy="30" r="15" fill="#e74c3c" opacity={0.6} />
      <Circle cx="170" cy="40" r="12" fill="#3498db" opacity={0.6} />
      <Circle cx="100" cy="20" r="10" fill="#2ecc71" opacity={0.6} />
      <Circle cx="50" cy="60" r="8" fill="#f1c40f" opacity={0.6} />
      <Circle cx="150" cy="70" r="10" fill="#e91e63" opacity={0.6} />
      {/* Confetti */}
      <ConfettiBackground width={200} height={200} />
      {/* Banner */}
      <Path d="M 20 15 L 40 25 L 60 15 L 80 25 L 100 15 L 120 25 L 140 15 L 160 25 L 180 15"
            stroke="#ff6b6b" strokeWidth={4} fill="none" />
    </G>
  );
}

/**
 * Renders a cafe scene
 */
function CafeScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#d7ccc8" />
          <Stop offset="100%" stopColor="#a1887f" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Brick wall pattern */}
      {[0, 1, 2, 3].map(row => (
        <G key={`brick_row_${row}`}>
          {[0, 1, 2, 3, 4].map(col => (
            <Rect
              key={`brick_${row}_${col}`}
              x={col * 45 + (row % 2 === 0 ? 0 : -22)}
              y={row * 25}
              width={42}
              height={22}
              rx={1}
              fill="#8d6e63"
              stroke="#6d4c41"
              strokeWidth={0.5}
            />
          ))}
        </G>
      ))}
      {/* Table */}
      <Ellipse cx="100" cy="160" rx="60" ry="20" fill="#5d4037" />
      {/* Coffee cup */}
      <Rect x="85" y="130" width="30" height="25" rx="3" fill="#ffffff" />
      <Path d="M 115 140 Q 125 145 115 150" stroke="#ffffff" strokeWidth={3} fill="none" />
      <Ellipse cx="100" cy="132" rx="12" ry="3" fill="#4a2c2a" />
    </G>
  );
}

/**
 * Renders a space scene
 */
function SpaceScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId} cx="30%" cy="30%" r="80%">
          <Stop offset="0%" stopColor="#1a1a2e" />
          <Stop offset="50%" stopColor="#16213e" />
          <Stop offset="100%" stopColor="#0f0f23" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Stars */}
      <StarsBackground width={200} height={200} />
      {/* Planet */}
      <Circle cx="160" cy="50" r="25" fill="#e74c3c" />
      <Ellipse cx="160" cy="50" rx="35" ry="5" fill="none" stroke="#d35400" strokeWidth={3} opacity={0.7} />
      {/* Moon */}
      <Circle cx="40" cy="150" r="15" fill="#bdc3c7" />
      <Circle cx="35" cy="145" r="3" fill="#95a5a6" />
      <Circle cx="45" cy="155" r="2" fill="#95a5a6" />
    </G>
  );
}

/**
 * Renders a gym scene
 */
function GymScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ecf0f1" />
          <Stop offset="100%" stopColor="#bdc3c7" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Floor */}
      <Rect x="0" y="160" width="200" height="40" fill="#34495e" />
      {/* Mirror */}
      <Rect x="10" y="10" width="80" height="100" rx="2" fill="#d6eaf8" stroke="#7f8c8d" strokeWidth={2} />
      {/* Dumbbell */}
      <G transform="translate(130, 140)">
        <Rect x="0" y="5" width="40" height="6" rx="2" fill="#7f8c8d" />
        <Rect x="-5" y="0" width="12" height="16" rx="2" fill="#2c3e50" />
        <Rect x="33" y="0" width="12" height="16" rx="2" fill="#2c3e50" />
      </G>
      {/* Weight plates on wall */}
      <Circle cx="150" cy="50" r="15" fill="#2c3e50" stroke="#7f8c8d" strokeWidth={2} />
      <Circle cx="150" cy="50" r="5" fill="#7f8c8d" />
    </G>
  );
}

/**
 * Renders a city scene
 */
function CityScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ff7e5f" />
          <Stop offset="50%" stopColor="#feb47b" />
          <Stop offset="100%" stopColor="#2c3e50" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Buildings silhouette */}
      <Path d="M 0 200 L 0 120 L 20 120 L 20 90 L 40 90 L 40 100 L 60 100 L 60 70 L 80 70 L 80 110 L 100 110 L 100 50 L 120 50 L 120 80 L 140 80 L 140 60 L 160 60 L 160 100 L 180 100 L 180 90 L 200 90 L 200 200 Z"
            fill="#1a1a2e" />
      {/* Windows */}
      {[65, 80, 95].map(y => (
        <G key={`windows_${y}`}>
          <Rect x="105" y={y} width="4" height="6" fill="#ffd700" opacity={0.8} />
          <Rect x="112" y={y} width="4" height="6" fill="#ffd700" opacity={0.6} />
        </G>
      ))}
      <Rect x="145" y="75" width="4" height="6" fill="#ffd700" opacity={0.7} />
      <Rect x="152" y="75" width="4" height="6" fill="#ffd700" opacity={0.5} />
    </G>
  );
}

/**
 * Renders an outdoor/nature scene
 */
function OutdoorsScene({ gradientId, grassGradId }: { gradientId: string; grassGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#e0f7fa" />
        </LinearGradient>
        <LinearGradient id={grassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#4caf50" />
          <Stop offset="100%" stopColor="#2e7d32" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="130" fill={`url(#${gradientId})`} />
      {/* Clouds */}
      <G opacity={0.9}>
        <Ellipse cx="40" cy="30" rx="20" ry="12" fill="#ffffff" />
        <Ellipse cx="55" cy="25" rx="15" ry="10" fill="#ffffff" />
        <Ellipse cx="60" cy="35" rx="12" ry="8" fill="#ffffff" />
      </G>
      <G opacity={0.8}>
        <Ellipse cx="150" cy="50" rx="18" ry="10" fill="#ffffff" />
        <Ellipse cx="165" cy="45" rx="12" ry="8" fill="#ffffff" />
      </G>
      {/* Hills */}
      <Path d="M 0 140 Q 50 100 100 130 Q 150 100 200 130 L 200 200 L 0 200 Z"
            fill="#66bb6a" />
      {/* Grass */}
      <Rect x="0" y="150" width="200" height="50" fill={`url(#${grassGradId})`} />
      {/* Tree */}
      <Rect x="160" y="110" width="10" height="40" fill="#5d4037" />
      <Circle cx="165" cy="90" r="25" fill="#2e7d32" />
    </G>
  );
}

// ============================================================================
// ADDITIONAL SCENE RENDERERS - Phase 2 Expansion
// ============================================================================

/**
 * Renders a bedroom scene
 */
function BedroomScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#f3e5f5" />
          <Stop offset="100%" stopColor="#e1bee7" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Bed */}
      <Rect x="10" y="100" width="140" height="80" rx="5" fill="#8d6e63" />
      <Rect x="15" y="90" width="130" height="20" rx="3" fill="#ffffff" />
      <Rect x="20" y="110" width="120" height="60" rx="2" fill="#e8eaf6" />
      {/* Pillow */}
      <Ellipse cx="50" cy="105" rx="25" ry="10" fill="#ffffff" />
      <Ellipse cx="110" cy="105" rx="25" ry="10" fill="#ffffff" />
      {/* Nightstand */}
      <Rect x="160" y="130" width="30" height="50" fill="#5d4037" />
      <Circle cx="175" cy="145" r="3" fill="#ffd700" />
      {/* Window */}
      <Rect x="20" y="10" width="60" height="50" rx="2" fill="#87ceeb" stroke="#8d6e63" strokeWidth={2} />
      <Path d="M 50 10 L 50 60" stroke="#8d6e63" strokeWidth={1} />
    </G>
  );
}

/**
 * Renders a kitchen scene
 */
function KitchenScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#fff8e1" />
          <Stop offset="100%" stopColor="#ffecb3" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Cabinets */}
      <Rect x="0" y="10" width="200" height="60" fill="#8d6e63" />
      <Rect x="10" y="15" width="40" height="50" rx="2" fill="#a1887f" />
      <Rect x="60" y="15" width="40" height="50" rx="2" fill="#a1887f" />
      <Rect x="110" y="15" width="40" height="50" rx="2" fill="#a1887f" />
      <Rect x="160" y="15" width="35" height="50" rx="2" fill="#a1887f" />
      {/* Counter */}
      <Rect x="0" y="140" width="200" height="60" fill="#bcaaa4" />
      <Rect x="0" y="140" width="200" height="5" fill="#8d6e63" />
      {/* Stove */}
      <Rect x="80" y="145" width="60" height="50" fill="#424242" />
      <Circle cx="95" cy="165" r="8" fill="#616161" />
      <Circle cx="125" cy="165" r="8" fill="#616161" />
    </G>
  );
}

/**
 * Renders a living room scene
 */
function LivingRoomScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#efebe9" />
          <Stop offset="100%" stopColor="#d7ccc8" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Couch */}
      <Rect x="5" y="120" width="130" height="55" rx="8" fill="#5d4037" />
      <Rect x="10" y="125" width="55" height="40" rx="4" fill="#795548" />
      <Rect x="70" y="125" width="55" height="40" rx="4" fill="#795548" />
      {/* Coffee table */}
      <Rect x="45" y="180" width="50" height="15" rx="2" fill="#3e2723" />
      {/* TV */}
      <Rect x="155" y="60" width="40" height="80" rx="2" fill="#212121" />
      <Rect x="158" y="63" width="34" height="70" fill="#4fc3f7" />
      {/* Floor lamp */}
      <Rect x="150" y="90" width="4" height="90" fill="#9e9e9e" />
      <Ellipse cx="152" cy="85" rx="15" ry="10" fill="#fff9c4" />
    </G>
  );
}

/**
 * Renders a classroom scene
 */
function ClassroomScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#e3f2fd" />
          <Stop offset="100%" stopColor="#bbdefb" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Chalkboard */}
      <Rect x="20" y="10" width="160" height="80" rx="2" fill="#2e7d32" stroke="#5d4037" strokeWidth={4} />
      <Path d="M 40 40 L 160 40" stroke="#ffffff" strokeWidth={1} opacity={0.5} />
      <Path d="M 40 60 L 140 60" stroke="#ffffff" strokeWidth={1} opacity={0.5} />
      {/* Desk */}
      <Rect x="30" y="130" width="60" height="40" fill="#8d6e63" />
      <Rect x="110" y="130" width="60" height="40" fill="#8d6e63" />
      {/* Clock */}
      <Circle cx="180" cy="30" r="12" fill="#ffffff" stroke="#000" strokeWidth={1} />
      <Path d="M 180 30 L 180 22 M 180 30 L 186 30" stroke="#000" strokeWidth={1.5} />
    </G>
  );
}

/**
 * Renders a library scene
 */
function LibraryScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#d7ccc8" />
          <Stop offset="100%" stopColor="#a1887f" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Bookshelf */}
      <Rect x="10" y="10" width="80" height="180" fill="#5d4037" />
      <Rect x="15" y="15" width="70" height="40" fill="#3e2723" />
      <Rect x="15" y="60" width="70" height="40" fill="#3e2723" />
      <Rect x="15" y="105" width="70" height="40" fill="#3e2723" />
      <Rect x="15" y="150" width="70" height="35" fill="#3e2723" />
      {/* Books */}
      {[20, 28, 36, 50, 60].map((x, i) => (
        <Rect key={`book1_${i}`} x={x} y="18" width={6} height={35} fill={['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'][i]} />
      ))}
      {[18, 26, 38, 48, 58, 68].map((x, i) => (
        <Rect key={`book2_${i}`} x={x} y="63" width={7} height={35} fill={['#1abc9c', '#e67e22', '#3f51b5', '#e91e63', '#00bcd4', '#8bc34a'][i]} />
      ))}
      {/* Reading lamp */}
      <Rect x="120" y="150" width="4" height="40" fill="#9e9e9e" />
      <Ellipse cx="122" cy="145" rx="12" ry="8" fill="#ffeb3b" />
      {/* Reading chair */}
      <Path d="M 110 180 Q 130 170 150 180 L 150 200 L 110 200 Z" fill="#795548" />
    </G>
  );
}

/**
 * Renders a park scene
 */
function ParkScene({ gradientId, grassGradId }: { gradientId: string; grassGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#81d4fa" />
          <Stop offset="100%" stopColor="#b3e5fc" />
        </LinearGradient>
        <LinearGradient id={grassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#66bb6a" />
          <Stop offset="100%" stopColor="#43a047" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="110" fill={`url(#${gradientId})`} />
      {/* Sun */}
      <Circle cx="170" cy="30" r="18" fill="#ffd54f" />
      {/* Grass */}
      <Rect x="0" y="110" width="200" height="90" fill={`url(#${grassGradId})`} />
      {/* Path */}
      <Path d="M 80 200 Q 100 150 90 110" stroke="#d7ccc8" strokeWidth={20} fill="none" />
      {/* Trees */}
      <Rect x="25" y="80" width="8" height="40" fill="#5d4037" />
      <Circle cx="29" cy="65" r="22" fill="#2e7d32" />
      <Rect x="150" y="90" width="6" height="30" fill="#5d4037" />
      <Circle cx="153" cy="78" r="18" fill="#388e3c" />
      {/* Bench */}
      <Rect x="55" y="150" width="40" height="8" fill="#8d6e63" />
      <Rect x="57" y="158" width="5" height="15" fill="#5d4037" />
      <Rect x="88" y="158" width="5" height="15" fill="#5d4037" />
    </G>
  );
}

/**
 * Renders a forest scene
 */
function ForestScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1b5e20" />
          <Stop offset="50%" stopColor="#2e7d32" />
          <Stop offset="100%" stopColor="#1b5e20" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Background trees */}
      {[20, 60, 100, 140, 180].map((x, i) => (
        <G key={`tree_${i}`}>
          <Rect x={x - 3} y={80 + (i % 2) * 20} width="6" height="120" fill="#4e342e" />
          <Path d={`M ${x} ${40 + (i % 2) * 20} L ${x - 25} ${90 + (i % 2) * 20} L ${x + 25} ${90 + (i % 2) * 20} Z`} fill="#1b5e20" />
          <Path d={`M ${x} ${20 + (i % 2) * 20} L ${x - 20} ${60 + (i % 2) * 20} L ${x + 20} ${60 + (i % 2) * 20} Z`} fill="#2e7d32" />
        </G>
      ))}
      {/* Forest floor */}
      <Ellipse cx="30" cy="185" rx="15" ry="5" fill="#33691e" opacity={0.6} />
      <Ellipse cx="100" cy="190" rx="20" ry="6" fill="#33691e" opacity={0.6} />
      <Ellipse cx="160" cy="188" rx="12" ry="4" fill="#33691e" opacity={0.6} />
    </G>
  );
}

/**
 * Renders a mountain scene
 */
function MountainScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#64b5f6" />
          <Stop offset="100%" stopColor="#90caf9" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Mountains */}
      <Path d="M -20 200 L 60 60 L 100 120 L 140 40 L 220 200 Z" fill="#546e7a" />
      <Path d="M -10 200 L 50 80 L 80 130 L 130 55 L 210 200 Z" fill="#78909c" />
      {/* Snow caps */}
      <Path d="M 60 60 L 45 90 L 55 85 L 60 95 L 65 85 L 75 90 Z" fill="#ffffff" />
      <Path d="M 140 40 L 120 75 L 135 70 L 140 85 L 145 70 L 160 75 Z" fill="#ffffff" />
      {/* Pine trees */}
      {[30, 90, 170].map((x, i) => (
        <G key={`pine_${i}`}>
          <Rect x={x - 2} y="160" width="4" height="40" fill="#5d4037" />
          <Path d={`M ${x} 120 L ${x - 15} 165 L ${x + 15} 165 Z`} fill="#2e7d32" />
        </G>
      ))}
    </G>
  );
}

/**
 * Renders a sunset/sunrise scene
 */
function SunsetScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1a237e" />
          <Stop offset="30%" stopColor="#7b1fa2" />
          <Stop offset="50%" stopColor="#e91e63" />
          <Stop offset="70%" stopColor="#ff5722" />
          <Stop offset="100%" stopColor="#ffc107" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Sun */}
      <Circle cx="100" cy="140" r="35" fill="#ffc107" />
      <Circle cx="100" cy="140" r="30" fill="#ffeb3b" />
      {/* Sun reflection on water hint */}
      <Ellipse cx="100" cy="180" rx="40" ry="8" fill="#ffc107" opacity={0.4} />
      {/* Silhouette birds */}
      <Path d="M 30 60 Q 35 55 40 60 Q 45 55 50 60" stroke="#1a237e" strokeWidth={2} fill="none" />
      <Path d="M 150 80 Q 155 75 160 80 Q 165 75 170 80" stroke="#1a237e" strokeWidth={2} fill="none" />
    </G>
  );
}

/**
 * Renders a night sky scene
 */
function NightSkyScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0d1b2a" />
          <Stop offset="100%" stopColor="#1b263b" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Moon */}
      <Circle cx="150" cy="40" r="25" fill="#f5f5dc" />
      <Circle cx="158" cy="35" r="20" fill="#0d1b2a" />
      {/* Stars */}
      <StarsBackground width={200} height={200} />
      {/* Shooting star */}
      <Path d="M 20 30 L 60 50" stroke="#ffffff" strokeWidth={1.5} opacity={0.7} />
      <Circle cx="60" cy="50" r="2" fill="#ffffff" />
    </G>
  );
}

/**
 * Renders a restaurant scene
 */
function RestaurantScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#5d4037" />
          <Stop offset="100%" stopColor="#3e2723" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Table with tablecloth */}
      <Ellipse cx="100" cy="150" rx="70" ry="30" fill="#ffffff" />
      <Ellipse cx="100" cy="150" rx="60" ry="25" fill="#ffcdd2" />
      {/* Wine glasses */}
      <Path d="M 70 140 L 68 125 L 72 125 Z" fill="rgba(255,255,255,0.5)" />
      <Rect x="69" y="140" width="2" height="8" fill="#ccc" />
      <Path d="M 130 140 L 128 125 L 132 125 Z" fill="rgba(255,255,255,0.5)" />
      <Rect x="129" y="140" width="2" height="8" fill="#ccc" />
      {/* Candle */}
      <Rect x="97" y="125" width="6" height="15" fill="#fff8e1" />
      <Ellipse cx="100" cy="122" rx="4" ry="6" fill="#ff9800" />
      <Ellipse cx="100" cy="120" rx="2" ry="3" fill="#ffeb3b" />
      {/* Wall decoration */}
      <Rect x="20" y="20" width="40" height="50" rx="2" fill="#d4a574" stroke="#8d6e63" strokeWidth={2} />
      <Rect x="140" y="30" width="45" height="40" rx="2" fill="#d4a574" stroke="#8d6e63" strokeWidth={2} />
    </G>
  );
}

/**
 * Renders a concert/music scene
 */
function ConcertScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#7b1fa2" />
          <Stop offset="50%" stopColor="#4a148c" />
          <Stop offset="100%" stopColor="#12005e" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Stage lights */}
      <Path d="M 30 0 L 50 80 L 10 80 Z" fill="#e91e63" opacity={0.4} />
      <Path d="M 100 0 L 120 60 L 80 60 Z" fill="#00bcd4" opacity={0.4} />
      <Path d="M 170 0 L 190 80 L 150 80 Z" fill="#ffeb3b" opacity={0.4} />
      {/* Stage */}
      <Rect x="0" y="150" width="200" height="50" fill="#1a1a2e" />
      <Path d="M 0 150 L 200 150" stroke="#9c27b0" strokeWidth={3} />
      {/* Speaker stacks */}
      <Rect x="10" y="100" width="25" height="50" rx="2" fill="#212121" />
      <Rect x="165" y="100" width="25" height="50" rx="2" fill="#212121" />
      {/* Crowd silhouettes */}
      {[30, 50, 70, 90, 110, 130, 150, 170].map((x, i) => (
        <Circle key={`crowd_${i}`} cx={x} cy={180 + (i % 2) * 5} r={8} fill="#000" opacity={0.6} />
      ))}
    </G>
  );
}

/**
 * Renders a swimming pool scene
 */
function SwimmingPoolScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#29b6f6" />
          <Stop offset="50%" stopColor="#0288d1" />
          <Stop offset="100%" stopColor="#01579b" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Pool edge */}
      <Rect x="0" y="0" width="200" height="20" fill="#e0e0e0" />
      <Rect x="0" y="180" width="200" height="20" fill="#e0e0e0" />
      <Rect x="0" y="0" width="10" height="200" fill="#e0e0e0" />
      <Rect x="190" y="0" width="10" height="200" fill="#e0e0e0" />
      {/* Lane lines */}
      <Path d="M 50 20 L 50 180" stroke="#ffffff" strokeWidth={2} strokeDasharray="10,5" />
      <Path d="M 100 20 L 100 180" stroke="#ffffff" strokeWidth={2} strokeDasharray="10,5" />
      <Path d="M 150 20 L 150 180" stroke="#ffffff" strokeWidth={2} strokeDasharray="10,5" />
      {/* Water ripples */}
      {[40, 80, 120, 160].map((y, i) => (
        <Path key={`ripple_${i}`} d={`M 15 ${y} Q 50 ${y - 5} 85 ${y} Q 120 ${y + 5} 155 ${y} Q 180 ${y - 5} 185 ${y}`} stroke="#4fc3f7" strokeWidth={1} fill="none" opacity={0.5} />
      ))}
    </G>
  );
}

/**
 * Renders a stadium scene
 */
function StadiumScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1565c0" />
          <Stop offset="100%" stopColor="#0d47a1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Stadium lights */}
      <Rect x="10" y="10" width="8" height="80" fill="#37474f" />
      <Circle cx="14" cy="8" r="10" fill="#ffeb3b" opacity={0.8} />
      <Rect x="182" y="10" width="8" height="80" fill="#37474f" />
      <Circle cx="186" cy="8" r="10" fill="#ffeb3b" opacity={0.8} />
      {/* Crowd stands */}
      <Path d="M 0 80 L 0 40 L 50 60 L 50 100 Z" fill="#c62828" />
      <Path d="M 200 80 L 200 40 L 150 60 L 150 100 Z" fill="#1565c0" />
      {/* Field */}
      <Rect x="30" y="100" width="140" height="90" fill="#4caf50" />
      <Path d="M 100 100 L 100 190" stroke="#ffffff" strokeWidth={2} />
      <Circle cx="100" cy="145" r="20" fill="none" stroke="#ffffff" strokeWidth={2} />
      {/* Goal posts */}
      <Rect x="35" y="135" width="3" height="30" fill="#ffffff" />
      <Rect x="35" y="132" width="20" height="3" fill="#ffffff" />
      <Rect x="162" y="135" width="3" height="30" fill="#ffffff" />
      <Rect x="145" y="132" width="20" height="3" fill="#ffffff" />
    </G>
  );
}

/**
 * Renders a Christmas/winter holiday scene
 */
function ChristmasScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1a237e" />
          <Stop offset="100%" stopColor="#283593" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Snow ground */}
      <Path d="M 0 150 Q 50 145 100 150 Q 150 155 200 150 L 200 200 L 0 200 Z" fill="#e3f2fd" />
      {/* Christmas tree */}
      <Rect x="95" y="140" width="10" height="25" fill="#5d4037" />
      <Path d="M 100 40 L 60 100 L 75 100 L 50 140 L 150 140 L 125 100 L 140 100 Z" fill="#2e7d32" />
      {/* Star */}
      <Path d="M 100 30 L 103 40 L 113 40 L 105 47 L 108 57 L 100 50 L 92 57 L 95 47 L 87 40 L 97 40 Z" fill="#ffd700" />
      {/* Ornaments */}
      <Circle cx="85" cy="90" r="5" fill="#e74c3c" />
      <Circle cx="110" cy="100" r="5" fill="#3498db" />
      <Circle cx="95" cy="120" r="5" fill="#f1c40f" />
      <Circle cx="120" cy="115" r="4" fill="#9b59b6" />
      {/* Snowflakes */}
      {[20, 60, 140, 180].map((x, i) => (
        <G key={`snow_${i}`}>
          <Path d={`M ${x} ${30 + i * 15} L ${x} ${38 + i * 15} M ${x - 4} ${34 + i * 15} L ${x + 4} ${34 + i * 15}`} stroke="#ffffff" strokeWidth={1} />
        </G>
      ))}
    </G>
  );
}

/**
 * Renders a Halloween scene
 */
function HalloweenScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1a1a2e" />
          <Stop offset="50%" stopColor="#2d1b4e" />
          <Stop offset="100%" stopColor="#1a1a2e" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Moon */}
      <Circle cx="160" cy="35" r="25" fill="#ffd54f" />
      {/* Spooky tree */}
      <Rect x="20" y="100" width="15" height="100" fill="#3e2723" />
      <Path d="M 27 100 Q 0 60 20 50" stroke="#3e2723" strokeWidth={6} fill="none" />
      <Path d="M 27 90 Q 50 70 60 60" stroke="#3e2723" strokeWidth={5} fill="none" />
      <Path d="M 27 80 Q 10 50 5 40" stroke="#3e2723" strokeWidth={4} fill="none" />
      {/* Pumpkin */}
      <Ellipse cx="140" cy="175" rx="25" ry="20" fill="#ff5722" />
      <Rect x="137" y="152" width="6" height="10" fill="#4caf50" />
      <Path d="M 128 170 L 132 175 L 128 180" stroke="#1a1a2e" strokeWidth={2} fill="none" />
      <Path d="M 152 170 L 148 175 L 152 180" stroke="#1a1a2e" strokeWidth={2} fill="none" />
      <Path d="M 132 182 L 140 178 L 148 182" stroke="#1a1a2e" strokeWidth={2} fill="none" />
      {/* Bats */}
      <Path d="M 70 50 Q 75 45 80 50 Q 85 45 90 50" fill="#1a1a2e" />
      <Path d="M 120 70 Q 125 65 130 70 Q 135 65 140 70" fill="#1a1a2e" />
      {/* Tombstones */}
      <Path d="M 80 160 L 80 190 L 100 190 L 100 160 Q 90 150 80 160" fill="#607d8b" />
      <Path d="M 84 170 L 96 170 M 84 175 L 92 175" stroke="#455a64" strokeWidth={1} />
    </G>
  );
}

/**
 * Renders a Valentine's Day scene
 */
function ValentinesScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="70%">
          <Stop offset="0%" stopColor="#f8bbd9" />
          <Stop offset="100%" stopColor="#f48fb1" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Large heart */}
      <Path d="M 100 50 C 85 30 50 30 50 70 C 50 100 100 140 100 140 C 100 140 150 100 150 70 C 150 30 115 30 100 50"
            fill="#e91e63" />
      <Path d="M 100 55 C 88 40 65 40 65 70" stroke="#f48fb1" strokeWidth={3} fill="none" opacity={0.5} />
      {/* Floating hearts */}
      <HeartsBackground width={200} height={200} />
      {/* Sparkles */}
      {[30, 170, 50, 150].map((x, i) => (
        <Path key={`sparkle_${i}`} d={`M ${x} ${40 + i * 30} L ${x} ${50 + i * 30} M ${x - 5} ${45 + i * 30} L ${x + 5} ${45 + i * 30}`} stroke="#ffd700" strokeWidth={2} />
      ))}
    </G>
  );
}

/**
 * Renders a polka dot pattern background
 */
function PolkaDotsScene({ sceneColor = '#e3f2fd' }: { sceneColor?: string }) {
  const dots: JSX.Element[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const x = col * 22 + (row % 2 === 0 ? 0 : 11);
      const y = row * 22;
      dots.push(
        <Circle key={`dot_${row}_${col}`} cx={x} cy={y} r={4} fill={sceneColor} opacity={0.6} />
      );
    }
  }
  return (
    <G>
      <Rect x="0" y="0" width="200" height="200" fill="#ffffff" />
      {dots}
    </G>
  );
}

/**
 * Renders a striped pattern background
 */
function StripesScene({ sceneColor = '#e3f2fd' }: { sceneColor?: string }) {
  const stripes: JSX.Element[] = [];
  for (let i = 0; i < 15; i++) {
    stripes.push(
      <Rect key={`stripe_${i}`} x={i * 15} y="0" width="8" height="200" fill={sceneColor} opacity={0.5} />
    );
  }
  return (
    <G>
      <Rect x="0" y="0" width="200" height="200" fill="#ffffff" />
      {stripes}
    </G>
  );
}

/**
 * Renders a galaxy/nebula scene
 */
function GalaxyScene({ gradientId, nebulaId }: { gradientId: string; nebulaId: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId} cx="30%" cy="30%" r="80%">
          <Stop offset="0%" stopColor="#4a148c" />
          <Stop offset="50%" stopColor="#1a237e" />
          <Stop offset="100%" stopColor="#0d1b2a" />
        </RadialGradient>
        <RadialGradient id={nebulaId} cx="70%" cy="60%" r="50%">
          <Stop offset="0%" stopColor="#e91e63" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#e91e63" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Nebula clouds */}
      <Ellipse cx="150" cy="120" rx="60" ry="40" fill={`url(#${nebulaId})`} />
      <Ellipse cx="50" cy="60" rx="40" ry="30" fill="#00bcd4" opacity={0.2} />
      {/* Stars */}
      <StarsBackground width={200} height={200} />
      {/* Spiral galaxy hint */}
      <Path d="M 100 100 Q 120 80 140 100 Q 120 120 100 100" stroke="#ffffff" strokeWidth={0.5} fill="none" opacity={0.3} />
    </G>
  );
}

/**
 * Renders an underwater scene
 */
function UnderwaterScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#4fc3f7" />
          <Stop offset="50%" stopColor="#0288d1" />
          <Stop offset="100%" stopColor="#01579b" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Light rays */}
      <Path d="M 50 0 L 70 100" stroke="#ffffff" strokeWidth={15} opacity={0.1} />
      <Path d="M 120 0 L 130 80" stroke="#ffffff" strokeWidth={20} opacity={0.08} />
      {/* Bubbles */}
      {[
        { cx: 30, cy: 150, r: 4 },
        { cx: 35, cy: 130, r: 3 },
        { cx: 28, cy: 110, r: 2 },
        { cx: 150, cy: 160, r: 5 },
        { cx: 155, cy: 140, r: 3 },
        { cx: 148, cy: 120, r: 2 },
      ].map((b, i) => (
        <Circle key={`bubble_${i}`} cx={b.cx} cy={b.cy} r={b.r} fill="#ffffff" opacity={0.4} />
      ))}
      {/* Seaweed */}
      <Path d="M 20 200 Q 25 180 20 160 Q 15 140 20 120" stroke="#2e7d32" strokeWidth={4} fill="none" />
      <Path d="M 35 200 Q 40 175 35 150 Q 30 125 35 100" stroke="#388e3c" strokeWidth={4} fill="none" />
      <Path d="M 170 200 Q 175 185 170 170 Q 165 155 170 140" stroke="#2e7d32" strokeWidth={4} fill="none" />
      {/* Fish silhouettes */}
      <Ellipse cx="100" cy="80" rx="12" ry="6" fill="#ffeb3b" opacity={0.6} />
      <Path d="M 85 80 L 78 75 L 78 85 Z" fill="#ffeb3b" opacity={0.6} />
      <Ellipse cx="140" cy="140" rx="8" ry="4" fill="#f48fb1" opacity={0.5} />
      <Path d="M 130 140 L 125 137 L 125 143 Z" fill="#f48fb1" opacity={0.5} />
    </G>
  );
}

/**
 * Renders a neon city scene
 */
function NeonCityScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0d1b2a" />
          <Stop offset="100%" stopColor="#1b263b" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Buildings silhouette */}
      <Path d="M 0 200 L 0 100 L 25 100 L 25 80 L 40 80 L 40 120 L 60 120 L 60 60 L 80 60 L 80 90 L 100 90 L 100 50 L 120 50 L 120 70 L 140 70 L 140 100 L 160 100 L 160 80 L 180 80 L 180 110 L 200 110 L 200 200 Z"
            fill="#0d1b2a" />
      {/* Neon signs */}
      <Rect x="65" y="75" width="10" height="10" fill="none" stroke="#e91e63" strokeWidth={2} />
      <Rect x="105" y="60" width="10" height="8" fill="none" stroke="#00bcd4" strokeWidth={2} />
      <Circle cx="145" cy="85" r="5" fill="none" stroke="#ffeb3b" strokeWidth={2} />
      {/* Neon lights glow */}
      <Circle cx="70" cy="80" r="12" fill="#e91e63" opacity={0.2} />
      <Circle cx="110" cy="64" r="10" fill="#00bcd4" opacity={0.2} />
      <Circle cx="145" cy="85" r="10" fill="#ffeb3b" opacity={0.2} />
      {/* Street */}
      <Rect x="0" y="180" width="200" height="20" fill="#1b263b" />
      <Path d="M 0 190 L 200 190" stroke="#ffeb3b" strokeWidth={2} strokeDasharray="15,10" />
    </G>
  );
}

// ============================================================================
// PHASE 4.1 EXPANSION - New Scene Renderers
// ============================================================================

/**
 * Renders a spring scene with flowers and butterflies
 */
function SpringScene({ gradientId, grassGradId }: { gradientId: string; grassGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#b5e8f7" />
        </LinearGradient>
        <LinearGradient id={grassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#90ee90" />
          <Stop offset="100%" stopColor="#228b22" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="130" fill={`url(#${gradientId})`} />
      {/* Sun */}
      <Circle cx="160" cy="35" r="22" fill="#fff44f" />
      {/* Grass */}
      <Rect x="0" y="130" width="200" height="70" fill={`url(#${grassGradId})`} />
      {/* Flowers */}
      {[30, 70, 120, 160].map((x, i) => (
        <G key={`flower_${i}`}>
          <Rect x={x - 1} y="145" width="2" height="20" fill="#228b22" />
          <Circle cx={x} cy="142" r="6" fill={['#ff69b4', '#ffeb3b', '#ff6b6b', '#9370db'][i]} />
          <Circle cx={x} cy="142" r="2" fill="#ffd700" />
        </G>
      ))}
      {/* Butterflies */}
      <G transform="translate(50, 60)">
        <Ellipse cx="0" cy="0" rx="6" ry="4" fill="#ff69b4" opacity={0.8} />
        <Ellipse cx="-8" cy="-2" rx="4" ry="3" fill="#ff69b4" opacity={0.8} />
        <Ellipse cx="8" cy="-2" rx="4" ry="3" fill="#ff69b4" opacity={0.8} />
      </G>
      <G transform="translate(140, 80)">
        <Ellipse cx="0" cy="0" rx="5" ry="3" fill="#87ceeb" opacity={0.8} />
        <Ellipse cx="-6" cy="-1" rx="3" ry="2" fill="#87ceeb" opacity={0.8} />
        <Ellipse cx="6" cy="-1" rx="3" ry="2" fill="#87ceeb" opacity={0.8} />
      </G>
    </G>
  );
}

/**
 * Renders a summer beach scene
 */
function SummerScene({ gradientId, sandGradId }: { gradientId: string; sandGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#00bfff" />
          <Stop offset="100%" stopColor="#87ceeb" />
        </LinearGradient>
        <LinearGradient id={sandGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#f4d03f" />
          <Stop offset="100%" stopColor="#d4ac0d" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="100" fill={`url(#${gradientId})`} />
      {/* Sun */}
      <Circle cx="160" cy="30" r="25" fill="#ffd700" />
      {/* Ocean */}
      <Rect x="0" y="100" width="200" height="40" fill="#1e90ff" />
      <Path d="M 0 115 Q 25 110 50 115 Q 75 120 100 115 Q 125 110 150 115 Q 175 120 200 115"
            stroke="#ffffff" strokeWidth={2} fill="none" opacity={0.5} />
      {/* Beach */}
      <Rect x="0" y="140" width="200" height="60" fill={`url(#${sandGradId})`} />
      {/* Beach umbrella */}
      <Rect x="138" y="145" width="4" height="45" fill="#8b4513" />
      <Path d="M 100 145 Q 140 120 180 145" fill="#ff6347" />
      <Path d="M 110 145 Q 140 125 170 145" fill="#ffffff" />
      {/* Beach ball */}
      <Circle cx="50" cy="165" r="12" fill="#ff6347" />
      <Path d="M 38 165 Q 50 155 62 165" fill="#ffffff" />
      <Path d="M 38 165 Q 50 175 62 165" fill="#3498db" />
    </G>
  );
}

/**
 * Renders an autumn scene with falling leaves
 */
function AutumnScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffa07a" />
          <Stop offset="50%" stopColor="#ff8c00" />
          <Stop offset="100%" stopColor="#8b4513" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Tree */}
      <Rect x="90" y="100" width="20" height="100" fill="#5d4037" />
      <Circle cx="100" cy="70" r="50" fill="#ff6b35" />
      <Circle cx="70" cy="90" r="30" fill="#d35400" />
      <Circle cx="130" cy="90" r="30" fill="#d35400" />
      {/* Falling leaves */}
      {[
        { x: 20, y: 40, color: '#ff6347', rot: 45 },
        { x: 50, y: 80, color: '#ffa500', rot: -30 },
        { x: 170, y: 50, color: '#d35400', rot: 60 },
        { x: 150, y: 120, color: '#ff6347', rot: -45 },
        { x: 30, y: 150, color: '#ffa500', rot: 20 },
        { x: 180, y: 160, color: '#d35400', rot: -60 },
      ].map((leaf, i) => (
        <Path
          key={`leaf_${i}`}
          d={`M ${leaf.x} ${leaf.y} Q ${leaf.x + 5} ${leaf.y - 3} ${leaf.x + 8} ${leaf.y} Q ${leaf.x + 5} ${leaf.y + 3} ${leaf.x} ${leaf.y}`}
          fill={leaf.color}
          transform={`rotate(${leaf.rot}, ${leaf.x + 4}, ${leaf.y})`}
        />
      ))}
    </G>
  );
}

/**
 * Renders a birthday celebration scene
 */
function BirthdayScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="70%">
          <Stop offset="0%" stopColor="#ff69b4" />
          <Stop offset="100%" stopColor="#da70d6" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Confetti */}
      <ConfettiBackground width={200} height={200} />
      {/* Birthday cake */}
      <Rect x="60" y="130" width="80" height="50" rx="5" fill="#f5deb3" />
      <Rect x="60" y="130" width="80" height="15" rx="3" fill="#ff69b4" />
      <Rect x="65" y="145" width="70" height="8" fill="#ffffff" />
      {/* Candles */}
      {[75, 95, 115].map((x, i) => (
        <G key={`candle_${i}`}>
          <Rect x={x} y="110" width="6" height="22" fill={['#ff6b6b', '#4ecdc4', '#f7dc6f'][i]} />
          <Ellipse cx={x + 3} cy="107" rx="3" ry="5" fill="#ffa500" />
          <Ellipse cx={x + 3} cy="105" rx="1.5" ry="3" fill="#ffff00" />
        </G>
      ))}
      {/* Banner */}
      <Path d="M 20 30 L 50 45 L 80 30 L 110 45 L 140 30 L 170 45 L 180 35"
            stroke="#ff1493" strokeWidth={6} fill="none" />
      {/* Balloons */}
      <G>
        <Ellipse cx="30" cy="70" rx="15" ry="18" fill="#ff6b6b" />
        <Path d="M 30 88 Q 32 100 28 110" stroke="#ff6b6b" strokeWidth={1} fill="none" />
      </G>
      <G>
        <Ellipse cx="170" cy="60" rx="15" ry="18" fill="#4ecdc4" />
        <Path d="M 170 78 Q 172 90 168 100" stroke="#4ecdc4" strokeWidth={1} fill="none" />
      </G>
    </G>
  );
}

/**
 * Renders a New Year celebration scene
 */
function NewYearScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0d1b2a" />
          <Stop offset="100%" stopColor="#1b263b" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Stars */}
      <StarsBackground width={200} height={200} />
      {/* Fireworks */}
      <G>
        {/* Red firework */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <Path
            key={`fw1_${i}`}
            d={`M 50 60 L ${50 + 20 * Math.cos(angle * Math.PI / 180)} ${60 + 20 * Math.sin(angle * Math.PI / 180)}`}
            stroke="#ff6b6b"
            strokeWidth={2}
          />
        ))}
        {/* Gold firework */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <Path
            key={`fw2_${i}`}
            d={`M 150 40 L ${150 + 25 * Math.cos(angle * Math.PI / 180)} ${40 + 25 * Math.sin(angle * Math.PI / 180)}`}
            stroke="#ffd700"
            strokeWidth={2}
          />
        ))}
        {/* Blue firework */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <Path
            key={`fw3_${i}`}
            d={`M 100 90 L ${100 + 18 * Math.cos(angle * Math.PI / 180)} ${90 + 18 * Math.sin(angle * Math.PI / 180)}`}
            stroke="#00bfff"
            strokeWidth={2}
          />
        ))}
      </G>
      {/* Champagne glasses */}
      <G transform="translate(70, 150)">
        <Path d="M 0 0 L -8 -25 L 8 -25 Z" fill="rgba(255,255,255,0.3)" stroke="#ffd700" strokeWidth={1} />
        <Rect x="-2" y="0" width="4" height="15" fill="#ffd700" />
        <Ellipse cx="0" cy="15" rx="8" ry="3" fill="#ffd700" />
      </G>
      <G transform="translate(130, 150)">
        <Path d="M 0 0 L -8 -25 L 8 -25 Z" fill="rgba(255,255,255,0.3)" stroke="#ffd700" strokeWidth={1} />
        <Rect x="-2" y="0" width="4" height="15" fill="#ffd700" />
        <Ellipse cx="0" cy="15" rx="8" ry="3" fill="#ffd700" />
      </G>
    </G>
  );
}

/**
 * Renders an Easter scene
 */
function EasterScene({ gradientId, grassGradId }: { gradientId: string; grassGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#e0f7fa" />
        </LinearGradient>
        <LinearGradient id={grassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#90ee90" />
          <Stop offset="100%" stopColor="#32cd32" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="130" fill={`url(#${gradientId})`} />
      {/* Sun */}
      <Circle cx="160" cy="35" r="20" fill="#fff44f" />
      {/* Grass */}
      <Rect x="0" y="130" width="200" height="70" fill={`url(#${grassGradId})`} />
      {/* Easter eggs */}
      {[
        { x: 30, y: 160, color1: '#ff69b4', color2: '#ffb6c1' },
        { x: 70, y: 155, color1: '#87ceeb', color2: '#b0e0e6' },
        { x: 110, y: 165, color1: '#ffd700', color2: '#fffacd' },
        { x: 150, y: 158, color1: '#98fb98', color2: '#90ee90' },
        { x: 180, y: 162, color1: '#dda0dd', color2: '#e6e6fa' },
      ].map((egg, i) => (
        <G key={`egg_${i}`}>
          <Ellipse cx={egg.x} cy={egg.y} rx="10" ry="13" fill={egg.color1} />
          <Path d={`M ${egg.x - 8} ${egg.y} Q ${egg.x} ${egg.y - 5} ${egg.x + 8} ${egg.y}`} stroke={egg.color2} strokeWidth={3} fill="none" />
          <Circle cx={egg.x - 3} cy={egg.y + 3} r="2" fill={egg.color2} />
          <Circle cx={egg.x + 4} cy={egg.y + 5} r="2" fill={egg.color2} />
        </G>
      ))}
      {/* Bunny ears peeking */}
      <Ellipse cx="90" cy="115" rx="6" ry="20" fill="#fff" stroke="#ffb6c1" strokeWidth={1} />
      <Ellipse cx="110" cy="115" rx="6" ry="20" fill="#fff" stroke="#ffb6c1" strokeWidth={1} />
    </G>
  );
}

/**
 * Renders a garden scene
 */
function GardenScene({ gradientId, grassGradId }: { gradientId: string; grassGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#b0e0e6" />
        </LinearGradient>
        <LinearGradient id={grassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#228b22" />
          <Stop offset="100%" stopColor="#006400" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="100" fill={`url(#${gradientId})`} />
      {/* Garden fence */}
      <Rect x="0" y="100" width="200" height="5" fill="#8b4513" />
      {[10, 40, 70, 100, 130, 160, 190].map((x, i) => (
        <Rect key={`fence_${i}`} x={x - 3} y="70" width="6" height="35" fill="#deb887" />
      ))}
      {/* Ground */}
      <Rect x="0" y="105" width="200" height="95" fill={`url(#${grassGradId})`} />
      {/* Flower rows */}
      {[125, 155, 185].map((y, row) => (
        <G key={`row_${row}`}>
          {[20, 50, 80, 110, 140, 170].map((x, i) => (
            <G key={`flower_${row}_${i}`}>
              <Rect x={x - 1} y={y - 15} width="2" height="15" fill="#228b22" />
              <Circle cx={x} cy={y - 18} r="5" fill={['#ff69b4', '#ff6347', '#ffd700', '#9370db', '#ff69b4', '#ff6347'][(i + row) % 6]} />
              <Circle cx={x} cy={y - 18} r="2" fill="#ffff00" />
            </G>
          ))}
        </G>
      ))}
      {/* Watering can */}
      <Ellipse cx="170" cy="115" rx="12" ry="8" fill="#7b68ee" />
      <Rect x="175" y="107" width="3" height="10" fill="#7b68ee" />
      <Path d="M 178 107 L 185 100" stroke="#7b68ee" strokeWidth={2} />
    </G>
  );
}

/**
 * Renders a meadow scene
 */
function MeadowScene({ gradientId, grassGradId }: { gradientId: string; grassGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#98fb98" />
        </LinearGradient>
        <LinearGradient id={grassGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#7cfc00" />
          <Stop offset="100%" stopColor="#228b22" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="100" fill={`url(#${gradientId})`} />
      {/* Distant hills */}
      <Path d="M 0 100 Q 50 70 100 90 Q 150 70 200 100 Z" fill="#90ee90" />
      {/* Grass */}
      <Rect x="0" y="95" width="200" height="105" fill={`url(#${grassGradId})`} />
      {/* Wildflowers */}
      {Array.from({ length: 25 }, (_, i) => ({
        x: 10 + (i % 8) * 25 + Math.sin(i) * 10,
        y: 110 + Math.floor(i / 8) * 30 + Math.cos(i) * 5,
        color: ['#ff69b4', '#fff44f', '#ff6347', '#9370db', '#fff'][i % 5],
        size: 3 + (i % 3),
      })).map((f, i) => (
        <Circle key={`wf_${i}`} cx={f.x} cy={f.y} r={f.size} fill={f.color} />
      ))}
      {/* Butterflies */}
      <G transform="translate(80, 70) scale(0.8)">
        <Ellipse cx="0" cy="0" rx="8" ry="5" fill="#ffa500" opacity={0.8} />
        <Ellipse cx="-10" cy="-3" rx="5" ry="4" fill="#ffa500" opacity={0.8} />
        <Ellipse cx="10" cy="-3" rx="5" ry="4" fill="#ffa500" opacity={0.8} />
      </G>
    </G>
  );
}

/**
 * Renders a lake scene
 */
function LakeScene({ gradientId, waterGradId }: { gradientId: string; waterGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#b0e0e6" />
        </LinearGradient>
        <LinearGradient id={waterGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#4169e1" />
          <Stop offset="100%" stopColor="#000080" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="80" fill={`url(#${gradientId})`} />
      {/* Mountains */}
      <Path d="M 0 80 L 40 30 L 80 70 L 120 20 L 160 60 L 200 40 L 200 80 Z" fill="#708090" />
      <Path d="M 120 20 L 110 35 L 130 35 Z" fill="#fff" />
      {/* Lake */}
      <Ellipse cx="100" cy="140" rx="95" ry="55" fill={`url(#${waterGradId})`} />
      {/* Reflections */}
      <Path d="M 30 130 Q 100 110 170 130" stroke="#ffffff" strokeWidth={1} fill="none" opacity={0.3} />
      <Path d="M 40 150 Q 100 135 160 150" stroke="#ffffff" strokeWidth={1} fill="none" opacity={0.2} />
      {/* Shoreline */}
      <Path d="M 0 100 Q 30 95 50 100 Q 70 105 100 95 Q 130 85 150 95 Q 180 105 200 95 L 200 200 L 0 200 Z" fill="#228b22" />
      {/* Trees on shore */}
      <Rect x="15" y="85" width="6" height="25" fill="#5d4037" />
      <Circle cx="18" cy="75" r="15" fill="#228b22" />
      <Rect x="175" y="80" width="6" height="25" fill="#5d4037" />
      <Circle cx="178" cy="70" r="15" fill="#2e7d32" />
    </G>
  );
}

/**
 * Renders a cherry blossoms scene
 */
function CherryBlossomsScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffb7c5" />
          <Stop offset="100%" stopColor="#ffc0cb" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Cherry tree branches */}
      <Path d="M -10 180 Q 30 140 60 100 Q 80 70 100 50" stroke="#5d4037" strokeWidth={8} fill="none" />
      <Path d="M 60 100 Q 90 90 120 85" stroke="#5d4037" strokeWidth={4} fill="none" />
      <Path d="M 100 50 Q 130 40 150 45" stroke="#5d4037" strokeWidth={3} fill="none" />
      <Path d="M 100 50 Q 80 30 70 20" stroke="#5d4037" strokeWidth={3} fill="none" />
      {/* Cherry blossoms */}
      {[
        { x: 55, y: 95 }, { x: 70, y: 85 }, { x: 85, y: 75 }, { x: 100, y: 50 },
        { x: 115, y: 45 }, { x: 130, y: 42 }, { x: 145, y: 48 }, { x: 75, y: 25 },
        { x: 65, y: 15 }, { x: 120, y: 80 }, { x: 95, y: 65 }, { x: 140, y: 55 },
      ].map((b, i) => (
        <G key={`blossom_${i}`}>
          <Circle cx={b.x} cy={b.y} r="6" fill="#ffb7c5" />
          <Circle cx={b.x - 5} cy={b.y - 2} r="4" fill="#ffc0cb" />
          <Circle cx={b.x + 5} cy={b.y - 2} r="4" fill="#ffc0cb" />
          <Circle cx={b.x - 3} cy={b.y + 4} r="4" fill="#ffc0cb" />
          <Circle cx={b.x + 3} cy={b.y + 4} r="4" fill="#ffc0cb" />
          <Circle cx={b.x} cy={b.y} r="2" fill="#ffeb3b" />
        </G>
      ))}
      {/* Falling petals */}
      {[
        { x: 30, y: 60 }, { x: 160, y: 40 }, { x: 180, y: 100 },
        { x: 20, y: 130 }, { x: 170, y: 150 }, { x: 40, y: 170 },
      ].map((p, i) => (
        <Ellipse key={`petal_${i}`} cx={p.x} cy={p.y} rx="3" ry="5" fill="#ffb7c5" opacity={0.7} transform={`rotate(${i * 30}, ${p.x}, ${p.y})`} />
      ))}
    </G>
  );
}

/**
 * Renders a snowy landscape scene
 */
function SnowyLandscapeScene({ gradientId, snowGradId }: { gradientId: string; snowGradId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#b0c4de" />
          <Stop offset="100%" stopColor="#e0e8f0" />
        </LinearGradient>
        <LinearGradient id={snowGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="100%" stopColor="#e8e8e8" />
        </LinearGradient>
      </Defs>
      {/* Sky */}
      <Rect x="0" y="0" width="200" height="100" fill={`url(#${gradientId})`} />
      {/* Snow hills */}
      <Path d="M 0 100 Q 50 70 100 90 Q 150 80 200 100 L 200 200 L 0 200 Z" fill={`url(#${snowGradId})`} />
      {/* Pine trees */}
      {[30, 100, 160].map((x, i) => (
        <G key={`tree_${i}`}>
          <Rect x={x - 3} y="100" width="6" height="30" fill="#5d4037" />
          <Path d={`M ${x} 50 L ${x - 20} 105 L ${x + 20} 105 Z`} fill="#2f4f4f" />
          <Path d={`M ${x} 40 L ${x - 15} 75 L ${x + 15} 75 Z`} fill="#2f4f4f" />
          {/* Snow on tree */}
          <Path d={`M ${x - 15} 75 L ${x} 55 L ${x + 15} 75`} stroke="#ffffff" strokeWidth={3} fill="none" />
        </G>
      ))}
      {/* Snowflakes */}
      {Array.from({ length: 20 }, (_, i) => ({
        x: 10 + (i * 47) % 190,
        y: 10 + (i * 31) % 90,
        size: 2 + (i % 3),
      })).map((s, i) => (
        <Circle key={`snow_${i}`} cx={s.x} cy={s.y} r={s.size} fill="#ffffff" opacity={0.8} />
      ))}
    </G>
  );
}

/**
 * Renders a cloudy sky scene
 */
function CloudsScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#b0e0e6" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Big fluffy clouds */}
      <G opacity={0.95}>
        <Ellipse cx="50" cy="50" rx="35" ry="20" fill="#ffffff" />
        <Ellipse cx="30" cy="55" rx="20" ry="15" fill="#ffffff" />
        <Ellipse cx="70" cy="55" rx="25" ry="15" fill="#ffffff" />
        <Ellipse cx="50" cy="65" rx="30" ry="12" fill="#ffffff" />
      </G>
      <G opacity={0.9}>
        <Ellipse cx="150" cy="80" rx="40" ry="22" fill="#ffffff" />
        <Ellipse cx="125" cy="85" rx="22" ry="16" fill="#ffffff" />
        <Ellipse cx="175" cy="85" rx="20" ry="14" fill="#ffffff" />
        <Ellipse cx="150" cy="95" rx="35" ry="14" fill="#ffffff" />
      </G>
      <G opacity={0.85}>
        <Ellipse cx="70" cy="140" rx="30" ry="18" fill="#ffffff" />
        <Ellipse cx="50" cy="145" rx="18" ry="12" fill="#ffffff" />
        <Ellipse cx="90" cy="145" rx="22" ry="14" fill="#ffffff" />
      </G>
      <G opacity={0.8}>
        <Ellipse cx="160" cy="160" rx="25" ry="15" fill="#ffffff" />
        <Ellipse cx="145" cy="165" rx="15" ry="10" fill="#ffffff" />
        <Ellipse cx="175" cy="165" rx="18" ry="12" fill="#ffffff" />
      </G>
    </G>
  );
}

/**
 * Renders a rainbow sky scene
 */
function RainbowSkyScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#87ceeb" />
          <Stop offset="100%" stopColor="#e0f7fa" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Rainbow arcs */}
      {[
        { color: '#ff0000', r: 140 },
        { color: '#ff7f00', r: 130 },
        { color: '#ffff00', r: 120 },
        { color: '#00ff00', r: 110 },
        { color: '#0000ff', r: 100 },
        { color: '#4b0082', r: 90 },
        { color: '#9400d3', r: 80 },
      ].map((arc, i) => (
        <Path
          key={`rainbow_${i}`}
          d={`M ${100 - arc.r} 200 A ${arc.r} ${arc.r} 0 0 1 ${100 + arc.r} 200`}
          fill="none"
          stroke={arc.color}
          strokeWidth={8}
          opacity={0.7}
        />
      ))}
      {/* Clouds at base */}
      <G opacity={0.95}>
        <Ellipse cx="30" cy="190" rx="35" ry="20" fill="#ffffff" />
        <Ellipse cx="10" cy="195" rx="20" ry="15" fill="#ffffff" />
        <Ellipse cx="50" cy="195" rx="25" ry="15" fill="#ffffff" />
      </G>
      <G opacity={0.95}>
        <Ellipse cx="170" cy="190" rx="35" ry="20" fill="#ffffff" />
        <Ellipse cx="150" cy="195" rx="20" ry="15" fill="#ffffff" />
        <Ellipse cx="190" cy="195" rx="25" ry="15" fill="#ffffff" />
      </G>
      {/* Sun peeking */}
      <Circle cx="160" cy="30" r="20" fill="#ffd700" opacity={0.9} />
    </G>
  );
}

/**
 * Renders a chevron pattern background
 */
function ChevronScene({ sceneColor = '#e3f2fd' }: { sceneColor?: string }) {
  const chevrons: JSX.Element[] = [];
  for (let row = 0; row < 12; row++) {
    const y = row * 18;
    chevrons.push(
      <Path
        key={`chevron_${row}`}
        d={`M 0 ${y + 9} L 20 ${y} L 40 ${y + 9} L 60 ${y} L 80 ${y + 9} L 100 ${y} L 120 ${y + 9} L 140 ${y} L 160 ${y + 9} L 180 ${y} L 200 ${y + 9} L 200 ${y + 18} L 180 ${y + 9} L 160 ${y + 18} L 140 ${y + 9} L 120 ${y + 18} L 100 ${y + 9} L 80 ${y + 18} L 60 ${y + 9} L 40 ${y + 18} L 20 ${y + 9} L 0 ${y + 18} Z`}
        fill={row % 2 === 0 ? sceneColor : adjustColor(sceneColor, -20)}
        opacity={0.6}
      />
    );
  }
  return (
    <G>
      <Rect x="0" y="0" width="200" height="200" fill="#ffffff" />
      {chevrons}
    </G>
  );
}

/**
 * Renders a floral pattern background
 */
function FloralScene({ sceneColor = '#ffb6c1' }: { sceneColor?: string }) {
  const flowers: JSX.Element[] = [];
  const positions = [
    { x: 25, y: 25 }, { x: 75, y: 25 }, { x: 125, y: 25 }, { x: 175, y: 25 },
    { x: 50, y: 70 }, { x: 100, y: 70 }, { x: 150, y: 70 },
    { x: 25, y: 115 }, { x: 75, y: 115 }, { x: 125, y: 115 }, { x: 175, y: 115 },
    { x: 50, y: 160 }, { x: 100, y: 160 }, { x: 150, y: 160 },
  ];

  positions.forEach((pos, i) => {
    const petalColor = i % 2 === 0 ? sceneColor : adjustColor(sceneColor, 20);
    flowers.push(
      <G key={`flower_${i}`}>
        {/* Petals */}
        {[0, 72, 144, 216, 288].map((angle, j) => (
          <Ellipse
            key={`petal_${i}_${j}`}
            cx={pos.x + 8 * Math.cos(angle * Math.PI / 180)}
            cy={pos.y + 8 * Math.sin(angle * Math.PI / 180)}
            rx="6"
            ry="10"
            fill={petalColor}
            opacity={0.7}
            transform={`rotate(${angle}, ${pos.x + 8 * Math.cos(angle * Math.PI / 180)}, ${pos.y + 8 * Math.sin(angle * Math.PI / 180)})`}
          />
        ))}
        {/* Center */}
        <Circle cx={pos.x} cy={pos.y} r="5" fill="#ffd700" />
      </G>
    );
  });

  return (
    <G>
      <Rect x="0" y="0" width="200" height="200" fill="#fff8f0" />
      {flowers}
    </G>
  );
}

/**
 * Renders a bokeh lights background
 */
function BokehScene({ gradientId }: { gradientId: string }) {
  return (
    <G>
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="70%">
          <Stop offset="0%" stopColor="#2c3e50" />
          <Stop offset="100%" stopColor="#1a1a2e" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="200" height="200" fill={`url(#${gradientId})`} />
      {/* Bokeh circles */}
      {[
        { x: 30, y: 40, r: 25, color: '#e74c3c', opacity: 0.3 },
        { x: 80, y: 30, r: 20, color: '#f39c12', opacity: 0.25 },
        { x: 150, y: 50, r: 30, color: '#3498db', opacity: 0.3 },
        { x: 40, y: 100, r: 18, color: '#9b59b6', opacity: 0.25 },
        { x: 100, y: 80, r: 35, color: '#2ecc71', opacity: 0.2 },
        { x: 170, y: 110, r: 22, color: '#e91e63', opacity: 0.3 },
        { x: 60, y: 150, r: 28, color: '#00bcd4', opacity: 0.25 },
        { x: 130, y: 160, r: 20, color: '#ff9800', opacity: 0.3 },
        { x: 180, y: 180, r: 15, color: '#8bc34a', opacity: 0.25 },
        { x: 20, y: 180, r: 24, color: '#ff5722', opacity: 0.2 },
        { x: 90, y: 130, r: 15, color: '#673ab7', opacity: 0.3 },
        { x: 155, y: 30, r: 12, color: '#ffc107', opacity: 0.35 },
      ].map((circle, i) => (
        <Circle
          key={`bokeh_${i}`}
          cx={circle.x}
          cy={circle.y}
          r={circle.r}
          fill={circle.color}
          opacity={circle.opacity}
        />
      ))}
    </G>
  );
}

/**
 * Main BackgroundRenderer component
 */
export const BackgroundRenderer = memo(function BackgroundRenderer({
  scene,
  sceneColor = '#f0f0f0',
  width = 200,
  height = 200,
}: BackgroundRendererProps) {
  // Use stable gradient IDs to prevent flickering
  const ids = useBackgroundIds(5);
  const [gradientId, secondaryId, tertiaryId, quaternaryId, quintenaryId] = ids;

  switch (scene) {
    case Scene.NONE:
      return null;

    case Scene.SOLID_COLOR:
      return <Rect x="0" y="0" width={width} height={height} fill={sceneColor} />;

    case Scene.GRADIENT:
      return (
        <G>
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={sceneColor} />
              <Stop offset="100%" stopColor={adjustColor(sceneColor, -40)} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradientId})`} />
        </G>
      );

    case Scene.CONFETTI:
      return (
        <G>
          <Rect x="0" y="0" width={width} height={height} fill="#ffffff" />
          <ConfettiBackground width={width} height={height} />
        </G>
      );

    case Scene.HEARTS:
      return (
        <G>
          <Rect x="0" y="0" width={width} height={height} fill="#fff0f5" />
          <HeartsBackground width={width} height={height} />
        </G>
      );

    case Scene.STARS:
      return (
        <G>
          <Rect x="0" y="0" width={width} height={height} fill="#1a1a2e" />
          <StarsBackground width={width} height={height} />
        </G>
      );

    case Scene.OFFICE:
      return <OfficeScene gradientId={gradientId} />;

    case Scene.HOME:
      return <HomeScene gradientId={gradientId} />;

    case Scene.BEACH:
      return <BeachScene gradientId={gradientId} sandGradId={secondaryId} />;

    case Scene.PARTY:
      return <PartyScene gradientId={gradientId} />;

    case Scene.CAFE:
      return <CafeScene gradientId={gradientId} />;

    case Scene.SPACE:
      return <SpaceScene gradientId={gradientId} />;

    case Scene.GYM:
      return <GymScene gradientId={gradientId} />;

    case Scene.CITY:
      return <CityScene gradientId={gradientId} />;

    case Scene.OUTDOORS:
      return <OutdoorsScene gradientId={gradientId} grassGradId={secondaryId} />;

    // ====================================================================
    // Phase 2 Expansion - Additional Scenes
    // ====================================================================

    // Living Spaces
    case Scene.BEDROOM:
      return <BedroomScene gradientId={gradientId} />;

    case Scene.KITCHEN:
      return <KitchenScene gradientId={gradientId} />;

    case Scene.LIVING_ROOM:
      return <LivingRoomScene gradientId={gradientId} />;

    // Work/School
    case Scene.CLASSROOM:
      return <ClassroomScene gradientId={gradientId} />;

    case Scene.LIBRARY:
      return <LibraryScene gradientId={gradientId} />;

    // Outdoor Nature
    case Scene.PARK:
      return <ParkScene gradientId={gradientId} grassGradId={secondaryId} />;

    case Scene.FOREST:
      return <ForestScene gradientId={gradientId} />;

    case Scene.MOUNTAIN:
      return <MountainScene gradientId={gradientId} />;

    case Scene.SUNSET:
    case Scene.SUNRISE:
      return <SunsetScene gradientId={gradientId} />;

    case Scene.NIGHT_SKY:
      return <NightSkyScene gradientId={gradientId} />;

    // Food/Entertainment
    case Scene.RESTAURANT:
      return <RestaurantScene gradientId={gradientId} />;

    case Scene.CONCERT:
      return <ConcertScene gradientId={gradientId} />;

    // Sports/Fitness
    case Scene.SWIMMING_POOL:
      return <SwimmingPoolScene gradientId={gradientId} />;

    case Scene.STADIUM:
      return <StadiumScene gradientId={gradientId} />;

    // Seasonal/Holiday
    case Scene.CHRISTMAS:
    case Scene.WINTER:
      return <ChristmasScene gradientId={gradientId} />;

    case Scene.HALLOWEEN:
      return <HalloweenScene gradientId={gradientId} />;

    case Scene.VALENTINES:
      return <ValentinesScene gradientId={gradientId} />;

    // Pattern Backgrounds
    case Scene.POLKA_DOTS:
      return <PolkaDotsScene sceneColor={sceneColor} />;

    case Scene.STRIPES:
      return <StripesScene sceneColor={sceneColor} />;

    // Fantasy/Abstract
    case Scene.GALAXY:
    case Scene.NEBULA:
      return <GalaxyScene gradientId={gradientId} nebulaId={secondaryId} />;

    case Scene.UNDERWATER:
    case Scene.CORAL_REEF:
      return <UnderwaterScene gradientId={gradientId} />;

    case Scene.NEON_CITY:
    case Scene.NEON:
      return <NeonCityScene gradientId={gradientId} />;

    // ====================================================================
    // Phase 4.1 Expansion - More Scenes
    // ====================================================================

    // Seasonal
    case Scene.SPRING:
      return <SpringScene gradientId={gradientId} grassGradId={secondaryId} />;

    case Scene.SUMMER:
      return <SummerScene gradientId={gradientId} sandGradId={secondaryId} />;

    case Scene.AUTUMN:
      return <AutumnScene gradientId={gradientId} />;

    // Holiday
    case Scene.BIRTHDAY:
      return <BirthdayScene gradientId={gradientId} />;

    case Scene.NEW_YEAR:
      return <NewYearScene gradientId={gradientId} />;

    case Scene.EASTER:
      return <EasterScene gradientId={gradientId} grassGradId={secondaryId} />;

    // Nature
    case Scene.GARDEN:
    case Scene.GARDEN_BOTANICAL:
      return <GardenScene gradientId={gradientId} grassGradId={secondaryId} />;

    case Scene.MEADOW:
      return <MeadowScene gradientId={gradientId} grassGradId={secondaryId} />;

    case Scene.LAKE:
      return <LakeScene gradientId={gradientId} waterGradId={secondaryId} />;

    case Scene.CHERRY_BLOSSOMS:
      return <CherryBlossomsScene gradientId={gradientId} />;

    case Scene.SNOWY_LANDSCAPE:
      return <SnowyLandscapeScene gradientId={gradientId} snowGradId={secondaryId} />;

    // Abstract/Sky
    case Scene.CLOUDS:
      return <CloudsScene gradientId={gradientId} />;

    case Scene.RAINBOW_SKY:
      return <RainbowSkyScene gradientId={gradientId} />;

    // Pattern Backgrounds
    case Scene.CHEVRON:
      return <ChevronScene sceneColor={sceneColor} />;

    case Scene.FLORAL:
      return <FloralScene sceneColor={sceneColor} />;

    case Scene.BOKEH:
      return <BokehScene gradientId={gradientId} />;

    default:
      return <Rect x="0" y="0" width={width} height={height} fill={sceneColor} />;
  }
});

/**
 * Utility to adjust color brightness
 */
function adjustColor(hex: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const color = hex.replace('#', '');
  const r = clamp(parseInt(color.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(color.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(color.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default BackgroundRenderer;
