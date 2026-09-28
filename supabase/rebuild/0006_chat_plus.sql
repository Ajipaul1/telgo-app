-- 0006 chat like the TechAuditPros chat box: group chats (the + button), stickers, @mentions,
-- clear chat (the admin: for everyone; anyone: for themselves), the change log for chats.
-- Additive, safe to run more than once. Nothing is deleted: a cleared chat's messages go to the Trash.

-- ---------------------------------------------------------------- tables
alter table public.chat_threads drop constraint if exists chat_threads_kind_check;
alter table public.chat_threads add constraint chat_threads_kind_check check (kind in ('direct', 'team', 'topic'));
alter table public.chat_threads add column if not exists cleared_at timestamptz;
alter table public.chat_threads add column if not exists cleared_by uuid;
alter table public.chat_threads drop constraint if exists chat_threads_title_check;
alter table public.chat_threads add constraint chat_threads_title_check check (title is null or length(title) between 1 and 80);

alter table public.chat_members add column if not exists cleared_at timestamptz;   -- "clear chat" for this person only
alter table public.chat_members add column if not exists added_by uuid;

alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('text', 'photo', 'voice', 'file', 'sticker'));
alter table public.chat_messages drop constraint if exists chat_messages_sticker_check;
alter table public.chat_messages add constraint chat_messages_sticker_check check (kind <> 'sticker' or (body ~ '^[a-z0-9_-]{2,30}$' and file_id is null));
alter table public.chat_messages add column if not exists mentions uuid[] not null default '{}';

