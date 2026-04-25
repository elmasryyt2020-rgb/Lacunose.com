# Eval: Grounding & specificity of Opus 4.7 production output

**N = 85 gaps across 26 completed analyses spanning 5 fields, queried live from `gap_items` on 2026-04-25.**

The previous external review of this submission asked: *"Run an eval that quantifies what Opus 4.7 actually does that smaller models don't — even N=20."* This file is that eval, drawn from real production traffic, not a curated test set.

## TL;DR

Opus 4.7 doesn't return "topic ideas." It returns objects that look like study-protocol abstracts: study design + population + sample size + duration + verbatim source quotes. **84.7% of gaps come with an explicit suggested N. 98.8% come with an explicit suggested duration in months. 61.2% name a specific study design.** Generic-only phrasing ("more studies needed in diverse populations") shows up in **4.7%** of gaps.

## Numbers

| Metric | Count | % | What it means |
|---|---|---|---|
| Total Opus-produced gaps in production | 85 | — | Across 26 analyses, 5 fields (medicine, physics, biology, computer-science, economics, chemistry) |
| Gaps citing a specific study design (RCT / cohort / propensity / registry / GelMA / decellularized / Delphi / head-to-head / …) in title or `suggested_method` | **52** | **61.2%** | The gap arrives with a real methodology, not "more research needed" |
| Gaps citing a specific population (elderly / pediatric / porcine / mini-pig / >75 / …) in title or `research_question` | **26** | **30.6%** | Cohort is named, not generic |
| Gaps with an explicit suggested sample size (`suggested_n`) | **72** | **84.7%** | Opus picks an N for almost every gap it returns |
| Gaps with an explicit suggested duration in months (`suggested_duration_months`) | **84** | **98.8%** | Effectively every gap arrives with a study timeline |
| Average verbatim evidence quotes per gap | **2.18** | — | Each quote is enforced as a substring of a real paper section by `verbatim.ts:isVerbatimWithEllipsis`. Hallucinated quotes are silently dropped at MAP and again at REDUCE before the user sees them. |
| Gaps with ≥ 3 verbatim quotes | **15** | **17.6%** | The rank-formula evidence-density threshold — these are the "well-grounded" tier. |
| Gaps using only generic "more studies needed" phrasing | **4** | **4.7%** | The Haiku failure mode the previous review predicted. Opus 4.7 falls into it less than 5% of the time. |

## What this looks like in practice

Two production rows from the demoable analyses:

**Topic: `whole tooth regeneration`** (1,811-paper corpus, real testimonial — Marwan Kamel, Alexandria University Faculty of Dentistry, 10/10)

| Field | Value |
|---|---|
| Title | "Head-to-head comparison of scaffold strategies for whole-tooth regeneration" |
| Category | contradiction |
| Suggested method | "prospective observational comparative study with randomized scaffold allocation and blinded histomorphometric outcome assessment" |
| Evidence quotes | 3 (verbatim from 3 distinct papers) |
| Novelty / Feasibility | 7 / 6 |

**Topic: `long-term cardiovascular outcomes of semaglutide in patients over 75 with heart failure`** (1,465-paper corpus)

| Field | Value |
|---|---|
| Title | "Long-term CV outcomes of semaglutide in patients ≥75 with heart failure" |
| Category | population |
| Suggested method | "retrospective chart review with propensity-matched cohort study using registry analysis" |
| Evidence quotes | 3 |
| Novelty / Feasibility | 9 / 8 |

These aren't curated. The first is rank #5 of 9 from analysis `315f8635-…`. The second is rank #1 of 3 from analysis `d7a82595-…`.

## Why the title-only numbers undercount specificity

A naive "does the title contain `RCT`?" check would show 9.4% (8/85). That's misleading: the pipeline structurally separates the *gap concept* (in `title`) from the *methodology* (in `suggested_method`). When you check both fields, design specificity jumps from 9.4% → 61.2%.

The right read isn't "Opus titles are vague" — it's "Opus correctly puts the *question* in the title and the *method* in its dedicated structured slot, and 61% of those slots cite a real design term."

## Live-deployment stress test (Playwright × 3 topics × 2 runs)

Beyond the 85-gap retrospective above, the live deployment was stress-tested on 2026-04-25 by driving a real headless Chromium against `https://lacunose.com/app` for three topics, twice each, after the cluster-merge fix (`gap/cluster.ts:mergeSinglePaperClusters`) and the Haiku JSON-fence-strip fix (`llm/index.ts:chatJson`) landed. Each run completes the full pipeline end-to-end: ingest cache hit → hybrid retrieval → MAP → cluster + merge → REDUCE → CRITIQUE → rank → SSE compare-stream.

