'use client';

import { type HTMLAttributes, type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  secondary: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
  success: 'bg-success-light text-success-dark dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-warning-light text-warning-dark dark:bg-yellow-900/40 dark:text-yellow-300',
  error: 'bg-error-light text-error-dark dark:bg-red-900/40 dark:text-red-300',
  outline: 'bg-transparent border border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const dotSizeStyles: Record<BadgeSize, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const classes = [
    'inline-flex items-center gap-1.5',
    'font-medium rounded-full',
    'whitespace-nowrap',
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {dot && (
        <span
          className={`${dotSizeStyles[size]} rounded-full bg-current opacity-70`}
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export interface BadgeGroupProps {
  children: ReactNode;
  className?: string;
}

export function BadgeGroup({ children, className = '' }: BadgeGroupProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {children}
    </div>
  );
}

export interface NotificationBadgeProps {
  count?: number;
  max?: number;
  showZero?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}

export function NotificationBadge({
  count = 0,
  max = 99,
  showZero = false,
  size = 'md',
  className = '',
  children,
}: NotificationBadgeProps) {
  const showBadge = showZero || count > 0;
  const displayCount = count > max ? `${max}+` : count;

  const badgeSizeClasses = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      {showBadge && (
        <span
          className={[
            'absolute -top-1 -right-1',
            'flex items-center justify-center',
            'font-semibold text-white',
            'bg-error rounded-full',
            'animate-fade-in-scale',
            badgeSizeClasses[size],
          ].join(' ')}
        >
          {displayCount}
        </span>
      )}
    </div>
  );
}

export default Badge;
