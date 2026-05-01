import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { useShabbatSettingsStore } from '../../store/shabbatSettingsStore'
import styles from './ShabbatSettingsModal.module.scss'

interface Props {
  isOpen: boolean
  initialMonth: string // 'YYYY-MM'
  onClose: () => void
}

function buildMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export function ShabbatSettingsModal({ isOpen, initialMonth, onClose }: Props) {
  const { settings, upsert } = useShabbatSettingsStore()
  const [month, setMonth] = useState(initialMonth)
  const [fridayStart, setFridayStart] = useState('14:00')
  const [saturdayEnd, setSaturdayEnd] = useState('20:00')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setMonth(initialMonth)
  }, [isOpen, initialMonth])

  useEffect(() => {
    const existing = settings.find(s => s.month === month)
    setFridayStart(existing?.fridayStart ?? '14:00')
    setSaturdayEnd(existing?.saturdayEnd ?? '20:00')
  }, [month, settings])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await upsert({ month, fridayStart, saturdayEnd })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} title="עריכת שעות שבת" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Select
          label="חודש"
          id="shabbat-month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          options={buildMonthOptions()}
        />
        <div className={styles.timeRow}>
          <Input
            label="שישי — כניסת שבת"
            id="friday-start"
            type="time"
            value={fridayStart}
            onChange={e => setFridayStart(e.target.value)}
          />
          <Input
            label="שבת — יציאת שבת"
            id="saturday-end"
            type="time"
            value={saturdayEnd}
            onChange={e => setSaturdayEnd(e.target.value)}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <Button type="submit" isLoading={isLoading}>שמור</Button>
          <Button type="button" variant="ghost" onClick={onClose}>ביטול</Button>
        </div>
      </form>
    </Modal>
  )
}
