import type { Shift, CreateShiftInput } from '../../types'

export interface ShiftRepository {
  getAll(): Promise<Shift[]>
  getByEmployee(employeeId: string): Promise<Shift[]>
  getByDateRange(start: string, end: string): Promise<Shift[]>
  create(data: CreateShiftInput): Promise<Shift>
  update(id: string, data: Partial<Shift>): Promise<Shift>
  delete(id: string): Promise<void>
}
