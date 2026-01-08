import React, { useRef, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// =============================================================================
// MESHOPT DECODER SETUP - Required for compressed GLB files from VALID project
// =============================================================================

// Register MeshoptDecoder with THREE's GLTFLoader
// This is needed because the VALID project avatars use EXT_meshopt_compression
MeshoptDecoder.ready.then(() => {
  console.log('[R3F Avatar] MeshoptDecoder ready');
  GLTFLoader.prototype.setMeshoptDecoder(MeshoptDecoder);
});

// Also extend drei's useGLTF loader
useGLTF.setDecoderPath && useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
import { HeadSwapper, HeadSelector, HEAD_SHAPES, SKIN_TONES } from './components/HeadSwapper';
import { HairSwapper, HairSelector, HeadWithHair, HAIR_STYLES, HAIR_COLORS } from './components/HairSwapper';
import { Avatar, AvatarWithBridge, LoadingAvatar, DEFAULT_AVATAR_CONFIG } from './components/Avatar';
import { SKIN_COLORS as AVATAR_SKIN_COLORS, HAIR_COLORS as AVATAR_HAIR_COLORS } from './constants/assetMap';
import { LOCAL_AVATARS, DEFAULT_AVATAR_ID, getAvatarById } from './constants/avatarRegistry';
import { Lighting, LIGHTING_PRESETS } from './components/Lighting';
import { Experience, FullBodyExperience, PostProcessing, EXPERIENCE_CONFIG } from './components/Experience';
import { CameraManager, CAMERA_PRESETS, ZOOM_LIMITS, SnapshotCameraManager } from './components/CameraManager';

// =============================================================================
// MESSAGE BRIDGE
// =============================================================================

function sendToRN(message) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  } else {
    console.log('[R3F Avatar] Would send to RN:', message);
  }
}

// =============================================================================
// GLOBAL ERROR HANDLING - Catch errors before React mounts
// =============================================================================

// Send initialization signal immediately (before React mounts)
sendToRN({ type: 'INIT_STARTED', timestamp: Date.now() });

// Catch uncaught errors and send to RN
window.onerror = function(message, source, lineno, colno, error) {
  sendToRN({
    type: 'ERROR',
    message: `Uncaught error: ${message}`,
    code: 'UNCAUGHT_ERROR',
    details: { source, lineno, colno, stack: error?.stack }
  });
  return false;
};

// Catch unhandled promise rejections
window.onunhandledrejection = function(event) {
  sendToRN({
    type: 'ERROR',
    message: `Unhandled rejection: ${event.reason?.message || event.reason}`,
    code: 'UNHANDLED_REJECTION',
    details: { stack: event.reason?.stack }
  });
};

// Global message handler registry
const messageHandlers = {
  SET_CONFIG: null,
  TAKE_SNAPSHOT: null,
  SET_ROTATION: null,
  SET_HEAD_SHAPE: null,
  SET_SKIN_TONE: null,
  SET_VIEW_MODE: null,
  SET_HAIR_STYLE: null,
  SET_HAIR_COLOR: null,
  INIT: null,
  UPDATE_CONFIG: null,
  // Task 10: Lighting and post-processing
  SET_LIGHTING_PRESET: null,
  SET_POST_PROCESSING: null,
  // Task 11: Camera controls
  SET_CAMERA: null,
  SET_CAMERA_PRESET: null,
  SET_INTERACTIVE: null,
  // Phase 2: Complete avatar selection
  SET_AVATAR: null,
};

function handleIncomingMessage(event) {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    const handler = messageHandlers[data.type];
    if (handler) {
      handler(data);
    }
  } catch (error) {
    sendToRN({ type: 'ERROR', message: error.message, code: 'MESSAGE_PARSE_ERROR' });
  }
}

// =============================================================================
// TEST MESH (legacy - will be replaced with Avatar)
// =============================================================================

