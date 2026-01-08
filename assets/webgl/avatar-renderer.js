/**
 * Avatar 3D Renderer - Three.js scene setup
 *
 * This module provides the core 3D rendering functionality for avatars.
 * It's designed to run inside a WebView and communicate with React Native
 * via the postMessage bridge.
 *
 * Message Protocol (RN → WebView):
 *   { type: 'SET_CONFIG', config: AvatarConfig }
 *   { type: 'TAKE_SNAPSHOT', format?: 'png' | 'jpeg', quality?: number }
 *   { type: 'SET_ROTATION', enabled: boolean }
 *
 * Message Protocol (WebView → RN):
 *   { type: 'READY' }
 *   { type: 'SNAPSHOT_RESULT', base64: string }
 *   { type: 'ERROR', message: string, code: string }
 *   { type: 'FPS_UPDATE', fps: number }
 */

(function () {
  'use strict';

  // ===================
  // State
  // ===================
  let scene = null;
  let camera = null;
  let renderer = null;
  let cube = null;
  let animationId = null;
  let isRotating = true;

  // FPS tracking
  let frameCount = 0;
  let lastFpsTime = performance.now();
  let currentFps = 60;

  // ===================
  // Message Bridge
  // ===================
  function sendToRN(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    } else {
      console.log('[AvatarRenderer] Would send to RN:', message);
    }
  }

  function handleMessage(event) {
    try {
      const message =
        typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

      switch (message.type) {
        case 'SET_CONFIG':
          handleSetConfig(message.config);
          break;
        case 'TAKE_SNAPSHOT':
          handleTakeSnapshot(message.format, message.quality);
          break;
        case 'SET_ROTATION':
          isRotating = message.enabled !== false;
          break;
        default:
          console.warn('[AvatarRenderer] Unknown message type:', message.type);
      }
    } catch (error) {
      sendToRN({
        type: 'ERROR',
        message: error.message,
        code: 'MESSAGE_PARSE_ERROR',
      });
    }
  }

  // ===================
  // Scene Setup
  // ===================
  function createScene(container) {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene with gradient background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera - positioned to frame avatar bust
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // Renderer with alpha for transparent backgrounds
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // Required for snapshot functionality
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    return { scene, camera, renderer };
  }

  function createLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Key light (main directional light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    // Fill light (softer, from opposite side)
    const fillLight = new THREE.DirectionalLight(0xb9d5ff, 0.3);
    fillLight.position.set(-3, 3, -3);
    scene.add(fillLight);

    // Rim light (back light for depth)
    const rimLight = new THREE.DirectionalLight(0xffd9b4, 0.5);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);
  }

  function createTestCube() {
    // Create a test cube with a nice material
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6366f1, // Indigo color
      metalness: 0.3,
      roughness: 0.4,
    });

    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    return cube;
  }

  // ===================
  // Animation
  // ===================
  function animate() {
    animationId = requestAnimationFrame(animate);

    // Rotate cube if rotation is enabled
    if (isRotating && cube) {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.015;
    }

    // FPS calculation (report every second)
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      currentFps = frameCount;
      frameCount = 0;
      lastFpsTime = now;

      // Optionally report FPS to RN
      // sendToRN({ type: 'FPS_UPDATE', fps: currentFps });
    }

    renderer.render(scene, camera);
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // ===================
  // Message Handlers
  // ===================
  function handleSetConfig(config) {
    if (!config || !cube) return;

    // For POC: change cube color based on config
    if (config.primaryColor) {
      const colorHex = config.primaryColor.replace('#', '0x');
      cube.material.color.setHex(parseInt(colorHex));
    }

    // Scale based on config (demo feature)
    if (config.scale) {
      cube.scale.setScalar(config.scale);
    }

    console.log('[AvatarRenderer] Config updated:', config);
  }

  function handleTakeSnapshot(format = 'png', quality = 0.92) {
    try {
      // Render one frame to ensure latest state
      renderer.render(scene, camera);

      // Get canvas data as base64
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64 = renderer.domElement.toDataURL(mimeType, quality);

      sendToRN({
        type: 'SNAPSHOT_RESULT',
        base64: base64,
      });
    } catch (error) {
      sendToRN({
        type: 'ERROR',
        message: error.message,
        code: 'SNAPSHOT_ERROR',
      });
    }
  }

  // ===================
  // Resize Handler
  // ===================
  function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container || !camera || !renderer) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // ===================
  // Initialization
  // ===================
  function init() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      console.error('[AvatarRenderer] Container not found');
      sendToRN({
        type: 'ERROR',
        message: 'Canvas container not found',
        code: 'INIT_ERROR',
      });
      return;
    }

    try {
      // Create scene
      createScene(container);

      // Add lighting
      createLighting();

      // Create test cube (will be replaced with avatar later)
      createTestCube();

      // Handle window resize
      window.addEventListener('resize', onWindowResize);

      // Start animation loop
      animate();

      // Notify RN that renderer is ready
      sendToRN({ type: 'READY' });

      console.log('[AvatarRenderer] Initialized successfully');
    } catch (error) {
      console.error('[AvatarRenderer] Init error:', error);
      sendToRN({
        type: 'ERROR',
        message: error.message,
        code: 'INIT_ERROR',
      });
    }
  }

  // ===================
  // Cleanup
  // ===================
  function dispose() {
    stopAnimation();

    if (renderer) {
      renderer.dispose();
    }

    if (cube) {
      cube.geometry.dispose();
      cube.material.dispose();
    }

    window.removeEventListener('resize', onWindowResize);
  }

  // ===================
  // Public API
  // ===================
  window.AvatarRenderer = {
    init: init,
    dispose: dispose,
    getFps: () => currentFps,
    getScene: () => scene,
    setConfig: handleSetConfig,
    takeSnapshot: handleTakeSnapshot,
    setRotation: (enabled) => {
      isRotating = enabled;
    },
  };

  // Set up message listeners
  window.addEventListener('message', handleMessage);
  document.addEventListener('message', handleMessage);

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
