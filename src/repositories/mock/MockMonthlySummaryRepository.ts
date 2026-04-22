import type { MonthlyPoint, MonthlySummaryRepository } from '../interfaces/MonthlySummaryRepository'
import { REVENUE_HISTORY } from '../../data/revenueHistory'

export class MockMonthlySummaryRepository implements MonthlySummaryRepository {
  private overrides: Map<string, MonthlyPoint> = new Map()

  async getAll(): Promise<MonthlyPoint[]> {
    const base: MonthlyPoint[] = REVENUE_HISTORY.map(p => ({
      month: p.month,
      average: p.average,
      sum: p.sum,
      isHistorical: true,
    }))
    // Merge any in-session upserts on top
    for (const [month, point] of this.overrides) {
      const idx = base.findIndex(p => p.month === month)
      if (idx >= 0) base[idx] = point
      else base.push(point)
    }
    return base.sort((a, b) => a.month.localeCompare(b.month))
  }

  async upsert(month: string, average: number, sum: number, isHistorical: boolean): Promise<void> {
    this.overrides.set(month, { month, average, sum, isHistorical })
  }
}
