import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: (props: any) => React.createElement('svg', { 'data-testid': 'arrow-left', ...props }),
}))

import { LegalPageLayout, LegalSection, LegalSubsection, LegalList, LegalTable, ContactInfo } from '../LegalPageLayout'

describe('LegalPageLayout', () => {
  const defaultProps = {
    title: 'Privacy Policy',
    lastUpdated: 'January 1, 2026',
    effectiveDate: 'January 15, 2026',
    children: React.createElement('p', null, 'Some legal text'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the title', () => {
    const { getAllByText } = render(<LegalPageLayout {...defaultProps} />)
    // Title appears in header and main content
    expect(getAllByText('Privacy Policy').length).toBeGreaterThanOrEqual(1)
  })

  it('should render last updated and effective dates', () => {
    const { getByText } = render(<LegalPageLayout {...defaultProps} />)
    expect(getByText('January 1, 2026')).toBeInTheDocument()
    expect(getByText('January 15, 2026')).toBeInTheDocument()
  })

  it('should render children', () => {
    const { getByText } = render(<LegalPageLayout {...defaultProps} />)
    expect(getByText('Some legal text')).toBeInTheDocument()
  })

  it('should render Backtrack brand name', () => {
    const { getByText } = render(<LegalPageLayout {...defaultProps} />)
    expect(getByText('Backtrack')).toBeInTheDocument()
  })

  it('should call router.back when back button is clicked', () => {
    const { getByLabelText } = render(<LegalPageLayout {...defaultProps} />)
    fireEvent.click(getByLabelText('Go back'))
    expect(mockBack).toHaveBeenCalled()
  })

  it('should render table of contents when provided', () => {
    const toc = [
      { id: 'section-1', title: 'Introduction', level: 2 },
      { id: 'section-2', title: 'Data Collection', level: 2 },
    ]
    const { getByText } = render(
      <LegalPageLayout {...defaultProps} tableOfContents={toc} />
    )
    expect(getByText('Contents')).toBeInTheDocument()
    expect(getByText('Introduction')).toBeInTheDocument()
    expect(getByText('Data Collection')).toBeInTheDocument()
  })

  it('should not render table of contents when empty', () => {
    const { queryByText } = render(
      <LegalPageLayout {...defaultProps} tableOfContents={[]} />
    )
    expect(queryByText('Contents')).not.toBeInTheDocument()
  })
})

describe('LegalSection', () => {
  it('should render section with id and title', () => {
    const { getByText, container } = render(
      <LegalSection id="test-section" title="Test Title">
        <p>Content</p>
      </LegalSection>
    )
    expect(getByText('Test Title')).toBeInTheDocument()
    expect(container.querySelector('#test-section')).toBeInTheDocument()
  })
})

describe('LegalSubsection', () => {
  it('should render subsection title and children', () => {
    const { getByText } = render(
      <LegalSubsection title="Sub Title">
        <p>Sub content</p>
      </LegalSubsection>
    )
    expect(getByText('Sub Title')).toBeInTheDocument()
    expect(getByText('Sub content')).toBeInTheDocument()
  })
})

describe('LegalList', () => {
  it('should render unordered list by default', () => {
    const { container } = render(<LegalList items={['Item A', 'Item B']} />)
    expect(container.querySelector('ul')).toBeInTheDocument()
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })

  it('should render ordered list when ordered=true', () => {
    const { container } = render(<LegalList items={['First', 'Second']} ordered />)
    expect(container.querySelector('ol')).toBeInTheDocument()
  })
})

describe('LegalTable', () => {
  it('should render table with headers and rows', () => {
    const { getByText, container } = render(
      <LegalTable
        headers={['Name', 'Value']}
        rows={[['Cookies', 'Yes'], ['Tracking', 'No']]}
      />
    )
    expect(container.querySelector('table')).toBeInTheDocument()
    expect(getByText('Name')).toBeInTheDocument()
    expect(getByText('Cookies')).toBeInTheDocument()
    expect(getByText('No')).toBeInTheDocument()
  })
})

describe('ContactInfo', () => {
  it('should render email as mailto link', () => {
    const { getByText } = render(<ContactInfo email="legal@backtrack.app" />)
    const link = getByText('legal@backtrack.app')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', 'mailto:legal@backtrack.app')
  })

  it('should render mailing address when provided', () => {
    const { getByText } = render(
      <ContactInfo email="a@b.com" address={['123 Main St', 'City, ST 12345']} />
    )
    expect(getByText('123 Main St')).toBeInTheDocument()
    expect(getByText('City, ST 12345')).toBeInTheDocument()
  })
})
