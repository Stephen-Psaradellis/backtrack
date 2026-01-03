/**
 * Content Safety Service
 *
 * Provides content moderation and safety checks using Google Cloud Vision API.
 * Used to verify selfie photos and detect inappropriate content.
 *
 * Features:
 * - Face detection (verify selfies contain a face)
 * - Safe search detection (explicit content, violence, etc.)
 * - Multiple faces detection (only one person in selfie)
 *
 * @example
 * ```typescript
 * import { verifySelfie, checkImageSafety } from './contentSafety'
 *
 * const result = await verifySelfie(imageBase64)
 * if (!result.isValid) {
 *   showError(result.error)
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface FaceDetectionResult {
  /** Number of faces detected */
  faceCount: number
  /** Confidence score (0-1) for the primary face */
  confidence: number
  /** Whether exactly one face was detected */
  hasSingleFace: boolean
}

export interface SafeSearchResult {
  /** Adult content likelihood */
  adult: SafeSearchLikelihood
  /** Violence likelihood */
  violence: SafeSearchLikelihood
  /** Racy content likelihood */
  racy: SafeSearchLikelihood
  /** Medical content likelihood */
  medical: SafeSearchLikelihood
  /** Spoof content likelihood */
  spoof: SafeSearchLikelihood
}

export type SafeSearchLikelihood =
  | 'UNKNOWN'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY'

export interface SelfieVerificationResult {
  /** Whether the selfie is valid */
  isValid: boolean
  /** Error message if invalid */
  error?: string
  /** Face detection details */
  faceDetection?: FaceDetectionResult
  /** Safe search details */
  safeSearch?: SafeSearchResult
}

export interface ContentSafetyResult {
  /** Whether the content is safe */
  isSafe: boolean
  /** Reasons for rejection (if any) */
  rejectionReasons: string[]
  /** Safe search details */
  safeSearch?: SafeSearchResult
}

// ============================================================================
// Configuration
// ============================================================================

const VISION_API_KEY = process.env.NEXT_PUBLIC_GCP_CLOUD_VISION_API_KEY
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'

/**
 * Whether Cloud Vision API is configured
 */
export const isCloudVisionConfigured = Boolean(VISION_API_KEY)

/**
 * Likelihood values that are considered "unsafe"
 */
const UNSAFE_LIKELIHOODS: SafeSearchLikelihood[] = ['LIKELY', 'VERY_LIKELY']

/**
 * Minimum confidence for face detection
 */
const MIN_FACE_CONFIDENCE = 0.7

// ============================================================================
// API Client
// ============================================================================

interface VisionAPIRequest {
  requests: Array<{
    image: {
      content?: string
      source?: {
        imageUri?: string
      }
    }
    features: Array<{
      type: string
      maxResults?: number
    }>
  }>
}

interface VisionAPIResponse {
  responses: Array<{
    faceAnnotations?: Array<{
      detectionConfidence: number
      boundingPoly: unknown
    }>
    safeSearchAnnotation?: {
      adult: SafeSearchLikelihood
      violence: SafeSearchLikelihood
      racy: SafeSearchLikelihood
      medical: SafeSearchLikelihood
      spoof: SafeSearchLikelihood
    }
    error?: {
      code: number
      message: string
    }
  }>
}

/**
 * Call the Google Cloud Vision API
 */
