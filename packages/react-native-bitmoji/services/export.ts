/**
 * Export Service
 *
 * Handles exporting avatars and stickers to various formats (PNG, SVG).
 * Uses react-native-view-shot for capturing rendered views.
 */

import { Platform, Share } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef, CaptureOptions } from 'react-native-view-shot';
import { AvatarConfig } from '../avatar/types';

// =============================================================================
// TYPES
// =============================================================================

export type ExportFormat = 'png' | 'jpg' | 'webp';
export type ExportSize = 'small' | 'medium' | 'large' | 'xlarge';

export interface ExportOptions {
  format?: ExportFormat;
  size?: ExportSize;
  quality?: number; // 0-1 for jpg/webp
  transparent?: boolean;
  filename?: string;
}

export interface ExportResult {
  success: boolean;
  uri?: string;
  base64?: string;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SIZE_MAP: Record<ExportSize, number> = {
  small: 128,
  medium: 256,
  large: 512,
  xlarge: 1024,
};

const FORMAT_MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Check if sharing is available on the device
 */
export async function canShare(): Promise<boolean> {
  return await Sharing.isAvailableAsync();
}

/**
 * Check if we have permission to save to media library
 */
export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Save a base64 image to a temporary file
 */
export async function saveToTemp(
  base64: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  try {
    const { format = 'png', filename } = options;
    const name = filename || `avatar_${Date.now()}`;
    const file = new File(Paths.cache, `${name}.${format}`);

    // Remove data URI prefix if present
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to Uint8Array and write
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    await file.write(bytes);

    return { success: true, uri: file.uri };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save file',
    };
  }
}

/**
 * Save image to the device's media library
 */
export async function saveToMediaLibrary(uri: string): Promise<ExportResult> {
  try {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      return { success: false, error: 'Media library permission denied' };
    }

    const asset = await MediaLibrary.createAssetAsync(uri);
    return { success: true, uri: asset.uri };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to media library',
    };
  }
}

/**
 * Share an image file using the system share sheet
 */
export async function shareImage(
  uri: string,
  options: { title?: string; message?: string } = {}
): Promise<ExportResult> {
  try {
    const canShareFile = await canShare();

    if (canShareFile) {
      // Use expo-sharing for file sharing
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: options.title || 'Share Avatar',
      });
      return { success: true };
    } else {
      // Fallback to native Share API (mainly for web)
      await Share.share({
        url: uri,
        title: options.title,
        message: options.message,
      });
      return { success: true };
    }
  } catch (error) {
    // User cancelled sharing is not an error
    if ((error as Error).message?.includes('cancel')) {
      return { success: true };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share',
    };
  }
}

/**
 * Generate a unique filename for export
 */
export function generateFilename(prefix: string = 'avatar'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Get the pixel size for an export size option
 */
export function getExportPixelSize(size: ExportSize): number {
  return SIZE_MAP[size];
}

/**
 * Get MIME type for a format
 */
export function getMimeType(format: ExportFormat): string {
  return FORMAT_MIME[format];
}

// =============================================================================
// AVATAR EXPORT UTILITIES
// =============================================================================

/**
 * Export config to JSON for backup/restore
 */
export async function exportConfigToJson(
  config: AvatarConfig,
  name?: string
): Promise<ExportResult> {
  try {
    const filename = name || generateFilename('avatar_config');
    const file = new File(Paths.cache, `${filename}.json`);
    const data = JSON.stringify(config, null, 2);

    await file.write(data);
    return { success: true, uri: file.uri };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export config',
    };
  }
}

/**
 * Import config from JSON file
 */
export async function importConfigFromJson(uri: string): Promise<{
  success: boolean;
  config?: AvatarConfig;
  error?: string;
}> {
  try {
    const file = new File(uri);
    const data = await file.text();
    const config = JSON.parse(data) as AvatarConfig;
    return { success: true, config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import config',
    };
  }
}

/**
 * Clean up temporary export files
 */
export async function cleanupTempFiles(): Promise<void> {
  try {
    const cacheDir = Paths.cache;
    const contents = cacheDir.list();

    for (const item of contents) {
      if (item instanceof File) {
        const name = item.name;
        if (name.startsWith('avatar_') || name.startsWith('sticker_')) {
          try {
            await item.delete();
          } catch {
            // Ignore individual file deletion errors
          }
        }
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// =============================================================================
// VIEW CAPTURE FUNCTIONS
// =============================================================================

/**
 * Capture a React Native view/component to an image
 */
export async function captureViewToImage(
  viewRef: React.RefObject<any>,
  options: ExportOptions = {}
): Promise<ExportResult> {
  try {
    const { format = 'png', size = 'large', quality = 1 } = options;
    const pixelSize = SIZE_MAP[size];

    const captureOptions: CaptureOptions = {
      format: format === 'jpg' ? 'jpg' : 'png',
      quality,
      result: 'tmpfile',
      width: pixelSize,
      height: pixelSize,
    };

    const uri = await captureRef(viewRef, captureOptions);
    return { success: true, uri };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture view',
    };
  }
}

/**
 * Capture view and return as base64 string
 */
export async function captureViewToBase64(
  viewRef: React.RefObject<any>,
  options: ExportOptions = {}
): Promise<ExportResult> {
  try {
    const { format = 'png', size = 'large', quality = 1 } = options;
    const pixelSize = SIZE_MAP[size];

    const captureOptions: CaptureOptions = {
      format: format === 'jpg' ? 'jpg' : 'png',
      quality,
      result: 'base64',
      width: pixelSize,
      height: pixelSize,
    };

    const base64 = await captureRef(viewRef, captureOptions);
    return { success: true, base64 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture view',
    };
  }
}

/**
 * Capture avatar/sticker view, save to file, and share
 */
export async function captureAndShare(
  viewRef: React.RefObject<any>,
  options: ExportOptions & { title?: string; message?: string } = {}
): Promise<ExportResult> {
  try {
    // Capture the view
    const captureResult = await captureViewToImage(viewRef, options);
    if (!captureResult.success || !captureResult.uri) {
      return captureResult;
    }

    // Share the captured image
    const shareResult = await shareImage(captureResult.uri, {
      title: options.title,
      message: options.message,
    });

    return shareResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture and share',
    };
  }
}

/**
 * Capture avatar/sticker view and save to media library
 */
export async function captureAndSaveToGallery(
  viewRef: React.RefObject<any>,
  options: ExportOptions = {}
): Promise<ExportResult> {
  try {
    // Capture the view
    const captureResult = await captureViewToImage(viewRef, options);
    if (!captureResult.success || !captureResult.uri) {
      return captureResult;
    }

    // Save to media library
    const saveResult = await saveToMediaLibrary(captureResult.uri);
    return saveResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to gallery',
    };
  }
}

/**
 * Export sticker with multiple resolution options
 */
export async function exportStickerMultiRes(
  viewRef: React.RefObject<any>,
  options: Omit<ExportOptions, 'size'> = {}
): Promise<{
  success: boolean;
  images?: { size: ExportSize; uri: string }[];
  error?: string;
}> {
  try {
    const sizes: ExportSize[] = ['small', 'medium', 'large', 'xlarge'];
    const images: { size: ExportSize; uri: string }[] = [];

    for (const size of sizes) {
      const result = await captureViewToImage(viewRef, { ...options, size });
      if (result.success && result.uri) {
        images.push({ size, uri: result.uri });
      }
    }

    if (images.length === 0) {
      return { success: false, error: 'Failed to export any resolution' };
    }

    return { success: true, images };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export multiple resolutions',
    };
  }
}
