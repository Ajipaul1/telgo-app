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
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  gps_accuracy_m numeric(8, 2),
  distance_from_site_m numeric(8, 2),
  within_geofence boolean not null default false,
  status text not null default 'checked_in',
  source text not null default 'mobile_attendance',
  created_at timestamptz not null default now()
);

create table if not exists public.mobile_live_locations (
  id uuid primary key default gen_random_uuid(),
  mobile_user_id text not null,
  attendance_id uuid references public.mobile_attendance(id) on delete set null,
  user_name text not null,
  user_login_id text not null,
  user_role text not null,
  project_id text not null,
  project_name text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  gps_accuracy_m numeric(8, 2),
  distance_from_site_m numeric(8, 2),
  within_geofence boolean not null default false,
  source text not null default 'attendance_mark',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mobile_attendance_project_checkin_idx
  on public.mobile_attendance(project_id, check_in_at desc);

create index if not exists mobile_attendance_user_checkin_idx
  on public.mobile_attendance(mobile_user_id, check_in_at desc);

create index if not exists mobile_live_locations_project_recorded_idx
  on public.mobile_live_locations(project_id, recorded_at desc);

create index if not exists mobile_live_locations_user_recorded_idx
  on public.mobile_live_locations(mobile_user_id, recorded_at desc);

grant usage on schema public to service_role;
grant select, insert, update on table public.mobile_attendance to service_role;
grant select, insert, update on table public.mobile_live_locations to service_role;
