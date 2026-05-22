import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useShiftStore } from '../../store/shiftStore'
import { useShabbatSettingsStore } from '../../store/shabbatSettingsStore'
import { useHolidaySettingsStore } from '../../store/holidaySettingsStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EditShiftModal } from '../../components/modals/EditShiftModal'
import {
  formatDateShort, formatMonth,
  splitShiftHours, calcSalary, currentMonthStr, fmtMoney, SHIFT_TYPE_LABELS,
  computeTipDistribution,
} from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'
import type { Shift } from '../../types'
import styles from './MyShiftsPage.module.scss'


function fmtH(h: number): string {
  if (h === 0) return '—'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export function MyShiftsPage() {
  const currentUser = useAuthStore(s => s.currentUser)
  const { shifts, isLoading, fetchAll } = useShiftStore()
  const { fetchAll: fetchShabbatSettings, getTimesForDate } = useShabbatSettingsStore()
  const { periods: holidayPeriods, fetchAll: fetchHolidaySettings } = useHolidaySettingsStore()
  const [filterMonth, setFilterMonth] = useState(currentMonthStr())
  const [editShift, setEditShift] = useState<Shift | null>(null)

  useEffect(() => {
    fetchAll()
    fetchShabbatSettings()
    fetchHolidaySettings()
  }, [fetchAll, fetchShabbatSettings, fetchHolidaySettings])

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

  const { totalSalary } = useMemo(() => {
    let salary = 0
    let shiftCount = 0
    for (const s of filtered) {
      if (s.type === 'global' || s.type === 'taxi' || s.type === 'cashier') {
        salary += s.amount ?? 0
      } else {
        const { fridayStartMins, saturdayEndMins } = getTimesForDate(s.date)
        const h = splitShiftHours(s.date, s.startTime, s.endTime, s.type, fridayStartMins, saturdayEndMins, holidayPeriods)
        const myTip = tipMap.get(s.date)?.get(myId) ?? 0
        salary += calcSalary(h.regular, h.shabbat, h.support, myTip, hourlyWage, h.holiday)
        shiftCount++
      }
    }
    return { totalSalary: salary, nesia: shiftCount * 8 }
  }, [filtered, hourlyWage, tipMap, myId, getTimesForDate])

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
        <>
          <EditShiftModal shift={editShift} onClose={() => setEditShift(null)} />
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>סוג</th>
                  <th>רגיל</th>
                  <th>שבת</th>
                  <th>שכר</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(shift => {
                  const isFlat = shift.type === 'global' || shift.type === 'taxi' || shift.type === 'cashier'
                  const { fridayStartMins, saturdayEndMins } = getTimesForDate(shift.date)
                  const h = isFlat ? { regular: 0, shabbat: 0, holiday: 0, support: 0 } : splitShiftHours(shift.date, shift.startTime, shift.endTime, shift.type, fridayStartMins, saturdayEndMins, holidayPeriods)
                  const myTip = isFlat ? 0 : (tipMap.get(shift.date)?.get(myId) ?? 0)
                  const salary = isFlat
                    ? (shift.amount ?? 0)
                    : calcSalary(h.regular, h.shabbat, h.support, myTip, hourlyWage, h.holiday)
                  return (
                    <tr
                      key={shift.id}
                      className={styles.clickableRow}
                      onClick={() => setEditShift(shift)}
                    >
                      <td className={styles.dateCell}>{formatDateShort(shift.date)}</td>
                      <td><Badge type={shift.type} label={SHIFT_TYPE_LABELS[shift.type]} /></td>
                      <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.regular + h.support)}</td>
                      <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.shabbat + h.holiday)}</td>
                      <td className={styles.numCell}>₪{fmtMoney(salary)}</td>
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
                  <td className={styles.totalNum}>₪{fmtMoney(totalSalary)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
