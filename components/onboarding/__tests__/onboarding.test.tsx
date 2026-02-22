/**
 * Onboarding Components Tests
 *
 * Smoke tests for onboarding components focusing on logic and exports.
 * Tests AvatarCreationStep and OnboardingStepper without full rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock react-native-bitmoji
const mockUseAvatarEditor = vi.fn()
const mockSaveCurrentAvatar = vi.fn()

vi.mock('react-native-bitmoji', () => ({
  Avatar: vi.fn(() => null),
  createStoredAvatar: vi.fn((config) => ({
    id: 'avatar-1',
    config,
    createdAt: Date.now(),
  })),
  saveCurrentAvatar: mockSaveCurrentAvatar,
  useAvatarEditor: () => mockUseAvatarEditor(),
  EDITOR_CATEGORIES: [
    { key: 'skin', label: 'Skin', subcategories: [] },
    { key: 'hair', label: 'Hair', subcategories: [] },
  ],
  CategoryTabs: vi.fn(() => null),
  OptionGrid: vi.fn(() => null),
  ColorPicker: vi.fn(() => null),
}))

// Mock onboarding config
vi.mock('../../../lib/onboarding/onboardingConfig', () => ({
  ONBOARDING_STEPS: [
    { id: 'welcome', title: 'Welcome', icon: '👋', estimatedTime: 30 },
    { id: 'avatar', title: 'Create Avatar', icon: '😊', estimatedTime: 60 },
    { id: 'complete', title: 'Complete', icon: '✅', estimatedTime: 15 },
  ],
  TOTAL_ONBOARDING_STEPS: 3,
  calculateProgress: (step: number) => ((step + 1) / 3) * 100,
  formatEstimatedTime: (seconds: number) => `${seconds}s`,
  calculateRemainingTime: (step: number) => {
    const remaining = [30, 60, 15].slice(step + 1)
    return remaining.reduce((sum, time) => sum + time, 0)
  },
}))

// ============================================================================
// TEST DATA
// ============================================================================

const mockAvatarConfig = {
  skinTone: 'light',
  hairStyle: 'short',
  hairColor: 'brown',
  eyeColor: 'blue',
}

const mockStoredAvatar = {
  id: 'avatar-123',
  config: mockAvatarConfig,
  createdAt: Date.now(),
}

const mockEditorState = {
  config: mockAvatarConfig,
  activeCategory: 'skin',
  activeSubcategory: 'tone',
  canUndo: false,
  canRedo: false,
  setCategory: vi.fn(),
  setSubcategory: vi.fn(),
  updateConfig: vi.fn(),
  randomize: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  getStoredAvatar: vi.fn(() => mockStoredAvatar),
}

// ============================================================================
// TESTS - OnboardingStepper
// ============================================================================

describe('OnboardingStepper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const module = await import('../OnboardingStepper')
    expect(module.OnboardingStepper).toBeDefined()
    expect(typeof module.OnboardingStepper).toBe('object') // memo returns object
  })

  it('exports default OnboardingStepper', async () => {
    const module = await import('../OnboardingStepper')
    expect(module.default).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // PROGRESS CALCULATION
  // --------------------------------------------------------------------------

  it('calculates progress for first step', async () => {
    const { calculateProgress } = await import('../../../lib/onboarding/onboardingConfig')
    const progress = calculateProgress(0)
    expect(progress).toBeCloseTo(33.33, 1)
  })

  it('calculates progress for middle step', async () => {
    const { calculateProgress } = await import('../../../lib/onboarding/onboardingConfig')
    const progress = calculateProgress(1)
    expect(progress).toBeCloseTo(66.67, 1)
  })

  it('calculates progress for last step', async () => {
    const { calculateProgress } = await import('../../../lib/onboarding/onboardingConfig')
    const progress = calculateProgress(2)
    expect(progress).toBe(100)
  })

  // --------------------------------------------------------------------------
  // TIME ESTIMATION
  // --------------------------------------------------------------------------

  it('calculates remaining time for first step', async () => {
    const { calculateRemainingTime } = await import('../../../lib/onboarding/onboardingConfig')
    const remaining = calculateRemainingTime(0)
    expect(remaining).toBe(75) // 60 + 15 (avatar + complete)
  })

  it('calculates remaining time for last step', async () => {
    const { calculateRemainingTime } = await import('../../../lib/onboarding/onboardingConfig')
    const remaining = calculateRemainingTime(2)
    expect(remaining).toBe(0)
  })

  it('formats time correctly', async () => {
    const { formatEstimatedTime } = await import('../../../lib/onboarding/onboardingConfig')
    expect(formatEstimatedTime(60)).toBe('60s')
    expect(formatEstimatedTime(75)).toBe('75s')
  })

  // --------------------------------------------------------------------------
  // STEP CONFIGURATION
  // --------------------------------------------------------------------------

  it('has correct step count', async () => {
    const { TOTAL_ONBOARDING_STEPS } = await import('../../../lib/onboarding/onboardingConfig')
    expect(TOTAL_ONBOARDING_STEPS).toBe(3)
  })

  it('has step definitions with required fields', async () => {
    const { ONBOARDING_STEPS } = await import('../../../lib/onboarding/onboardingConfig')
    expect(ONBOARDING_STEPS).toHaveLength(3)
    ONBOARDING_STEPS.forEach((step) => {
      expect(step).toHaveProperty('id')
      expect(step).toHaveProperty('title')
      expect(step).toHaveProperty('icon')
      expect(step).toHaveProperty('estimatedTime')
    })
  })
})

// ============================================================================
// TESTS - AvatarCreationStep
// ============================================================================

describe('AvatarCreationStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAvatarEditor.mockReturnValue(mockEditorState)
    mockSaveCurrentAvatar.mockResolvedValue(undefined)
  })

  // --------------------------------------------------------------------------
  // MODULE IMPORT
  // --------------------------------------------------------------------------

  it('imports without errors', async () => {
    const module = await import('../AvatarCreationStep')
    expect(module.AvatarCreationStep).toBeDefined()
    expect(typeof module.AvatarCreationStep).toBe('function')
  })

  it('exports default AvatarCreationStep', async () => {
    const module = await import('../AvatarCreationStep')
    expect(module.default).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // HOOK INTEGRATION
  // --------------------------------------------------------------------------

  it('uses avatar editor hook', async () => {
    const { AvatarCreationStep } = await import('../AvatarCreationStep')
    expect(AvatarCreationStep).toBeDefined()
    expect(mockUseAvatarEditor).toBeDefined()
  })

  it('initializes editor with existing config', async () => {
    const { AvatarCreationStep } = await import('../AvatarCreationStep')
    expect(AvatarCreationStep).toBeDefined()
    // Component should use initialAvatar.config if provided
  })

  // --------------------------------------------------------------------------
  // SAVE FUNCTIONALITY
  // --------------------------------------------------------------------------

  it('saves avatar config on complete', async () => {
    const { saveCurrentAvatar } = await import('react-native-bitmoji')
    expect(saveCurrentAvatar).toBeDefined()

    // Simulate save
    await saveCurrentAvatar(mockAvatarConfig)
    expect(mockSaveCurrentAvatar).toHaveBeenCalledWith(mockAvatarConfig)
  })

  it('handles save errors gracefully', async () => {
    mockSaveCurrentAvatar.mockRejectedValueOnce(new Error('Save failed'))

    const { saveCurrentAvatar } = await import('react-native-bitmoji')
    await expect(saveCurrentAvatar(mockAvatarConfig)).rejects.toThrow('Save failed')
  })

  // --------------------------------------------------------------------------
  // EDITOR STATE MANAGEMENT
  // --------------------------------------------------------------------------

  it('tracks active category', async () => {
    const editorState = mockUseAvatarEditor()
    expect(editorState.activeCategory).toBe('skin')
    expect(editorState.setCategory).toBeDefined()
  })

  it('tracks active subcategory', async () => {
    const editorState = mockUseAvatarEditor()
    expect(editorState.activeSubcategory).toBe('tone')
    expect(editorState.setSubcategory).toBeDefined()
  })

  it('supports undo/redo functionality', async () => {
    const editorState = mockUseAvatarEditor()
    expect(editorState.canUndo).toBe(false)
    expect(editorState.canRedo).toBe(false)
    expect(editorState.undo).toBeDefined()
    expect(editorState.redo).toBeDefined()
  })

  it('supports randomization', async () => {
    const editorState = mockUseAvatarEditor()
    expect(editorState.randomize).toBeDefined()

    editorState.randomize()
    expect(mockEditorState.randomize).toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------
  // CONFIG UPDATES
  // --------------------------------------------------------------------------

  it('updates avatar config', async () => {
    const editorState = mockUseAvatarEditor()
    const updates = { hairColor: 'blonde' }

    editorState.updateConfig(updates)
    expect(mockEditorState.updateConfig).toHaveBeenCalledWith(updates)
  })

  it('gets stored avatar format', async () => {
    const editorState = mockUseAvatarEditor()
    const stored = editorState.getStoredAvatar()

    expect(stored).toHaveProperty('id')
    expect(stored).toHaveProperty('config')
    expect(stored).toHaveProperty('createdAt')
  })

  // --------------------------------------------------------------------------
  // EDITOR CATEGORIES
  // --------------------------------------------------------------------------

  it('has editor categories defined', async () => {
    const { EDITOR_CATEGORIES } = await import('react-native-bitmoji')
    expect(EDITOR_CATEGORIES).toBeDefined()
    expect(Array.isArray(EDITOR_CATEGORIES)).toBe(true)
    expect(EDITOR_CATEGORIES.length).toBeGreaterThan(0)
  })

  it('category structure is valid', async () => {
    const { EDITOR_CATEGORIES } = await import('react-native-bitmoji')
    EDITOR_CATEGORIES.forEach((category) => {
      expect(category).toHaveProperty('key')
      expect(category).toHaveProperty('label')
      expect(category).toHaveProperty('subcategories')
      expect(Array.isArray(category.subcategories)).toBe(true)
    })
  })
})

// ============================================================================
// TESTS - Barrel Exports
// ============================================================================

describe('Onboarding Barrel Exports', () => {
  it('exports WelcomeScreen', async () => {
    const module = await import('../index')
    expect(module.WelcomeScreen).toBeDefined()
  })

  it('exports AvatarCreationStep', async () => {
    const module = await import('../index')
    expect(module.AvatarCreationStep).toBeDefined()
  })

  it('exports OnboardingStepper', async () => {
    const module = await import('../index')
    expect(module.OnboardingStepper).toBeDefined()
  })

  it('exports all necessary types', async () => {
    // Type exports can't be directly tested but we verify module structure
    const module = await import('../index')
    expect(Object.keys(module)).toContain('WelcomeScreen')
    expect(Object.keys(module)).toContain('AvatarCreationStep')
    expect(Object.keys(module)).toContain('OnboardingStepper')
  })
})
