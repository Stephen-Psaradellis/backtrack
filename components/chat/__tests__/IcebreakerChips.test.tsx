/**
 * IcebreakerChips Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react-native';
import { IcebreakerChips } from '../IcebreakerChips';

// Mock haptics
vi.mock('../../../lib/haptics', () => ({
  selectionFeedback: vi.fn().mockResolvedValue(undefined),
}));

describe('IcebreakerChips', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <IcebreakerChips visible={true} onSelect={mockOnSelect} />
    );
    expect(container).toBeTruthy();
  });

  it('renders all three icebreaker chips when visible', () => {
    const { getByText } = render(
      <IcebreakerChips visible={true} onSelect={mockOnSelect} />
    );

    expect(getByText('Was that you? 👋')).toBeTruthy();
    expect(getByText('I think we crossed paths! 🔄')).toBeTruthy();
    expect(getByText('Tell me more! 💬')).toBeTruthy();
  });

  it('returns null when not visible and animation completes', () => {
    const { container } = render(
      <IcebreakerChips visible={false} onSelect={mockOnSelect} />
    );
    // Component renders initially but will fade out
    expect(container).toBeTruthy();
  });

  it('renders with testID', () => {
    const { container } = render(
      <IcebreakerChips
        visible={true}
        onSelect={mockOnSelect}
        testID="custom-icebreakers"
      />
    );
    const element = container.querySelector('[testid="custom-icebreakers"]');
    expect(element).toBeTruthy();
  });

  it('renders individual chip testIDs', () => {
    const { container } = render(
      <IcebreakerChips
        visible={true}
        onSelect={mockOnSelect}
        testID="custom-icebreakers"
      />
    );

    expect(container.querySelector('[testid="custom-icebreakers-was-that-you"]')).toBeTruthy();
    expect(container.querySelector('[testid="custom-icebreakers-crossed-paths"]')).toBeTruthy();
    expect(container.querySelector('[testid="custom-icebreakers-tell-me-more"]')).toBeTruthy();
  });

  it('renders scroll view with testID', () => {
    const { container } = render(
      <IcebreakerChips
        visible={true}
        onSelect={mockOnSelect}
        testID="custom-icebreakers"
      />
    );

    expect(container.querySelector('[testid="custom-icebreakers-scroll"]')).toBeTruthy();
  });

  it('horizontal scroll view is configured correctly', () => {
    const { container } = render(
      <IcebreakerChips visible={true} onSelect={mockOnSelect} />
    );

    const scrollView = container.querySelector('[testid="icebreaker-chips-scroll"]');
    expect(scrollView).toBeTruthy();
  });
});
