import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span style={style} {...props}>{children}</span>,
  FlatList: ({ data, renderItem, keyExtractor, ...props }: any) => (
    <div data-testid="flatlist">
      {data?.map((item: any, index: number) => (
        <div key={keyExtractor ? keyExtractor(item) : index}>
          {renderItem({ item, index })}
        </div>
      ))}
    </div>
  ),
  TouchableOpacity: ({ children, onPress, disabled, ...props }: any) => (
    <button onClick={disabled ? undefined : onPress} disabled={disabled} {...props}>{children}</button>
  ),
  StyleSheet: { create: (s: any) => s },
  Platform: { OS: 'ios', select: (o: any) => o.ios || {} },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  useWindowDimensions: () => ({ width: 375, height: 812 }),
  Animated: {
    Value: class { interpolate = vi.fn() },
    event: vi.fn(() => vi.fn()),
    View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}))

vi.mock('../../../constants/glassStyles', () => ({
  darkTheme: {
    background: '#000',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    textDisabled: '#666',
  },
}))

vi.mock('../../../constants/theme', () => ({
  colors: { primary: { 500: '#ff6b47' }, white: '#fff' },
}))

import { WelcomeScreen } from '../WelcomeScreen'

describe('WelcomeScreen', () => {
  it('renders all slide titles', () => {
    const onComplete = vi.fn()
    const { getByText } = render(<WelcomeScreen onComplete={onComplete} />)
    expect(getByText('Spot Someone')).toBeInTheDocument()
    expect(getByText('Post Your Sighting')).toBeInTheDocument()
    expect(getByText('Get Matched')).toBeInTheDocument()
    expect(getByText('Start Talking')).toBeInTheDocument()
  })

  it('renders Skip button', () => {
    const onComplete = vi.fn()
    const { getByText } = render(<WelcomeScreen onComplete={onComplete} />)
    expect(getByText('Skip')).toBeInTheDocument()
  })

  it('calls onComplete when Skip is pressed', () => {
    const onComplete = vi.fn()
    const { getByText } = render(<WelcomeScreen onComplete={onComplete} />)
    fireEvent.click(getByText('Skip'))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('renders Next button initially (not Get Started)', () => {
    const onComplete = vi.fn()
    const { getByText } = render(<WelcomeScreen onComplete={onComplete} />)
    expect(getByText('Next')).toBeInTheDocument()
  })

  it('renders slide descriptions', () => {
    const onComplete = vi.fn()
    const { getByText } = render(<WelcomeScreen onComplete={onComplete} />)
    expect(getByText(/Notice someone interesting/)).toBeInTheDocument()
    expect(getByText(/Describe who you saw/)).toBeInTheDocument()
  })
})
