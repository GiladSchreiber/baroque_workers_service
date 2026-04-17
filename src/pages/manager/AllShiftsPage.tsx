import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import {
  SHIFT_TYPE_LABELS, formatDateShort, currentMonthStr, monthOptions, formatMonth,
  splitShiftHours, calcSalary, fmtMoney,
} from '../../lib/utils'
import type { Employee, Shift } from '../../types'
import styles from './AllShiftsPage.module.scss'

const MONTH_OPTIONS = [{ value: '', label: 'כל הזמן' }, ...monthOptions(24)]

interface EmpStats {
  employee: Employee
  regular: number
  shabbat: number
  support: number
  tips: number
  salary: number
  shiftCount: number
}

function aggregateShifts(shifts: Shift[], employee: Employee): EmpStats {
  let regular = 0, shabbat = 0, support = 0, tips = 0
  for (const s of shifts) {
    const h = splitShiftHours(s.date, s.startTime, s.endTime, s.type)
    regular += h.regular
    shabbat += h.shabbat
    support += h.support
    tips += s.tips ?? 0
  }
  return {
    employee,
    regular, shabbat, support, tips,
    salary: calcSalary(regular, shabbat, support, tips, employee.hourlyWage),
    shiftCount: shifts.length,
  }
}

function fmtH(h: number): string {
  if (h === 0) return '—'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

export function AllShiftsPage() {
  const { shifts, isLoading, fetchAll: fetchShifts } = useShiftStore()
  const { employees, fetchAll: fetchEmployees } = useEmployeeStore()

  const [filterMonth, setFilterMonth] = useState(currentMonthStr())
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    fetchShifts()
    fetchEmployees()
  }, [fetchShifts, fetchEmployees])

  const activeEmployees = useMemo(
    () => employees.filter(e => e.isActive && e.role === 'employee'),
    [employees]
  )

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map(e => [e.id, e])),
    [employees]
  )

  const monthShifts = useMemo(
    () => shifts.filter(s => !filterMonth || s.date.startsWith(filterMonth)),
    [shifts, filterMonth]
  )

  const summaryData = useMemo((): EmpStats[] =>
    activeEmployees.map(emp => {
      const empShifts = monthShifts.filter(s => s.employeeId === emp.id)
      return aggregateShifts(empShifts, emp)
    }),
    [activeEmployees, monthShifts]
  )

  const selectedEmployee = selectedId ? employeeMap[selectedId] : null

  const detailShifts = useMemo(
    () => selectedId
      ? monthShifts.filter(s => s.employeeId === selectedId).sort((a, b) => a.date.localeCompare(b.date))
      : [],
    [monthShifts, selectedId]
  )

  function handleDownload() {
    const label = filterMonth ? formatMonth(filterMonth) : 'כל הזמן'
    const headers = ['שם', 'שעות רגילות', 'שעות שבת', 'שעות אחמ"ש', 'שכר']
    const rows = summaryData.map(d => [
      d.employee.name,
      Math.round(d.regular * 10) / 10,
      Math.round(d.shabbat * 10) / 10,
      Math.round(d.support * 10) / 10,
      Math.round(d.salary),
    ])
    const ws = XLSX.utils.aoa_to_sheet([[label], [], headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'שעות')
    XLSX.writeFile(wb, `שעות_${filterMonth || 'כל'}.xlsx`)
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="שעות"
        action={!selectedEmployee ? (
          <button className={styles.xlsxBtn} onClick={handleDownload} aria-label="הורד XLSX">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v9m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        ) : undefined}
      />

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
        <select
          className={styles.filterSelect}
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          <option value="">כל העובדים</option>
          {activeEmployees.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : selectedEmployee ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>סוג</th>
                <th className={styles.numHeader}>שע׳ רגיל</th>
                <th className={styles.numHeader}>שע׳ שבת</th>
                <th className={styles.numHeader}>שכר</th>
              </tr>
            </thead>
            <tbody>
              {detailShifts.length === 0 ? (
                <tr><td colSpan={5} className={styles.emptyCell}>אין משמרות בחודש זה</td></tr>
              ) : detailShifts.map(s => {
                const h = splitShiftHours(s.date, s.startTime, s.endTime, s.type)
                const shiftSalary = calcSalary(h.regular, h.shabbat, h.support, s.tips ?? 0, selectedEmployee.hourlyWage)
                return (
                  <tr key={s.id}>
                    <td className={styles.dateCell}>{formatDateShort(s.date)}</td>
                    <td><Badge type={s.type} label={SHIFT_TYPE_LABELS[s.type]} /></td>
                    <td className={styles.numCell}>{fmtH(h.regular)}</td>
                    <td className={styles.numCell}>{fmtH(h.shabbat)}</td>
                    <td className={styles.numCell}>₪{fmtMoney(shiftSalary)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : summaryData.every(d => d.shiftCount === 0) ? (
        <EmptyState title="אין משמרות" description="לא דווחו משמרות בחודש זה." />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>עובד</th>
                <th className={styles.numHeader}>שע׳ רגיל</th>
                <th className={styles.numHeader}>שע׳ שבת</th>
                <th className={styles.numHeader}>שכר</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map(d => (
                <tr
                  key={d.employee.id}
                  className={styles.clickableRow}
                  onClick={() => setSelectedId(d.employee.id)}
                >
                  <td className={styles.nameCell}>{d.employee.name}</td>
                  <td className={styles.numCell}>{fmtH(d.regular)}</td>
                  <td className={styles.numCell}>{fmtH(d.shabbat)}</td>
                  <td className={styles.numCell}>
                    {d.shiftCount > 0 ? `₪${fmtMoney(d.salary)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
