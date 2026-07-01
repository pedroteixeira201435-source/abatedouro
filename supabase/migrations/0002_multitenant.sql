-- Multi-tenant SaaS rearchitecture. Run AFTER 0001. Idempotent where possible.
-- Each company (tenant) has isolated data + users. Anyone can sign up and either
-- create a business (becomes admin) or join one with an invite code (becomes till).

-- ============================================================
-- 1. COMPANIES + INVITES
-- ============================================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.companies enable row level security;

alter table public.profiles add column if not exists company_id uuid references public.companies(id) on delete cascade;

create table if not exists public.company_invites (
  code text primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null default 'till' check (role in ('admin','till')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.company_invites enable row level security;

-- Old single-tenant auto-profile trigger no longer applies (profiles created via RPC now).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ============================================================
-- 2. HELPER FUNCTIONS (SECURITY DEFINER → no RLS recursion)
-- ============================================================
create or replace function public.current_company_id() returns uuid
language sql security definer stable set search_path = public as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ============================================================
-- 3. BUSINESS STATE → one row PER COMPANY (migrate old id=1 data)
-- ============================================================
create table if not exists public.business_state_new (
  company_id uuid primary key references public.companies(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

do $$
declare v_admin uuid; v_company uuid; v_data jsonb;
begin
  select id into v_admin from public.profiles where role = 'admin' order by created_at limit 1;
  if v_admin is not null and (select company_id from public.profiles where id = v_admin) is null then
    insert into public.companies (name, created_by) values ('My Business', v_admin) returning id into v_company;
    update public.profiles set company_id = v_company where id = v_admin;
    select data into v_data from public.business_state where id = 1;
    insert into public.business_state_new (company_id, data, updated_by)
      values (v_company, coalesce(v_data, '{}'::jsonb), v_admin)
      on conflict (company_id) do nothing;
  end if;
end $$;

drop table if exists public.business_state;
alter table public.business_state_new rename to business_state;
alter table public.business_state enable row level security;

-- ============================================================
-- 4. RLS — everything scoped to the caller's company
-- ============================================================
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated using (id = public.current_company_id());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (company_id = public.current_company_id());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin() and company_id = public.current_company_id())
  with check (public.is_admin() and company_id = public.current_company_id());

drop policy if exists business_state_select on public.business_state;
create policy business_state_select on public.business_state
  for select to authenticated using (company_id = public.current_company_id());

drop policy if exists business_state_update on public.business_state;
create policy business_state_update on public.business_state
  for update to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists invites_admin_all on public.company_invites;
create policy invites_admin_all on public.company_invites
  for all to authenticated
  using (public.is_admin() and company_id = public.current_company_id())
  with check (public.is_admin() and company_id = public.current_company_id());

-- ============================================================
-- 5. RPCs — signup flows + invite generation
-- ============================================================
create or replace function public.create_company(company_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'You already belong to a company';
  end if;
  insert into public.companies (name, created_by) values (company_name, auth.uid()) returning id into cid;
  insert into public.profiles (id, email, company_id, role)
    values (auth.uid(), (select email from auth.users where id = auth.uid()), cid, 'admin');
  insert into public.business_state (company_id, data, updated_by) values (cid, '{}'::jsonb, auth.uid())
    on conflict (company_id) do nothing;
  return cid;
end $$;

create or replace function public.join_company(invite_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_company uuid; v_role text;
begin
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'You already belong to a company';
  end if;
  select company_id, role into v_company, v_role from public.company_invites where code = invite_code;
  if v_company is null then
    raise exception 'Invalid invite code';
  end if;
  insert into public.profiles (id, email, company_id, role)
    values (auth.uid(), (select email from auth.users where id = auth.uid()), v_company, coalesce(v_role,'till'));
  return v_company;
end $$;

create or replace function public.create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_company uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can create invites'; end if;
  select company_id into v_company from public.profiles where id = auth.uid();
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into public.company_invites (code, company_id, role, created_by)
    values (v_code, v_company, 'till', auth.uid());
  return v_code;
end $$;

-- ============================================================
-- 6. REALTIME (table was recreated → ensure it's published)
-- ============================================================
alter table public.business_state replica identity full;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='business_state') then
    alter publication supabase_realtime add table public.business_state;
  end if;
end $$;
