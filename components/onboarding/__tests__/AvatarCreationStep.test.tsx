import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

const mockEditor = {
  config: { hairStyle: 'short', hairColor: '#000' },
  activeCategory: 'face',
  activeSubcategory: 'shape',
  setCategory: vi.fn(),
  setSubcategory: vi.fn(),
  updateConfig: vi.fn(),
  randomize: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: true,
  canRedo: false,
  getStoredAvatar: vi.fn(() => ({ config: { hairStyle: 'short' } })),
}

vi.mock('react-native', () => ({
  View: ({ children, style, testID, ...props }: any) => <div style={style} data-testid={testID} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span style={style} {...props}>{children}</span>,
  StyleSheet: { create: (s: any) => s },
  TouchableOpacity: ({ children, onPress, disabled, ...props }: any) => (
    <button onClick={disabled ? undefined : onPress} disabled={disabled} {...props}>{children}</button>
  ),
  ScrollView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  StatusBar: () => null,
}))

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, testID, ...props }: any) => <div data-testid={testID} {...props}>{children}</div>,
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}))

vi.mock('react-native-bitmoji', () => ({
  Avatar: ({ config, size }: any) => <div data-testid="avatar" />,
  createStoredAvatar: vi.fn(),
  saveCurrentAvatar: vi.fn().mockResolvedValue(undefined),
  useAvatarEditor: () => mockEditor,
  EDITOR_CATEGORIES: [
    { key: 'face', label: 'Face', subcategories: [{ key: 'shape', label: 'Shape', type: 'options', configKey: 'faceShape', options: [] }] },
  ],
  CategoryTabs: ({ categories, activeCategory, onSelectCategory }: any) => (
    <div data-testid="category-tabs">{categories.map((c: any) => <button key={c.key} onClick={() => onSelectCategory(c.key)}>{c.label}</button>)}</div>
  ),
  OptionGrid: () => <div data-testid="option-grid" />,
  ColorPicker: () => <div data-testid="color-picker" />,
}))

vi.mock('../../../constants/glassStyles', () => ({
  darkTheme: { background: '#000', textPrimary: '#fff', textSecondary: '#aaa', textMuted: '#666', surface: '#111', surfaceElevated: '#222', glassBorder: '#333' },
}))

vi.mock('../../../constants/theme', () => ({
  colors: { primary: { 500: '#ff6b47' }, white: '#fff' },
}))

import { AvatarCreationStep } from '../AvatarCreationStep'

describe('AvatarCreationStep', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    expect(getByTestId('onboarding-avatar-step')).toBeInTheDocument()
  })

  it('renders title and subtitle', () => {
    const { getByText } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    expect(getByText('Create Your Avatar')).toBeInTheDocument()
    expect(getByText('This is how others will see you')).toBeInTheDocument()
  })

  it('renders avatar preview', () => {
    const { getByTestId } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    expect(getByTestId('avatar')).toBeInTheDocument()
  })

  it('renders Random button', () => {
    const { getByText } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    expect(getByText('Random')).toBeInTheDocument()
  })

  it('calls randomize when Random is pressed', () => {
    const { getByText } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    fireEvent.click(getByText('Random'))
    expect(mockEditor.randomize).toHaveBeenCalled()
  })

  it('renders Continue button', () => {
    const { getByText } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    expect(getByText('Continue')).toBeInTheDocument()
  })

  it('renders Skip button when onSkip provided', () => {
    const { getByText } = render(<AvatarCreationStep onComplete={vi.fn()} onSkip={vi.fn()} />)
    expect(getByText('Skip for now')).toBeInTheDocument()
  })

  it('does not render Skip button when onSkip not provided', () => {
    const { queryByText } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    expect(queryByText('Skip for now')).not.toBeInTheDocument()
  })

  it('calls onSkip when Skip is pressed', () => {
    const onSkip = vi.fn()
    const { getByText } = render(<AvatarCreationStep onComplete={vi.fn()} onSkip={onSkip} />)
    fireEvent.click(getByText('Skip for now'))
    expect(onSkip).toHaveBeenCalled()
  })

  it('renders category tabs', () => {
    const { getByTestId } = render(<AvatarCreationStep onComplete={vi.fn()} />)
    expect(getByTestId('category-tabs')).toBeInTheDocument()
  })
})
