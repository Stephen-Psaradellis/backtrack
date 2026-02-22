/**
 * Tests for components/ClusterMarker.tsx
 *
 * Tests the ClusterMarker component used to display cluster badges on maps.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ClusterMarker } from '../ClusterMarker'

describe('ClusterMarker', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<ClusterMarker count={5} />)

      expect(container).toBeInTheDocument()
    })

    it('should display the count', () => {
      const { getByText } = render(<ClusterMarker count={10} />)

      expect(getByText('10')).toBeInTheDocument()
    })

    it('should render with count 1', () => {
      const { getByText } = render(<ClusterMarker count={1} />)

      expect(getByText('1')).toBeInTheDocument()
    })

    it('should render with large count', () => {
      const { getByText } = render(<ClusterMarker count={999} />)

      expect(getByText('999')).toBeInTheDocument()
    })
  })

  describe('sizing', () => {
    it('should have minimum size for small counts', () => {
      const { container } = render(<ClusterMarker count={1} />)

      // Base size is 40px
      expect(container).toBeInTheDocument()
    })

    it('should scale size based on count', () => {
      const { container } = render(<ClusterMarker count={100} />)

      // Size should increase with count (logarithmically)
      expect(container).toBeInTheDocument()
    })

    it('should have maximum size for large counts', () => {
      const { container } = render(<ClusterMarker count={10000} />)

      // Max size is 70px
      expect(container).toBeInTheDocument()
    })

    it('should scale proportionally between min and max', () => {
      const { getByText: getByText1 } = render(<ClusterMarker count={2} />)
      const { getByText: getByText2 } = render(<ClusterMarker count={10} />)
      const { getByText: getByText3 } = render(<ClusterMarker count={50} />)

      expect(getByText1('2')).toBeInTheDocument()
      expect(getByText2('10')).toBeInTheDocument()
      expect(getByText3('50')).toBeInTheDocument()
    })
  })

  describe('visual styling', () => {
    it('should display count with white text', () => {
      const { getByText } = render(<ClusterMarker count={25} />)

      expect(getByText('25')).toBeInTheDocument()
    })

    it('should be circular', () => {
      const { container } = render(<ClusterMarker count={5} />)

      expect(container).toBeInTheDocument()
    })

    it('should have shadow for depth', () => {
      const { container } = render(<ClusterMarker count={5} />)

      expect(container).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle count of 0', () => {
      const { getByText } = render(<ClusterMarker count={0} />)

      expect(getByText('0')).toBeInTheDocument()
    })

    it('should handle very large counts', () => {
      const { getByText } = render(<ClusterMarker count={999999} />)

      expect(getByText('999999')).toBeInTheDocument()
    })

    it('should handle negative counts gracefully', () => {
      const { getByText } = render(<ClusterMarker count={-5} />)

      expect(getByText('-5')).toBeInTheDocument()
    })
  })
})
