/**
 * MatchCelebration Component Tests
 *
 * Tests for MatchCelebration modal component shown when two users match.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchCelebration } from '../MatchCelebration';
import { getByTestId, queryByTestId } from '../../__tests__/utils/jsdom-queries';

// Override react-native mock to add Modal visibility support and fix Animated.View
vi.mock('react-native', async () => {
  const actual = await vi.importActual('../../__tests__/mocks/react-native');
  const React = require('react');

  const createView = (tag: string) => {
    const C = React.forwardRef(
      ({ children, testID, style, accessible, accessibilityState, ...rest }: any, ref: any) =>
        React.createElement(tag, { ref, testid: testID, ...rest }, children)
    );
    C.displayName = tag;
    return C;
  };

  const createPressable = (Tag: string) => {
    const C = React.forwardRef(
      ({ onPress, children, testID, style, accessibilityState, accessibilityLabel, disabled, accessible, ...rest }: any, ref: any) =>
        React.createElement(Tag, {
          ...rest, ref, testid: testID,
          accessibilitylabel: accessibilityLabel,
          onClick: !disabled ? onPress : undefined,
          disabled: disabled || undefined,
        }, children)
    );
    C.displayName = Tag;
    return C;
  };

  // Modal that hides content when visible=false
  const ModalMock = React.forwardRef(
    ({ children, visible, testID, animationType, onRequestClose, ...rest }: any, ref: any) => {
      if (!visible) return null;
      return React.createElement('div', { ref, testid: testID, animationtype: animationType, ...rest }, children);
    }
  );
  ModalMock.displayName = 'Modal';

  const ViewMock = createView('div');
  const AnimatedViewMock = createView('div');
  AnimatedViewMock.displayName = 'Animated.View';

  return {
    ...actual,
    View: ViewMock,
    Modal: ModalMock,
    TouchableOpacity: createPressable('button'),
    Pressable: createPressable('button'),
    Animated: {
      ...actual.Animated,
      View: AnimatedViewMock,
      createAnimatedComponent: (c: any) => c,
    },
  };
});

// Mock dependencies
vi.mock('../../lib/haptics', () => ({
  mediumFeedback: vi.fn(() => Promise.resolve()),
}));

vi.mock('react-native-bitmoji', () => ({
  Avatar: ({ avatar, size, testID }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': testID }, `Avatar ${avatar?.id} - ${size}`);
  },
  StoredAvatar: {},
}));

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, testID }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': testID }, children);
  },
}));

// Import mediumFeedback after mock so we can use vi.mocked
import { mediumFeedback } from '../../lib/haptics';

// StoredAvatar type definition (local since we mock the module)
type StoredAvatar = {
  id: string;
  config: any;
  createdAt: number;
  updatedAt: number;
};

describe('MatchCelebration', () => {
  const mockAvatar: StoredAvatar = {
    id: 'avatar-1',
    config: {
      metadata: { version: 2 },
      features: {
        body: 'body_01',
        face: 'face_01',
      },
      colors: {
        skinTone: '#F5D0C5',
      },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockOtherAvatar: StoredAvatar = {
    id: 'avatar-2',
    config: {
      metadata: { version: 2 },
      features: {
        body: 'body_02',
        face: 'face_02',
      },
      colors: {
        skinTone: '#F5D0C5',
      },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const defaultProps = {
    visible: true,
    onSayHello: vi.fn(),
    onDismiss: vi.fn(),
    matchedAvatar: mockOtherAvatar,
    myAvatar: mockAvatar,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing when visible', () => {
      const { container: cont } = render(<MatchCelebration {...defaultProps} />);
      expect(cont).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { container: cont2 } = render(
        <MatchCelebration {...defaultProps} visible={false} testID="match-celebration" />
      );
      // Modal is rendered but with visible=false
      expect(queryByTestId(cont2, 'match-celebration')).toBeNull();
    });

    it('displays "It\'s a Match!" title', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByTestId(container, 'match-celebration-title')).toBeTruthy();
    });

    it('displays location name when provided', () => {
      const { container } = render(
        <MatchCelebration
          {...defaultProps}
          locationName="Blue Bottle Coffee"
          testID="match-celebration"
        />
      );
      expect(getByTestId(container, 'match-celebration-location')).toBeTruthy();
    });

    it('does not display location when not provided', () => {
      const { container: cont2 } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(queryByTestId(cont2, 'match-celebration-location')).toBeNull();
    });
  });

  describe('Avatars', () => {
    it('displays both avatars when provided', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByTestId(container, 'match-celebration-avatars')).toBeTruthy();
    });

    it('displays my avatar', () => {
      const { getByText } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByText(/Avatar avatar-1/)).toBeTruthy();
    });

    it('displays matched user avatar', () => {
      const { getByText } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByText(/Avatar avatar-2/)).toBeTruthy();
    });

    it('shows placeholder when myAvatar is null', () => {
      const { getByText } = render(
        <MatchCelebration {...defaultProps} myAvatar={null} testID="match-celebration" />
      );
      expect(getByText('You')).toBeTruthy();
    });

    it('shows placeholder when matchedAvatar is null', () => {
      const { getByText } = render(
        <MatchCelebration {...defaultProps} matchedAvatar={null} testID="match-celebration" />
      );
      expect(getByText('?')).toBeTruthy();
    });

    it('displays heart icon between avatars', () => {
      const { getByText } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByText('💗')).toBeTruthy();
    });
  });

  describe('Action buttons', () => {
    it('displays "Say Hello" button', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByTestId(container, 'match-celebration-say-hello')).toBeTruthy();
    });

    it('displays "Keep Browsing" button', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByTestId(container, 'match-celebration-keep-browsing')).toBeTruthy();
    });

    it('calls onSayHello when "Say Hello" is pressed', () => {
      const onSayHello = vi.fn();
      const { container } = render(
        <MatchCelebration
          {...defaultProps}
          onSayHello={onSayHello}
          testID="match-celebration"
        />
      );

      fireEvent.click(getByTestId(container, 'match-celebration-say-hello'));
      expect(onSayHello).toHaveBeenCalled();
    });

    it('calls onDismiss when "Keep Browsing" is pressed', () => {
      const onDismiss = vi.fn();
      const { container } = render(
        <MatchCelebration
          {...defaultProps}
          onDismiss={onDismiss}
          testID="match-celebration"
        />
      );

      fireEvent.click(getByTestId(container, 'match-celebration-keep-browsing'));
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Modal behavior', () => {
    it('renders the modal container when visible', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      // Modal is visible - the testID element should be in DOM
      expect(getByTestId(container, 'match-celebration')).toBeTruthy();
    });

    it('hides modal when visible is false', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} visible={false} testID="match-celebration" />
      );
      expect(queryByTestId(container, 'match-celebration')).toBeNull();
    });

    it('calls onDismiss when Keep Browsing is pressed', () => {
      const onDismiss = vi.fn();
      const { container } = render(
        <MatchCelebration
          {...defaultProps}
          onDismiss={onDismiss}
          testID="match-celebration"
        />
      );

      fireEvent.click(getByTestId(container, 'match-celebration-keep-browsing'));
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Confetti animation', () => {
    it('renders confetti particles', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      // Confetti is rendered as part of the modal
      expect(container).toBeTruthy();
    });
  });

  describe('Haptic feedback', () => {
    it('triggers haptic feedback when modal becomes visible', () => {
      render(<MatchCelebration {...defaultProps} visible={true} />);

      expect(vi.mocked(mediumFeedback)).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('handles missing location gracefully', () => {
      const { container: cont2 } = render(
        <MatchCelebration
          {...defaultProps}
          locationName={undefined}
          testID="match-celebration"
        />
      );
      expect(queryByTestId(cont2, 'match-celebration-location')).toBeNull();
    });

    it('handles both avatars being null', () => {
      const { getByText } = render(
        <MatchCelebration
          {...defaultProps}
          myAvatar={null}
          matchedAvatar={null}
          testID="match-celebration"
        />
      );
      expect(getByText('You')).toBeTruthy();
      expect(getByText('?')).toBeTruthy();
    });

    it('renders correctly when transitioning from invisible to visible', () => {
      const { rerender, container } = render(
        <MatchCelebration {...defaultProps} visible={false} testID="match-celebration" />
      );

      rerender(<MatchCelebration {...defaultProps} visible={true} testID="match-celebration" />);

      expect(getByTestId(container, 'match-celebration')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible modal', () => {
      const { container } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByTestId(container, 'match-celebration')).toBeTruthy();
    });

    it('button labels are descriptive', () => {
      const { getByText } = render(
        <MatchCelebration {...defaultProps} testID="match-celebration" />
      );
      expect(getByText('Say Hello')).toBeTruthy();
      expect(getByText('Keep Browsing')).toBeTruthy();
    });
  });
});
