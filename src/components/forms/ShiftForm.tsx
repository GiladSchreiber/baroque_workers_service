import { useState } from 'react'
import type { CreateShiftInput, ShiftType, DayType } from '../../types'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { todayString, currentTimeString } from '../../lib/utils'
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
  { value: 'global',  label: 'גלובלי' },
  { value: 'taxi',    label: 'מוניות' },
  { value: 'cashier', label: 'נתוני קופה בלבד' },
]

interface ShiftFormProps {
  employeeId: string
  initialValues?: Partial<CreateShiftInput>
  onSubmit: (data: CreateShiftInput) => Promise<void>
  submitLabel?: string
  /** When true, 'global' type option appears first and is the default */
  managerMode?: boolean
  isEdit?: boolean
}

interface FormErrors {
  date?: string
  type?: string
  startTime?: string
  endTime?: string
  amount?: string
}

export function ShiftForm({ employeeId, initialValues, onSubmit, submitLabel = 'שלח דיווח', managerMode = false, isEdit = false }: ShiftFormProps) {
  const [date, setDate] = useState(initialValues?.date ?? todayString())
  const [type, setType] = useState<ShiftType>(initialValues?.type ?? (managerMode ? 'global' : 'morning'))
  const [startTime, setStartTime] = useState(initialValues?.startTime ?? '')
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? currentTimeString())
  const [amount, setAmount] = useState(initialValues?.amount?.toString() ?? '')
  const [revenue, setRevenue] = useState(initialValues?.revenue?.toString() ?? '')
  const [cash, setCash] = useState(initialValues?.cash?.toString() ?? '')
  const [credit, setCredit] = useState(initialValues?.credit?.toString() ?? '')
  const [tips, setTips] = useState(initialValues?.tips?.toString() ?? '')
  const [dayType, setDayType] = useState<DayType>(initialValues?.dayType ?? 'auto')
  const [repeatMonthly, setRepeatMonthly] = useState(initialValues?.repeatMonthly ?? false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const isGlobal = type === 'global' || type === 'taxi'
  const isCashier = type === 'cashier'

  function validate(): boolean {
    const next: FormErrors = {}
    if (!date) next.date = 'תאריך נדרש'
    if (!type) next.type = 'סוג משמרת נדרש'
    if (isGlobal) {
      if (!amount || Number(amount) <= 0) next.amount = 'סכום נדרש'
    } else if (!isCashier) {
      if (!startTime) next.startTime = 'שעת התחלה נדרשת'
      if (!endTime) next.endTime = 'שעת סיום נדרשת'
      if (startTime && endTime && endTime <= startTime) {
        next.endTime = 'שעת סיום חייבת להיות אחרי שעת ההתחלה'
      }
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
        employeeId, date, type,
        startTime: (isGlobal || isCashier) ? '00:00' : startTime,
        endTime:   (isGlobal || isCashier) ? '00:00' : endTime,
        amount:  isGlobal && amount !== '' ? Number(amount) : undefined,
        repeatMonthly: type === 'global' && !isEdit ? repeatMonthly : undefined,
        dayType: (!isGlobal && !isCashier) ? dayType : undefined,
        revenue: isCashier && revenue !== '' ? Number(revenue) : undefined,
        cash:    isCashier && cash    !== '' ? Number(cash)    : undefined,
        credit:  isCashier && credit  !== '' ? Number(credit)  : undefined,
        tips:    isCashier && tips    !== '' ? Number(tips)    : undefined,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'שגיאה בשליחה')
    } finally {
      setIsLoading(false)
    }
  }

  const typeOptions = managerMode
    ? SHIFT_TYPE_OPTIONS
    : SHIFT_TYPE_OPTIONS.filter(o => o.value !== 'global')

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
        options={typeOptions}
        error={errors.type}
      />

      {isGlobal && (
        <>
          <Input
            label="סכום (₪)"
            id="amount"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            error={errors.amount}
          />
          {!isEdit && type === 'global' && (
            <label className={styles.repeatRow}>
              <input
                type="checkbox"
                checked={repeatMonthly}
                onChange={e => setRepeatMonthly(e.target.checked)}
                className={styles.repeatCheckbox}
              />
              <span className={styles.repeatLabel}>חזור כל חודש</span>
            </label>
          )}
        </>
      )}

      {isCashier && (
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

      {!isGlobal && !isCashier && (
        <>
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

          {managerMode && (
            <div className={styles.dayTypeRow}>
              <label className={styles.dayTypeCheck}>
                <input
                  type="checkbox"
                  checked={dayType === 'shabbat'}
                  onChange={e => setDayType(e.target.checked ? 'shabbat' : 'auto')}
                />
                <span>חג (150%)</span>
              </label>
              <label className={styles.dayTypeCheck}>
                <input
                  type="checkbox"
                  checked={dayType === 'holiday'}
                  onChange={e => setDayType(e.target.checked ? 'holiday' : 'auto')}
                />
                <span>חג מיוחד (200%)</span>
              </label>
            </div>
          )}
        </>
      )}

      {submitError && <p className={styles.submitError}>{submitError}</p>}
      <Button type="submit" fullWidth isLoading={isLoading}>
        {submitLabel}
      </Button>
    </form>
  )
}
