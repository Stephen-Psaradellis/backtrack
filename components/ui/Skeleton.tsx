'use client';

import { type HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const baseStyles = 'bg-neutral-200 dark:bg-neutral-700';

  const variantStyles = {
    text: 'rounded-md h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    shimmer: 'skeleton-shimmer',
    none: '',
  };

  const classes = [
    baseStyles,
    variantStyles[variant],
    animationStyles[animation],
    className,
  ].filter(Boolean).join(' ');

  const inlineStyles = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  };

  return <div className={classes} style={inlineStyles} {...props} />;
}

export function SkeletonText({
  lines = 3,
  className = ''
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = 48,
  className = ''
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        <SkeletonAvatar size={44} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="60%" height={12} />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonText lines={2} />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  );
}

export function SkeletonPostCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-md ${className}`}>
      <Skeleton variant="rectangular" width="100%" height={160} animation="shimmer" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <SkeletonAvatar size={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="50%" height={14} />
            <Skeleton variant="text" width="30%" height={12} className="mt-1" />
          </div>
        </div>
        <SkeletonText lines={2} />
        <div className="mt-4 flex items-center justify-between">
          <Skeleton variant="rounded" width={100} height={28} />
          <Skeleton variant="circular" width={36} height={36} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChatItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 ${className}`}>
      <SkeletonAvatar size={52} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width={50} height={12} />
        </div>
        <Skeleton variant="text" width="70%" height={14} />
      </div>
    </div>
  );
}

export function SkeletonList({
  count = 5,
  ItemComponent = SkeletonCard,
  className = '',
  gap = 'gap-4'
}: {
  count?: number;
  ItemComponent?: React.ComponentType<{ className?: string }>;
  className?: string;
  gap?: string;
}) {
  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <ItemComponent />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
