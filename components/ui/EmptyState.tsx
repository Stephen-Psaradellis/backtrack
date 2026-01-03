'use client';

import { type ReactNode } from 'react';
import { Button } from './Button';

export type EmptyStateVariant =
  | 'no-posts'
  | 'no-messages'
  | 'no-matches'
  | 'no-results'
  | 'no-favorites'
  | 'error'
  | 'offline';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  children?: ReactNode;
}

const defaultContent: Record<EmptyStateVariant, { title: string; description: string }> = {
  'no-posts': {
    title: 'No posts yet',
    description: 'Be the first to create a post at this location and start a connection.',
  },
  'no-messages': {
    title: 'No messages yet',
    description: 'When you match with someone, your conversations will appear here.',
  },
  'no-matches': {
    title: 'No matches found',
    description: 'Keep exploring! Your perfect match might be just around the corner.',
  },
  'no-results': {
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  'no-favorites': {
    title: 'No favorites yet',
    description: 'Save your favorite locations to quickly access them later.',
  },
  'error': {
    title: 'Something went wrong',
    description: 'We couldn\'t load this content. Please try again.',
  },
  'offline': {
    title: 'You\'re offline',
    description: 'Check your internet connection and try again.',
  },
};

function EmptyStateIllustration({ variant }: { variant: EmptyStateVariant }) {
  const illustrations: Record<EmptyStateVariant, ReactNode> = {
    'no-posts': (
      <svg viewBox="0 0 200 160" fill="none" className="w-48 h-40">
        <circle cx="100" cy="80" r="60" className="fill-primary-100 dark:fill-primary-900/30" />
        <path
          d="M70 70 L100 50 L130 70 L130 110 L70 110 Z"
          className="fill-primary-200 dark:fill-primary-800/50"
        />
        <rect x="85" y="85" width="30" height="25" rx="2" className="fill-primary-400" />
        <circle cx="100" cy="65" r="8" className="fill-primary-500" />
        <path
          d="M60 120 Q100 140 140 120"
          className="stroke-neutral-300 dark:stroke-neutral-600"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
      </svg>
    ),
    'no-messages': (
      <svg viewBox="0 0 200 160" fill="none" className="w-48 h-40">
        <circle cx="100" cy="80" r="60" className="fill-accent-100 dark:fill-accent-900/30" />
        <rect x="60" y="55" width="80" height="55" rx="12" className="fill-accent-200 dark:fill-accent-800/50" />
        <path d="M60 95 L60 110 L80 95" className="fill-accent-200 dark:fill-accent-800/50" />
        <circle cx="80" cy="80" r="4" className="fill-accent-400" />
        <circle cx="100" cy="80" r="4" className="fill-accent-400" />
        <circle cx="120" cy="80" r="4" className="fill-accent-400" />
      </svg>
    ),
    'no-matches': (
      <svg viewBox="0 0 200 160" fill="none" className="w-48 h-40">
        <circle cx="100" cy="80" r="60" className="fill-primary-100 dark:fill-primary-900/30" />
        <circle cx="75" cy="75" r="25" className="fill-primary-200 dark:fill-primary-800/50 stroke-primary-300 dark:stroke-primary-700" strokeWidth="2" />
        <circle cx="125" cy="75" r="25" className="fill-accent-200 dark:fill-accent-800/50 stroke-accent-300 dark:stroke-accent-700" strokeWidth="2" />
        <path
          d="M85 110 Q100 125 115 110"
          className="stroke-neutral-400 dark:stroke-neutral-500"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
    'no-results': (
      <svg viewBox="0 0 200 160" fill="none" className="w-48 h-40">
        <circle cx="100" cy="80" r="60" className="fill-neutral-100 dark:fill-neutral-800" />
        <circle cx="90" cy="75" r="30" className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth="4" fill="none" />
        <line x1="112" y1="97" x2="135" y2="120" className="stroke-neutral-400 dark:stroke-neutral-500" strokeWidth="6" strokeLinecap="round" />
        <line x1="78" y1="65" x2="102" y2="85" className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth="3" strokeLinecap="round" />
        <line x1="102" y1="65" x2="78" y2="85" className="stroke-neutral-300 dark:stroke-neutral-600" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    'no-favorites': (
      <svg viewBox="0 0 200 160" fill="none" className="w-48 h-40">
        <circle cx="100" cy="80" r="60" className="fill-warning-light dark:fill-yellow-900/30" />
        <path
          d="M100 50 L108 72 L132 72 L113 86 L120 110 L100 95 L80 110 L87 86 L68 72 L92 72 Z"
          className="fill-warning dark:fill-yellow-500"
          strokeWidth="2"
        />
      </svg>
    ),
    'error': (
      <svg viewBox="0 0 200 160" fill="none" className="w-48 h-40">
        <circle cx="100" cy="80" r="60" className="fill-error-light dark:fill-red-900/30" />
        <circle cx="100" cy="80" r="35" className="stroke-error dark:stroke-red-400" strokeWidth="4" fill="none" />
        <line x1="100" y1="60" x2="100" y2="85" className="stroke-error dark:stroke-red-400" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="100" r="4" className="fill-error dark:fill-red-400" />
      </svg>
    ),
    'offline': (
      <svg viewBox="0 0 200 160" fill="none" className="w-48 h-40">
        <circle cx="100" cy="80" r="60" className="fill-neutral-100 dark:fill-neutral-800" />
        <path
          d="M65 90 Q100 50 135 90"
          className="stroke-neutral-300 dark:stroke-neutral-600"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M80 100 Q100 70 120 100"
          className="stroke-neutral-400 dark:stroke-neutral-500"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="100" cy="110" r="6" className="fill-neutral-400 dark:fill-neutral-500" />
        <line x1="60" y1="50" x2="140" y2="120" className="stroke-error dark:stroke-red-400" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className="flex justify-center mb-6 animate-float">
      {illustrations[variant]}
    </div>
  );
}

export function EmptyState({
  variant = 'no-results',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
  children,
}: EmptyStateProps) {
  const content = defaultContent[variant];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <EmptyStateIllustration variant={variant} />

      <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
        {title || content.title}
      </h3>

      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
        {description || content.description}
      </p>

      {children}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="md">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="ghost" onClick={onSecondaryAction} size="md">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
