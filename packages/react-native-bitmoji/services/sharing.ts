/**
 * Sharing Service
 *
 * Handles social sharing of avatars and stickers across different platforms.
 * Integrates with native share sheet and clipboard functionality.
 */

import { Platform, Share, Clipboard } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { captureRef, CaptureOptions } from 'react-native-view-shot';

// =============================================================================
// TYPES
// =============================================================================

export interface ShareOptions {
  /** Title for the share dialog */
  title?: string;
  /** Message to include with the share */
  message?: string;
  /** Subject line (for email) */
  subject?: string;
  /** URL to share (if applicable) */
  url?: string;
}

export interface ShareResult {
  success: boolean;
  action?: 'shared' | 'dismissed' | 'copied';
  error?: string;
}

// =============================================================================
// SHARING FUNCTIONS
// =============================================================================

/**
 * Check if sharing is available on the device
 */
export async function isSharingAvailable(): Promise<boolean> {
  return await Sharing.isAvailableAsync();
}

/**
 * Share an image file using the native share sheet
 */
export async function shareImageFile(
  fileUri: string,
  options: ShareOptions = {}
): Promise<ShareResult> {
  try {
    const isAvailable = await isSharingAvailable();

    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: options.title || 'Share Avatar',
        UTI: 'public.png',
      });
      return { success: true, action: 'shared' };
    } else {
      // Fallback to native Share API
      const result = await Share.share({
        url: fileUri,
        title: options.title,
        message: options.message,
      });

      if (result.action === Share.sharedAction) {
        return { success: true, action: 'shared' };
      } else if (result.action === Share.dismissedAction) {
        return { success: true, action: 'dismissed' };
      }

      return { success: true };
    }
  } catch (error) {
    // User cancellation is not an error
    if ((error as Error).message?.includes('cancel') ||
        (error as Error).message?.includes('dismiss')) {
      return { success: true, action: 'dismissed' };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share',
    };
  }
}

/**
 * Share a base64 image by first saving it to a temp file
 */
export async function shareBase64Image(
  base64Data: string,
  options: ShareOptions & { filename?: string } = {}
): Promise<ShareResult> {
  try {
    const filename = options.filename || `avatar_${Date.now()}`;
    const file = new File(Paths.cache, `${filename}.png`);

    // Remove data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to Uint8Array and write
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    await file.write(bytes);

    // Share the file
    const result = await shareImageFile(file.uri, options);

    // Clean up temp file after sharing
    setTimeout(async () => {
      try {
        await file.delete();
      } catch {
        // Ignore cleanup errors
      }
    }, 5000);

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share image',
    };
  }
}

/**
 * Share a React Native view/component by capturing it first
 */
export async function shareView(
  viewRef: React.RefObject<any>,
  options: ShareOptions & { size?: number; quality?: number } = {}
): Promise<ShareResult> {
  try {
    const { size = 512, quality = 1, ...shareOptions } = options;

    const captureOptions: CaptureOptions = {
      format: 'png',
      quality,
      result: 'tmpfile',
      width: size,
      height: size,
    };

    const uri = await captureRef(viewRef, captureOptions);
    return await shareImageFile(uri, shareOptions);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture and share',
    };
  }
}

/**
 * Copy image to clipboard (base64)
 * Note: Full image clipboard support varies by platform
 */
export async function copyImageToClipboard(base64Data: string): Promise<ShareResult> {
  try {
    // On most platforms, we can only copy text to clipboard
    // We'll copy a data URI which some apps can paste
    const dataUri = base64Data.startsWith('data:')
      ? base64Data
      : `data:image/png;base64,${base64Data}`;

    Clipboard.setString(dataUri);
    return { success: true, action: 'copied' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
    };
  }
}

/**
 * Copy a captured view to clipboard
 */
export async function copyViewToClipboard(
  viewRef: React.RefObject<any>,
  options: { size?: number; quality?: number } = {}
): Promise<ShareResult> {
  try {
    const { size = 512, quality = 1 } = options;

    const captureOptions: CaptureOptions = {
      format: 'png',
      quality,
      result: 'base64',
      width: size,
      height: size,
    };

    const base64 = await captureRef(viewRef, captureOptions);
    return await copyImageToClipboard(base64);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
    };
  }
}

/**
 * Save a captured view to the device gallery
 */
export async function saveViewToGallery(
  viewRef: React.RefObject<any>,
  options: { size?: number; quality?: number } = {}
): Promise<ShareResult> {
  try {
    const { size = 512, quality = 1 } = options;

    const captureOptions: CaptureOptions = {
      format: 'png',
      quality,
      result: 'tmpfile',
      width: size,
      height: size,
    };

    const uri = await captureRef(viewRef, captureOptions);

    // Import MediaLibrary functions
    const { saveToMediaLibrary, requestMediaLibraryPermission } = await import('./export');

    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      return { success: false, error: 'Gallery permission denied' };
    }

    const result = await saveToMediaLibrary(uri);
    if (result.success) {
      return { success: true, action: 'shared' };
    }
    return { success: false, error: result.error || 'Failed to save to gallery' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to gallery',
    };
  }
}

/**
 * Share text content (for sharing profile links, etc.)
 */
export async function shareText(
  text: string,
  options: ShareOptions = {}
): Promise<ShareResult> {
  try {
    const result = await Share.share({
      message: text,
      title: options.title,
      url: options.url,
    });

    if (result.action === Share.sharedAction) {
      return { success: true, action: 'shared' };
    } else if (result.action === Share.dismissedAction) {
      return { success: true, action: 'dismissed' };
    }

    return { success: true };
  } catch (error) {
    if ((error as Error).message?.includes('cancel')) {
      return { success: true, action: 'dismissed' };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to share',
    };
  }
}

/**
 * Get share options for specific platforms
 */
export function getPlatformShareOptions(): {
  canShareToInstagram: boolean;
  canShareToWhatsApp: boolean;
  canShareToMessages: boolean;
} {
  return {
    canShareToInstagram: true, // Available on both platforms via share sheet
    canShareToWhatsApp: true, // Available on both platforms via share sheet
    canShareToMessages: Platform.OS === 'ios', // iMessage is iOS only
  };
}

// =============================================================================
// SOCIAL PLATFORM HELPERS
// =============================================================================

/**
 * Generate a shareable message with the avatar
 */
export function generateShareMessage(
  stickerName?: string,
  customMessage?: string
): string {
  if (customMessage) {
    return customMessage;
  }

  const appName = 'Bitmoji Clone';

  if (stickerName) {
    return `Check out my "${stickerName}" sticker! Created with ${appName}`;
  }

  return `Check out my custom avatar! Created with ${appName}`;
}

/**
 * Create a share intent for a sticker
 */
export async function shareStickerIntent(
  viewRef: React.RefObject<any>,
  stickerName?: string,
  customMessage?: string
): Promise<ShareResult> {
  const message = generateShareMessage(stickerName, customMessage);

  return shareView(viewRef, {
    title: 'Share Sticker',
    message,
    size: 512,
    quality: 1,
  });
}