| Topic | Run | Opus gaps | Opus cost | Opus calls | Wall |
|---|---|---|---|---|---|
| whole tooth regeneration                                            | 1 | 8 | $1.86 | 58 | 2:47 |
| whole tooth regeneration                                            | 2 | 9 | $1.82 | 60 | 2:35 |
| long-term cardiovascular outcomes of semaglutide in patients ≥ 75   | 1 | 3 | $1.80 | 64 | 2:17 |
| long-term cardiovascular outcomes of semaglutide in patients ≥ 75   | 2 | 6 | $1.91 | 65 | 2:27 |
| attention mechanism interpretability in small language models       | 1 | 5 | $1.48 | 57 | 4:09 |
| attention mechanism interpretability in small language models       | 2 | 4 | $1.54 | 58 | 3:20 |
| **Mean** |   | **5.83** | **$1.74** | **60.3** | **2:56** |

Variance across the same topic on consecutive runs: **±1-3 gaps**. Before the cluster-merge fix landed, the same `whole tooth regeneration` topic produced **1 Opus gap** (because 4 of 8 HDBSCAN-produced clusters were single-paper and got skipped by the reduce-phase preflight). After the fix, the same topic produces 8-9 gaps reliably — that's a 9× improvement on the pipeline's worst-case behavior, deployed live.

Haiku-only side (via the SSE compare-stream) on the same corpora averaged **4.0 gaps for $0.20 / 61 calls** — the live A/B that ships with the demo.

## Side-by-side against Haiku 4.5

The live `/v1/beta/compare-stream` endpoint (toggle "Live compare with Haiku 4.5" on the demo URL) re-runs the same corpus through a Haiku-pinned `ScopedLLM`. Anecdotally, on the screenshot below from the production A/B page:

- Opus produces a Population gap citing *"obesity-related HFpEF ran for only 52 weeks"* with a specific call for "long-term mortality and HF-event data in the oldest-old subgroup."
- Haiku on the same corpus produces an Intersection gap noting "no evidence exists for renal outcomes in non-diabetic patients with concurrent HF and CKD" — also valid, but coarser-grained.

Both columns ran 58–59 LLM calls. The cost difference is **$0.20 (Haiku) vs $2.94 (Opus) for the same retrieval**. That's a 14× cost premium. The eval above is the case for that premium being worth it.

## Methodology

Generated from production `gap_items` rows where `gap_analyses.status = 'done'`. Regex matches use Postgres POSIX `~*` (case-insensitive, word-bounded) on:

- **Method dictionary**: `rct, cohort, trial, registry, prospective, retrospective, systematic, meta-analysis, delphi, propensity, head-to-head, crispr, gelma, decellulariz`
- **Population dictionary**: `elderly, pediatric, adolescent, geriatric, >75, porcine, murine, human, mini-pig`
- **Generic-only**: titles matching any term in the population/method dictionaries are excluded; remaining titles containing only `diverse / further / more / need / gap / study / research` are flagged.

Reproducible from `lacunose-backend/evals/queries/grounding_specificity.sql`. Re-run with:

```bash
docker exec supabase-db psql -U postgres -d postgres \
  -f /lacunose-backend/evals/queries/grounding_specificity.sql
```

## What this eval does NOT prove

Honest disclosure of what's missing:

- **No A/B against Haiku at scale (yet).** The live `/v1/beta/compare-stream` endpoint runs Haiku against the same corpus, but we have not yet captured 20+ Haiku-only runs into a comparable table. The visual A/B is real on screen and the qualitative cost data ($0.20 vs $2.94) is real; the head-to-head numerical specificity comparison is the next step.
- **No human gold-label of "is this gap actually novel."** Three named researchers (Marwan Kamel — dentistry, Juan Manuel Fraga — oncology, Afnane — economics) rated their respective topics 10/10, 8/10, 8/10 in the README testimonials. That's anecdote, not labelled evaluation.
- **Evidence-density is structural, not semantic.** ≥ 3 verbatim quotes proves the quotes are real (verbatim guardrail) but not that they actually *support* the synthesized gap. The CRITIQUE-phase rejection rate (~35% drop per `pipeline.ts`) is the closest proxy we have.
- **Smoke tests, not load tests.** `evals/compareStream.smoke.test.ts` (7/7 passing) covers routing, auth, paper-set resolution, and end-to-end gap emission with a mocked Anthropic provider. It does *not* prove behavior under concurrency, large-corpus retrieval timing, or rate-limit edge cases.
