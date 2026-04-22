import { useState } from 'react'
import type { CreateShiftInput, ShiftType } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { todayString } from '../../lib/utils'
import styles from './ShiftForm.module.scss'

const SHIFT_TYPE_OPTIONS = [
  { value: 'morning', label: 'בוקר' },
  { value: 'afternoon', label: 'צהריים' },
  { value: 'evening', label: 'ערב' },
  { value: 'kitchen', label: 'מטבח' },
  { value: 'support', label: 'אחמ"ש' },
  { value: 'manager', label: 'פיק' },
  { value: 'overlap', label: 'חפיפה' },
  { value: 'general', label: 'כללי' },
]

interface ShiftFormProps {
  employeeId: string
  initialValues?: Partial<CreateShiftInput>
  onSubmit: (data: CreateShiftInput) => Promise<void>
  submitLabel?: string
}

interface FormErrors {
  date?: string
  type?: string
  startTime?: string
  endTime?: string
}

export function ShiftForm({ employeeId, initialValues, onSubmit, submitLabel = 'שלח דיווח' }: ShiftFormProps) {
  const [date, setDate] = useState(initialValues?.date ?? todayString())
  const [type, setType] = useState<ShiftType>(initialValues?.type ?? 'morning')
  const [startTime, setStartTime] = useState(initialValues?.startTime ?? '')
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? '')
  const [revenue, setRevenue] = useState(initialValues?.revenue?.toString() ?? '')
  const [cash, setCash] = useState(initialValues?.cash?.toString() ?? '')
  const [credit, setCredit] = useState(initialValues?.credit?.toString() ?? '')
  const [tips, setTips] = useState(initialValues?.tips?.toString() ?? '')
  const [financialOpen, setFinancialOpen] = useState(
    Boolean(initialValues?.revenue || initialValues?.cash || initialValues?.credit || initialValues?.tips)
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function validate(): boolean {
    const next: FormErrors = {}
    if (!date) next.date = 'תאריך נדרש'
    if (!type) next.type = 'סוג משמרת נדרש'
    if (!startTime) next.startTime = 'שעת התחלה נדרשת'
    if (!endTime) next.endTime = 'שעת סיום נדרשת'
    if (startTime && endTime && endTime <= startTime) {
      next.endTime = 'שעת סיום חייבת להיות אחרי שעת ההתחלה'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitError('')
    setIsLoading(true)
    try {
      await onSubmit({
        employeeId, date, type, startTime, endTime,
        revenue: revenue !== '' ? Number(revenue) : undefined,
        cash: cash !== '' ? Number(cash) : undefined,
        credit: credit !== '' ? Number(credit) : undefined,
        tips: tips !== '' ? Number(tips) : undefined,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'שגיאה בשליחה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="תאריך"
        id="date"
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        error={errors.date}
        max={todayString()}
      />
      <Select
        label="סוג משמרת"
        id="type"
        value={type}
        onChange={e => setType(e.target.value as ShiftType)}
        options={SHIFT_TYPE_OPTIONS}
        error={errors.type}
      />
      <div className={styles.timeRow}>
        <Input
          label="שעת התחלה"
          id="startTime"
          type="time"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          error={errors.startTime}
        />
        <Input
          label="שעת סיום"
          id="endTime"
          type="time"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          error={errors.endTime}
        />
      </div>

      <div className={styles.financialSection}>
        <button
          type="button"
          className={styles.financialToggle}
          onClick={() => setFinancialOpen(o => !o)}
        >
          <span>נתוני קופה</span>
          <span className={`${styles.chevron} ${financialOpen ? styles.chevronOpen : ''}`}>›</span>
        </button>
        {financialOpen && (
          <div className={styles.financialGrid}>
            <Input
              label="X (סך הכל)"
              id="revenue"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              value={revenue}
              onChange={e => setRevenue(e.target.value)}
            />
            <Input
              label="אשראי"
              id="credit"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              value={credit}
              onChange={e => setCredit(e.target.value)}
            />
            <Input
              label="מזומן"
              id="cash"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              value={cash}
              onChange={e => setCash(e.target.value)}
            />
            <Input
              label="טיפ"
              id="tips"
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="0"
              value={tips}
              onChange={e => setTips(e.target.value)}
            />
          </div>
        )}
      </div>
      {submitError && <p className={styles.submitError}>{submitError}</p>}
      <Button type="submit" fullWidth isLoading={isLoading}>
        {submitLabel}
      </Button>
    </form>
  )
}
