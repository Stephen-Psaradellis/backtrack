/**
 * Tests for geoPrivacy utilities
 */

import { reduceCoordinatePrecision } from '../geoPrivacy'

describe('reduceCoordinatePrecision', () => {
  describe('default precision (4 decimal places, ~11m)', () => {
    it('should round positive latitude to 4 decimal places', () => {
      expect(reduceCoordinatePrecision(37.7749295)).toBe(37.7749)
      expect(reduceCoordinatePrecision(37.774949)).toBe(37.7749)
      expect(reduceCoordinatePrecision(37.774951)).toBe(37.775)
    })

    it('should round negative longitude to 4 decimal places', () => {
      expect(reduceCoordinatePrecision(-122.4194155)).toBe(-122.4194)
      expect(reduceCoordinatePrecision(-122.419449)).toBe(-122.4194)
      expect(reduceCoordinatePrecision(-122.419451)).toBe(-122.4195)
    })

    it('should handle zero', () => {
      expect(reduceCoordinatePrecision(0)).toBe(0)
    })

    it('should handle very small numbers', () => {
      expect(reduceCoordinatePrecision(0.000012345)).toBe(0.0000)
      expect(reduceCoordinatePrecision(0.00009999)).toBe(0.0001)
    })
  })

  describe('custom precision (2 decimal places, ~1.1km)', () => {
    it('should round to 2 decimal places when specified', () => {
      expect(reduceCoordinatePrecision(37.7749295, 2)).toBe(37.77)
      expect(reduceCoordinatePrecision(37.779, 2)).toBe(37.78)
      expect(reduceCoordinatePrecision(-122.4194155, 2)).toBe(-122.42)
    })

    it('should handle edge cases at 2 decimal precision', () => {
      expect(reduceCoordinatePrecision(37.774, 2)).toBe(37.77)
      expect(reduceCoordinatePrecision(37.775, 2)).toBe(37.78)
      expect(reduceCoordinatePrecision(37.999, 2)).toBe(38.0)
    })
  })

  describe('other precision levels', () => {
    it('should round to 1 decimal place', () => {
      expect(reduceCoordinatePrecision(37.7749295, 1)).toBe(37.8)
      expect(reduceCoordinatePrecision(37.74, 1)).toBe(37.7)
    })

    it('should round to 6 decimal places (~10cm precision)', () => {
      expect(reduceCoordinatePrecision(37.7749295678, 6)).toBe(37.77493)
      expect(reduceCoordinatePrecision(-122.4194155678, 6)).toBe(-122.419416)
    })

    it('should handle 0 decimal places (whole numbers)', () => {
      expect(reduceCoordinatePrecision(37.7749295, 0)).toBe(38)
      expect(reduceCoordinatePrecision(37.4, 0)).toBe(37)
      expect(reduceCoordinatePrecision(-122.6, 0)).toBe(-123)
    })
  })

  describe('data privacy compliance', () => {
    it('should prevent exact building identification at 2 decimals (~1.1km)', () => {
      const exactLat = 37.7749295
      const reducedLat = reduceCoordinatePrecision(exactLat, 2) // 37.77

      // At 2 decimal places, coordinates within ~1.1km round to similar values
      // Note: rounding behavior means values >= .775 round up to .78
      const nearbyLat1 = 37.7740000 // rounds to 37.77
      const nearbyLat2 = 37.7749000 // rounds to 37.77 (close to exact)

      expect(reduceCoordinatePrecision(nearbyLat1, 2)).toBe(reducedLat)
      expect(reduceCoordinatePrecision(nearbyLat2, 2)).toBe(reducedLat)
    })

    it('should enable check-in verification at 4 decimals (~11m)', () => {
      const exactLat = 37.7749295
      const reducedLat = reduceCoordinatePrecision(exactLat, 4)

      // At 4 decimal places, coordinates within ~11m round to same value
      const nearby1 = 37.7749200 // ~10m away
      const nearby2 = 37.7749399 // ~11m away

      expect(reduceCoordinatePrecision(nearby1, 4)).toBe(reducedLat)
      expect(reduceCoordinatePrecision(nearby2, 4)).toBe(reducedLat)

      // But coordinates >11m away should be different
      const faraway = 37.7750000 // ~78m away
      expect(reduceCoordinatePrecision(faraway, 4)).not.toBe(reducedLat)
    })
  })

  describe('edge cases', () => {
    it('should handle extreme coordinates', () => {
      expect(reduceCoordinatePrecision(90.0, 4)).toBe(90.0) // North pole
      expect(reduceCoordinatePrecision(-90.0, 4)).toBe(-90.0) // South pole
      expect(reduceCoordinatePrecision(180.0, 4)).toBe(180.0) // International date line
      expect(reduceCoordinatePrecision(-180.0, 4)).toBe(-180.0)
    })

    it('should be idempotent (applying twice gives same result)', () => {
      const coord = 37.7749295
      const once = reduceCoordinatePrecision(coord, 4)
      const twice = reduceCoordinatePrecision(once, 4)
      expect(once).toBe(twice)
    })

    it('should handle coordinates already at target precision', () => {
      expect(reduceCoordinatePrecision(37.7749, 4)).toBe(37.7749)
      expect(reduceCoordinatePrecision(37.77, 2)).toBe(37.77)
    })
  })
})
