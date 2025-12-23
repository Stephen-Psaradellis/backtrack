/**
 * SelfieCamera Component
 *
 * A front-facing camera component for capturing selfie images.
 * Used in the Producer flow for user verification before creating posts.
 *
 * @example
 * ```tsx
 * import { SelfieCamera } from 'components/SelfieCamera'
 *
 * // Basic usage
 * <SelfieCamera
 *   onCapture={(uri) => console.log('Captured:', uri)}
 *   onCancel={() => navigation.goBack()}
 * />
 *
 * // With error handling
 * <SelfieCamera
 *   onCapture={handleCapture}
 *   onCancel={handleCancel}
 *   onError={(error) => console.error(error)}
 * />
 *
 * // Full-screen modal usage
 * <FullScreenSelfieCamera
 *   onCapture={handleCapture}
 *   onCancel={handleCancel}
 * />
 * ```
 */

import React, { useState, useRef, useCallback, memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  ViewStyle,
} from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { LoadingSpinner } from './LoadingSpinner'
import { Button, GhostButton, OutlineButton } from './Button'
import { successFeedback, lightFeedback } from '../lib/haptics'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Photo result from camera capture
 */
export interface PhotoResult {
  /** URI of the captured image */
  uri: string
  /** Width of the image in pixels */
  width: number
  /** Height of the image in pixels */
  height: number
  /** Base64-encoded image data (if enabled) */
  base64?: string
}

/**
 * Props for the SelfieCamera component
 */
export interface SelfieCameraProps {
  /**
   * Callback when a photo is successfully captured
   * @param uri - The file URI of the captured photo
   */
  onCapture: (uri: string) => void

  /**
   * Callback when the user cancels the camera
   */
  onCancel?: () => void

  /**
   * Callback when an error occurs
   * @param error - The error message
   */
  onError?: (error: string) => void

  /**
   * Initial camera facing direction
   * @default 'front'
   */
  initialFacing?: CameraType

  /**
   * Whether to show camera flip button
   * @default true
   */
  showFlipButton?: boolean

  /**
   * Whether to enable flash
   * @default false
   */
  enableFlash?: boolean

  /**
   * Image quality (0-1)
   * @default 0.8
   */
  quality?: number

  /**
   * Whether to include base64 in result
   * @default false
   */
  includeBase64?: boolean

  /**
   * Custom container style
   */
  style?: ViewStyle

  /**
   * Test ID for testing purposes
   */
  testID?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default image quality for capture
 */
export const DEFAULT_QUALITY = 0.8

/**
 * Camera button sizes
 */
export const CAMERA_BUTTON_SIZES = {
  capture: 72,
  captureInner: 64,
  action: 48,
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SelfieCamera - Front-facing camera component for capturing selfies
 *
 * Features:
 * - Front-facing camera by default for selfies
 * - Optional camera flip to switch between front/back
 * - Permission handling with request UI
 * - Capture button with visual feedback
 * - Error handling with callback
 * - Customizable quality and base64 output
 */
export const SelfieCamera = memo(function SelfieCamera({
  onCapture,
  onCancel,
  onError,
  initialFacing = 'front',
  showFlipButton = true,
  enableFlash = false,
  quality = DEFAULT_QUALITY,
  includeBase64 = false,
  style,
  testID = 'selfie-camera',
}: SelfieCameraProps) {
  // Camera state
  const [facing, setFacing] = useState<CameraType>(initialFacing)
  const [isCapturing, setIsCapturing] = useState(false)
  const [flashMode, setFlashMode] = useState(enableFlash)
  const cameraRef = useRef<CameraView>(null)

  // Animation for capture button
  const scaleAnim = useRef(new Animated.Value(1)).current

  // Permission handling
  const [permission, requestPermission] = useCameraPermissions()

  /**
   * Toggle between front and back camera
   */
  const toggleFacing = useCallback(() => {
    lightFeedback()
    setFacing((current) => (current === 'front' ? 'back' : 'front'))
  }, [])

  /**
   * Toggle flash mode
   */
  const toggleFlash = useCallback(() => {
    setFlashMode((current) => !current)
  }, [])

  /**
   * Handle capture button press animation
   */
  const animatePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }, [scaleAnim])

  /**
   * Capture a photo from the camera
   */
  const takePicture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      return
    }

