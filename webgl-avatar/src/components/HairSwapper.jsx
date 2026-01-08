import React, { useState, useEffect, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Hair style definitions with paths to GLB files
 */
const HAIR_STYLES = [
  { id: 'short', name: 'Short', file: '/models/hair/short.glb' },
  { id: 'medium', name: 'Medium', file: '/models/hair/medium.glb' },
  { id: 'long', name: 'Long', file: '/models/hair/long.glb' },
  { id: 'curly', name: 'Curly', file: '/models/hair/curly.glb' },
  { id: 'wavy', name: 'Wavy', file: '/models/hair/wavy.glb' },
  { id: 'ponytail', name: 'Ponytail', file: '/models/hair/ponytail.glb' },
  { id: 'bun', name: 'Bun', file: '/models/hair/bun.glb' },
  { id: 'afro', name: 'Afro', file: '/models/hair/afro.glb' },
  { id: 'buzz', name: 'Buzz', file: '/models/hair/buzz.glb' },
  { id: 'bald', name: 'Bald', file: '/models/hair/bald.glb' },
];

/**
 * Hair color presets
 */
const HAIR_COLORS = {
  black: '#090806',
  darkBrown: '#3B3024',
  brown: '#6A4E42',
  lightBrown: '#A67B5B',
  blonde: '#E6BE8A',
  platinum: '#F5EEE6',
  red: '#8B3A3A',
  auburn: '#922724',
  gray: '#B8B8B8',
  white: '#F5F5F5',
};

/**
 * Single hair model component
 */
function HairModel({ url, color, scale = 1, position = [0, 0, 0] }) {
  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  // Apply hair color to all meshes
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        // Clone material to avoid affecting other instances
        child.material = child.material.clone();
        child.material.color = new THREE.Color(color);
      }
    });
  }, [clonedScene, color]);

  return (
    <primitive
      object={clonedScene}
      scale={scale}
      position={position}
      rotation={[0, 0, 0]}
    />
  );
}

/**
 * Loading fallback
 */
function LoadingHair() {
  const ref = React.useRef();

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  return (
    <mesh ref={ref} position={[0, 2, 0]}>
      <torusGeometry args={[0.3, 0.1, 8, 16]} />
      <meshBasicMaterial color="#E6BE8A" wireframe />
    </mesh>
  );
}

/**
 * Hair Swapper Test Component
 *
 * Displays all 10 hair styles in a grid for visual comparison,
 * or cycles through them one at a time for testing.
 */
export function HairSwapper({ mode = 'grid', hairColor = 'brown' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const color = HAIR_COLORS[hairColor] || HAIR_COLORS.brown;

  // Cycle through hair in 'cycle' mode
  useEffect(() => {
    if (mode !== 'cycle') return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HAIR_STYLES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [mode]);

  if (mode === 'grid') {
    // Display all hair in a 5x2 grid
    return (
      <group>
        {HAIR_STYLES.map((style, index) => {
          const row = Math.floor(index / 5);
          const col = index % 5;
          const x = (col - 2) * 2.2;
          const y = (1 - row) * 3;

          return (
            <Suspense key={style.id} fallback={<LoadingHair />}>
              <HairModel
                url={style.file}
                color={color}
                scale={0.7}
                position={[x, y, 0]}
              />
            </Suspense>
          );
        })}
      </group>
    );
  }

  // Cycle mode - show one hair at a time
  const currentStyle = HAIR_STYLES[currentIndex];

  return (
    <group>
      <Suspense fallback={<LoadingHair />}>
        <HairModel url={currentStyle.file} color={color} scale={1} />
      </Suspense>
    </group>
  );
}

/**
 * Hair selector component with single selection
 */
export function HairSelector({ selectedId = 'short', hairColor = 'brown' }) {
  const color = HAIR_COLORS[hairColor] || HAIR_COLORS.brown;
  const selectedStyle = HAIR_STYLES.find((s) => s.id === selectedId) || HAIR_STYLES[0];

  return (
    <group>
      <Suspense fallback={<LoadingHair />}>
        <HairModel url={selectedStyle.file} color={color} scale={1} />
      </Suspense>
    </group>
  );
}

/**
 * Combined Head + Hair display for testing integration
 */
export function HeadWithHair({
  headUrl,
  hairUrl,
  skinColor,
  hairColor,
  scale = 1,
  position = [0, 0, 0],
}) {
  const { scene: headScene } = useGLTF(headUrl);
  const clonedHead = React.useMemo(() => headScene.clone(), [headScene]);

  // Hair might be "bald" - handle missing hair gracefully
  const hairResult = hairUrl ? useGLTF(hairUrl) : null;
  const clonedHair = React.useMemo(
    () => (hairResult ? hairResult.scene.clone() : null),
    [hairResult]
  );

  // Apply skin color
  useEffect(() => {
    clonedHead.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color = new THREE.Color(skinColor);
      }
    });
  }, [clonedHead, skinColor]);

  // Apply hair color
  useEffect(() => {
    if (clonedHair) {
      clonedHair.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color = new THREE.Color(hairColor);
        }
      });
    }
  }, [clonedHair, hairColor]);

  return (
    <group scale={scale} position={position}>
      <primitive object={clonedHead} />
      {clonedHair && <primitive object={clonedHair} />}
    </group>
  );
}

// Export constants for external use
export { HAIR_STYLES, HAIR_COLORS };

// Preload all hair models for faster switching
HAIR_STYLES.forEach((style) => {
  useGLTF.preload(style.file);
});
