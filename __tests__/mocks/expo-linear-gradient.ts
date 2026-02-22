/**
 * Mock for expo-linear-gradient
 *
 * Provides a simple div-based mock of LinearGradient for testing.
 */

import React from 'react'

export interface LinearGradientProps {
  colors: string[]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  locations?: number[]
  style?: any
  children?: React.ReactNode
  testID?: string
}

export const LinearGradient = React.forwardRef<HTMLDivElement, LinearGradientProps>(
  (props, ref) => {
    const { children, testID, style, ...rest } = props
    return React.createElement(
      'div',
      {
        ref,
        'data-testid': testID,
        style,
        ...rest,
      },
      children
    )
  }
)

LinearGradient.displayName = 'LinearGradient'

export default { LinearGradient }
