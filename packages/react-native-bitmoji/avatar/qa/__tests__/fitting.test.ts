/**
 * Fitting Tests
 *
 * Validates that body dimensions are internally consistent across all body
 * types: proportions must be positive, torso must fit within the viewBox,
 * and relative sizing expectations (e.g. MUSCULAR > SLIM shoulders) must hold.
 */

import { getBodyDimensions } from '../../parts/Body';
import { BodyType } from '../../types';

// ============================================================================
// BODY DIMENSION CONSISTENCY
// ============================================================================

describe('Fitting tests', () => {
  const bodyTypes = Object.values(BodyType);

  describe('Body dimensions are reasonable', () => {
    bodyTypes.forEach(bodyType => {
      it(`${bodyType}: shoulders wider than waist`, () => {
        const dims = getBodyDimensions(bodyType);
        expect(dims.shoulderWidth).toBeGreaterThanOrEqual(dims.waistWidth);
      });

      it(`${bodyType}: dimensions are positive`, () => {
        const dims = getBodyDimensions(bodyType);
        expect(dims.shoulderWidth).toBeGreaterThan(0);
        expect(dims.chestWidth).toBeGreaterThan(0);
        expect(dims.waistWidth).toBeGreaterThan(0);
        expect(dims.hipWidth).toBeGreaterThan(0);
        expect(dims.torsoLength).toBeGreaterThan(0);
      });

      it(`${bodyType}: torso fits in viewBox`, () => {
        const dims = getBodyDimensions(bodyType);
        const neckY = 72;
        const hipY = neckY + dims.torsoLength;
        expect(hipY).toBeLessThan(140); // Leave room for legs
        expect(dims.shoulderWidth).toBeLessThan(100); // Fits in viewBox width
      });

      it(`${bodyType}: body fits centered in viewBox`, () => {
        const dims = getBodyDimensions(bodyType);
        const centerX = 50;
        const leftEdge = centerX - dims.hipWidth / 2;
        const rightEdge = centerX + dims.hipWidth / 2;
        expect(leftEdge).toBeGreaterThanOrEqual(0);
        expect(rightEdge).toBeLessThanOrEqual(100);
      });
    });
  });

  // ============================================================================
  // RELATIVE BODY TYPE COMPARISONS
  // ============================================================================

  describe('Clothing dimensions adapt to body type', () => {
    it('MUSCULAR has wider shoulders than SLIM', () => {
      const muscular = getBodyDimensions(BodyType.MUSCULAR);
      const slim = getBodyDimensions(BodyType.SLIM);
      expect(muscular.shoulderWidth).toBeGreaterThan(slim.shoulderWidth);
    });

    it('CURVY has wider hips than ATHLETIC', () => {
      const curvy = getBodyDimensions(BodyType.CURVY);
      const athletic = getBodyDimensions(BodyType.ATHLETIC);
      expect(curvy.hipWidth).toBeGreaterThan(athletic.hipWidth);
    });

    it('PLUS_SIZE has widest waist', () => {
      const plusSize = getBodyDimensions(BodyType.PLUS_SIZE);
      bodyTypes.forEach(bt => {
        const dims = getBodyDimensions(bt);
        expect(plusSize.waistWidth).toBeGreaterThanOrEqual(dims.waistWidth);
      });
    });
  });
});
