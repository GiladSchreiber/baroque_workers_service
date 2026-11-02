import { create } from 'zustand'
import { currentMonthStr } from '../lib/utils'

interface MonthState {
  /** The month currently being viewed, shared across all month-filtered pages.
   *  'YYYY-MM', or '' for the "all time" option where a page supports it. */
  activeMonth: string
  setActiveMonth: (month: string) => void
}

/**
 * Global "active month" so the selected month persists when navigating between
 * tabs (salaries / hours / income / my-shifts) instead of resetting to the
 * current month each time. Kept in memory for the session.
 */
export const useMonthStore = create<MonthState>((set) => ({
  activeMonth: currentMonthStr(),
  setActiveMonth: (activeMonth) => set({ activeMonth }),
}))
