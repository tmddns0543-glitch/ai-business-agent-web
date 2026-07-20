create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  business_date date not null,
  platform text not null check (platform in ('baemin', 'coupang-eats', 'yogiyo', 'ddangyo', 'general')),
  channel text not null,
  payment_method text check (payment_method is null or payment_method in ('prepaid', 'card', 'cash', 'bank-transfer')),
  amount bigint not null default 0 check (amount >= 0),
  order_count integer check (order_count is null or order_count >= 0),
  memo text,
  source text not null default 'app' check (source in ('app', 'local-import')),
  source_record_id text,
  import_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_business_date_platform_channel_key unique (business_id, business_date, platform, channel)
);

create index if not exists sales_business_id_idx on public.sales(business_id);
create index if not exists sales_business_date_idx on public.sales(business_id, business_date);
create index if not exists sales_business_platform_idx on public.sales(business_id, platform);
create index if not exists sales_business_date_platform_idx on public.sales(business_id, business_date, platform);
create unique index if not exists sales_business_import_key_key
  on public.sales(business_id, import_key)
  where import_key is not null;

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function private.set_updated_at();

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
      and membership.role in ('owner', 'manager', 'staff')
      and business.status = 'active'
  );
$$;

revoke all on function private.can_access_active_business(uuid) from public, anon, authenticated;
grant execute on function private.can_access_active_business(uuid) to authenticated;

alter table public.sales enable row level security;

drop policy if exists "sales_select_member" on public.sales;
create policy "sales_select_member" on public.sales
for select to authenticated
using (private.can_access_active_business(business_id));

drop policy if exists "sales_insert_member" on public.sales;
create policy "sales_insert_member" on public.sales
for insert to authenticated
with check (
  private.can_access_active_business(business_id)
  and created_by = (select auth.uid())
);

drop policy if exists "sales_update_member" on public.sales;
create policy "sales_update_member" on public.sales
for update to authenticated
using (private.can_access_active_business(business_id))
with check (
  private.can_access_active_business(business_id)
  and created_by = (select auth.uid())
);

drop policy if exists "sales_delete_member" on public.sales;
create policy "sales_delete_member" on public.sales
for delete to authenticated
using (private.can_access_active_business(business_id));

grant select, insert, update, delete on public.sales to authenticated;
revoke all on public.sales from anon;
