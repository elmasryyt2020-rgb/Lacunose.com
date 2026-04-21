-- =========================================================================
-- Lacunose — 0001_init.sql
-- Shared corpus + user-owned analyses + gaps + subscriptions.
-- Field-agnostic from day one. RLS everywhere on user-owned tables.
-- =========================================================================

create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- Canonical work record
-- -------------------------------------------------------------------------
create table if not exists papers (
  id              uuid primary key default gen_random_uuid(),
  doi             text unique,
  pmid            text unique,
  arxiv_id        text unique,
  openalex_id     text unique,
  s2_id           text unique,
  title           text not null,
  abstract        text,
  year            int,
  venue           text,
  field           text[],
  authors         jsonb,
  citation_count  int default 0,
  full_text_url   text,
  source          text not null,
  ingested_at     timestamptz default now()
);
create index if not exists papers_title_trgm on papers using gin (title gin_trgm_ops);
create index if not exists papers_fts on papers using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')));
create index if not exists papers_field on papers using gin (field);
create index if not exists papers_year on papers (year desc);

-- -------------------------------------------------------------------------
-- Structured sections extracted from full text (or synthesized from abstract)
-- -------------------------------------------------------------------------
create table if not exists paper_sections (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid references papers(id) on delete cascade,
  kind       text,
  text       text,
  position   int
);
create index if not exists paper_sections_paper on paper_sections (paper_id);
create index if not exists paper_sections_kind on paper_sections (kind);
-- FTS index so the sparse leg of retrieval/hybrid.ts doesn't seq-scan
-- the table on every analysis. Must exist for BM25-style scoring.
create index if not exists paper_sections_fts
  on paper_sections
  using gin (to_tsvector('english', coalesce(text, '')));

-- -------------------------------------------------------------------------
-- Vector embeddings (SPECTER2 / fallback)
-- -------------------------------------------------------------------------
create table if not exists paper_embeddings (
  paper_id    uuid references papers(id) on delete cascade,
  section_id  uuid references paper_sections(id) on delete cascade,
  embedding   vector(768),
  adapter     text default 'specter2-proximity',
  primary key (paper_id, section_id, adapter)
);
create index if not exists paper_embeddings_hnsw
  on paper_embeddings using hnsw (embedding vector_cosine_ops);

-- -------------------------------------------------------------------------
-- Citation graph
-- -------------------------------------------------------------------------
create table if not exists citations (
  src_paper uuid references papers(id) on delete cascade,
  dst_paper uuid references papers(id) on delete cascade,
  context   text,
  intent    text,
  primary key (src_paper, dst_paper)
);
create index if not exists citations_dst on citations (dst_paper);

-- -------------------------------------------------------------------------
-- User-owned: analyses
-- -------------------------------------------------------------------------
create table if not exists gap_analyses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) not null,
  topic            text not null,
  field            text not null,
  structured_frame jsonb,
  filters          jsonb,
  status           text not null default 'queued',
  error            text,
  cost_tokens      jsonb default '{}'::jsonb,
  created_at       timestamptz default now(),
  completed_at     timestamptz
);
create index if not exists gap_analyses_user on gap_analyses (user_id, created_at desc);
alter table gap_analyses enable row level security;
drop policy if exists own_analyses on gap_analyses;
create policy own_analyses on gap_analyses
  for all using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- User-owned: gap items (streamed into client via Realtime)
-- -------------------------------------------------------------------------
create table if not exists gap_items (
  id                        uuid primary key default gen_random_uuid(),
  analysis_id               uuid references gap_analyses(id) on delete cascade,
  rank                      int,
  title                     text,
  description               text,
  category                  text not null,
  novelty_score             numeric,
  feasibility_score         numeric,
  evidence_density          numeric,
  research_question         text,
  suggested_method          text,
  suggested_n               int,
  suggested_duration_months int,
  evidence                  jsonb,
  created_at                timestamptz default now()
);
create index if not exists gap_items_analysis on gap_items (analysis_id, rank);
alter table gap_items enable row level security;
drop policy if exists own_gap_items on gap_items;
create policy own_gap_items on gap_items
  for select using (
    exists (
      select 1 from gap_analyses a
      where a.id = analysis_id and a.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- User-owned: subscriptions (RevenueCat mirror)
-- -------------------------------------------------------------------------
create table if not exists subscriptions (
  user_id                   uuid primary key references auth.users(id) on delete cascade,
  tier                      text not null default 'free',
  rc_app_user_id            text unique,
  rc_entitlement            text,
  platform                  text,
  period_start              timestamptz,
  period_end                timestamptz,
  analyses_used_this_period int default 0,
  will_renew                boolean,
  updated_at                timestamptz default now()
);
alter table subscriptions enable row level security;
drop policy if exists own_subscription on subscriptions;
create policy own_subscription on subscriptions
  for select using (auth.uid() = user_id);
-- No insert/update/delete policy for users — server-role only (RevenueCat webhook).

-- -------------------------------------------------------------------------
-- User-owned: saved gaps
-- -------------------------------------------------------------------------
create table if not exists saved_items (
  user_id    uuid references auth.users(id) on delete cascade,
  gap_id     uuid references gap_items(id) on delete cascade,
  note       text,
  tag        text[],
  saved_at   timestamptz default now(),
  primary key (user_id, gap_id)
);
alter table saved_items enable row level security;
drop policy if exists own_saved on saved_items;
create policy own_saved on saved_items
  for all using (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- Shared: query cache (avoids re-fetching corpora for repeated topics)
-- -------------------------------------------------------------------------
create table if not exists query_cache (
  query_hash  text primary key,
  field       text,
  filters     jsonb,
  paper_ids   uuid[],
  created_at  timestamptz default now(),
  expires_at  timestamptz
);
create index if not exists query_cache_expires on query_cache (expires_at);

-- -------------------------------------------------------------------------
-- Auto-create a `subscriptions` row for every new auth user
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, tier)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------------------
-- Monthly quota reset (called from a PM2 cron worker or pg_cron)
-- -------------------------------------------------------------------------
create or replace function public.reset_monthly_quotas()
returns void language sql security definer as $$
  update public.subscriptions
  set analyses_used_this_period = 0,
      updated_at = now()
  where period_end is null or period_end > now();
$$;
