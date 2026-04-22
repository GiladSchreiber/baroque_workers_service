import type { MonthlyPoint, MonthlySummaryRepository } from '../interfaces/MonthlySummaryRepository'
import { supabase } from '../../lib/supabase'

interface SummaryRow {
  month: string
  daily_average: number
  monthly_total: number
  is_historical: boolean
}

function toPoint(row: SummaryRow): MonthlyPoint {
  return {
    month: row.month,
    average: row.daily_average,
    sum: row.monthly_total,
    isHistorical: row.is_historical,
  }
}

export class SupabaseMonthlySummaryRepository implements MonthlySummaryRepository {
  async getAll(): Promise<MonthlyPoint[]> {
    const { data, error } = await supabase
      .from('monthly_summaries')
      .select('*')
      .order('month', { ascending: true })
    if (error) throw new Error(error.message)
    return (data as SummaryRow[]).map(toPoint)
  }

  async upsert(month: string, average: number, sum: number, isHistorical: boolean): Promise<void> {
    const { error } = await supabase
      .from('monthly_summaries')
      .upsert({ month, daily_average: average, monthly_total: sum, is_historical: isHistorical })
    if (error) throw new Error(error.message)
  }
}
