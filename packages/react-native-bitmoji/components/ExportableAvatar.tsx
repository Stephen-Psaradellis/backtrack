/**
 * ExportableAvatar Component
 *
 * Wraps the Avatar component with export capabilities.
 * Uses react-native-view-shot to capture the rendered avatar.
 */

import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Avatar } from '../avatar/Avatar';
import { AvatarConfig, AvatarSize } from '../avatar/types';
import {
  ExportFormat,
  ExportSize,
  ExportOptions,
  ExportResult,
  saveToTemp,
  saveToMediaLibrary,
  shareImage,
  getExportPixelSize,
} from '../services/export';

// =============================================================================
// TYPES
// =============================================================================

export interface ExportableAvatarRef {
  /** Capture the avatar as base64 */
  captureAsBase64: (options?: CaptureOptions) => Promise<string>;
  /** Capture and save to temp file */
  captureToFile: (options?: ExportOptions) => Promise<ExportResult>;
  /** Capture and save to media library */
  captureToLibrary: (options?: ExportOptions) => Promise<ExportResult>;
  /** Capture and share */
  captureAndShare: (options?: ExportOptions & { shareMessage?: string }) => Promise<ExportResult>;
}

interface CaptureOptions {
  format?: ExportFormat;
  quality?: number;
  size?: ExportSize;
}

interface ExportableAvatarProps {
  config: AvatarConfig;
  size?: AvatarSize;
  customSize?: number;
  style?: ViewStyle;
  showBorder?: boolean;
  borderColor?: string;
  borderWidth?: number;
  backgroundColor?: string;
  /** Render size for export (independent of display size) */
  exportSize?: ExportSize;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ExportableAvatar = forwardRef<ExportableAvatarRef, ExportableAvatarProps>(
  function ExportableAvatar(
    {
      config,
      size = 'md',
      customSize,
      style,
      showBorder = false,
      borderColor,
      borderWidth,
      backgroundColor = '#f0f0f0',
      exportSize = 'large',
    },
    ref
  ) {
    const viewShotRef = useRef<ViewShot>(null);

    // Capture as base64
    const captureAsBase64 = useCallback(
      async (options: CaptureOptions = {}): Promise<string> => {
        const { format = 'png', quality = 1 } = options;

        if (!viewShotRef.current) {
          throw new Error('View not ready');
        }

        // react-native-view-shot only supports 'png' | 'jpg', fallback webp to png
        const captureFormat: 'png' | 'jpg' = format === 'jpg' ? 'jpg' : 'png';

        const result = await captureRef(viewShotRef, {
          format: captureFormat,
          quality,
          result: 'base64',
        });

        return result;
      },
      []
    );

    // Capture to temp file
    const captureToFile = useCallback(
      async (options: ExportOptions = {}): Promise<ExportResult> => {
        try {
          const base64 = await captureAsBase64({
            format: options.format,
            quality: options.quality,
          });

          return await saveToTemp(base64, options);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Capture failed',
          };
        }
      },
      [captureAsBase64]
    );

    // Capture to media library
    const captureToLibrary = useCallback(
      async (options: ExportOptions = {}): Promise<ExportResult> => {
        try {
          const fileResult = await captureToFile(options);
          if (!fileResult.success || !fileResult.uri) {
            return fileResult;
          }

          return await saveToMediaLibrary(fileResult.uri);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Save to library failed',
          };
        }
      },
      [captureToFile]
    );

    // Capture and share
    const captureAndShare = useCallback(
      async (
        options: ExportOptions & { shareMessage?: string } = {}
      ): Promise<ExportResult> => {
        try {
          const fileResult = await captureToFile(options);
          if (!fileResult.success || !fileResult.uri) {
            return fileResult;
          }

          return await shareImage(fileResult.uri, {
            title: 'Share Avatar',
            message: options.shareMessage,
          });
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Share failed',
          };
        }
      },
      [captureToFile]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        captureAsBase64,
        captureToFile,
        captureToLibrary,
        captureAndShare,
      }),
      [captureAsBase64, captureToFile, captureToLibrary, captureAndShare]
    );

    const exportPixelSize = getExportPixelSize(exportSize);

    return (
      <View style={style}>
        {/* Visible avatar at display size */}
        <Avatar
          config={config}
          size={size}
          customSize={customSize}
          showBorder={showBorder}
          borderColor={borderColor}
          borderWidth={borderWidth}
          backgroundColor={backgroundColor}
        />

        {/* Hidden ViewShot for export at higher resolution */}
        <View style={styles.hiddenContainer}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
            style={[
              styles.exportView,
              { width: exportPixelSize, height: exportPixelSize },
            ]}
          >
            <Avatar
              config={config}
              customSize={exportPixelSize}
              backgroundColor={backgroundColor}
            />
          </ViewShot>
        </View>
      </View>
    );
  }
);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  exportView: {
    backgroundColor: 'transparent',
  },
});

export default ExportableAvatar;
