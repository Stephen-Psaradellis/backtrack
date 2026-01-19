/**
 * Avatar 2D Matching Utilities Tests
 *
 * Tests for avatar matching algorithms including skin tone categorization,
 * match scoring, and match description generation.
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeSkinTone,
  extractMatchCriteria,
  compareAvatars,
  calculateMatchScore,
  getMatchDescription,
  getMatchLevel,
  getMatchColor,
} from '../matching';
import {
  Avatar2DConfig,
  AvatarMatchCriteria,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_FEMALE_CONFIG,
  SKIN_TONE_PRESETS,
} from '@/components/avatar2d/types';

describe('Avatar 2D Matching', () => {
  describe('categorizeSkinTone', () => {
    it('categorizes light skin tones correctly', () => {
      // Light tones (high luminance > 0.7)
      expect(categorizeSkinTone('#ffdbb4')).toBe('light'); // Pale
      expect(categorizeSkinTone('#f5d7c3')).toBe('light'); // Light
    });

    it('categorizes medium skin tones correctly', () => {
      // Medium tones (luminance 0.4-0.7)
      expect(categorizeSkinTone('#d4a574')).toBe('medium'); // Warm
      expect(categorizeSkinTone('#c99d77')).toBe('medium'); // Tan
      expect(categorizeSkinTone('#b08d63')).toBe('medium'); // Medium
      expect(categorizeSkinTone('#c68642')).toBe('medium'); // Olive
    });

    it('categorizes dark skin tones correctly', () => {
      // Dark tones (low luminance < 0.4)
      expect(categorizeSkinTone('#8d5524')).toBe('dark'); // Brown
      expect(categorizeSkinTone('#6b4423')).toBe('dark'); // Dark
      expect(categorizeSkinTone('#4a2c2a')).toBe('dark'); // Deep
    });

    it('handles hex colors with # prefix', () => {
      expect(categorizeSkinTone('#f5d7c3')).toBe('light');
    });

    it('handles hex colors without # prefix', () => {
      expect(categorizeSkinTone('f5d7c3')).toBe('light');
    });

    it('returns medium for invalid hex', () => {
      expect(categorizeSkinTone('invalid')).toBe('medium');
      expect(categorizeSkinTone('#fff')).toBe('medium'); // Too short
      expect(categorizeSkinTone('')).toBe('medium');
    });

    it('categorizes pure white as light', () => {
      expect(categorizeSkinTone('#ffffff')).toBe('light');
    });

    it('categorizes pure black as dark', () => {
      expect(categorizeSkinTone('#000000')).toBe('dark');
    });

    it('handles uppercase hex values', () => {
      expect(categorizeSkinTone('#F5D7C3')).toBe('light');
      expect(categorizeSkinTone('#4A2C2A')).toBe('dark');
    });

    it('correctly categorizes all preset skin tones', () => {
      // Test each preset to ensure they fall into expected categories
      const lightTones = ['#ffdbb4', '#f5d7c3'];
      const mediumTones = ['#eac086', '#d4a574', '#c99d77', '#b08d63', '#c68642'];
      const darkTones = ['#8d5524', '#6b4423', '#4a2c2a'];

      lightTones.forEach((tone) => {
        expect(categorizeSkinTone(tone)).toBe('light');
      });

      mediumTones.forEach((tone) => {
        const result = categorizeSkinTone(tone);
        expect(['light', 'medium']).toContain(result);
      });

      darkTones.forEach((tone) => {
        expect(categorizeSkinTone(tone)).toBe('dark');
      });
    });
  });

  describe('extractMatchCriteria', () => {
    it('extracts gender from config', () => {
      const config: Avatar2DConfig = { ...DEFAULT_AVATAR_CONFIG };
      const criteria = extractMatchCriteria(config);
      expect(criteria.gender).toBe('male');
    });

    it('extracts female gender', () => {
      const config: Avatar2DConfig = { ...DEFAULT_FEMALE_CONFIG };
      const criteria = extractMatchCriteria(config);
      expect(criteria.gender).toBe('female');
    });

    it('categorizes skin tone', () => {
      const config: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        skinTone: '#ffdbb4', // Light
      };
      const criteria = extractMatchCriteria(config);
      expect(criteria.skinTone).toBe('light');
    });

    it('returns AvatarMatchCriteria object', () => {
      const config: Avatar2DConfig = { ...DEFAULT_AVATAR_CONFIG };
      const criteria = extractMatchCriteria(config);

      expect(criteria).toHaveProperty('gender');
      expect(criteria).toHaveProperty('skinTone');
    });
  });

  describe('compareAvatars', () => {
    it('returns 100 for exact match (same gender and skin tone)', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      expect(compareAvatars(a, b)).toBe(100);
    });

    it('returns 50 for gender match only', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'male', skinTone: 'dark' };
      expect(compareAvatars(a, b)).toBe(50);
    });

    it('returns 50 for skin tone match only', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'female', skinTone: 'light' };
      expect(compareAvatars(a, b)).toBe(50);
    });

    it('returns 0 for no match', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'female', skinTone: 'dark' };
      expect(compareAvatars(a, b)).toBe(0);
    });

    it('returns 75 for gender match + adjacent skin tone (light-medium)', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'male', skinTone: 'medium' };
      expect(compareAvatars(a, b)).toBe(75);
    });

    it('returns 75 for gender match + adjacent skin tone (medium-dark)', () => {
      const a: AvatarMatchCriteria = { gender: 'female', skinTone: 'medium' };
      const b: AvatarMatchCriteria = { gender: 'female', skinTone: 'dark' };
      expect(compareAvatars(a, b)).toBe(75);
    });

    it('returns 25 for adjacent skin tone only', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'female', skinTone: 'medium' };
      expect(compareAvatars(a, b)).toBe(25);
    });

    it('is symmetric (a vs b = b vs a)', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'female', skinTone: 'medium' };
      expect(compareAvatars(a, b)).toBe(compareAvatars(b, a));
    });
  });

  describe('calculateMatchScore', () => {
    it('calculates match score between two configs', () => {
      const configA: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        gender: 'male',
        skinTone: '#f5d7c3', // Light
      };
      const configB: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        gender: 'male',
        skinTone: '#f5d7c3', // Light
      };
      expect(calculateMatchScore(configA, configB)).toBe(100);
    });

    it('returns lower score for different configs', () => {
      const configA: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        gender: 'male',
        skinTone: '#f5d7c3', // Light
      };
      const configB: Avatar2DConfig = {
        ...DEFAULT_FEMALE_CONFIG,
        gender: 'female',
        skinTone: '#4a2c2a', // Deep/Dark
      };
      expect(calculateMatchScore(configA, configB)).toBe(0);
    });

    it('gives partial credit for gender match', () => {
      const configA: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        gender: 'male',
        skinTone: '#f5d7c3', // Light
      };
      const configB: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        gender: 'male',
        skinTone: '#4a2c2a', // Dark
      };
      expect(calculateMatchScore(configA, configB)).toBe(50);
    });
  });

  describe('getMatchDescription', () => {
    it('returns "Perfect match!" for 100', () => {
      expect(getMatchDescription(100)).toBe('Perfect match!');
    });

    it('returns "Great match" for 75-99', () => {
      expect(getMatchDescription(99)).toBe('Great match');
      expect(getMatchDescription(75)).toBe('Great match');
    });

    it('returns "Good match" for 50-74', () => {
      expect(getMatchDescription(74)).toBe('Good match');
      expect(getMatchDescription(50)).toBe('Good match');
    });

    it('returns "Partial match" for 25-49', () => {
      expect(getMatchDescription(49)).toBe('Partial match');
      expect(getMatchDescription(25)).toBe('Partial match');
    });

    it('returns "Low match" for 0-24', () => {
      expect(getMatchDescription(24)).toBe('Low match');
      expect(getMatchDescription(0)).toBe('Low match');
    });
  });

  describe('getMatchLevel', () => {
    it('returns "perfect" for 100', () => {
      expect(getMatchLevel(100)).toBe('perfect');
    });

    it('returns "high" for 75-99', () => {
      expect(getMatchLevel(99)).toBe('high');
      expect(getMatchLevel(75)).toBe('high');
    });

    it('returns "medium" for 50-74', () => {
      expect(getMatchLevel(74)).toBe('medium');
      expect(getMatchLevel(50)).toBe('medium');
    });

    it('returns "low" for 0-49', () => {
      expect(getMatchLevel(49)).toBe('low');
      expect(getMatchLevel(25)).toBe('low');
      expect(getMatchLevel(0)).toBe('low');
    });
  });

  describe('getMatchColor', () => {
    it('returns green for 100', () => {
      expect(getMatchColor(100)).toBe('#10b981');
    });

    it('returns blue for 75-99', () => {
      expect(getMatchColor(99)).toBe('#3b82f6');
      expect(getMatchColor(75)).toBe('#3b82f6');
    });

    it('returns amber for 50-74', () => {
      expect(getMatchColor(74)).toBe('#f59e0b');
      expect(getMatchColor(50)).toBe('#f59e0b');
    });

    it('returns red for 0-49', () => {
      expect(getMatchColor(49)).toBe('#ef4444');
      expect(getMatchColor(0)).toBe('#ef4444');
    });
  });

  describe('match scoring edge cases', () => {
    it('handles all female-female comparisons', () => {
      const a: AvatarMatchCriteria = { gender: 'female', skinTone: 'medium' };
      const b: AvatarMatchCriteria = { gender: 'female', skinTone: 'medium' };
      expect(compareAvatars(a, b)).toBe(100);
    });

    it('handles light-dark (non-adjacent) skin tone difference', () => {
      const a: AvatarMatchCriteria = { gender: 'male', skinTone: 'light' };
      const b: AvatarMatchCriteria = { gender: 'male', skinTone: 'dark' };
      // Only gender match (50), no skin tone bonus (not adjacent)
      expect(compareAvatars(a, b)).toBe(50);
    });

    it('handles all skin tone categories', () => {
      const tones: Array<'light' | 'medium' | 'dark'> = ['light', 'medium', 'dark'];

      for (const toneA of tones) {
        for (const toneB of tones) {
          const a: AvatarMatchCriteria = { gender: 'male', skinTone: toneA };
          const b: AvatarMatchCriteria = { gender: 'male', skinTone: toneB };
          const score = compareAvatars(a, b);

          // Score should be 50 (gender) + skin bonus
          if (toneA === toneB) {
            expect(score).toBe(100); // 50 + 50
          } else if (
            (toneA === 'light' && toneB === 'medium') ||
            (toneA === 'medium' && toneB === 'light') ||
            (toneA === 'medium' && toneB === 'dark') ||
            (toneA === 'dark' && toneB === 'medium')
          ) {
            expect(score).toBe(75); // 50 + 25 (adjacent)
          } else {
            expect(score).toBe(50); // 50 + 0 (not adjacent)
          }
        }
      }
    });
  });
});
