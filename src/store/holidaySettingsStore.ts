import { create } from 'zustand'
import type { HolidaySetting, CreateHolidaySettingInput } from '../types'
import { holidaySettingsRepo } from '../repositories'

interface HolidaySettingsState {
  periods: HolidaySetting[]
  isLoading: boolean
  fetchAll: () => Promise<void>
  create: (input: CreateHolidaySettingInput) => Promise<void>
  update: (id: string, input: CreateHolidaySettingInput) => Promise<void>
  remove: (id: string) => Promise<void>
  getPeriodsForMonth: (month: string) => HolidaySetting[]
}

export const useHolidaySettingsStore = create<HolidaySettingsState>((set, get) => ({
  periods: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true })
    try {
      const periods = await holidaySettingsRepo.getAll()
      set({ periods })
    } finally {
      set({ isLoading: false })
    }
  },

  create: async (input) => {
    const created = await holidaySettingsRepo.create(input)
    set(state => ({ periods: [...state.periods, created].sort((a, b) =>
      a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime)
    )}))
  },

  update: async (id, input) => {
    const updated = await holidaySettingsRepo.update(id, input)
    set(state => ({
      periods: state.periods.map(p => p.id === id ? updated : p)
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime))
    }))
  },

  remove: async (id) => {
    await holidaySettingsRepo.delete(id)
    set(state => ({ periods: state.periods.filter(p => p.id !== id) }))
  },

  // Convenience: return only the periods relevant to a given YYYY-MM month
  // (exposed as a plain function so consumers can call it without re-render churn)
  getPeriodsForMonth: (month: string) =>
    get().periods.filter(p => p.startDate.startsWith(month) || p.endDate.startsWith(month)),
}))
