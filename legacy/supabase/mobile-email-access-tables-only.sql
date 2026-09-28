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

grant select, insert, update on public.mobile_app_users to anon, authenticated;
grant select, insert, update on public.mobile_user_files to anon, authenticated;
