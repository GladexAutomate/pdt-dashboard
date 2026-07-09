-- PDT Dashboard — adds a "My Account" RPC so the admin can change their own
-- username/password from the app instead of needing direct SQL access.
-- Run this once in the Supabase SQL editor. Safe to run more than once.

set search_path = public, extensions;

-- Changing the admin's own account requires the current password, unlike
-- update_agent — this is the one credential that gates everything else, so
-- it gets one extra check even though the app's overall RLS model otherwise
-- trusts the anon key for everything (see schema.sql's RLS note).
create or replace function public.update_admin(p_id text, p_current_password text, p_name text default null, p_username text default null, p_new_password text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
begin
  if not exists (select 1 from admins where id = p_id and password = crypt(p_current_password, password)) then
    raise exception 'Current password is incorrect.';
  end if;
  v_username := lower(coalesce(p_username, (select username from admins where id = p_id)));
  if exists (select 1 from admins where username = v_username and id <> p_id)
     or exists (select 1 from agents where username = v_username) then
    raise exception 'That username is already taken.';
  end if;
  update admins set
    name = coalesce(p_name, name),
    username = v_username,
    password = case when p_new_password is not null and length(p_new_password) > 0 then crypt(p_new_password, gen_salt('bf')) else password end
  where id = p_id;
end;
$$;

revoke all on function public.update_admin(text, text, text, text, text) from public;
grant execute on function public.update_admin(text, text, text, text, text) to anon, authenticated;
