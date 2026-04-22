export interface MonthlyPoint {
  month: string       // YYYY-MM
  average: number
  sum: number
  isHistorical: boolean
}

export interface MonthlySummaryRepository {
  getAll(): Promise<MonthlyPoint[]>
  upsert(month: string, average: number, sum: number, isHistorical: boolean): Promise<void>
}
