import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  SlotTemplate, WeekSlotOverride, AvailabilitySubmission,
  ScheduleAssignment, ScheduleWeek,
} from '../types/scheduling'

// ---------------------------------------------------------------------------
// Default templates — mirrors the current Google Form
// ---------------------------------------------------------------------------
const DEFAULT_TEMPLATES: SlotTemplate[] = [
  // ── Sunday (0) ──────────────────────────────────────────────────────────
  { id: 't-sun-1', dayOfWeek: 0, label: 'בוקר',        group: 'main',    startTime: '07:30', endTime: '14:00', sortOrder: 1, isActive: true },
  { id: 't-sun-2', dayOfWeek: 0, label: 'מטבח צהריים', group: 'kitchen', startTime: '11:00', endTime: '17:00', sortOrder: 2, isActive: true },
  { id: 't-sun-3', dayOfWeek: 0, label: 'צהריים',       group: 'main',    startTime: '14:00', endTime: '20:00', sortOrder: 3, isActive: true },
  { id: 't-sun-4', dayOfWeek: 0, label: 'מטבח ערב',    group: 'kitchen', startTime: '17:00', endTime: '00:00', sortOrder: 4, isActive: true },
  { id: 't-sun-5', dayOfWeek: 0, label: 'ערב',          group: 'main',    startTime: '20:00', endTime: '02:00', sortOrder: 5, isActive: true },

  // ── Monday (1) ──────────────────────────────────────────────────────────
  { id: 't-mon-1', dayOfWeek: 1, label: 'בוקר',        group: 'main',    startTime: '07:30', endTime: '14:00', sortOrder: 1, isActive: true },
  { id: 't-mon-2', dayOfWeek: 1, label: 'מטבח צהריים', group: 'kitchen', startTime: '11:00', endTime: '17:00', sortOrder: 2, isActive: true },
  { id: 't-mon-3', dayOfWeek: 1, label: 'צהריים',       group: 'main',    startTime: '14:00', endTime: '20:00', sortOrder: 3, isActive: true },
  { id: 't-mon-4', dayOfWeek: 1, label: 'מטבח ערב',    group: 'kitchen', startTime: '17:00', endTime: '00:00', sortOrder: 4, isActive: true },
  { id: 't-mon-5', dayOfWeek: 1, label: 'ערב',          group: 'main',    startTime: '20:00', endTime: '02:00', sortOrder: 5, isActive: true },

  // ── Tuesday (2) ─────────────────────────────────────────────────────────
  { id: 't-tue-1', dayOfWeek: 2, label: 'בוקר',        group: 'main',    startTime: '07:30', endTime: '14:00', sortOrder: 1, isActive: true },
  { id: 't-tue-2', dayOfWeek: 2, label: 'מטבח צהריים', group: 'kitchen', startTime: '11:00', endTime: '17:00', sortOrder: 2, isActive: true },
  { id: 't-tue-3', dayOfWeek: 2, label: 'צהריים',       group: 'main',    startTime: '14:00', endTime: '20:00', sortOrder: 3, isActive: true },
  { id: 't-tue-4', dayOfWeek: 2, label: 'מטבח ערב',    group: 'kitchen', startTime: '17:00', endTime: '00:00', sortOrder: 4, isActive: true },
  { id: 't-tue-5', dayOfWeek: 2, label: 'ערב',          group: 'main',    startTime: '20:00', endTime: '02:00', sortOrder: 5, isActive: true },

  // ── Wednesday (3) ───────────────────────────────────────────────────────
  { id: 't-wed-1', dayOfWeek: 3, label: 'בוקר',        group: 'main',    startTime: '07:30', endTime: '14:00', sortOrder: 1, isActive: true },
  { id: 't-wed-2', dayOfWeek: 3, label: 'מטבח צהריים', group: 'kitchen', startTime: '11:00', endTime: '17:00', sortOrder: 2, isActive: true },
  { id: 't-wed-3', dayOfWeek: 3, label: 'צהריים',       group: 'main',    startTime: '14:00', endTime: '20:00', sortOrder: 3, isActive: true },
  { id: 't-wed-4', dayOfWeek: 3, label: 'מטבח ערב',    group: 'kitchen', startTime: '17:00', endTime: '20:00', sortOrder: 4, isActive: true },
  { id: 't-wed-5', dayOfWeek: 3, label: 'ערב',          group: 'main',    startTime: '20:00', endTime: '02:00', sortOrder: 5, isActive: true },

  // ── Thursday (4) ────────────────────────────────────────────────────────
  { id: 't-thu-1', dayOfWeek: 4, label: 'בוקר',        group: 'main',    startTime: '07:30', endTime: '14:00', sortOrder: 1, isActive: true },
  { id: 't-thu-2', dayOfWeek: 4, label: 'מטבח',        group: 'kitchen', startTime: '11:00', endTime: '17:00', sortOrder: 2, isActive: true },
  { id: 't-thu-3', dayOfWeek: 4, label: 'צהריים',       group: 'main',    startTime: '14:00', endTime: '20:00', sortOrder: 3, isActive: true },
  { id: 't-thu-4', dayOfWeek: 4, label: 'מטבח ערב',    group: 'kitchen', startTime: '17:00', endTime: '00:00', sortOrder: 4, isActive: true },
  { id: 't-thu-5', dayOfWeek: 4, label: 'ערב',          group: 'main',    startTime: '20:00', endTime: '02:00', sortOrder: 5, isActive: true },
  { id: 't-thu-6', dayOfWeek: 4, label: 'תגבור ערב',   group: 'support', startTime: '21:00', endTime: '00:00', sortOrder: 6, isActive: true },

  // ── Friday (5) ──────────────────────────────────────────────────────────
  { id: 't-fri-1', dayOfWeek: 5, label: 'בוקר',          group: 'main',    startTime: '07:30', endTime: '14:00', sortOrder: 1, isActive: true },
  { id: 't-fri-2', dayOfWeek: 5, label: 'מטבח בוקר',     group: 'kitchen', startTime: '09:00', endTime: '16:00', sortOrder: 2, isActive: true },
  { id: 't-fri-3', dayOfWeek: 5, label: 'תגבור בוקר',    group: 'support', startTime: '11:00', endTime: '18:00', sortOrder: 3, isActive: true },
  { id: 't-fri-4', dayOfWeek: 5, label: 'צהריים',         group: 'main',    startTime: '14:00', endTime: '20:00', sortOrder: 4, isActive: true },
  { id: 't-fri-5', dayOfWeek: 5, label: 'מטבח ערב',      group: 'kitchen', startTime: '16:00', endTime: '22:00', sortOrder: 5, isActive: true },
  { id: 't-fri-6', dayOfWeek: 5, label: 'ערב',            group: 'main',    startTime: '20:00', endTime: '02:00', sortOrder: 6, isActive: true },
  { id: 't-fri-7', dayOfWeek: 5, label: 'תגבור ערב',     group: 'support', startTime: '22:00', endTime: '00:00', sortOrder: 7, isActive: true },

  // ── Saturday (6) ────────────────────────────────────────────────────────
  { id: 't-sat-1', dayOfWeek: 6, label: 'בוקר',          group: 'main',    startTime: '07:30', endTime: '14:00', sortOrder: 1, isActive: true },
  { id: 't-sat-2', dayOfWeek: 6, label: 'מטבח בוקר',     group: 'kitchen', startTime: '08:30', endTime: '14:30', sortOrder: 2, isActive: true },
  { id: 't-sat-3', dayOfWeek: 6, label: 'תגבור בוקר',    group: 'support', startTime: '09:00', endTime: '16:00', sortOrder: 3, isActive: true },
  { id: 't-sat-4', dayOfWeek: 6, label: 'צהריים',         group: 'main',    startTime: '14:00', endTime: '20:00', sortOrder: 4, isActive: true },
  { id: 't-sat-5', dayOfWeek: 6, label: 'מטבח צהריים',   group: 'kitchen', startTime: '14:00', endTime: '20:00', sortOrder: 5, isActive: true },
  { id: 't-sat-6', dayOfWeek: 6, label: 'ערב',            group: 'main',    startTime: '20:00', endTime: '02:00', sortOrder: 6, isActive: true },
  { id: 't-sat-7', dayOfWeek: 6, label: 'תגבור ערב',     group: 'support', startTime: '16:00', endTime: '22:00', sortOrder: 7, isActive: true },
  { id: 't-sat-8', dayOfWeek: 6, label: 'אחמ"ש בוקר',   group: 'duty',    startTime: '10:00', endTime: '15:00', sortOrder: 8, isActive: true },
  { id: 't-sat-9', dayOfWeek: 6, label: 'אחמ"ש ערב',    group: 'duty',    startTime: '15:00', endTime: '22:00', sortOrder: 9, isActive: true },

  // ── אחמ"ש slots for Sun–Fri (manager-assigned only, hidden from workers) ─
  { id: 't-sun-d1', dayOfWeek: 0, label: 'אחמ"ש בוקר',  group: 'duty', startTime: '10:00', endTime: '15:00', sortOrder: 6, isActive: true },
  { id: 't-sun-d2', dayOfWeek: 0, label: 'אחמ"ש ערב',   group: 'duty', startTime: '15:00', endTime: '22:00', sortOrder: 7, isActive: true },
  { id: 't-mon-d1', dayOfWeek: 1, label: 'אחמ"ש בוקר',  group: 'duty', startTime: '10:00', endTime: '15:00', sortOrder: 6, isActive: true },
  { id: 't-mon-d2', dayOfWeek: 1, label: 'אחמ"ש ערב',   group: 'duty', startTime: '15:00', endTime: '22:00', sortOrder: 7, isActive: true },
  { id: 't-tue-d1', dayOfWeek: 2, label: 'אחמ"ש בוקר',  group: 'duty', startTime: '10:00', endTime: '15:00', sortOrder: 6, isActive: true },
  { id: 't-tue-d2', dayOfWeek: 2, label: 'אחמ"ש ערב',   group: 'duty', startTime: '15:00', endTime: '22:00', sortOrder: 7, isActive: true },
  { id: 't-wed-d1', dayOfWeek: 3, label: 'אחמ"ש בוקר',  group: 'duty', startTime: '10:00', endTime: '15:00', sortOrder: 6, isActive: true },
  { id: 't-wed-d2', dayOfWeek: 3, label: 'אחמ"ש ערב',   group: 'duty', startTime: '15:00', endTime: '22:00', sortOrder: 7, isActive: true },
  { id: 't-thu-d1', dayOfWeek: 4, label: 'אחמ"ש בוקר',  group: 'duty', startTime: '10:00', endTime: '15:00', sortOrder: 7, isActive: true },
  { id: 't-thu-d2', dayOfWeek: 4, label: 'אחמ"ש ערב',   group: 'duty', startTime: '15:00', endTime: '22:00', sortOrder: 8, isActive: true },
  { id: 't-fri-d1', dayOfWeek: 5, label: 'אחמ"ש בוקר',  group: 'duty', startTime: '10:00', endTime: '15:00', sortOrder: 8, isActive: true },
  { id: 't-fri-d2', dayOfWeek: 5, label: 'אחמ"ש ערב',   group: 'duty', startTime: '15:00', endTime: '22:00', sortOrder: 9, isActive: true },
]

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface SchedulingState {
  templates: SlotTemplate[]
  overrides: WeekSlotOverride[]
  submissions: AvailabilitySubmission[]
  assignments: ScheduleAssignment[]
  weeks: ScheduleWeek[]

  // Template management
  toggleTemplate: (id: string) => void
  updateTemplate: (id: string, patch: Partial<SlotTemplate>) => void
  addTemplate: (t: Omit<SlotTemplate, 'id'>) => void
  deleteTemplate: (id: string) => void

  // Week overrides
  addOverride: (o: Omit<WeekSlotOverride, 'id'>) => void
  removeOverride: (id: string) => void

  // Demo seeding (dev only)
  seedDemoData: (weekStart: string, employeeIds: string[]) => void

  // Availability
  upsertSubmission: (s: AvailabilitySubmission) => void

  // Assignments
  upsertAssignment: (a: ScheduleAssignment) => void
  removeAssignment: (weekStart: string, slotId: string) => void

  // Weeks
  upsertWeek: (w: ScheduleWeek) => void
}

