import type { ShiftType, BlockType, HolidaySetting } from '../types'

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
  nesia: 'נסיעות (ידני)',
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
// Friday 14:00–end-of-day and Saturday 00:00–20:00 are shabbat by default (overridden per month via shabbat_settings).
// holidayPeriods → manager-defined ranges; 150% goes to shabbat bucket, 200% goes to holiday bucket.
export const MINIMUM_WAGE = 35.4
export const SHABBAT_RATE = MINIMUM_WAGE * 1.5  // 53.1
export const HOLIDAY_RATE = MINIMUM_WAGE * 2.0  // 70.8

// Classify a contiguous time range [startMs, endMs] into regular and shabbat minutes
// based on the day-of-week Shabbat window. Iterates calendar day by calendar day.
function classifyNonHolidayMins(
  startMs: number,
  endMs: number,
  fridayStartMins: number,
  saturdayEndMins: number,
): { regular: number; shabbat: number } {
  let regular = 0
  let shabbat = 0
  let cursor = startMs
  while (cursor < endMs) {
    const dt = new Date(cursor)
    const dayStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const segEnd = Math.min(endMs, dayEnd)
    const segStartMin = (cursor - dayStart) / 60000
    const segEndMin   = (segEnd  - dayStart) / 60000
    const segMins = segEndMin - segStartMin
    const dow = dt.getDay()
    if (dow === 5) {
      const regMins  = Math.max(0, Math.min(segEndMin, fridayStartMins) - segStartMin)
      regular += regMins
      shabbat += Math.max(0, segMins - regMins)
    } else if (dow === 6) {
      const shabMins = Math.max(0, Math.min(segEndMin, saturdayEndMins) - segStartMin)
      shabbat += shabMins
      regular += Math.max(0, segMins - shabMins)
    } else {
      regular += segMins
    }
    cursor = dayEnd
  }
  return { regular, shabbat }
}

export function splitShiftHours(
  date: string,
  startTime: string,
  endTime: string,
  type: ShiftType,
  fridayStartMins = 14 * 60,
  saturdayEndMins = 20 * 60,
  holidayPeriods: HolidaySetting[] = [],
): { regular: number; shabbat: number; holiday: number; support: number } {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let startMins = sh * 60 + sm
  let endMins   = eh * 60 + em
  if (endMins <= startMins) endMins += 24 * 60
  const totalMins = endMins - startMins

  if (type === 'global' || type === 'taxi' || type === 'cashier') return { regular: 0, shabbat: 0, holiday: 0, support: 0 }

  // Convert shift to absolute ms; endMs accounts for midnight-crossing shifts
  const shiftStartMs = new Date(`${date}T${startTime}:00`).getTime()
  const shiftEndMs   = shiftStartMs + totalMins * 60000

  // Find and merge overlapping holiday intervals within the shift window
  const raw: { start: number; end: number; rate: HolidaySetting['rate'] }[] = []
  for (const hp of holidayPeriods) {
    const hpStart = new Date(`${hp.startDate}T${hp.startTime}:00`).getTime()
    const hpEnd   = new Date(`${hp.endDate}T${hp.endTime}:00`).getTime()
    const oStart  = Math.max(shiftStartMs, hpStart)
    const oEnd    = Math.min(shiftEndMs,   hpEnd)
    if (oEnd > oStart) raw.push({ start: oStart, end: oEnd, rate: hp.rate })
  }
  raw.sort((a, b) => a.start - b.start)
  const intervals: typeof raw = []
  for (const iv of raw) {
    const last = intervals[intervals.length - 1]
    if (!last || iv.start >= last.end) {
      intervals.push({ ...iv })
    } else {
      last.end = Math.max(last.end, iv.end)
      if (iv.rate === '200') last.rate = '200' // higher rate wins on overlap
    }
  }

  // Tally holiday minutes by rate
  let holiday200Mins = 0
  let holiday150Mins = 0
  for (const iv of intervals) {
    const mins = (iv.end - iv.start) / 60000
    if (iv.rate === '200') holiday200Mins += mins
    else holiday150Mins += mins
  }

  // Non-holiday gaps → classify by weekday/Shabbat rules
  const gaps: { start: number; end: number }[] = []
  let cursor = shiftStartMs
  for (const iv of intervals) {
    if (iv.start > cursor) gaps.push({ start: cursor, end: iv.start })
    cursor = iv.end
  }
  if (cursor < shiftEndMs) gaps.push({ start: cursor, end: shiftEndMs })

  let regularMins = 0
  let shabbatMins = 0
  for (const gap of gaps) {
    const r = classifyNonHolidayMins(gap.start, gap.end, fridayStartMins, saturdayEndMins)
    regularMins += r.regular
    shabbatMins += r.shabbat
  }

  // 150% holiday hours → shabbat bucket (same rate, display together)
  // 200% holiday hours → holiday bucket (higher rate)
  const regularHours = regularMins / 60
  const shabbatHours = shabbatMins / 60 + holiday150Mins / 60
  const holidayHours = holiday200Mins / 60

  if (type === 'support') {
    return { regular: 0, shabbat: shabbatHours, holiday: holidayHours, support: regularHours }
  }
  return { regular: regularHours, shabbat: shabbatHours, holiday: holidayHours, support: 0 }
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
    ...(totalHours > 0 ? [`${hoursStr} שעות (${data.startTime}–${data.endTime})`] : []),
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
