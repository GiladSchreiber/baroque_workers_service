import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { documentsRepo } from '../../repositories'
import {
  expensesByItem,
  expensesBySupplier,
  formatMoney,
  formatMonthHe,
  localIsoDate,
  shiftMonth,
} from '../../lib/documents'
import type { SupplierDocument } from '../../types/documents'
import { DocumentsSubNav } from './DocumentsSubNav'
import styles from './Documents.module.scss'

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) return null
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100)
  if (pct === 0) return <span className={styles.kpiDelta}>ללא שינוי מהחודש הקודם</span>
  return (
    <span className={`${styles.kpiDelta} ${pct > 0 ? styles.up : styles.down}`}>
      {pct > 0 ? '▲' : '▼'} {Math.abs(pct)}% מהחודש הקודם
    </span>
  )
}

export function ExpensesPage() {
  const [docs, setDocs] = useState<SupplierDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(() => localIsoDate().slice(0, 7))
  const [supplier, setSupplier] = useState<string | null>(null)

  useEffect(() => {
    documentsRepo.getAll()
      .then(setDocs)
      .catch(err => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
      .finally(() => setLoading(false))
  }, [])

  const prevMonth = shiftMonth(month, -1)
  const bySupplier = useMemo(() => expensesBySupplier(docs, month), [docs, month])
  const bySupplierPrev = useMemo(() => expensesBySupplier(docs, prevMonth), [docs, prevMonth])
  const items = useMemo(() => expensesByItem(docs, month, supplier ?? undefined), [docs, month, supplier])

  const total = bySupplier.reduce((s, r) => ({ before: s.before + r.beforeVat, with: s.with + r.withVat }), { before: 0, with: 0 })
  const totalPrev = bySupplierPrev.reduce((s, r) => ({ before: s.before + r.beforeVat, with: s.with + r.withVat }), { before: 0, with: 0 })
  const prevBySupplier = new Map(bySupplierPrev.map(r => [r.supplier, r]))

  return (
    <div className={styles.page}>
      <PageHeader title="הוצאות" />
      <DocumentsSubNav />

      <div className={styles.monthPicker}>
        <button className={styles.monthArrow} onClick={() => { setMonth(m => shiftMonth(m, 1)); setSupplier(null) }} aria-label="חודש הבא">‹</button>
        <span>{formatMonthHe(month)}</span>
        <button className={styles.monthArrow} onClick={() => { setMonth(m => shiftMonth(m, -1)); setSupplier(null) }} aria-label="חודש קודם">›</button>
      </div>

      {loading ? <LoadingSpinner /> : error ? <p className={styles.error} style={{ padding: '1rem' }}>{error}</p> : (
        <div className={styles.body}>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>סה״כ לפני מע״מ</span>
              <span className={styles.kpiValue}>{formatMoney(total.before)}</span>
              <Delta current={total.before} previous={totalPrev.before} />
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>סה״כ כולל מע״מ</span>
              <span className={styles.kpiValue}>{formatMoney(total.with)}</span>
              <Delta current={total.with} previous={totalPrev.with} />
            </div>
          </div>
          <p className={styles.muted}>
            מחושב מחשבוניות מס וחשבוניות מס/קבלה, בניכוי חשבוניות זיכוי. תעודות משלוח וקבלות לא נספרות.
          </p>

          {bySupplier.length === 0 ? (
            <EmptyState title="אין הוצאות בחודש הזה" />
          ) : (
            <div className={styles.card}>
              <p className={styles.cardTitle}>לפי ספק</p>
              <table className={styles.linesTable}>
                <thead>
                  <tr>
                    <th>ספק</th>
                    <th className={styles.num}>לפני מע״מ</th>
                    <th className={styles.num}>כולל מע״מ</th>
                    <th className={styles.num}>חודש קודם</th>
                  </tr>
                </thead>
                <tbody>
                  {bySupplier.map(r => (
                    <tr
                      key={r.supplier}
                      className={styles.clickRow}
                      onClick={() => setSupplier(s => (s === r.supplier ? null : r.supplier))}
                    >
                      <td>{supplier === r.supplier ? '▾ ' : ''}{r.supplier} <span className={styles.muted}>({r.count})</span></td>
                      <td className={styles.num}>{formatMoney(r.beforeVat)}</td>
                      <td className={styles.num}>{formatMoney(r.withVat)}</td>
                      <td className={styles.num}>{formatMoney(prevBySupplier.get(r.supplier)?.withVat ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <div className={styles.card}>
              <p className={styles.cardTitle}>לפי פריט{supplier ? ` — ${supplier}` : ''}</p>
              {!supplier && <p className={styles.muted}>לחצו על ספק כדי לסנן.</p>}
              <table className={styles.linesTable}>
                <thead>
                  <tr>
                    <th>פריט</th>
                    <th className={styles.num}>כמות</th>
                    <th className={styles.num}>לפני מע״מ</th>
                    <th className={styles.num}>כולל מע״מ</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(r => (
                    <tr key={`${r.supplier}|${r.description}`}>
                      <td>{r.description}{!supplier && <span className={styles.lineNote} style={{ color: 'inherit', opacity: 0.6 }}>{r.supplier}</span>}</td>
                      <td className={styles.num}>{r.quantity} {r.unit ?? ''}</td>
                      <td className={styles.num}>{formatMoney(r.beforeVat)}</td>
                      <td className={styles.num}>{formatMoney(r.withVat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
