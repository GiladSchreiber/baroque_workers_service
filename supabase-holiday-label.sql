-- =====================================================
-- Named 200% holidays for the hours export
-- Run ONCE in the Supabase SQL editor (anon key cannot run DDL).
-- Safe to re-run: uses IF NOT EXISTS.
-- =====================================================

alter table public.holiday_settings
  add column if not exists label text;   -- short name (≤5 words) → export column header for 200% holidays
