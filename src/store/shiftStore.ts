import { create } from 'zustand'
import type { Shift, CreateShiftInput } from '../types'
import { shiftRepo } from '../repositories'

interface ShiftState {
  shifts: Shift[]
  isLoading: boolean
  fetchAll: () => Promise<void>
  fetchByEmployee: (employeeId: string) => Promise<void>
  addShift: (data: CreateShiftInput) => Promise<void>
  updateShift: (id: string, data: Partial<Shift>) => Promise<void>
  deleteShift: (id: string) => Promise<void>
}

export const useShiftStore = create<ShiftState>((set) => ({
  shifts: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true })
    const shifts = await shiftRepo.getAll()
    set({ shifts, isLoading: false })
  },

  fetchByEmployee: async (employeeId) => {
    set({ isLoading: true })
    const shifts = await shiftRepo.getByEmployee(employeeId)
    set({ shifts, isLoading: false })
  },

  addShift: async (data) => {
    const shift = await shiftRepo.create(data)
    set(state => ({ shifts: [...state.shifts, shift] }))
  },

  updateShift: async (id, data) => {
    const updated = await shiftRepo.update(id, data)
    set(state => ({
      shifts: state.shifts.map(s => s.id === id ? updated : s),
    }))
  },

  deleteShift: async (id) => {
    await shiftRepo.delete(id)
    set(state => ({ shifts: state.shifts.filter(s => s.id !== id) }))
  },
}))
