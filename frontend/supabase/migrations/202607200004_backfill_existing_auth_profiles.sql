insert into public.profiles (id)
select auth_user.id
from auth.users auth_user
on conflict (id) do nothing;

grant select on public.profiles to authenticated;
grant select on public.businesses to authenticated;
grant select on public.business_memberships to authenticated;
revoke all on public.profiles from anon;
revoke all on public.businesses from anon;
revoke all on public.business_memberships from anon;

notify pgrst, 'reload schema';
