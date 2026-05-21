alter table public.shift_reports
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists urgency text not null default 'normal' check (urgency in ('normal', 'urgent'));