import { useState, useMemo, useEffect } from 'react'
import { useInventoryStore, todayStr, mergeEntries } from '../../store/inventoryStore'
import { PageHeader } from '../../components/layout/PageHeader'
import type { InventoryStatus } from '../../types/inventory'
import { InventorySubNav } from './FillInventoryPage'
import styles from './OrdersPage.module.scss'

// ── Date selector (same as FillInventoryPage) ─────────────────────────────────
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

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: InventoryStatus }) {
  const cls = status === 'ok' ? styles.pillOk : status === 'partial' ? styles.pillPartial : styles.pillMissing
  const label = status === 'ok' ? '✓' : status === 'partial' ? '~' : '✗'
  return <span className={[styles.pill, cls].join(' ')}>{label}</span>
}

// ── Filter toggles ────────────────────────────────────────────────────────────
function FilterBar({
  active,
  onToggle,
}: {
  active: Set<InventoryStatus>
  onToggle: (s: InventoryStatus) => void
}) {
  return (
    <div className={styles.filterBar}>
      {(['ok', 'partial', 'missing'] as InventoryStatus[]).map(status => {
        const isActive = active.has(status)
        const label = status === 'ok' ? '✓ יש מספיק' : status === 'partial' ? '~ חלקי' : '✗ חסר'
        const cls = [
          styles.filterBtn,
          status === 'ok' ? styles.filterOk : status === 'partial' ? styles.filterPartial : styles.filterMissing,
          isActive ? styles.filterActive : '',
        ].join(' ')
        return (
          <button key={status} className={cls} onClick={() => onToggle(status)}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function OrdersPage() {
  const items         = useInventoryStore(s => s.items)
  const categoryOrder = useInventoryStore(s => s.categoryOrder)
  const getReportsForDate = useInventoryStore(s => s.getReportsForDate)
  const fetchAll = useInventoryStore(s => s.fetchAll)

  useEffect(() => { fetchAll() }, [])

  const [date, setDate] = useState(todayStr())
  const [activeFilters, setActiveFilters] = useState<Set<InventoryStatus>>(
    new Set(['ok', 'partial', 'missing'])
  )
  const [copied, setCopied] = useState<string | null>(null)

  const reports = useMemo(() => getReportsForDate(date), [date, getReportsForDate, items])
  const merged = useMemo(() => mergeEntries(reports), [reports])

  const activeItems = useMemo(() => items.filter(i => i.isActive), [items])

  const categories = useMemo(() => {
    const presentCats = new Set(activeItems.map(i => i.category))
    const ordered = categoryOrder.filter(c => presentCats.has(c))
    const extra   = [...presentCats].filter(c => !categoryOrder.includes(c)).sort((a, b) => a.localeCompare(b, 'he'))
    return [...ordered, ...extra]
  }, [activeItems, categoryOrder])

  function toggleFilter(s: InventoryStatus) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  function copyForCategory(category: string) {
    const catItems = activeItems
      .filter(i => i.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const needOrder = catItems.filter(i => {
      const entry = merged.get(i.id)
      return entry && (entry.status === 'missing' || entry.status === 'partial')
    })

    if (needOrder.length === 0) {
      const text = `${category}: הכל תקין ✓`
      navigator.clipboard.writeText(text).catch(() => {})
      setCopied(category)
      setTimeout(() => setCopied(null), 2000)
      return
    }

    const lines = needOrder.map(i => {
      const entry = merged.get(i.id)!
      const statusMark = entry.status === 'missing' ? '✗' : '~'
      const notesPart = entry.notes ? ` — ${entry.notes}` : ''
      return `${statusMark} ${i.name}${notesPart}`
    })

    const text = `${category}:\n${lines.join('\n')}`
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(category)
    setTimeout(() => setCopied(null), 2000)
  }

  const hasAnyData = merged.size > 0

  return (
    <div className={styles.page}>
      <PageHeader title="מלאי" />
      <InventorySubNav active="orders" />

      <DateSelector date={date} onChange={setDate} />
      <FilterBar active={activeFilters} onToggle={toggleFilter} />

      <div className={styles.content}>
        {!hasAnyData && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <p className={styles.emptyText}>אין דיווחים לתאריך זה</p>
          </div>
        )}

        {categories.map(cat => {
          const catItems = activeItems
            .filter(i => i.category === cat)
            .sort((a, b) => a.sortOrder - b.sortOrder)

          const visibleItems = catItems.filter(i => {
            const entry = merged.get(i.id)
            if (!entry) return false
            return activeFilters.has(entry.status)
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={cat} className={styles.categorySection}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryName}>{cat}</span>
                <button
                  className={[styles.copyBtn, copied === cat ? styles.copyBtnDone : ''].join(' ')}
                  onClick={() => copyForCategory(cat)}
                  title="העתק רשימת הזמנה"
                >
                  {copied === cat ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
              {visibleItems.map(item => {
                const entry = merged.get(item.id)!
                return (
                  <div key={item.id} className={styles.itemRow}>
                    <StatusPill status={entry.status} />
                    <span className={styles.itemName}>{item.name}</span>
                    {entry.notes && (
                      <span className={styles.itemNotes}>{entry.notes}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
