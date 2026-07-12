-- PDT Dashboard — adds an optional gender field to agents, so features like
-- the "8 hours logged" congrats popup can pick an appropriately-styled
-- design and voice (or fall back to a neutral one when unset).
-- Run this once in the Supabase SQL editor. Safe to run more than once.

alter table agents add column if not exists gender text check (gender in ('male', 'female', 'other'));

create or replace view agents_public as
  select id, name, team, username, is_admin, is_active, gender from agents;

-- signatures below gained p_gender — drop the old arities first so they
-- don't linger as ambiguous overloads alongside the new ones.
drop function if exists public.create_agent(text, text, text, text, text);
drop function if exists public.update_agent(text, text, text, text, text);

create or replace function public.create_agent(p_id text, p_name text, p_team text, p_username text, p_password text, p_gender text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if exists (select 1 from agents where username = lower(p_username))
     or exists (select 1 from admins where username = lower(p_username)) then
    raise exception 'That username is already taken.';
  end if;
  insert into agents (id, name, team, username, password, gender)
  values (p_id, p_name, p_team, lower(p_username), crypt(p_password, gen_salt('bf')), p_gender);
end;
$$;

-- any param left null keeps its current value; p_password null/empty keeps the current password.
create or replace function public.update_agent(p_id text, p_name text default null, p_team text default null, p_username text default null, p_password text default null, p_gender text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
begin
  v_username := lower(coalesce(p_username, (select username from agents where id = p_id)));
  if exists (select 1 from agents where username = v_username and id <> p_id)
     or exists (select 1 from admins where username = v_username) then
    raise exception 'That username is already taken.';
  end if;
  update agents set
    name = coalesce(p_name, name),
    team = coalesce(p_team, team),
    username = v_username,
    password = case when p_password is not null and length(p_password) > 0 then crypt(p_password, gen_salt('bf')) else password end,
    gender = coalesce(p_gender, gender)
  where id = p_id;
end;
$$;

revoke all on function public.create_agent(text, text, text, text, text, text) from public;
revoke all on function public.update_agent(text, text, text, text, text, text) from public;
grant execute on function public.create_agent(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_agent(text, text, text, text, text, text) to anon, authenticated;
