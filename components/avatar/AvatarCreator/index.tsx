/**
 * Avatar Creator Component
 *
 * Full-screen avatar selection interface using 3D preset avatars.
 * Users select from complete avatar presets rather than building part-by-part.
 */

import React, { useCallback, useState, useMemo, createContext, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { StoredAvatar, AvatarView } from '../types';
import { DEFAULT_AVATAR_ID } from '../types';
import { createStoredAvatar, getRandomAvatarId } from '../../../lib/avatar/defaults';
import { PreviewPanel3D } from './PreviewPanel3D';
import { AvatarSelector } from './AvatarSelector';

// =============================================================================
// AVATAR CREATOR CONTEXT
// =============================================================================

interface AvatarCreatorState {
  /** Current selected avatar ID */
  avatarId: string;
  /** Current preview view mode */
  previewView: AvatarView;
  /** History of avatar selections for undo */
  history: string[];
  /** Current position in history */
  historyIndex: number;
  /** Whether avatar is currently loading */
  isLoading: boolean;
  /** Whether changes have been made */
  isDirty: boolean;
}

interface AvatarCreatorContextValue extends AvatarCreatorState {
  /** Select an avatar by ID */
  selectAvatar: (avatarId: string) => void;
  /** Randomize to a different avatar */
  randomizeAvatar: () => void;
  /** Set preview view (portrait/fullBody) */
  setPreviewView: (view: AvatarView) => void;
  /** Undo to previous selection */
  undo: () => void;
  /** Redo to next selection */
  redo: () => void;
  /** Set loading state */
  setAvatarLoading: (loading: boolean) => void;
  /** Check if undo is available */
  canUndo: boolean;
  /** Check if redo is available */
  canRedo: boolean;
}

const AvatarCreatorContext = createContext<AvatarCreatorContextValue | null>(null);

function useAvatarCreatorContext(): AvatarCreatorContextValue {
  const context = useContext(AvatarCreatorContext);
  if (!context) {
    throw new Error('useAvatarCreatorContext must be used within AvatarCreatorProvider');
  }
  return context;
}

// Export hooks for use in child components
export function useAvatarId(): string {
  return useAvatarCreatorContext().avatarId;
}

export function usePreviewView(): AvatarView {
  return useAvatarCreatorContext().previewView;
}

export function useIsAvatarLoading(): boolean {
  return useAvatarCreatorContext().isLoading;
}

export function useCanUndo(): boolean {
  return useAvatarCreatorContext().canUndo;
}

export function useCanRedo(): boolean {
  return useAvatarCreatorContext().canRedo;
}

export function useAvatarCreatorActions() {
  const ctx = useAvatarCreatorContext();
  return {
    selectAvatar: ctx.selectAvatar,
    randomizeAvatar: ctx.randomizeAvatar,
    setPreviewView: ctx.setPreviewView,
    undo: ctx.undo,
    redo: ctx.redo,
    setAvatarLoading: ctx.setAvatarLoading,
  };
}

// =============================================================================
// Props
// =============================================================================

export interface AvatarCreatorProps {
  /** Initial avatar preset ID */
  initialAvatarId?: string;
  /** Mode: creating own avatar or describing someone */
  mode?: 'self' | 'target';
  /** Title displayed in header */
  title?: string;
  /** Subtitle/instructions */
  subtitle?: string;
  /** Called when avatar is saved */
  onComplete: (avatar: StoredAvatar) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** @deprecated Preview now fills available space - this prop is ignored */
  previewHeight?: number;
  /** Enable debug logging for 3D preview */
  debug3D?: boolean;
}

// =============================================================================
// Header Component
// =============================================================================

interface HeaderProps {
  title: string;
  subtitle?: string;
  onCancel: () => void;
  onSave: () => void;
}

function Header({
  title,
  subtitle,
  onCancel,
  onSave,
}: HeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onCancel}
        activeOpacity={0.7}
        accessibilityLabel="Cancel"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
      </TouchableOpacity>

      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        <Text style={styles.versionSignature}>v2.3-hookfix</Text>
      </View>

      <TouchableOpacity
        style={[styles.headerButton, styles.saveButton]}
        onPress={onSave}
        activeOpacity={0.7}
        accessibilityLabel="Save avatar"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="check" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// Inner Component (with context access)
// =============================================================================

interface AvatarCreatorInnerProps {
  title: string;
  subtitle?: string;
  onComplete: (avatar: StoredAvatar) => void;
  onCancel: () => void;
  debug3D: boolean;
}

function AvatarCreatorInner({
  title,
  subtitle,
  onComplete,
  onCancel,
  debug3D,
}: AvatarCreatorInnerProps): React.JSX.Element {
  const { avatarId, selectAvatar } = useAvatarCreatorContext();

  // Handle save
  const handleSave = useCallback(() => {
    const storedAvatar = createStoredAvatar(avatarId);
    onComplete(storedAvatar);
  }, [avatarId, onComplete]);

  // Handle avatar selection
  const handleSelectAvatar = useCallback(
    (newAvatarId: string) => {
      selectAvatar(newAvatarId);
    },
    [selectAvatar]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Header
        title={title}
        subtitle={subtitle}
        onCancel={onCancel}
        onSave={handleSave}
      />

      {/* Avatar Selector */}
      <AvatarSelector
        selectedAvatarId={avatarId}
        onSelectAvatar={handleSelectAvatar}
      />

      {/* 3D Preview - expands to fill remaining space */}
      <PreviewPanel3D
        debug={debug3D}
      />
    </SafeAreaView>
  );
}

// =============================================================================
// Main Component with Provider
// =============================================================================

export function AvatarCreator({
  initialAvatarId,
  mode = 'self',
  title,
  subtitle,
  onComplete,
  onCancel,
  debug3D = false,
}: AvatarCreatorProps): React.JSX.Element {
  // State
  const [state, setState] = useState<AvatarCreatorState>(() => ({
    avatarId: initialAvatarId || DEFAULT_AVATAR_ID,
    previewView: 'portrait',
    history: [initialAvatarId || DEFAULT_AVATAR_ID],
    historyIndex: 0,
    isLoading: false,
    isDirty: false,
  }));

  // Actions
  const selectAvatar = useCallback((newAvatarId: string) => {
    setState((prev) => {
      // Add to history (truncate redo history)
      const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), newAvatarId];
      return {
        ...prev,
        avatarId: newAvatarId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      };
    });
  }, []);

  const randomizeAvatar = useCallback(() => {
    const newAvatarId = getRandomAvatarId();
    selectAvatar(newAvatarId);
  }, [selectAvatar]);

  const setPreviewView = useCallback((view: AvatarView) => {
    setState((prev) => ({ ...prev, previewView: view }));
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        avatarId: prev.history[newIndex],
        historyIndex: newIndex,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        avatarId: prev.history[newIndex],
        historyIndex: newIndex,
      };
    });
  }, []);

  const setAvatarLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  // Context value
  const contextValue = useMemo<AvatarCreatorContextValue>(() => ({
    ...state,
    selectAvatar,
    randomizeAvatar,
    setPreviewView,
    undo,
    redo,
    setAvatarLoading,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
  }), [state, selectAvatar, randomizeAvatar, setPreviewView, undo, redo, setAvatarLoading]);

  // Default titles based on mode
  const displayTitle = title ?? (mode === 'self' ? 'Create Your Avatar' : 'Describe Who You Saw');
  const displaySubtitle = subtitle ?? (mode === 'self'
    ? 'Choose an avatar that looks like you'
    : 'Choose an avatar that looks like them');

  return (
    <AvatarCreatorContext.Provider value={contextValue}>
      <AvatarCreatorInner
        title={displayTitle}
        subtitle={displaySubtitle}
        onComplete={onComplete}
        onCancel={onCancel}
        debug3D={debug3D}
      />
    </AvatarCreatorContext.Provider>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#6366F1',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  versionSignature: {
    fontSize: 9,
    color: '#D1D5DB',
    marginTop: 2,
  },
});

// =============================================================================
// Exports
// =============================================================================

export { AvatarSelector } from './AvatarSelector';
export { PreviewPanel3D } from './PreviewPanel3D';

export default AvatarCreator;
