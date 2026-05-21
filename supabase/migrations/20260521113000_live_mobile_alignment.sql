create extension if not exists pgcrypto;

alter table public.mobile_app_users
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

alter table public.mobile_app_users
  alter column phone drop not null,
  alter column pin_hash drop not null;

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

do $$
declare
  mobile_user_id_type text := 'text';
begin
  select c.data_type
    into mobile_user_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'mobile_app_users'
    and c.column_name = 'id';

  if to_regclass('public.mobile_user_files') is null then
    execute format(
      'create table public.mobile_user_files (
        id uuid primary key default gen_random_uuid(),
        mobile_user_id %s not null references public.mobile_app_users(id) on delete cascade,
        folder_path text not null unique,
        profile jsonb not null default ''{}''::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )',
      case
        when mobile_user_id_type = 'uuid' then 'uuid'
        else 'text'
      end
    );
  end if;
end $$;

alter table public.mobile_user_files enable row level security;

grant select, insert, update on public.mobile_app_users to anon, authenticated;
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
