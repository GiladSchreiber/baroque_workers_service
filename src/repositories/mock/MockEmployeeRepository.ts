import type { Employee, CreateEmployeeInput } from '../../types'
import type { EmployeeRepository } from '../interfaces/EmployeeRepository'
import { LocalStore } from './LocalStore'

const SEED_VERSION = 'v2'
const SEED_VERSION_KEY = 'baroque_seed_v'

const SEED: Employee[] = [
  // Managers
  {
    id: 'mgr-noam',
    name: 'נועם שוחט',
    email: 'noam@gmail.com',
    passwordHash: 'password123',
    role: 'manager',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'mgr-gilad',
    name: 'גלעד שרייבר',
    email: 'gilad@gmail.com',
    passwordHash: 'password123',
    role: 'manager',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  // Employees — 45 ₪/hr
  {
    id: 'emp-inbar',
    name: 'ענבר פריד',
    email: 'inbar.farid@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-uri',
    name: "אורי צ'יבוטרו",
    email: 'uri.chibutro@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-shahar',
    name: 'שחר גרוסמן',
    email: 'shahar.grossman@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-liav',
    name: 'ליאב פנחס',
    email: 'liav.pinchas@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-sofia',
    name: 'סופיה קפלן',
    email: 'sofia.kaplan@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-rafael',
    name: 'רפאל בוזגלו',
    email: 'rafael.buzaglo@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-sinai',
    name: 'סיני יופה',
    email: 'sinai.yoffe@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-nea',
    name: 'נעה פריילפרט',
    email: 'nea.freilpert@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 45,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  // Employees — 40 ₪/hr
  {
    id: 'emp-ariel',
    name: 'אריאל רופמן',
    email: 'ariel.rofman@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 40,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-julia',
    name: "ג'וליה אבו קאליל",
    email: 'julia.abukhalil@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 40,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-ila',
    name: 'אילה אביבי',
    email: 'ila.avivi@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 40,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-haim',
    name: 'חיים זוננפלד',
    email: 'haim.sonnenfeld@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 40,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-noa',
    name: 'נועה טולדו',
    email: 'noa.toledo@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 40,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-dafna',
    name: 'דפנה בן ארי',
    email: 'dafna.benari@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 40,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'emp-yotam',
    name: 'יותם זך',
    email: 'yotam.zak@baroque.com',
    passwordHash: 'password123',
    role: 'employee',
    hourlyWage: 40,
    isActive: true,
    createdAt: new Date('2024-01-01').toISOString(),
  },
]

function getStore(): LocalStore<Employee> {
  if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
    localStorage.removeItem('employees')
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
  }
  return new LocalStore<Employee>('employees', SEED)
}

export class MockEmployeeRepository implements EmployeeRepository {
  private store = getStore()

  async getAll() { return this.store.getAll() }
  async getById(id: string) { return this.store.getById(id) }
  async getByEmail(email: string) {
    return this.store.getAll().find(e => e.email === email) ?? null
  }
  async create(data: CreateEmployeeInput) {
    return this.store.create({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
  }
  async update(id: string, data: Partial<Employee>) {
    return this.store.update(id, data)
  }
  async deactivate(id: string) {
    this.store.update(id, { isActive: false })
  }
}
