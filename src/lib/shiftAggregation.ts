import type { Shift, Employee, HolidaySetting } from '../types'
import { splitShiftHours, calcSalary } from './utils'

// Shift types that cannot receive a share of a tip pool (flat-pay / data-only).
const TIP_INELIGIBLE = new Set<Shift['type']>(['support', 'global', 'taxi', 'cashier', 'nesia'])

export const NESIA_RATE = 8 // ₪ per shift

export interface EmpStats {
  employee: Employee
  regular: number
  shabbat: number
  holiday: number
  support: number
  /** Reporting-only: pure Fri/Sat weekend hours (excludes holiday). */
  weekend: number
  /** Reporting-only: all holiday hours (150% + 200%), incl. holidays on Saturday. */
  holidayAll: number
  tips: number
  global: number
  taxi: number
  shiftCount: number
  hourlySalary: number
  nesia: number
  salary: number
}

/**
 * Build a per-date tip map: date → (employeeId → tips received that date).
 *
 * Tips reported on a shift form a pool that is shared proportionally by overlap
 * time among every tip-eligible shift running during that pool's window.
 * Overlap is computed on ABSOLUTE timestamps (date + time, with midnight
 * crossing), so a shift that runs past midnight pools correctly with the rest
 * of the same physical night even when colleagues filed under a different
 * calendar date. Each receiver's share is attributed to the date of their own
 * shift, so downstream per-date lookups stay correct.
 *
 * Pass the widest set of shifts available (ideally all of them) so pools at
 * date/month boundaries are not truncated.
 */
export function buildTipMap(allShifts: Shift[]): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()
  const add = (date: string, empId: string, amt: number) => {
    let m = result.get(date)
    if (!m) { m = new Map(); result.set(date, m) }
    m.set(empId, (m.get(empId) ?? 0) + amt)
  }

  const eligible = allShifts
    .filter(s => !TIP_INELIGIBLE.has(s.type))
    .map(s => {
      const [sh, sm] = s.startTime.split(':').map(Number)
      const [eh, em] = s.endTime.split(':').map(Number)
      let startMin = sh * 60 + sm
      let endMin = eh * 60 + em
      if (endMin <= startMin) endMin += 24 * 60 // crosses midnight
      const startMs = new Date(`${s.date}T${s.startTime}:00`).getTime()
      const endMs = startMs + (endMin - startMin) * 60000
      return { date: s.date, empId: s.employeeId, tips: s.tips ?? 0, startMs, endMs }
    })

  for (const pool of eligible) {
    if (pool.tips <= 0) continue
    const parts: { date: string; empId: string; mins: number }[] = []
    let totalMins = 0
    for (const e of eligible) {
      const overlap = Math.min(e.endMs, pool.endMs) - Math.max(e.startMs, pool.startMs)
      if (overlap > 0) {
        const mins = overlap / 60000
        parts.push({ date: e.date, empId: e.empId, mins })
        totalMins += mins
      }
    }
    if (totalMins === 0) continue
    for (const p of parts) add(p.date, p.empId, pool.tips * (p.mins / totalMins))
  }
  return result
}

export function aggregateShifts(
  shifts: Shift[],
  employee: Employee,
  tipMap: Map<string, Map<string, number>>,
  getTimesForDate: (date: string) => { fridayStartMins: number; saturdayEndMins: number },
  holidayPeriods: HolidaySetting[],
): EmpStats {
  let regular = 0, shabbat = 0, holiday = 0, support = 0, tips = 0, globalAmt = 0, taxiAmt = 0, shiftCount = 0
  let weekend = 0, holidayAll = 0
  let nesiaOverride: number | null = null

  for (const s of shifts) {
    if (s.type === 'global') {
      globalAmt += s.amount ?? 0
    } else if (s.type === 'taxi') {
      taxiAmt += s.amount ?? 0
    } else if (s.type === 'nesia') {
      nesiaOverride = s.amount ?? 0
    } else if (s.type === 'cashier') {
      // data-only
    } else {
      const { fridayStartMins, saturdayEndMins } = getTimesForDate(s.date)
      const h = splitShiftHours(s.date, s.startTime, s.endTime, s.type, fridayStartMins, saturdayEndMins, holidayPeriods)
      regular  += h.regular
      shabbat  += h.shabbat
      holiday  += h.holiday
      support  += h.support
      weekend  += h.weekend
      holidayAll += h.holidayAll
      shiftCount++
    }
  }

  const workedDates = [...new Set(
    shifts
      .filter(s => s.type !== 'global' && s.type !== 'taxi' && s.type !== 'cashier' && s.type !== 'nesia')
      .map(s => s.date)
  )]
  for (const date of workedDates) {
    tips += tipMap.get(date)?.get(employee.id) ?? 0
  }

  const hourlySalary = calcSalary(regular, shabbat, support, tips, employee.hourlyWage, holiday)
  const nesia = nesiaOverride !== null ? nesiaOverride : shiftCount * NESIA_RATE

  return {
    employee,
    regular, shabbat, holiday, support, tips,
    weekend, holidayAll,
    global: globalAmt,
    taxi: taxiAmt,
    shiftCount,
    hourlySalary,
    nesia,
    salary: hourlySalary + globalAmt + taxiAmt + nesia,
  }
}
