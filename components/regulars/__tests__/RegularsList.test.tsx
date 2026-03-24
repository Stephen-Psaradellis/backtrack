import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

const mockFellowRegulars = {
  regulars: [] as any[],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

const mockLocationRegulars = {
  regulars: [] as any[],
  totalCount: 0,
  isUserRegular: true,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div style={style} {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span style={style} {...props}>{children}</span>,
  StyleSheet: { create: (s: any) => s },
  FlatList: ({ data, renderItem, keyExtractor, ListHeaderComponent, ...props }: any) => (
    <div data-testid="flatlist">
      {ListHeaderComponent}
      {data?.map((item: any, index: number) => (
        <div key={keyExtractor ? keyExtractor(item) : index}>{renderItem({ item, index })}</div>
      ))}
    </div>
  ),
  ActivityIndicator: ({ ...props }: any) => <div data-testid="loading" />,
  RefreshControl: () => null,
  TouchableOpacity: ({ children, onPress, disabled, ...props }: any) => (
    <button onClick={disabled ? undefined : onPress} disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, ...props }: any) => <span data-testid={`icon-${name}`} {...props} />,
}))

vi.mock('react-native-bitmoji', () => ({
  Avatar: () => <div data-testid="avatar" />,
}))

vi.mock('../../../hooks/useRegulars', () => ({
  useFellowRegulars: () => mockFellowRegulars,
  useLocationRegulars: () => mockLocationRegulars,
}))

vi.mock('../../../constants/glassStyles', () => ({
  darkTheme: { background: '#000', textPrimary: '#fff', textSecondary: '#aaa', textMuted: '#666' },
}))

vi.mock('../../../constants/theme', () => ({
  colors: { primary: { 500: '#ff6b47' }, white: '#fff' },
}))

import { FellowRegularsList, LocationRegularsList } from '../RegularsList'

describe('FellowRegularsList', () => {
  it('shows loading indicator when loading', () => {
    mockFellowRegulars.isLoading = true
    mockFellowRegulars.regulars = []
    const { getByTestId } = render(<FellowRegularsList />)
    expect(getByTestId('loading')).toBeInTheDocument()
    mockFellowRegulars.isLoading = false
  })

  it('shows error when error occurs', () => {
    mockFellowRegulars.error = new Error('fail')
    const { getByText } = render(<FellowRegularsList />)
    expect(getByText('Failed to load regulars')).toBeInTheDocument()
    mockFellowRegulars.error = null
  })

  it('shows empty state when no regulars', () => {
    mockFellowRegulars.regulars = []
    const { getByText } = render(<FellowRegularsList />)
    expect(getByText('No fellow regulars yet')).toBeInTheDocument()
  })

  it('renders regulars list', () => {
    mockFellowRegulars.regulars = [
      { fellow_user_id: 'u1', location_id: 'l1', display_name: 'Alice', avatar: null, is_verified: false, location_name: 'Cafe', shared_weeks: 2, visibility: 'public' },
    ]
    const { getByText } = render(<FellowRegularsList />)
    expect(getByText('Alice')).toBeInTheDocument()
    mockFellowRegulars.regulars = []
  })
})

describe('LocationRegularsList', () => {
  it('shows loading indicator when loading', () => {
    mockLocationRegulars.isLoading = true
    const { getByTestId } = render(<LocationRegularsList locationId="loc1" />)
    expect(getByTestId('loading')).toBeInTheDocument()
    mockLocationRegulars.isLoading = false
  })

  it('shows empty state when no regulars and user is regular', () => {
    mockLocationRegulars.regulars = []
    mockLocationRegulars.totalCount = 0
    mockLocationRegulars.isUserRegular = true
    const { getByText } = render(<LocationRegularsList locationId="loc1" />)
    expect(getByText('No other regulars yet')).toBeInTheDocument()
  })

  it('shows count-only view when user is not regular', () => {
    mockLocationRegulars.isUserRegular = false
    mockLocationRegulars.totalCount = 5
    const { getByText } = render(<LocationRegularsList locationId="loc1" />)
    expect(getByText('5 regulars at this spot')).toBeInTheDocument()
    mockLocationRegulars.isUserRegular = true
    mockLocationRegulars.totalCount = 0
  })
})
