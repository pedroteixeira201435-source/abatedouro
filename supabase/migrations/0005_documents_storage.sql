-- ============================================================
-- 0005: Supporting-document storage (invoices, bank statements, transfer proofs)
-- ------------------------------------------------------------
-- Files are uploaded to a PRIVATE Storage bucket `documents`, partitioned per
-- company: `${companyId}/${category}/${uuid}-${name}`. Only lightweight metadata
-- (path/name/size) is kept in `business_state`; the binary never enters the JSONB
-- snapshot. No OCR/AI — files are stored and served (via signed URLs) only.
--
-- RLS below scopes every object to the caller's company by matching the FIRST
-- path segment against public.current_company_id() (defined in 0002). Idempotent.
-- ============================================================

-- 1. Private bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 2. Per-company RLS on storage.objects for this bucket.
--    (storage.foldername(name))[1] is the first path segment = the company id.

drop policy if exists "documents: company read"   on storage.objects;
drop policy if exists "documents: company insert"  on storage.objects;
drop policy if exists "documents: company update"  on storage.objects;
drop policy if exists "documents: company delete"  on storage.objects;

create policy "documents: company read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "documents: company insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "documents: company update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "documents: company delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
