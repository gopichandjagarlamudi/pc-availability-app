-- Run this in Supabase SQL Editor.
-- Creates: profiles, submissions + RLS policies for rep + manager access.

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- Profiles table (1 row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'rep' check (role in ('rep', 'manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Submissions table (1 row per rep per cycle)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rep_name text not null,
  rep_email text,
  cycle_id text not null,
  availability jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cycle_id)
);

-- In case the table already exists (older schema), ensure rep_email column exists.
alter table public.submissions add column if not exists rep_email text;
create index if not exists submissions_rep_email_idx on public.submissions (rep_email);

-- Rep allowlist: only these emails can create rep accounts
-- Also stores rep metadata for manager export/reporting.
create sequence if not exists public.rep_allowlist_rep_id_seq;
create table if not exists public.rep_allowlist (
  rep_id integer not null default nextval('public.rep_allowlist_rep_id_seq'),
  email text primary key,
  full_name text,
  home_address text,
  home_lat double precision,
  home_lng double precision,
  status text not null default 'active' check (status in ('active', 'inactive')),
  employment_type text not null default 'full-time' check (employment_type in ('full-time', 'part-time')),
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now()
);

-- In case the table already exists (older schema), ensure new columns exist.
alter table public.rep_allowlist add column if not exists rep_id integer;
alter table public.rep_allowlist alter column rep_id set default nextval('public.rep_allowlist_rep_id_seq');
alter table public.rep_allowlist add column if not exists home_address text;
alter table public.rep_allowlist add column if not exists home_lat double precision;
alter table public.rep_allowlist add column if not exists home_lng double precision;
alter table public.rep_allowlist add column if not exists status text;
alter table public.rep_allowlist alter column status set default 'active';
update public.rep_allowlist set status = 'active' where status is null;
alter table public.rep_allowlist add column if not exists employment_type text;
-- Normalize existing values before enforcing constraint.
-- Converts common variants (Full Time, fulltime, PART_TIME, etc) into 'full-time' / 'part-time'.
update public.rep_allowlist
set employment_type = case
  when employment_type is null then null
  when regexp_replace(lower(employment_type), '[^a-z]', '', 'g') = 'fulltime' then 'full-time'
  when regexp_replace(lower(employment_type), '[^a-z]', '', 'g') = 'parttime' then 'part-time'
  else regexp_replace(lower(trim(employment_type)), '\\s+', '-', 'g')
end;
-- Backfill/repair any remaining invalid or empty values.
update public.rep_allowlist
set employment_type = 'full-time'
where employment_type is null
   or trim(employment_type) = ''
   or employment_type not in ('full-time', 'part-time');
alter table public.rep_allowlist alter column employment_type set default 'full-time';
alter table public.rep_allowlist alter column employment_type set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rep_allowlist_employment_type_check'
      and conrelid = 'public.rep_allowlist'::regclass
  ) then
    alter table public.rep_allowlist
      add constraint rep_allowlist_employment_type_check
      check (employment_type in ('full-time', 'part-time'));
  end if;
end
$$;

-- Backfill stable rep_id for existing rows.
update public.rep_allowlist set rep_id = nextval('public.rep_allowlist_rep_id_seq') where rep_id is null;
create unique index if not exists rep_allowlist_rep_id_uidx on public.rep_allowlist (rep_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Get the current user's email in a way that doesn't rely on JWT containing an `email` claim.
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = auth
set row_security = off
as $$
  select email from auth.users where id = auth.uid();
$$;

-- Enforce allowlisted rep signups at the database level (cannot be bypassed from the client).
-- NOTE: Manager users should be created in Supabase with app_metadata.role = "manager"
-- (or added to the allowlist first) so they can sign in.
create or replace function public.enforce_rep_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
begin
  -- Allow manager accounts (created by an admin) to bypass the allowlist.
  if coalesce(new.raw_app_meta_data ->> 'role', '') = 'manager' then
    return new;
  end if;

  if new.email is null then
    raise exception 'Email is required';
  end if;

  if not exists (
    select 1 from public.rep_allowlist a
    where lower(a.email) = lower(new.email)
      and a.status = 'active'
  ) then
    raise exception 'Email not permitted to sign up';
  end if;

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_submissions_updated_at on public.submissions;
create trigger set_submissions_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.rep_allowlist enable row level security;

-- Profiles: self read/write
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Submissions: reps can manage their own rows
drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own"
on public.submissions for select
using (
  auth.uid() = user_id
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager'
    or exists (
      select 1 from public.rep_allowlist a
      where lower(a.email) = lower(public.current_user_email())
        and a.status = 'active'
    )
  )
);

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own"
on public.submissions for insert
with check (
  auth.uid() = user_id
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager'
    or exists (
      select 1 from public.rep_allowlist a
      where lower(a.email) = lower(public.current_user_email())
        and a.status = 'active'
    )
  )
);

drop policy if exists "submissions_update_own" on public.submissions;
create policy "submissions_update_own"
on public.submissions for update
using (
  auth.uid() = user_id
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager'
    or exists (
      select 1 from public.rep_allowlist a
      where lower(a.email) = lower(public.current_user_email())
        and a.status = 'active'
    )
  )
)
with check (
  auth.uid() = user_id
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'manager'
    or exists (
      select 1 from public.rep_allowlist a
      where lower(a.email) = lower(public.current_user_email())
        and a.status = 'active'
    )
  )
);

-- Managers can read all profiles/submissions
drop policy if exists "profiles_select_manager" on public.profiles;
create policy "profiles_select_manager"
on public.profiles for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

drop policy if exists "submissions_select_manager" on public.submissions;
create policy "submissions_select_manager"
on public.submissions for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

-- Managers can delete submissions
drop policy if exists "submissions_delete_manager" on public.submissions;
create policy "submissions_delete_manager"
on public.submissions for delete
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

-- Rep allowlist policies: manager-only
drop policy if exists "rep_allowlist_select_manager" on public.rep_allowlist;
create policy "rep_allowlist_select_manager"
on public.rep_allowlist for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

-- Reps can read only their own allowlist row (used to enforce access after signup).
drop policy if exists "rep_allowlist_select_self" on public.rep_allowlist;
create policy "rep_allowlist_select_self"
on public.rep_allowlist for select
using (lower(email) = lower(public.current_user_email()));

drop policy if exists "rep_allowlist_insert_manager" on public.rep_allowlist;
create policy "rep_allowlist_insert_manager"
on public.rep_allowlist for insert
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

drop policy if exists "rep_allowlist_update_manager" on public.rep_allowlist;
create policy "rep_allowlist_update_manager"
on public.rep_allowlist for update
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

drop policy if exists "rep_allowlist_delete_manager" on public.rep_allowlist;
create policy "rep_allowlist_delete_manager"
on public.rep_allowlist for delete
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'manager');

-- Trigger to enforce allowlist on signup/user creation
drop trigger if exists enforce_rep_allowlist on auth.users;
create trigger enforce_rep_allowlist
before insert on auth.users
for each row execute function public.enforce_rep_allowlist();
