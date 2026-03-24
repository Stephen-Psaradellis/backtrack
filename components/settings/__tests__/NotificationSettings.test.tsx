/**
 * Tests for components/settings/NotificationSettings.tsx
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../__tests__/utils'
import { NotificationSettings } from '../NotificationSettings'

const mockToggleMatch = vi.fn()
const mockToggleMessage = vi.fn()
const mockToggleSpark = vi.fn()

let mockCoreLoading = false
let mockSparkLoading = false

vi.mock('../../../hooks/useNotificationSettings', () => ({
  useNotificationSettings: () => ({
    matchNotificationsEnabled: true,
    messageNotificationsEnabled: false,
    toggleMatchNotifications: mockToggleMatch,
    toggleMessageNotifications: mockToggleMessage,
    isLoading: mockCoreLoading,
    isSaving: false,
  }),
}))

vi.mock('../../../hooks/useSparkNotificationSettings', () => ({
  useSparkNotificationSettings: () => ({
    sparkNotificationsEnabled: true,
    toggleSparkNotifications: mockToggleSpark,
    isLoading: mockSparkLoading,
    isSaving: false,
  }),
}))

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCoreLoading = false
    mockSparkLoading = false
  })

  describe('rendering', () => {
    it('should render the header', () => {
      const { getByText } = renderWithProviders(<NotificationSettings />)
      expect(getByText('Notifications')).toBeTruthy()
    })

    it('should render all notification toggle labels', () => {
      const { getByText } = renderWithProviders(<NotificationSettings />)
      expect(getByText('Match Notifications')).toBeTruthy()
      expect(getByText('Message Notifications')).toBeTruthy()
      expect(getByText('Spark Notifications')).toBeTruthy()
    })

    it('should render descriptions for each toggle', () => {
      const { getByText } = renderWithProviders(<NotificationSettings />)
      expect(getByText(/Get notified when someone matches/)).toBeTruthy()
      expect(getByText(/Get notified when you receive new messages/)).toBeTruthy()
      expect(getByText(/Get notified when someone posts at your frequent/)).toBeTruthy()
    })
  })

  describe('loading state', () => {
    it('should show loading indicator when hooks are loading', () => {
      mockCoreLoading = true
      const { queryByText } = renderWithProviders(<NotificationSettings />)
      // When loading, the setting labels should not be rendered
      expect(queryByText('Match Notifications')).toBeNull()
    })
  })
})
