import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee } from '../types'
import { employeeRepo } from '../repositories'
import { hashPassword } from '../lib/utils'

export interface RegisterInput {
  name: string
  email: string
  idNumber?: string
  phone?: string
  bankNumber?: string
  bankAccount?: string
  bankBranch?: string
}

interface AuthState {
  currentUser: Employee | null
  login: (email: string, password?: string) => Promise<void>
  logout: () => void
  register: (data: RegisterInput) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,

      login: async (email, password) => {
        const employee = await employeeRepo.getByEmail(email)
        if (!employee) throw new Error('משתמש לא נמצא')
        if (!employee.isActive) throw new Error('החשבון אינו פעיל')
        if (employee.role === 'manager') {
          if (!password) throw new Error('NEED_PASSWORD')
          const hashed = await hashPassword(password)
          if (hashed !== employee.passwordHash) throw new Error('סיסמה שגויה')
        }
        set({ currentUser: employee })
      },

      logout: () => set({ currentUser: null }),

      register: async ({ name, email, idNumber, phone, bankNumber, bankAccount, bankBranch }) => {
        const existing = await employeeRepo.getByEmail(email)
        if (existing) throw new Error('האימייל כבר בשימוש')
        const employee = await employeeRepo.create({
          name,
          email,
          passwordHash: '',
          role: 'employee',
          hourlyWage: 45,
          isActive: true,
          idNumber,
          phone,
          bankNumber,
          bankAccount,
          bankBranch,
        })
        set({ currentUser: employee })
      },
    }),
    { name: 'auth' }
  )
)
