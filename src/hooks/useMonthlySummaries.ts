import { useEffect, useState } from 'react'
import { summaryRepo } from '../repositories'
import type { MonthlyPoint } from '../repositories/interfaces/MonthlySummaryRepository'

export function useMonthlySummaries() {
  const [summaries, setSummaries] = useState<MonthlyPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    summaryRepo.getAll()
      .then(setSummaries)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return { summaries, isLoading }
}
