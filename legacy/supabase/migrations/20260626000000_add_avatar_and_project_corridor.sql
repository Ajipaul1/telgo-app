-- Database migration to support circular Base64 profile photo upload and detailed GIS project routing data

-- 1. Add columns to public.mobile_app_users if not exists
alter table public.mobile_app_users add column if not exists avatar_url text;
alter table public.mobile_app_users add column if not exists phone text;

-- 2. Add columns to public.projects if not exists
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists corridor_data jsonb;
alter table public.projects add column if not exists storage_materials jsonb default '[]'::jsonb;

-- 3. Grant select, insert, update on projects to anonymous & authenticated roles for client-side API synchronization
grant select, insert, update on public.projects to anon, authenticated;
