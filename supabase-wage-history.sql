-- =====================================================
-- Wage-change support on employees
-- Run ONCE in the Supabase SQL editor (anon key cannot run DDL).
-- Safe to re-run: uses IF NOT EXISTS.
-- =====================================================

alter table public.employees
  add column if not exists wage_from date,              -- date the current hourly_wage took effect (null = always)
  add column if not exists prev_wage numeric(10,2);     -- wage applied to shifts dated before wage_from