function TestMesh({ config, isRotating }) {
  const meshRef = useRef();
  const materialRef = useRef();

  useFrame((state, delta) => {
    if (isRotating && meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.7;
    }
  });

  useEffect(() => {
    if (materialRef.current && config.primaryColor) {
      materialRef.current.color.set(config.primaryColor);
    }
  }, [config.primaryColor]);

  useEffect(() => {
    if (meshRef.current && config.scale) {
      meshRef.current.scale.setScalar(config.scale);
    }
  }, [config.scale]);

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        ref={materialRef}
        color={config.primaryColor || '#6366f1'}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// =============================================================================
// LIGHTING SETUP - Now using modular Lighting component from ./components/Lighting
// =============================================================================
// Lighting component imported from ./components/Lighting.jsx
// Experience component imported from ./components/Experience.jsx

// =============================================================================
// SNAPSHOT HANDLER (Task 15 Enhanced)
// =============================================================================

/**
 * Enhanced SnapshotHandler using Task 15 snapshot utilities
 * Supports:
 * - Custom resolutions (width, height)
 * - Transparent backgrounds
 * - Camera presets for framing
 * - PNG/JPEG formats with quality control
 */
function SnapshotHandler({ onSnapshotRequest }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    messageHandlers.TAKE_SNAPSHOT = async (data) => {
      const {
        format = 'png',
        quality = 0.92,
        width,
        height,
        transparent = false,
        preset, // Camera preset for framing
      } = data;

      try {
        // Store original state
        const originalSize = { width: gl.domElement.width, height: gl.domElement.height };
        const originalClearColor = gl.getClearColor(new THREE.Color());
        const originalClearAlpha = gl.getClearAlpha();
        const originalBackground = scene.background;

        // If custom dimensions specified, resize renderer
        const snapshotWidth = width || originalSize.width;
        const snapshotHeight = height || originalSize.height;

        if (width || height) {
          gl.setSize(snapshotWidth, snapshotHeight);
        }

        // Handle camera preset if specified
        let snapshotCamera = camera;
        if (preset && camera.isPerspectiveCamera) {
          const SNAPSHOT_PRESETS = {
            portrait: { position: [0, 1.5, 2.5], target: [0, 1.5, 0], fov: 45 },
            fullBody: { position: [0, 1, 4.5], target: [0, 1, 0], fov: 50 },
            closeUp: { position: [0, 1.65, 1.5], target: [0, 1.65, 0], fov: 35 },
            threeQuarter: { position: [1.5, 1.6, 2], target: [0, 1.5, 0], fov: 45 },
            profile: { position: [2.5, 1.5, 0], target: [0, 1.5, 0], fov: 45 },
          };

          const presetConfig = SNAPSHOT_PRESETS[preset];
          if (presetConfig) {
            snapshotCamera = camera.clone();
            snapshotCamera.position.set(...presetConfig.position);
            snapshotCamera.lookAt(new THREE.Vector3(...presetConfig.target));
            snapshotCamera.fov = presetConfig.fov;
            snapshotCamera.aspect = snapshotWidth / snapshotHeight;
            snapshotCamera.updateProjectionMatrix();
          }
        }

        // Handle transparent background
        if (transparent) {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
        }

        // Render the scene
        gl.clear();
        gl.render(scene, snapshotCamera);

        // Capture to base64
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const base64 = gl.domElement.toDataURL(mimeType, format === 'jpeg' ? quality : undefined);

        // Send result with SNAPSHOT_READY (new protocol) and SNAPSHOT_RESULT (legacy)
        sendToRN({
          type: 'SNAPSHOT_READY',
          base64,
          width: snapshotWidth,
          height: snapshotHeight,
        });

        // Restore original state
        if (width || height) {
          gl.setSize(originalSize.width, originalSize.height);
        }
        gl.setClearColor(originalClearColor, originalClearAlpha);
        scene.background = originalBackground;

      } catch (error) {
        sendToRN({
          type: 'ERROR',
          message: error.message,
          code: 'SNAPSHOT_ERROR',
          stack: error.stack,
        });
      }
    };

    return () => {
      messageHandlers.TAKE_SNAPSHOT = null;
    };
  }, [gl, scene, camera]);

  return null;
}

// =============================================================================
// FPS MONITOR
// =============================================================================

function FPSMonitor() {
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastTimeRef.current >= 1000) {
      // Uncomment to report FPS to RN:
      // sendToRN({ type: 'FPS_UPDATE', fps: frameCountRef.current });
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  });

  return null;
}

