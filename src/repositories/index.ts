import { MockEmployeeRepository } from './mock/MockEmployeeRepository'
import { MockShiftRepository } from './mock/MockShiftRepository'
import { MockClosureRepository } from './mock/MockClosureRepository'
import { SupabaseEmployeeRepository } from './supabase/SupabaseEmployeeRepository'
import { SupabaseShiftRepository } from './supabase/SupabaseShiftRepository'

const useSupabase = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const employeeRepo = useSupabase
  ? new SupabaseEmployeeRepository()
  : new MockEmployeeRepository()

export const shiftRepo = useSupabase
  ? new SupabaseShiftRepository()
  : new MockShiftRepository()

export const closureRepo = new MockClosureRepository()
