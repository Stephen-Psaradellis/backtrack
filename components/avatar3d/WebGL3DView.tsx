/**
 * WebGL3DView - WebView wrapper for Three.js 3D avatar rendering
 *
 * This component provides a bridge between React Native and a WebView-hosted
 * Three.js scene. It handles bidirectional message communication for:
 * - Sending avatar configuration updates
 * - Requesting snapshot captures
 * - Receiving ready/error status from WebView
 *
 * Supports two rendering modes:
 * - 'inline': Vanilla Three.js (Task 1 implementation)
 * - 'r3f': React Three Fiber bundle (Task 2 implementation)
 *
 * @example
 * ```tsx
 * <WebGL3DView
 *   config={avatarConfig}
 *   mode="r3f"
 *   onReady={() => console.log('3D renderer ready')}
 *   onSnapshot={(base64) => saveImage(base64)}
 *   onError={(error) => handleError(error)}
 * />
 * ```
 */

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { AvatarConfig } from '../avatar/types';

// Import the R3F bundle HTML content (built by scripts/build-webgl-bundle.sh)
// This will be populated after running `npm run build:webgl`
import { R3F_BUNDLE_HTML } from './r3fBundle';

// Import message types from types.ts (Task 3)
import type {
  RNToWebViewMessage,
  WebViewToRNMessage,
  ErrorMessage,
} from './types';
import { serializeMessage } from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Rendering mode for the 3D view
 * - 'inline': Vanilla Three.js (Task 1 - smaller, faster to load)
 * - 'r3f': React Three Fiber (Task 2 - more features, better for avatar creator)
 * - 'dev': Connect to Vite dev server (development only)
 */
export type RenderMode = 'inline' | 'r3f' | 'dev';

export interface WebGL3DViewProps {
  /** Avatar configuration to render */
  config?: Partial<AvatarConfig>;
  /** Container style */
  style?: object;
  /** Rendering mode: 'inline' (Three.js), 'r3f' (React Three Fiber), or 'dev' (Vite server) */
  mode?: RenderMode;
  /** Vite dev server URL (only used when mode='dev') */
  devServerUrl?: string;
  /** Called when WebView 3D renderer is ready */
  onReady?: () => void;
  /** Called with base64 image data when snapshot is captured */
  onSnapshot?: (base64: string) => void;
  /** Called when an error occurs */
  onError?: (error: { message: string; code: string }) => void;
  /** Called when avatar finishes loading */
  onAvatarLoaded?: (avatarId: string) => void;
  /** Show loading indicator while initializing */
  showLoading?: boolean;
  /** Enable debug mode (shows console messages) */
  debug?: boolean;
}

export interface WebGL3DViewRef {
  /** Send a configuration update to the 3D renderer */
  setConfig: (config: Partial<AvatarConfig>) => void;
  /** Request a snapshot capture */
  takeSnapshot: (format?: 'png' | 'jpeg', quality?: number) => void;
  /** Enable/disable rotation animation */
  setRotation: (enabled: boolean) => void;
  /** Check if the renderer is ready */
  isReady: () => boolean;
  /** Set camera preset (portrait, fullBody, closeUp, threeQuarter, profile) */
  setCamera: (preset: 'portrait' | 'fullBody' | 'closeUp' | 'threeQuarter' | 'profile', duration?: number) => void;
  /** Enable/disable interactive mode (OrbitControls) */
  setInteractive: (enabled: boolean) => void;
  /** Set avatar by preset ID (Phase 3: Complete avatar selection) */
  setAvatar: (avatarId: string) => void;
}

// =============================================================================
// HTML SOURCES
// =============================================================================

/**
 * Get the HTML source based on rendering mode
 */
function getHtmlSource(mode: RenderMode): string {
  switch (mode) {
    case 'r3f':
      return R3F_BUNDLE_HTML;
    case 'inline':
    default:
      return INLINE_THREE_JS_HTML;
  }
}

/**
 * Inline HTML source for vanilla Three.js (Task 1).
 * Contains the full Three.js scene setup to avoid external file loading issues.
 */
