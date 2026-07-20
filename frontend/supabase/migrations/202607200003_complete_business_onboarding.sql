alter table public.businesses
  add column if not exists business_registration_number text,
  add column if not exists owner_name text,
  add column if not exists industry text,
  add column if not exists region text;

alter table public.businesses
  drop constraint if exists businesses_business_registration_number_check;
alter table public.businesses
  add constraint businesses_business_registration_number_check
  check (business_registration_number is null or business_registration_number ~ '^[0-9]{10}$');

alter table public.business_memberships
  add column if not exists status text not null default 'active';
alter table public.business_memberships
  drop constraint if exists business_memberships_status_check;
alter table public.business_memberships
  add constraint business_memberships_status_check
  check (status in ('active', 'inactive'));

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
      and membership.status = 'active'
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
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function private.can_access_active_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_memberships membership
    join public.businesses business on business.id = membership.business_id
    where membership.business_id = target_business_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'manager', 'staff')
      and business.status = 'active'
  );
$$;

revoke all on function private.can_access_active_business(uuid) from public, anon, authenticated;
grant execute on function private.can_access_active_business(uuid) to authenticated;

create or replace function public.has_current_business()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_memberships membership
    join public.businesses business on business.id = membership.business_id
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and business.status = 'active'
  );
$$;

revoke all on function public.has_current_business() from public, anon;
grant execute on function public.has_current_business() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop function if exists public.ensure_current_user_business();

create or replace function public.create_initial_business(
  business_name text,
  business_industry text,
  registration_number text default null,
  representative_name text default null,
  business_region text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  existing_business_id uuid;
  new_business_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select membership.business_id
    into existing_business_id
  from public.business_memberships membership
  join public.businesses business on business.id = membership.business_id
  where membership.user_id = current_user_id
    and membership.status = 'active'
    and business.status = 'active'
  order by case when membership.role = 'owner' then 0 else 1 end,
           membership.created_at,
           membership.id
  limit 1;

  if existing_business_id is not null then
    return existing_business_id;
  end if;

  if nullif(btrim(business_name), '') is null
     or char_length(btrim(business_name)) > 80
     or nullif(btrim(business_industry), '') is null
     or char_length(btrim(business_industry)) > 80 then
    raise exception 'invalid business input' using errcode = '22023';
  end if;

  if registration_number is not null and registration_number !~ '^[0-9]{10}$' then
    raise exception 'invalid registration number' using errcode = '22023';
  end if;

  insert into public.businesses (
    name, owner_user_id, business_registration_number, owner_name, industry, region
  ) values (
    btrim(business_name), current_user_id, registration_number,
    nullif(btrim(representative_name), ''), btrim(business_industry),
    nullif(btrim(business_region), '')
  ) returning id into new_business_id;

  insert into public.business_memberships (business_id, user_id, role, status)
  values (new_business_id, current_user_id, 'owner', 'active');

  return new_business_id;
end;
$$;

revoke all on function public.create_initial_business(text, text, text, text, text) from public, anon;
grant execute on function public.create_initial_business(text, text, text, text, text) to authenticated;

revoke update on public.businesses from authenticated;
grant update (name, business_registration_number, owner_name, industry, region, status)
  on public.businesses to authenticated;
