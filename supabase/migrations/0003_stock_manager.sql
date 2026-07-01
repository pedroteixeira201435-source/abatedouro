-- Adds the 'stock_manager' role. Run AFTER 0002.
-- Stock managers get an inventory-only UI (add products + restock), enforced client-side;
-- the role value here is what the app reads to gate that view.

-- ============================================================
-- 1. Allow the new role on profiles + invites
-- ============================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','till','stock_manager'));

alter table public.company_invites drop constraint if exists company_invites_role_check;
alter table public.company_invites add constraint company_invites_role_check
  check (role in ('admin','till','stock_manager'));

-- ============================================================
-- 2. Let admins choose the invited role (defaults to 'till')
-- ============================================================
create or replace function public.create_invite(invite_role text default 'till') returns text
language plpgsql security definer set search_path = public as $$
declare v_code text; v_company uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can create invites'; end if;
  if invite_role not in ('till','stock_manager') then
    raise exception 'Invalid invite role';
  end if;
  select company_id into v_company from public.profiles where id = auth.uid();
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into public.company_invites (code, company_id, role, created_by)
    values (v_code, v_company, invite_role, auth.uid());
  return v_code;
end $$;
