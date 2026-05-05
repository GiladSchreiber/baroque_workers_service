export type Role = 'employee' | 'manager' | 'scheduler'
export type ShiftType = 'regular' | 'morning' | 'afternoon' | 'evening' | 'kitchen' | 'support' | 'manager' | 'overlap' | 'general' | 'global' | 'taxi' | 'cashier'
export type BlockType = 'morning' | 'afternoon' | 'evening'
/** Override the automatic weekday/Shabbat detection for a shift day. */
export type DayType = 'auto' | 'shabbat' | 'holiday'

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
  // Global (flat payment) — used when type === 'global'
  amount?: number
  repeatMonthly?: boolean
  /** Overrides automatic weekday detection for pay-rate purposes. */
  dayType?: DayType
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

export interface ShabbatSetting {
  month: string       // 'YYYY-MM'
  fridayStart: string // 'HH:mm' — when Shabbat begins on Friday
  saturdayEnd: string // 'HH:mm' — when Shabbat ends on Saturday
}

export type CreateEmployeeInput = Omit<Employee, 'id' | 'createdAt'>
export type CreateShiftInput = Omit<Shift, 'id' | 'submittedAt' | 'updatedAt'>
export type CreateClosureInput = Omit<ShiftClosure, 'id' | 'submittedAt'>