let _nextId = 1
function newId(prefix: string) { return `${prefix}-${Date.now()}-${_nextId++}` }

export const useSchedulingStore = create<SchedulingState>()(
  persist(
    (set, get) => ({
      templates:   DEFAULT_TEMPLATES,
      overrides:   [],
      submissions: [],
      assignments: [],
      weeks:       [],

      toggleTemplate: (id) =>
        set(s => ({
          templates: s.templates.map(t =>
            t.id === id ? { ...t, isActive: !t.isActive } : t,
          ),
        })),

      updateTemplate: (id, patch) =>
        set(s => ({
          templates: s.templates.map(t => t.id === id ? { ...t, ...patch } : t),
        })),

      addTemplate: (t) =>
        set(s => ({
          templates: [...s.templates, { ...t, id: newId('t') }],
        })),

      deleteTemplate: (id) =>
        set(s => ({ templates: s.templates.filter(t => t.id !== id) })),

      addOverride: (o) =>
        set(s => ({
          overrides: [...s.overrides, { ...o, id: newId('ov') }],
        })),

      removeOverride: (id) =>
        set(s => ({ overrides: s.overrides.filter(o => o.id !== id) })),

      seedDemoData: (weekStart, employeeIds) => {
        const s = get()
        const alreadySeeded = s.submissions.some(x => x.weekStart === weekStart)
        if (alreadySeeded || employeeIds.length < 3) return

        const templates = s.templates.filter(t => t.isActive && t.group !== 'duty')
        const slotIdsByDay = (dow: number) => templates.filter(t => t.dayOfWeek === dow).map(t => t.id)

        const mkSub = (empId: string, dows: number[], isVacation = false, notes = ''): AvailabilitySubmission => ({
          id: newId('sub'),
          weekStart,
          employeeId: empId,
          isVacation,
          notes,
          submittedAt: new Date().toISOString(),
          selectedSlotIds: isVacation ? [] : dows.flatMap(slotIdsByDay).slice(0, 6),
          blockedDays: [],
        })

        const submissions: AvailabilitySubmission[] = [
          mkSub(employeeIds[0], [0, 1, 2], false, 'מעדיף בוקר'),
          mkSub(employeeIds[1], [0, 3, 4], false, ''),
          mkSub(employeeIds[2], [1, 2, 5], false, 'רק 2 משמרות אם אפשר'),
          ...(employeeIds[3] ? [mkSub(employeeIds[3], [], true, '')] : []),
          ...(employeeIds[4] ? [mkSub(employeeIds[4], [4, 5, 6])] : []),
        ]

        const morningSlots = templates.filter(t => t.dayOfWeek < 5 && t.sortOrder <= 2)
        const assignments: ScheduleAssignment[] = morningSlots.slice(0, 4).map((t, i) => ({
          id: newId('asgn'),
          weekStart,
          slotId: t.id,
          employeeId: employeeIds[i % employeeIds.length],
          internshipNote: i === 1 ? 'התלמדות' : null,
        }))

        set(s2 => ({
          submissions: [...s2.submissions.filter(x => x.weekStart !== weekStart), ...submissions],
          assignments: [...s2.assignments.filter(x => x.weekStart !== weekStart), ...assignments],
        }))
      },

      upsertSubmission: (sub) =>
        set(s => ({
          submissions: [
            ...s.submissions.filter(
              x => !(x.employeeId === sub.employeeId && x.weekStart === sub.weekStart),
            ),
            sub,
          ],
        })),

      upsertAssignment: (a) =>
        set(s => ({
          assignments: [
            ...s.assignments.filter(x => x.id !== a.id),
            a,
          ],
        })),

      removeAssignment: (weekStart, slotId) =>
        set(s => ({ assignments: s.assignments.filter(a => !(a.weekStart === weekStart && a.slotId === slotId)) })),

      upsertWeek: (w) =>
        set(s => ({
          weeks: [
            ...s.weeks.filter(x => x.weekStart !== w.weekStart),
            w,
          ],
        })),
    }),
    { name: 'scheduling' },
  ),
)
