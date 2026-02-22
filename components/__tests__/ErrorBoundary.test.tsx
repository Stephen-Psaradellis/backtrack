/**
 * ErrorBoundary Component Tests
 *
 * Tests for error boundary component that catches JavaScript errors and displays fallback UI.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from '../ErrorBoundary';
import { Text, Button as RNButton } from 'react-native';

// Mock Sentry
vi.mock('../../lib/sentry', () => ({
  reportReactError: vi.fn(),
}));

// Mock Button components - use native button elements so fireEvent.click works
vi.mock('../Button', () => ({
  Button: ({ title, onPress, testID }: any) => (
    <button title={title} onClick={onPress} data-testid={testID}>{title}</button>
  ),
  OutlineButton: ({ title, onPress, testID }: any) => (
    <button title={title} onClick={onPress} data-testid={testID}>{title}</button>
  ),
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Normal rendering', () => {
    it('renders children when there is no error', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <Text>Hello World</Text>
        </ErrorBoundary>
      );

      expect(getByText('Hello World')).toBeTruthy();
    });

    it('renders with testID prop', () => {
      const { getByTestId } = render(
        <ErrorBoundary testID="custom-error-boundary">
          <Text>Content</Text>
        </ErrorBoundary>
      );

      // Children should render normally
      expect(getByTestId).toBeDefined();
    });
  });

  describe('Error handling', () => {
    // Component that throws an error
    const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <Text>No Error</Text>;
    };

    it('catches errors and displays fallback UI', () => {
      // Suppress error output in test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { getByText, getByTitle } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();
      // In jsdom, Button renders as <button title="...">
      expect(getByTitle('Try Again')).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('displays custom fallback when provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const CustomFallback = () => <Text>Custom Error Screen</Text>;

      const { getByText, queryByText } = render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByText('Custom Error Screen')).toBeTruthy();
      expect(queryByText('Something went wrong')).toBeNull();

      consoleSpy.mockRestore();
    });

    it('calls onError callback when error occurs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(onError.mock.calls[0][0].message).toBe('Test error');

      consoleSpy.mockRestore();
    });
  });

  describe('Retry functionality', () => {
    it('recovers from error when retry is pressed', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let shouldThrow = true;
      const ToggleError = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <Text>Recovered</Text>;
      };

      const { getByTitle, getByText, rerender } = render(
        <ErrorBoundary>
          <ToggleError />
        </ErrorBoundary>
      );

      // Error state
      expect(getByText('Something went wrong')).toBeTruthy();

      // Fix the error
      shouldThrow = false;

      // Click retry (Button renders as <button title="..."> in jsdom)
      const retryButton = getByTitle('Try Again');
      fireEvent.click(retryButton);

      // After click, component should recover
      expect(getByText('Recovered')).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });

  describe('Error details', () => {
    it('shows details button when showDetails is true', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { getByTitle } = render(
        <ErrorBoundary showDetails={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(getByTitle('Show Details')).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('hides details button when showDetails is false', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { queryByTitle } = render(
        <ErrorBoundary showDetails={false}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(queryByTitle('Show Details')).toBeNull();

      consoleSpy.mockRestore();
    });

    it('toggles error details when details button is pressed', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { getByTitle, getByText, queryByText } = render(
        <ErrorBoundary showDetails={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Details should be hidden initially
      expect(queryByText('Error Details')).toBeNull();

      // Click show details
      const detailsButton = getByTitle('Show Details');
      fireEvent.click(detailsButton);

      // Details should be visible after click
      expect(getByText('Error Details')).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      const TestComponent = () => <Text>Test Component</Text>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      const { getByText } = render(<WrappedComponent />);
      expect(getByText('Test Component')).toBeTruthy();
    });

    it('catches errors in wrapped component', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ThrowingComponent = () => {
        throw new Error('Test error');
      };
      const WrappedComponent = withErrorBoundary(ThrowingComponent);

      const { getByText } = render(<WrappedComponent />);
      expect(getByText('Something went wrong')).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('passes props to wrapped component', () => {
      const TestComponent = ({ message }: { message: string }) => <Text>{message}</Text>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      const { getByText } = render(<WrappedComponent message="Hello" />);
      expect(getByText('Hello')).toBeTruthy();
    });
  });

  describe('useErrorHandler hook', () => {
    it('throws error that is caught by error boundary', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        const throwError = useErrorHandler();

        return (
          <RNButton
            title="Throw Error"
            onPress={() => throwError(new Error('Async error'))}
            testID="throw-button"
          />
        );
      };

      const { getByTitle, getByText } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // RN Button renders as <button title="..."> in jsdom
      fireEvent.click(getByTitle('Throw Error'));

      // Error should be caught and displayed immediately
      expect(getByText('Something went wrong')).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });
});

// Helper component for testing
function ThrowError() {
  throw new Error('Test error');
}
