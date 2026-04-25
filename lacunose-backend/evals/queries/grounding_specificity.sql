-- Reproducible eval: Opus 4.7 grounding + specificity in production gap_items.
-- N is whatever lives in your gap_items table at query time.
-- Documented in evals/grounding_specificity.md.

-- 1. Title-level specificity (the headline numbers in the eval doc)
select
  count(*) as total_gaps,
  count(*) filter (where gi.title ~* '\m(rct|cohort|trial|registry|prospective|retrospective|systematic|meta-analysis|delphi|propensity|head-to-head|crispr|gelma|decellulariz)\M')
    as titles_with_specific_method,
  count(*) filter (where gi.title ~* '\m(elderly|pediatric|adolescent|geriatric|>?75|porcine|murine|human|mini-pig)\M')
    as titles_with_specific_population,
  count(*) filter (where gi.title ~* '\m(diverse|further|more|need|gap|study|research)\M' and not (gi.title ~* '\m(rct|cohort|trial|registry|elderly|pediatric)\M'))
    as titles_with_only_generic_phrasing
from gap_items gi
join gap_analyses ga on ga.id = gi.analysis_id
where ga.status = 'done';

-- 2. Whole-row specificity (covers suggested_method + research_question + suggested_n + suggested_duration_months)
select
  count(*) as total_gaps,
  count(*) filter (where
    gi.title ~* '\m(rct|cohort|trial|registry|prospective|retrospective|systematic|meta-analysis|delphi|propensity|head-to-head|crispr|gelma|decellulariz)\M'
    or coalesce(gi.suggested_method, '') ~* '\m(rct|cohort|trial|registry|prospective|retrospective|systematic|meta-analysis|delphi|propensity|head-to-head)\M'
  ) as gaps_with_specific_design,
  count(*) filter (where
    gi.title ~* '\m(elderly|pediatric|adolescent|geriatric|>?75|porcine|murine|human|mini-pig)\M'
    or coalesce(gi.research_question, '') ~* '\m(elderly|pediatric|adolescent|geriatric|>?75|porcine|murine|human|mini-pig)\M'
  ) as gaps_with_specific_population,
  count(*) filter (where gi.suggested_n is not null) as gaps_with_explicit_sample_size,
  count(*) filter (where gi.suggested_duration_months is not null) as gaps_with_explicit_duration,
  round(avg(jsonb_array_length(gi.evidence))::numeric, 2) as avg_evidence_quotes_per_gap,
  count(*) filter (where jsonb_array_length(gi.evidence) >= 3) as gaps_with_3plus_quotes
from gap_items gi
join gap_analyses ga on ga.id = gi.analysis_id
where ga.status = 'done';

-- 3. Cross-field distribution — proves the pipeline isn't medicine-only
select
  ga.field,
  count(distinct ga.id) as analyses,
  count(gi.id) as gaps,
  round(avg(gi.novelty_score)::numeric, 2) as mean_novelty,
  round(avg(gi.feasibility_score)::numeric, 2) as mean_feasibility
from gap_analyses ga
join gap_items gi on gi.analysis_id = ga.id
where ga.status = 'done'
group by ga.field
order by gaps desc;
