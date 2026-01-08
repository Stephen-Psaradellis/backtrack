import React, { useState, useEffect, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Head shape definitions with paths to GLB files
 */
const HEAD_SHAPES = [
  { id: 'oval', name: 'Oval', file: '/models/heads/oval.glb' },
  { id: 'round', name: 'Round', file: '/models/heads/round.glb' },
  { id: 'square', name: 'Square', file: '/models/heads/square.glb' },
  { id: 'heart', name: 'Heart', file: '/models/heads/heart.glb' },
  { id: 'oblong', name: 'Oblong', file: '/models/heads/oblong.glb' },
  { id: 'diamond', name: 'Diamond', file: '/models/heads/diamond.glb' },
];

/**
 * Skin tone color presets
 */
const SKIN_TONES = {
  light1: '#FFDFC4',
  light2: '#F0D5BE',
  medium1: '#D1A684',
  medium2: '#C68642',
  tan1: '#8D5524',
  tan2: '#6B4423',
  dark1: '#4A312C',
  dark2: '#3B2219',
};

/**
 * Single head model component
 */
function HeadModel({ url, color, scale = 1, position = [0, 0, 0] }) {
  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  // Apply skin color to all meshes
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
function LoadingHead() {
  const ref = React.useRef();

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 2;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshBasicMaterial color="#6366f1" wireframe />
    </mesh>
  );
}

/**
 * Head Swapper Test Component
 *
 * Displays all 6 head shapes in a grid for visual comparison,
 * or cycles through them one at a time for testing.
 */
export function HeadSwapper({ mode = 'grid', skinTone = 'medium1' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const skinColor = SKIN_TONES[skinTone] || SKIN_TONES.medium1;

  // Cycle through heads in 'cycle' mode
  useEffect(() => {
    if (mode !== 'cycle') return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HEAD_SHAPES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [mode]);

  if (mode === 'grid') {
    // Display all heads in a 3x2 grid
    return (
      <group>
        {HEAD_SHAPES.map((shape, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const x = (col - 1) * 2.5;
          const y = (1 - row) * 3;

          return (
            <Suspense key={shape.id} fallback={<LoadingHead />}>
              <HeadModel
                url={shape.file}
                color={skinColor}
                scale={0.8}
                position={[x, y, 0]}
              />
            </Suspense>
          );
        })}
      </group>
    );
  }

  // Cycle mode - show one head at a time
  const currentShape = HEAD_SHAPES[currentIndex];

  return (
    <group>
      <Suspense fallback={<LoadingHead />}>
        <HeadModel url={currentShape.file} color={skinColor} scale={1} />
      </Suspense>
    </group>
  );
}

/**
 * Head selector component with UI controls
 */
export function HeadSelector({ onSelect, selectedId = 'oval', skinTone = 'medium1' }) {
  const skinColor = SKIN_TONES[skinTone] || SKIN_TONES.medium1;
  const selectedShape = HEAD_SHAPES.find((s) => s.id === selectedId) || HEAD_SHAPES[0];

  return (
    <group>
      <Suspense fallback={<LoadingHead />}>
        <HeadModel url={selectedShape.file} color={skinColor} scale={1} />
      </Suspense>
    </group>
  );
}

// Export constants for external use
export { HEAD_SHAPES, SKIN_TONES };

// Preload all head models for faster switching
HEAD_SHAPES.forEach((shape) => {
  useGLTF.preload(shape.file);
});
