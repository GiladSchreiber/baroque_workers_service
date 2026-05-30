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
  refreshCurrentUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,

      login: async (email, password) => {
        const employee = await employeeRepo.getByEmail(email)
        if (!employee) throw new Error('משתמש לא נמצא')
        if (!employee.isActive) throw new Error('החשבון אינו פעיל')
        if (employee.roles.includes('manager')) {
          if (!password) throw new Error('NEED_PASSWORD')
          const hashed = await hashPassword(password)
          if (hashed !== employee.passwordHash) throw new Error('סיסמה שגויה')
        }
        set({ currentUser: employee })
      },

      logout: () => set({ currentUser: null }),

      refreshCurrentUser: async () => {
        const current = get().currentUser
        if (!current) return
        const fresh = await employeeRepo.getByEmail(current.email)
        if (fresh) set({ currentUser: fresh })
      },

      register: async ({ name, email, idNumber, phone, bankNumber, bankAccount, bankBranch }) => {
        const existing = await employeeRepo.getByEmail(email)
        if (existing) throw new Error('האימייל כבר בשימוש')
        const employee = await employeeRepo.create({
          name,
          email,
          passwordHash: '',
          roles: ['employee'],
          hourlyWage: 40,
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
    {
      name: 'auth',
      version: 2,
      migrate: (persisted: any, version: number) => {
        // v1 → v2: role (string) became roles (string[])
        if (version < 2 && persisted?.currentUser) {
          const u = persisted.currentUser
          if (!u.roles) {
            u.roles = u.role ? [u.role] : ['employee']
          }
          delete u.role
        }
        return persisted
      },
    }
  )
)