// =============================================================================
// LOADING FALLBACK
// =============================================================================

function LoadingFallback() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#6366f1" wireframe />
    </mesh>
  );
}

// =============================================================================
// MAIN SCENE
// =============================================================================

function Scene({
  config,
  isRotating,
  viewMode,
  headShape,
  skinTone,
  hairStyle,
  hairColor,
  avatarConfig,
  lightingPreset,
  enablePostProcessing,
  // Task 11: Camera controls
  cameraPreset,
  cameraInteractive,
  cameraTransitionDuration,
  customCameraPosition,
  customCameraTarget,
  onCameraTransitionStart,
  onCameraTransitionComplete,
}) {
  // Adjust camera position based on view mode
  // Updated for full-body complete avatars (standing at y=0, ~1.7-1.8 units tall)
  const getCameraTarget = () => {
    if (viewMode === 'head-grid' || viewMode === 'hair-grid') return [0, 2, 0];
    if (viewMode === 'avatar') return [0, 1, 0]; // Full-body center point
    return [0, 1, 0];
  };

  // Determine experience mode based on view mode
  const getExperienceMode = () => {
    if (viewMode === 'avatar') return 'interactive';
    return 'simple'; // Use simple lighting for non-avatar views
  };

  // Render scene content based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'legacy':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TestMesh config={config} isRotating={isRotating} />
          </Suspense>
        );

      case 'head-grid':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HeadSwapper mode="grid" skinTone={skinTone} />
          </Suspense>
        );

      case 'head-cycle':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HeadSwapper mode="cycle" skinTone={skinTone} />
          </Suspense>
        );

      case 'head-single':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HeadSelector selectedId={headShape} skinTone={skinTone} />
          </Suspense>
        );

      case 'hair-grid':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HairSwapper mode="grid" hairColor={hairColor} />
          </Suspense>
        );

      case 'hair-cycle':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HairSwapper mode="cycle" hairColor={hairColor} />
          </Suspense>
        );

      case 'hair-single':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HairSelector selectedId={hairStyle} hairColor={hairColor} />
          </Suspense>
        );

      case 'combined':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <HeadWithHair
              headUrl={HEAD_SHAPES.find((s) => s.id === headShape)?.file || HEAD_SHAPES[0].file}
              hairUrl={HAIR_STYLES.find((s) => s.id === hairStyle)?.file || HAIR_STYLES[0].file}
              skinColor={SKIN_TONES[skinTone] || SKIN_TONES.medium1}
              hairColor={HAIR_COLORS[hairColor] || HAIR_COLORS.brown}
            />
          </Suspense>
        );

      case 'avatar':
      default:
        return (
          <Suspense fallback={<LoadingAvatar />}>
            <Avatar
              config={avatarConfig}
              scale={1}
              position={[0, 0, 0]}
              animate={true}
            />
          </Suspense>
        );
    }
  };

  // For avatar mode, use full Experience component with post-processing
  // Updated for complete full-body avatar models
  if (viewMode === 'avatar') {
    return (
      <>
        <Experience
          lightingPreset={lightingPreset}
          enablePostProcessing={enablePostProcessing}
          enableShadows={true}
          enableEnvironment={true}
          enableContactShadows={true}
          interactive={false} // We handle camera controls separately via CameraManager
          cameraTarget={getCameraTarget()}
          mode="interactive"
          showShadowCatcher={true}
        >
          {renderContent()}
        </Experience>

        {/* Task 11: CameraManager for smooth camera transitions and controls */}
        <CameraManager
          preset={cameraPreset || 'portrait'}
          interactive={cameraInteractive !== false}
          transitionDuration={cameraTransitionDuration || 0.8}
          customPosition={customCameraPosition}
          customTarget={customCameraTarget}
          onTransitionStart={onCameraTransitionStart}
          onTransitionComplete={onCameraTransitionComplete}
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          zoomLimits={ZOOM_LIMITS}
        />
        <SnapshotHandler />
        <FPSMonitor />
      </>
    );
  }

  // For other views, use simpler lighting setup
  return (
    <>
      <Lighting preset="default" enableShadows={false} enableEnvironment={false} enableContactShadows={false} />
      {renderContent()}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={15}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
        target={getCameraTarget()}
      />
      <SnapshotHandler />
      <FPSMonitor />
    </>
  );
}

