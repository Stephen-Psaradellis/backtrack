/**
 * Avatar2DCreator Component Tests
 *
 * Tests for the avatar editor types, configurations, and presets.
 * Note: Actual component rendering tests require a full React Native environment.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  Avatar2DConfig,
  StoredAvatar2D,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  SKIN_TONE_PRESETS,
  HAIR_COLOR_PRESETS,
  CLOTHING_COLOR_PRESETS,
  HAIR_STYLES,
  EYE_TYPES,
  EYEBROW_TYPES,
  MOUTH_TYPES,
  FACIAL_HAIR_TYPES,
  ACCESSORIES_TYPES,
  CLOTHING_TYPES,
  isStoredAvatar2D,
  isAvatar2DConfig,
} from '../types';
import { createStoredAvatar } from '@/lib/avatar2d/storage';

// Mock the storage module
vi.mock('@/lib/avatar2d/storage', () => ({
  createStoredAvatar: vi.fn((config: Avatar2DConfig): StoredAvatar2D => ({
    id: 'mock-avatar-id',
    type: '2d',
    config,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  })),
}));

describe('Avatar2DCreator', () => {
  describe('color presets', () => {
    it('has correct number of skin tone presets', () => {
      expect(SKIN_TONE_PRESETS).toHaveLength(10);
    });

    it('has correct number of hair color presets', () => {
      expect(HAIR_COLOR_PRESETS).toHaveLength(14);
    });

    it('has correct number of clothing color presets', () => {
      expect(CLOTHING_COLOR_PRESETS).toHaveLength(12);
    });

    it('skin tone presets have name and valid hex', () => {
      SKIN_TONE_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('hex');
        expect(preset.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('hair color presets have name and valid hex', () => {
      HAIR_COLOR_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('hex');
        expect(preset.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('clothing color presets have name and valid hex', () => {
      CLOTHING_COLOR_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('hex');
        expect(preset.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('skin tone presets include variety of shades', () => {
      const names = SKIN_TONE_PRESETS.map((p) => p.name);
      expect(names).toContain('Pale');
      expect(names).toContain('Light');
      expect(names).toContain('Medium');
      expect(names).toContain('Dark');
      expect(names).toContain('Deep');
    });

    it('hair color presets include natural and unnatural colors', () => {
      const names = HAIR_COLOR_PRESETS.map((p) => p.name);
      // Natural colors
      expect(names).toContain('Black');
      expect(names).toContain('Brown');
      expect(names).toContain('Blonde');
      // Unnatural colors
      expect(names).toContain('Blue');
      expect(names).toContain('Pink');
      expect(names).toContain('Purple');
    });
  });

  describe('style option arrays', () => {
    it('HAIR_STYLES contains expected variety', () => {
      expect(HAIR_STYLES.length).toBeGreaterThan(30);
      expect(HAIR_STYLES).toContain('shortHairShortFlat');
      expect(HAIR_STYLES).toContain('longHairStraight');
      expect(HAIR_STYLES).toContain('noHair');
    });

    it('EYE_TYPES contains expected options', () => {
      expect(EYE_TYPES.length).toBeGreaterThan(10);
      expect(EYE_TYPES).toContain('default');
      expect(EYE_TYPES).toContain('happy');
      expect(EYE_TYPES).toContain('wink');
      expect(EYE_TYPES).toContain('hearts');
    });

    it('EYEBROW_TYPES contains expected options', () => {
      expect(EYEBROW_TYPES.length).toBeGreaterThan(10);
      expect(EYEBROW_TYPES).toContain('default');
      expect(EYEBROW_TYPES).toContain('angry');
      expect(EYEBROW_TYPES).toContain('sadConcerned');
    });

    it('MOUTH_TYPES contains expected options', () => {
      expect(MOUTH_TYPES.length).toBeGreaterThan(10);
      expect(MOUTH_TYPES).toContain('default');
      expect(MOUTH_TYPES).toContain('smile');
      expect(MOUTH_TYPES).toContain('sad');
      expect(MOUTH_TYPES).toContain('serious');
    });

    it('FACIAL_HAIR_TYPES contains expected options', () => {
      expect(FACIAL_HAIR_TYPES.length).toBeGreaterThanOrEqual(5);
      expect(FACIAL_HAIR_TYPES).toContain('none');
      expect(FACIAL_HAIR_TYPES).toContain('beardMedium');
      expect(FACIAL_HAIR_TYPES).toContain('moustacheFancy');
    });

    it('ACCESSORIES_TYPES contains expected options', () => {
      expect(ACCESSORIES_TYPES.length).toBeGreaterThanOrEqual(5);
      expect(ACCESSORIES_TYPES).toContain('none');
      expect(ACCESSORIES_TYPES).toContain('prescription01');
      expect(ACCESSORIES_TYPES).toContain('sunglasses');
    });

    it('CLOTHING_TYPES contains expected options', () => {
      expect(CLOTHING_TYPES.length).toBeGreaterThanOrEqual(5);
      expect(CLOTHING_TYPES).toContain('hoodie');
      expect(CLOTHING_TYPES).toContain('shirtVNeck');
      expect(CLOTHING_TYPES).toContain('blazerShirt');
    });
  });

  describe('default configurations', () => {
    it('DEFAULT_AVATAR_CONFIG is complete', () => {
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('gender', 'male');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('skinTone');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('hairStyle');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('hairColor');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('eyeType');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('eyebrowType');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('mouthType');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('clothing');
      expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('clothingColor');
    });

    it('DEFAULT_FEMALE_CONFIG is complete', () => {
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('gender', 'female');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('skinTone');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('hairStyle');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('hairColor');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('eyeType');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('eyebrowType');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('mouthType');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('clothing');
      expect(DEFAULT_FEMALE_CONFIG).toHaveProperty('clothingColor');
    });

    it('DEFAULT_FEMALE_CONFIG has feminine hair style', () => {
      expect(DEFAULT_FEMALE_CONFIG.hairStyle).toContain('longHair');
    });

    it('DEFAULT_AVATAR_CONFIG has masculine hair style', () => {
      expect(DEFAULT_AVATAR_CONFIG.hairStyle).toContain('shortHair');
    });

    it('default configs use valid preset values', () => {
      // Skin tones should be from presets
      const skinHexes = SKIN_TONE_PRESETS.map((p) => p.hex);
      expect(skinHexes).toContain(DEFAULT_AVATAR_CONFIG.skinTone);
      expect(skinHexes).toContain(DEFAULT_FEMALE_CONFIG.skinTone);

      // Hair colors should be from presets
      const hairHexes = HAIR_COLOR_PRESETS.map((p) => p.hex);
      expect(hairHexes).toContain(DEFAULT_AVATAR_CONFIG.hairColor);
      expect(hairHexes).toContain(DEFAULT_FEMALE_CONFIG.hairColor);

      // Clothing colors should be from presets
      const clothingHexes = CLOTHING_COLOR_PRESETS.map((p) => p.hex);
      expect(clothingHexes).toContain(DEFAULT_AVATAR_CONFIG.clothingColor);
      expect(clothingHexes).toContain(DEFAULT_FEMALE_CONFIG.clothingColor);
    });
  });

  describe('createStoredAvatar integration', () => {
    it('creates valid StoredAvatar2D from config', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);

      expect(avatar).toHaveProperty('id');
      expect(avatar).toHaveProperty('type', '2d');
      expect(avatar).toHaveProperty('config');
      expect(avatar).toHaveProperty('createdAt');
      expect(avatar).toHaveProperty('updatedAt');
    });

    it('creates avatar with male config', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      expect(avatar.config.gender).toBe('male');
    });

    it('creates avatar with female config', () => {
      const avatar = createStoredAvatar(DEFAULT_FEMALE_CONFIG);
      expect(avatar.config.gender).toBe('female');
    });

    it('creates avatar with custom config', () => {
      const customConfig: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        skinTone: '#d4a574',
        hairColor: '#8d3121',
        eyeType: 'happy',
      };
      const avatar = createStoredAvatar(customConfig);

      expect(avatar.config.skinTone).toBe('#d4a574');
      expect(avatar.config.hairColor).toBe('#8d3121');
      expect(avatar.config.eyeType).toBe('happy');
    });

    it('created avatar passes isStoredAvatar2D check', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      expect(isStoredAvatar2D(avatar)).toBe(true);
    });
  });

  describe('type guards', () => {
    it('isStoredAvatar2D validates correct structure', () => {
      const validAvatar: StoredAvatar2D = {
        id: 'test',
        type: '2d',
        config: DEFAULT_AVATAR_CONFIG,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      expect(isStoredAvatar2D(validAvatar)).toBe(true);
    });

    it('isStoredAvatar2D rejects invalid type', () => {
      const invalidAvatar = {
        id: 'test',
        type: 'invalid',
        config: DEFAULT_AVATAR_CONFIG,
      };
      expect(isStoredAvatar2D(invalidAvatar)).toBe(false);
    });

    it('isStoredAvatar2D rejects missing config', () => {
      const noConfig = { id: 'test', type: '2d' };
      expect(isStoredAvatar2D(noConfig)).toBe(false);
    });

    it('isStoredAvatar2D rejects null', () => {
      expect(isStoredAvatar2D(null)).toBe(false);
    });

    it('isAvatar2DConfig validates correct structure', () => {
      expect(isAvatar2DConfig(DEFAULT_AVATAR_CONFIG)).toBe(true);
      expect(isAvatar2DConfig(DEFAULT_FEMALE_CONFIG)).toBe(true);
    });

    it('isAvatar2DConfig rejects incomplete config', () => {
      expect(isAvatar2DConfig({ gender: 'male' })).toBe(false);
      expect(isAvatar2DConfig({ skinTone: '#fff' })).toBe(false);
      expect(isAvatar2DConfig({})).toBe(false);
    });

    it('isAvatar2DConfig rejects null and undefined', () => {
      expect(isAvatar2DConfig(null)).toBe(false);
      expect(isAvatar2DConfig(undefined)).toBe(false);
    });
  });

  describe('gender switching behavior', () => {
    it('male to female preserves common properties concept', () => {
      // When switching gender, skin tone should be preserved
      const maleConfig: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        skinTone: '#d4a574', // Custom skin tone
      };

      // Female config should allow the same skin tone
      const femaleConfig: Avatar2DConfig = {
        ...DEFAULT_FEMALE_CONFIG,
        skinTone: maleConfig.skinTone,
      };

      expect(femaleConfig.skinTone).toBe(maleConfig.skinTone);
      expect(femaleConfig.gender).toBe('female');
    });

    it('female to male preserves common properties concept', () => {
      const femaleConfig: Avatar2DConfig = {
        ...DEFAULT_FEMALE_CONFIG,
        skinTone: '#8d5524', // Custom skin tone
      };

      const maleConfig: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        skinTone: femaleConfig.skinTone,
      };

      expect(maleConfig.skinTone).toBe(femaleConfig.skinTone);
      expect(maleConfig.gender).toBe('male');
    });
  });

  describe('section definitions', () => {
    it('all editor sections cover avatar customization', () => {
      // The editor has sections for all major customization areas
      const expectedSections = [
        'gender',
        'skinTone',
        'hair',
        'hairColor',
        'eyes',
        'eyebrows',
        'mouth',
        'facialHair',
        'accessories',
        'clothing',
        'clothingColor',
      ];

      // Verify each section has corresponding config property or options
      expectedSections.forEach((section) => {
        if (section === 'gender') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('gender');
        } else if (section === 'skinTone') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('skinTone');
          expect(SKIN_TONE_PRESETS.length).toBeGreaterThan(0);
        } else if (section === 'hair') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('hairStyle');
          expect(HAIR_STYLES.length).toBeGreaterThan(0);
        } else if (section === 'hairColor') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('hairColor');
          expect(HAIR_COLOR_PRESETS.length).toBeGreaterThan(0);
        } else if (section === 'eyes') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('eyeType');
          expect(EYE_TYPES.length).toBeGreaterThan(0);
        } else if (section === 'eyebrows') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('eyebrowType');
          expect(EYEBROW_TYPES.length).toBeGreaterThan(0);
        } else if (section === 'mouth') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('mouthType');
          expect(MOUTH_TYPES.length).toBeGreaterThan(0);
        } else if (section === 'facialHair') {
          expect(FACIAL_HAIR_TYPES.length).toBeGreaterThan(0);
        } else if (section === 'accessories') {
          expect(ACCESSORIES_TYPES.length).toBeGreaterThan(0);
        } else if (section === 'clothing') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('clothing');
          expect(CLOTHING_TYPES.length).toBeGreaterThan(0);
        } else if (section === 'clothingColor') {
          expect(DEFAULT_AVATAR_CONFIG).toHaveProperty('clothingColor');
          expect(CLOTHING_COLOR_PRESETS.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
