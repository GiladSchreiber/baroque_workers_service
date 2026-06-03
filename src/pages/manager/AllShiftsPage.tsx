import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useShiftStore } from '../../store/shiftStore'
import { useEmployeeStore } from '../../store/employeeStore'
import { useShabbatSettingsStore } from '../../store/shabbatSettingsStore'
import { useHolidaySettingsStore } from '../../store/holidaySettingsStore'
import { PageHeader } from '../../components/layout/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ShabbatSettingsModal } from '../../components/modals/ShabbatSettingsModal'
import { HolidaySettingsModal } from '../../components/modals/HolidaySettingsModal'
import {
  SHIFT_TYPE_LABELS, formatDateShort, currentMonthStr, monthOptions, formatMonth,
  splitShiftHours, calcSalary, fmtMoney,
} from '../../lib/utils'
import type { Shift } from '../../types'
import { aggregateShifts, buildTipMap, type EmpStats } from '../../lib/shiftAggregation'
import styles from './AllShiftsPage.module.scss'

const MONTH_OPTIONS = [{ value: '', label: 'כל הזמן' }, ...monthOptions(24)]

function fmtH(h: number): string {
  if (h === 0) return '—'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

function formatDateWithDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${String(y).slice(2)}, יום ${dayNames[date.getDay()]}`
}

export function AllShiftsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { shifts, isLoading, fetchAll: fetchShifts, addShift, updateShift } = useShiftStore()
  const { employees, fetchAll: fetchEmployees } = useEmployeeStore()
  const { fetchAll: fetchShabbatSettings, getTimesForDate } = useShabbatSettingsStore()
  const { periods: holidayPeriods, fetchAll: fetchHolidaySettings } = useHolidaySettingsStore()

  // Persist filter state in the URL so back-navigation restores the exact view
  const filterMonth = searchParams.get('month') ?? currentMonthStr()
  const selectedId  = searchParams.get('employee') ?? ''
  const viewMode    = (searchParams.get('view') ?? 'worker') as 'worker' | 'date'
  const shabbatModalOpen  = searchParams.get('shabbatModal') === '1'
  const holidayModalOpen  = searchParams.get('holidayModal') === '1'

  function setFilterMonth(m: string) {
    setSearchParams(p => { p.set('month', m); p.delete('employee'); return p }, { replace: true })
  }
  function setSelectedId(id: string) {
    setSearchParams(p => { id ? p.set('employee', id) : p.delete('employee'); return p }, { replace: true })
  }
  function setViewMode(v: 'worker' | 'date') {
    setSearchParams(p => { p.set('view', v); p.delete('employee'); return p }, { replace: true })
  }
  function setShabbatModalOpen(v: boolean) {
    setSearchParams(p => { v ? p.set('shabbatModal', '1') : p.delete('shabbatModal'); return p }, { replace: true })
  }
  function setHolidayModalOpen(v: boolean) {
    setSearchParams(p => { v ? p.set('holidayModal', '1') : p.delete('holidayModal'); return p }, { replace: true })
  }

  useEffect(() => {
    fetchShifts()
    fetchEmployees()
    fetchShabbatSettings()
    fetchHolidaySettings()
  }, [fetchShifts, fetchEmployees, fetchShabbatSettings, fetchHolidaySettings])

  const activeEmployees = useMemo(
    () => employees.filter(e => e.isActive && !e.roles.includes('manager')),
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

  // Tip map is built from ALL shifts in the period so cross-worker overlaps are correct
  const tipMap = useMemo(() => buildTipMap(monthShifts), [monthShifts])

  const summaryData = useMemo((): EmpStats[] =>
    activeEmployees.map(emp => {
      const empShifts = monthShifts.filter(s => s.employeeId === emp.id)
      return aggregateShifts(empShifts, emp, tipMap, getTimesForDate, holidayPeriods)
    }),
    [activeEmployees, monthShifts, tipMap, getTimesForDate, holidayPeriods]
  )

  const selectedEmployee = selectedId ? employeeMap[selectedId] : null

  // By-date view: group shifts by calendar date (skip meta/flat/data-only types)
  const byDateData = useMemo(() => {
    if (viewMode !== 'date') return []
    const skipTypes = new Set(['cashier', 'nesia', 'global'])
    const grouped = new Map<string, Shift[]>()
    for (const s of monthShifts) {
      if (skipTypes.has(s.type)) continue
      if (!grouped.has(s.date)) grouped.set(s.date, [])
      grouped.get(s.date)!.push(s)
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayShifts]) => [
        date,
        [...dayShifts].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      ] as [string, Shift[]])
  }, [monthShifts, viewMode])

  // Inline nesia editing
  const [nesiaEditing, setNesiaEditing] = useState(false)
  const [nesiaVal, setNesiaVal] = useState('')
  const nesiaInputRef = useRef<HTMLInputElement>(null)

  async function commitNesia(currentNesia: number) {
    setNesiaEditing(false)
    const parsed = parseFloat(nesiaVal)
    if (isNaN(parsed) || parsed === currentNesia || !selectedId) return
    try {
      const nesiaShift = detailShifts.find(s => s.type === 'nesia')
      if (nesiaShift) {
        await updateShift(nesiaShift.id, { amount: parsed })
      } else {
        await addShift({
          employeeId: selectedId,
          date: (filterMonth || currentMonthStr()) + '-01',
          type: 'nesia',
          startTime: '00:00',
          endTime: '00:00',
          amount: parsed,
        })
      }
    } catch (err) {
      console.error('שגיאה בשמירת נסיעות:', err)
      alert(`שגיאה בשמירת נסיעות: ${err instanceof Error ? err.message : JSON.stringify(err)}`)
    }
  }

  // Prev/next worker navigation
  const selectedIdx = useMemo(
    () => summaryData.findIndex(d => d.employee.id === selectedId),
    [summaryData, selectedId]
  )
  const canGoPrev = selectedIdx > 0
  const canGoNext = selectedIdx !== -1 && selectedIdx < summaryData.length - 1

  const detailShifts = useMemo(
    () => selectedId
      ? monthShifts.filter(s => s.employeeId === selectedId).sort((a, b) => a.date.localeCompare(b.date))
      : [],
    [monthShifts, selectedId]
  )

  function handleDownload() {
    const label = filterMonth ? formatMonth(filterMonth) : 'כל הזמן'
    // Columns ordered RTL: rightmost first → leftmost last
    const headers = [
      'סה"כ',
      'מוניות שבת',
      'נסיעות',
      'גלובאלי',
      'סה"כ שכר שעתי',
      'שעות שבת', 'שעות משמרת',
      'משמרות',
      'ת.ז.', 'שם',
    ]
    const rows = summaryData.map(d => [
      Math.round(d.salary),
      Math.round(d.taxi),
      Math.round(d.nesia),
      Math.round(d.global),
      Math.round(d.hourlySalary),
      Math.round(d.shabbat * 10) / 10,
      Math.round((d.regular + d.support) * 10) / 10,
      d.shiftCount,
      d.employee.idNumber ?? '',
      d.employee.name,
    ])
    const ws = XLSX.utils.aoa_to_sheet([[label], [], headers, ...rows])
    ws['!views'] = [{ rightToLeft: true }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'שעות')
    XLSX.writeFile(wb, `שעות_${filterMonth || 'כל'}.xlsx`)
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="שעות"
        action={
          <div className={styles.headerActions}>
            {selectedEmployee && (
              <button
                className={styles.addBtn}
                onClick={() => navigate(`/manager/shifts/new?employeeId=${selectedEmployee.id}`)}
                aria-label="הוסף רשומה"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {!selectedEmployee && (
              <button className={styles.xlsxBtn} onClick={handleDownload} aria-label="הורד XLSX">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v9m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        }
      />

      <div className={styles.filterBar}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'worker' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('worker')}
          >לפי עובד</button>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'date' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('date')}
          >לפי תאריך</button>
        </div>
        <select
          className={`${styles.filterSelect} ${viewMode === 'date' ? styles.fullWidth : ''}`}
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          {MONTH_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {viewMode === 'worker' ? (
          <div className={styles.employeeSelector}>
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
            {selectedId && (
              <>
                <button
                  className={styles.workerNavBtn}
                  disabled={!canGoNext}
                  onClick={() => setSelectedId(summaryData[selectedIdx + 1].employee.id)}
                  aria-label="עובד הבא"
                >‹</button>
                <button
                  className={styles.workerNavBtn}
                  disabled={!canGoPrev}
                  onClick={() => setSelectedId(summaryData[selectedIdx - 1].employee.id)}
                  aria-label="עובד הקודם"
                >›</button>
              </>
            )}
          </div>
        ) : null}
        <button className={styles.shabbatBtn} onClick={() => setShabbatModalOpen(true)}>
          שעות שבת
        </button>
        <button className={styles.shabbatBtn} onClick={() => setHolidayModalOpen(true)}>
          שעות חג
        </button>
      </div>

      <ShabbatSettingsModal
        isOpen={shabbatModalOpen}
        initialMonth={filterMonth || currentMonthStr()}
        onClose={() => setShabbatModalOpen(false)}
      />
      <HolidaySettingsModal
        isOpen={holidayModalOpen}
        initialMonth={filterMonth || currentMonthStr()}
        onClose={() => setHolidayModalOpen(false)}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : viewMode === 'date' ? (
        byDateData.length === 0 ? (
          <EmptyState title="אין משמרות" description="לא דווחו משמרות בחודש זה." />
        ) : (
          <div className={styles.byDateContainer}>
            {byDateData.map(([date, dayShifts]) => {
              const rows = dayShifts.map(s => {
                const isFlat = s.type === 'global' || s.type === 'taxi'
                const emp = employeeMap[s.employeeId]
                const { fridayStartMins, saturdayEndMins } = getTimesForDate(s.date)
                const h = isFlat
                  ? { regular: 0, shabbat: 0, holiday: 0, support: 0 }
                  : splitShiftHours(s.date, s.startTime, s.endTime, s.type, fridayStartMins, saturdayEndMins, holidayPeriods)
                const tip = isFlat ? 0 : (tipMap.get(s.date)?.get(s.employeeId) ?? 0)
                const salary = isFlat
                  ? (s.amount ?? 0)
                  : calcSalary(h.regular, h.shabbat, h.support, tip, emp?.hourlyWage ?? 0, h.holiday)
                return { s, h, salary, isFlat }
              })
              const dayTotal = rows.reduce((sum, r) => sum + r.salary, 0)
              return (
                <div key={date} className={styles.dateSection}>
                  <div className={styles.dateSectionHeader}>{formatDateWithDay(date)}</div>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>סוג</th>
                        <th>עובד</th>
                        <th className={styles.numHeader}>שע׳ רגיל</th>
                        <th className={styles.numHeader}>שע׳ שבת</th>
                        <th className={styles.numHeader}>שכר</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ s, h, salary, isFlat }) => (
                        <tr
                          key={s.id}
                          className={styles.clickableRow}
                          onClick={() => navigate(`/manager/shifts/${s.id}/edit`)}
                        >
                          <td><Badge type={s.type} label={SHIFT_TYPE_LABELS[s.type]} /></td>
                          <td className={styles.nameCell}>{employeeMap[s.employeeId]?.name ?? '?'}</td>
                          <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.regular + h.support)}</td>
                          <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.shabbat + h.holiday)}</td>
                          <td className={styles.numCell}>₪{fmtMoney(salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.totalRow}>
                        <td colSpan={4} className={styles.totalLabel}>סה"כ יום</td>
                        <td className={styles.numCell}>₪{fmtMoney(dayTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })}
          </div>
        )
      ) : selectedEmployee ? (() => {
        const empStats = aggregateShifts(detailShifts, selectedEmployee, tipMap, getTimesForDate, holidayPeriods)
        return (
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
                ) : detailShifts.filter(s => s.type !== 'nesia').map(s => {
                  const isFlat = s.type === 'global' || s.type === 'taxi' || s.type === 'cashier'
                  const { fridayStartMins, saturdayEndMins } = getTimesForDate(s.date)
                  const h = isFlat ? { regular: 0, shabbat: 0, holiday: 0, support: 0 } : splitShiftHours(s.date, s.startTime, s.endTime, s.type, fridayStartMins, saturdayEndMins, holidayPeriods)
                  const distributedTipForDate = isFlat ? 0 : (tipMap.get(s.date)?.get(selectedEmployee.id) ?? 0)
                  const shiftSalary = isFlat
                    ? (s.amount ?? 0)
                    : calcSalary(h.regular, h.shabbat, h.support, distributedTipForDate, selectedEmployee.hourlyWage, h.holiday)
                  return (
                    <tr
                      key={s.id}
                      className={styles.clickableRow}
                      onClick={() => navigate(`/manager/shifts/${s.id}/edit`)}
                    >
                      <td className={styles.dateCell}>{formatDateShort(s.date)}</td>
                      <td><Badge type={s.type} label={SHIFT_TYPE_LABELS[s.type]} /></td>
                      <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.regular + h.support)}</td>
                      <td className={styles.numCell}>{isFlat ? '—' : fmtH(h.shabbat + h.holiday)}</td>
                      <td className={styles.numCell}>₪{fmtMoney(shiftSalary)}</td>
                    </tr>
                  )
                })}
                {empStats.shiftCount > 0 && (
                  <tr
                    className={`${styles.nesiaRow} ${styles.clickableRow}`}
                    onClick={() => {
                      if (nesiaEditing) return
                      setNesiaVal(String(Math.round(empStats.nesia)))
                      setNesiaEditing(true)
                      setTimeout(() => nesiaInputRef.current?.select(), 0)
                    }}
                    title="לחץ לעריכה"
                  >
                    <td className={styles.dateCell}>—</td>
                    <td><Badge type="support" label='נסיעות' /></td>
                    <td className={styles.numCell}>—</td>
                    <td className={styles.numCell}>—</td>
                    <td className={styles.numCell}>
                      {nesiaEditing ? (
                        <input
                          ref={nesiaInputRef}
                          className={styles.nesiaInput}
                          type="number"
                          value={nesiaVal}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setNesiaVal(e.target.value)}
                          onBlur={() => commitNesia(empStats.nesia)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.currentTarget.blur() }
                            if (e.key === 'Escape') { setNesiaEditing(false) }
                          }}
                        />
                      ) : (
                        <span>₪{fmtMoney(empStats.nesia)}</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
              {detailShifts.length > 0 && (
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan={4} className={styles.totalLabel}>סה"כ</td>
                    <td className={styles.numCell}>₪{fmtMoney(empStats.salary)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )
      })() : summaryData.every(d => d.shiftCount === 0) ? (
        <EmptyState title="אין משמרות" description="לא דווחו משמרות בחודש זה." />
      ) : (() => {
        const grandTotal = summaryData.reduce((sum, d) => sum + d.salary, 0)
        return (
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
                    <td className={styles.numCell}>{fmtH(d.regular + d.support)}</td>
                    <td className={styles.numCell}>{fmtH(d.shabbat + d.holiday)}</td>
                    <td className={styles.numCell}>
                      {d.shiftCount > 0 ? `₪${fmtMoney(d.salary)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
                <tfoot>
                <tr className={styles.totalRow}>
                  <td colSpan={3} className={styles.totalLabel}>סה"כ</td>
                  <td className={styles.numCell}>₪{fmtMoney(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })()}
    </div>
  )
}
