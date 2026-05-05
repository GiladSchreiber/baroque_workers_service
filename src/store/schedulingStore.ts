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

const SEED_VERSION = 'v2'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface SchedulingState {
  templates: SlotTemplate[]
  overrides: WeekSlotOverride[]
  submissions: AvailabilitySubmission[]
  assignments: ScheduleAssignment[]
  weeks: ScheduleWeek[]
  _seedVersion: string

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
      templates:    DEFAULT_TEMPLATES,
      overrides:    [],
      submissions:  [],
      assignments:  [],
      weeks:        [],
      _seedVersion: '',

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
        // Re-seed whenever SEED_VERSION changes or week changes
        if (s._seedVersion === SEED_VERSION && s.submissions.some(x => x.weekStart === weekStart)) return
        if (employeeIds.length < 3) return

        const e = employeeIds  // shorthand
        const now = new Date().toISOString()

        // ── Helpers ────────────────────────────────────────────────────────
        const mkSub = (empId: string, slotIds: string[], isVacation = false, notes = ''): AvailabilitySubmission => ({
          id: newId('sub'),
          weekStart,
          employeeId: empId,
          isVacation,
          notes,
          submittedAt: now,
          selectedSlotIds: isVacation ? [] : slotIds,
          blockedDays: [],
        })
        const mkAsgn = (slotId: string, empId: string | null, note: string | null = null): ScheduleAssignment => ({
          id: newId('asgn'),
          weekStart,
          slotId,
          employeeId: empId,
          internshipNote: note,
        })

        // ── Submissions ────────────────────────────────────────────────────
        // emp[0] – submitted, mornings Sun/Mon/Tue (will trigger 3-consecutive + double-booking warning)
        const sub0 = mkSub(e[0], ['t-sun-1','t-sun-2','t-mon-1','t-mon-3','t-tue-1','t-tue-3'], false, 'מעדיף משמרות בוקר')
        // emp[1] – submitted, evenings Sun/Wed/Thu
        const sub1 = mkSub(e[1], ['t-sun-3','t-sun-4','t-wed-3','t-wed-4','t-thu-3','t-thu-5'], false, '')
        // emp[2] – submitted, mix Mon/Tue/Fri/Sat support
        const sub2 = mkSub(e[2], ['t-mon-3','t-mon-5','t-tue-2','t-fri-3','t-sat-3'], false, 'רק 2 משמרות שבוע זה בבקשה')
        // emp[3] – on vacation
        const sub3 = e[3] ? mkSub(e[3], [], true, '') : null
        // emp[4] – submitted, Thu/Fri/Sat
        const sub4 = e[4] ? mkSub(e[4], ['t-thu-1','t-thu-3','t-fri-1','t-fri-2','t-sat-1','t-sat-4'], false, '') : null
        // emp[5] – NOT submitted at all (left out)
        // emp[6] – submitted Sat only
        const sub6 = e[6] ? mkSub(e[6], ['t-sat-1','t-sat-2','t-sat-3','t-sat-4'], false, 'זמין רק שבת') : null

        const submissions = [sub0, sub1, sub2, sub3, sub4, sub6].filter((x): x is AvailabilitySubmission => !!x)

        // ── Assignments (intentionally incomplete to show all scenarios) ──
        // Sunday – emp[0] assigned to BOTH בוקר and מטבח צהריים → double-booking warning
        //        – צהריים assigned to emp[1], ערב left empty (no one submitted it)
        // Monday – בוקר → emp[0] (consecutive day 2)
        //        – צהריים → emp[2] (multiple submitted: emp[1]+emp[2])
        //        – ערב    → unassigned
        // Tuesday – בוקר → emp[0] (consecutive day 3 → 3-consecutive warning)
        //         – מטבח צהריים → unassigned (only emp[2] submitted, manager hasn't assigned yet)
        // Wednesday – ערב → emp[1], everything else unassigned
        // Thursday – בוקר → emp[4], rest unassigned (sparse Friday/Thu to show gaps)
        // Friday – תגבור בוקר → emp[2] with internship note, rest unassigned
        // Saturday – בוקר → emp[4], צהריים → emp[6]|emp[4], rest unassigned
        const sat4EmpId = e[6] ?? e[4] ?? null

        const assignments: ScheduleAssignment[] = [
          // Sunday
          mkAsgn('t-sun-1',  e[0]),                           // בוקר → emp[0]
          mkAsgn('t-sun-2',  e[0], 'התלמדות'),               // מטבח צהריים → emp[0] (double-booking on Sun)
          mkAsgn('t-sun-3',  e[1]),                           // צהריים → emp[1]
          // t-sun-4 (מטבח ערב)  → unassigned (emp[1] submitted it but not yet placed)
          // t-sun-5 (ערב)       → unassigned, nobody submitted
          // Monday
          mkAsgn('t-mon-1',  e[0]),                           // בוקר → emp[0] (consecutive 2)
          mkAsgn('t-mon-3',  e[2]),                           // צהריים → emp[2] (emp[1]+emp[2] both submitted)
          // t-mon-2 (מטבח צהריים) → unassigned
          // t-mon-5 (ערב) → unassigned
          // Tuesday
          mkAsgn('t-tue-1',  e[0]),                           // בוקר → emp[0] (consecutive 3 → warning)
          // t-tue-2 → unassigned (emp[2] submitted, not yet placed)
          // t-tue-3 → unassigned
          // Wednesday
          mkAsgn('t-wed-3',  e[1]),                           // ערב → emp[1]
          // Thu
          e[4] ? mkAsgn('t-thu-1', e[4]) : null,             // בוקר → emp[4]
          // Fri
          e[2] ? mkAsgn('t-fri-3', e[2], 'התלמדות') : null, // תגבור בוקר → emp[2] with note
          // Sat
          e[4] ? mkAsgn('t-sat-1', e[4]) : null,             // בוקר → emp[4]
          sat4EmpId ? mkAsgn('t-sat-4', sat4EmpId) : null,  // צהריים → emp[6] or emp[4]
        ].filter((x): x is ScheduleAssignment => !!x)

        set(() => ({
          _seedVersion: SEED_VERSION,
          submissions: [...s.submissions.filter(x => x.weekStart !== weekStart), ...submissions],
          assignments: [...s.assignments.filter(x => x.weekStart !== weekStart), ...assignments],
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
