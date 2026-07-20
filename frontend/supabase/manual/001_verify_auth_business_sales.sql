select
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regclass('public.businesses') is not null as businesses_exists,
  to_regclass('public.business_memberships') is not null as memberships_exists,
  to_regclass('public.sales') is not null as sales_exists,
  to_regprocedure('public.has_current_business()') is not null as current_business_rpc_exists,
  to_regprocedure('public.create_initial_business(text,text,text,text,text)') is not null as create_business_rpc_exists;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'businesses', 'business_memberships', 'sales')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'businesses', 'business_memberships', 'sales')
order by tablename, policyname;
