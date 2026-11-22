-- =====================================================
-- Supplier documents (חשבוניות מס / תעודות משלוח / זיכויים)
-- Run once in the Supabase SQL editor.
-- =====================================================

create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  doc_type           text not null check (doc_type in
                       ('delivery_note', 'tax_invoice', 'tax_invoice_receipt',
                        'credit_note', 'receipt', 'other')),
  supplier_name      text not null default '',
  supplier_tax_id    text,
  doc_number         text,
  doc_date           date,
  total_before_vat   numeric(12,2),
  vat_amount         numeric(12,2),
  total_with_vat     numeric(12,2),
  notes              text not null default '',
  has_issues         boolean not null default false,
  -- Storage paths inside the 'documents' bucket. Emptied by the retention
  -- cleanup (only the numbers are kept for old months).
  file_paths         text[] not null default '{}',
  file_types         text[] not null default '{}',
  files_purged_at    timestamptz,
  source             text not null default 'worker' check (source in ('worker', 'manager')),
  uploaded_by_id     uuid references public.employees(id) on delete set null,
  uploaded_by_name   text,
  uploaded_at        timestamptz not null default now(),
  sent_to_accountant_at timestamptz,
  extraction         jsonb
);

create index documents_doc_date_idx on public.documents (doc_date);
create index documents_supplier_idx on public.documents (supplier_name);

create table public.document_lines (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references public.documents(id) on delete cascade,
  sort_order       smallint not null default 0,
  description      text not null default '',
  quantity         numeric(12,3),
  unit             text,
  unit_price       numeric(12,2),
  line_total       numeric(12,2),
  -- Filled by the worker's receiving checklist (null = not checked)
  received_status  text check (received_status in ('ok', 'partial', 'missing')),
  received_note    text not null default ''
);

create index document_lines_document_idx on public.document_lines (document_id);

alter table public.documents      disable row level security;
alter table public.document_lines disable row level security;

-- ── Storage bucket for the document files (private, accessed via signed URLs) ──
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents bucket read"   on storage.objects for select
  to anon, authenticated using (bucket_id = 'documents');
create policy "documents bucket insert" on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'documents');
create policy "documents bucket delete" on storage.objects for delete
  to anon, authenticated using (bucket_id = 'documents');
