import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import {
  formatDateShort, isWithinEditWindow,
  splitShiftHours, calcSalary, currentMonthStr, monthOptions, fmtMoney,
} from '../../lib/utils'
import styles from './MyShiftsPage.module.scss'

const MONTH_OPTIONS = [{ value: '', label: 'כל הזמן' }, ...monthOptions(24)]

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}


function fmtH(h: number): string {
  if (h === 0) return '—'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export function MyShiftsPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore(s => s.currentUser)
  const { shifts, isLoading, fetchByEmployee } = useShiftStore()
  const [filterMonth, setFilterMonth] = useState(currentMonthStr())

  useEffect(() => {
    if (currentUser) fetchByEmployee(currentUser.id)
  }, [currentUser, fetchByEmployee])

  const hourlyWage = currentUser?.hourlyWage ?? 0

  const filtered = useMemo(
    () => shifts
      .filter(s => !filterMonth || s.date.startsWith(filterMonth))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [shifts, filterMonth],
  )

  const totalSalary = useMemo(() => {
    let total = 0
    for (const s of filtered) {
      const h = splitShiftHours(s.date, s.startTime, s.endTime, s.type)
      total += calcSalary(h.regular, h.shabbat, h.support, s.tips ?? 0, hourlyWage)
    }
    return total
  }, [filtered, hourlyWage])

  return (
    <div className={styles.page}>
      <PageHeader title="שעות" />

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
      ) : filtered.length === 0 ? (
        <EmptyState
          title="אין משמרות"
          description="לא דווחו משמרות לתקופה זו."
          action={filterMonth ? undefined : undefined}
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>רגיל</th>
                <th>שבת</th>
                <th>אחמ"ש</th>
                <th>שכר</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(shift => {
                const h = splitShiftHours(shift.date, shift.startTime, shift.endTime, shift.type)
                const salary = calcSalary(h.regular, h.shabbat, h.support, shift.tips ?? 0, hourlyWage)
                return (
                  <tr key={shift.id}>
                    <td className={styles.dateCell}>{formatDateShort(shift.date)}</td>
                    <td className={styles.numCell}>{fmtH(h.regular)}</td>
                    <td className={styles.numCell}>{fmtH(h.shabbat)}</td>
                    <td className={styles.numCell}>{fmtH(h.support)}</td>
                    <td className={styles.numCell}>₪{fmtMoney(salary)}</td>
                    <td className={styles.actionCell}>
                      {isWithinEditWindow(shift.submittedAt) && (
                        <button
                          className={styles.editBtn}
                          onClick={() => navigate(`/employee/shifts/${shift.id}/edit`)}
                          aria-label="עריכה"
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={4} className={styles.totalLabel}>סה"כ</td>
                <td className={styles.totalNum}>₪{fmtMoney(totalSalary)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
