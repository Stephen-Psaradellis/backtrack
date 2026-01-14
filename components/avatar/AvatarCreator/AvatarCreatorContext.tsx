/**
 * Avatar Creator Context
 *
 * Shared context and hooks for the Avatar Creator component.
 * Extracted to avoid circular dependencies between index.tsx and PreviewPanel3D.tsx
 */

import { createContext, useContext } from 'react';
import type { AvatarView } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarCreatorState {
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

export interface AvatarCreatorContextValue extends AvatarCreatorState {
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

// =============================================================================
// CONTEXT
// =============================================================================

export const AvatarCreatorContext = createContext<AvatarCreatorContextValue | null>(null);

// =============================================================================
// HOOKS
// =============================================================================

export function useAvatarCreatorContext(): AvatarCreatorContextValue {
  const context = useContext(AvatarCreatorContext);
  if (!context) {
    throw new Error('useAvatarCreatorContext must be used within AvatarCreatorProvider');
  }
  return context;
}

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
