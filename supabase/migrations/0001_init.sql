-- Butchery Control — Supabase schema: auth roles (Till / Admin) + shared synced state.
-- Apply via Supabase SQL Editor (paste & run) or `supabase db push`.

-- ============================================================
-- 1. PROFILES  (one row per auth user, holds the access role)
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'till' check (role in ('admin', 'till')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER helper avoids RLS recursion when policies need to check the role.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Any authenticated user may read profiles (needed to know their own role + admin user list).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

-- Only admins may change roles / profiles.
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 2. AUTO-PROFILE on signup. First ever user becomes ADMIN, the rest TILL.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_exists boolean;
begin
  select exists (select 1 from public.profiles where role = 'admin') into admin_exists;
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when admin_exists then 'till' else 'admin' end);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. BUSINESS STATE  (single shared row — the whole app data as JSONB)
-- ============================================================
create table if not exists public.business_state (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.business_state (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

alter table public.business_state enable row level security;

-- All authenticated staff read and write the shared state (Till must record sales).
drop policy if exists business_state_select on public.business_state;
create policy business_state_select on public.business_state
  for select to authenticated using (true);

drop policy if exists business_state_update on public.business_state;
create policy business_state_update on public.business_state
  for update to authenticated using (true) with check (true);

-- ============================================================
-- 4. REALTIME — push business_state changes to all connected devices.
-- ============================================================
alter table public.business_state replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'business_state'
  ) then
    alter publication supabase_realtime add table public.business_state;
  end if;
end $$;
