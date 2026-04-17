# Baroque Worker Service — Coffee Bar Shift Management App

## Project Overview

A mobile-first web app for managing employee shifts, cash flow, tips, and payroll for a small coffee bar business.

**Tech stack:** React, Vite, TypeScript, Zustand (state), SASS modules (styling), mobile-first design  
**Backend:** None yet — mock data layer only (localStorage). Architecture must make Supabase migration easy.

### Styling conventions
- One `ComponentName.module.scss` per component, co-located with the `.tsx` file
- Central design tokens in `src/styles/variables.scss`
- Import with `@use 'src/styles/variables' as v` (or relative path)
- Never inline styles; never write component styles in a shared sheet

---

## Core TypeScript Models

All types live in `src/types/index.ts`.

```typescript
type Role = 'employee' | 'manager'
type ShiftType = 'regular' | 'kitchen' | 'support' | 'manager'
type BlockType = 'morning' | 'afternoon' | 'evening'

interface Employee {
  id: string
  name: string
  email: string
  passwordHash: string      // mock: plain string for now
  role: Role
  hourlyWage: number
  isActive: boolean
  createdAt: string         // ISO datetime
}

interface Shift {
  id: string
  employeeId: string
  date: string              // YYYY-MM-DD
  type: ShiftType
  startTime: string         // HH:mm
  endTime: string           // HH:mm
  note?: string
  submittedAt: string       // ISO datetime — drives 24h edit window
  updatedAt?: string
}

interface ShiftClosure {
  id: string
  date: string              // YYYY-MM-DD
  block: BlockType
  revenue: number
  cash: number
  credit: number
  tips: number
  notes?: string
  submittedById: string
  submittedAt: string
}

type CreateEmployeeInput = Omit<Employee, 'id' | 'createdAt'>
type CreateShiftInput = Omit<Shift, 'id' | 'submittedAt' | 'updatedAt'>
type CreateClosureInput = Omit<ShiftClosure, 'id' | 'submittedAt'>
```

---

## Folder Structure

```
src/
├── types/                  # All TS models + input types
├── repositories/
│   ├── interfaces/         # Contracts — never change these
│   ├── mock/               # localStorage implementations
│   └── index.ts            # Wire-up file — swap here for Supabase
├── hooks/                  # useEmployees, useShifts, useClosures, useAuth
├── context/
│   └── AuthContext.tsx     # Current user, login/logout
├── components/
│   ├── ui/                 # Primitives: Button, Input, Card, Modal, etc.
│   ├── forms/              # ShiftForm, ClosureForm, EmployeeForm
│   └── layout/             # AppShell, BottomNav, PageHeader
├── pages/
│   ├── auth/               # Login, Register
│   ├── employee/           # MyShifts, SubmitShift, EditShift
│   ├── manager/            # AllShifts, Employees, Dashboard
│   └── shared/             # ClosureForm (both roles)
├── lib/
│   └── utils.ts            # date helpers, formatCurrency, etc.
└── router/
    └── index.tsx           # Routes + role-based guards
```

---

## Repository Abstraction

Repository interfaces in `src/repositories/interfaces/` define the contracts. Mock implementations in `src/repositories/mock/` use localStorage. The wire-up in `src/repositories/index.ts` is the only file that changes when switching to Supabase.

```typescript
// Example interface
interface ShiftRepository {
  getAll(): Promise<Shift[]>
  getByEmployee(employeeId: string): Promise<Shift[]>
  getByDateRange(start: string, end: string): Promise<Shift[]>
  create(data: CreateShiftInput): Promise<Shift>
  update(id: string, data: Partial<Shift>): Promise<Shift>
  delete(id: string): Promise<void>
}
```

Same pattern for `EmployeeRepository` and `ClosureRepository`.

---

## Key Architectural Decisions

