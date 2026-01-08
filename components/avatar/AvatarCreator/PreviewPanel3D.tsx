/**
 * Preview Panel 3D Component
 *
 * 3D avatar preview for the Avatar Creator using WebGL rendering.
 * Shows the currently selected avatar preset in portrait or full body view.
 */

import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar3DCreator } from '../../avatar3d/Avatar3DCreator';
import type { AvatarView } from '../types';
import {
  useAvatarId,
  useIsAvatarLoading,
  usePreviewView,
  useCanUndo,
  useCanRedo,
  useAvatarCreatorActions,
} from './index';

// =============================================================================
// Action Button Component
// =============================================================================

interface ActionButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  label: string;
}

function ActionButton({
  icon,
  onPress,
  disabled = false,
  label,
}: ActionButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={disabled ? '#D1D5DB' : '#6B7280'}
      />
    </TouchableOpacity>
  );
}

// =============================================================================
// View Toggle Component
// =============================================================================

interface ViewToggleProps {
  view: AvatarView;
  onViewChange: (view: AvatarView) => void;
}

function ViewToggle({ view, onViewChange }: ViewToggleProps): React.JSX.Element {
  return (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[
          styles.viewToggleButton,
          view === 'portrait' && styles.viewToggleButtonActive,
        ]}
        onPress={() => onViewChange('portrait')}
        activeOpacity={0.7}
        accessibilityLabel="Portrait view"
        accessibilityRole="tab"
        accessibilityState={{ selected: view === 'portrait' }}
      >
        <MaterialCommunityIcons
          name="account-circle"
          size={20}
          color={view === 'portrait' ? '#6366F1' : '#9CA3AF'}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.viewToggleButton,
          view === 'fullBody' && styles.viewToggleButtonActive,
        ]}
        onPress={() => onViewChange('fullBody')}
        activeOpacity={0.7}
        accessibilityLabel="Full body view"
        accessibilityRole="tab"
        accessibilityState={{ selected: view === 'fullBody' }}
      >
        <MaterialCommunityIcons
          name="human"
          size={20}
          color={view === 'fullBody' ? '#6366F1' : '#9CA3AF'}
        />
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// Preview Panel 3D Component
// =============================================================================

export interface PreviewPanel3DProps {
  /** Height of the preview panel */
  height?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export function PreviewPanel3D({
  height = 280,
  debug = false,
}: PreviewPanel3DProps): React.JSX.Element {
  const avatarId = useAvatarId();
  const isAvatarLoading = useIsAvatarLoading();
  const previewView = usePreviewView();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const {
    setPreviewView,
    undo,
    redo,
    randomizeAvatar,
    setAvatarLoading,
  } = useAvatarCreatorActions();

  const [is3DReady, setIs3DReady] = useState(false);
  const [has3DError, setHas3DError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  /**
   * Handle 3D renderer ready
   */
  const handle3DReady = useCallback(() => {
    setIs3DReady(true);
    setHas3DError(false);
    setAvatarLoading(false);
  }, [setAvatarLoading]);

  /**
   * Handle 3D renderer error
   */
  const handle3DError = useCallback((error: { message: string; code: string }) => {
    console.error('[PreviewPanel3D] 3D error:', error);
    setHas3DError(true);
    setAvatarLoading(false);
  }, [setAvatarLoading]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setHas3DError(false);
    setIs3DReady(false);
    setRetryKey((prev) => prev + 1);
  }, []);

  /**
   * Handle avatar loading state
   */
  const handleAvatarLoading = useCallback(() => {
    setAvatarLoading(true);
  }, [setAvatarLoading]);

  /**
   * Handle avatar loaded state
   */
  const handleAvatarLoaded = useCallback(() => {
    setAvatarLoading(false);
  }, [setAvatarLoading]);

  // Calculate preview container height (minus action bar)
  const previewHeight = height - 56;

  // Error state
  if (has3DError) {
    return (
      <View style={[styles.container, { height }]}>
        {/* Top actions row */}
        <View style={styles.topActions}>
          <View style={styles.leftActions}>
            <ActionButton
              icon="undo"
              onPress={undo}
              disabled={!canUndo}
              label="Undo"
            />
            <ActionButton
              icon="redo"
              onPress={redo}
              disabled={!canRedo}
              label="Redo"
            />
          </View>

          <ViewToggle view={previewView} onViewChange={setPreviewView} />

          <View style={styles.rightActions}>
            <ActionButton
              icon="shuffle-variant"
              onPress={randomizeAvatar}
              label="Randomize"
            />
          </View>
        </View>

        {/* Error state */}
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text style={styles.errorText}>3D preview unavailable</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {/* Top actions row */}
      <View style={styles.topActions}>
        <View style={styles.leftActions}>
          <ActionButton
            icon="undo"
            onPress={undo}
            disabled={!canUndo}
            label="Undo"
          />
          <ActionButton
            icon="redo"
            onPress={redo}
            disabled={!canRedo}
            label="Redo"
          />
        </View>

        <ViewToggle view={previewView} onViewChange={setPreviewView} />

        <View style={styles.rightActions}>
          <ActionButton
            icon="shuffle-variant"
            onPress={randomizeAvatar}
            label="Randomize"
          />
        </View>
      </View>

      {/* 3D Avatar preview */}
      <View style={styles.previewContainer}>
        {/* Loading overlay */}
        {isAvatarLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        )}

        <Avatar3DCreator
          key={`avatar3d-${retryKey}`}
          avatarId={avatarId}
          view={previewView}
          height={previewHeight}
          onReady={handle3DReady}
          onError={handle3DError}
          onAvatarLoading={handleAvatarLoading}
          onAvatarLoaded={handleAvatarLoaded}
          debug={debug}
          testID="avatar-3d-preview"
        />
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    height: 56,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#F3F4F6',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewToggleButton: {
    width: 36,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#EEF2FF',
  },
  previewContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
});

// =============================================================================
// Exports
// =============================================================================

export default PreviewPanel3D;
