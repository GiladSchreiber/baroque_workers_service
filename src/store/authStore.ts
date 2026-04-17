import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee } from '../types'
import { employeeRepo } from '../repositories'

interface AuthState {
  currentUser: Employee | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,

      login: async (email, password) => {
        const employee = await employeeRepo.getByEmail(email)
        if (!employee || employee.passwordHash !== password) {
          throw new Error('Invalid email or password')
        }
        if (!employee.isActive) {
          throw new Error('Account is deactivated')
        }
        set({ currentUser: employee })
      },

      logout: () => set({ currentUser: null }),

      register: async (name, email, password) => {
        const existing = await employeeRepo.getByEmail(email)
        if (existing) throw new Error('Email already in use')
        const employee = await employeeRepo.create({
          name,
          email,
          passwordHash: password,
          role: 'employee',
          hourlyWage: 0,
          isActive: true,
        })
        set({ currentUser: employee })
      },
    }),
    { name: 'auth' }
  )
)
