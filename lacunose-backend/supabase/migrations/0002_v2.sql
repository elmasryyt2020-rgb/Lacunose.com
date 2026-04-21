-- =========================================================================
-- Lacunose — 0002_v2.sql
-- Support (email-backed chat), notifications, push tokens, field concepts.
-- Safe to run on top of 0001_init.sql. Idempotent.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Ticket-code sequence (generates LNS-0001, LNS-0002, …)
-- -------------------------------------------------------------------------
create sequence if not exists ticket_code_seq start 1;

create or replace function public.next_ticket_code()
returns text language sql as $$
  select 'LNS-' || lpad(nextval('ticket_code_seq')::text, 4, '0')
$$;

-- -------------------------------------------------------------------------
-- Support threads — one per user (typically), reopenable
-- -------------------------------------------------------------------------
create table if not exists support_threads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  ticket_code      text unique not null default public.next_ticket_code(),
  subject          text,
  status           text default 'open',
  created_at       timestamptz default now(),
  last_message_at  timestamptz default now()
);
create index if not exists support_threads_user on support_threads (user_id, last_message_at desc);
alter table support_threads enable row level security;
drop policy if exists own_threads on support_threads;
create policy own_threads on support_threads
  for all using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- Support messages — inbound + outbound, RFC-5322 threaded via Message-ID
-- -------------------------------------------------------------------------
create table if not exists support_messages (
  id                uuid primary key default gen_random_uuid(),
  thread_id         uuid references support_threads(id) on delete cascade not null,
  is_user           boolean not null,
  body              text not null,
  email_message_id  text unique,
  in_reply_to       text,
  attachments       jsonb default '[]'::jsonb,
  created_at        timestamptz default now()
);
create index if not exists support_messages_thread on support_messages (thread_id, created_at);
alter table support_messages enable row level security;
drop policy if exists own_thread_messages on support_messages;
create policy own_thread_messages on support_messages
  for select using (
    exists (
      select 1 from support_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

-- Bump thread's last_message_at on every insert
create or replace function public.bump_thread_last_message()
returns trigger language plpgsql as $$
begin
  update public.support_threads
    set last_message_at = now()
    where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists support_messages_bump on support_messages;
create trigger support_messages_bump
  after insert on support_messages
  for each row execute function public.bump_thread_last_message();

-- -------------------------------------------------------------------------
-- Notifications (in-app feed) + push tokens
-- -------------------------------------------------------------------------
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  kind        text not null,
  title       text not null,
  body        text,
  data        jsonb,
  is_read     boolean default false,
  created_at  timestamptz default now()
);
create index if not exists notifications_user on notifications (user_id, created_at desc);
create index if not exists notifications_unread on notifications (user_id) where is_read = false;
alter table notifications enable row level security;
drop policy if exists own_notifications on notifications;
create policy own_notifications on notifications
  for all using (auth.uid() = user_id);

create table if not exists push_tokens (
  user_id     uuid references auth.users(id) on delete cascade,
  token       text,
  platform    text,
  created_at  timestamptz default now(),
  primary key (user_id, token)
);
alter table push_tokens enable row level security;
drop policy if exists own_tokens on push_tokens;
create policy own_tokens on push_tokens
  for all using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- Field taxonomy (cached OpenAlex concept tree)
-- -------------------------------------------------------------------------
create table if not exists field_concepts (
  openalex_id     text primary key,
  level           int,
  name            text not null,
  parent_ids      text[],
  ancestors       text[],
  works_count     bigint,
  frame_template  text
);
create index if not exists field_concepts_name_trgm
  on field_concepts using gin (name gin_trgm_ops);
create index if not exists field_concepts_level on field_concepts (level);
-- Shared read (every authenticated user can browse)
alter table field_concepts enable row level security;
drop policy if exists concepts_read on field_concepts;
create policy concepts_read on field_concepts
  for select using (auth.role() = 'authenticated');

-- -------------------------------------------------------------------------
-- Analytics helpers: rollup to compute "analyses this period" without trust
-- -------------------------------------------------------------------------
create or replace function public.increment_analyses_used(p_user uuid)
returns void language sql security definer as $$
  update public.subscriptions
  set analyses_used_this_period = coalesce(analyses_used_this_period, 0) + 1,
      updated_at = now()
  where user_id = p_user;
$$;
