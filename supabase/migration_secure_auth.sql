-- PDT Dashboard — incremental migration: secure login
--
-- SKIP THIS FILE if you ran schema.sql fresh (it already includes the
-- login/create_agent/update_agent/delete_agent functions, the agents_public
-- view, and the locked-down agents/admins policies). This file is only for
-- a database that was set up from an OLDER schema.sql/seed.sql with
-- plaintext passwords and open "anon full access" policies on agents/admins.
--
-- After this runs:
--   - agents/admins passwords are bcrypt hashes, not plaintext.
--   - anon has NO direct read/write access to agents/admins at all.
--   - login + all agent create/update/delete goes through the functions
--     below (security definer — they bypass RLS internally).
--   - the app reads the team roster via the password-free agents_public view.
--
-- You must also update the app code (already done if you pulled the latest
-- changes) — this file only touches the database.

create extension if not exists pgcrypto;

set search_path = public, extensions;

-- hash any plaintext passwords currently in the tables (safe to re-run: skips anything already a bcrypt hash).
update agents set password = crypt(password, gen_salt('bf')) where password not like '$2%';
update admins set password = crypt(password, gen_salt('bf')) where password not like '$2%';

create or replace view agents_public as
  select id, name, team, username from agents;

create or replace function public.login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  result jsonb;
begin
  select jsonb_build_object('role', 'admin', 'id', id, 'username', username, 'name', name)
    into result from admins
    where username = lower(p_username) and password = crypt(p_password, password)
    limit 1;
  if result is not null then return result; end if;

  select jsonb_build_object('role', 'agent', 'id', id, 'username', username, 'name', name, 'team', team)
    into result from agents
    where username = lower(p_username) and password = crypt(p_password, password)
    limit 1;
  return result;
end;
$$;

create or replace function public.create_agent(p_id text, p_name text, p_team text, p_username text, p_password text)
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
  insert into agents (id, name, team, username, password)
  values (p_id, p_name, p_team, lower(p_username), crypt(p_password, gen_salt('bf')));
end;
$$;

create or replace function public.update_agent(p_id text, p_name text default null, p_team text default null, p_username text default null, p_password text default null)
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
    password = case when p_password is not null and length(p_password) > 0 then crypt(p_password, gen_salt('bf')) else password end
  where id = p_id;
end;
$$;

create or replace function public.delete_agent(p_id text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from agents where id = p_id;
end;
$$;

revoke all on function public.login(text, text) from public;
revoke all on function public.create_agent(text, text, text, text, text) from public;
revoke all on function public.update_agent(text, text, text, text, text) from public;
revoke all on function public.delete_agent(text) from public;
grant execute on function public.login(text, text) to anon, authenticated;
grant execute on function public.create_agent(text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_agent(text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_agent(text) to anon, authenticated;

-- lock down direct access to the credential tables
drop policy if exists "anon full access" on agents;
drop policy if exists "anon full access" on admins;
grant select on agents_public to anon, authenticated;
