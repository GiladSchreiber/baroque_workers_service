-- =====================================================
-- Baroque Worker Service — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- =====================================================

-- Employees
create table public.employees (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text unique not null,
  password_hash   text,                        -- null for employees; plain-text password for managers
  role            text[] not null default array['employee'],
  hourly_wage     numeric(10,2) not null default 0,
  is_active       boolean not null default true,
  id_number       text,
  phone           text,
  bank_number     text,
  bank_account    text,
  bank_branch     text,
  created_at      timestamptz not null default now()
);

-- Shifts
create table public.shifts (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  date            date not null,
  type            text not null,
  start_time      text not null,              -- HH:mm
  end_time        text not null,              -- HH:mm
  note            text,
  revenue         numeric(10,2),
  cash            numeric(10,2),
  credit          numeric(10,2),
  tips            numeric(10,2),
  amount          numeric(10,2),             -- flat payment for global / taxi shifts
  repeat_monthly  boolean default false,
  -- day_type column removed: ALTER TABLE shifts DROP COLUMN day_type;
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz
);

-- Closures (reserved for future use)
create table public.closures (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  block           text not null check (block in ('morning', 'afternoon', 'evening')),
  revenue         numeric(10,2) not null default 0,
  cash            numeric(10,2) not null default 0,
  credit          numeric(10,2) not null default 0,
  tips            numeric(10,2) not null default 0,
  notes           text,
  submitted_by_id uuid references public.employees(id),
  submitted_at    timestamptz not null default now()
);

-- Monthly revenue summaries (historical + auto-computed going forward)
create table public.monthly_summaries (
  month         char(7) primary key,           -- YYYY-MM
  daily_average numeric(10,2) not null,
  monthly_total numeric(10,2) not null,
  is_historical boolean not null default true  -- false = computed from live shifts
);

-- =====================================================
-- Scheduling tables
-- =====================================================

-- Shift templates (the weekly recurring slot definitions)
create table public.shift_templates (
  id          text primary key,                -- e.g. 't-sun-1'
  day_of_week smallint not null check (day_of_week between 0 and 6),
  label       text not null,
  grp         text not null,                   -- 'main' | 'kitchen' | 'support' | 'duty'
  start_time  text not null,                   -- HH:mm
  end_time    text not null,                   -- HH:mm
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Per-week slot overrides (add/remove slots for a specific week)
create table public.week_slot_overrides (
  id           uuid primary key default gen_random_uuid(),
  week_start   date not null,                  -- Monday ISO date
  slot_id      text,                           -- null = new slot, non-null = override existing
  label        text,
  grp          text,
  day_of_week  smallint,
  start_time   text,
  end_time     text,
  sort_order   smallint,
  is_removed   boolean not null default false, -- true = hide this slot for the week
  created_at   timestamptz not null default now()
);

-- Published schedule weeks
create table public.schedule_weeks (
  id           uuid primary key default gen_random_uuid(),
  week_start   date unique not null,
  title        text,
  is_published boolean not null default false,
  published_at timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Worker availability submissions
create table public.availability_submissions (
  id              uuid primary key default gen_random_uuid(),
  week_start      date not null,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  is_vacation     boolean not null default false,
  notes           text,
  submitted_at    timestamptz not null default now(),
  unique (week_start, employee_id)
);

-- Selected slot IDs per submission (normalised)
create table public.availability_selected_slots (
  submission_id  uuid not null references public.availability_submissions(id) on delete cascade,
  slot_id        text not null,
  primary key (submission_id, slot_id)
);

-- Blocked days per submission
create table public.availability_blocked_days (
  submission_id  uuid not null references public.availability_submissions(id) on delete cascade,
  day_of_week    smallint not null check (day_of_week between 0 and 6),
  primary key (submission_id, day_of_week)
);

-- Schedule assignments (manager assigns worker to slot for a week)
create table public.schedule_assignments (
  id               uuid primary key default gen_random_uuid(),
  week_start       date not null,
  slot_id          text not null,
  employee_id      uuid references public.employees(id) on delete set null,
  internship_note  text,
  created_at       timestamptz not null default now(),
  unique (week_start, slot_id)
);

-- =====================================================
-- Inventory tables
-- =====================================================

-- Inventory items (category doubles as supplier)
create table public.inventory_items (
  id          text primary key,                  -- client-generated stable ID (e.g. inv-veg-1)
  name        text not null,
  category    text not null,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Category display order
create table public.inventory_category_order (
  category    text primary key,
  sort_order  smallint not null default 0
);

-- Inventory reports (one per employee per date)
create table public.inventory_reports (
  id                uuid primary key default gen_random_uuid(),
  date              date not null,
  submitted_by_id   text not null,
  submitted_by_name text not null,
  submitted_at      timestamptz not null default now(),
  unique (date, submitted_by_id)
);

-- Report entries (per item per report)
create table public.inventory_entries (
  report_id  uuid not null references public.inventory_reports(id) on delete cascade,
  item_id    text not null references public.inventory_items(id) on delete cascade,
  status     text not null check (status in ('ok', 'partial', 'missing')),
  notes      text not null default '',
  primary key (report_id, item_id)
);

alter table public.inventory_items           disable row level security;
alter table public.inventory_category_order  disable row level security;
alter table public.inventory_reports         disable row level security;
alter table public.inventory_entries         disable row level security;

-- =====================================================
-- Migrations (run these if updating an existing DB)
-- =====================================================
-- ALTER TABLE public.employees DROP COLUMN IF EXISTS is_duty_officer;

-- ── Multi-role migration (run once on existing DB) ──────────────────────────
-- Step 1: convert role text → text[]
-- ALTER TABLE public.employees ALTER COLUMN role TYPE text[] USING ARRAY[role]::text[];
-- ALTER TABLE public.employees ALTER COLUMN role SET DEFAULT ARRAY['employee']::text[];

-- Step 2: drop old single-value check constraint and add array subset constraint
-- ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
-- ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_roles_check;
-- ALTER TABLE public.employees ADD CONSTRAINT employees_roles_check
--   CHECK (role <@ ARRAY['employee','duty','manager','scheduler','kitchen']::text[]);

-- Disable RLS (internal app — no public access expected)
alter table public.employees                  disable row level security;
alter table public.shifts                     disable row level security;
alter table public.closures                   disable row level security;
alter table public.monthly_summaries          disable row level security;
alter table public.shift_templates            disable row level security;
alter table public.week_slot_overrides        disable row level security;
alter table public.schedule_weeks             disable row level security;
alter table public.availability_submissions   disable row level security;
alter table public.availability_selected_slots disable row level security;
alter table public.availability_blocked_days  disable row level security;
alter table public.schedule_assignments       disable row level security;
