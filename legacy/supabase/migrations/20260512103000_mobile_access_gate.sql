create extension if not exists pgcrypto;

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
  add column if not exists user_folder_path text,
  add column if not exists access_request_id uuid references public.access_requests(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mobile_app_users_access_status_check'
      and conrelid = 'public.mobile_app_users'::regclass
  ) then
    alter table public.mobile_app_users
      add constraint mobile_app_users_access_status_check
      check (access_status in ('pending', 'active', 'inactive', 'blocked'));
  end if;
end $$;

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
grant select, insert, update on public.mobile_user_files to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mobile_user_files'
      and policyname = 'mobile_user_files_self_or_ops'
  ) then
    create policy mobile_user_files_self_or_ops
      on public.mobile_user_files
      for all
      to authenticated
      using (public.is_operations_lead())
      with check (public.is_operations_lead());
  end if;
end $$;

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
  saved_request public.access_requests;
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

  insert into public.access_requests (
    full_name,
    email,
    company_name,
    requested_role,
    access_purpose,
    status,
    reviewed_at
  )
  values (
    trim(p_full_name),
    normalized_email,
    'Telgo Power Projects',
    normalized_role,
    'mobile_email_access',
    'approved',
    now()
  )
  returning * into saved_request;

  insert into public.mobile_app_users (
    id,
    email,
    login_id,
    temp_password_hash,
    full_name,
    role,
    access_status,
    activated_at,
    user_folder_path,
    access_request_id
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
    folder_path,
    saved_request.id
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
    access_request_id = excluded.access_request_id,
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
      'loginId', saved_user.login_id,
      'accessRequestId', saved_request.id
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
  where lower(login_id) = lower(regexp_replace(coalesce(p_login_id, ''), '\s+', '', 'g'));
$$;

create or replace function public.activate_approved_mobile_user(
  p_phone text,
  p_pin_hash text,
  p_full_name text default null
)
returns public.mobile_app_users
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Phone activation has been replaced by email access';
end;
$$;

create or replace function public.register_mobile_user(
  p_phone text,
  p_pin_hash text,
  p_full_name text default null
)
returns public.mobile_app_users
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.activate_approved_mobile_user(p_phone, p_pin_hash, p_full_name);
end;
$$;

create or replace function public.verify_mobile_pin(
  p_phone text,
  p_pin_hash text
)
returns table (
  id text,
  phone text,
  full_name text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select u.id, u.phone, u.full_name, u.role, u.created_at
  from public.mobile_app_users u
  where false;
$$;

grant execute on function public.request_email_mobile_access(text, text, text, text, text) to anon, authenticated;
grant execute on function public.verify_email_access(text, text) to anon, authenticated;
grant execute on function public.set_mobile_login_pin(text, text, text) to anon, authenticated;
grant execute on function public.verify_mobile_pin_by_login(text, text) to anon, authenticated;
grant execute on function public.block_mobile_user(text, text) to authenticated;
grant execute on function public.activate_approved_mobile_user(text, text, text) to authenticated;
grant execute on function public.register_mobile_user(text, text, text) to authenticated;
grant execute on function public.verify_mobile_pin(text, text) to anon, authenticated;
