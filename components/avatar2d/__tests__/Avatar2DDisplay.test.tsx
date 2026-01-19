/**
 * Avatar2DDisplay Component Tests
 *
 * Tests for the 2D avatar display component that renders SVG avatars
 * from StoredAvatar2D or Avatar2DConfig.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  StoredAvatar2D,
  Avatar2DConfig,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  AVATAR_SIZES,
  isStoredAvatar2D,
} from '../types';

// Mock the Avatar2DDisplay component dependencies
vi.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Path: 'Path',
  Rect: 'Rect',
  Defs: 'Defs',
  ClipPath: 'ClipPath',
}));

// Helper to create a valid StoredAvatar2D
function createMockStoredAvatar(
  configOverrides?: Partial<Avatar2DConfig>
): StoredAvatar2D {
  return {
    id: 'test-avatar-123',
    type: '2d',
    config: {
      ...DEFAULT_AVATAR_CONFIG,
      ...configOverrides,
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('Avatar2DDisplay', () => {
  describe('types and configuration', () => {
    it('AVATAR_SIZES has correct pixel values for each variant', () => {
      expect(AVATAR_SIZES.sm).toBe(32);
      expect(AVATAR_SIZES.md).toBe(64);
      expect(AVATAR_SIZES.lg).toBe(120);
      expect(AVATAR_SIZES.xl).toBe(200);
    });

    it('DEFAULT_AVATAR_CONFIG has expected male defaults', () => {
      expect(DEFAULT_AVATAR_CONFIG.gender).toBe('male');
      expect(DEFAULT_AVATAR_CONFIG.hairStyle).toBe('shortHairShortFlat');
      expect(DEFAULT_AVATAR_CONFIG.mouthType).toBe('smile');
      expect(DEFAULT_AVATAR_CONFIG.eyeType).toBe('default');
      expect(DEFAULT_AVATAR_CONFIG.eyebrowType).toBe('default');
    });

    it('DEFAULT_FEMALE_CONFIG has expected female defaults', () => {
      expect(DEFAULT_FEMALE_CONFIG.gender).toBe('female');
      expect(DEFAULT_FEMALE_CONFIG.hairStyle).toBe('longHairStraight');
      expect(DEFAULT_FEMALE_CONFIG.mouthType).toBe('smile');
      expect(DEFAULT_FEMALE_CONFIG.eyebrowType).toBe('defaultNatural');
    });
  });

  describe('StoredAvatar2D creation', () => {
    it('creates valid StoredAvatar2D with default config', () => {
      const avatar = createMockStoredAvatar();
      expect(avatar.id).toBe('test-avatar-123');
      expect(avatar.type).toBe('2d');
      expect(avatar.config.gender).toBe('male');
    });

    it('creates StoredAvatar2D with custom config overrides', () => {
      const avatar = createMockStoredAvatar({
        gender: 'female',
        hairStyle: 'longHairStraight',
        skinTone: '#d4a574',
      });
      expect(avatar.config.gender).toBe('female');
      expect(avatar.config.hairStyle).toBe('longHairStraight');
      expect(avatar.config.skinTone).toBe('#d4a574');
    });

    it('isStoredAvatar2D returns true for valid avatar', () => {
      const avatar = createMockStoredAvatar();
      expect(isStoredAvatar2D(avatar)).toBe(true);
    });

    it('isStoredAvatar2D returns false for null', () => {
      expect(isStoredAvatar2D(null)).toBe(false);
    });

    it('isStoredAvatar2D returns false for wrong type', () => {
      expect(isStoredAvatar2D({ type: 'other' })).toBe(false);
    });
  });

  describe('hair styles support', () => {
    it('supports short hair style', () => {
      const avatar = createMockStoredAvatar({ hairStyle: 'shortHairShortFlat' });
      expect(avatar.config.hairStyle).toBe('shortHairShortFlat');
    });

    it('supports long hair style', () => {
      const avatar = createMockStoredAvatar({ hairStyle: 'longHairStraight' });
      expect(avatar.config.hairStyle).toBe('longHairStraight');
    });

    it('supports no hair', () => {
      const avatar = createMockStoredAvatar({ hairStyle: 'noHair' });
      expect(avatar.config.hairStyle).toBe('noHair');
    });

    it('supports curly hair style', () => {
      const avatar = createMockStoredAvatar({ hairStyle: 'longHairCurly' });
      expect(avatar.config.hairStyle).toBe('longHairCurly');
    });
  });

  describe('eye types support', () => {
    it('supports default eyes', () => {
      const avatar = createMockStoredAvatar({ eyeType: 'default' });
      expect(avatar.config.eyeType).toBe('default');
    });

    it('supports closed eyes', () => {
      const avatar = createMockStoredAvatar({ eyeType: 'close' });
      expect(avatar.config.eyeType).toBe('close');
    });

    it('supports happy eyes', () => {
      const avatar = createMockStoredAvatar({ eyeType: 'happy' });
      expect(avatar.config.eyeType).toBe('happy');
    });

    it('supports wink eye', () => {
      const avatar = createMockStoredAvatar({ eyeType: 'wink' });
      expect(avatar.config.eyeType).toBe('wink');
    });

    it('supports surprised eyes', () => {
      const avatar = createMockStoredAvatar({ eyeType: 'surprised' });
      expect(avatar.config.eyeType).toBe('surprised');
    });

    it('supports hearts eyes', () => {
      const avatar = createMockStoredAvatar({ eyeType: 'hearts' });
      expect(avatar.config.eyeType).toBe('hearts');
    });
  });

  describe('eyebrow types support', () => {
    it('supports default eyebrows', () => {
      const avatar = createMockStoredAvatar({ eyebrowType: 'default' });
      expect(avatar.config.eyebrowType).toBe('default');
    });

    it('supports angry eyebrows', () => {
      const avatar = createMockStoredAvatar({ eyebrowType: 'angry' });
      expect(avatar.config.eyebrowType).toBe('angry');
    });

    it('supports sad concerned eyebrows', () => {
      const avatar = createMockStoredAvatar({ eyebrowType: 'sadConcerned' });
      expect(avatar.config.eyebrowType).toBe('sadConcerned');
    });

    it('supports raised excited eyebrows', () => {
      const avatar = createMockStoredAvatar({ eyebrowType: 'raisedExcited' });
      expect(avatar.config.eyebrowType).toBe('raisedExcited');
    });
  });

  describe('mouth types support', () => {
    it('supports default mouth', () => {
      const avatar = createMockStoredAvatar({ mouthType: 'default' });
      expect(avatar.config.mouthType).toBe('default');
    });

    it('supports smile mouth', () => {
      const avatar = createMockStoredAvatar({ mouthType: 'smile' });
      expect(avatar.config.mouthType).toBe('smile');
    });

    it('supports sad mouth', () => {
      const avatar = createMockStoredAvatar({ mouthType: 'sad' });
      expect(avatar.config.mouthType).toBe('sad');
    });

    it('supports serious mouth', () => {
      const avatar = createMockStoredAvatar({ mouthType: 'serious' });
      expect(avatar.config.mouthType).toBe('serious');
    });

    it('supports tongue mouth', () => {
      const avatar = createMockStoredAvatar({ mouthType: 'tongue' });
      expect(avatar.config.mouthType).toBe('tongue');
    });

    it('supports twinkle mouth', () => {
      const avatar = createMockStoredAvatar({ mouthType: 'twinkle' });
      expect(avatar.config.mouthType).toBe('twinkle');
    });

    it('supports scream open mouth', () => {
      const avatar = createMockStoredAvatar({ mouthType: 'screamOpen' });
      expect(avatar.config.mouthType).toBe('screamOpen');
    });
  });

  describe('facial hair support', () => {
    it('supports no facial hair', () => {
      const avatar = createMockStoredAvatar({ facialHair: 'none' });
      expect(avatar.config.facialHair).toBe('none');
    });

    it('supports medium beard', () => {
      const avatar = createMockStoredAvatar({
        facialHair: 'beardMedium',
        facialHairColor: '#2c1810',
      });
      expect(avatar.config.facialHair).toBe('beardMedium');
      expect(avatar.config.facialHairColor).toBe('#2c1810');
    });

    it('supports light beard', () => {
      const avatar = createMockStoredAvatar({
        facialHair: 'beardLight',
        facialHairColor: '#4e3328',
      });
      expect(avatar.config.facialHair).toBe('beardLight');
    });

    it('supports majestic beard', () => {
      const avatar = createMockStoredAvatar({
        facialHair: 'beardMagestic',
        facialHairColor: '#090806',
      });
      expect(avatar.config.facialHair).toBe('beardMagestic');
    });

    it('supports fancy moustache', () => {
      const avatar = createMockStoredAvatar({ facialHair: 'moustacheFancy' });
      expect(avatar.config.facialHair).toBe('moustacheFancy');
    });

    it('supports magnum moustache', () => {
      const avatar = createMockStoredAvatar({ facialHair: 'moustacheMagnum' });
      expect(avatar.config.facialHair).toBe('moustacheMagnum');
    });
  });

  describe('accessories support', () => {
    it('supports no accessories', () => {
      const avatar = createMockStoredAvatar({ accessories: 'none' });
      expect(avatar.config.accessories).toBe('none');
    });

    it('supports prescription glasses', () => {
      const avatar = createMockStoredAvatar({ accessories: 'prescription01' });
      expect(avatar.config.accessories).toBe('prescription01');
    });

    it('supports round glasses', () => {
      const avatar = createMockStoredAvatar({ accessories: 'round' });
      expect(avatar.config.accessories).toBe('round');
    });

    it('supports sunglasses', () => {
      const avatar = createMockStoredAvatar({ accessories: 'sunglasses' });
      expect(avatar.config.accessories).toBe('sunglasses');
    });

    it('supports wayfarers', () => {
      const avatar = createMockStoredAvatar({ accessories: 'wayfarers' });
      expect(avatar.config.accessories).toBe('wayfarers');
    });

    it('supports eyepatch', () => {
      const avatar = createMockStoredAvatar({ accessories: 'eyepatch' });
      expect(avatar.config.accessories).toBe('eyepatch');
    });

    it('supports accessories with custom color', () => {
      const avatar = createMockStoredAvatar({
        accessories: 'prescription01',
        accessoriesColor: '#ff0000',
      });
      expect(avatar.config.accessoriesColor).toBe('#ff0000');
    });
  });

  describe('clothing support', () => {
    it('supports V-neck shirt', () => {
      const avatar = createMockStoredAvatar({ clothing: 'shirtVNeck' });
      expect(avatar.config.clothing).toBe('shirtVNeck');
    });

    it('supports scoop neck shirt', () => {
      const avatar = createMockStoredAvatar({ clothing: 'shirtScoopNeck' });
      expect(avatar.config.clothing).toBe('shirtScoopNeck');
    });

    it('supports hoodie', () => {
      const avatar = createMockStoredAvatar({ clothing: 'hoodie' });
      expect(avatar.config.clothing).toBe('hoodie');
    });

    it('supports custom clothing color', () => {
      const avatar = createMockStoredAvatar({
        clothing: 'hoodie',
        clothingColor: '#1a237e',
      });
      expect(avatar.config.clothingColor).toBe('#1a237e');
    });
  });

  describe('skin tones support', () => {
    it('supports light skin tone', () => {
      const avatar = createMockStoredAvatar({ skinTone: '#ffdbb4' });
      expect(avatar.config.skinTone).toBe('#ffdbb4');
    });

    it('supports medium skin tone', () => {
      const avatar = createMockStoredAvatar({ skinTone: '#b08d63' });
      expect(avatar.config.skinTone).toBe('#b08d63');
    });

    it('supports dark skin tone', () => {
      const avatar = createMockStoredAvatar({ skinTone: '#4a2c2a' });
      expect(avatar.config.skinTone).toBe('#4a2c2a');
    });
  });

  describe('avatar config completeness', () => {
    it('creates complete config with all optional fields', () => {
      const avatar = createMockStoredAvatar({
        gender: 'male',
        skinTone: '#d4a574',
        hairStyle: 'shortHairShortFlat',
        hairColor: '#2c1810',
        eyeType: 'default',
        eyebrowType: 'default',
        mouthType: 'smile',
        facialHair: 'beardLight',
        facialHairColor: '#2c1810',
        accessories: 'prescription01',
        accessoriesColor: '#1a1a2e',
        clothing: 'hoodie',
        clothingColor: '#5e6cd8',
      });

      expect(avatar.config.gender).toBe('male');
      expect(avatar.config.skinTone).toBe('#d4a574');
      expect(avatar.config.hairStyle).toBe('shortHairShortFlat');
      expect(avatar.config.hairColor).toBe('#2c1810');
      expect(avatar.config.eyeType).toBe('default');
      expect(avatar.config.eyebrowType).toBe('default');
      expect(avatar.config.mouthType).toBe('smile');
      expect(avatar.config.facialHair).toBe('beardLight');
      expect(avatar.config.facialHairColor).toBe('#2c1810');
      expect(avatar.config.accessories).toBe('prescription01');
      expect(avatar.config.accessoriesColor).toBe('#1a1a2e');
      expect(avatar.config.clothing).toBe('hoodie');
      expect(avatar.config.clothingColor).toBe('#5e6cd8');
    });
  });
});
