import type { ShiftClosure, CreateClosureInput } from '../../types'

export interface ClosureRepository {
  getAll(): Promise<ShiftClosure[]>
  getByDateRange(start: string, end: string): Promise<ShiftClosure[]>
  create(data: CreateClosureInput): Promise<ShiftClosure>
}
