import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  SlotTemplate, WeekSlotOverride, AvailabilitySubmission,
  ScheduleAssignment, ScheduleWeek,
} from '../types/scheduling'
import { schedulingRepo } from '../repositories/supabase/SupabaseSchedulingRepository'
import { normalizeWeekStart } from '../lib/schedulingUtils'

const useSupabase = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ---------------------------------------------------------------------------
// Default templates — mirrors the current Google Form
// ---------------------------------------------------------------------------
export const DEFAULT_TEMPLATES: SlotTemplate[] = [
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

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface SchedulingState {
  templates: SlotTemplate[]
  overrides: WeekSlotOverride[]
  submissions: AvailabilitySubmission[]
  assignments: ScheduleAssignment[]
  weeks: ScheduleWeek[]

  // Loading flags
  loadingTemplates: boolean
  loadingWeek: Record<string, boolean>

  // Fetch from Supabase (overwrites local cache)
  fetchTemplates: () => Promise<void>
  fetchWeekData: (weekStart: string) => Promise<void>

  // Template management (local + DB)
  toggleTemplate: (id: string) => Promise<void>
  updateTemplate: (id: string, patch: Partial<SlotTemplate>) => Promise<void>
  addTemplate: (t: Omit<SlotTemplate, 'id'>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>

  // Week overrides (local + DB)
  addOverride: (o: Omit<WeekSlotOverride, 'id'>) => Promise<void>
  removeOverride: (id: string) => Promise<void>

  // Availability (local + DB)
  upsertSubmission: (s: AvailabilitySubmission) => Promise<void>

  // Assignments (local + DB)
  upsertAssignment: (a: ScheduleAssignment) => Promise<void>
  removeAssignment: (weekStart: string, slotId: string) => Promise<void>

  // Weeks (local + DB)
  upsertWeek: (w: ScheduleWeek) => Promise<void>
}

let _nextId = 1
function newId(prefix: string) { return `${prefix}-${Date.now()}-${_nextId++}` }

export const useSchedulingStore = create<SchedulingState>()(
  persist(
    (set, get) => ({
      templates:       DEFAULT_TEMPLATES,
      overrides:       [],
      submissions:     [],
      assignments:     [],
      weeks:           [],
      loadingTemplates: false,
      loadingWeek:     {},

      // ── Fetches ──────────────────────────────────────────────────────────

      fetchTemplates: async () => {
        if (!useSupabase) return
        set({ loadingTemplates: true })
        try {
          let templates = await schedulingRepo.getTemplates()
          if (templates.length === 0) {
            // Seed DB with defaults on first run
            await schedulingRepo.upsertTemplates(DEFAULT_TEMPLATES)
            templates = DEFAULT_TEMPLATES
          }
          set({ templates, loadingTemplates: false })
        } catch (err) {
          console.error('fetchTemplates:', err)
          set({ loadingTemplates: false })
        }
      },

      fetchWeekData: async (weekStart) => {
        if (!useSupabase) return
        const ws = normalizeWeekStart(weekStart)
        set(s => ({ loadingWeek: { ...s.loadingWeek, [weekStart]: true } }))

        const [ovResult, subResult, asnResult, wkResult] = await Promise.allSettled([
          schedulingRepo.getOverrides(ws),
          schedulingRepo.getSubmissions(ws),
          schedulingRepo.getAssignments(ws),
          schedulingRepo.getWeek(ws),
        ])

        set(s => {
          const next = { ...s, loadingWeek: { ...s.loadingWeek, [weekStart]: false } }
          if (ovResult.status === 'fulfilled') {
            next.overrides = [
              ...s.overrides.filter(o => normalizeWeekStart(o.weekStart) !== ws),
              ...ovResult.value,
            ]
          }
          if (subResult.status === 'fulfilled') {
            next.submissions = [
              ...s.submissions.filter(sub => normalizeWeekStart(sub.weekStart) !== ws),
              ...subResult.value,
            ]
          } else {
            console.error('fetchWeekData submissions:', subResult.reason)
          }
          if (asnResult.status === 'fulfilled') {
            next.assignments = [
              ...s.assignments.filter(a => normalizeWeekStart(a.weekStart) !== ws),
              ...asnResult.value,
            ]
          }
          if (wkResult.status === 'fulfilled' && wkResult.value) {
            next.weeks = [
              ...s.weeks.filter(w => normalizeWeekStart(w.weekStart) !== ws),
              wkResult.value,
            ]
          }
          return next
        })
      },

      // ── Templates ────────────────────────────────────────────────────────

      toggleTemplate: async (id) => {
        const updated = get().templates.map(t =>
          t.id === id ? { ...t, isActive: !t.isActive } : t,
        )
        set({ templates: updated })
        if (useSupabase) {
          const t = updated.find(x => x.id === id)!
          schedulingRepo.upsertTemplate(t).catch(console.error)
        }
      },

      updateTemplate: async (id, patch) => {
        const updated = get().templates.map(t => t.id === id ? { ...t, ...patch } : t)
        set({ templates: updated })
        if (useSupabase) {
          const t = updated.find(x => x.id === id)!
          schedulingRepo.upsertTemplate(t).catch(console.error)
        }
      },

      addTemplate: async (t) => {
        const newT: SlotTemplate = { ...t, id: newId('t') }
        set(s => ({ templates: [...s.templates, newT] }))
        if (useSupabase) {
          schedulingRepo.upsertTemplate(newT).catch(console.error)
        }
      },

      deleteTemplate: async (id) => {
        set(s => ({ templates: s.templates.filter(t => t.id !== id) }))
        if (useSupabase) {
          schedulingRepo.deleteTemplate(id).catch(console.error)
        }
      },

      // ── Overrides ────────────────────────────────────────────────────────

      addOverride: async (o) => {
        const localId = newId('ov')
        const localOverride = { ...o, id: localId }
        set(s => ({ overrides: [...s.overrides, localOverride] }))
        if (useSupabase) {
          try {
            const saved = await schedulingRepo.addOverride(o)
            // Replace the optimistic local entry with the DB-assigned id
            set(s => ({
              overrides: s.overrides.map(x => x.id === localId ? saved : x),
            }))
          } catch (err) {
            console.error('addOverride:', err)
            set(s => ({ overrides: s.overrides.filter(x => x.id !== localId) }))
          }
        }
      },

      removeOverride: async (id) => {
        const prev = get().overrides
        set(s => ({ overrides: s.overrides.filter(o => o.id !== id) }))
        if (useSupabase) {
          schedulingRepo.removeOverride(id).catch(err => {
            console.error('removeOverride:', err)
            set({ overrides: prev })
          })
        }
      },

      // ── Submissions ──────────────────────────────────────────────────────

      upsertSubmission: async (sub) => {
        const normalized = { ...sub, weekStart: normalizeWeekStart(sub.weekStart) }
        set(s => ({
          submissions: [
            ...s.submissions.filter(
              x => !(x.employeeId === normalized.employeeId && normalizeWeekStart(x.weekStart) === normalized.weekStart),
            ),
            normalized,
          ],
        }))
        if (useSupabase) {
          schedulingRepo.upsertSubmission(normalized).catch(console.error)
        }
      },

      // ── Assignments ──────────────────────────────────────────────────────

      upsertAssignment: async (a) => {
        const normalized = { ...a, weekStart: normalizeWeekStart(a.weekStart) }
        set(s => ({
          assignments: [
            ...s.assignments.filter(x => !(normalizeWeekStart(x.weekStart) === normalized.weekStart && x.slotId === normalized.slotId)),
            normalized,
          ],
        }))
        if (useSupabase) {
          schedulingRepo.upsertAssignment(normalized).catch(console.error)
        }
      },

      removeAssignment: async (weekStart, slotId) => {
        const ws = normalizeWeekStart(weekStart)
        const prev = get().assignments
        set(s => ({ assignments: s.assignments.filter(a => !(normalizeWeekStart(a.weekStart) === ws && a.slotId === slotId)) }))
        if (useSupabase) {
          schedulingRepo.removeAssignment(ws, slotId).catch(err => {
            console.error('removeAssignment:', err)
            set({ assignments: prev })
          })
        }
      },

      // ── Weeks ────────────────────────────────────────────────────────────

      upsertWeek: async (w) => {
        const normalized = { ...w, weekStart: normalizeWeekStart(w.weekStart) }
        set(s => ({
          weeks: [...s.weeks.filter(x => normalizeWeekStart(x.weekStart) !== normalized.weekStart), normalized],
        }))
        if (useSupabase) {
          schedulingRepo.upsertWeek(normalized).then(saved => {
            const sn = { ...saved, weekStart: normalizeWeekStart(saved.weekStart) }
            set(s => ({
              weeks: [...s.weeks.filter(x => normalizeWeekStart(x.weekStart) !== sn.weekStart), sn],
            }))
          }).catch(console.error)
        }
      },
    }),
    {
      name: 'scheduling-v3',
    },
  ),
)
