import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useInventoryStore, todayStr } from '../../store/inventoryStore'
import { PageHeader } from '../../components/layout/PageHeader'
import type { InventoryStatus } from '../../types/inventory'
import styles from './FillInventoryPage.module.scss'

// ── Sub-nav (shown only for kitchen role) ────────────────────────────────────
export function InventorySubNav({ active }: { active: 'fill' | 'define' | 'orders' }) {
  const navigate = useNavigate()
  return (
    <div className={styles.subNav}>
      <button
        className={[styles.subTab, active === 'fill' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate('/kitchen/inventory/fill')}
      >מלאי</button>
      <button
        className={[styles.subTab, active === 'define' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate('/kitchen/inventory/define')}
      >הגדרה</button>
      <button
        className={[styles.subTab, active === 'orders' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate('/kitchen/inventory/orders')}
      >הזמנות</button>
    </div>
  )
}

// ── Date selector ─────────────────────────────────────────────────────────────
function DateSelector({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  function shift(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    onChange(d.toISOString().slice(0, 10))
  }

  function formatDisplay(d: string) {
    const [y, m, day] = d.split('-')
    return `${day}.${m}.${y.slice(2)}`
  }

  return (
    <div className={styles.datePicker}>
      <button className={styles.dateArrow} onClick={() => shift(1)} aria-label="יום הבא">‹</button>
      <label className={styles.dateDisplay}>
        {formatDisplay(date)}
        <input
          type="date"
          value={date}
          onChange={e => onChange(e.target.value)}
          className={styles.dateInput}
        />
      </label>
      <button className={styles.dateArrow} onClick={() => shift(-1)} aria-label="יום קודם">›</button>
    </div>
  )
}

// ── Status toggle ─────────────────────────────────────────────────────────────
function StatusToggle({
  value,
  onChange,
  disabled,
}: {
  value: InventoryStatus | null
  onChange: (s: InventoryStatus) => void
  disabled?: boolean
}) {
  return (
    <div className={styles.statusToggle}>
      <button
        className={[styles.toggleBtn, styles.toggleOk, value === 'ok' ? styles.toggleActive : ''].join(' ')}
        onClick={() => { if (!disabled) onChange('ok') }}
        type="button"
        disabled={disabled}
        aria-label="יש מספיק"
      >✓</button>
      <button
        className={[styles.toggleBtn, styles.togglePartial, value === 'partial' ? styles.toggleActive : ''].join(' ')}
        onClick={() => { if (!disabled) onChange('partial') }}
        type="button"
        disabled={disabled}
        aria-label="חלקי"
      >~</button>
      <button
        className={[styles.toggleBtn, styles.toggleMissing, value === 'missing' ? styles.toggleActive : ''].join(' ')}
        onClick={() => { if (!disabled) onChange('missing') }}
        type="button"
        disabled={disabled}
        aria-label="חסר, צריך להזמין"
      >✗</button>
    </div>
  )
}

// ── Category section ──────────────────────────────────────────────────────────
interface ItemState {
  status: InventoryStatus | null
  notes: string
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function FillInventoryPage({ isKitchen = false }: { isKitchen?: boolean }) {
  const currentUser = useAuthStore(s => s.currentUser)
  const items = useInventoryStore(s => s.items)
  const saveReport = useInventoryStore(s => s.saveReport)
  const getReportByDateAndWorker = useInventoryStore(s => s.getReportByDateAndWorker)
  const fetchAll = useInventoryStore(s => s.fetchAll)

  useEffect(() => { fetchAll() }, [])

  const [date, setDate] = useState(todayStr())
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const activeItems = useMemo(
    () => items.filter(it => it.isActive).sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category, 'he')
      return catCmp !== 0 ? catCmp : a.sortOrder - b.sortOrder
    }),
    [items]
  )

  const categories = useMemo(
    () => Array.from(new Set(activeItems.map(it => it.category))),
    [activeItems]
  )

  // Load existing report when date or user ID changes.
  // Intentionally depend on currentUser?.id (not the whole object) so that
  // App.tsx's refreshCurrentUser() — which creates a new object reference for
  // the same user — does NOT re-run this effect and wipe in-progress toggles.
  const currentUserId = currentUser?.id
  useEffect(() => {
    if (!currentUserId) return
    const existing = getReportByDateAndWorker(date, currentUserId)
    if (existing) {
      const states: Record<string, ItemState> = {}
      for (const entry of existing.entries) {
        states[entry.itemId] = { status: entry.status, notes: entry.notes }
      }
      setItemStates(states)
      setIsSubmitted(true)
      setIsEditing(false)
    } else {
      setItemStates({})
      setIsSubmitted(false)
      setIsEditing(false)
    }
  }, [date, currentUserId])

  function setStatus(itemId: string, status: InventoryStatus) {
    setItemStates(prev => ({
      ...prev,
      [itemId]: { status, notes: prev[itemId]?.notes ?? '' },
    }))
  }

  function setNotes(itemId: string, notes: string) {
    setItemStates(prev => ({
      ...prev,
      [itemId]: { status: prev[itemId]?.status ?? null, notes },
    }))
  }

  function handleSubmit() {
    if (!currentUser || !currentUserId) return
    const entries = activeItems
      .filter(it => itemStates[it.id]?.status != null)
      .map(it => ({
        itemId: it.id,
        status: itemStates[it.id].status as InventoryStatus,
        notes: itemStates[it.id]?.notes ?? '',
      }))
    saveReport({
      date,
      submittedById: currentUserId,
      submittedByName: currentUser.name,
      entries,
    })
    setIsSubmitted(true)
    setIsEditing(false)
  }

  const readonly = isSubmitted && !isEditing

  return (
    <div className={styles.page}>
      <PageHeader title="מלאי" />
      {isKitchen && <InventorySubNav active="fill" />}

      <DateSelector date={date} onChange={d => { setDate(d); setIsEditing(false) }} />

      <div className={styles.content}>
        {categories.map(cat => {
          const catItems = activeItems.filter(it => it.category === cat)
          return (
            <div key={cat} className={styles.categorySection}>
              <div className={styles.categoryHeader}>{cat}</div>
              {catItems.map(item => (
                <div key={item.id} className={[styles.itemRow, readonly ? styles.itemRowReadonly : ''].join(' ')}>
                  <StatusToggle
                    value={itemStates[item.id]?.status ?? null}
                    onChange={s => setStatus(item.id, s)}
                    disabled={readonly}
                  />
                  <span className={styles.itemName}>{item.name}</span>
                  <input
                    className={styles.itemNotes}
                    type="text"
                    placeholder="הערות"
                    value={itemStates[item.id]?.notes ?? ''}
                    onChange={e => setNotes(item.id, e.target.value)}
                    readOnly={readonly}
                    dir="rtl"
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        {readonly ? (
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
            ערוך
          </button>
        ) : (
          <button className={styles.submitBtn} onClick={handleSubmit}>
            {isEditing ? 'עדכן' : 'שלח'}
          </button>
        )}
      </div>
    </div>
  )
}
