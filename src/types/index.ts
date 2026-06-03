export type Role = 'employee' | 'duty' | 'manager' | 'scheduler' | 'kitchen'
export type ShiftType = 'regular' | 'morning' | 'afternoon' | 'evening' | 'kitchen' | 'support' | 'manager' | 'overlap' | 'general' | 'global' | 'taxi' | 'cashier' | 'nesia'
export type BlockType = 'morning' | 'afternoon' | 'evening'
export type HolidayRate = '150' | '200'

export interface HolidaySetting {
  id: string
  startDate: string  // YYYY-MM-DD
  startTime: string  // HH:mm
  endDate: string    // YYYY-MM-DD
  endTime: string    // HH:mm
  rate: HolidayRate
}

export type CreateHolidaySettingInput = Omit<HolidaySetting, 'id'>

export interface Employee {
  id: string
  name: string
  email: string
  passwordHash: string
  roles: Role[]
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
// Convenience helpers
export function hasRole(user: Pick<Employee, 'roles'>, role: Role): boolean {
  return user.roles.includes(role)
}
export function hasAnyRole(user: Pick<Employee, 'roles'>, roles: Role[]): boolean {
  return roles.some(r => user.roles.includes(r))
}
export function getPrimaryPath(roles: Role[]): string {
  if (roles.includes('manager'))   return '/manager/dashboard'
  if (roles.includes('scheduler')) return '/scheduler/scheduling'
  if (roles.includes('kitchen'))   return '/kitchen/report'
  return '/employee/report'
}
export type CreateShiftInput = Omit<Shift, 'id' | 'submittedAt' | 'updatedAt'>

export type CreateClosureInput = Omit<ShiftClosure, 'id' | 'submittedAt'>
