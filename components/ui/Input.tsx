'use client';

import { forwardRef, type InputHTMLAttributes, useId } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: InputSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-lg',
};

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const labelSizeStyles: Record<InputSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      size = 'md',
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(error);

    const containerStyles = [
      'flex flex-col',
      fullWidth ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const inputWrapperStyles = [
      'relative flex items-center',
      fullWidth ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const inputStyles = [
      'block rounded-[12px]',
      'border-[1.5px] transition-all duration-200',
      'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
      'dark:disabled:bg-neutral-900 dark:disabled:text-neutral-500',
      hasError
        ? 'border-error focus:border-error focus:ring-error/20 dark:border-error'
        : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-neutral-600 dark:focus:border-primary-400',
      'bg-white dark:bg-neutral-800',
      'text-neutral-900 dark:text-neutral-100',
      sizeStyles[size],
      leftIcon ? 'pl-11' : '',
      rightIcon ? 'pr-11' : '',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const labelStyles = [
      'block font-medium mb-2',
      'text-neutral-700 dark:text-neutral-300',
      labelSizeStyles[size],
    ]
      .filter(Boolean)
      .join(' ');

    const iconBaseStyles = [
      'absolute top-1/2 -translate-y-1/2',
      'text-neutral-400 dark:text-neutral-500',
      'pointer-events-none',
      iconSizeStyles[size],
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerStyles}>
        {label && (
          <label htmlFor={inputId} className={labelStyles}>
            {label}
          </label>
        )}
        <div className={inputWrapperStyles}>
          {leftIcon && (
            <span className={`${iconBaseStyles} left-4`} aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={inputStyles}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            {...props}
          />
          {rightIcon && (
            <span className={`${iconBaseStyles} right-4`} aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>
        {hasError && (
          <p id={errorId} className="mt-2 text-sm text-error flex items-center gap-1.5" role="alert">
            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {!hasError && helperText && (
          <p id={helperId} className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
