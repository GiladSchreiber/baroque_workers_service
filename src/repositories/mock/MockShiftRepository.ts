import type { Shift, CreateShiftInput } from '../../types'
import type { ShiftRepository } from '../interfaces/ShiftRepository'
import { LocalStore } from './LocalStore'

const SEED_VERSION = 'v4-clean'
const SEED_VERSION_KEY = 'baroque_shifts_seed_v'

const SEED: Shift[] = []

function getStore(): LocalStore<Shift> {
  if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
    localStorage.removeItem('shifts')
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
  }
  return new LocalStore<Shift>('shifts', SEED)
}

export class MockShiftRepository implements ShiftRepository {
  private store = getStore()

  async getAll() { return this.store.getAll() }
  async getByEmployee(employeeId: string) {
    return this.store.getAll().filter(s => s.employeeId === employeeId)
  }
  async getByDateRange(start: string, end: string) {
    return this.store.getAll().filter(s => s.date >= start && s.date <= end)
  }
  async create(data: CreateShiftInput) {
    return this.store.create({
      ...data,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    })
  }
  async update(id: string, data: Partial<Shift>) {
    return this.store.update(id, { ...data, updatedAt: new Date().toISOString() })
  }
  async delete(id: string) { this.store.delete(id) }
}
