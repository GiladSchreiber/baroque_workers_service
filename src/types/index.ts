export type Role = 'employee' | 'manager'
export type ShiftType = 'regular' | 'morning' | 'afternoon' | 'evening' | 'kitchen' | 'support' | 'manager' | 'overlap' | 'general'
export type BlockType = 'morning' | 'afternoon' | 'evening'

export interface Employee {
  id: string
  name: string
  email: string
  passwordHash: string
  role: Role
  hourlyWage: number
  isActive: boolean
  createdAt: string
  idNumber?: string
  phone?: string
  bankNumber?: string
  bankAccount?: string
  bankBranch?: string
}

export interface Shift {
  id: string
  employeeId: string
  date: string
  type: ShiftType
  startTime: string
  endTime: string
  note?: string
  // Financial data — filled for regular shifts only
  revenue?: number
  cash?: number
  credit?: number
  tips?: number
  submittedAt: string
  updatedAt?: string
}

export interface ShiftClosure {
  id: string
  date: string
  block: BlockType
  revenue: number
  cash: number
  credit: number
  tips: number
  notes?: string
  submittedById: string
  submittedAt: string
}

export type CreateEmployeeInput = Omit<Employee, 'id' | 'createdAt'>
export type CreateShiftInput = Omit<Shift, 'id' | 'submittedAt' | 'updatedAt'>
export type CreateClosureInput = Omit<ShiftClosure, 'id' | 'submittedAt'>
