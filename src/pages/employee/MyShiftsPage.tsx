import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import {
  formatDateShort, formatMonth, isWithinEditWindow,
  splitShiftHours, calcSalary, currentMonthStr, fmtMoney, SHIFT_TYPE_LABELS,
  computeTipDistribution,
} from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'
import styles from './MyShiftsPage.module.scss'

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
  const { shifts, isLoading, fetchAll } = useShiftStore()
  const [filterMonth, setFilterMonth] = useState(currentMonthStr())

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const hourlyWage = currentUser?.hourlyWage ?? 0
  const myId = currentUser?.id ?? ''

  // All shifts for months the current user has worked (used for tip distribution across workers)
  const myShifts = useMemo(
    () => shifts.filter(s => s.employeeId === myId),
    [shifts, myId]
  )

  const monthOptions = useMemo(() => {
    const months = Array.from(new Set(myShifts.map(s => s.date.slice(0, 7))))
      .sort((a, b) => b.localeCompare(a))
    return [
      { value: '', label: 'כל הזמן' },
      ...months.map(ym => ({ value: ym, label: formatMonth(ym) })),
    ]
  }, [myShifts])

  const filtered = useMemo(
    () => myShifts
      .filter(s => !filterMonth || s.date.startsWith(filterMonth))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [myShifts, filterMonth],
  )

  // Build per-date tip distribution using ALL workers' shifts on each date I worked
  const tipMap = useMemo(() => {
    const myDates = new Set(filtered.map(s => s.date))
    const byDate = new Map<string, ReturnType<typeof computeTipDistribution>>()
    for (const date of myDates) {
      const dayShifts = shifts.filter(s => s.date === date)
      byDate.set(date, computeTipDistribution(dayShifts))
    }
    return byDate
  }, [shifts, filtered])

  const totalSalary = useMemo(() => {
    let total = 0
    let shiftCount = 0
    for (const s of filtered) {
      if (s.type === 'global' || s.type === 'taxi' || s.type === 'cashier') {
        total += s.amount ?? 0
      } else {
        const h = splitShiftHours(s.date, s.startTime, s.endTime, s.type, s.dayType)
        const myTip = tipMap.get(s.date)?.get(myId) ?? 0
        total += calcSalary(h.regular, h.shabbat, h.support, myTip, hourlyWage, h.holiday)
        shiftCount++
      }
    }
    total += shiftCount * 8 // נסיעות ₪8 per non-flat shift
    return total
  }, [filtered, hourlyWage, tipMap, myId])

  return (
    <div className={styles.page}>
      <PageHeader title="שעות" />

      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          {monthOptions.map(o => (
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
                <th>סוג</th>
                <th>רגיל</th>
                <th>שבת</th>
                <th>אחמ"ש</th>
                <th>שכר</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(shift => {
                const isFlat = shift.type === 'global' || shift.type === 'taxi' || shift.type === 'cashier'
                const h = isFlat ? { regular: 0, shabbat: 0, holiday: 0, support: 0 } : splitShiftHours(shift.date, shift.startTime, shift.endTime, shift.type, shift.dayType)
                const myTip = isFlat ? 0 : (tipMap.get(shift.date)?.get(myId) ?? 0)
                const salary = isFlat
                  ? (shift.amount ?? 0)
                  : calcSalary(h.regular, h.shabbat, h.support, myTip, hourlyWage, h.holiday)
                return (
                  <tr key={shift.id}>
                    <td className={styles.dateCell}>{formatDateShort(shift.date)}</td>
                    <td><Badge type={shift.type} label={SHIFT_TYPE_LABELS[shift.type]} /></td>
                    <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.regular)}</td>
                    <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.shabbat)}</td>
                    <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.support)}</td>
                    <td className={styles.numCell}>₪{fmtMoney(salary)}</td>
                    <td className={styles.actionCell}>
                      {!isFlat && isWithinEditWindow(shift.submittedAt) && (
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
                <td className={styles.totalLabel}>סה"כ</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
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
