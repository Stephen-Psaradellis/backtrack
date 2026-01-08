'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'glass';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'article' | 'section';
}

const variantStyles: Record<CardVariant, string> = {
  default: [
    'bg-white dark:bg-neutral-800',
    'shadow-sm',
    'border border-neutral-100 dark:border-neutral-700/50',
  ].join(' '),
  outlined: [
    'bg-white dark:bg-neutral-800',
    'border border-neutral-200 dark:border-neutral-700',
  ].join(' '),
  elevated: [
    'bg-white dark:bg-neutral-800',
    'shadow-lg',
  ].join(' '),
  glass: [
    'bg-white/70 dark:bg-neutral-800/70',
    'backdrop-blur-lg',
    'border border-white/20 dark:border-neutral-700/30',
    'shadow-lg shadow-neutral-900/5',
  ].join(' '),
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      interactive = false,
      padding = 'md',
      as: Component = 'div',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const interactiveStyles = interactive
      ? [
          'cursor-pointer',
          'transition-all duration-200 ease-out',
          'hover:-translate-y-1 hover:shadow-lg',
          'active:translate-y-0 active:shadow-md active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        ].join(' ')
      : '';

    const classes = [
      'rounded-xl',
      variantStyles[variant],
      paddingStyles[padding],
      interactiveStyles,
      className,
    ].filter(Boolean).join(' ');

    return (
      <Component
        ref={ref}
        className={classes}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  if (children) {
    return (
      <div className={`mb-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={`flex items-start justify-between mb-4 ${className}`} {...props}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700/50 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