// =============================================================================
// UI CONTROLS (for browser testing)
// =============================================================================

function UIControls({
  viewMode,
  setViewMode,
  headShape,
  setHeadShape,
  skinTone,
  setSkinTone,
  hairStyle,
  setHairStyle,
  hairColor,
  setHairColor,
  avatarConfig,
  setAvatarConfig,
  lightingPreset,
  setLightingPreset,
  enablePostProcessing,
  setEnablePostProcessing,
  // Task 11: Camera controls
  cameraPreset,
  setCameraPreset,
  cameraInteractive,
  setCameraInteractive,
  cameraTransitionDuration,
  setCameraTransitionDuration,
  isTransitioning,
}) {
  // Only show UI controls in browser, not in WebView
  if (window.ReactNativeWebView) return null;

  const showHeadOptions = ['head-single', 'combined'].includes(viewMode);
  const showHairOptions = ['hair-single', 'combined'].includes(viewMode);
  const showSkinTone = ['head-grid', 'head-cycle', 'head-single', 'combined'].includes(viewMode);
  const showHairColor = ['hair-grid', 'hair-cycle', 'hair-single', 'combined'].includes(viewMode);
  const showAvatarOptions = viewMode === 'avatar';

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0,0,0,0.8)',
        padding: 15,
        borderRadius: 8,
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        zIndex: 1000,
        maxWidth: 280,
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', fontSize: 14 }}>Avatar Asset Test</h3>

      {/* View Mode */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>View Mode:</label>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          style={{ width: '100%', padding: 4 }}
        >
          <optgroup label="Avatar (Task 9)">
            <option value="avatar">Full Avatar</option>
          </optgroup>
          <optgroup label="Heads">
            <option value="head-grid">Head Grid (All 6)</option>
            <option value="head-cycle">Head Cycle</option>
            <option value="head-single">Head Single</option>
          </optgroup>
          <optgroup label="Hair">
            <option value="hair-grid">Hair Grid (All 10)</option>
            <option value="hair-cycle">Hair Cycle</option>
            <option value="hair-single">Hair Single</option>
          </optgroup>
          <optgroup label="Combined">
            <option value="combined">Head + Hair</option>
          </optgroup>
          <optgroup label="Other">
            <option value="legacy">Legacy Cube</option>
          </optgroup>
        </select>
      </div>

      {/* Head Shape */}
      {showHeadOptions && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Head Shape:</label>
          <select
            value={headShape}
            onChange={(e) => setHeadShape(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {HEAD_SHAPES.map((shape) => (
              <option key={shape.id} value={shape.id}>
                {shape.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hair Style */}
      {showHairOptions && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Hair Style:</label>
          <select
            value={hairStyle}
            onChange={(e) => setHairStyle(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {HAIR_STYLES.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Skin Tone */}
      {showSkinTone && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Skin Tone:</label>
          <select
            value={skinTone}
            onChange={(e) => setSkinTone(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {Object.keys(SKIN_TONES).map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
          <div
            style={{
              width: '100%',
              height: 16,
              marginTop: 4,
              backgroundColor: SKIN_TONES[skinTone],
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          />
        </div>
      )}

      {/* Hair Color */}
      {showHairColor && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Hair Color:</label>
          <select
            value={hairColor}
            onChange={(e) => setHairColor(e.target.value)}
            style={{ width: '100%', padding: 4 }}
          >
            {Object.keys(HAIR_COLORS).map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <div
            style={{
              width: '100%',
              height: 16,
              marginTop: 4,
              backgroundColor: HAIR_COLORS[hairColor],
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          />
        </div>
      )}

      {/* Avatar Config (Task 9) */}
      {showAvatarOptions && (
        <>
          <hr style={{ margin: '10px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: '#10B981' }}>Avatar Config</h4>

          {/* Face Shape */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Face Shape:</label>
            <select
              value={avatarConfig.faceShape}
              onChange={(e) => setAvatarConfig((prev) => ({ ...prev, faceShape: e.target.value }))}
              style={{ width: '100%', padding: 4 }}
            >
              {['oval', 'round', 'square', 'heart', 'oblong', 'diamond'].map((shape) => (
                <option key={shape} value={shape}>
                  {shape}
                </option>
              ))}
            </select>
          </div>

          {/* Skin Tone */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Skin Tone:</label>
            <select
              value={avatarConfig.skinTone}
              onChange={(e) => setAvatarConfig((prev) => ({ ...prev, skinTone: e.target.value }))}
              style={{ width: '100%', padding: 4 }}
            >
              {Object.keys(AVATAR_SKIN_COLORS).map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
            <div
              style={{
                width: '100%',
                height: 16,
                marginTop: 4,
                backgroundColor: AVATAR_SKIN_COLORS[avatarConfig.skinTone],
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
          </div>

          {/* Hair Style */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Hair Style:</label>
            <select
              value={avatarConfig.hairStyle}
              onChange={(e) => setAvatarConfig((prev) => ({ ...prev, hairStyle: e.target.value }))}
              style={{ width: '100%', padding: 4 }}
            >
              {['bald', 'short', 'medium', 'long', 'curly', 'wavy', 'ponytail', 'bun', 'afro', 'buzz'].map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          {/* Hair Color */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Hair Color:</label>
            <select
              value={avatarConfig.hairColor}
              onChange={(e) => setAvatarConfig((prev) => ({ ...prev, hairColor: e.target.value }))}
              style={{ width: '100%', padding: 4 }}
            >
              {Object.keys(AVATAR_HAIR_COLORS).map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <div
              style={{
                width: '100%',
                height: 16,
                marginTop: 4,
                backgroundColor: AVATAR_HAIR_COLORS[avatarConfig.hairColor],
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
          </div>

          {/* Facial Hair */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Facial Hair:</label>
            <select
              value={avatarConfig.facialHair}
              onChange={(e) => setAvatarConfig((prev) => ({ ...prev, facialHair: e.target.value }))}
              style={{ width: '100%', padding: 4 }}
            >
              {['none', 'stubble', 'goatee', 'shortBeard', 'mediumBeard', 'fullBeard', 'mustache'].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Task 10: Lighting & Post-Processing Controls */}
          <hr style={{ margin: '10px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: '#F59E0B' }}>Lighting & Effects</h4>

          {/* Lighting Preset */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Lighting Preset:</label>
            <select
              value={lightingPreset}
              onChange={(e) => setLightingPreset(e.target.value)}
              style={{ width: '100%', padding: 4 }}
            >
              {Object.keys(LIGHTING_PRESETS).map((preset) => (
                <option key={preset} value={preset}>
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Post-Processing Toggle */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enablePostProcessing}
                onChange={(e) => setEnablePostProcessing(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>Enable Post-Processing</span>
            </label>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
              Bloom, vignette, anti-aliasing
            </div>
          </div>

          {/* Task 11: Camera Controls */}
          <hr style={{ margin: '10px 0', borderColor: 'rgba(255,255,255,0.2)' }} />
          <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: '#3B82F6' }}>
            Camera Controls
            {isTransitioning && (
              <span style={{ marginLeft: 8, color: '#6366f1', fontSize: 10 }}>(transitioning...)</span>
            )}
          </h4>

          {/* Camera Preset */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Camera Preset:</label>
            <select
              value={cameraPreset}
              onChange={(e) => setCameraPreset(e.target.value)}
              style={{ width: '100%', padding: 4 }}
            >
              {Object.keys(CAMERA_PRESETS).map((preset) => (
                <option key={preset} value={preset}>
                  {preset.charAt(0).toUpperCase() + preset.slice(1)} - {CAMERA_PRESETS[preset].description}
                </option>
              ))}
            </select>
          </div>

          {/* Transition Duration */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>
              Transition Duration: {cameraTransitionDuration.toFixed(1)}s
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={cameraTransitionDuration}
              onChange={(e) => setCameraTransitionDuration(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Interactive Mode Toggle */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={cameraInteractive}
                onChange={(e) => setCameraInteractive(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>Interactive Mode</span>
            </label>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
              Enable orbit controls (drag to rotate)
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Quick Presets:</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['portrait', 'closeUp', 'fullBody', 'threeQuarter', 'profile'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setCameraPreset(preset)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    cursor: 'pointer',
                    background: cameraPreset === preset ? '#3B82F6' : '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// APP ERROR BOUNDARY - Catches React errors and sends to RN
// =============================================================================

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    sendToRN({
      type: 'ERROR',
      message: `React error: ${error.message}`,
      code: 'REACT_ERROR',
      details: { stack: error.stack, componentStack: errorInfo.componentStack }
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2e',
          color: '#ef4444',
          padding: 20,
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: 24, marginBottom: 10 }}>⚠️</div>
            <div>3D Preview Error</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// =============================================================================
// APP COMPONENT
// =============================================================================

function AppContent() {
  const [config, setConfig] = useState({
    primaryColor: '#6366f1',
    scale: 1,
  });
  const [isRotating, setIsRotating] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Head test state
  const [viewMode, setViewMode] = useState('avatar'); // Default to avatar view (Task 9)
  const [headShape, setHeadShape] = useState('oval');
  const [skinTone, setSkinTone] = useState('medium1');

  // Hair test state
  const [hairStyle, setHairStyle] = useState('short');
  const [hairColor, setHairColor] = useState('brown');

  // Task 9: Avatar config state (full CustomAvatarConfig)
  const [avatarConfig, setAvatarConfig] = useState(() => ({
    ...DEFAULT_AVATAR_CONFIG,
  }));

  // Task 10: Lighting and post-processing state
  const [lightingPreset, setLightingPreset] = useState('portrait');
  const [enablePostProcessing, setEnablePostProcessing] = useState(true);

  // Task 11: Camera control state
  const [cameraPreset, setCameraPreset] = useState('portrait');
  const [cameraInteractive, setCameraInteractive] = useState(true);
  const [cameraTransitionDuration, setCameraTransitionDuration] = useState(0.8);
  const [customCameraPosition, setCustomCameraPosition] = useState(null);
  const [customCameraTarget, setCustomCameraTarget] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Register message handlers
  useEffect(() => {
    messageHandlers.SET_CONFIG = (data) => {
      if (data.config) {
        setConfig((prev) => ({ ...prev, ...data.config }));
      }
    };

    messageHandlers.SET_ROTATION = (data) => {
      setIsRotating(data.enabled !== false);
    };

    messageHandlers.SET_HEAD_SHAPE = (data) => {
      if (data.shape && HEAD_SHAPES.some((s) => s.id === data.shape)) {
        setHeadShape(data.shape);
        setViewMode('head-single');
      }
    };

    messageHandlers.SET_SKIN_TONE = (data) => {
      if (data.tone && SKIN_TONES[data.tone]) {
        setSkinTone(data.tone);
      }
    };

    messageHandlers.SET_VIEW_MODE = (data) => {
      if (data.mode) {
        setViewMode(data.mode);
      }
    };

    messageHandlers.SET_HAIR_STYLE = (data) => {
      if (data.style && HAIR_STYLES.some((s) => s.id === data.style)) {
        setHairStyle(data.style);
        if (!['hair-single', 'hair-grid', 'hair-cycle', 'combined'].includes(viewMode)) {
          setViewMode('combined');
        }
      }
    };

    messageHandlers.SET_HAIR_COLOR = (data) => {
      if (data.color && HAIR_COLORS[data.color]) {
        setHairColor(data.color);
      }
    };

    // Task 9: Handle avatar config messages
    messageHandlers.INIT = (data) => {
      if (data.config) {
        setAvatarConfig((prev) => ({
          ...prev,
          ...data.config,
        }));
        setViewMode('avatar');
        sendToRN({ type: 'CONFIG_APPLIED', config: data.config, timestamp: Date.now() });
      }
    };

    messageHandlers.UPDATE_CONFIG = (data) => {
      if (data.changes) {
        setAvatarConfig((prev) => ({
          ...prev,
          ...data.changes,
        }));
        sendToRN({ type: 'CONFIG_APPLIED', config: data.changes, timestamp: Date.now() });
      }
    };

    // Task 10: Handle lighting preset messages
    messageHandlers.SET_LIGHTING_PRESET = (data) => {
      if (data.preset && LIGHTING_PRESETS[data.preset]) {
        setLightingPreset(data.preset);
        sendToRN({ type: 'LIGHTING_PRESET_APPLIED', preset: data.preset, timestamp: Date.now() });
      }
    };

    messageHandlers.SET_POST_PROCESSING = (data) => {
      setEnablePostProcessing(data.enabled !== false);
      sendToRN({ type: 'POST_PROCESSING_APPLIED', enabled: data.enabled !== false, timestamp: Date.now() });
    };

    // Task 11: Camera control message handlers
    messageHandlers.SET_CAMERA = (data) => {
      // Handle preset or custom position
      if (data.preset && CAMERA_PRESETS[data.preset]) {
        setCameraPreset(data.preset);
        setCustomCameraPosition(null);
        setCustomCameraTarget(null);
      } else if (data.position) {
        // Custom position
        setCustomCameraPosition(data.position);
        if (data.target) {
          setCustomCameraTarget(data.target);
        }
      }

      // Handle duration
      if (data.duration !== undefined) {
        setCameraTransitionDuration(Math.max(0.1, Math.min(data.duration, 5)));
      }

      sendToRN({
        type: 'CAMERA_APPLIED',
        preset: data.preset || null,
        position: data.position || null,
        target: data.target || null,
        duration: data.duration || cameraTransitionDuration,
        timestamp: Date.now(),
      });
    };

    messageHandlers.SET_CAMERA_PRESET = (data) => {
      if (data.preset && CAMERA_PRESETS[data.preset]) {
        setCameraPreset(data.preset);
        setCustomCameraPosition(null);
        setCustomCameraTarget(null);

        if (data.duration !== undefined) {
          setCameraTransitionDuration(Math.max(0.1, Math.min(data.duration, 5)));
        }

        sendToRN({
          type: 'CAMERA_PRESET_APPLIED',
          preset: data.preset,
          timestamp: Date.now(),
        });
      }
    };

    messageHandlers.SET_INTERACTIVE = (data) => {
      setCameraInteractive(data.enabled !== false);
      sendToRN({
        type: 'INTERACTIVE_MODE_APPLIED',
        enabled: data.enabled !== false,
        timestamp: Date.now(),
      });
    };

    // Phase 2: Complete avatar selection by ID
    messageHandlers.SET_AVATAR = (data) => {
      if (data.avatarId) {
        // Check if avatar exists in registry
        const avatar = getAvatarById(data.avatarId);
        if (avatar || data.avatarId.startsWith('cdn:')) {
          setAvatarConfig((prev) => ({
            ...prev,
            avatarId: data.avatarId,
          }));
          setViewMode('avatar');
          sendToRN({
            type: 'AVATAR_APPLIED',
            avatarId: data.avatarId,
            avatarInfo: avatar || null,
            timestamp: Date.now(),
          });
        } else {
          sendToRN({
            type: 'ERROR',
            message: `Avatar not found: ${data.avatarId}`,
            code: 'AVATAR_NOT_FOUND',
            availableAvatars: LOCAL_AVATARS.map(a => a.id),
          });
        }
      }
    };

    // Set up message listeners
    window.addEventListener('message', handleIncomingMessage);
    document.addEventListener('message', handleIncomingMessage);

    // Signal ready to RN
    sendToRN({
      type: 'READY',
      availableHeadShapes: HEAD_SHAPES.map((s) => s.id),
      availableSkinTones: Object.keys(SKIN_TONES),
      availableHairStyles: HAIR_STYLES.map((s) => s.id),
      availableHairColors: Object.keys(HAIR_COLORS),
      // Task 9: Include avatar config capabilities
      avatarConfigSupported: true,
      availableFaceShapes: ['oval', 'round', 'square', 'heart', 'oblong', 'diamond'],
      // Task 10: Include lighting and post-processing capabilities
      lightingPresetsSupported: true,
      availableLightingPresets: Object.keys(LIGHTING_PRESETS),
      postProcessingSupported: true,
      // Task 11: Include camera control capabilities
      cameraControlsSupported: true,
      availableCameraPresets: Object.keys(CAMERA_PRESETS),
      cameraFeatures: {
        smoothTransitions: true,
        interactiveMode: true,
        customPosition: true,
        zoomLimits: ZOOM_LIMITS,
      },
      // Phase 2: Complete avatar selection support
      completeAvatarSupported: true,
      availableAvatars: LOCAL_AVATARS.map(a => ({
        id: a.id,
        name: a.name,
        ethnicity: a.ethnicity,
        gender: a.gender,
        outfit: a.outfit,
      })),
      defaultAvatarId: DEFAULT_AVATAR_ID,
    });
    setIsReady(true);

    return () => {
      window.removeEventListener('message', handleIncomingMessage);
      document.removeEventListener('message', handleIncomingMessage);
      messageHandlers.SET_CONFIG = null;
      messageHandlers.SET_ROTATION = null;
      messageHandlers.SET_HEAD_SHAPE = null;
      messageHandlers.SET_SKIN_TONE = null;
      messageHandlers.SET_VIEW_MODE = null;
      messageHandlers.SET_HAIR_STYLE = null;
      messageHandlers.SET_HAIR_COLOR = null;
      messageHandlers.INIT = null;
      messageHandlers.UPDATE_CONFIG = null;
      // Task 10: Cleanup
      messageHandlers.SET_LIGHTING_PRESET = null;
      messageHandlers.SET_POST_PROCESSING = null;
      // Task 11: Cleanup
      messageHandlers.SET_CAMERA = null;
      messageHandlers.SET_CAMERA_PRESET = null;
      messageHandlers.SET_INTERACTIVE = null;
      // Phase 2: Cleanup
      messageHandlers.SET_AVATAR = null;
    };
  }, [viewMode, cameraTransitionDuration]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }}>
      <UIControls
        viewMode={viewMode}
        setViewMode={setViewMode}
        headShape={headShape}
        setHeadShape={setHeadShape}
        skinTone={skinTone}
        setSkinTone={setSkinTone}
        hairStyle={hairStyle}
        setHairStyle={setHairStyle}
        hairColor={hairColor}
        setHairColor={setHairColor}
        avatarConfig={avatarConfig}
        setAvatarConfig={setAvatarConfig}
        lightingPreset={lightingPreset}
        setLightingPreset={setLightingPreset}
        enablePostProcessing={enablePostProcessing}
        setEnablePostProcessing={setEnablePostProcessing}
        // Task 11: Camera controls
        cameraPreset={cameraPreset}
        setCameraPreset={setCameraPreset}
        cameraInteractive={cameraInteractive}
        setCameraInteractive={setCameraInteractive}
        cameraTransitionDuration={cameraTransitionDuration}
        setCameraTransitionDuration={setCameraTransitionDuration}
        isTransitioning={isTransitioning}
      />
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <color attach="background" args={['#1a1a2e']} />
        <Scene
          config={config}
          isRotating={isRotating}
          viewMode={viewMode}
          headShape={headShape}
          skinTone={skinTone}
          hairStyle={hairStyle}
          hairColor={hairColor}
          avatarConfig={avatarConfig}
          lightingPreset={lightingPreset}
          enablePostProcessing={enablePostProcessing}
          // Task 11: Camera controls
          cameraPreset={cameraPreset}
          cameraInteractive={cameraInteractive}
          cameraTransitionDuration={cameraTransitionDuration}
          customCameraPosition={customCameraPosition}
          customCameraTarget={customCameraTarget}
          onCameraTransitionStart={() => {
            setIsTransitioning(true);
            sendToRN({ type: 'CAMERA_TRANSITION_START', timestamp: Date.now() });
          }}
          onCameraTransitionComplete={() => {
            setIsTransitioning(false);
            sendToRN({ type: 'CAMERA_TRANSITION_COMPLETE', timestamp: Date.now() });
          }}
        />
      </Canvas>
    </div>
  );
}

// =============================================================================
// DEFAULT EXPORT - Wrapped with Error Boundary
// =============================================================================

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
