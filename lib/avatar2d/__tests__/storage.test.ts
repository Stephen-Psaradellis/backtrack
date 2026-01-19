/**
 * Avatar 2D Storage Utilities Tests
 *
 * Tests for avatar storage, creation, serialization, and migration functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateAvatarId,
  createStoredAvatar,
  saveCurrentUserAvatar,
  loadCurrentUserAvatar,
  clearLocalAvatarCache,
  updateAvatarConfig,
  createDefaultAvatar,
  serializeAvatarForDb,
  deserializeAvatarFromDb,
  migrateOldAvatar,
  needsAvatarCreation,
  cacheAvatarRender,
} from '../storage';
import {
  StoredAvatar2D,
  Avatar2DConfig,
  DEFAULT_AVATAR_CONFIG,
  isStoredAvatar2D,
  isAvatar2DConfig,
} from '@/components/avatar2d/types';

describe('Avatar 2D Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAvatarId', () => {
    it('generates a unique string ID', () => {
      const id = generateAvatarId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(10);
    });

    it('starts with "avatar_" prefix', () => {
      const id = generateAvatarId();
      expect(id.startsWith('avatar_')).toBe(true);
    });

    it('generates different IDs on each call', () => {
      const id1 = generateAvatarId();
      const id2 = generateAvatarId();
      expect(id1).not.toBe(id2);
    });

    it('includes timestamp component', () => {
      const beforeTime = Date.now();
      const id = generateAvatarId();
      const afterTime = Date.now();

      // Extract timestamp from ID (format: avatar_<timestamp>_<random>)
      const timestampPart = id.split('_')[1];
      const timestamp = parseInt(timestampPart, 10);

      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('createStoredAvatar', () => {
    it('creates a StoredAvatar2D from config', () => {
      const config: Avatar2DConfig = { ...DEFAULT_AVATAR_CONFIG };
      const avatar = createStoredAvatar(config);

      expect(avatar).toHaveProperty('id');
      expect(avatar).toHaveProperty('type', '2d');
      expect(avatar).toHaveProperty('config');
      expect(avatar).toHaveProperty('createdAt');
      expect(avatar).toHaveProperty('updatedAt');
    });

    it('sets type to "2d"', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      expect(avatar.type).toBe('2d');
    });

    it('preserves the provided config', () => {
      const config: Avatar2DConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        skinTone: '#custom123',
        hairColor: '#hair456',
      };
      const avatar = createStoredAvatar(config);

      expect(avatar.config.skinTone).toBe('#custom123');
      expect(avatar.config.hairColor).toBe('#hair456');
    });

    it('sets createdAt and updatedAt to same timestamp', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      expect(avatar.createdAt).toBe(avatar.updatedAt);
    });

    it('sets timestamps as ISO strings', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);

      // ISO string format check
      expect(() => new Date(avatar.createdAt)).not.toThrow();
      expect(() => new Date(avatar.updatedAt)).not.toThrow();
    });

    it('does not include base64 by default', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      expect(avatar.base64).toBeUndefined();
    });
  });

  describe('saveCurrentUserAvatar', () => {
    it('saves avatar to AsyncStorage', async () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      await saveCurrentUserAvatar(avatar);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@avatar2d_user',
        JSON.stringify(avatar)
      );
    });

    it('throws error when AsyncStorage fails', async () => {
      const error = new Error('Storage error');
      vi.mocked(AsyncStorage.setItem).mockRejectedValueOnce(error);

      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      await expect(saveCurrentUserAvatar(avatar)).rejects.toThrow('Storage error');
    });
  });

  describe('loadCurrentUserAvatar', () => {
    it('loads avatar from AsyncStorage', async () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(avatar));

      const loaded = await loadCurrentUserAvatar();
      expect(loaded).toEqual(avatar);
    });

    it('returns null when no avatar stored', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);

      const loaded = await loadCurrentUserAvatar();
      expect(loaded).toBeNull();
    });

    it('returns null on parse error', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('invalid json{');

      const loaded = await loadCurrentUserAvatar();
      expect(loaded).toBeNull();
    });

    it('returns null on storage error', async () => {
      vi.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Read error'));

      const loaded = await loadCurrentUserAvatar();
      expect(loaded).toBeNull();
    });
  });

  describe('clearLocalAvatarCache', () => {
    it('removes avatar from AsyncStorage', async () => {
      await clearLocalAvatarCache();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@avatar2d_user');
    });

    it('does not throw on storage error', async () => {
      vi.mocked(AsyncStorage.removeItem).mockRejectedValueOnce(new Error('Remove error'));

      // Should not throw
      await expect(clearLocalAvatarCache()).resolves.toBeUndefined();
    });
  });

  describe('updateAvatarConfig', () => {
    it('updates config with new values', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const updated = updateAvatarConfig(avatar, { skinTone: '#newcolor' });

      expect(updated.config.skinTone).toBe('#newcolor');
    });

    it('preserves existing config values', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const originalHairColor = avatar.config.hairColor;
      const updated = updateAvatarConfig(avatar, { skinTone: '#newcolor' });

      expect(updated.config.hairColor).toBe(originalHairColor);
    });

    it('updates the updatedAt timestamp', () => {
      // Create avatar with a past timestamp
      const avatar: StoredAvatar2D = {
        ...createStoredAvatar(DEFAULT_AVATAR_CONFIG),
        updatedAt: '2020-01-01T00:00:00.000Z', // Past date
      };

      const updated = updateAvatarConfig(avatar, { skinTone: '#newcolor' });

      // The new timestamp should be more recent than 2020
      expect(updated.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date('2020-01-01T00:00:00.000Z').getTime()
      );
    });

    it('clears base64 cache when config changes', () => {
      const avatar: StoredAvatar2D = {
        ...createStoredAvatar(DEFAULT_AVATAR_CONFIG),
        base64: 'cached-render-data',
      };
      const updated = updateAvatarConfig(avatar, { skinTone: '#newcolor' });

      expect(updated.base64).toBeUndefined();
    });

    it('preserves avatar ID', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const updated = updateAvatarConfig(avatar, { skinTone: '#newcolor' });

      expect(updated.id).toBe(avatar.id);
    });

    it('preserves createdAt timestamp', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const updated = updateAvatarConfig(avatar, { skinTone: '#newcolor' });

      expect(updated.createdAt).toBe(avatar.createdAt);
    });
  });

  describe('createDefaultAvatar', () => {
    it('creates avatar with DEFAULT_AVATAR_CONFIG', () => {
      const avatar = createDefaultAvatar();

      expect(avatar.config.gender).toBe(DEFAULT_AVATAR_CONFIG.gender);
      expect(avatar.config.skinTone).toBe(DEFAULT_AVATAR_CONFIG.skinTone);
      expect(avatar.config.hairStyle).toBe(DEFAULT_AVATAR_CONFIG.hairStyle);
    });

    it('returns valid StoredAvatar2D', () => {
      const avatar = createDefaultAvatar();

      expect(isStoredAvatar2D(avatar)).toBe(true);
    });
  });

  describe('serializeAvatarForDb', () => {
    it('serializes avatar to JSON string', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const serialized = serializeAvatarForDb(avatar);

      expect(typeof serialized).toBe('string');
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('excludes base64 from serialized data', () => {
      const avatar: StoredAvatar2D = {
        ...createStoredAvatar(DEFAULT_AVATAR_CONFIG),
        base64: 'large-base64-data-here',
      };
      const serialized = serializeAvatarForDb(avatar);
      const parsed = JSON.parse(serialized);

      expect(parsed.base64).toBeUndefined();
    });

    it('preserves all other fields', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const serialized = serializeAvatarForDb(avatar);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBe(avatar.id);
      expect(parsed.type).toBe(avatar.type);
      expect(parsed.config).toEqual(avatar.config);
      expect(parsed.createdAt).toBe(avatar.createdAt);
      expect(parsed.updatedAt).toBe(avatar.updatedAt);
    });
  });

  describe('deserializeAvatarFromDb', () => {
    it('deserializes valid avatar JSON', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const serialized = serializeAvatarForDb(avatar);
      const deserialized = deserializeAvatarFromDb(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized?.id).toBe(avatar.id);
      expect(deserialized?.type).toBe('2d');
    });

    it('returns null for null input', () => {
      const deserialized = deserializeAvatarFromDb(null);
      expect(deserialized).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const deserialized = deserializeAvatarFromDb('not valid json{');
      expect(deserialized).toBeNull();
    });

    it('returns null for non-2d avatar type', () => {
      const data = JSON.stringify({
        id: 'test',
        type: 'old-type',
        config: {},
      });
      const deserialized = deserializeAvatarFromDb(data);
      expect(deserialized).toBeNull();
    });

    it('returns null for missing config', () => {
      const data = JSON.stringify({
        id: 'test',
        type: '2d',
        // no config
      });
      const deserialized = deserializeAvatarFromDb(data);
      expect(deserialized).toBeNull();
    });

    it('returns valid avatar for complete data', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const serialized = serializeAvatarForDb(avatar);
      const deserialized = deserializeAvatarFromDb(serialized);

      expect(deserialized).not.toBeNull();
      expect(isStoredAvatar2D(deserialized)).toBe(true);
    });
  });

  describe('migrateOldAvatar', () => {
    it('always returns null (fresh start migration)', () => {
      const oldAvatar = { someOldField: 'value' };
      const result = migrateOldAvatar(oldAvatar);
      expect(result).toBeNull();
    });

    it('returns null for any input', () => {
      expect(migrateOldAvatar({})).toBeNull();
      expect(migrateOldAvatar(null)).toBeNull();
      expect(migrateOldAvatar(undefined)).toBeNull();
      expect(migrateOldAvatar('string')).toBeNull();
      expect(migrateOldAvatar(123)).toBeNull();
    });
  });

  describe('needsAvatarCreation', () => {
    it('returns true for null', () => {
      expect(needsAvatarCreation(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(needsAvatarCreation(undefined)).toBe(true);
    });

    it('returns true for non-object', () => {
      expect(needsAvatarCreation('string')).toBe(true);
      expect(needsAvatarCreation(123)).toBe(true);
      expect(needsAvatarCreation(true)).toBe(true);
    });

    it('returns true for object without type', () => {
      expect(needsAvatarCreation({})).toBe(true);
      expect(needsAvatarCreation({ config: {} })).toBe(true);
    });

    it('returns true for non-2d type', () => {
      expect(needsAvatarCreation({ type: 'old-type' })).toBe(true);
      expect(needsAvatarCreation({ type: '3d' })).toBe(true);
    });

    it('returns false for valid 2d avatar', () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      expect(needsAvatarCreation(avatar)).toBe(false);
    });

    it('returns false for object with type: "2d"', () => {
      expect(needsAvatarCreation({ type: '2d' })).toBe(false);
    });
  });

  describe('cacheAvatarRender', () => {
    it('adds base64 to avatar', async () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const base64 = 'cached-render-base64';
      const updated = await cacheAvatarRender(avatar, base64);

      expect(updated.base64).toBe(base64);
    });

    it('updates the updatedAt timestamp', async () => {
      // Create avatar with a past timestamp
      const avatar: StoredAvatar2D = {
        ...createStoredAvatar(DEFAULT_AVATAR_CONFIG),
        updatedAt: '2020-01-01T00:00:00.000Z', // Past date
      };
      const updated = await cacheAvatarRender(avatar, 'base64');

      // The new timestamp should be more recent than 2020
      expect(updated.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date('2020-01-01T00:00:00.000Z').getTime()
      );
    });

    it('saves to AsyncStorage', async () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      await cacheAvatarRender(avatar, 'base64');

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('preserves all other avatar properties', async () => {
      const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
      const updated = await cacheAvatarRender(avatar, 'base64');

      expect(updated.id).toBe(avatar.id);
      expect(updated.type).toBe(avatar.type);
      expect(updated.config).toEqual(avatar.config);
      expect(updated.createdAt).toBe(avatar.createdAt);
    });
  });

  describe('type guards', () => {
    describe('isStoredAvatar2D', () => {
      it('returns true for valid StoredAvatar2D', () => {
        const avatar = createStoredAvatar(DEFAULT_AVATAR_CONFIG);
        expect(isStoredAvatar2D(avatar)).toBe(true);
      });

      it('returns false for null', () => {
        expect(isStoredAvatar2D(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(isStoredAvatar2D(undefined)).toBe(false);
      });

      it('returns false for non-object', () => {
        expect(isStoredAvatar2D('string')).toBe(false);
        expect(isStoredAvatar2D(123)).toBe(false);
      });

      it('returns false for object without type', () => {
        expect(isStoredAvatar2D({ config: {} })).toBe(false);
      });

      it('returns false for wrong type', () => {
        expect(isStoredAvatar2D({ type: 'other', config: {} })).toBe(false);
      });

      it('returns false for missing config', () => {
        expect(isStoredAvatar2D({ type: '2d' })).toBe(false);
      });
    });

    describe('isAvatar2DConfig', () => {
      it('returns true for valid config', () => {
        expect(isAvatar2DConfig(DEFAULT_AVATAR_CONFIG)).toBe(true);
      });

      it('returns false for null', () => {
        expect(isAvatar2DConfig(null)).toBe(false);
      });

      it('returns false for undefined', () => {
        expect(isAvatar2DConfig(undefined)).toBe(false);
      });

      it('returns false for non-object', () => {
        expect(isAvatar2DConfig('string')).toBe(false);
      });

      it('returns false for missing gender', () => {
        expect(isAvatar2DConfig({ skinTone: '#fff', hairStyle: 'short' })).toBe(false);
      });

      it('returns false for missing skinTone', () => {
        expect(isAvatar2DConfig({ gender: 'male', hairStyle: 'short' })).toBe(false);
      });

      it('returns false for missing hairStyle', () => {
        expect(isAvatar2DConfig({ gender: 'male', skinTone: '#fff' })).toBe(false);
      });

      it('returns true with minimal required fields', () => {
        expect(
          isAvatar2DConfig({
            gender: 'female',
            skinTone: '#abc123',
            hairStyle: 'longHairStraight',
          })
        ).toBe(true);
      });
    });
  });
});
