import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useHolidaySettingsStore } from '../../store/holidaySettingsStore'
import type { HolidaySetting, CreateHolidaySettingInput, HolidayRate } from '../../types'
import styles from './HolidaySettingsModal.module.scss'

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

function formatDateHe(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

const MONTH_OPTIONS = buildMonthOptions()

const EMPTY_FORM: CreateHolidaySettingInput = {
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  rate: '150',
}

export function HolidaySettingsModal({ isOpen, initialMonth, onClose }: Props) {
  const { periods, create, update, remove } = useHolidaySettingsStore()
  const [month, setMonth] = useState(initialMonth)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateHolidaySettingInput>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setMonth(initialMonth)
    resetForm()
  }, [isOpen, initialMonth])

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  function startEdit(p: HolidaySetting) {
    setForm({ startDate: p.startDate, startTime: p.startTime, endDate: p.endDate, endTime: p.endTime, rate: p.rate })
    setEditingId(p.id)
    setShowForm(true)
    setError('')
  }

  function startAdd() {
    setForm({ ...EMPTY_FORM, startDate: `${month}-01`, endDate: `${month}-01` })
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  function validate(): string {
    if (!form.startDate) return 'תאריך התחלה נדרש'
    if (!form.startTime) return 'שעת התחלה נדרשת'
    if (!form.endDate)   return 'תאריך סיום נדרש'
    if (!form.endTime)   return 'שעת סיום נדרשת'
    const start = new Date(`${form.startDate}T${form.startTime}:00`).getTime()
    const end   = new Date(`${form.endDate}T${form.endTime}:00`).getTime()
    if (end <= start) return 'שעת הסיום חייבת להיות אחרי שעת ההתחלה'
    return ''
  }

  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setIsLoading(true)
    try {
      if (editingId) {
        await update(editingId, form)
      } else {
        await create(form)
      }
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setIsLoading(true)
    try {
      await remove(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה במחיקה')
    } finally {
      setIsLoading(false)
    }
  }

  const monthPeriods = periods.filter(p =>
    p.startDate.startsWith(month) || p.endDate.startsWith(month)
  )

  return (
    <Modal isOpen={isOpen} title="שעות חג" onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.monthRow}>
          <select
            className={styles.monthSelect}
            value={month}
            onChange={e => { setMonth(e.target.value); resetForm() }}
          >
            {MONTH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {monthPeriods.length > 0 && (
          <ul className={styles.list}>
            {monthPeriods.map(p => (
              <li key={p.id} className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemDates}>
                    {formatDateHe(p.startDate)} {p.startTime} — {formatDateHe(p.endDate)} {p.endTime}
                  </span>
                  <span className={`${styles.rateBadge} ${p.rate === '200' ? styles.rate200 : styles.rate150}`}>
                    {p.rate}%
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => startEdit(p)}
                    aria-label="ערוך"
                  >
                    ✎
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(p.id)}
                    disabled={isLoading}
                    aria-label="מחק"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {monthPeriods.length === 0 && !showForm && (
          <p className={styles.empty}>אין חגים מוגדרים לחודש זה</p>
        )}

        {showForm ? (
          <div className={styles.form}>
            <p className={styles.formTitle}>{editingId ? 'עריכת חג' : 'הוספת חג'}</p>
            <div className={styles.dateTimeRow}>
              <Input
                label="תאריך התחלה"
                id="hol-start-date"
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                label="שעת התחלה"
                id="hol-start-time"
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div className={styles.dateTimeRow}>
              <Input
                label="תאריך סיום"
                id="hol-end-date"
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              />
              <Input
                label="שעת סיום"
                id="hol-end-time"
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <div className={styles.rateRow}>
              <span className={styles.rateLabel}>אחוז תשלום</span>
              <div className={styles.rateOptions}>
                {(['150', '200'] as HolidayRate[]).map(r => (
                  <label key={r} className={`${styles.rateOption} ${form.rate === r ? styles.rateOptionSelected : ''}`}>
                    <input
                      type="radio"
                      name="holiday-rate"
                      value={r}
                      checked={form.rate === r}
                      onChange={() => setForm(f => ({ ...f, rate: r }))}
                    />
                    {r}%
                  </label>
                ))}
              </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.formActions}>
              <Button onClick={handleSave} isLoading={isLoading}>שמור</Button>
              <Button variant="ghost" onClick={resetForm}>ביטול</Button>
            </div>
          </div>
        ) : (
          <button className={styles.addBtn} onClick={startAdd}>
            + הוסף חג
          </button>
        )}
      </div>
    </Modal>
  )
}
