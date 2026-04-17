import type { ShiftClosure, CreateClosureInput } from '../../types'
import type { ClosureRepository } from '../interfaces/ClosureRepository'
import { LocalStore } from './LocalStore'

export class MockClosureRepository implements ClosureRepository {
  private store = new LocalStore<ShiftClosure>('closures', [])

  async getAll() { return this.store.getAll() }
  async getByDateRange(start: string, end: string) {
    return this.store.getAll().filter(c => c.date >= start && c.date <= end)
  }
  async create(data: CreateClosureInput) {
    return this.store.create({
      ...data,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    })
  }
}
