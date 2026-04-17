import { MockEmployeeRepository } from './mock/MockEmployeeRepository'
import { MockShiftRepository } from './mock/MockShiftRepository'
import { MockClosureRepository } from './mock/MockClosureRepository'

export const employeeRepo = new MockEmployeeRepository()
export const shiftRepo = new MockShiftRepository()
export const closureRepo = new MockClosureRepository()
