import type { ShiftType, BlockType, DayType } from '../types'

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  regular: 'רגיל',
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
  kitchen: 'מטבח',
  support: 'אחמ"ש',
  manager: 'פיק',
  overlap: 'חפיפה',
  general: 'כללי',
  global: 'גלובלי',
  taxi: 'מוניות',
  cashier: 'נתוני קופה בלבד',
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric' }).format(date)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function todayString(): string {
  const d = new Date()
  // Before 08:00 treat it as still the previous day (night-shift workers filling in after midnight)
  if (d.getHours() < 8) d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function currentTimeString(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(date)
}

export function monthOptions(count = 24): { value: string; label: string }[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value: ym, label: formatMonth(ym) }
  })
}

export function shiftHours(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  const h = mins / 60
  return `${h % 1 === 0 ? h : h.toFixed(1)} שעות`
}

// Returns regular/shabbat/holiday/support breakdown for a shift.
// Support type → regular-day hours go to support (₪50 flat); Shabbat/holiday hours go to shabbat/holiday bucket.
// Friday 14:00–end-of-day and Saturday 00:00–20:00 are shabbat (when dayType is 'auto').
// dayType 'shabbat' → all hours at shabbat rate (150% of minimum wage).
// dayType 'holiday' → all hours at holiday rate (200% of minimum wage).
export const MINIMUM_WAGE = 35.4
export const SHABBAT_RATE = MINIMUM_WAGE * 1.5  // 53.1
export const HOLIDAY_RATE = MINIMUM_WAGE * 2.0  // 70.8

export function splitShiftHours(
  date: string,
  startTime: string,
  endTime: string,
  type: ShiftType,
  dayType?: DayType,
  fridayStartMins = 14 * 60,
  saturdayEndMins = 20 * 60,
): { regular: number; shabbat: number; holiday: number; support: number } {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let startMins = sh * 60 + sm
  let endMins   = eh * 60 + em
  if (endMins <= startMins) endMins += 24 * 60
  const totalMins = endMins - startMins
  const totalHours = totalMins / 60

  if (type === 'global' || type === 'taxi' || type === 'cashier') return { regular: 0, shabbat: 0, holiday: 0, support: 0 }

  // Explicit day-type overrides (apply to both support and regular shift types)
  if (dayType === 'holiday') return { regular: 0, shabbat: 0, holiday: totalHours, support: 0 }
  if (dayType === 'shabbat') return { regular: 0, shabbat: totalHours, holiday: 0, support: 0 }

  // 'auto' or undefined — detect from actual weekday
  const dow = new Date(date + 'T12:00:00').getDay() // 5=Fri, 6=Sat

  if (dow === 5) {
    const cut = fridayStartMins
    const regMins  = Math.max(0, Math.min(endMins, cut) - startMins)
    const shabMins = Math.max(0, endMins - Math.max(startMins, cut))
    if (type === 'support') return { regular: 0, shabbat: shabMins / 60, holiday: 0, support: regMins / 60 }
    return { regular: regMins / 60, shabbat: shabMins / 60, holiday: 0, support: 0 }
  }

  if (dow === 6) {
    const cut = saturdayEndMins
    const shabMins = Math.max(0, Math.min(endMins, cut) - startMins)
    const regMins  = Math.max(0, endMins - Math.max(startMins, cut))
    if (type === 'support') return { regular: 0, shabbat: shabMins / 60, holiday: 0, support: regMins / 60 }
    return { regular: regMins / 60, shabbat: shabMins / 60, holiday: 0, support: 0 }
  }

  if (type === 'support') return { regular: 0, shabbat: 0, holiday: 0, support: totalHours }
  return { regular: totalHours, shabbat: 0, holiday: 0, support: 0 }
}

// ---------------------------------------------------------------------------
// Tip distribution
// ---------------------------------------------------------------------------

/** Convert "HH:mm" to minutes from midnight. */
function toMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/**
 * Given all shifts on a single date, compute each worker's share of the tips.
 *
 * Rules:
 *  - Each shift that has tips > 0 (and is not support/global/taxi) defines a
 *    tip pool whose time window is that shift's startTime–endTime.
 *  - Every non-support/non-flat shift on the same date that overlaps that
 *    window (including the submitting shift itself) shares the pool
 *    proportionally by overlap minutes.
 *  - If a shift crosses midnight its endTime is treated as endTime + 24h for
 *    the overlap maths (shift.date is always the correct calendar day).
 *  - Late submissions: because this is computed fresh at display time, any
 *    subsequently added shift automatically joins the relevant pool.
 *
 * Returns a Map<employeeId, totalDistributedTips>.
 */
