import type { SlotTemplate, WeekSlotOverride, WeekSlot, ShiftGroup } from '../types/scheduling'

// ---------------------------------------------------------------------------
// Week helpers
// ---------------------------------------------------------------------------

/** Normalize any `week_start` value from DB / persisted state to `YYYY-MM-DD`. */
export function normalizeWeekStart(ws: string): string {
  if (!ws) return ws
  return ws.slice(0, 10)
}

/** Returns the date string (YYYY-MM-DD) of the Sunday that starts the week
 *  containing `date`. If `date` is itself a Sunday it returns that day. */
export function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0=Sun
  d.setDate(d.getDate() - dow)
  return toDateStr(d)
}

/** Sunday of the current week */
export function getCurrentWeekStart(): string {
  return getWeekStart(new Date())
}

/** Sunday of the next week */
export function getNextWeekStart(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 7)
  return toDateStr(d)
}

/** "סידור DD.MM.YY" from a weekStart string */
export function getWeekTitle(weekStart: string): string {
  const [y, m, day] = weekStart.split('-')
  return `סידור ${day}.${m}.${y.slice(2)}`
}

/** Worker availability form opens from Tuesday */
export function isAvailabilityOpen(weekStart: string): boolean {
  const now = new Date()
  const sunday = new Date(weekStart + 'T00:00:00')
  // previous Tuesday = sunday - 5 days
  const openFrom = new Date(sunday)
  openFrom.setDate(openFrom.getDate() - 5)
  openFrom.setHours(0, 0, 0, 0)
  return now >= openFrom
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Slot resolution
// ---------------------------------------------------------------------------

/** Returns the effective slots for a week by applying overrides to templates */
export function getEffectiveSlotsForWeek(
  weekStart: string,
  templates: SlotTemplate[],
  overrides: WeekSlotOverride[],
): WeekSlot[] {
  const weekOverrides = overrides.filter(o => o.weekStart === weekStart)
  const removedSlotIds = new Set(
    weekOverrides
      .filter(o => o.isRemoved && o.slotId)
      .map(o => o.slotId!),
  )

  const fromTemplates: WeekSlot[] = templates
    .filter(t => t.isActive && !removedSlotIds.has(t.id))
    .map(t => ({
      id: t.id,
      dayOfWeek: t.dayOfWeek,
      label: t.label,
      group: t.group,
      startTime: t.startTime,
      endTime: t.endTime,
      sortOrder: t.sortOrder,
      isCustom: false,
    }))

  const custom: WeekSlot[] = weekOverrides
    .filter(o => !o.isRemoved && !o.slotId)
    .map(o => ({
      id: o.id,
      dayOfWeek: o.dayOfWeek!,
      label: o.label!,
      group: o.group as ShiftGroup,
      startTime: o.startTime!,
      endTime: o.endTime!,
      sortOrder: o.sortOrder ?? 99,
      isCustom: true,
    }))

  return [...fromTemplates, ...custom].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.sortOrder - b.sortOrder,
  )
}

// ---------------------------------------------------------------------------
// WhatsApp message generation
// ---------------------------------------------------------------------------

interface AssignmentDisplay {
  slotId: string
  employeeName: string | null  // null = unassigned
  internshipNote: string | null
}

export function buildArrangementMessage(
  title: string,
  slots: WeekSlot[],
  assignments: AssignmentDisplay[],
): string {
  const assignmentMap = new Map(assignments.map(a => [a.slotId, a]))

  const lines: string[] = [`*${title}*`, '']

  const days = [0, 1, 2, 3, 4, 5, 6]
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

  for (const dow of days) {
    const daySlots = slots
      .filter(s => s.dayOfWeek === dow)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    if (daySlots.length === 0) continue

    lines.push(`${dayNames[dow]}:`)

    // Main line: group=main, format "Name (startTime)"
    const mainSlots = daySlots.filter(s => s.group === 'main')
    const mainParts = mainSlots
      .map(s => {
        const a = assignmentMap.get(s.id)
        if (!a?.employeeName) return `*${s.label}*` // missing = bolded
        let part = `${a.employeeName} (${s.startTime})`
        if (a.internshipNote) part += ` + ${a.internshipNote}`
        return part
      })
    if (mainParts.length) lines.push(mainParts.join(', '))

    // Kitchen line
    const kitchenSlots = daySlots.filter(s => s.group === 'kitchen')
    if (kitchenSlots.length) {
      const parts = kitchenSlots.map(s => {
        const a = assignmentMap.get(s.id)
        if (!a?.employeeName) return `*${s.label}*`
        let part = `${a.employeeName} (${s.startTime}-${s.endTime})`
        if (a.internshipNote) part += ` + ${a.internshipNote}`
        return part
      })
      lines.push(`מטבח: ${parts.join(', ')}`)
    }

    // Support line
    const supportSlots = daySlots.filter(s => s.group === 'support')
    if (supportSlots.length) {
      const parts = supportSlots.map(s => {
        const a = assignmentMap.get(s.id)
        if (!a?.employeeName) return `*${s.label}*`
        let part = `${a.employeeName} (${s.startTime})`
        if (a.internshipNote) part += ` + ${a.internshipNote}`
        return part
      })
      lines.push(`תגבור: ${parts.join(', ')}`)
    }

    // Duty line (Saturday only, optional)
    const dutySlots = daySlots.filter(s => s.group === 'duty')
    if (dutySlots.length) {
      const parts = dutySlots
        .filter(s => assignmentMap.get(s.id)?.employeeName)
        .map(s => {
          const a = assignmentMap.get(s.id)!
          return `${a.employeeName} (${s.startTime})`
        })
      if (parts.length) lines.push(`אחמוש: ${parts.join(', ')}`)
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}