-- the change log: chats made, renamed, cleared, archived (a new message alone isn't a change)
create or replace function public.fn_audit() returns trigger
language plpgsql as $$
declare
  o jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else '{}'::jsonb end;
  n jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  secret text[] := array['password_hash', 'temp_password_hash', 'pin_hash', 'login_pin', 'token_hash', 'resume_hash'];
  skip text[] := array['updated_at', 'last_seen_at', 'last_login_at', 'last_message_at'];
  ch jsonb := '{}'::jsonb;
  k text;
  ov jsonb; nv jsonb;
  rid text;
  test boolean;
begin
  rid := coalesce(n ->> 'id', o ->> 'id');
  test := coalesce((n ->> 'is_test')::boolean, (o ->> 'is_test')::boolean, false);
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      if k = any(skip) then continue; end if;
      ov := o -> k; nv := n -> k;
      if ov is distinct from nv then
        if k = any(secret) then ch := ch || jsonb_build_object(k, 'changed');
        else ch := ch || jsonb_build_object(k, jsonb_build_array(
          case when length(coalesce(ov::text, '')) > 400 then to_jsonb('(long value)'::text) else ov end,
          case when length(coalesce(nv::text, '')) > 400 then to_jsonb('(long value)'::text) else nv end));
        end if;
      end if;
    end loop;
    if ch = '{}'::jsonb then return new; end if;
  else
    for k in select jsonb_object_keys(case when tg_op = 'INSERT' then n else o end) loop
      if k = any(secret) then continue; end if;
      nv := (case when tg_op = 'INSERT' then n else o end) -> k;
      if nv is null or nv = 'null'::jsonb then continue; end if;
      ch := ch || jsonb_build_object(k, case when length(nv::text) > 400 then to_jsonb('(long value)'::text) else nv end);
    end loop;
  end if;
  insert into public.audit_log (actor, table_name, row_id, action, changes, is_test)
  values (public.app_actor(), tg_table_name, rid, lower(tg_op), ch, test);
  return coalesce(new, old);
end $$;
drop trigger if exists trg_audit on public.chat_threads;
create trigger trg_audit after insert or update on public.chat_threads for each row execute function public.fn_audit();

-- ---------------------------------------------------------------- a new message: who is told
-- one card per chat (never the text); a person @mentioned gets a "mentioned you" card instead
create or replace function public.fn_chat_message() returns trigger
language plpgsql as $$
declare t public.chat_threads; s public.mobile_app_users; m record; what text; place text; ttl text;
begin
  select * into t from public.chat_threads where id = new.thread_id;
  select * into s from public.mobile_app_users where id = new.sender_id;
  update public.chat_threads set last_message_at = new.created_at where id = new.thread_id;
  update public.chat_members set last_read_at = new.created_at where thread_id = new.thread_id and user_id = new.sender_id;
  what := case new.kind when 'photo' then 'sent a photo' when 'voice' then 'sent a voice note' when 'file' then 'sent a file'
                        when 'sticker' then 'sent a sticker' else 'sent a message' end;
  ttl := case t.kind when 'team' then 'Team chat' when 'topic' then coalesce(t.title, 'Group chat') else coalesce(s.full_name, 'Chat') end;
  place := case when t.kind = 'direct' then '' else ' in ' || ttl end;
  for m in select cm.user_id, (cm.user_id = any(new.mentions)) as named from public.chat_members cm
           where cm.thread_id = new.thread_id and cm.left_at is null and cm.user_id <> new.sender_id loop
    if m.named then
      if not exists (select 1 from public.mobile_notifications n where n.recipient_user_id = m.user_id::text and n.entity_type = 'chat'
                     and n.entity_id = t.id::text and n.notification_type = 'mention' and not n.is_read and n.cleared_at is null) then
        perform public.telgo_notify_one(m.user_id, new.sender_id, ttl,
          coalesce(s.full_name, 'Someone') || ' mentioned you' || place || '. Open the chat to read it.', 'mention', 'chat', t.id::text, '/app/chat/' || t.id);
      end if;
    elsif not exists (select 1 from public.mobile_notifications n where n.recipient_user_id = m.user_id::text and n.entity_type = 'chat'
                      and n.entity_id = t.id::text and not n.is_read and n.cleared_at is null) then
      perform public.telgo_notify_one(m.user_id, new.sender_id, ttl,
        coalesce(s.full_name, 'Someone') || ' ' || what || place || '. Open the chat to read it.', 'chat', 'chat', t.id::text, '/app/chat/' || t.id);
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists trg_chat on public.chat_messages;
create trigger trg_chat after insert on public.chat_messages for each row execute function public.fn_chat_message();

-- unread for one person: after they last read it and after they cleared it
create or replace function public.telgo_chat_unread(p_user uuid) returns int
language sql stable as $$
  select count(*)::int
  from public.chat_messages m
  join public.chat_members cm on cm.thread_id = m.thread_id and cm.user_id = p_user and cm.left_at is null
  join public.chat_threads t on t.id = m.thread_id and t.trashed_at is null and t.archived_at is null
  where m.sender_id <> p_user and m.removed_at is null and m.trashed_at is null
    and m.created_at > greatest(coalesce(cm.last_read_at, cm.joined_at), coalesce(cm.cleared_at, '-infinity'::timestamptz))
$$;

-- ---------------------------------------------------------------- group chats
-- The admin makes a group with the staff they pick. Anyone else makes a group with the admin
-- (the people they pick are not used). Every admin of the app is always in every group.
create or replace function public.telgo_chat_topic(p_user uuid, p_title text, p_members uuid[]) returns public.chat_threads
language plpgsql as $$
declare u public.mobile_app_users; t public.chat_threads; ttl text := btrim(coalesce(p_title, '')); picked uuid[]; who record;
begin
  select * into u from public.mobile_app_users where id = p_user;
  if u.id is null or u.access_status <> 'active' or u.archived_at is not null then
    raise exception 'Your login is not active.' using errcode = 'P0001', hint = 'ROLE';
  end if;
  if u.role = 'client' then raise exception 'Group chats are for the Telgo team.' using errcode = 'P0001', hint = 'ROLE'; end if;
  if length(ttl) < 1 or length(ttl) > 80 then raise exception 'Give the chat a name (80 letters at most).' using errcode = '22023', hint = 'INVALID'; end if;

  select coalesce(array_agg(x.id), '{}') into picked from public.mobile_app_users x
  where x.access_status = 'active' and x.archived_at is null and x.trashed_at is null and x.is_test = u.is_test
    and (x.role = 'admin' or (u.role = 'admin' and x.role <> 'client' and x.id = any(coalesce(p_members, '{}'))))
    and x.id <> p_user;
  if coalesce(array_length(picked, 1), 0) = 0 then
    raise exception 'Choose at least one person for the chat.' using errcode = '22023', hint = 'INVALID';
  end if;

  insert into public.chat_threads (kind, title, created_by, is_test) values ('topic', ttl, p_user, u.is_test) returning * into t;
  insert into public.chat_members (thread_id, user_id, added_by) values (t.id, p_user, p_user);
  for who in select unnest(picked) as id loop
    insert into public.chat_members (thread_id, user_id, added_by) values (t.id, who.id, p_user) on conflict do nothing;
    perform public.telgo_notify_one(who.id, p_user, ttl, u.full_name || ' added you to the chat "' || ttl || '".', 'chat', 'chat', t.id::text, '/app/chat/' || t.id);
  end loop;
  return t;
end $$;

-- the admin adds people to a group chat later (they see the messages from before too)
create or replace function public.telgo_chat_add(p_user uuid, p_thread uuid, p_members uuid[]) returns int
language plpgsql as $$
declare u public.mobile_app_users; t public.chat_threads; n int := 0; who record;
begin
  select * into u from public.mobile_app_users where id = p_user;
  select * into t from public.chat_threads where id = p_thread;
  if u.role is distinct from 'admin' then raise exception 'Only the admin can add people to a chat.' using errcode = 'P0001', hint = 'ROLE'; end if;
  if t.id is null or t.trashed_at is not null or t.is_test <> u.is_test then raise exception 'That chat doesn''t exist.' using errcode = 'P0001', hint = 'NOT_FOUND'; end if;
  if t.kind <> 'topic' then raise exception 'People can be added only to a group chat.' using errcode = '22023', hint = 'INVALID'; end if;
  for who in select x.id from public.mobile_app_users x
             where x.id = any(coalesce(p_members, '{}')) and x.access_status = 'active' and x.archived_at is null and x.trashed_at is null
               and x.is_test = u.is_test and x.role <> 'client'
               and not exists (select 1 from public.chat_members cm where cm.thread_id = t.id and cm.user_id = x.id and cm.left_at is null) loop
    insert into public.chat_members (thread_id, user_id, added_by) values (t.id, who.id, p_user)
      on conflict (thread_id, user_id) do update set left_at = null, joined_at = now(), added_by = p_user;
    perform public.telgo_notify_one(who.id, p_user, t.title, u.full_name || ' added you to the chat "' || t.title || '".', 'chat', 'chat', t.id::text, '/app/chat/' || t.id);
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'Those people are already in the chat.' using errcode = 'P0001', hint = 'NO_CHANGE'; end if;
  return n;
end $$;

-- ---------------------------------------------------------------- clear chat
-- the admin: every message leaves the chat for everyone and goes to the Trash (kept 90 days)
create or replace function public.telgo_chat_clear_all(p_user uuid, p_thread uuid) returns int
language plpgsql as $$
declare u public.mobile_app_users; t public.chat_threads; n int; now_ timestamptz := clock_timestamp();
begin
  select * into u from public.mobile_app_users where id = p_user;
  select * into t from public.chat_threads where id = p_thread;
  if u.role is distinct from 'admin' then raise exception 'Only the admin can clear a chat for everyone.' using errcode = 'P0001', hint = 'ROLE'; end if;
  if t.id is null or t.trashed_at is not null or t.is_test <> u.is_test then raise exception 'That chat doesn''t exist.' using errcode = 'P0001', hint = 'NOT_FOUND'; end if;
  update public.chat_messages set removed_at = now_, removed_by = p_user, trashed_at = now_, trashed_by = p_user
  where thread_id = p_thread and removed_at is null and trashed_at is null;
  get diagnostics n = row_count;
  update public.chat_threads set cleared_at = now_, cleared_by = p_user where id = p_thread;
  update public.chat_members set last_read_at = now_ where thread_id = p_thread and left_at is null;
  update public.mobile_notifications set is_read = true, read_at = now_
  where entity_type = 'chat' and entity_id = p_thread::text and not is_read;
  return n;
end $$;

-- anyone: the chat is emptied for them only; the others keep every message
create or replace function public.telgo_chat_clear_mine(p_user uuid, p_thread uuid) returns timestamptz
language plpgsql as $$
declare now_ timestamptz := clock_timestamp(); done int;
begin
  update public.chat_members set cleared_at = now_, last_read_at = now_
  where thread_id = p_thread and user_id = p_user and left_at is null;
  get diagnostics done = row_count;
  if done = 0 then raise exception 'You aren''t in this chat.' using errcode = 'P0001', hint = 'ROLE'; end if;
  update public.mobile_notifications set is_read = true, read_at = now_
  where recipient_user_id = p_user::text and entity_type = 'chat' and entity_id = p_thread::text and not is_read;
  insert into public.audit_log (actor, table_name, row_id, action, changes, is_test)
  select p_user, 'chat_members', p_thread::text, 'clear_mine', jsonb_build_object('cleared_at', now_), coalesce(u.is_test, false)
  from public.mobile_app_users u where u.id = p_user;
  return now_;
end $$;

-- ---------------------------------------------------------------- lock what this file made
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
