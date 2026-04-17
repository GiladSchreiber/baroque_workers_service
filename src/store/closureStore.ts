import { create } from 'zustand'
import type { ShiftClosure, CreateClosureInput } from '../types'
import { closureRepo } from '../repositories'

interface ClosureState {
  closures: ShiftClosure[]
  isLoading: boolean
  fetchAll: () => Promise<void>
  fetchByDateRange: (start: string, end: string) => Promise<void>
  addClosure: (data: CreateClosureInput) => Promise<void>
}

export const useClosureStore = create<ClosureState>((set) => ({
  closures: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true })
    const closures = await closureRepo.getAll()
    set({ closures, isLoading: false })
  },

  fetchByDateRange: async (start, end) => {
    set({ isLoading: true })
    const closures = await closureRepo.getByDateRange(start, end)
    set({ closures, isLoading: false })
  },

  addClosure: async (data) => {
    const closure = await closureRepo.create(data)
    set(state => ({ closures: [...state.closures, closure] }))
  },
}))