const INLINE_THREE_JS_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Avatar 3D Renderer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    #canvas-container { width: 100%; height: 100%; touch-action: none; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js"></script>
  <script>
    (function () {
      'use strict';
      let scene = null, camera = null, renderer = null, cube = null;
      let animationId = null, isRotating = true;
      let frameCount = 0, lastFpsTime = performance.now(), currentFps = 60;

      function sendToRN(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function handleMessage(event) {
        try {
          const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          switch (message.type) {
            case 'SET_CONFIG': handleSetConfig(message.config); break;
            case 'TAKE_SNAPSHOT': handleTakeSnapshot(message.format, message.quality); break;
            case 'SET_ROTATION': isRotating = message.enabled !== false; break;
          }
        } catch (error) {
          sendToRN({ type: 'ERROR', message: error.message, code: 'MESSAGE_PARSE_ERROR' });
        }
      }

      function createScene(container) {
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 0, 5);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);
      }

      function createLighting() {
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1);
        keyLight.position.set(5, 5, 5);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xb9d5ff, 0.3);
        fillLight.position.set(-3, 3, -3);
        scene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(0xffd9b4, 0.5);
        rimLight.position.set(0, 5, -5);
        scene.add(rimLight);
      }

      function createTestCube() {
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x6366f1, metalness: 0.3, roughness: 0.4 });
        cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
      }

      function animate() {
        animationId = requestAnimationFrame(animate);
        if (isRotating && cube) {
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.015;
        }
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
          currentFps = frameCount;
          frameCount = 0;
          lastFpsTime = now;
        }
        renderer.render(scene, camera);
      }

      function handleSetConfig(config) {
        if (!config || !cube) return;
        if (config.primaryColor) {
          cube.material.color.setHex(parseInt(config.primaryColor.replace('#', '0x')));
        }
        if (config.scale) cube.scale.setScalar(config.scale);
      }

      function handleTakeSnapshot(format, quality) {
        format = format || 'png';
        quality = quality || 0.92;
        try {
          renderer.render(scene, camera);
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const base64 = renderer.domElement.toDataURL(mimeType, quality);
          sendToRN({ type: 'SNAPSHOT_RESULT', base64: base64 });
        } catch (error) {
          sendToRN({ type: 'ERROR', message: error.message, code: 'SNAPSHOT_ERROR' });
        }
      }

      function onWindowResize() {
        const container = document.getElementById('canvas-container');
        if (!container || !camera || !renderer) return;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }

      function init() {
        const container = document.getElementById('canvas-container');
        if (!container) {
          sendToRN({ type: 'ERROR', message: 'Container not found', code: 'INIT_ERROR' });
          return;
        }
        try {
          createScene(container);
          createLighting();
          createTestCube();
          window.addEventListener('resize', onWindowResize);
          animate();
          sendToRN({ type: 'READY' });
        } catch (error) {
          sendToRN({ type: 'ERROR', message: error.message, code: 'INIT_ERROR' });
        }
      }

      window.addEventListener('message', handleMessage);
      document.addEventListener('message', handleMessage);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  </script>
