import type { ShiftType, BlockType } from '../types'

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  regular: 'רגיל',
  kitchen: 'מטבח',
  support: 'אחמ"ש',
  manager: 'פיק',
  overlap: 'חפיפה',
  general: 'כללי',
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

// Returns regular/shabbat/support breakdown for a shift.
// Support type → all hours go to support.
// Friday 14:00–end-of-day and Saturday 00:00–20:00 are shabbat.
export function splitShiftHours(
  date: string,
  startTime: string,
  endTime: string,
  type: ShiftType,
): { regular: number; shabbat: number; support: number } {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let startMins = sh * 60 + sm
  let endMins   = eh * 60 + em
  if (endMins <= startMins) endMins += 24 * 60
  const totalMins = endMins - startMins

  if (type === 'support') return { regular: 0, shabbat: 0, support: totalMins / 60 }

  const dow = new Date(date + 'T12:00:00').getDay() // 5=Fri, 6=Sat

  if (dow === 5) {
    const cut = 14 * 60
    const reg  = Math.max(0, Math.min(endMins, cut) - startMins)
    const shab = Math.max(0, endMins - Math.max(startMins, cut))
    return { regular: reg / 60, shabbat: shab / 60, support: 0 }
  }

  if (dow === 6) {
    const cut = 20 * 60
    const shab = Math.max(0, Math.min(endMins, cut) - startMins)
    const reg  = Math.max(0, endMins - Math.max(startMins, cut))
    return { regular: reg / 60, shabbat: shab / 60, support: 0 }
  }

  return { regular: totalMins / 60, shabbat: 0, support: 0 }
}

// salary = regular*wage + shabbat*51.48 + MAX(0, tips - 15*(regular+shabbat)) + support*50
export function calcSalary(
  regular: number,
  shabbat: number,
  support: number,
  tips: number,
  hourlyWage: number,
): number {
  return (
    regular * hourlyWage +
    shabbat * 51.48 +
    Math.max(0, tips - 15 * (regular + shabbat)) +
    support * 50
  )
}

export function fmtMoney(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function isWithinEditWindow(submittedAt: string): boolean {
  return Date.now() - new Date(submittedAt).getTime() < 24 * 60 * 60 * 1000
}
