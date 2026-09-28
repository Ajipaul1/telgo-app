create extension if not exists pgcrypto;

create table if not exists public.mobile_app_users (
  id text primary key,
  phone text unique,
  pin_hash text,
  full_name text not null default 'Telgo Mobile User',
  role text not null default 'engineer',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mobile_app_users
  alter column phone drop not null,
  alter column pin_hash drop not null,
  add column if not exists email text,
  add column if not exists login_id text,
  add column if not exists temp_password_hash text,
  add column if not exists access_status text not null default 'pending',
  add column if not exists activated_at timestamptz,
  add column if not exists pin_set_at timestamptz,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists last_login_at timestamptz,
  add column if not exists user_folder_path text;

alter table public.mobile_app_users enable row level security;

create unique index if not exists mobile_app_users_email_unique_idx
  on public.mobile_app_users (lower(email))
  where email is not null;

create unique index if not exists mobile_app_users_login_id_unique_idx
  on public.mobile_app_users (lower(login_id))
  where login_id is not null;

create table if not exists public.mobile_user_files (
  id uuid primary key default gen_random_uuid(),
  mobile_user_id text not null references public.mobile_app_users(id) on delete cascade,
  folder_path text not null unique,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mobile_user_files enable row level security;

grant select, insert, update on public.mobile_app_users to anon, authenticated;
grant select, insert, update on public.mobile_user_files to anon, authenticated;

create or replace function public.normalize_mobile_role(p_role text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_role, 'engineer'))
    when 'site engineer' then 'engineer'
    when 'engineer' then 'engineer'
    when 'finance' then 'finance'
    when 'client' then 'client'
    when 'supervisor' then 'supervisor'
    when 'admin' then 'admin'
    else 'engineer'
  end;
$$;

create or replace function public.request_email_mobile_access(
  p_full_name text,
  p_email text,
  p_requested_role text,
  p_login_id text,
  p_password_hash text
)
returns table (
  id text,
  email text,
  full_name text,
  role text,
  login_id text,
  user_folder_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  normalized_role text := public.normalize_mobile_role(p_requested_role);
  normalized_login_id text := upper(regexp_replace(coalesce(p_login_id, ''), '\s+', '', 'g'));
  user_id text := 'email-' || md5(lower(trim(coalesce(p_email, ''))));
  folder_path text;
  saved_user public.mobile_app_users;
begin
  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'Full name is required';
  end if;

  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required';
  end if;

  if normalized_login_id = '' or length(coalesce(p_password_hash, '')) < 32 then
    raise exception 'Login credentials are invalid';
  end if;

  folder_path := 'mobile-users/' || normalized_login_id;

  insert into public.mobile_app_users (
    id,
    email,
    login_id,
    temp_password_hash,
    full_name,
    role,
    access_status,
    activated_at,
    user_folder_path
  )
  values (
    user_id,
    normalized_email,
    normalized_login_id,
    p_password_hash,
    trim(p_full_name),
    normalized_role,
    'active',
    now(),
    folder_path
  )
  on conflict (id) do update set
    email = excluded.email,
    login_id = excluded.login_id,
    temp_password_hash = excluded.temp_password_hash,
    full_name = excluded.full_name,
    role = excluded.role,
    access_status = 'active',
    blocked_at = null,
    blocked_reason = null,
    activated_at = coalesce(public.mobile_app_users.activated_at, now()),
    user_folder_path = excluded.user_folder_path,
    updated_at = now()
  returning * into saved_user;

  insert into public.mobile_user_files (mobile_user_id, folder_path, profile)
  values (
    saved_user.id,
    folder_path,
    jsonb_build_object(
      'fullName', saved_user.full_name,
      'email', saved_user.email,
      'role', saved_user.role,
      'loginId', saved_user.login_id
    )
  )
  on conflict (folder_path) do update set
    mobile_user_id = excluded.mobile_user_id,
    profile = excluded.profile,
    updated_at = now();

  return query
  select
    saved_user.id,
    saved_user.email,
    saved_user.full_name,
    saved_user.role,
    saved_user.login_id,
    saved_user.user_folder_path,
    saved_user.created_at;
end;
$$;

create or replace function public.verify_email_access(
  p_login_id text,
  p_password_hash text
)
returns table (
  id text,
  email text,
  full_name text,
  role text,
  login_id text,
  user_folder_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mobile_app_users u
  set last_login_at = now()
  where lower(u.login_id) = lower(regexp_replace(coalesce(p_login_id, ''), '\s+', '', 'g'))
    and u.temp_password_hash = p_password_hash
    and u.access_status = 'active'
    and u.blocked_at is null;

  return query
  select u.id, u.email, u.full_name, u.role, u.login_id, u.user_folder_path, u.created_at
  from public.mobile_app_users u
  where lower(u.login_id) = lower(regexp_replace(coalesce(p_login_id, ''), '\s+', '', 'g'))
    and u.temp_password_hash = p_password_hash
    and u.access_status = 'active'
    and u.blocked_at is null
  limit 1;
end;
$$;

create or replace function public.set_mobile_login_pin(
  p_user_id text,
  p_password_hash text,
  p_pin_hash text
)
returns table (
  id text,
  email text,
  full_name text,
  role text,
  login_id text,
  user_folder_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if length(coalesce(p_pin_hash, '')) < 32 then
    raise exception 'PIN hash is invalid';
  end if;

  update public.mobile_app_users u
  set
    pin_hash = p_pin_hash,
    temp_password_hash = null,
    pin_set_at = now(),
    last_login_at = now(),
    updated_at = now()
  where u.id = p_user_id
    and u.temp_password_hash = p_password_hash
    and u.access_status = 'active'
    and u.blocked_at is null;

  return query
  select u.id, u.email, u.full_name, u.role, u.login_id, u.user_folder_path, u.created_at
  from public.mobile_app_users u
  where u.id = p_user_id
    and u.pin_hash = p_pin_hash
    and u.access_status = 'active'
    and u.blocked_at is null
  limit 1;
end;
$$;

create or replace function public.verify_mobile_pin_by_login(
  p_login_id text,
  p_pin_hash text
)
returns table (
  id text,
  email text,
  full_name text,
  role text,
  login_id text,
  user_folder_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mobile_app_users u
  set last_login_at = now()
  where lower(u.login_id) = lower(regexp_replace(coalesce(p_login_id, ''), '\s+', '', 'g'))
    and u.pin_hash = p_pin_hash
    and u.pin_set_at is not null
    and u.access_status = 'active'
    and u.blocked_at is null;

  return query
  select u.id, u.email, u.full_name, u.role, u.login_id, u.user_folder_path, u.created_at
  from public.mobile_app_users u
  where lower(u.login_id) = lower(regexp_replace(coalesce(p_login_id, ''), '\s+', '', 'g'))
    and u.pin_hash = p_pin_hash
    and u.pin_set_at is not null
    and u.access_status = 'active'
    and u.blocked_at is null
  limit 1;
end;
$$;

create or replace function public.block_mobile_user(
  p_login_id text,
  p_reason text default 'blocked by operations'
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.mobile_app_users
  set
    access_status = 'blocked',
    blocked_at = now(),
    blocked_reason = coalesce(nullif(p_reason, ''), 'blocked by operations'),
    updated_at = now()
  where lower(mobile_app_users.login_id) = lower(regexp_replace(coalesce(p_login_id, ''), '\s+', '', 'g'));
$$;

grant execute on function public.request_email_mobile_access(text, text, text, text, text) to anon, authenticated;
grant execute on function public.verify_email_access(text, text) to anon, authenticated;
grant execute on function public.set_mobile_login_pin(text, text, text) to anon, authenticated;
grant execute on function public.verify_mobile_pin_by_login(text, text) to anon, authenticated;
grant execute on function public.block_mobile_user(text, text) to authenticated;
