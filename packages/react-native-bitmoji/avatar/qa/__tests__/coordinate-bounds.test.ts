/**
 * Coordinate Boundary Tests
 *
 * Validates that ankle/wrist positions produced by Legs and Arms
 * remain within the avatar's viewBox bounds (x: 0-100, y: 0-200)
 * across all pose and body-type combinations.
 */

import { getAnklePositions } from '../../parts/Legs';
import { getWristPositions, getHandRotations } from '../../parts/Arms';
import { BodyType, ArmPose, LegPose } from '../../types';

// ============================================================================
// HELPERS
// ============================================================================

const bodyTypes = Object.values(BodyType);

// ============================================================================
// ANKLE POSITION TESTS
// ============================================================================

describe('Coordinate boundary tests', () => {
  describe('Ankle positions within viewBox', () => {
    Object.values(LegPose).forEach(pose => {
      bodyTypes.forEach(bodyType => {
        it(`${pose} + ${bodyType}: ankles within bounds`, () => {
          const ankles = getAnklePositions(pose, bodyType);
          // X should be within 0-100
          expect(ankles.left.x).toBeGreaterThanOrEqual(0);
          expect(ankles.left.x).toBeLessThanOrEqual(100);
          expect(ankles.right.x).toBeGreaterThanOrEqual(0);
          expect(ankles.right.x).toBeLessThanOrEqual(100);
          // Y should be within viewBox (0-200), with room for feet (~15 units)
          expect(ankles.left.y).toBeLessThanOrEqual(185);
          expect(ankles.right.y).toBeLessThanOrEqual(185);
        });
      });
    });
  });

  // ============================================================================
  // WRIST POSITION TESTS
  // ============================================================================

  describe('Wrist positions within viewBox', () => {
    Object.values(ArmPose).forEach(pose => {
      bodyTypes.forEach(bodyType => {
        it(`${pose} + ${bodyType}: wrists within bounds`, () => {
          const wrists = getWristPositions(pose, bodyType);
          // Wrists can extend slightly beyond viewBox for dramatic poses but should be reasonable
          expect(wrists.left.x).toBeGreaterThanOrEqual(-20);
          expect(wrists.left.x).toBeLessThanOrEqual(120);
          expect(wrists.right.x).toBeGreaterThanOrEqual(-20);
          expect(wrists.right.x).toBeLessThanOrEqual(120);
        });
      });
    });
  });

  // ============================================================================
  // HAND ROTATION TESTS
  // ============================================================================

  describe('Hand rotations are valid', () => {
    Object.values(ArmPose).forEach(pose => {
      it(`${pose}: rotations are valid numbers`, () => {
        const rotations = getHandRotations(pose);
        expect(typeof rotations.left).toBe('number');
        expect(typeof rotations.right).toBe('number');
        expect(rotations.left).toBeGreaterThanOrEqual(0);
        expect(rotations.left).toBeLessThanOrEqual(360);
        expect(rotations.right).toBeGreaterThanOrEqual(0);
        expect(rotations.right).toBeLessThanOrEqual(360);
      });
    });
  });

  // ============================================================================
  // LEFT/RIGHT NON-CROSSING TESTS
  // ============================================================================

  describe('Ankle left/right dont cross for non-CROSSED poses', () => {
    [LegPose.STANDING, LegPose.WIDE].forEach(pose => {
      bodyTypes.forEach(bodyType => {
        it(`${pose} + ${bodyType}: left ankle is left of right`, () => {
          const ankles = getAnklePositions(pose, bodyType);
          expect(ankles.left.x).toBeLessThan(ankles.right.x);
        });
      });
    });
  });
});
