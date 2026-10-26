// Regression test for the DST fall-back infinite loop.
// On the day Israel ends daylight-saving time, the calendar day is 25h long.
// classifyNonHolidayMins used to advance its cursor by `dayStart + 24h`, which
// on that day landed before midnight and never progressed → the main thread
// froze (tab "unresponsive", empty console). This test forces the Israel TZ and
// asserts the computation terminates and returns finite values.
// (cast avoids needing @types/node in the app's build tsconfig)
const g = globalThis as unknown as { process?: { env: Record<string, string | undefined> } }
if (g.process) g.process.env.TZ = 'Asia/Jerusalem'

import { describe, it, expect } from 'vitest'
import { splitShiftHours } from './utils'

describe('splitShiftHours across the Israel DST fall-back day (2026-10-25)', () => {
  it('terminates for a late shift crossing the 23:00→midnight DST boundary', () => {
    const r = splitShiftHours('2026-10-25', '18:00', '02:00', 'evening')
    const total = r.regular + r.shabbat + r.holiday + r.support
    expect(Number.isFinite(total)).toBe(true)
    expect(total).toBeGreaterThan(0)
  })

  it('terminates for a degenerate zero-length shift on the DST day', () => {
    const r = splitShiftHours('2026-10-25', '20:11', '20:11', 'morning')
    const total = r.regular + r.shabbat + r.holiday + r.support
    expect(Number.isFinite(total)).toBe(true)
  })

  it('terminates for a multi-day span covering the DST transition', () => {
    const r = splitShiftHours('2026-10-24', '22:00', '21:00', 'evening')
    expect(Number.isFinite(r.regular + r.shabbat)).toBe(true)
  })
})
