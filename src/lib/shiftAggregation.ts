import type { Shift, Employee, HolidaySetting } from '../types'
import { splitShiftHours, calcSalary, computeTipDistribution } from './utils'

export const NESIA_RATE = 8 // ₪ per shift

export interface EmpStats {
  employee: Employee
  regular: number
  shabbat: number
  holiday: number
  support: number
  tips: number
  global: number
  taxi: number
  shiftCount: number
  hourlySalary: number
  nesia: number
  salary: number
}

export function buildTipMap(allShifts: Shift[]): Map<string, Map<string, number>> {
  const byDate = new Map<string, Shift[]>()
  for (const s of allShifts) {
    if (!byDate.has(s.date)) byDate.set(s.date, [])
    byDate.get(s.date)!.push(s)
  }
  const result = new Map<string, Map<string, number>>()
  for (const [date, dayShifts] of byDate) {
    result.set(date, computeTipDistribution(dayShifts))
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
    global: globalAmt,
    taxi: taxiAmt,
    shiftCount,
    hourlySalary,
    nesia,
    salary: hourlySalary + globalAmt + taxiAmt + nesia,
  }
}
