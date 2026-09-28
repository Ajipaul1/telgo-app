-- LOCAL TEST DATABASE ONLY.
-- Recreates the live app tables exactly as they are on 28 Sep 2026 (read from the live database before the rebuild),
-- so the rebuild's migrations and truth tests run against the same shape as production.
-- Every statement is "if not exists": on the live database this file changes nothing. It is never applied to live.

create extension if not exists pgcrypto;

create table if not exists public.mobile_app_users (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  role text,
  is_approved boolean default false,
  login_pin text,
  created_at timestamptz default timezone('utc', now()),
  phone text,
  pin_hash text,
  auth_user_id uuid,
  updated_at timestamptz not null default now(),
  login_id text,
  temp_password_hash text,
  access_status text not null default 'pending',
  activated_at timestamptz,
  pin_set_at timestamptz,
  blocked_at timestamptz,
  blocked_reason text,
  last_login_at timestamptz,
  user_folder_path text,
  access_request_id uuid,
  password_hash text,
  avatar_url text
);
create unique index if not exists mobile_app_users_email_lower_idx on public.mobile_app_users (lower(email));
create unique index if not exists mobile_app_users_login_id_lower_idx on public.mobile_app_users (lower(login_id));

create table if not exists public.mobile_user_files (
  id uuid primary key default gen_random_uuid(),
  mobile_user_id uuid not null,
  folder_path text not null unique,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id text not null,
  actor_user_id text,
  title text not null,
  body text,
  notification_type text not null default 'system',
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.mobile_attendance (
  id uuid primary key default gen_random_uuid(),
  mobile_user_id text not null,
  user_name text not null,
  user_login_id text not null,
  user_role text not null,
  project_id text not null,
  project_name text not null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  latitude numeric not null,
  longitude numeric not null,
  gps_accuracy_m numeric,
  distance_from_site_m numeric,
  within_geofence boolean not null default false,
  status text not null default 'checked_in',
  source text not null default 'mobile_attendance',
  created_at timestamptz not null default now()
);

create table if not exists public.mobile_live_locations (
  id uuid primary key default gen_random_uuid(),
  mobile_user_id text not null,
  attendance_id uuid,
  user_name text not null,
  user_login_id text not null,
  user_role text not null,
  project_id text not null,
  project_name text not null,
  latitude numeric not null,
  longitude numeric not null,
  gps_accuracy_m numeric,
  distance_from_site_m numeric,
  within_geofence boolean not null default false,
  source text not null default 'attendance_mark',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  code text not null unique,
  name text not null,
  client_name text,
  contract_type text not null default 'EPC',
  project_type text,
  location text not null,
  district text,
  latitude numeric,
  longitude numeric,
  start_date date,
  end_date date,
  status text not null default 'active',
  progress numeric not null default 0,
  budget numeric not null default 0,
  spent numeric not null default 0,
  total_length_km numeric,
  completed_length_km numeric,
  project_manager_id text,
  site_in_charge_id text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  description text,
  corridor_data jsonb,
  storage_materials jsonb default '[]'::jsonb
);

create table if not exists public.pending_daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  project_id text not null,
  supervisor_id uuid not null,
  supervisor_name text not null,
  labor_count integer not null default 0,
  ot_hours integer not null default 0,
  calculated_wages numeric not null default 0,
  fuel_expenses numeric not null default 0,
  travel_expenses numeric not null default 0,
  room_rent numeric not null default 0,
  room_rent_receipt text,
  tool_rent numeric not null default 0,
  tool_rent_receipt text,
  excavation_length numeric not null default 0,
  hdd_length numeric not null default 0,
  cable_laying_length numeric not null default 0,
  cable_mounding_length numeric not null default 0,
  joining_links_completed integer not null default 0,
  rmu_foundation_status integer not null default 0,
  termination_endpoints integer not null default 0,
  termination_gps_lat numeric,
  termination_gps_lng numeric,
  stock_available jsonb default '{}'::jsonb,
  clearances jsonb default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  hdd_drilling_logs jsonb default '[]'::jsonb,
  hdd_metadata jsonb default '{}'::jsonb
);

create table if not exists public.master_project_ledger (
  id uuid primary key default gen_random_uuid(),
  ledger_date date not null,
  project_id text not null,
  total_labor_count integer not null default 0,
  total_ot_hours integer not null default 0,
  total_wages numeric not null default 0,
  total_fuel numeric not null default 0,
  total_travel numeric not null default 0,
  total_room_rent numeric not null default 0,
  total_tool_rent numeric not null default 0,
  total_excavation numeric not null default 0,
  total_hdd numeric not null default 0,
  total_cable_laying numeric not null default 0,
  total_cable_mounding numeric not null default 0,
  total_joining_links integer not null default 0,
  total_rmu_foundations integer not null default 0,
  total_terminations integer not null default 0,
  approved_reports_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (ledger_date, project_id)
);

create table if not exists public.report_clarification_messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  sender_id uuid not null,
  sender_name text not null,
  sender_role text not null,
  message text not null,
  item_type text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  company_name text,
  gst_number text,
  company_address text,
  requested_role text,
  access_purpose text,
  document_path text,
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  site text,
  assigned_project_id text,
  generated_login_id text,
  generated_password_hint text
);

-- live: these tables had row security OFF and the public key had every right on them (the hole 0001 closes)
alter table public.mobile_app_users disable row level security;
alter table public.pending_daily_reports disable row level security;
grant all on all tables in schema public to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', false), ('project-documents', 'project-documents', false), ('access-documents', 'access-documents', false)
on conflict (id) do nothing;
