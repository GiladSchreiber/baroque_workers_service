import { create } from 'zustand'
import type { ShabbatSetting } from '../types'
import { shabbatSettingsRepo } from '../repositories'

const DEFAULT_FRIDAY_START = '14:00'
const DEFAULT_SATURDAY_END = '20:00'

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface ShabbatSettingsState {
  settings: ShabbatSetting[]
  isLoading: boolean
  fetchAll: () => Promise<void>
  upsert: (setting: ShabbatSetting) => Promise<void>
  /** Returns precomputed minute values for the month of the given date. */
  getTimesForDate: (date: string) => { fridayStartMins: number; saturdayEndMins: number }
}

export const useShabbatSettingsStore = create<ShabbatSettingsState>((set, get) => ({
  settings: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true })
    try {
      const settings = await shabbatSettingsRepo.getAll()
      set({ settings })
    } finally {
      set({ isLoading: false })
    }
  },

  upsert: async (setting) => {
    await shabbatSettingsRepo.upsert(setting)
    set(state => {
      const rest = state.settings.filter(s => s.month !== setting.month)
      return { settings: [...rest, setting] }
    })
  },

  getTimesForDate: (date) => {
    const month = date.slice(0, 7)
    // Use the exact month if set; otherwise carry forward the most recent
    // prior month the manager filled in. This way, if the owner forgets to set
    // the current month, we reuse the last configured hours instead of the
    // wide 14:00–20:00 default. Months are 'YYYY-MM' so string compare works.
    const setting = get().settings
      .filter(s => s.month <= month)
      .sort((a, b) => b.month.localeCompare(a.month))[0]
    return {
      fridayStartMins: timeToMins(setting?.fridayStart ?? DEFAULT_FRIDAY_START),
      saturdayEndMins: timeToMins(setting?.saturdayEnd ?? DEFAULT_SATURDAY_END),
    }
  },
}))
