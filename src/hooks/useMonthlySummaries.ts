import { useCallback, useEffect, useState } from 'react'
import { summaryRepo } from '../repositories'
import type { MonthlyPoint } from '../repositories/interfaces/MonthlySummaryRepository'

export function useMonthlySummaries() {
  const [summaries, setSummaries] = useState<MonthlyPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      setSummaries(await summaryRepo.getAll())
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { summaries, isLoading, refresh: load }
}
