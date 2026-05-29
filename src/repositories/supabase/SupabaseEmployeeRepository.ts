import type { Employee, CreateEmployeeInput } from '../../types'
import type { EmployeeRepository } from '../interfaces/EmployeeRepository'
import { supabase } from '../../lib/supabase'

// DB row shape (snake_case)
interface EmployeeRow {
  id: string
  name: string
  email: string
  password_hash: string | null
  role: string[]   // text[] in DB
  hourly_wage: number
  is_active: boolean
  created_at: string
  id_number: string | null
  phone: string | null
  bank_number: string | null
  bank_account: string | null
  bank_branch: string | null
}

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash ?? '',
    roles: (Array.isArray(row.role) ? row.role : [row.role]) as Employee['roles'],
    hourlyWage: row.hourly_wage,
    isActive: row.is_active,
    createdAt: row.created_at,
    idNumber: row.id_number ?? undefined,
    phone: row.phone ?? undefined,
    bankNumber: row.bank_number ?? undefined,
    bankAccount: row.bank_account ?? undefined,
    bankBranch: row.bank_branch ?? undefined,
  }
}

function toRow(data: Partial<Employee>): Partial<EmployeeRow> {
  const row: Partial<EmployeeRow> = {}
  if (data.name !== undefined) row.name = data.name
  if (data.email !== undefined) row.email = data.email
  if (data.passwordHash !== undefined) row.password_hash = data.passwordHash
  if (data.roles !== undefined) row.role = data.roles
  if (data.hourlyWage !== undefined) row.hourly_wage = data.hourlyWage
  if (data.isActive !== undefined) row.is_active = data.isActive
  if (data.idNumber !== undefined) row.id_number = data.idNumber
  if (data.phone !== undefined) row.phone = data.phone
  if (data.bankNumber !== undefined) row.bank_number = data.bankNumber
  if (data.bankAccount !== undefined) row.bank_account = data.bankAccount
  if (data.bankBranch !== undefined) row.bank_branch = data.bankBranch
  return row
}

export class SupabaseEmployeeRepository implements EmployeeRepository {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase.from('employees').select('*').order('name')
    if (error) throw new Error(error.message)
    return (data as EmployeeRow[]).map(toEmployee)
  }

  async getById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase.from('employees').select('*').eq('id', id).single()
    if (error) return null
    return toEmployee(data as EmployeeRow)
  }

  async getByEmail(email: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .single()
    if (error) return null
    return toEmployee(data as EmployeeRow)
  }

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const row = {
      ...toRow(input as Partial<Employee>),
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('employees').insert(row).select().single()
    if (error) throw new Error(error.message)
    return toEmployee(data as EmployeeRow)
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const { data: updated, error } = await supabase
      .from('employees')
      .update(toRow(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toEmployee(updated as EmployeeRow)
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', id)
    if (error) throw new Error(error.message)
  }
}
