import type { HolidaySetting, CreateHolidaySettingInput } from '../../types'

export class MockHolidaySettingsRepository {
  private items: HolidaySetting[] = []

  async getAll(): Promise<HolidaySetting[]> {
    return [...this.items]
  }

  async create(input: CreateHolidaySettingInput): Promise<HolidaySetting> {
    const item: HolidaySetting = { id: crypto.randomUUID(), ...input }
    this.items.push(item)
    return item
  }

  async update(id: string, input: CreateHolidaySettingInput): Promise<HolidaySetting> {
    const idx = this.items.findIndex(i => i.id === id)
    if (idx === -1) throw new Error('Holiday setting not found')
    this.items[idx] = { id, ...input }
    return this.items[idx]
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(i => i.id !== id)
  }
}
