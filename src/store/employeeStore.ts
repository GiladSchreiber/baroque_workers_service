import { create } from 'zustand'
import type { Employee, CreateEmployeeInput } from '../types'
import { employeeRepo } from '../repositories'

interface EmployeeState {
  employees: Employee[]
  isLoading: boolean
  fetchAll: () => Promise<void>
  addEmployee: (data: CreateEmployeeInput) => Promise<void>
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>
  deactivate: (id: string) => Promise<void>
}

export const useEmployeeStore = create<EmployeeState>((set) => ({
  employees: [],
  isLoading: false,

  fetchAll: async () => {
    set({ isLoading: true })
    const employees = await employeeRepo.getAll()
    set({ employees, isLoading: false })
  },

  addEmployee: async (data) => {
    const employee = await employeeRepo.create(data)
    set(state => ({ employees: [...state.employees, employee] }))
  },

  updateEmployee: async (id, data) => {
    const updated = await employeeRepo.update(id, data)
    set(state => ({
      employees: state.employees.map(e => e.id === id ? updated : e),
    }))
  },

  deactivate: async (id) => {
    await employeeRepo.deactivate(id)
    set(state => ({
      employees: state.employees.map(e => e.id === id ? { ...e, isActive: false } : e),
    }))
  },
}))
