/**
 * Tests for lib/haptics.ts
 *
 * Tests haptic feedback functions with mocked expo-haptics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Haptics from 'expo-haptics'

// Mock expo-haptics
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  selectionAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}))

// Mock Platform to simulate mobile
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}))

import {
  impactFeedback,
  lightFeedback,
  mediumFeedback,
  heavyFeedback,
  selectionFeedback,
  notificationFeedback,
  successFeedback,
  warningFeedback,
  errorFeedback,
  triggerHaptic,
  HAPTICS_SUPPORTED,
} from '../haptics'

describe('haptics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('HAPTICS_SUPPORTED', () => {
    it('should be true on iOS', () => {
      // Platform is mocked to iOS above
      expect(HAPTICS_SUPPORTED).toBe(true)
    })
  })

  describe('impactFeedback', () => {
    it('should trigger light impact', async () => {
      await impactFeedback('light')
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light')
    })

    it('should trigger medium impact', async () => {
      await impactFeedback('medium')
      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium')
    })

    it('should trigger heavy impact', async () => {
      await impactFeedback('heavy')
      expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy')
    })

    it('should not trigger when disabled', async () => {
      await impactFeedback('light', { disabled: true })
      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(Haptics.impactAsync).mockRejectedValueOnce(new Error('Haptics not supported'))
      // Should not throw
      await expect(impactFeedback('light')).resolves.toBeUndefined()
    })
  })

  describe('lightFeedback', () => {
    it('should trigger light impact feedback', async () => {
      await lightFeedback()
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light')
    })

    it('should not trigger when disabled', async () => {
      await lightFeedback({ disabled: true })
      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })
  })

  describe('mediumFeedback', () => {
    it('should trigger medium impact feedback', async () => {
      await mediumFeedback()
      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium')
    })

    it('should not trigger when disabled', async () => {
      await mediumFeedback({ disabled: true })
      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })
  })

  describe('heavyFeedback', () => {
    it('should trigger heavy impact feedback', async () => {
      await heavyFeedback()
      expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy')
    })

    it('should not trigger when disabled', async () => {
      await heavyFeedback({ disabled: true })
      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })
  })

  describe('selectionFeedback', () => {
    it('should trigger selection feedback', async () => {
      await selectionFeedback()
      expect(Haptics.selectionAsync).toHaveBeenCalled()
    })

    it('should not trigger when disabled', async () => {
      await selectionFeedback({ disabled: true })
      expect(Haptics.selectionAsync).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('Haptics not supported'))
      await expect(selectionFeedback()).resolves.toBeUndefined()
    })
  })

  describe('notificationFeedback', () => {
    it('should trigger success notification', async () => {
      await notificationFeedback('success')
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
    })

    it('should trigger warning notification', async () => {
      await notificationFeedback('warning')
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning')
    })

    it('should trigger error notification', async () => {
      await notificationFeedback('error')
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')
    })

    it('should not trigger when disabled', async () => {
      await notificationFeedback('success', { disabled: true })
      expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(Haptics.notificationAsync).mockRejectedValueOnce(new Error('Haptics not supported'))
      await expect(notificationFeedback('success')).resolves.toBeUndefined()
    })
  })

  describe('successFeedback', () => {
    it('should trigger success notification', async () => {
      await successFeedback()
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
    })

    it('should not trigger when disabled', async () => {
      await successFeedback({ disabled: true })
      expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    })
  })

  describe('warningFeedback', () => {
    it('should trigger warning notification', async () => {
      await warningFeedback()
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning')
    })

    it('should not trigger when disabled', async () => {
      await warningFeedback({ disabled: true })
      expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    })
  })

  describe('errorFeedback', () => {
    it('should trigger error notification', async () => {
      await errorFeedback()
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')
    })

    it('should not trigger when disabled', async () => {
      await errorFeedback({ disabled: true })
      expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    })
  })

  describe('triggerHaptic', () => {
    it('should trigger light feedback', async () => {
      await triggerHaptic('light')
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light')
    })

    it('should trigger medium feedback', async () => {
      await triggerHaptic('medium')
      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium')
    })

    it('should trigger heavy feedback', async () => {
      await triggerHaptic('heavy')
      expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy')
    })

    it('should trigger selection feedback', async () => {
      await triggerHaptic('selection')
      expect(Haptics.selectionAsync).toHaveBeenCalled()
    })

    it('should trigger success feedback', async () => {
      await triggerHaptic('success')
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
    })

    it('should trigger warning feedback', async () => {
      await triggerHaptic('warning')
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning')
    })

    it('should trigger error feedback', async () => {
      await triggerHaptic('error')
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')
    })

    it('should trigger notification as success', async () => {
      await triggerHaptic('notification')
      expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
    })

    it('should not trigger when disabled', async () => {
      await triggerHaptic('light', { disabled: true })
      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })

    it('should handle unknown type gracefully', async () => {
      // @ts-expect-error Testing unknown type
      await expect(triggerHaptic('unknown')).resolves.toBeUndefined()
      expect(Haptics.impactAsync).not.toHaveBeenCalled()
      expect(Haptics.selectionAsync).not.toHaveBeenCalled()
      expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    })
  })
})
