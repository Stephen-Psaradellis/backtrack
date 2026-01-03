'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  centered?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      size = 'md',
      showCloseButton = true,
      closeOnBackdropClick = true,
      closeOnEscape = true,
      footer,
      centered = true,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const titleId = `${generatedId}-title`;
    const descriptionId = `${generatedId}-description`;

    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);

    const getFocusableElements = useCallback(() => {
      if (!modalRef.current) return [];
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors.join(', '))
      );
    }, []);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && closeOnEscape) {
          event.preventDefault();
          onClose();
          return;
        }

        if (event.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      },
      [closeOnEscape, onClose, getFocusableElements]
    );

    const handleBackdropClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnBackdropClick && event.target === event.currentTarget) {
          onClose();
        }
      },
      [closeOnBackdropClick, onClose]
    );

    useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement;
        document.body.style.overflow = 'hidden';

        const timer = setTimeout(() => {
          const focusableElements = getFocusableElements();
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          } else {
            modalRef.current?.focus();
          }
        }, 0);

        return () => {
          clearTimeout(timer);
        };
      } else {
        document.body.style.overflow = '';

        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      }
    }, [isOpen, getFocusableElements]);

    useEffect(() => {
      return () => {
        document.body.style.overflow = '';
      };
    }, []);

    if (!isOpen) return null;

    const backdropStyles = [
      'fixed inset-0 z-50',
      'bg-neutral-950/60 backdrop-blur-sm',
      'animate-fade-in',
    ]
      .filter(Boolean)
      .join(' ');

    const containerStyles = [
      'fixed inset-0 z-50',
      'overflow-y-auto',
      'flex min-h-full',
      centered ? 'items-center' : 'items-start pt-10',
      'justify-center p-4',
    ]
      .filter(Boolean)
      .join(' ');

    const panelStyles = [
      'relative w-full',
      'bg-white dark:bg-neutral-800',
      'rounded-2xl shadow-xl',
      'animate-fade-in-scale',
      sizeStyles[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const headerStyles = [
      'flex items-start justify-between',
      'px-6 pt-6',
      title || showCloseButton ? 'pb-4' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const titleStyles = [
      'text-xl font-semibold',
      'text-neutral-900 dark:text-neutral-50',
    ]
      .filter(Boolean)
      .join(' ');

    const closeButtonStyles = [
      'flex items-center justify-center',
      'h-9 w-9 rounded-xl',
      'text-neutral-400 hover:text-neutral-600',
      'dark:text-neutral-500 dark:hover:text-neutral-300',
      'hover:bg-neutral-100 dark:hover:bg-neutral-700',
      'transition-all duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
      'active:scale-95',
      !title ? 'absolute top-4 right-4' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const contentStyles = [
      'px-6',
      title || showCloseButton ? '' : 'pt-6',
      footer ? 'pb-4' : 'pb-6',
    ]
      .filter(Boolean)
      .join(' ');

    const footerStyles = [
      'px-6 pb-6 pt-4',
      'border-t border-neutral-200 dark:border-neutral-700',
    ]
      .filter(Boolean)
      .join(' ');

    const modalContent = (
      <>
        <div className={backdropStyles} aria-hidden="true" />

        <div
          className={containerStyles}
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="presentation"
        >
          <div
            ref={(node) => {
              modalRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={panelStyles}
            {...props}
          >
            {(title || showCloseButton) && (
              <div className={headerStyles}>
                {title && (
                  <div className="flex-1">
                    <h2 id={titleId} className={titleStyles}>
                      {title}
                    </h2>
                    {description && (
                      <p
                        id={descriptionId}
                        className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={closeButtonStyles}
                    aria-label="Close modal"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            )}

            <div className={contentStyles}>{children}</div>

            {footer && <div className={footerStyles}>{footer}</div>}
          </div>
        </div>
      </>
    );

    if (typeof document !== 'undefined') {
      return createPortal(modalContent, document.body);
    }

    return null;
  }
);

Modal.displayName = 'Modal';

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default Modal;
