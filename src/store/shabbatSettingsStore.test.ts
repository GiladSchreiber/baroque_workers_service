import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ShabbatSetting } from '../types'

// The store imports the repositories barrel, which instantiates localStorage-backed
// mock repos. We only exercise getTimesForDate here, so stub the repo out.
vi.mock('../repositories', () => ({
  shabbatSettingsRepo: {
    getAll: async () => [],
    upsert: async () => {},
  },
}))

const { useShabbatSettingsStore } = await import('./shabbatSettingsStore')

function mins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function setSettings(settings: ShabbatSetting[]) {
  useShabbatSettingsStore.setState({ settings })
}

describe('shabbatSettingsStore.getTimesForDate', () => {
  beforeEach(() => setSettings([]))

  it('uses the exact month when it is set', () => {
    setSettings([{ month: '2026-06', fridayStart: '15:30', saturdayEnd: '19:00' }])
    const t = useShabbatSettingsStore.getState().getTimesForDate('2026-06-20')
    expect(t.fridayStartMins).toBe(mins('15:30'))
    expect(t.saturdayEndMins).toBe(mins('19:00'))
  })

  it('carries forward the most recent prior month when current is unset', () => {
    setSettings([{ month: '2026-06', fridayStart: '15:30', saturdayEnd: '19:00' }])
    const t = useShabbatSettingsStore.getState().getTimesForDate('2026-07-11')
    expect(t.fridayStartMins).toBe(mins('15:30'))
    expect(t.saturdayEndMins).toBe(mins('19:00'))
  })

  it('picks the latest prior month among several', () => {
    setSettings([
      { month: '2026-04', fridayStart: '14:00', saturdayEnd: '20:00' },
      { month: '2026-06', fridayStart: '15:30', saturdayEnd: '19:00' },
      { month: '2026-05', fridayStart: '14:30', saturdayEnd: '19:30' },
    ])
    const t = useShabbatSettingsStore.getState().getTimesForDate('2026-09-05')
    expect(t.fridayStartMins).toBe(mins('15:30'))
    expect(t.saturdayEndMins).toBe(mins('19:00'))
  })

  it('does not use a future month for an earlier date', () => {
    setSettings([{ month: '2026-08', fridayStart: '15:30', saturdayEnd: '19:00' }])
    const t = useShabbatSettingsStore.getState().getTimesForDate('2026-07-11')
    // no prior setting → falls back to the hardcoded default
    expect(t.fridayStartMins).toBe(mins('14:00'))
    expect(t.saturdayEndMins).toBe(mins('20:00'))
  })

  it('falls back to the default 14:00–20:00 when nothing is set', () => {
    const t = useShabbatSettingsStore.getState().getTimesForDate('2026-06-20')
    expect(t.fridayStartMins).toBe(mins('14:00'))
    expect(t.saturdayEndMins).toBe(mins('20:00'))
  })
})
