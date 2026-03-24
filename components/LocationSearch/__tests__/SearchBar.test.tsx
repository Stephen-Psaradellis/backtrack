import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

vi.mock('../../../types/location', () => ({
  VENUE_TYPE_FILTERS: [
    { category: 'cafe', label: 'Cafes', types: ['cafe'] },
    { category: 'gym', label: 'Gyms', types: ['gym'] },
    { category: 'bookstore', label: 'Bookstores', types: ['bookstore'] },
    { category: 'bar', label: 'Bars', types: ['bar'] },
    { category: 'restaurant', label: 'Restaurants', types: ['restaurant'] },
  ],
}))

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderComponent(props = {}) {
    const { SearchBar } = await import('../SearchBar')
    return render(
      <SearchBar
        value=""
        onChangeText={vi.fn()}
        {...props}
      />
    )
  }

  it('should render with default testID', async () => {
    const { container } = await renderComponent()
    expect(container.querySelector('[testid="search-bar"]')).toBeInTheDocument()
  })

  it('should render input with placeholder', async () => {
    const { container } = await renderComponent({ placeholder: 'Find a place...' })
    const input = container.querySelector('[testid="search-bar-input"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Find a place...')
  })

  it('should use default placeholder', async () => {
    const { container } = await renderComponent()
    const input = container.querySelector('[testid="search-bar-input"]')
    expect(input).toHaveAttribute('placeholder', 'Search for a venue...')
  })

  it('should render the input element', async () => {
    const onChangeText = vi.fn()
    const { container } = await renderComponent({ value: 'hello', onChangeText })
    const input = container.querySelector('[testid="search-bar-input"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('value', 'hello')
  })

  it('should show loading indicator when loading', async () => {
    const { container } = await renderComponent({ loading: true })
    expect(container.querySelector('[testid="search-bar-loading"]')).toBeInTheDocument()
  })

  it('should not show loading indicator by default', async () => {
    const { container } = await renderComponent()
    expect(container.querySelector('[testid="search-bar-loading"]')).not.toBeInTheDocument()
  })

  it('should show clear button when value is present and not loading', async () => {
    const { container } = await renderComponent({ value: 'test' })
    expect(container.querySelector('[testid="search-bar-clear"]')).toBeInTheDocument()
  })

  it('should not show clear button when value is empty', async () => {
    const { container } = await renderComponent({ value: '' })
    expect(container.querySelector('[testid="search-bar-clear"]')).not.toBeInTheDocument()
  })

  it('should call onChangeText with empty string when clear is pressed', async () => {
    const onChangeText = vi.fn()
    const { container } = await renderComponent({ value: 'test', onChangeText })
    const clearBtn = container.querySelector('[testid="search-bar-clear"]')!
    fireEvent.click(clearBtn)
    expect(onChangeText).toHaveBeenCalledWith('')
  })

  it('should show error message', async () => {
    const { container, getByText } = await renderComponent({ error: 'Something went wrong' })
    expect(container.querySelector('[testid="search-bar-error"]')).toBeInTheDocument()
    expect(getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should not show error when error is null', async () => {
    const { container } = await renderComponent({ error: null })
    expect(container.querySelector('[testid="search-bar-error"]')).not.toBeInTheDocument()
  })

  it('should render suggestions when value and suggestions are provided', async () => {
    const suggestions = [
      { id: '1', google_place_id: 'gp1', name: 'Cafe Latte', address: '1 Main St', primary_type: 'cafe', post_count: 3 },
    ]
    const onSuggestionPress = vi.fn()
    const { container, getByText } = await renderComponent({
      value: 'cafe',
      suggestions,
      onSuggestionPress,
    })
    expect(container.querySelector('[testid="search-bar-suggestions"]')).toBeInTheDocument()
    expect(getByText('Cafe Latte')).toBeInTheDocument()
  })

  it('should call onSuggestionPress when suggestion is clicked', async () => {
    const suggestions = [
      { id: '1', google_place_id: 'gp1', name: 'Cafe Latte', address: '1 Main St', primary_type: 'cafe', post_count: 3 },
    ]
    const onSuggestionPress = vi.fn()
    const { container } = await renderComponent({
      value: 'cafe',
      suggestions,
      onSuggestionPress,
    })
    const item = container.querySelector('[testid="search-bar-suggestions-item-0"]')!
    fireEvent.click(item)
    expect(onSuggestionPress).toHaveBeenCalledWith(suggestions[0])
  })

  it('should show filter chips when showFilters and onFilterToggle are provided', async () => {
    const onFilterToggle = vi.fn()
    const { container } = await renderComponent({
      showFilters: true,
      activeFilters: [],
      onFilterToggle,
    })
    expect(container.querySelector('[testid="search-bar-filters"]')).toBeInTheDocument()
  })

  it('should not show filter chips by default', async () => {
    const { container } = await renderComponent()
    expect(container.querySelector('[testid="search-bar-filters"]')).not.toBeInTheDocument()
  })

  it('should show post count badge on suggestions', async () => {
    const suggestions = [
      { id: '1', google_place_id: 'gp1', name: 'Bar X', address: null, primary_type: 'bar', post_count: 7 },
    ]
    const { getByText } = await renderComponent({
      value: 'bar',
      suggestions,
      onSuggestionPress: vi.fn(),
    })
    expect(getByText('7 posts')).toBeInTheDocument()
  })
})