import type { Shift } from '../types'

export function computeTipDistribution(shiftsOnDate: Shift[]): Map<string, number> {
  const result = new Map<string, number>()

  const isFlat = (s: Shift) => s.type === 'support' || s.type === 'global' || s.type === 'taxi' || s.type === 'cashier'

  // Eligible shifts can RECEIVE tips (non-support, non-flat)
  const eligible = shiftsOnDate.filter(s => !isFlat(s))

  // Tip-pool shifts: eligible shifts that actually submitted tips
  const pools = eligible.filter(s => (s.tips ?? 0) > 0)

  for (const pool of pools) {
    let pStart = toMins(pool.startTime)
    let pEnd   = toMins(pool.endTime)
    if (pEnd <= pStart) pEnd += 24 * 60   // crosses midnight

    // Compute each eligible shift's overlap with this pool window
    const overlapMins = new Map<string, number>()
    let totalMins = 0

    for (const s of eligible) {
      let sStart = toMins(s.startTime)
      let sEnd   = toMins(s.endTime)
      if (sEnd <= sStart) sEnd += 24 * 60  // crosses midnight

      const overlap = Math.max(0, Math.min(sEnd, pEnd) - Math.max(sStart, pStart))
      if (overlap > 0) {
        overlapMins.set(s.employeeId, (overlapMins.get(s.employeeId) ?? 0) + overlap)
        totalMins += overlap
      }
    }

    if (totalMins === 0) continue

    const tipPool = pool.tips!
    for (const [empId, mins] of overlapMins) {
      const share = tipPool * (mins / totalMins)
      result.set(empId, (result.get(empId) ?? 0) + share)
    }
  }

  return result
}

// salary = regular*wage + shabbat*SHABBAT_RATE + holiday*HOLIDAY_RATE
//        + MAX(0, tips - 15*(regular+shabbat+holiday)) + support*50
export function calcSalary(
  regular: number,
  shabbat: number,
  support: number,
  tips: number,
  hourlyWage: number,
  holiday = 0,
): number {
  const paidHours = regular + shabbat + holiday
  return (
    regular * hourlyWage +
    shabbat * SHABBAT_RATE +
    holiday * HOLIDAY_RATE +
    Math.max(0, tips - 15 * paidHours) +
    support * 50
  )
}

export function fmtMoney(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** SHA-256 hash using the built-in Web Crypto API. No external dependencies. */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isWithinEditWindow(submittedAt: string): boolean {
  const s = new Date(submittedAt)
  // Edit allowed until end of the calendar day after submission day
  const endOfNextDay = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1, 23, 59, 59, 999)
  return Date.now() <= endOfNextDay.getTime()
}

import type { CreateShiftInput } from '../types'

export function formatEmployeeNameForMessage(fullName: string, allNames: string[]): string {
  const parts = fullName.trim().split(/\s+/)
  const firstName = parts[0]
  const hasDuplicate = allNames.some(n => n !== fullName && n.trim().split(/\s+/)[0] === firstName)
  if (!hasDuplicate) return firstName
  return parts.length > 1 ? `${firstName} ${parts[1][0]}.` : firstName
}

export function buildShiftMessage(data: CreateShiftInput, employeeName: string): string {
  const [sh, sm] = data.startTime.split(':').map(Number)
  const [eh, em] = data.endTime.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  const totalHours = mins / 60
  const hoursStr = totalHours % 1 === 0 ? String(totalHours) : totalHours.toFixed(1)

  const dateObj = new Date(data.date + 'T00:00:00')
  const dateStr = new Intl.DateTimeFormat('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(dateObj)

  const lines: string[] = [
    `📋 ${dateStr}`,
    employeeName,
    SHIFT_TYPE_LABELS[data.type],
    `${hoursStr} שעות (${data.startTime}–${data.endTime})`,
  ]

  const hasCash = data.revenue != null || data.cash != null || data.credit != null || data.tips != null
  if (hasCash) {
    lines.push('', 'פרטי קופה:')
    if (data.revenue != null) lines.push(`סה"כ: ₪${fmtMoney(data.revenue)}`)
    if (data.credit  != null) lines.push(`אשראי: ₪${fmtMoney(data.credit)}`)
    if (data.cash    != null) lines.push(`מזומן: ₪${fmtMoney(data.cash)}`)
    if (data.tips    != null) lines.push(`טיפ: ₪${fmtMoney(data.tips)}`)
  }

  return lines.join('\n')
}
