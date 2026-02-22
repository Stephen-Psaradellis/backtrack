/**
 * Mock for react-native-walkthrough-tooltip
 *
 * The actual library has Flow types that vitest/vite can't parse.
 * This mock provides a simple passthrough component.
 */

import React from 'react'

export interface TooltipProps {
  isVisible?: boolean
  content?: React.ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  onClose?: () => void
  children: React.ReactNode
  [key: string]: any
}

// Simple passthrough component that just renders children
const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return children as React.ReactElement
}

export default Tooltip
