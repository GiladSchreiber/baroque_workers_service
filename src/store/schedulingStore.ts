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
  { id: 't-thu-2', dayOfWeek: 4, label: 'מטבח בוקר',   group: 'kitchen', startTime: '11:00', endTime: '17:00', sortOrder: 2, isActive: true },
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

]

const SEED_VERSION     = 'v5'
const TEMPLATE_VERSION = 'v3'

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
  _templateVersion: string

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
      templates:        DEFAULT_TEMPLATES,
      overrides:        [],
      submissions:      [],
      assignments:      [],
      weeks:            [],
      _seedVersion:     '',
      _templateVersion: '',

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

        // Reset templates if version changed
        if (s._templateVersion !== TEMPLATE_VERSION) {
          set({ templates: DEFAULT_TEMPLATES, _templateVersion: TEMPLATE_VERSION })
        }

        // Re-seed whenever SEED_VERSION changes or week changes
        if (s._seedVersion === SEED_VERSION && s.submissions.some(x => x.weekStart === weekStart)) return
        if (employeeIds.length < 3) return

        const e = employeeIds  // shorthand – use as many as available
        const n = e.length
        const now = new Date().toISOString()

        const mkSub = (empId: string, slotIds: string[], isVacation = false, notes = ''): AvailabilitySubmission => ({
          id: newId('sub'), weekStart, employeeId: empId, isVacation, notes,
          submittedAt: now, selectedSlotIds: isVacation ? [] : slotIds, blockedDays: [],
        })
        const mkAsgn = (slotId: string, empId: string | null, note: string | null = null): ScheduleAssignment => ({
          id: newId('asgn'), weekStart, slotId, employeeId: empId, internshipNote: note,
        })
        const emp = (i: number) => e[i % n]  // safe wrap

        // ── Submissions ─────────────────────────────────────────────────────
        // Most workers submit. e[last] doesn't submit; e[last-1] is on vacation.
        // Only t-fri-6 (שישי ערב) and t-sat-6 (שבת ערב) have no submitters.
        const submissions: AvailabilitySubmission[] = [
          mkSub(e[0], ['t-sun-1','t-sun-2','t-mon-1','t-mon-2','t-tue-1','t-tue-3'], false, 'מעדיף משמרות בוקר'),
          mkSub(e[1], ['t-sun-3','t-sun-4','t-wed-3','t-wed-4','t-thu-3','t-thu-5'], false, ''),
          mkSub(e[2], ['t-mon-3','t-mon-5','t-tue-2','t-fri-3','t-fri-4','t-sat-3'], false, 'רק 2 משמרות שבוע זה'),
          ...(n > 3 ? [mkSub(e[3], [], true, '')] : []),                                  // vacation
          ...(n > 4 ? [mkSub(e[4], ['t-thu-1','t-thu-2','t-fri-1','t-fri-2','t-sat-1','t-sat-4'], false, '')] : []),
          // e[5] – does NOT submit (left out intentionally)
          ...(n > 6 ? [mkSub(e[6], ['t-sat-1','t-sat-2','t-sat-3','t-sat-4','t-sat-7'], false, 'זמין רק שבת')] : []),
          ...(n > 7 ? [mkSub(e[7], ['t-mon-1','t-mon-2','t-tue-2','t-wed-1','t-wed-2','t-thu-2'], false, '')] : []),
          ...(n > 8 ? [mkSub(e[8], ['t-sun-4','t-sun-5','t-mon-4','t-mon-5','t-tue-4','t-thu-4','t-thu-5'], false, '')] : []),
          ...(n > 9 ? [mkSub(e[9], ['t-wed-1','t-wed-2','t-thu-1','t-thu-2','t-fri-1','t-fri-2'], false, '')] : []),
          ...(n > 10? [mkSub(e[10],['t-sun-3','t-mon-3','t-tue-3','t-wed-3','t-fri-3','t-fri-4','t-sat-3','t-sat-7'], false, '')] : []),
        ]

        // ── Assignments – most slots filled, a few left open ────────────────
        // Intentionally leave some unassigned to show the "+" state.
        // Leave t-fri-6 and t-sat-6 with no submitters AND unassigned.
        const assignments: ScheduleAssignment[] = [
          // Sunday – mostly filled, מטבח ערב left open
          mkAsgn('t-sun-1', e[0]),
          mkAsgn('t-sun-2', n > 7 ? e[7] : e[0], n > 7 ? 'התלמדות' : null),
          mkAsgn('t-sun-3', e[1]),
          mkAsgn('t-sun-4', n > 8 ? e[8] : e[1]),
          // t-sun-5 (ערב) – unassigned (only e[8] submitted, not placed yet)
          // Monday – fully filled except מטבח ערב
          mkAsgn('t-mon-1', e[0]),
          mkAsgn('t-mon-2', n > 7 ? e[7] : emp(2)),
          mkAsgn('t-mon-3', e[2]),
          mkAsgn('t-mon-4', n > 8 ? e[8] : emp(1)),
          mkAsgn('t-mon-5', n > 8 ? e[8] : emp(2)),
          // Tuesday
          mkAsgn('t-tue-1', e[0]),
          mkAsgn('t-tue-2', e[2]),
          mkAsgn('t-tue-3', n > 10 ? e[10] : e[1]),
          mkAsgn('t-tue-4', n > 8 ? e[8] : emp(1)),
          // t-tue-5 (ערב) – unassigned
          // Wednesday – a couple open
          mkAsgn('t-wed-1', n > 7 ? e[7] : emp(0)),
          mkAsgn('t-wed-2', n > 9 ? e[9] : emp(7)),
          mkAsgn('t-wed-3', e[1]),
          mkAsgn('t-wed-4', n > 8 ? e[8] : emp(1)),
          // t-wed-5 (ערב) – unassigned
          // Thursday
          mkAsgn('t-thu-1', n > 4 ? e[4] : emp(0)),
          mkAsgn('t-thu-2', n > 9 ? e[9] : emp(4)),
          mkAsgn('t-thu-3', e[1]),
          mkAsgn('t-thu-4', n > 8 ? e[8] : emp(2)),
          mkAsgn('t-thu-5', n > 8 ? e[8] : emp(1)),
          mkAsgn('t-thu-6', n > 10 ? e[10] : emp(2)),
          // Friday – תגבור + kitchen filled, ערב left open (no submitters)
          mkAsgn('t-fri-1', n > 4 ? e[4] : emp(0)),
          mkAsgn('t-fri-2', n > 4 ? e[4] : emp(9)),
          mkAsgn('t-fri-3', e[2], 'התלמדות'),
          mkAsgn('t-fri-4', n > 10 ? e[10] : emp(2)),
          mkAsgn('t-fri-5', n > 9 ? e[9] : emp(4)),
          // t-fri-6 (ערב) – NO submitters, left unassigned
          mkAsgn('t-fri-7', n > 10 ? e[10] : emp(2)),
          // Saturday – well-filled, ערב has no submitters
          mkAsgn('t-sat-1', n > 4 ? e[4] : emp(0)),
          mkAsgn('t-sat-2', n > 6 ? e[6] : emp(4)),
          mkAsgn('t-sat-3', e[2]),
          mkAsgn('t-sat-4', n > 6 ? e[6] : emp(4)),
          mkAsgn('t-sat-5', n > 4 ? e[4] : emp(6)),
          // t-sat-6 (ערב) – NO submitters, left unassigned
          mkAsgn('t-sat-7', n > 6 ? e[6] : emp(10)),
          mkAsgn('t-sat-8', n > 6 ? e[6] : emp(4)),
        ].filter((x): x is ScheduleAssignment => !!x)

        // Add 3 "popular" slots to ALL workers (including vacation + non-submitters)
        // so we can test the pill-wrapping UI with many names
        const popularSlots = ['t-tue-5', 't-thu-3', 't-sat-3']

        // First enrich existing submissions
        const enrichedSubmissions = submissions.map(sub => ({
          ...sub,
          selectedSlotIds: sub.isVacation
            ? [...popularSlots]   // even vacation workers "submitted" these popular shifts for the demo
            : [...new Set([...sub.selectedSlotIds, ...popularSlots])],
        }))

        // Add fake submissions for employees that never submitted at all (e.g. e[5])
        const alreadySubmitted = new Set(enrichedSubmissions.map(s => s.employeeId))
        const extraSubs: AvailabilitySubmission[] = employeeIds
          .filter(id => !alreadySubmitted.has(id))
          .map(id => mkSub(id, [...popularSlots]))

        const finalSubmissions = [...enrichedSubmissions, ...extraSubs]

        const demoWeek: ScheduleWeek = {
          id: `week-${weekStart}`,
          weekStart,
          isPublished: true,
          publishedAt: new Date().toISOString(),
          notes: '',
        }

        set(s2 => ({
          _seedVersion: SEED_VERSION,
          submissions: [...s2.submissions.filter(x => x.weekStart !== weekStart), ...finalSubmissions],
          assignments: [...s2.assignments.filter(x => x.weekStart !== weekStart), ...assignments],
          weeks: [...s2.weeks.filter(x => x.weekStart !== weekStart), demoWeek],
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
            ...s.assignments.filter(x => !(x.weekStart === a.weekStart && x.slotId === a.slotId)),
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
