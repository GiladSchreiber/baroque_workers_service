import { MockEmployeeRepository } from './mock/MockEmployeeRepository'
import { MockShiftRepository } from './mock/MockShiftRepository'
import { MockClosureRepository } from './mock/MockClosureRepository'
import { MockMonthlySummaryRepository } from './mock/MockMonthlySummaryRepository'
import { MockHolidaySettingsRepository } from './mock/MockHolidaySettingsRepository'
import { SupabaseEmployeeRepository } from './supabase/SupabaseEmployeeRepository'
import { SupabaseShiftRepository } from './supabase/SupabaseShiftRepository'
import { SupabaseMonthlySummaryRepository } from './supabase/SupabaseMonthlySummaryRepository'
import { SupabaseShabbatSettingsRepository } from './supabase/SupabaseShabbatSettingsRepository'
import { SupabaseHolidaySettingsRepository } from './supabase/SupabaseHolidaySettingsRepository'

const useSupabase = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const employeeRepo = useSupabase
  ? new SupabaseEmployeeRepository()
  : new MockEmployeeRepository()

export const shiftRepo = useSupabase
  ? new SupabaseShiftRepository()
  : new MockShiftRepository()

export const summaryRepo = useSupabase
  ? new SupabaseMonthlySummaryRepository()
  : new MockMonthlySummaryRepository()

export const closureRepo = new MockClosureRepository()

export const shabbatSettingsRepo = new SupabaseShabbatSettingsRepository()

export const holidaySettingsRepo = useSupabase
  ? new SupabaseHolidaySettingsRepository()
  : new MockHolidaySettingsRepository()
