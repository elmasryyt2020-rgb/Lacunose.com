-- 0004_analysis_paper_ids.sql
-- Persist the paper_id set the ingest worker fetched for an analysis directly
-- on gap_analyses. The previous approach (read from query_cache by topic-hash)
-- silently TTL'd after 7 days, after which /v1/compare fell back to "papers
-- cited in the Opus result" — biasing the Haiku rerun toward Opus's own
-- corpus and making the A/B unfair. With this column populated, compare always
-- runs both columns against the *same* paper set the original analysis saw.

alter table gap_analyses
  add column if not exists paper_ids uuid[];

-- GIN so we can later answer "which analyses cited paper X?" without a seq scan.
create index if not exists gap_analyses_paper_ids_gin
  on gap_analyses using gin (paper_ids);
