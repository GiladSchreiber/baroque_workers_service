import { supabase } from '../../lib/supabase'
import type {
  SlotTemplate, WeekSlotOverride, AvailabilitySubmission,
  ScheduleAssignment, ScheduleWeek,
} from '../../types/scheduling'
import { normalizeWeekStart } from '../../lib/schedulingUtils'

// ── Row types ─────────────────────────────────────────────────────────────────

interface TemplateRow {
  id: string
  day_of_week: number
  label: string
  grp: string
  start_time: string
  end_time: string
  sort_order: number
  is_active: boolean
}

interface OverrideRow {
  id: string
  week_start: string
  slot_id: string | null
  label: string | null
  grp: string | null
  day_of_week: number | null
  start_time: string | null
  end_time: string | null
  sort_order: number | null
  is_removed: boolean
}

interface WeekRow {
  id: string
  week_start: string
  title: string | null
  is_published: boolean
  published_at: string | null
  notes: string | null
}

interface SubmissionRow {
  id: string
  week_start: string
  employee_id: string
  is_vacation: boolean
  notes: string | null
  submitted_at: string
}

interface SelectedSlotRow {
  submission_id: string
  slot_id: string
}

interface BlockedDayRow {
  submission_id: string
  day_of_week: number
}

interface AssignmentRow {
  id: string
  week_start: string
  slot_id: string
  employee_id: string | null
  internship_note: string | null
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function toTemplate(r: TemplateRow): SlotTemplate {
  return {
    id: r.id, dayOfWeek: r.day_of_week, label: r.label,
    group: r.grp as SlotTemplate['group'],
    startTime: r.start_time, endTime: r.end_time,
    sortOrder: r.sort_order, isActive: r.is_active,
  }
}

function toOverride(r: OverrideRow): WeekSlotOverride {
  return {
    id: r.id, weekStart: normalizeWeekStart(r.week_start),
    slotId: r.slot_id ?? undefined,
    label: r.label ?? undefined,
    group: (r.grp ?? undefined) as WeekSlotOverride['group'],
    dayOfWeek: r.day_of_week ?? undefined,
    startTime: r.start_time ?? undefined,
    endTime: r.end_time ?? undefined,
    sortOrder: r.sort_order ?? undefined,
    isRemoved: r.is_removed,
  }
}

function toWeek(r: WeekRow): ScheduleWeek {
  return {
    id: r.id, weekStart: normalizeWeekStart(r.week_start),
    title: r.title ?? undefined,
    isPublished: r.is_published,
    publishedAt: r.published_at ?? undefined,
    notes: r.notes ?? undefined,
  }
}

function toAssignment(r: AssignmentRow): ScheduleAssignment {
  return {
    id: r.id, weekStart: normalizeWeekStart(r.week_start), slotId: r.slot_id,
    employeeId: r.employee_id, internshipNote: r.internship_note,
  }
}

// ── Repository ────────────────────────────────────────────────────────────────

export const schedulingRepo = {

  // ── Templates ──────────────────────────────────────────────────────────────

  async getTemplates(): Promise<SlotTemplate[]> {
    const { data, error } = await supabase
      .from('shift_templates').select('*').order('day_of_week').order('sort_order')
    if (error) throw new Error(error.message)
    return (data as TemplateRow[]).map(toTemplate)
  },

  async upsertTemplate(t: SlotTemplate): Promise<void> {
    const { error } = await supabase.from('shift_templates').upsert({
      id: t.id, day_of_week: t.dayOfWeek, label: t.label, grp: t.group,
      start_time: t.startTime, end_time: t.endTime,
      sort_order: t.sortOrder, is_active: t.isActive,
    })
    if (error) throw new Error(error.message)
  },

  async upsertTemplates(templates: SlotTemplate[]): Promise<void> {
    if (templates.length === 0) return
    const { error } = await supabase.from('shift_templates').upsert(
      templates.map(t => ({
        id: t.id, day_of_week: t.dayOfWeek, label: t.label, grp: t.group,
        start_time: t.startTime, end_time: t.endTime,
        sort_order: t.sortOrder, is_active: t.isActive,
      }))
    )
    if (error) throw new Error(error.message)
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from('shift_templates').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // ── Overrides ──────────────────────────────────────────────────────────────

  async getOverrides(weekStart: string): Promise<WeekSlotOverride[]> {
    const { data, error } = await supabase
      .from('week_slot_overrides').select('*').eq('week_start', weekStart)
    if (error) throw new Error(error.message)
    return (data as OverrideRow[]).map(toOverride)
  },

  async addOverride(o: Omit<WeekSlotOverride, 'id'>): Promise<WeekSlotOverride> {
    const { data, error } = await supabase.from('week_slot_overrides').insert({
      week_start: o.weekStart, slot_id: o.slotId ?? null, label: o.label ?? null,
      grp: o.group ?? null, day_of_week: o.dayOfWeek ?? null,
      start_time: o.startTime ?? null, end_time: o.endTime ?? null,
      sort_order: o.sortOrder ?? null, is_removed: o.isRemoved,
    }).select().single()
    if (error) throw new Error(error.message)
    return toOverride(data as OverrideRow)
  },

  async removeOverride(id: string): Promise<void> {
    const { error } = await supabase.from('week_slot_overrides').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  // ── Schedule weeks ─────────────────────────────────────────────────────────

  async getWeek(weekStart: string): Promise<ScheduleWeek | null> {
    const { data, error } = await supabase
      .from('schedule_weeks').select('*').eq('week_start', weekStart).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    return toWeek(data as WeekRow)
  },

  async upsertWeek(w: ScheduleWeek): Promise<ScheduleWeek> {
    const { data, error } = await supabase.from('schedule_weeks').upsert({
      week_start: w.weekStart, title: w.title ?? null,
      is_published: w.isPublished, published_at: w.publishedAt ?? null,
      notes: w.notes ?? null,
    }, { onConflict: 'week_start' }).select().single()
    if (error) throw new Error(error.message)
    return toWeek(data as WeekRow)
  },

  // ── Submissions ────────────────────────────────────────────────────────────

  async getSubmissions(weekStart: string): Promise<AvailabilitySubmission[]> {
    const { data: subs, error: e1 } = await supabase
      .from('availability_submissions').select('*').eq('week_start', weekStart)
    if (e1) throw new Error(e1.message)
    if (!subs || subs.length === 0) return []

    const subIds = (subs as SubmissionRow[]).map(s => s.id)

    const { data: slots, error: e2 } = await supabase
      .from('availability_selected_slots').select('*').in('submission_id', subIds)
    if (e2) throw new Error(e2.message)

    const { data: blocked, error: e3 } = await supabase
      .from('availability_blocked_days').select('*').in('submission_id', subIds)
    if (e3) throw new Error(e3.message)

    return (subs as SubmissionRow[]).map(s => ({
      id: s.id, weekStart: normalizeWeekStart(s.week_start), employeeId: s.employee_id,
      isVacation: s.is_vacation, notes: s.notes ?? '',
      submittedAt: s.submitted_at,
      selectedSlotIds: (slots as SelectedSlotRow[])
        .filter(sl => sl.submission_id === s.id)
        .map(sl => sl.slot_id)
        .filter((id): id is string => Boolean(id)),
      blockedDays: (blocked as BlockedDayRow[])
        .filter(b => b.submission_id === s.id).map(b => b.day_of_week),
    }))
  },

  async upsertSubmission(sub: AvailabilitySubmission): Promise<void> {
    // Omit id — DB generates uuid; onConflict handles updates
    const { data, error: e1 } = await supabase.from('availability_submissions').upsert({
      week_start: sub.weekStart, employee_id: sub.employeeId,
      is_vacation: sub.isVacation, notes: sub.notes || null,
      submitted_at: sub.submittedAt,
    }, { onConflict: 'week_start,employee_id' }).select('id').single()
    if (e1) throw new Error(e1.message)

    const savedId = (data as { id: string }).id

    // Replace selected slots
    await supabase.from('availability_selected_slots').delete().eq('submission_id', savedId)
    if (sub.selectedSlotIds.length > 0) {
      const { error: e2 } = await supabase.from('availability_selected_slots').insert(
        sub.selectedSlotIds.map(slot_id => ({ submission_id: savedId, slot_id }))
      )
      if (e2) throw new Error(e2.message)
    }

    // Replace blocked days
    await supabase.from('availability_blocked_days').delete().eq('submission_id', savedId)
    if (sub.blockedDays.length > 0) {
      const { error: e3 } = await supabase.from('availability_blocked_days').insert(
        sub.blockedDays.map(day_of_week => ({ submission_id: savedId, day_of_week }))
      )
      if (e3) throw new Error(e3.message)
    }
  },

  // ── Assignments ────────────────────────────────────────────────────────────

  async getAssignments(weekStart: string): Promise<ScheduleAssignment[]> {
    const { data, error } = await supabase
      .from('schedule_assignments').select('*').eq('week_start', weekStart)
    if (error) throw new Error(error.message)
    return (data as AssignmentRow[]).map(toAssignment)
  },

  async upsertAssignment(a: ScheduleAssignment): Promise<void> {
    // Omit id — DB generates uuid; onConflict handles updates
    const { error } = await supabase.from('schedule_assignments').upsert({
      week_start: a.weekStart, slot_id: a.slotId,
      employee_id: a.employeeId, internship_note: a.internshipNote ?? null,
    }, { onConflict: 'week_start,slot_id' })
    if (error) throw new Error(error.message)
  },

  async removeAssignment(weekStart: string, slotId: string): Promise<void> {
    const { error } = await supabase.from('schedule_assignments')
      .delete().eq('week_start', weekStart).eq('slot_id', slotId)
    if (error) throw new Error(error.message)
  },
}
