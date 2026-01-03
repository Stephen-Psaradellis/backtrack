'use client';

import { type ImgHTMLAttributes } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'none';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  showRing?: boolean;
  ringColor?: 'primary' | 'accent' | 'gradient';
  fallback?: string;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { container: string; status: string; ring: string }> = {
  xs: { container: 'h-6 w-6', status: 'h-2 w-2 border', ring: 'ring-1 ring-offset-1' },
  sm: { container: 'h-8 w-8', status: 'h-2.5 w-2.5 border', ring: 'ring-2 ring-offset-1' },
  md: { container: 'h-10 w-10', status: 'h-3 w-3 border-2', ring: 'ring-2 ring-offset-2' },
  lg: { container: 'h-12 w-12', status: 'h-3.5 w-3.5 border-2', ring: 'ring-2 ring-offset-2' },
  xl: { container: 'h-16 w-16', status: 'h-4 w-4 border-2', ring: 'ring-[3px] ring-offset-2' },
  '2xl': { container: 'h-24 w-24', status: 'h-5 w-5 border-2', ring: 'ring-4 ring-offset-2' },
};

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-success',
  offline: 'bg-neutral-400 dark:bg-neutral-500',
  away: 'bg-warning',
  busy: 'bg-error',
  none: '',
};

const ringColors: Record<string, string> = {
  primary: 'ring-primary-500',
  accent: 'ring-accent-500',
  gradient: 'ring-primary-500', // Gradient handled separately
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  status = 'none',
  showRing = false,
  ringColor = 'primary',
  fallback,
  className = '',
  ...props
}: AvatarProps) {
  const sizeConfig = sizeClasses[size];
  const hasImage = Boolean(src);
  const initials = fallback ? getInitials(fallback) : alt ? getInitials(alt) : '?';

  const containerClasses = [
    'relative inline-flex items-center justify-center',
    'rounded-full overflow-hidden',
    'bg-gradient-to-br from-primary-400 to-accent-500',
    sizeConfig.container,
    showRing && ringColors[ringColor],
    showRing && sizeConfig.ring,
    showRing && 'ring-offset-white dark:ring-offset-neutral-900',
    className,
  ].filter(Boolean).join(' ');

  const gradientRingClasses = showRing && ringColor === 'gradient'
    ? 'before:absolute before:inset-0 before:rounded-full before:p-[3px] before:bg-gradient-to-br before:from-primary-400 before:to-accent-500 before:-z-10'
    : '';

  return (
    <div className={`${containerClasses} ${gradientRingClasses}`}>
      {hasImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover rounded-full"
          {...props}
        />
      ) : (
        <span className="text-white font-semibold text-[0.6em] select-none">
          {initials}
        </span>
      )}

      {status !== 'none' && (
        <span
          className={[
            'absolute bottom-0 right-0',
            'rounded-full',
            'border-white dark:border-neutral-900',
            statusColors[status],
            sizeConfig.status,
          ].join(' ')}
        />
      )}
    </div>
  );
}

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({
  children,
  max = 4,
  size = 'md',
  className = '',
}: AvatarGroupProps) {
  const avatars = Array.isArray(children) ? children : [children];
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  const overlapClasses: Record<AvatarSize, string> = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
    xl: '-ml-4',
    '2xl': '-ml-6',
  };

  return (
    <div className={`flex items-center ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className={[
            index > 0 && overlapClasses[size],
            'ring-2 ring-white dark:ring-neutral-900 rounded-full',
          ].filter(Boolean).join(' ')}
        >
          {avatar}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={[
            overlapClasses[size],
            sizeClasses[size].container,
            'flex items-center justify-center',
            'rounded-full',
            'bg-neutral-100 dark:bg-neutral-700',
            'text-neutral-600 dark:text-neutral-300',
            'text-xs font-medium',
            'ring-2 ring-white dark:ring-neutral-900',
          ].join(' ')}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default Avatar;
