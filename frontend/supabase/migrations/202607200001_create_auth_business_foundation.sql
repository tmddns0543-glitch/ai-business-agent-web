create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  constraint business_memberships_business_user_key unique (business_id, user_id)
);

create index if not exists businesses_owner_user_id_idx on public.businesses(owner_user_id);
create index if not exists business_memberships_user_id_idx on public.business_memberships(user_id);
create index if not exists business_memberships_business_id_idx on public.business_memberships(business_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function private.set_updated_at();

create or replace function private.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_memberships membership
    where membership.business_id = target_business_id
      and membership.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_business_role(target_business_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_memberships membership
    where membership.business_id = target_business_id
      and membership.user_id = (select auth.uid())
      and membership.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_business_member(uuid) from public, anon, authenticated;
revoke all on function private.has_business_role(uuid, text[]) from public, anon, authenticated;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid, text[]) to authenticated;

create or replace function private.bootstrap_user(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  insert into public.profiles (id)
  values (target_user_id)
  on conflict (id) do nothing;

  select business.id
    into target_business_id
  from public.businesses business
  where business.owner_user_id = target_user_id
  order by business.created_at, business.id
  limit 1;

  if target_business_id is null then
    insert into public.businesses (name, owner_user_id)
    values ('내 가게', target_user_id)
    returning id into target_business_id;
  end if;

  insert into public.business_memberships (business_id, user_id, role)
  values (target_business_id, target_user_id, 'owner')
  on conflict (business_id, user_id) do update
    set role = 'owner';

  return target_business_id;
end;
$$;

revoke all on function private.bootstrap_user(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.bootstrap_user(new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.ensure_current_user_business()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  return private.bootstrap_user(current_user_id);
end;
$$;

revoke all on function public.ensure_current_user_business() from public, anon;
grant execute on function public.ensure_current_user_business() to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "businesses_select_member" on public.businesses;
create policy "businesses_select_member" on public.businesses
for select to authenticated using (private.is_business_member(id));

drop policy if exists "businesses_update_owner_manager" on public.businesses;
create policy "businesses_update_owner_manager" on public.businesses
for update to authenticated
using (private.has_business_role(id, array['owner', 'manager']))
with check (private.has_business_role(id, array['owner', 'manager']));

drop policy if exists "memberships_select_same_business" on public.business_memberships;
create policy "memberships_select_same_business" on public.business_memberships
for select to authenticated using (private.is_business_member(business_id));

revoke insert, delete on public.profiles from anon, authenticated;
revoke insert, delete on public.businesses from anon, authenticated;
revoke insert, update, delete on public.business_memberships from anon, authenticated;
revoke update on public.businesses from authenticated;
grant update (name, status) on public.businesses to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
