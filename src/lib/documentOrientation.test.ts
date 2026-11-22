import { describe, expect, it } from 'vitest'
import { landscapeCorrection } from './documentOrientation'

describe('landscape document orientation', () => {
  it.each([90, 270] as const)('uses the corrective %i° angle without inverting it', degrees => {
    expect(landscapeCorrection({ orientation_degrees: degrees, orientation_confidence: 7 })).toBe(degrees)
  })

  it.each([0, 180, null, 45])('does not force upright or unsupported orientations (%s) into portrait', degrees => {
    expect(landscapeCorrection({ orientation_degrees: degrees, orientation_confidence: 12 })).toBe(0)
  })

  it.each([null, 0, 4.99, NaN, Infinity])('leaves uncertain orientation unchanged (%s)', confidence => {
    expect(landscapeCorrection({ orientation_degrees: 270, orientation_confidence: confidence })).toBe(0)
  })
})