- **Dates:** Always `YYYY-MM-DD` strings. Times always `HH:mm`. Never `Date` objects in the data layer.
- **Auth:** `AuthContext` stores `{ id, role }` in localStorage. No JWT needed for mock phase.
- **State:** Custom hooks (`useShifts`, `useEmployees`) call repositories directly. Add Zustand only if prop drilling gets painful.
- **Edit window:** `Date.now() - new Date(shift.submittedAt).getTime() < 86_400_000` — enforced in the hook and the UI guard.
- **Supabase migration:** Each `MockXRepository` gets a `SupabaseXRepository` sibling. Swap in `index.ts`. Hooks and components don't change.

---

## Reusable UI Primitives (build in Phase 1)

All in `src/components/ui/`:

| Component | Notes |
|-----------|-------|
| `Button` | variants: primary, secondary, destructive, ghost |
| `Input` / `Textarea` | label + error state |
| `Select` | wraps native or Radix |
| `Card` | padded container |
| `Modal` | confirm dialogs, edit overlays |
| `PageHeader` | title + optional back button |
| `EmptyState` | placeholder for empty lists |
| `LoadingSpinner` | async states |
| `FilterBar` | composable filter row |

---

## Development Phases

### Phase 1 — Foundation ✅
- [x] Vite + React + TypeScript project init
- [x] Install dependencies: `react-router-dom`, `zustand`, `sass`
- [x] Define all types in `src/types/`
- [x] Repository interfaces + mock implementations (localStorage)
- [x] Wire up `src/repositories/index.ts`
- [x] Zustand `authStore` with mock login/logout/register
- [x] Role-based routing (`/employee/*`, `/manager/*`)
- [x] `AppShell` + `BottomNav` + `PageHeader` + all UI primitives

**Done when:** Register a mock employee and manager, log in as either, land on different shells.

**Seed accounts:** `dana@bar.com` / `password123` (employee), `avi@bar.com` / `password123` (manager)

---

### Phase 2 — Employee Shift Flow ✅
- [x] Submit Shift form (date, type, start/end time, note)
- [x] My Shifts list (cards sorted by date, newest first)
- [x] Edit Shift — own shifts only, within 24h of submission
- [x] New UI primitives: `Select`, `Textarea`, `Badge`
- [x] `ShiftForm` (shared between submit + edit), `ShiftCard`
- [x] `src/lib/utils.ts` — formatDate, isWithinEditWindow, labels

**Done when:** Employee can submit and edit shifts; edits outside 24h are blocked.

---

### Phase 3 — Manager: Employee Management ✅
- [x] Employee list page (table: שם / אימייל / תפקיד / שכר / סטטוס / actions)
- [x] Add employee (`/manager/employees/new`)
- [x] Edit employee details + wage (`/manager/employees/:id/edit`)
- [x] Deactivate employee — confirm dialog, soft delete (`isActive: false`), row shown muted

**Done when:** Manager can add/edit/deactivate employees; deactivated employees blocked from login.

---

### Phase 4 — Manager: Shift Oversight
- [ ] All Shifts page
- [ ] Filter bar: date range, employee, shift type
- [ ] Read-only shift detail view

**Done when:** Manager can find any shift quickly with filters.

---

### Phase 5 — Shift Closure Reports
- [ ] Submit Closure form (date, block, revenue, cash, credit, tips, notes)
- [ ] Closure list (manager view)
- [ ] Basic validation: cash + credit ≈ revenue

**Done when:** Any user can submit a closure; manager sees all closures.

---

### Phase 6 — Manager Dashboard
- [ ] Days elapsed in current month
- [ ] Monthly totals: revenue, cash, credit, tips
- [ ] Daily average + cumulative average
- [ ] Stat cards layout

**Done when:** Manager sees a meaningful financial summary on login.

---

## Future Features (architecture must accommodate, not implement)

- Tip distribution based on overlapping shift hours
- Payroll calculation
- Audit log for edits
- Employee onboarding (ID, bank details)
- Monthly adjustments (bonuses, deductions)
- CSV / Excel export
- Supabase backend integration
