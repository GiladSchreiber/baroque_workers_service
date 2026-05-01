import { supabase } from '../../lib/supabase'
import type { ShabbatSetting } from '../../types'

interface ShabbatSettingRow {
  month: string
  friday_start: string
  saturday_end: string
}

export class SupabaseShabbatSettingsRepository {
  async getAll(): Promise<ShabbatSetting[]> {
    const { data, error } = await supabase.from('shabbat_settings').select('*')
    if (error) throw new Error(error.message)
    return (data as ShabbatSettingRow[]).map(row => ({
      month: row.month,
      fridayStart: row.friday_start,
      saturdayEnd: row.saturday_end,
    }))
  }

  async upsert(setting: ShabbatSetting): Promise<void> {
    const { error } = await supabase.from('shabbat_settings').upsert({
      month: setting.month,
      friday_start: setting.fridayStart,
      saturday_end: setting.saturdayEnd,
    })
    if (error) throw new Error(error.message)
  }
}
