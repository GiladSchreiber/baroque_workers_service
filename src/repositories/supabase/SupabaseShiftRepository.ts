import type { Shift, CreateShiftInput } from '../../types'
import type { ShiftRepository } from '../interfaces/ShiftRepository'
import { supabase } from '../../lib/supabase'

// DB row shape (snake_case)
interface ShiftRow {
  id: string
  employee_id: string
  date: string
  type: string
  start_time: string
  end_time: string
  note: string | null
  revenue: number | null
  cash: number | null
  credit: number | null
  tips: number | null
  amount: number | null
  repeat_monthly: boolean | null
  submitted_at: string
  updated_at: string | null
}

function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    type: row.type as Shift['type'],
    startTime: row.start_time,
    endTime: row.end_time,
    note: row.note ?? undefined,
    revenue: row.revenue ?? undefined,
    cash: row.cash ?? undefined,
    credit: row.credit ?? undefined,
    tips: row.tips ?? undefined,
    amount: row.amount ?? undefined,
    repeatMonthly: row.repeat_monthly ?? undefined,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

function toRow(data: Partial<Shift>): Partial<ShiftRow> {
  const row: Partial<ShiftRow> = {}
  if (data.employeeId !== undefined) row.employee_id = data.employeeId
  if (data.date !== undefined) row.date = data.date
  if (data.type !== undefined) row.type = data.type
  if (data.startTime !== undefined) row.start_time = data.startTime
  if (data.endTime !== undefined) row.end_time = data.endTime
  if (data.note !== undefined) row.note = data.note
  if (data.revenue !== undefined) row.revenue = data.revenue
  if (data.cash !== undefined) row.cash = data.cash
  if (data.credit !== undefined) row.credit = data.credit
  if (data.tips !== undefined) row.tips = data.tips
  if (data.amount !== undefined) row.amount = data.amount
  if (data.repeatMonthly !== undefined) row.repeat_monthly = data.repeatMonthly
  if (data.updatedAt !== undefined) row.updated_at = data.updatedAt
  return row
}

export class SupabaseShiftRepository implements ShiftRepository {
  async getAll(): Promise<Shift[]> {
    const { data, error } = await supabase.from('shifts').select('*').order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as ShiftRow[]).map(toShift)
  }

  async getByEmployee(employeeId: string): Promise<Shift[]> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as ShiftRow[]).map(toShift)
  }

  async getByDateRange(start: string, end: string): Promise<Shift[]> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as ShiftRow[]).map(toShift)
  }

  async create(input: CreateShiftInput): Promise<Shift> {
    const row = {
      ...toRow(input as Partial<Shift>),
      submitted_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('shifts').insert(row).select().single()
    if (error) throw new Error(error.message)
    return toShift(data as ShiftRow)
  }

  async update(id: string, data: Partial<Shift>): Promise<Shift> {
    const patch = {
      ...toRow(data),
      updated_at: new Date().toISOString(),
    }
    const { data: updated, error } = await supabase
      .from('shifts')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toShift(updated as ShiftRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('shifts').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
