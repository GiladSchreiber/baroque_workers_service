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
  { id: 't-sat-8', dayOfWeek: 6, label: 'אחמ"ש',         group: 'duty',    startTime: '15:00', endTime: '22:00', sortOrder: 8, isActive: true },
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

  // Week overrides
  addOverride: (o: Omit<WeekSlotOverride, 'id'>) => void
  removeOverride: (id: string) => void

  // Availability
  upsertSubmission: (s: AvailabilitySubmission) => void

  // Assignments
  upsertAssignment: (a: ScheduleAssignment) => void
  removeAssignment: (id: string) => void

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

      addOverride: (o) =>
        set(s => ({
          overrides: [...s.overrides, { ...o, id: newId('ov') }],
        })),

      removeOverride: (id) =>
        set(s => ({ overrides: s.overrides.filter(o => o.id !== id) })),

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

      removeAssignment: (id) =>
        set(s => ({ assignments: s.assignments.filter(a => a.id !== id) })),

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
