import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useInventoryStore, todayStr } from '../../store/inventoryStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { buildInventoryClipboardMessage } from '../../lib/inventoryUtils'
import type { InventoryStatus } from '../../types/inventory'
import styles from './FillInventoryPage.module.scss'

// ── Sub-nav ───────────────────────────────────────────────────────────────────
export function InventorySubNav({
  active,
  isKitchen = false,
}: {
  active: 'fill' | 'define' | 'orders' | 'preparations'
  isKitchen?: boolean
}) {
  const navigate = useNavigate()
  const base = isKitchen ? '/kitchen' : '/employee'
  return (
    <div className={styles.subNav}>
      <button
        className={[styles.subTab, active === 'fill' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate(`${base}/inventory/fill`)}
      >מלאי</button>
      <button
        className={[styles.subTab, active === 'preparations' ? styles.subTabActive : ''].join(' ')}
        onClick={() => navigate(`${base}/inventory/preparations`)}
      >הכנות</button>
      {isKitchen && <>
        <button
          className={[styles.subTab, active === 'define' ? styles.subTabActive : ''].join(' ')}
          onClick={() => navigate(`${base}/inventory/define`)}
        >הגדרה</button>
        <button
          className={[styles.subTab, active === 'orders' ? styles.subTabActive : ''].join(' ')}
          onClick={() => navigate(`${base}/inventory/orders`)}
        >הזמנות</button>
      </>}
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo   = searchParams.get('returnTo') ?? ''      // e.g. '/employee/report'
  const initDate   = searchParams.get('date') ?? todayStr()  // pre-fill date from shift form

  const currentUser = useAuthStore(s => s.currentUser)
  const items                  = useInventoryStore(s => s.items)
  const categoryOrder          = useInventoryStore(s => s.categoryOrder)
  const saveReport             = useInventoryStore(s => s.saveReport)
  const getReportByDateAndWorker = useInventoryStore(s => s.getReportByDateAndWorker)
  const fetchAll               = useInventoryStore(s => s.fetchAll)
  const fetchReportsForDate    = useInventoryStore(s => s.fetchReportsForDate)

  useEffect(() => { fetchAll() }, [])

  const [date, setDate] = useState(initDate)
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const activeItems = useMemo(
    () => items.filter(it => it.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  )

  const categories = useMemo(() => {
    const presentCats = new Set(activeItems.map(it => it.category))
    // respect the saved category order; fall back to alphabetical for any unlisted
    const ordered = categoryOrder.filter(c => presentCats.has(c))
    const extra   = [...presentCats].filter(c => !categoryOrder.includes(c)).sort((a, b) => a.localeCompare(b, 'he'))
    return [...ordered, ...extra]
  }, [activeItems, categoryOrder])

  // Load existing report when date or user ID changes.
  // Intentionally depend on currentUser?.id (not the whole object) so that
  // App.tsx's refreshCurrentUser() — which creates a new object reference for
  // the same user — does NOT re-run this effect and wipe in-progress toggles.
  const currentUserId = currentUser?.id
  useEffect(() => {
    fetchReportsForDate(date)
  }, [date])

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

  const readonly = isSubmitted && !isEditing && !returnTo

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

  async function handleSubmit() {
    if (!currentUser || !currentUserId) return
    setSaveError('')
    setIsSaving(true)
    const entries = activeItems
      .filter(it => itemStates[it.id]?.status != null)
      .map(it => ({
        itemId: it.id,
        status: itemStates[it.id].status as InventoryStatus,
        notes: itemStates[it.id]?.notes ?? '',
      }))

    // Build & copy clipboard message within the user-gesture context
    const msg = buildInventoryClipboardMessage(entries, activeItems, categoryOrder, date)
    const clipboardWrite = navigator.clipboard.writeText(msg).catch(() => {})

    try {
      await saveReport({
        date,
        submittedById: currentUserId,
        submittedByName: currentUser.name,
        entries,
      })
      await clipboardWrite
      setIsSubmitted(true)
      setIsEditing(false)
      if (returnTo) {
        // Forward all shift-state params back so the form can restore itself,
        // and add inventoryDate so the combined clipboard message can be built
        const returnParams = new URLSearchParams()
        returnParams.set('inventoryDate', date)
        for (const [key, value] of searchParams.entries()) {
          if (key !== 'returnTo' && key !== 'date') {
            returnParams.set(key, value)
          }
        }
        navigate(`${returnTo}?${returnParams.toString()}`, { replace: true })
      }
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as any)?.message ?? (err as any)?.details ?? JSON.stringify(err)
      setSaveError(`שגיאה בשמירה: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  function toggleCat(cat: string) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <PageHeader title="מלאי" />
      <InventorySubNav active="fill" isKitchen={isKitchen} />

      <DateSelector date={date} onChange={d => { setDate(d); setIsEditing(false) }} />

      <div className={styles.content}>
        {categories.map(cat => {
          const catItems = activeItems.filter(it => it.category === cat)
          const collapsed = collapsedCats.has(cat)
          return (
            <div key={cat} className={styles.categorySection}>
              <button
                type="button"
                className={styles.categoryHeader}
                onClick={() => toggleCat(cat)}
                aria-expanded={!collapsed}
              >
                <span>{cat}</span>
                <span className={[styles.chevron, collapsed ? styles.chevronCollapsed : ''].join(' ')}>›</span>
              </button>
              {!collapsed && catItems.map(item => (
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
        {saveError && <p className={styles.saveError}>{saveError}</p>}
        {readonly ? (
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
            ערוך
          </button>
        ) : (
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? '...' : returnTo ? 'שמור וחזור לדיווח' : isEditing ? 'עדכן' : 'שלח'}
          </button>
        )}
      </div>
    </div>
  )
}