</body>
</html>
`;

// =============================================================================
// COMPONENT
// =============================================================================

const WebGL3DView = forwardRef<WebGL3DViewRef, WebGL3DViewProps>(
  (
    {
      config,
      style,
      mode = 'inline',
      devServerUrl = 'http://localhost:3001',
      onReady,
      onSnapshot,
      onError,
      onAvatarLoaded,
      showLoading = true,
      debug = false,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Determine WebView source based on mode
    const webViewSource = mode === 'dev'
      ? { uri: devServerUrl }
      : { html: getHtmlSource(mode) };

    // Queue for messages sent before WebView is ready
    const messageQueueRef = useRef<RNToWebViewMessage[]>([]);

    /**
     * Send a message to the WebView
     */
    const sendMessage = useCallback(
      (message: RNToWebViewMessage) => {
        if (!webViewRef.current) return;

        if (!isReady) {
          // Queue message if not ready yet
          messageQueueRef.current.push(message);
          if (debug) {
            console.log('[WebGL3DView] Queued message:', message.type);
          }
          return;
        }

        const jsonMessage = serializeMessage(message);
        const escapedMessage = jsonMessage.replace(/'/g, "\\'");
        webViewRef.current.injectJavaScript(`
          (function() {
            window.dispatchEvent(new MessageEvent('message', { data: '${escapedMessage}' }));
          })();
          true;
        `);

        if (debug) {
          console.log('[WebGL3DView] Sent message:', message.type);
        }
      },
      [isReady, debug]
    );

    /**
     * Flush queued messages after WebView becomes ready
     */
    const flushMessageQueue = useCallback(() => {
      const queue = messageQueueRef.current;
      messageQueueRef.current = [];

      queue.forEach((message) => {
        sendMessage(message);
      });

      if (debug && queue.length > 0) {
        console.log('[WebGL3DView] Flushed', queue.length, 'queued messages');
      }
    }, [sendMessage, debug]);

    /**
     * Handle messages from WebView
     */
    const handleWebViewMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const message: WebViewToRNMessage = JSON.parse(event.nativeEvent.data);

          // Always log messages during debugging phase
          console.log('[WebGL3DView] Received message:', message.type, JSON.stringify(message).slice(0, 200));

          switch (message.type) {
            case 'INIT_STARTED':
              console.log('[WebGL3DView] R3F bundle started initialization');
              break;

            case 'READY':
              setIsReady(true);
              setIsLoading(false);
              setError(null);
              onReady?.();
              // Flush queued messages after a short delay to ensure WebView is fully ready
              setTimeout(flushMessageQueue, 100);
              break;

            case 'SNAPSHOT_READY':
              onSnapshot?.(message.base64);
              break;

            case 'AVATAR_LOADED':
              console.log('[WebGL3DView] Avatar loaded:', message.avatarId);
              onAvatarLoaded?.(message.avatarId);
              break;

            case 'ERROR':
              setError(message.message);
              onError?.({ message: message.message, code: message.code });
              if (message.code === 'INIT_ERROR') {
                setIsLoading(false);
              }
              break;

            case 'FPS_UPDATE':
              if (debug) {
                console.log('[WebGL3DView] FPS:', message.fps);
              }
              break;
          }
        } catch (e) {
          if (debug) {
            console.error('[WebGL3DView] Message parse error:', e);
          }
        }
      },
      [onReady, onSnapshot, onError, flushMessageQueue, debug]
    );

    /**
     * Expose imperative methods via ref
     */
    useImperativeHandle(
      ref,
      () => ({
        setConfig: (newConfig: Partial<AvatarConfig>) => {
          // If we have an avatarId, use SET_AVATAR, otherwise send INIT_AVATAR
          if (newConfig.avatarId) {
            sendMessage({ type: 'SET_AVATAR', avatarId: newConfig.avatarId });
          }
        },
        takeSnapshot: (format?: 'png' | 'jpeg', quality?: number) => {
          sendMessage({ type: 'TAKE_SNAPSHOT', format, quality });
        },
        setRotation: (enabled: boolean) => {
          // Rotation control is now handled via SET_INTERACTIVE
          sendMessage({ type: 'SET_INTERACTIVE', enabled });
        },
        isReady: () => isReady,
        setCamera: (preset: 'portrait' | 'fullBody' | 'closeUp' | 'threeQuarter' | 'profile', duration?: number) => {
          sendMessage({ type: 'SET_CAMERA_PRESET', preset, duration });
        },
        setInteractive: (enabled: boolean) => {
          sendMessage({ type: 'SET_INTERACTIVE', enabled });
        },
        setAvatar: (avatarId: string) => {
          sendMessage({ type: 'SET_AVATAR', avatarId });
        },
      }),
      [sendMessage, isReady]
    );

    /**
     * Send config updates when config prop changes
     */
    useEffect(() => {
      if (config?.avatarId && isReady) {
        sendMessage({ type: 'SET_AVATAR', avatarId: config.avatarId });
      }
    }, [config, isReady, sendMessage]);

    /**
     * Handle WebView load error
     */
    const handleWebViewError = useCallback(
      (syntheticEvent: { nativeEvent: { description: string } }) => {
        const { description } = syntheticEvent.nativeEvent;
        setError(description);
        setIsLoading(false);
        onError?.({ message: description, code: 'WEBVIEW_ERROR' });
      },
      [onError]
    );

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={webViewSource}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          onError={handleWebViewError}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          originWhitelist={['*']}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          // Android-specific optimizations
          androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
          // CRITICAL: Enable cross-origin access for inline HTML WebView
          // Without these, fetch() calls to CDN URLs fail with CORS errors
          // because inline HTML has 'null' origin
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          // iOS-specific settings
          allowsBackForwardNavigationGestures={false}
        />

        {/* Loading overlay */}
        {showLoading && isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading 3D Renderer...</Text>
          </View>
        )}

        {/* Error overlay */}
        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}
      </View>
    );
  }
);

WebGL3DView.displayName = 'WebGL3DView';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default WebGL3DView;
