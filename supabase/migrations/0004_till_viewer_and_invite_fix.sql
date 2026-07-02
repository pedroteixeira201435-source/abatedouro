-- Adds the 'till_viewer' role (TILL + VIEWING: can sell + read every area, but edit nothing)
-- and fixes the silent invite-code failure. Run AFTER 0003.

-- ============================================================
-- 1. Fix invite generation (PostgREST could not resolve the overloaded RPC)
-- ============================================================
-- 0002 created create_invite() (no args) and 0003 created create_invite(text). Both exist,
-- so PostgREST rejects `rpc('create_invite', { invite_role })` with PGRST203 ("could not choose
-- the best candidate function") — which the UI swallowed, so no code was ever generated.
-- Drop the old zero-arg overload so only the parameterised version remains.
drop function if exists public.create_invite();

-- ============================================================
-- 2. Allow the new role on profiles + invites
-- ============================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','till','stock_manager','till_viewer'));

alter table public.company_invites drop constraint if exists company_invites_role_check;
alter table public.company_invites add constraint company_invites_role_check
  check (role in ('admin','till','stock_manager','till_viewer'));

-- ============================================================
-- 3. Let admins invite any non-admin role
-- ============================================================
create or replace function public.create_invite(invite_role text default 'till') returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_company uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can create invites'; end if;
  if invite_role not in ('till','stock_manager','till_viewer') then
    raise exception 'Invalid invite role';
  end if;
  select company_id into v_company from public.profiles where id = auth.uid();
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into public.company_invites (code, company_id, role, created_by)
    values (v_code, v_company, invite_role, auth.uid());
  return v_code;
end $$;