async function callVisionAPI(
  imageBase64: string,
  features: string[]
): Promise<VisionAPIResponse['responses'][0] | null> {
  if (!isCloudVisionConfigured) {
    console.warn('[ContentSafety] Cloud Vision API key not configured')
    return null
  }

  const request: VisionAPIRequest = {
    requests: [
      {
        image: {
          content: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
        features: features.map((type) => ({
          type,
          maxResults: type === 'FACE_DETECTION' ? 10 : undefined,
        })),
      },
    ],
  }

  try {
    const response = await fetch(`${VISION_API_URL}?key=${VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[ContentSafety] Vision API error:', errorText)
      return null
    }

    const data: VisionAPIResponse = await response.json()
    return data.responses[0]
  } catch (error) {
    console.error('[ContentSafety] Vision API request failed:', error)
    return null
  }
}

// ============================================================================
// Face Detection
// ============================================================================

/**
 * Detect faces in an image
 *
 * @param imageBase64 - Base64-encoded image data
 * @returns Face detection result
 */
export async function detectFaces(
  imageBase64: string
): Promise<FaceDetectionResult | null> {
  const response = await callVisionAPI(imageBase64, ['FACE_DETECTION'])

  if (!response || response.error) {
    return null
  }

  const faces = response.faceAnnotations || []
  const primaryFace = faces[0]

  return {
    faceCount: faces.length,
    confidence: primaryFace?.detectionConfidence || 0,
    hasSingleFace: faces.length === 1,
  }
}

// ============================================================================
// Safe Search Detection
// ============================================================================

/**
 * Check image for inappropriate content
 *
 * @param imageBase64 - Base64-encoded image data
 * @returns Safe search result
 */
export async function detectSafeSearch(
  imageBase64: string
): Promise<SafeSearchResult | null> {
  const response = await callVisionAPI(imageBase64, ['SAFE_SEARCH_DETECTION'])

  if (!response || response.error || !response.safeSearchAnnotation) {
    return null
  }

  return response.safeSearchAnnotation
}

// ============================================================================
// High-Level Functions
// ============================================================================

/**
 * Verify a selfie photo for use in the app
 *
 * Checks:
 * 1. Contains exactly one face
 * 2. Face detection confidence is high enough
 * 3. No inappropriate content
 *
 * @param imageBase64 - Base64-encoded selfie image
 * @returns Verification result
 *
 * @example
 * ```typescript
 * const result = await verifySelfie(photoBase64)
 * if (result.isValid) {
 *   // Proceed with post creation
 * } else {
 *   showError(result.error)
 * }
 * ```
 */
export async function verifySelfie(
  imageBase64: string
): Promise<SelfieVerificationResult> {
  // If API not configured, skip verification (allow in development)
  if (!isCloudVisionConfigured) {
    console.warn('[ContentSafety] Skipping verification - API not configured')
    return {
      isValid: true,
      error: undefined,
    }
  }

  // Perform both checks in parallel
  const [faceResult, safeSearchResult] = await Promise.all([
    detectFaces(imageBase64),
    detectSafeSearch(imageBase64),
  ])

  // Check face detection
  if (!faceResult) {
    return {
      isValid: false,
      error: 'Unable to analyze image. Please try again.',
    }
  }

  if (faceResult.faceCount === 0) {
    return {
      isValid: false,
      error: 'No face detected. Please take a clear selfie showing your face.',
      faceDetection: faceResult,
    }
  }

  if (faceResult.faceCount > 1) {
    return {
      isValid: false,
      error: 'Multiple faces detected. Please take a selfie with only yourself.',
      faceDetection: faceResult,
    }
  }

  if (faceResult.confidence < MIN_FACE_CONFIDENCE) {
    return {
      isValid: false,
      error: 'Face not clear enough. Please take a clearer photo.',
      faceDetection: faceResult,
    }
  }

  // Check safe search
  if (safeSearchResult) {
    if (UNSAFE_LIKELIHOODS.includes(safeSearchResult.adult)) {
      return {
        isValid: false,
        error: 'Inappropriate content detected. Please use an appropriate photo.',
        faceDetection: faceResult,
        safeSearch: safeSearchResult,
      }
    }

    if (UNSAFE_LIKELIHOODS.includes(safeSearchResult.violence)) {
      return {
        isValid: false,
        error: 'Violent content detected. Please use an appropriate photo.',
        faceDetection: faceResult,
        safeSearch: safeSearchResult,
      }
    }
  }

  // All checks passed
  return {
    isValid: true,
    faceDetection: faceResult,
    safeSearch: safeSearchResult || undefined,
  }
}

/**
 * Check any image for content safety
 *
 * @param imageBase64 - Base64-encoded image
 * @returns Content safety result
 *
 * @example
 * ```typescript
 * const result = await checkImageSafety(photoBase64)
 * if (!result.isSafe) {
 *   blockImage(result.rejectionReasons)
 * }
 * ```
 */
export async function checkImageSafety(
  imageBase64: string
): Promise<ContentSafetyResult> {
  // If API not configured, assume safe (for development)
  if (!isCloudVisionConfigured) {
    return {
      isSafe: true,
      rejectionReasons: [],
    }
  }

  const safeSearch = await detectSafeSearch(imageBase64)

  if (!safeSearch) {
    // If we can't check, err on the side of caution
    return {
      isSafe: false,
      rejectionReasons: ['Unable to verify content safety'],
    }
  }

  const rejectionReasons: string[] = []

  if (UNSAFE_LIKELIHOODS.includes(safeSearch.adult)) {
    rejectionReasons.push('Adult content detected')
  }

  if (UNSAFE_LIKELIHOODS.includes(safeSearch.violence)) {
    rejectionReasons.push('Violent content detected')
  }

  if (UNSAFE_LIKELIHOODS.includes(safeSearch.racy)) {
    rejectionReasons.push('Racy content detected')
  }

  return {
    isSafe: rejectionReasons.length === 0,
    rejectionReasons,
    safeSearch,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a likelihood to a human-readable string
 */
export function likelihoodToString(likelihood: SafeSearchLikelihood): string {
  switch (likelihood) {
    case 'VERY_UNLIKELY':
      return 'Very Unlikely'
    case 'UNLIKELY':
      return 'Unlikely'
    case 'POSSIBLE':
      return 'Possible'
    case 'LIKELY':
      return 'Likely'
    case 'VERY_LIKELY':
      return 'Very Likely'
    default:
      return 'Unknown'
  }
}

/**
 * Check if a likelihood is considered "unsafe"
 */
export function isUnsafeLikelihood(likelihood: SafeSearchLikelihood): boolean {
  return UNSAFE_LIKELIHOODS.includes(likelihood)
}

// ============================================================================
// Exports
// ============================================================================

export default {
  verifySelfie,
  checkImageSafety,
  detectFaces,
  detectSafeSearch,
  likelihoodToString,
  isUnsafeLikelihood,
  isCloudVisionConfigured,
}
