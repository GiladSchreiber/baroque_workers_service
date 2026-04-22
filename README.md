# Baroque Bar — Shift Management App

A mobile-first web app for managing employee shifts, cash flow, tips, and payroll at Baroque Bar café.

**Live site:** https://giladschreiber.github.io/baroque_workers_service/

---

## What it does

### For employees
- Log in with email only (no password needed)
- Submit daily shift reports: hours, shift type, and cash register data (revenue, cash, credit, tips)
- Mark a shift as a holiday (חג 150%) or special holiday (חג מיוחד 200%) when applicable
- Edit submitted shifts within 24 hours
- View your own shift history with calculated salary per shift
- Salary is automatically calculated including base wage, Shabbat/holiday rate, tip distribution, and travel expenses (₪8/shift)

### For managers
- Log in with email + password
- View all employees and their monthly shift summaries
- Add, edit, or delete any employee's shifts
- Manage the employee list: add new employees, edit details and wage, deactivate accounts
- View the income page: daily revenue breakdown by shift
- Dashboard: revenue graphs (daily and all-time), trend lines, and year-over-year comparisons
- Export monthly shift data to Excel (XLSX)

---

## Salary calculation

| Hour type | Rate |
|-----------|------|
| Regular weekday | Employee's hourly wage (₪40 or ₪45) |
| Friday after 14:00 / Saturday until 20:00 | ₪51.48/hr (150% of minimum wage) |
| Holiday (חג) — manual checkbox | ₪51.48/hr |
| Special holiday (חג מיוחד) — manual checkbox | ₪68.64/hr (200% of minimum wage) |
| Support shift (אחמ"ש) | ₪50/hr flat |
| Global shift (גלובלי) | Fixed amount set per shift |
| Saturday taxi (מוניות) | Fixed amount set per shift |
| Travel expenses | ₪8 per non-flat shift |

**Tips** are distributed proportionally among all non-support shifts that overlap in time on the same day. Only the amount above ₪15/hr threshold is counted as income.

---

## Tech stack

- **Frontend:** React + TypeScript + Vite
- **State:** Zustand
- **Styling:** SCSS Modules
- **Backend:** Supabase (PostgreSQL)
- **Deployment:** GitHub Pages via GitHub Actions

---

## Project structure

```
src/
├── types/              # TypeScript models
├── repositories/
│   ├── interfaces/     # Repository contracts
│   ├── mock/           # localStorage implementations (dev fallback)
│   └── supabase/       # Supabase implementations (production)
├── store/              # Zustand stores (auth, shifts, employees)
├── hooks/              # Custom hooks (useMonthlySummaries, etc.)
├── components/
│   ├── ui/             # Button, Input, Card, Modal, Badge, etc.
│   ├── forms/          # ShiftForm, EmployeeForm
│   └── layout/         # AppShell, BottomNav, PageHeader
├── pages/
│   ├── auth/           # Login, Register
│   ├── employee/       # MyShifts, ReportShift, EditShift
│   └── manager/        # Dashboard, AllShifts, Employees, Income
├── lib/
│   └── utils.ts        # Salary calculations, date helpers, tip distribution
└── data/
    └── revenueHistory.ts  # Historical revenue reference data
```

---

## Local development

```bash
npm install
npm run dev
```

Requires a `.env.local` file:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without these env vars the app falls back to localStorage mock data automatically.

---

## Database setup

Run the SQL files in order in the Supabase SQL Editor:

1. `supabase-schema.sql` — creates all tables
2. `supabase-historical-revenue.sql` — inserts real historical monthly revenue data (April 2023 – March 2026)

To add the first manager account:
```sql
INSERT INTO public.employees (name, email, password_hash, role, hourly_wage, is_active)
VALUES ('Your Name', 'your@email.com', 'your-password', 'manager', 45, true);
```

---

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via `.github/workflows/deploy.yml`.

The build requires two GitHub repository secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Running tests

```bash
npm test
```

Unit tests cover the core salary calculation logic: `splitShiftHours`, `calcSalary`, and `computeTipDistribution`, including validation against real payroll data.