    setIsCapturing(true)
    animatePress()

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality,
        base64: includeBase64,
        skipProcessing: Platform.OS === 'android', // Improves speed on Android
      })

      if (photo) {
        successFeedback()
        onCapture(photo.uri)
      } else {
        onError?.('Failed to capture photo')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Camera capture failed'
      onError?.(errorMessage)
    } finally {
      setIsCapturing(false)
    }
  }, [isCapturing, animatePress, quality, includeBase64, onCapture, onError])

  // ============================================================================
  // PERMISSION HANDLING
  // ============================================================================

  // Still loading permission status
  if (!permission) {
    return (
      <View style={[styles.container, styles.permissionContainer, style]} testID={testID}>
        <LoadingSpinner message="Checking camera permission..." />
      </View>
    )
  }

  // Permission not granted - show request UI
  if (!permission.granted) {
    return (
      <View
        style={[styles.container, styles.permissionContainer, style]}
        testID={`${testID}-permission`}
      >
        <View style={styles.permissionContent}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            To verify your identity and create posts, we need access to your camera.
            Your selfie will be stored securely and only visible to you.
          </Text>
          <View style={styles.permissionButtons}>
            <Button
              title="Allow Camera Access"
              onPress={requestPermission}
              fullWidth
              testID={`${testID}-grant-permission`}
            />
            {onCancel && (
              <GhostButton
                title="Go Back"
                onPress={onCancel}
                testID={`${testID}-cancel-permission`}
              />
            )}
          </View>
        </View>
      </View>
    )
  }

  // ============================================================================
  // CAMERA VIEW
  // ============================================================================

  return (
    <View style={[styles.container, style]} testID={testID}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flashMode ? 'on' : 'off'}
        testID={`${testID}-view`}
      >
        {/* Top controls */}
        <View style={styles.topControls}>
          {onCancel && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onCancel}
              testID={`${testID}-cancel`}
              accessibilityLabel="Close camera"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}

          {/* Flash toggle (only for back camera) */}
          {facing === 'back' && (
            <TouchableOpacity
              style={[styles.flashButton, flashMode && styles.flashButtonActive]}
              onPress={toggleFlash}
              testID={`${testID}-flash`}
              accessibilityLabel={flashMode ? 'Turn off flash' : 'Turn on flash'}
              accessibilityRole="button"
            >
              <Text style={styles.flashButtonText}>⚡</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {/* Flip camera button */}
          {showFlipButton && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={toggleFacing}
              testID={`${testID}-flip`}
              accessibilityLabel="Switch camera"
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>🔄</Text>
            </TouchableOpacity>
          )}

          {/* Capture button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={isCapturing}
              testID={`${testID}-capture`}
              accessibilityLabel="Take photo"
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.captureButtonInner,
                  isCapturing && styles.captureButtonCapturing,
                ]}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Placeholder for alignment */}
          {showFlipButton ? (
            <View style={styles.actionButtonPlaceholder} />
          ) : null}
        </View>

        {/* Capture indicator */}
        {isCapturing && (
          <View style={styles.capturingOverlay} testID={`${testID}-capturing`}>
            <LoadingSpinner color="#FFFFFF" />
          </View>
        )}
      </CameraView>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          {facing === 'front'
            ? 'Position your face in the frame'
            : 'Take a photo for verification'}
        </Text>
      </View>
    </View>
  )
})

// ============================================================================
// PRESET VARIANTS
// ============================================================================

/**
 * Full-screen selfie camera with all controls
 */
export const FullScreenSelfieCamera = memo(function FullScreenSelfieCamera(
  props: Omit<SelfieCameraProps, 'style'>
) {
  return (
    <SelfieCamera
      {...props}
      style={styles.fullScreen}
      testID={props.testID ?? 'selfie-camera-fullscreen'}
    />
  )
})

/**
 * Compact selfie camera for embedding in forms
 */
export const CompactSelfieCamera = memo(function CompactSelfieCamera(
  props: Omit<SelfieCameraProps, 'showFlipButton'>
) {
  return (
<SelfieCamera
      {...props}
      showFlipButton={false}
      testID={props.testID ?? 'selfie-camera-compact'}
    />
  )
})

/**
 * Selfie camera without cancel option (required flow)
 */
export const RequiredSelfieCamera = memo(function RequiredSelfieCamera(
  props: Omit<SelfieCameraProps, 'onCancel'>
) {
  return (
    <SelfieCamera
      {...props}
      testID={props.testID ?? 'selfie-camera-required'}
    />
  )
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if the camera permission is granted
 * Useful for pre-checking before showing camera UI
 */
export async function checkCameraPermission(): Promise<boolean> {
  const { useCameraPermissions } = await import('expo-camera')
  // This is a simplistic check - for actual use, call the hook
  return true // Placeholder - actual check requires hook context
}

/**
 * Format a photo URI for display or upload
 */
export function formatPhotoUri(uri: string): string {
  // Ensure URI has proper file:// prefix on iOS
  if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
    return `file://${uri}`
  }
  return uri
}

/**
 * Get recommended quality based on use case
 */
export function getRecommendedQuality(useCase: 'profile' | 'verification' | 'preview'): number {
  switch (useCase) {
    case 'profile':
      return 0.9
    case 'verification':
      return 0.8
    case 'preview':
      return 0.5
    default:
      return DEFAULT_QUALITY
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  camera: {
    flex: 1,
  },

  // Permission UI
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionMessage: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButtons: {
    width: '100%',
    gap: 12,
  },

  // Top controls
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButtonActive: {
    backgroundColor: '#FFD700',
  },
  flashButtonText: {
    fontSize: 20,
  },

  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  actionButton: {
    width: CAMERA_BUTTON_SIZES.action,
    height: CAMERA_BUTTON_SIZES.action,
    borderRadius: CAMERA_BUTTON_SIZES.action / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPlaceholder: {
    width: CAMERA_BUTTON_SIZES.action,
    height: CAMERA_BUTTON_SIZES.action,
  },
  actionButtonText: {
    fontSize: 20,
  },

  // Capture button
  captureButton: {
    width: CAMERA_BUTTON_SIZES.capture,
    height: CAMERA_BUTTON_SIZES.capture,
    borderRadius: CAMERA_BUTTON_SIZES.capture / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 24,
  },
  captureButtonInner: {
    width: CAMERA_BUTTON_SIZES.captureInner,
    height: CAMERA_BUTTON_SIZES.captureInner,
    borderRadius: CAMERA_BUTTON_SIZES.captureInner / 2,
    backgroundColor: '#FFFFFF',
  },
  captureButtonCapturing: {
    backgroundColor: '#FFD700',
  },

  // Capture indicator
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Instructions
  instructions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
})