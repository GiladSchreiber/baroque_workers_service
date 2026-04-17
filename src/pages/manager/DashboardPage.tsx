import { useEffect, useMemo, useState } from 'react'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { currentMonthStr, monthOptions, formatDate, SHIFT_TYPE_LABELS, shiftHours, fmtMoney } from '../../lib/utils'
import styles from './DashboardPage.module.scss'

const MONTH_OPTIONS = monthOptions(24)

export function DashboardPage() {
  const { shifts, isLoading, fetchAll } = useShiftStore()
  const { employees, fetchAll: fetchEmployees } = useEmployeeStore()
  const [month, setMonth] = useState(currentMonthStr())

  useEffect(() => {
    fetchAll()
    fetchEmployees()
  }, [fetchAll, fetchEmployees])

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map(e => [e.id, e.name])),
    [employees]
  )

  const incomeShifts = useMemo(
    () => shifts.filter(s => s.date.startsWith(month) && s.revenue !== undefined),
    [shifts, month]
  )

  const totalRevenue = useMemo(
    () => incomeShifts.reduce((sum, s) => sum + (s.revenue ?? 0), 0),
    [incomeShifts]
  )

  const totalCash = useMemo(
    () => incomeShifts.reduce((sum, s) => sum + (s.cash ?? 0), 0),
    [incomeShifts]
  )

  const totalCredit = useMemo(
    () => incomeShifts.reduce((sum, s) => sum + (s.credit ?? 0), 0),
    [incomeShifts]
  )

  const avgRevenue = incomeShifts.length > 0 ? totalRevenue / incomeShifts.length : 0

  const totalTips = useMemo(
    () => shifts
      .filter(s => s.date.startsWith(month))
      .reduce((sum, s) => sum + (s.tips ?? 0), 0),
    [shifts, month],
  )

  const recentShifts = useMemo(
    () => [...shifts]
      .sort((a, b) =>
        new Date(b.updatedAt ?? b.submittedAt).getTime() -
        new Date(a.updatedAt ?? a.submittedAt).getTime()
      )
      .slice(0, 5),
    [shifts]
  )

  return (
    <div className={styles.page}>
      <PageHeader title="דשבורד" />
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className={styles.content}>
          <select
            className={styles.monthSelect}
            value={month}
            onChange={e => setMonth(e.target.value)}
          >
            {MONTH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className={styles.cards}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>סה"כ X</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalRevenue)}</span>
              <span className={styles.cardSub}>{incomeShifts.length} ימים</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>ממוצע X</span>
              <span className={styles.cardValue}>₪{fmtMoney(avgRevenue)}</span>
              <span className={styles.cardSub}>ליום</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>סה"כ מזומן</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalCash)}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>סה"כ אשראי</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalCredit)}</span>
            </div>
            <div className={`${styles.card} ${styles.cardFull}`}>
              <span className={styles.cardLabel}>סה"כ טיפ</span>
              <span className={styles.cardValue}>₪{fmtMoney(totalTips)}</span>
            </div>
          </div>

          {recentShifts.length > 0 && (
            <div className={styles.lastShift}>
              <span className={styles.lastShiftLabel}>עדכונים אחרונים</span>
              {recentShifts.map(s => (
                <div key={s.id} className={styles.lastShiftRow}>
                  <span className={styles.lastShiftName}>{employeeMap[s.employeeId] ?? '—'}</span>
                  <span className={styles.lastShiftDate}>{formatDate(s.date)}</span>
                  <span className={styles.lastShiftType}>{SHIFT_TYPE_LABELS[s.type]}</span>
                  <span className={styles.lastShiftHours}>{shiftHours(s.startTime, s.endTime)}</span>
                  {s.revenue !== undefined && (
                    <span className={styles.lastShiftRevenue}>X ₪{fmtMoney(s.revenue!)}</span>
                  )}
                  <span className={styles.lastShiftTime}>
                    {new Date(s.updatedAt ?? s.submittedAt).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
