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
-- Partial unique: one OPEN thread per user. Closes the race where two
-- concurrent POSTs each create an orphan thread.
create unique index if not exists support_threads_one_open_per_user
  on support_threads (user_id) where status = 'open';

-- -------------------------------------------------------------------------
-- RevenueCat webhook dedupe — each event.id is processed at most once so
-- stale retries don't overwrite newer tier state.
-- -------------------------------------------------------------------------
create table if not exists rc_webhook_events (
  event_id      text primary key,
  received_at   timestamptz default now(),
  event_type    text,
  app_user_id   text
);
-- GC: remove events older than 60 days (RevenueCat retries for ~7 days).
create index if not exists rc_webhook_events_received on rc_webhook_events (received_at);
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

-- Refund a quota slot when an analysis fails or returns no gaps —
-- called by the ingest / gap workers on status='failed' or insufficient-corpus.
create or replace function public.decrement_analyses_used(p_user uuid)
returns void language sql security definer as $$
  update public.subscriptions
  set analyses_used_this_period = greatest(coalesce(analyses_used_this_period, 0) - 1, 0),
      updated_at = now()
  where user_id = p_user;
$$;

-- Atomic "check + consume" — eliminates the TOCTOU race where two parallel
-- submits both pass the quota check and both increment. Upserts the row on
-- miss (handles orphaned users who somehow skipped the on_auth_user_created
-- trigger). Returns TRUE if the slot was consumed; FALSE if cap reached.
create or replace function public.try_consume_analysis(p_user uuid, p_cap int)
returns boolean language plpgsql security definer as $$
declare
  updated int;
begin
  -- Ensure a subscriptions row exists (free tier default).
  insert into public.subscriptions (user_id, tier)
  values (p_user, 'free')
  on conflict (user_id) do nothing;

  update public.subscriptions
    set analyses_used_this_period = coalesce(analyses_used_this_period, 0) + 1,
        updated_at = now()
    where user_id = p_user
      and coalesce(analyses_used_this_period, 0) < p_cap
  returning 1 into updated;

  return updated is not null;
end;
$$;

-- -------------------------------------------------------------------------
-- Realtime publication — self-hosted Supabase doesn't add new tables
-- automatically. Without this, the mobile client's `postgres_changes`
-- subscriptions on gap_items / support_messages / notifications silently
-- yield nothing. These statements are idempotent via exception handling.
-- -------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.gap_items;
  exception when duplicate_object then null; end;

  begin
    alter publication supabase_realtime add table public.gap_analyses;
  exception when duplicate_object then null; end;

  begin
    alter publication supabase_realtime add table public.support_messages;
  exception when duplicate_object then null; end;

  begin
    alter publication supabase_realtime add table public.support_threads;
  exception when duplicate_object then null; end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null; end;
exception when undefined_object then
  -- publication doesn't exist (some Supabase builds use a different name);
  -- log and continue — Realtime will just not stream until it's created.
  raise notice 'supabase_realtime publication not found; skip';
end $$;

-- Enable full row replication for tables the client filters on by non-PK fields,
-- so Realtime gets the filter column (analysis_id, thread_id, user_id).
alter table public.gap_items replica identity full;
alter table public.support_messages replica identity full;
alter table public.notifications replica identity full;
