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
  role            text not null default 'employee' check (role in ('employee', 'manager')),
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

-- Disable RLS (internal app — no public access expected)
alter table public.employees disable row level security;
alter table public.shifts    disable row level security;
alter table public.closures  disable row level security;
