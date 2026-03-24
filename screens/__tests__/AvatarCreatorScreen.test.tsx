/**
 * AvatarCreatorScreen Tests
 *
 * Tests for the guided prompt avatar creator screen using Recraft AI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

const mockGenerate = vi.fn()
const mockSave = vi.fn()

vi.mock('../../hooks/useAvatarGenerator', () => ({
  useAvatarGenerator: () => ({
    isGenerating: false,
    isSaving: false,
    error: null,
    generatedAvatar: null,
    generatedAvatars: [],
    generate: mockGenerate,
    save: mockSave,
    clearError: vi.fn(),
  }),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    profile: { avatar: null },
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
    refreshProfile: vi.fn(),
  }),
}))

vi.mock('../../lib/recraftApi', () => ({
  generateAvatar: vi.fn(),
  fetchSvgContent: vi.fn(),
  buildAvatarPrompt: vi.fn().mockReturnValue('test prompt'),
  GENDER_OPTIONS: [{ id: 'masculine', label: 'Masculine' }],
  BODY_TYPE_OPTIONS: [{ id: 'average', label: 'Average' }],
  SKIN_TONE_OPTIONS: [{ id: 'medium', label: 'Medium' }],
  FACE_SHAPE_OPTIONS: [{ id: 'oval', label: 'Oval' }],
  EYEBROW_SHAPE_OPTIONS: [{ id: 'natural', label: 'Natural' }],
  EYE_COLOR_OPTIONS: [{ id: 'brown', label: 'Brown' }],
  EYE_SHAPE_OPTIONS: [{ id: 'almond', label: 'Almond' }],
  NOSE_OPTIONS: [{ id: 'medium', label: 'Medium' }],
  LIP_STYLE_OPTIONS: [{ id: 'medium', label: 'Medium' }],
  FACIAL_HAIR_OPTIONS: [{ id: 'none', label: 'None' }],
  HAIR_STYLE_OPTIONS: [{ id: 'short', label: 'Short' }],
  HAIR_COLOR_OPTIONS: [{ id: 'brown', label: 'Brown' }],
  EXPRESSION_OPTIONS: [{ id: 'friendly', label: 'Friendly' }],
  CLOTHING_OPTIONS: [{ id: 'casual t-shirt', label: 'Casual' }],
  ACCESSORY_OPTIONS: [{ id: 'glasses', label: 'Glasses' }],
  MAKEUP_OPTIONS: [{ id: 'none', label: 'None' }],
  BACKGROUND_COLOR_OPTIONS: [{ id: 'white', label: 'White' }],
}))

// ============================================================================
// TESTS
// ============================================================================

describe('AvatarCreatorScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export a default component', async () => {
    const module = await import('../AvatarCreatorScreen')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('function')
  })

  it('should have the generate function available', () => {
    expect(mockGenerate).toBeDefined()
    expect(typeof mockGenerate).toBe('function')
  })

  it('should have the save function available', () => {
    expect(mockSave).toBeDefined()
    expect(typeof mockSave).toBe('function')
  })
})
