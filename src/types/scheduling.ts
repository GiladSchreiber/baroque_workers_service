// ---------------------------------------------------------------------------
// Scheduling types — shift arrangement feature
// ---------------------------------------------------------------------------

/** Which section of the WhatsApp arrangement message a slot belongs to */
export type ShiftGroup = 'main' | 'kitchen' | 'support' | 'duty'

export const SHIFT_GROUP_LABELS: Record<ShiftGroup, string> = {
  main:    'משמרת',
  kitchen: 'מטבח',
  support: 'תגבור',
  duty:    'אחמ"ש',
}

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

// ---------------------------------------------------------------------------
// Templates — the permanent default weekly slots
// ---------------------------------------------------------------------------
export interface SlotTemplate {
  id: string
  dayOfWeek: number   // 0=Sun … 6=Sat
  label: string       // short display label, e.g. "מטבח בוקר"
  group: ShiftGroup
  startTime: string   // "HH:mm"
  endTime: string     // "HH:mm"
  sortOrder: number
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Per-week overrides — manager adds or removes specific slots for one week
// ---------------------------------------------------------------------------
export interface WeekSlotOverride {
  id: string
  weekStart: string   // YYYY-MM-DD (always the Sunday of that week)
  /** non-null = hide/modify an existing template; null = brand-new custom slot */
  slotId?: string
  isRemoved: boolean  // true = hide slotId for this week; false = custom addition
  // populated only for custom additions (slotId === undefined, isRemoved === false):
  dayOfWeek?: number
  label?: string
  group?: ShiftGroup
  startTime?: string
  endTime?: string
  sortOrder?: number
}

// A slot as seen for a specific week (template + overrides resolved)
export interface WeekSlot {
  id: string
  dayOfWeek: number
  label: string
  group: ShiftGroup
  startTime: string
  endTime: string
  sortOrder: number
  isCustom: boolean  // true = added via override (not from template)
}

// ---------------------------------------------------------------------------
// Worker availability submission for a week
// ---------------------------------------------------------------------------
export interface AvailabilitySubmission {
  id: string
  employeeId: string
  weekStart: string
  isVacation: boolean      // entire week off
  notes: string            // free text from worker
  submittedAt: string
  selectedSlotIds: string[] // slot IDs the worker is available for
  blockedDays: number[]    // day-of-week numbers the worker can't work at all
}

// ---------------------------------------------------------------------------
// Manager arrangement for a week
// ---------------------------------------------------------------------------
export interface ScheduleAssignment {
  id: string
  weekStart: string
  slotId: string
  employeeId: string | null    // null = slot is unassigned
  internshipNote: string | null // free text, e.g. "התלמדות אביתר"
}

export interface ScheduleWeek {
  id: string               // uuid
  weekStart: string        // YYYY-MM-DD (Sunday)
  title?: string           // auto-generated "סידור DD.MM.YY"
  isPublished: boolean
  publishedAt?: string
  notes?: string
}
