import { supabase } from '../../lib/supabase'
import type { HolidaySetting, CreateHolidaySettingInput } from '../../types'

interface HolidaySettingRow {
  id: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  rate: string
  label: string | null
}

// Only touch the `label` column when a value is explicitly provided (200%
// holidays). This keeps normal 150% holiday writes working even if the
// `label` column hasn't been added to the DB yet.
function labelPatch(input: CreateHolidaySettingInput): { label?: string | null } {
  if (input.label === undefined) return {}
  return { label: input.label.trim() || null }
}

function rowToSetting(row: HolidaySettingRow): HolidaySetting {
  return {
    id: row.id,
    startDate: row.start_date,
    startTime: row.start_time,
    endDate: row.end_date,
    endTime: row.end_time,
    rate: row.rate as HolidaySetting['rate'],
    label: row.label ?? undefined,
  }
}

export class SupabaseHolidaySettingsRepository {
  async getAll(): Promise<HolidaySetting[]> {
    const { data, error } = await supabase
      .from('holiday_settings')
      .select('*')
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true })
    if (error) throw new Error(error.message)
    return (data as HolidaySettingRow[]).map(rowToSetting)
  }

  async create(input: CreateHolidaySettingInput): Promise<HolidaySetting> {
    const { data, error } = await supabase
      .from('holiday_settings')
      .insert({
        start_date: input.startDate,
        start_time: input.startTime,
        end_date: input.endDate,
        end_time: input.endTime,
        rate: input.rate,
        ...labelPatch(input),
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return rowToSetting(data as HolidaySettingRow)
  }

  async update(id: string, input: CreateHolidaySettingInput): Promise<HolidaySetting> {
    const { data, error } = await supabase
      .from('holiday_settings')
      .update({
        start_date: input.startDate,
        start_time: input.startTime,
        end_date: input.endDate,
        end_time: input.endTime,
        rate: input.rate,
        ...labelPatch(input),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return rowToSetting(data as HolidaySettingRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('holiday_settings')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
}
