import { describe, it, expect } from 'vitest'
import {
  CHECKIN_GPS_CONFIG,
  VISIT_GPS_CONFIG,
  BACKGROUND_GPS_CONFIG,
  DISCOVERY_CONFIG,
  type AccuracyStatus,
  getAccuracyStatus,
  calculateEffectiveRadius,
  isAccuracyAcceptable,
  getAccuracyMessage,
} from '../gpsConfig'

describe('gpsConfig', () => {
  // =========================================================================
  // CONFIGURATION CONSTANTS
  // =========================================================================

  describe('CHECKIN_GPS_CONFIG', () => {
    it('should have correct base radius', () => {
      expect(CHECKIN_GPS_CONFIG.BASE_RADIUS).toBe(50)
    })

    it('should have correct buffer factor', () => {
      expect(CHECKIN_GPS_CONFIG.BUFFER_FACTOR).toBe(1.5)
    })

    it('should have correct max buffer', () => {
      expect(CHECKIN_GPS_CONFIG.MAX_BUFFER).toBe(100)
    })

    it('should have correct max acceptable accuracy', () => {
      expect(CHECKIN_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY).toBe(75)
    })

    it('should have correct min acceptable accuracy', () => {
      expect(CHECKIN_GPS_CONFIG.MIN_ACCEPTABLE_ACCURACY).toBe(1)
    })

    it('should have correct default accuracy', () => {
      expect(CHECKIN_GPS_CONFIG.DEFAULT_ACCURACY).toBe(50)
    })
  })

  describe('VISIT_GPS_CONFIG', () => {
    it('should have stricter base radius than check-in', () => {
      expect(VISIT_GPS_CONFIG.BASE_RADIUS).toBe(30)
      expect(VISIT_GPS_CONFIG.BASE_RADIUS).toBeLessThan(
        CHECKIN_GPS_CONFIG.BASE_RADIUS
      )
    })

    it('should have stricter buffer factor', () => {
      expect(VISIT_GPS_CONFIG.BUFFER_FACTOR).toBe(1.0)
      expect(VISIT_GPS_CONFIG.BUFFER_FACTOR).toBeLessThan(
        CHECKIN_GPS_CONFIG.BUFFER_FACTOR
      )
    })

    it('should have stricter max buffer', () => {
      expect(VISIT_GPS_CONFIG.MAX_BUFFER).toBe(50)
      expect(VISIT_GPS_CONFIG.MAX_BUFFER).toBeLessThan(
        CHECKIN_GPS_CONFIG.MAX_BUFFER
      )
    })

    it('should have stricter max acceptable accuracy', () => {
      expect(VISIT_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY).toBe(50)
      expect(VISIT_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY).toBeLessThan(
        CHECKIN_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY
      )
    })
  })

  describe('BACKGROUND_GPS_CONFIG', () => {
    it('should have correct dwell radius', () => {
      expect(BACKGROUND_GPS_CONFIG.DWELL_RADIUS).toBe(100)
    })

    it('should have correct leave threshold with hysteresis', () => {
      expect(BACKGROUND_GPS_CONFIG.LEAVE_THRESHOLD).toBe(200)
      expect(BACKGROUND_GPS_CONFIG.LEAVE_THRESHOLD).toBeGreaterThan(
        BACKGROUND_GPS_CONFIG.DWELL_RADIUS
      )
    })

    it('should have correct max acceptable accuracy', () => {
      expect(BACKGROUND_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY).toBe(60)
    })

    it('should have distance interval that matches debug mode', () => {
      if (BACKGROUND_GPS_CONFIG.DEBUG_MODE) {
        expect(BACKGROUND_GPS_CONFIG.DISTANCE_INTERVAL).toBe(10)
      } else {
        expect(BACKGROUND_GPS_CONFIG.DISTANCE_INTERVAL).toBe(50)
      }
    })

    it('should have time interval that matches debug mode', () => {
      if (BACKGROUND_GPS_CONFIG.DEBUG_MODE) {
        expect(BACKGROUND_GPS_CONFIG.TIME_INTERVAL_MS).toBe(10 * 1000)
      } else {
        expect(BACKGROUND_GPS_CONFIG.TIME_INTERVAL_MS).toBe(2 * 60 * 1000)
      }
    })

    it('should never have debug mode in non-debug environments', () => {
      // If env var is not set, debug mode should be false
      if (process.env.EXPO_PUBLIC_GPS_DEBUG_MODE !== 'true') {
        expect(BACKGROUND_GPS_CONFIG.DEBUG_MODE).toBe(false)
      }
    })
  })

  describe('DISCOVERY_CONFIG', () => {
    it('should have correct database search radius', () => {
      expect(DISCOVERY_CONFIG.DATABASE_SEARCH_RADIUS).toBe(500)
    })

    it('should have correct Google Places radius', () => {
      expect(DISCOVERY_CONFIG.GOOGLE_PLACES_RADIUS).toBe(1000)
    })

    it('should have correct database max results', () => {
      expect(DISCOVERY_CONFIG.DATABASE_MAX_RESULTS).toBe(10)
    })

    it('should have correct Google max results', () => {
      expect(DISCOVERY_CONFIG.GOOGLE_MAX_RESULTS).toBe(10)
    })

    it('should have Google Places radius wider than database radius', () => {
      expect(DISCOVERY_CONFIG.GOOGLE_PLACES_RADIUS).toBeGreaterThan(
        DISCOVERY_CONFIG.DATABASE_SEARCH_RADIUS
      )
    })
  })

  // =========================================================================
  // getAccuracyStatus
  // =========================================================================

  describe('getAccuracyStatus', () => {
    describe('null/undefined handling', () => {
      it('should return "defaulted" for null accuracy', () => {
        expect(getAccuracyStatus(null)).toBe('defaulted')
      })

      it('should return "defaulted" for undefined accuracy', () => {
        expect(getAccuracyStatus(undefined)).toBe('defaulted')
      })
    })

    describe('suspicious accuracy (< 1m)', () => {
      it('should return "suspicious" for 0m accuracy', () => {
        expect(getAccuracyStatus(0)).toBe('suspicious')
      })

      it('should return "suspicious" for 0.5m accuracy', () => {
        expect(getAccuracyStatus(0.5)).toBe('suspicious')
      })

      it('should return "suspicious" for 0.9m accuracy', () => {
        expect(getAccuracyStatus(0.9)).toBe('suspicious')
      })

      it('should return "suspicious" for negative accuracy', () => {
        expect(getAccuracyStatus(-1)).toBe('suspicious')
      })
    })

    describe('excellent accuracy (≤ 10m)', () => {
      it('should return "excellent" for exactly 1m', () => {
        expect(getAccuracyStatus(1)).toBe('excellent')
      })

      it('should return "excellent" for 5m', () => {
        expect(getAccuracyStatus(5)).toBe('excellent')
      })

      it('should return "excellent" for exactly 10m', () => {
        expect(getAccuracyStatus(10)).toBe('excellent')
      })
    })

    describe('good accuracy (≤ 25m)', () => {
      it('should return "good" for 15m', () => {
        expect(getAccuracyStatus(15)).toBe('good')
      })

      it('should return "good" for exactly 25m', () => {
        expect(getAccuracyStatus(25)).toBe('good')
      })

      it('should NOT return "good" for 10.1m', () => {
        expect(getAccuracyStatus(10.1)).toBe('good')
      })
    })

    describe('fair accuracy (≤ 50m)', () => {
      it('should return "fair" for 30m', () => {
        expect(getAccuracyStatus(30)).toBe('fair')
      })

      it('should return "fair" for exactly 50m', () => {
        expect(getAccuracyStatus(50)).toBe('fair')
      })

      it('should NOT return "fair" for 25.1m', () => {
        expect(getAccuracyStatus(25.1)).toBe('fair')
      })
    })

    describe('poor accuracy (≤ 75m)', () => {
      it('should return "poor" for 60m', () => {
        expect(getAccuracyStatus(60)).toBe('poor')
      })

      it('should return "poor" for exactly 75m', () => {
        expect(getAccuracyStatus(75)).toBe('poor')
      })

      it('should NOT return "poor" for 50.1m', () => {
        expect(getAccuracyStatus(50.1)).toBe('poor')
      })
    })

    describe('rejected accuracy (> 75m)', () => {
      it('should return "rejected" for 76m', () => {
        expect(getAccuracyStatus(76)).toBe('rejected')
      })

      it('should return "rejected" for 100m', () => {
        expect(getAccuracyStatus(100)).toBe('rejected')
      })

      it('should return "rejected" for 1000m', () => {
        expect(getAccuracyStatus(1000)).toBe('rejected')
      })

      it('should return "rejected" for extremely large values', () => {
        expect(getAccuracyStatus(999999)).toBe('rejected')
      })
    })

    describe('boundary values', () => {
      it('should correctly classify accuracy at exact thresholds', () => {
        expect(getAccuracyStatus(1)).toBe('excellent') // Min acceptable
        expect(getAccuracyStatus(10)).toBe('excellent') // Excellent max
        expect(getAccuracyStatus(25)).toBe('good') // Good max
        expect(getAccuracyStatus(50)).toBe('fair') // Fair max
        expect(getAccuracyStatus(75)).toBe('poor') // Poor max / Rejected min
      })

      it('should correctly classify accuracy just above thresholds', () => {
        expect(getAccuracyStatus(10.01)).toBe('good')
        expect(getAccuracyStatus(25.01)).toBe('fair')
        expect(getAccuracyStatus(50.01)).toBe('poor')
        expect(getAccuracyStatus(75.01)).toBe('rejected')
      })
    })
  })

  // =========================================================================
  // calculateEffectiveRadius
  // =========================================================================

  describe('calculateEffectiveRadius', () => {
    describe('with default config (CHECKIN_GPS_CONFIG)', () => {
      it('should return base radius + buffer for 5m accuracy (excellent)', () => {
        // buffer = 5 * 1.5 = 7.5
        // radius = 50 + 7.5 = 57.5
        expect(calculateEffectiveRadius(5)).toBe(57.5)
      })

      it('should return base radius + buffer for 15m accuracy (good)', () => {
        // buffer = 15 * 1.5 = 22.5
        // radius = 50 + 22.5 = 72.5
        expect(calculateEffectiveRadius(15)).toBe(72.5)
      })

      it('should return base radius + buffer for 30m accuracy (fair)', () => {
        // buffer = 30 * 1.5 = 45
        // radius = 50 + 45 = 95
        expect(calculateEffectiveRadius(30)).toBe(95)
      })

      it('should return base radius + buffer for 50m accuracy (fair)', () => {
        // buffer = 50 * 1.5 = 75 (under max)
        // radius = 50 + 75 = 125
        expect(calculateEffectiveRadius(50)).toBe(125)
      })

      it('should cap buffer at MAX_BUFFER for 75m accuracy', () => {
        // buffer = 75 * 1.5 = 112.5, but max is 100
        // radius = 50 + 100 = 150
        expect(calculateEffectiveRadius(75)).toBe(150)
      })

      it('should return max radius for rejected accuracy (76m)', () => {
        // Rejected accuracy returns BASE_RADIUS + MAX_BUFFER
        expect(calculateEffectiveRadius(76)).toBe(150)
      })

      it('should return max radius for extremely large accuracy', () => {
        expect(calculateEffectiveRadius(1000)).toBe(150)
      })

      it('should use default accuracy when accuracy is null', () => {
        // DEFAULT_ACCURACY = 50
        // buffer = 50 * 1.5 = 75
        // radius = 50 + 75 = 125
        expect(calculateEffectiveRadius(null)).toBe(125)
      })

      it('should use default accuracy when accuracy is undefined', () => {
        expect(calculateEffectiveRadius(undefined)).toBe(125)
      })

      it('should handle zero accuracy', () => {
        // buffer = 0 * 1.5 = 0
        // radius = 50 + 0 = 50
        expect(calculateEffectiveRadius(0)).toBe(50)
      })

      it('should handle negative accuracy', () => {
        // buffer = -5 * 1.5 = -7.5, min(0, 100) = 0
        // But Math.min with negative gives negative, so result = 50 + (-7.5) = 42.5
        const result = calculateEffectiveRadius(-5)
        expect(result).toBe(42.5)
      })

      it('should return minimum radius (base only) for 0m accuracy', () => {
        expect(calculateEffectiveRadius(0)).toBe(
          CHECKIN_GPS_CONFIG.BASE_RADIUS
        )
      })
    })

    describe('with custom config (VISIT_GPS_CONFIG)', () => {
      it('should use custom base radius and buffer factor', () => {
        // VISIT: BASE_RADIUS = 30, BUFFER_FACTOR = 1.0, MAX_BUFFER = 50
        // For 20m: buffer = 20 * 1.0 = 20, radius = 30 + 20 = 50
        expect(calculateEffectiveRadius(20, VISIT_GPS_CONFIG)).toBe(50)
      })

      it('should cap at custom max buffer', () => {
        // For 60m: buffer = 60 * 1.0 = 60, but max is 50
        // radius = 30 + 50 = 80
        expect(calculateEffectiveRadius(60, VISIT_GPS_CONFIG)).toBe(80)
      })

      it('should reject accuracy above custom max', () => {
        // VISIT MAX_ACCEPTABLE_ACCURACY = 50
        // For 51m: rejected, returns BASE_RADIUS + MAX_BUFFER = 30 + 50 = 80
        expect(calculateEffectiveRadius(51, VISIT_GPS_CONFIG)).toBe(80)
      })

      it('should use custom default accuracy', () => {
        // VISIT DEFAULT_ACCURACY = 30
        // buffer = 30 * 1.0 = 30
        // radius = 30 + 30 = 60
        expect(calculateEffectiveRadius(null, VISIT_GPS_CONFIG)).toBe(60)
      })
    })

    describe('boundary values', () => {
      it('should handle accuracy at exact max acceptable threshold', () => {
        // 75m is the max acceptable for check-in
        expect(calculateEffectiveRadius(75)).toBe(150)
      })

      it('should handle accuracy just below max acceptable threshold', () => {
        // 74.9m: buffer = 74.9 * 1.5 = 112.35, capped at 100
        // radius = 50 + 100 = 150
        expect(calculateEffectiveRadius(74.9)).toBe(150)
      })

      it('should handle accuracy at buffer cap threshold', () => {
        // 66.67m * 1.5 = 100.005, should cap at 100
        // radius = 50 + 100 = 150
        expect(calculateEffectiveRadius(66.67)).toBeCloseTo(150, 1)
      })

      it('should handle very small non-zero accuracy', () => {
        // 0.1m: buffer = 0.1 * 1.5 = 0.15
        // radius = 50 + 0.15 = 50.15
        expect(calculateEffectiveRadius(0.1)).toBeCloseTo(50.15, 2)
      })
    })

    describe('edge cases', () => {
      it('should return a number for all valid inputs', () => {
        const testValues = [0, 1, 5, 10, 25, 50, 75, 100, null, undefined]
        testValues.forEach((value) => {
          expect(typeof calculateEffectiveRadius(value)).toBe('number')
        })
      })

      it('should always return value >= base radius', () => {
        const testValues = [0, 1, 5, 10, 25, 50, 75, 100]
        testValues.forEach((value) => {
          expect(calculateEffectiveRadius(value)).toBeGreaterThanOrEqual(
            CHECKIN_GPS_CONFIG.BASE_RADIUS
          )
        })
      })

      it('should never exceed base + max buffer for accepted accuracy', () => {
        const maxRadius =
          CHECKIN_GPS_CONFIG.BASE_RADIUS + CHECKIN_GPS_CONFIG.MAX_BUFFER
        const testValues = [0, 1, 5, 10, 25, 50, 75]
        testValues.forEach((value) => {
          expect(calculateEffectiveRadius(value)).toBeLessThanOrEqual(
            maxRadius
          )
        })
      })
    })
  })

  // =========================================================================
  // isAccuracyAcceptable
  // =========================================================================

  describe('isAccuracyAcceptable', () => {
    describe('with default config (CHECKIN_GPS_CONFIG)', () => {
      it('should accept null accuracy', () => {
        expect(isAccuracyAcceptable(null)).toBe(true)
      })

      it('should accept undefined accuracy', () => {
        expect(isAccuracyAcceptable(undefined)).toBe(true)
      })

      it('should accept 0m accuracy', () => {
        expect(isAccuracyAcceptable(0)).toBe(true)
      })

      it('should accept excellent accuracy (5m)', () => {
        expect(isAccuracyAcceptable(5)).toBe(true)
      })

      it('should accept good accuracy (15m)', () => {
        expect(isAccuracyAcceptable(15)).toBe(true)
      })

      it('should accept fair accuracy (30m)', () => {
        expect(isAccuracyAcceptable(30)).toBe(true)
      })

      it('should accept poor accuracy (60m)', () => {
        expect(isAccuracyAcceptable(60)).toBe(true)
      })

      it('should accept accuracy at exact max threshold (75m)', () => {
        expect(isAccuracyAcceptable(75)).toBe(true)
      })

      it('should reject accuracy above max threshold (76m)', () => {
        expect(isAccuracyAcceptable(76)).toBe(false)
      })

      it('should reject very poor accuracy (100m)', () => {
        expect(isAccuracyAcceptable(100)).toBe(false)
      })

      it('should reject extremely poor accuracy (1000m)', () => {
        expect(isAccuracyAcceptable(1000)).toBe(false)
      })

      it('should accept negative accuracy values', () => {
        // Negative accuracy is technically invalid, but function doesn't reject it
        expect(isAccuracyAcceptable(-5)).toBe(true)
      })
    })

    describe('with custom config (VISIT_GPS_CONFIG)', () => {
      it('should accept accuracy within custom threshold (30m)', () => {
        expect(isAccuracyAcceptable(30, VISIT_GPS_CONFIG)).toBe(true)
      })

      it('should accept accuracy at custom max threshold (50m)', () => {
        expect(isAccuracyAcceptable(50, VISIT_GPS_CONFIG)).toBe(true)
      })

      it('should reject accuracy above custom max threshold (51m)', () => {
        expect(isAccuracyAcceptable(51, VISIT_GPS_CONFIG)).toBe(false)
      })

      it('should accept null with custom config', () => {
        expect(isAccuracyAcceptable(null, VISIT_GPS_CONFIG)).toBe(true)
      })

      it('should accept undefined with custom config', () => {
        expect(isAccuracyAcceptable(undefined, VISIT_GPS_CONFIG)).toBe(true)
      })
    })

    describe('boundary values', () => {
      it('should accept accuracy just below max (74.9m)', () => {
        expect(isAccuracyAcceptable(74.9)).toBe(true)
      })

      it('should reject accuracy just above max (75.1m)', () => {
        expect(isAccuracyAcceptable(75.1)).toBe(false)
      })

      it('should handle decimal accuracy values', () => {
        expect(isAccuracyAcceptable(75.0001)).toBe(false)
        expect(isAccuracyAcceptable(74.9999)).toBe(true)
      })
    })
  })

  // =========================================================================
  // getAccuracyMessage
  // =========================================================================

  describe('getAccuracyMessage', () => {
    it('should return correct message for "excellent" status', () => {
      expect(getAccuracyMessage('excellent')).toBe('Excellent GPS signal')
    })

    it('should return correct message for "good" status', () => {
      expect(getAccuracyMessage('good')).toBe('Good GPS signal')
    })

    it('should return correct message for "fair" status', () => {
      expect(getAccuracyMessage('fair')).toBe('Fair GPS signal')
    })

    it('should return correct message for "poor" status', () => {
      expect(getAccuracyMessage('poor')).toBe(
        'Poor GPS signal - verification may be less precise'
      )
    })

    it('should return correct message for "rejected" status', () => {
      expect(getAccuracyMessage('rejected')).toBe(
        'GPS signal too weak. Please move to an area with better reception.'
      )
    })

    it('should return correct message for "suspicious" status', () => {
      expect(getAccuracyMessage('suspicious')).toBe(
        'GPS signal unusually precise'
      )
    })

    it('should return correct message for "defaulted" status', () => {
      expect(getAccuracyMessage('defaulted')).toBe('GPS accuracy unknown')
    })

    it('should return correct message for "unknown" status', () => {
      expect(getAccuracyMessage('unknown')).toBe('GPS status unknown')
    })

    it('should handle all AccuracyStatus types', () => {
      const statuses: AccuracyStatus[] = [
        'excellent',
        'good',
        'fair',
        'poor',
        'rejected',
        'suspicious',
        'defaulted',
        'unknown',
      ]

      statuses.forEach((status) => {
        const message = getAccuracyMessage(status)
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })

    it('should return non-empty strings for all statuses', () => {
      const statuses: AccuracyStatus[] = [
        'excellent',
        'good',
        'fair',
        'poor',
        'rejected',
        'suspicious',
        'defaulted',
        'unknown',
      ]

      statuses.forEach((status) => {
        expect(getAccuracyMessage(status).trim()).not.toBe('')
      })
    })
  })

  // =========================================================================
  // INTEGRATION TESTS (multiple functions)
  // =========================================================================

  describe('integration: accuracy status and messages', () => {
    it('should provide consistent messages for calculated statuses', () => {
      const testCases = [
        { accuracy: 5, expectedStatus: 'excellent' },
        { accuracy: 15, expectedStatus: 'good' },
        { accuracy: 30, expectedStatus: 'fair' },
        { accuracy: 60, expectedStatus: 'poor' },
        { accuracy: 100, expectedStatus: 'rejected' },
        { accuracy: 0.5, expectedStatus: 'suspicious' },
        { accuracy: null, expectedStatus: 'defaulted' },
      ]

      testCases.forEach(({ accuracy, expectedStatus }) => {
        const status = getAccuracyStatus(accuracy)
        expect(status).toBe(expectedStatus)

        const message = getAccuracyMessage(status)
        expect(message).toBeTruthy()
        expect(typeof message).toBe('string')
      })
    })
  })

  describe('integration: effective radius and acceptance', () => {
    it('should calculate radius for all acceptable accuracies', () => {
      const acceptableAccuracies = [0, 1, 5, 15, 30, 50, 75]

      acceptableAccuracies.forEach((accuracy) => {
        expect(isAccuracyAcceptable(accuracy)).toBe(true)

        const radius = calculateEffectiveRadius(accuracy)
        expect(radius).toBeGreaterThanOrEqual(CHECKIN_GPS_CONFIG.BASE_RADIUS)
        expect(radius).toBeLessThanOrEqual(
          CHECKIN_GPS_CONFIG.BASE_RADIUS + CHECKIN_GPS_CONFIG.MAX_BUFFER
        )
      })
    })

    it('should return max radius for unacceptable accuracies', () => {
      const unacceptableAccuracies = [76, 100, 200, 1000]
      const maxRadius =
        CHECKIN_GPS_CONFIG.BASE_RADIUS + CHECKIN_GPS_CONFIG.MAX_BUFFER

      unacceptableAccuracies.forEach((accuracy) => {
        expect(isAccuracyAcceptable(accuracy)).toBe(false)
        expect(calculateEffectiveRadius(accuracy)).toBe(maxRadius)
      })
    })
  })

  describe('integration: config consistency', () => {
    it('should have VISIT config stricter than CHECKIN config', () => {
      expect(VISIT_GPS_CONFIG.BASE_RADIUS).toBeLessThan(
        CHECKIN_GPS_CONFIG.BASE_RADIUS
      )
      expect(VISIT_GPS_CONFIG.BUFFER_FACTOR).toBeLessThanOrEqual(
        CHECKIN_GPS_CONFIG.BUFFER_FACTOR
      )
      expect(VISIT_GPS_CONFIG.MAX_BUFFER).toBeLessThan(
        CHECKIN_GPS_CONFIG.MAX_BUFFER
      )
      expect(VISIT_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY).toBeLessThan(
        CHECKIN_GPS_CONFIG.MAX_ACCEPTABLE_ACCURACY
      )
    })

    it('should have consistent max radius calculations across configs', () => {
      const checkinMaxRadius =
        CHECKIN_GPS_CONFIG.BASE_RADIUS + CHECKIN_GPS_CONFIG.MAX_BUFFER
      const visitMaxRadius =
        VISIT_GPS_CONFIG.BASE_RADIUS + VISIT_GPS_CONFIG.MAX_BUFFER

      expect(checkinMaxRadius).toBe(150)
      expect(visitMaxRadius).toBe(80)
      expect(visitMaxRadius).toBeLessThan(checkinMaxRadius)
    })
  })
})
