import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

export interface ToastConfig {
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

interface ToastState extends ToastConfig {
  id: number;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<ToastState[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idCounterRef = useRef(0);

  const processQueue = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        setCurrentToast(null);
        return prevQueue;
      }

      const [next, ...rest] = prevQueue;
      setCurrentToast(next);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set auto-dismiss timeout
      const duration = next.duration ?? 3000;
      timeoutRef.current = setTimeout(() => {
        setCurrentToast(null);
        // After exit animation completes, process next toast
        setTimeout(() => {
          processQueue();
        }, 200); // Match exit animation duration
      }, duration);

      return rest;
    });
  }, []);

  const showToast = useCallback((config: ToastConfig) => {
    const id = idCounterRef.current++;
    const newToast: ToastState = { ...config, id };

    setQueue((prevQueue) => {
      const updatedQueue = [...prevQueue, newToast];

      // If no toast is currently showing, process immediately
      if (!currentToast) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => processQueue(), 0);
      }

      return updatedQueue;
    });
  }, [currentToast, processQueue]);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setCurrentToast(null);

    // After exit animation completes, process next toast
    setTimeout(() => {
      processQueue();
    }, 200);
  }, [processQueue]);

  // Convenience methods for common toast variants
  const success = useCallback((message: string, duration?: number) => {
    showToast({ message, variant: 'success', duration });
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast({ message, variant: 'error', duration });
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast({ message, variant: 'warning', duration });
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast({ message, variant: 'info', duration });
  }, [showToast]);

  const value: ToastContextValue = {
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && (
        <Toast
          message={currentToast.message}
          variant={currentToast.variant}
          action={currentToast.action}
          onDismiss={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
};

// Internal Toast component - imported from components/native/Toast
import { Toast } from '../components/native/Toast';
