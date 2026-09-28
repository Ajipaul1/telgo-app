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

create index if not exists mobile_notifications_recipient_read_created_idx
  on public.mobile_notifications(recipient_user_id, is_read, created_at desc);

grant usage on schema public to service_role;
grant select, insert, update on table public.mobile_notifications to service_role;
