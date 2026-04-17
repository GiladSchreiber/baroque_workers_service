import type { Employee, CreateEmployeeInput } from '../../types'

export interface EmployeeRepository {
  getAll(): Promise<Employee[]>
  getById(id: string): Promise<Employee | null>
  getByEmail(email: string): Promise<Employee | null>
  create(data: CreateEmployeeInput): Promise<Employee>
  update(id: string, data: Partial<Employee>): Promise<Employee>
  deactivate(id: string): Promise<void>
}
