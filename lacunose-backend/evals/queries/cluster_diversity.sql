-- Diagnostic: how often does the cluster phase produce single-paper clusters
-- that the reduce phase has to skip? Run before/after the merge fix lands to
-- prove the change reduces wasted clusters.
--
-- The cluster signals themselves aren't persisted, but we can approximate the
-- post-fix expectation by measuring how diverse the EVIDENCE is in produced
-- gaps. If most surviving gaps cite ≥2 papers, the verifyCandidate guardrail
-- is doing its job and the merge fix is unblocking more clusters.

select
  ga.id,
  ga.topic,
  ga.field,
  count(gi.id) as gaps,
  round(avg(jsonb_array_length(gi.evidence))::numeric, 2) as avg_quotes_per_gap,
  round(avg(
    (select count(distinct e->>'paper_id') from jsonb_array_elements(gi.evidence) e)
  )::numeric, 2) as avg_distinct_papers_per_gap,
  count(*) filter (
    where (select count(distinct e->>'paper_id') from jsonb_array_elements(gi.evidence) e) >= 3
  ) as gaps_with_3plus_distinct_papers
from gap_analyses ga
left join gap_items gi on gi.analysis_id = ga.id
where ga.status = 'done'
  and ga.created_at > now() - interval '24 hours'
group by ga.id
order by ga.created_at desc;
