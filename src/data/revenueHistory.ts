export interface RevenuePoint {
  month: string  // YYYY-MM
  average: number
  sum: number
}

export const REVENUE_HISTORY: RevenuePoint[] = [
  { month: '2023-04', average: 2198, sum: 48363 },
  { month: '2023-05', average: 2927, sum: 90761 },
  { month: '2023-06', average: 3048, sum: 91469 },
  { month: '2023-07', average: 3065, sum: 95040 },
  { month: '2023-08', average: 2823, sum: 87540 },
  { month: '2023-09', average: 2770, sum: 83112 },
  { month: '2023-10', average: 2295, sum: 68861 },
  { month: '2023-11', average: 3592, sum: 107768 },
  { month: '2023-12', average: 4527, sum: 140340 },
  { month: '2024-01', average: 4453, sum: 138050 },
  { month: '2024-02', average: 4901, sum: 142136 },
  { month: '2024-03', average: 4924, sum: 152652 },
  { month: '2024-04', average: 5633, sum: 168993 },
  { month: '2024-05', average: 5771, sum: 178919 },
  { month: '2024-06', average: 5826, sum: 174783 },
  { month: '2024-07', average: 5454, sum: 169088 },
  { month: '2024-08', average: 5525, sum: 171305 },
  { month: '2024-09', average: 4925, sum: 147766 },
  { month: '2024-10', average: 5341, sum: 165586 },
  { month: '2024-11', average: 5878, sum: 176362 },
  { month: '2024-12', average: 5762, sum: 178625 },
  { month: '2025-01', average: 6068, sum: 188122 },
  { month: '2025-02', average: 5139, sum: 143917 },
  { month: '2025-03', average: 5325, sum: 165086 },
  { month: '2025-04', average: 6228, sum: 186853 },
  { month: '2025-05', average: 6945, sum: 215310 },
  { month: '2025-06', average: 7509, sum: 225278 },
  { month: '2025-07', average: 7052, sum: 218615 },
  { month: '2025-08', average: 7215, sum: 223655 },
  { month: '2025-09', average: 6825, sum: 204757 },
  { month: '2025-10', average: 8111, sum: 251468 },
  { month: '2025-11', average: 8200, sum: 246028 },
  { month: '2025-12', average: 7866, sum: 243855 },
  { month: '2026-01', average: 7763, sum: 240675 },
  { month: '2026-02', average: 7322, sum: 205026 },
  { month: '2026-03', average: 7463, sum: 231373 },
]

export function getYearlyTotals(): { year: string; sum: number; average: number }[] {
  const byYear: Record<string, { sum: number; count: number }> = {}
  for (const p of REVENUE_HISTORY) {
    const year = p.month.slice(0, 4)
    if (!byYear[year]) byYear[year] = { sum: 0, count: 0 }
    byYear[year].sum += p.sum
    byYear[year].count += 1
  }
  return Object.entries(byYear).map(([year, { sum, count }]) => ({
    year,
    sum,
    average: Math.round(sum / count),
  }))
}

export function getPointForMonth(ym: string): RevenuePoint | undefined {
  return REVENUE_HISTORY.find(p => p.month === ym)
}

export function getPointForSameMonthLastYear(ym: string): RevenuePoint | undefined {
  const [y, m] = ym.split('-')
  return REVENUE_HISTORY.find(p => p.month === `${Number(y) - 1}-${m}`)
}
