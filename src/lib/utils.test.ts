import { describe, it, expect } from 'vitest'
import { splitShiftHours, calcSalary, computeTipDistribution } from './utils'
import type { Shift } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idSeq = 0
function shift(overrides: Partial<Shift> & Pick<Shift, 'employeeId' | 'startTime' | 'endTime' | 'type'>): Shift {
  return {
    id: `s${++idSeq}`,
    date: '2026-05-04',   // Monday by default
    note: undefined,
    submittedAt: '2026-05-04T10:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// splitShiftHours
// ---------------------------------------------------------------------------

describe('splitShiftHours', () => {

  it('weekday — all hours are regular', () => {
    const h = splitShiftHours('2026-05-04', '09:00', '16:00', 'regular') // Monday
    expect(h.regular).toBeCloseTo(7)
    expect(h.shabbat).toBe(0)
    expect(h.support).toBe(0)
  })

  it('friday — hours before 14:00 are regular, after are shabbat', () => {
    const h = splitShiftHours('2026-05-01', '10:00', '18:00', 'regular') // Friday
    expect(h.regular).toBeCloseTo(4)   // 10:00–14:00
    expect(h.shabbat).toBeCloseTo(4)   // 14:00–18:00
    expect(h.support).toBe(0)
  })

  it('friday — shift entirely before 14:00', () => {
    const h = splitShiftHours('2026-05-01', '09:00', '13:00', 'regular')
    expect(h.regular).toBeCloseTo(4)
    expect(h.shabbat).toBe(0)
  })

  it('friday — shift entirely after 14:00', () => {
    const h = splitShiftHours('2026-05-01', '14:00', '19:00', 'regular')
    expect(h.regular).toBe(0)
    expect(h.shabbat).toBeCloseTo(5)
  })

  it('saturday — hours before 20:00 are shabbat, after are regular', () => {
    const h = splitShiftHours('2026-05-02', '11:00', '22:00', 'regular') // Saturday
    expect(h.shabbat).toBeCloseTo(9)   // 11:00–20:00
    expect(h.regular).toBeCloseTo(2)   // 20:00–22:00
    expect(h.support).toBe(0)
  })

  it('saturday — shift entirely before 20:00', () => {
    const h = splitShiftHours('2026-05-02', '11:00', '18:00', 'regular')
    expect(h.shabbat).toBeCloseTo(7)
    expect(h.regular).toBe(0)
  })

  it('saturday — shift entirely after 20:00', () => {
    const h = splitShiftHours('2026-05-02', '21:00', '23:00', 'regular')
    expect(h.regular).toBeCloseTo(2)
    expect(h.shabbat).toBe(0)
  })

  it('support type — all hours go to support regardless of day', () => {
    const h = splitShiftHours('2026-05-02', '09:00', '14:00', 'support') // Saturday
    expect(h.support).toBeCloseTo(5)
    expect(h.shabbat).toBe(0)
    expect(h.regular).toBe(0)
  })

  it('global type — returns all zeros', () => {
    const h = splitShiftHours('2026-05-04', '00:00', '00:00', 'global')
    expect(h.regular).toBe(0)
    expect(h.shabbat).toBe(0)
    expect(h.support).toBe(0)
  })

  it('taxi type — returns all zeros', () => {
    const h = splitShiftHours('2026-05-04', '00:00', '00:00', 'taxi')
    expect(h.regular).toBe(0)
    expect(h.shabbat).toBe(0)
    expect(h.support).toBe(0)
  })

  it('shift crossing midnight — endTime treated as +24h', () => {
    const h = splitShiftHours('2026-05-04', '21:00', '01:00', 'regular') // Monday
    expect(h.regular).toBeCloseTo(4)
    expect(h.shabbat).toBe(0)
  })

  it('saturday crossing midnight — shabbat + regular across 20:00', () => {
    // Saturday 11:00–00:30 → 9h shabbat (11:00–20:00), 4.5h regular (20:00–00:30)
    const h = splitShiftHours('2026-05-02', '11:00', '00:30', 'regular')
    expect(h.shabbat).toBeCloseTo(9)
    expect(h.regular).toBeCloseTo(4.5)
  })

  it('morning/afternoon/evening types follow same shabbat rules as regular', () => {
    const fri = splitShiftHours('2026-05-01', '09:00', '17:00', 'morning')
    expect(fri.regular).toBeCloseTo(5)   // 09:00–14:00
    expect(fri.shabbat).toBeCloseTo(3)   // 14:00–17:00

    const sat = splitShiftHours('2026-05-02', '12:00', '21:00', 'evening')
    expect(sat.shabbat).toBeCloseTo(8)   // 12:00–20:00
    expect(sat.regular).toBeCloseTo(1)   // 20:00–21:00
  })
})

// ---------------------------------------------------------------------------
// calcSalary
// ---------------------------------------------------------------------------

describe('calcSalary', () => {

  it('no tips — salary = regular × wage', () => {
    expect(calcSalary(7, 0, 0, 0, 45)).toBeCloseTo(315)
  })

  it('no tips — different base wage (40 ₪/hr)', () => {
    expect(calcSalary(7, 0, 0, 0, 40)).toBeCloseTo(280)
  })

  it('shabbat hours — rate is ₪51.48/hr regardless of wage', () => {
    expect(calcSalary(0, 6, 0, 0, 45)).toBeCloseTo(6 * 51.48)
    expect(calcSalary(0, 6, 0, 0, 40)).toBeCloseTo(6 * 51.48) // same rate
  })

  it('mixed friday — 4h regular + 4h shabbat', () => {
    const expected = 4 * 45 + 4 * 51.48  // 180 + 205.92 = 385.92
    expect(calcSalary(4, 4, 0, 0, 45)).toBeCloseTo(expected)
  })

  it('support hours — ₪50/hr', () => {
    expect(calcSalary(0, 0, 5, 0, 45)).toBeCloseTo(250)
    expect(calcSalary(0, 0, 5, 0, 40)).toBeCloseTo(250) // wage irrelevant for support
  })

  it('tips below threshold — no tip bonus', () => {
    // threshold = 15 × 7h = ₪105; tips=100 < 105 → bonus=0
    expect(calcSalary(7, 0, 0, 100, 45)).toBeCloseTo(315)
  })

  it('tips exactly at threshold — no bonus', () => {
    // threshold = 15 × 7h = ₪105; tips=105 → bonus=0
    expect(calcSalary(7, 0, 0, 105, 45)).toBeCloseTo(315)
  })

  it('tips above threshold — only excess paid out', () => {
    // threshold = 15 × 7h = ₪105; tips=200 → excess=95
    expect(calcSalary(7, 0, 0, 200, 45)).toBeCloseTo(315 + 95)
  })

  it('tips threshold uses both regular + shabbat hours', () => {
    // 4h regular + 4h shabbat → threshold = 15 × 8 = ₪120
    // tips = 110 < 120 → no bonus
    expect(calcSalary(4, 4, 0, 110, 45)).toBeCloseTo(4 * 45 + 4 * 51.48)
    // tips = 150 > 120 → excess = 30
    expect(calcSalary(4, 4, 0, 150, 45)).toBeCloseTo(4 * 45 + 4 * 51.48 + 30)
  })

  it('support hours do not count toward tip threshold', () => {
    // Only regular/shabbat count → threshold = 15 × 0 = 0
    // All tips are excess for a pure support shift
    expect(calcSalary(0, 0, 5, 80, 45)).toBeCloseTo(250 + 80)
  })
})

// ---------------------------------------------------------------------------
// computeTipDistribution
// ---------------------------------------------------------------------------

describe('computeTipDistribution', () => {

  it('single worker, only pool — gets all tips', () => {
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '16:00', type: 'regular', tips: 120 }),
    ]
    const map = computeTipDistribution(shifts)
    expect(map.get('A')).toBeCloseTo(120)
  })

  it('returns empty map if no tips submitted', () => {
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '16:00', type: 'regular' }),
      shift({ employeeId: 'B', startTime: '12:00', endTime: '19:00', type: 'regular' }),
    ]
    const map = computeTipDistribution(shifts)
    expect(map.size).toBe(0)
  })

  it('two overlapping workers — tips split proportionally', () => {
    // Pool: A 09:00–15:00 (6h), tips ₪120
    // B overlaps 12:00–15:00 = 3h. Total = 9h.
    // A share = 120 × 6/9 = 80, B share = 120 × 3/9 = 40
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '15:00', type: 'regular', tips: 120 }),
      shift({ employeeId: 'B', startTime: '12:00', endTime: '19:00', type: 'regular' }),
    ]
    const map = computeTipDistribution(shifts)
    expect(map.get('A')).toBeCloseTo(80)
    expect(map.get('B')).toBeCloseTo(40)
  })

  it('support worker excluded from tip pool', () => {
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '15:00', type: 'regular', tips: 120 }),
      shift({ employeeId: 'B', startTime: '09:00', endTime: '15:00', type: 'regular' }),
      shift({ employeeId: 'C', startTime: '09:00', endTime: '14:00', type: 'support' }), // excluded
    ]
    const map = computeTipDistribution(shifts)
    expect(map.get('C')).toBeUndefined()
    // A and B share equally
    expect(map.get('A')).toBeCloseTo(60)
    expect(map.get('B')).toBeCloseTo(60)
  })

  it('global shift excluded from tip pool', () => {
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '15:00', type: 'regular', tips: 120 }),
      shift({ employeeId: 'B', startTime: '00:00', endTime: '00:00', type: 'global', amount: 500 }),
    ]
    const map = computeTipDistribution(shifts)
    expect(map.get('B')).toBeUndefined()
    expect(map.get('A')).toBeCloseTo(120) // A gets all
  })

  it('taxi shift excluded from tip pool', () => {
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '15:00', type: 'regular', tips: 120 }),
      shift({ employeeId: 'B', startTime: '00:00', endTime: '00:00', type: 'taxi', amount: 80 }),
    ]
    const map = computeTipDistribution(shifts)
    expect(map.get('B')).toBeUndefined()
    expect(map.get('A')).toBeCloseTo(120)
  })

  it('non-overlapping worker gets nothing from pool', () => {
    // Pool: A 09:00–14:00. B works 15:00–22:00 — no overlap.
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '14:00', type: 'regular', tips: 120 }),
      shift({ employeeId: 'B', startTime: '15:00', endTime: '22:00', type: 'regular' }),
    ]
    const map = computeTipDistribution(shifts)
    expect(map.get('A')).toBeCloseTo(120)
    expect(map.get('B') ?? 0).toBeCloseTo(0)
  })

  it('two tip pools on same day — each distributes independently, sums correctly', () => {
    // Pool 1: A 09:00–15:00, tips ₪120
    // Pool 2: B 15:00–22:00, tips ₪150
    // C: 12:00–20:00 (overlaps both)
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '15:00', type: 'regular', tips: 120 }),
      shift({ employeeId: 'B', startTime: '15:00', endTime: '22:00', type: 'regular', tips: 150 }),
      shift({ employeeId: 'C', startTime: '12:00', endTime: '20:00', type: 'regular' }),
    ]
    const map = computeTipDistribution(shifts)

    // Pool 1: A=6h=360, C=3h=180 → A=80, C=40
    // Pool 2: B=7h=420, C=5h=300 → B=87.5, C=62.5
    expect(map.get('A')).toBeCloseTo(80)
    expect(map.get('B')).toBeCloseTo(87.5)
    expect(map.get('C')).toBeCloseTo(40 + 62.5) // 102.5

    // Total must equal total tips submitted
    const total = [...map.values()].reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(120 + 150)
  })

  it('tip-submitting worker is included in their own pool', () => {
    // A submits tips ₪90 and B overlaps half the window
    // Pool window 09:00–15:00 (6h): A=6h, B=3h (12:00–15:00). Total=9h.
    // A share = 90 × 6/9 = 60 (not keeping all 90)
    const shifts = [
      shift({ employeeId: 'A', startTime: '09:00', endTime: '15:00', type: 'regular', tips: 90 }),
      shift({ employeeId: 'B', startTime: '12:00', endTime: '18:00', type: 'regular' }),
    ]
    const map = computeTipDistribution(shifts)
    expect(map.get('A')).toBeCloseTo(60)
    expect(map.get('B')).toBeCloseTo(30)
  })

  it('midnight-crossing shift overlaps correctly', () => {
    // Pool: A 21:00–01:00 (4h crossing midnight), tips ₪100
    // B: 22:00–02:00 (4h), overlaps 22:00–01:00 = 3h
    const shifts = [
      shift({ employeeId: 'A', startTime: '21:00', endTime: '01:00', type: 'regular', tips: 100 }),
      shift({ employeeId: 'B', startTime: '22:00', endTime: '02:00', type: 'regular' }),
    ]
    const map = computeTipDistribution(shifts)
    // A=4h=240min, B=3h=180min. Total=420. A=100×240/420≈57.14, B=100×180/420≈42.86
    expect(map.get('A')).toBeCloseTo(100 * 240 / 420)
    expect(map.get('B')).toBeCloseTo(100 * 180 / 420)
    const total = [...map.values()].reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(100)
  })

  it('total distributed tips always equals total submitted tips', () => {
    const shifts = [
      shift({ employeeId: 'A', startTime: '07:30', endTime: '14:00', type: 'regular', tips: 180 }),
      shift({ employeeId: 'B', startTime: '10:00', endTime: '17:00', type: 'regular', tips: 90 }),
      shift({ employeeId: 'C', startTime: '14:00', endTime: '22:00', type: 'regular', tips: 150 }),
      shift({ employeeId: 'D', startTime: '09:00', endTime: '13:00', type: 'support' }),
    ]
    const map = computeTipDistribution(shifts)
    const totalDistributed = [...map.values()].reduce((s, v) => s + v, 0)
    expect(totalDistributed).toBeCloseTo(180 + 90 + 150)
  })
})
