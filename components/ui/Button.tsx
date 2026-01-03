'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-br from-primary-400 to-primary-600 text-white',
    'shadow-md hover:shadow-lg hover:shadow-primary-500/25',
    'focus-visible:ring-primary-500',
    'active:from-primary-500 active:to-primary-700',
    'disabled:from-primary-200 disabled:to-primary-300 disabled:shadow-none',
  ].join(' '),
  secondary: [
    'bg-neutral-100 text-neutral-900',
    'hover:bg-neutral-200',
    'focus-visible:ring-neutral-400',
    'active:bg-neutral-300',
    'disabled:bg-neutral-50 disabled:text-neutral-400',
    'dark:bg-neutral-800 dark:text-neutral-100',
    'dark:hover:bg-neutral-700 dark:active:bg-neutral-600',
    'dark:disabled:bg-neutral-900 dark:disabled:text-neutral-600',
  ].join(' '),
  outline: [
    'bg-transparent border-2 border-primary-500 text-primary-600',
    'hover:bg-primary-50',
    'focus-visible:ring-primary-500',
    'active:bg-primary-100',
    'disabled:border-primary-200 disabled:text-primary-300',
    'dark:text-primary-400 dark:hover:bg-primary-950',
    'dark:active:bg-primary-900',
    'dark:disabled:border-primary-800 dark:disabled:text-primary-700',
  ].join(' '),
  ghost: [
    'bg-transparent text-neutral-700',
    'hover:bg-neutral-100',
    'focus-visible:ring-neutral-400',
    'active:bg-neutral-200',
    'disabled:text-neutral-400',
    'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:active:bg-neutral-700',
  ].join(' '),
  danger: [
    'bg-gradient-to-br from-error to-error-dark text-white',
    'shadow-md hover:shadow-lg hover:shadow-error/25',
    'focus-visible:ring-error',
    'active:from-error-dark active:to-red-800',
    'disabled:from-red-200 disabled:to-red-300 disabled:shadow-none',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm gap-1.5 rounded-[12px]',
  md: 'px-5 py-2.5 text-base gap-2 rounded-[14px]',
  lg: 'px-7 py-3.5 text-lg gap-2.5 rounded-[16px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const baseStyles = [
      'inline-flex items-center justify-center',
      'font-semibold',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed',
      'active:scale-[0.98]',
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={baseStyles}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <LoadingSpinner size={size} />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default Button;
