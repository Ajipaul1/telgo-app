create table if not exists public.mobile_app_users (
  id text primary key,
  phone text not null unique,
  pin_hash text not null,
  full_name text not null default 'Ajith',
  role text not null default 'employee',
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mobile_app_users enable row level security;

grant select, insert, update on public.mobile_app_users to authenticated;
grant execute on all functions in schema public to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mobile_app_users'
      and policyname = 'mobile_app_users_self_read'
  ) then
    create policy mobile_app_users_self_read
      on public.mobile_app_users
      for select
      to authenticated
      using (auth_user_id = auth.uid() or public.is_operations_lead());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mobile_app_users'
      and policyname = 'mobile_app_users_self_write'
  ) then
    create policy mobile_app_users_self_write
      on public.mobile_app_users
      for insert
      to authenticated
      with check (auth_user_id = auth.uid() or auth_user_id is null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mobile_app_users'
      and policyname = 'mobile_app_users_self_update'
  ) then
    create policy mobile_app_users_self_update
      on public.mobile_app_users
      for update
      to authenticated
      using (auth_user_id = auth.uid() or public.is_operations_lead())
      with check (auth_user_id = auth.uid() or public.is_operations_lead());
  end if;
end $$;

create or replace function public.register_mobile_user(
  p_phone text,
  p_pin_hash text,
  p_full_name text default 'Ajith'
)
returns public.mobile_app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g');
  user_id text := 'mobile-' || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  saved_user public.mobile_app_users;
begin
  if length(regexp_replace(normalized_phone, '\D', '', 'g')) < 10 then
    raise exception 'A valid phone number is required';
  end if;

  if length(coalesce(p_pin_hash, '')) < 32 then
    raise exception 'PIN hash is invalid';
  end if;

  insert into public.mobile_app_users (id, phone, pin_hash, full_name, role, auth_user_id)
  values (user_id, normalized_phone, p_pin_hash, coalesce(nullif(p_full_name, ''), 'Ajith'), 'employee', auth.uid())
  on conflict (phone) do update set
    pin_hash = excluded.pin_hash,
    full_name = excluded.full_name,
    auth_user_id = coalesce(public.mobile_app_users.auth_user_id, excluded.auth_user_id),
    updated_at = now()
  returning * into saved_user;

  return saved_user;
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
  where u.phone = regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g')
    and u.pin_hash = p_pin_hash
  limit 1;
$$;

grant execute on function public.register_mobile_user(text, text, text) to anon, authenticated;
grant execute on function public.verify_mobile_pin(text, text) to anon, authenticated;
