import { useEffect, useMemo, useState } from 'react'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { formatDateShort, currentMonthStr, monthOptions, fmtMoney } from '../../lib/utils'
import styles from './IncomePage.module.scss'

const MONTH_OPTIONS = [{ value: '', label: 'כל הזמן' }, ...monthOptions(24)]

export function IncomePage() {
  const { shifts, isLoading, fetchAll: fetchShifts } = useShiftStore()
  const { employees, fetchAll: fetchEmployees } = useEmployeeStore()
  const [filterMonth, setFilterMonth] = useState(currentMonthStr())

  useEffect(() => {
    fetchShifts()
    fetchEmployees()
  }, [fetchShifts, fetchEmployees])

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map(e => [e.id, e.name])),
    [employees],
  )

  const monthShifts = useMemo(
    () => shifts.filter(s => !filterMonth || s.date.startsWith(filterMonth)),
    [shifts, filterMonth],
  )

  // Sum of all workers' tips per date
  const dailyTipsMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of monthShifts) {
      map[s.date] = (map[s.date] ?? 0) + (s.tips ?? 0)
    }
    return map
  }, [monthShifts])

  // One income row per day — the shift carrying revenue/cash/credit
  const incomeRows = useMemo(
    () => monthShifts
      .filter(s => s.revenue !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [monthShifts],
  )

  function workerFirstName(id: string): string {
    const name = employeeMap[id] ?? ''
    return name.trim().split(/\s+/)[0] || '—'
  }

  const totals = useMemo(() => ({
    revenue: incomeRows.reduce((sum, s) => sum + (s.revenue ?? 0), 0),
    cash:    incomeRows.reduce((sum, s) => sum + (s.cash    ?? 0), 0),
    credit:  incomeRows.reduce((sum, s) => sum + (s.credit  ?? 0), 0),
    tips:    incomeRows.reduce((sum, s) => sum + (dailyTipsMap[s.date] ?? 0), 0),
  }), [incomeRows, dailyTipsMap])

  return (
    <div className={styles.page}>
      <PageHeader title="הכנסות" />

      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          {MONTH_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : incomeRows.length === 0 ? (
        <EmptyState title="אין נתוני הכנסה" description="לא נמצאו סגירות לתקופה זו." />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>עובד</th>
                <th className={styles.numHeader}>X</th>
                <th className={styles.numHeader}>אשראי</th>
                <th className={styles.numHeader}>מזומן</th>
                <th className={styles.numHeader}>טיפ</th>
              </tr>
            </thead>
            <tbody>
              {incomeRows.map(s => (
                <tr key={s.id}>
                  <td className={styles.dateCell}>{formatDateShort(s.date)}</td>
                  <td className={styles.nameCell}>{workerFirstName(s.employeeId)}</td>
                  <td className={styles.numCell}>₪{fmtMoney(s.revenue!)}</td>
                  <td className={styles.numCell}>₪{fmtMoney(s.credit ?? 0)}</td>
                  <td className={styles.numCell}>₪{fmtMoney(s.cash ?? 0)}</td>
                  <td className={styles.numCell}>₪{fmtMoney(dailyTipsMap[s.date] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={2} className={styles.totalLabel}>סה"כ</td>
                <td className={styles.totalNum}>₪{fmtMoney(totals.revenue)}</td>
                <td className={styles.totalNum}>₪{fmtMoney(totals.credit)}</td>
                <td className={styles.totalNum}>₪{fmtMoney(totals.cash)}</td>
                <td className={styles.totalNum}>₪{fmtMoney(totals.tips)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
