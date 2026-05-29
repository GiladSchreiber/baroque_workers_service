import { useState, useMemo, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useInventoryStore, PROTECTED_CATEGORY } from '../../store/inventoryStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { InventorySubNav } from './FillInventoryPage'
import type { InventoryStatus } from '../../types/inventory'
import styles from './PreparationsPage.module.scss'

export function PreparationsPage({ isKitchen = false }: { isKitchen?: boolean }) {
  const items              = useInventoryStore(s => s.items)
  const reports            = useInventoryStore(s => s.reports)
  const fetchAll           = useInventoryStore(s => s.fetchAll)
  const fetchLatestReport  = useInventoryStore(s => s.fetchLatestReport)

  useEffect(() => { fetchAll(); fetchLatestReport() }, [])

  // Most recently submitted report
  const latestReport = useMemo(() => {
    if (reports.length === 0) return null
    return [...reports].sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )[0]
  }, [reports])

  // Map: itemId → { status, notes } from the latest report
  const entryMap = useMemo(() => {
    const map = new Map<string, { status: InventoryStatus; notes: string }>()
    if (!latestReport) return map
    for (const entry of latestReport.entries) {
      map.set(entry.itemId, { status: entry.status, notes: entry.notes })
    }
    return map
  }, [latestReport])

  // הכנות items that should appear:
  //  - missing / partial → actionable (show checkbox)
  //  - ok + has note     → informational (no checkbox)
  //  - ok + no note      → hidden
  const { actionable, informational } = useMemo(() => {
    const base = items
      .filter(it => it.isActive && it.category === PROTECTED_CATEGORY)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const actionable:     typeof base = []
    const informational:  typeof base = []

    for (const item of base) {
      const entry = entryMap.get(item.id)
      if (!entry) continue
      if (entry.status === 'missing' || entry.status === 'partial') {
        actionable.push(item)
      } else if (entry.status === 'ok') {
        informational.push(item)
      }
    }
    return { actionable, informational }
  }, [items, entryMap])

  // Local-only checkbox state (only for actionable items)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const didFireConfetti = useRef(false)

  function fireConfetti() {
    const end = Date.now() + 2000
    const colors = ['#c8bfa0', '#e8dfc8', '#a09878', '#fff8e7'];
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
  }

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)

      // Fire confetti when the last actionable item is checked
      if (!didFireConfetti.current && actionable.length > 0 &&
          actionable.every(item => next.has(item.id))) {
        didFireConfetti.current = true
        setTimeout(fireConfetti, 100)
      } else if (!actionable.every(item => next.has(item.id))) {
        didFireConfetti.current = false
      }

      return next
    })
  }

  function resetAll() { setChecked(new Set()); didFireConfetti.current = false }

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}  ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const checkedCount = checked.size
  const totalCount   = actionable.length
  const nothingToShow = actionable.length === 0 && informational.length === 0

  return (
    <div className={styles.page}>
      <PageHeader title="הכנות" />
      <InventorySubNav active="preparations" isKitchen={isKitchen} />

      {latestReport ? (
        <div className={styles.reportMeta}>
          <span className={styles.reporter}>{latestReport.submittedByName}</span>
          <span className={styles.reportDate}>{formatDateTime(latestReport.submittedAt)}</span>
        </div>
      ) : null}

      {totalCount > 0 && (
        <div className={styles.progress}>
          <div
            className={styles.progressBar}
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
          <span className={styles.progressLabel}>{checkedCount} / {totalCount}</span>
        </div>
      )}

      <div className={styles.content}>
        {!latestReport || nothingToShow ? (
          <p className={styles.empty}>
            {!latestReport ? 'אין דוחות מלאי עדיין' : 'אין פריטים לטיפול 🎉'}
          </p>
        ) : (
          <>
            {/* Actionable: missing / partial — with checkbox */}
            {actionable.map(item => {
              const isDone = checked.has(item.id)
              const entry  = entryMap.get(item.id)!
              return (
                <label
                  key={item.id}
                  className={[styles.itemRow, isDone ? styles.itemDone : ''].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggle(item.id)}
                    className={styles.checkbox}
                  />
                  <div className={styles.itemText}>
                    <div className={styles.itemNameRow}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={[
                        styles.statusPill,
                        entry.status === 'missing' ? styles.pillMissing : styles.pillPartial,
                      ].join(' ')}>
                        {entry.status === 'missing' ? '✗' : '~'}
                      </span>
                    </div>
                    {entry.notes && <span className={styles.itemNotes}>{entry.notes}</span>}
                  </div>
                </label>
              )
            })}

            {/* Informational: ok + has note — no checkbox */}
            {informational.length > 0 && (
              <>
                {actionable.length > 0 && <div className={styles.divider} />}
                {informational.map(item => {
                  const entry = entryMap.get(item.id)!
                  return (
                    <div key={item.id} className={styles.infoRow}>
                      <div className={styles.itemText}>
                        <div className={styles.itemNameRow}>
                          <span className={styles.itemName}>{item.name}</span>
                          <span className={[styles.statusPill, styles.pillOk].join(' ')}>✓</span>
                        </div>
                        <span className={styles.itemNotes}>{entry.notes}</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>

      {checkedCount > 0 && (
        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={resetAll}>
            אפס הכל
          </button>
        </div>
      )}
    </div>
  )
}
