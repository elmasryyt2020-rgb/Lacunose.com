# Lacunose

### Built with Opus 4.7 — Anthropic x Cerebral Valley Hackathon

**A gap-finding engine for research, powered by Claude Opus 4.7.**

Submit a topic. Lacunose reads up to 1,800 papers across 7 scientific databases in parallel, orchestrates ~60 Claude calls through a 7-stage pipeline, and returns ranked research gaps — each grounded in a verbatim quote from real literature. First gap appears in ~25-35 seconds; full ranked top-10 lands in ~2-4 minutes depending on retrieval and corpus size, for ~$1.74 in real Anthropic credits per Opus run (~$0.20 for a Haiku-only A/B).

**Live demo:** https://lacunose.com/app · **Invite code:** `lacunose-J8VejgrbErh5`
**45-second live A/B clip:** [`Lacunose: Opus 4.7 vs Haiku 4.5 streaming side-by-side`](https://youtu.be/9xNO4jrLhAU) ← *if you only have a minute, watch this*
**Full pitch video:** [`Lacunose.com | Opus 4.7 submission`](https://youtu.be/YqbfJSfJ6v0)
**Mobile app:** both launching soon.

**Production usage to date** (live snapshot): **38 completed analyses** across **7 fields**, **142 ranked research gaps** surfaced, **$334 burned in real Anthropic credits**. The beta is intentionally invite-gated and anonymous — testers can run a real grant-relevant query against Opus 4.7 without committing to a signup or paywall, which keeps the friction near zero for researchers like the 3 named below (Marwan Kamel — dentistry · Juan Manuel Fraga, MD — oncology · Afnane, PhD — business). Pipeline is not a sandbox; it has been running on live queries for 4 days.

**For judges in a hurry — the headline demo:**
Submit `whole tooth regeneration` (medicine). Toggle "Live compare with Haiku 4.5" before submit and watch Opus 4.7 + Haiku stream into two columns from second 0 against the same **1,811-paper corpus**. A real Alexandria-University dentistry researcher (Marwan Kamel — testimonial below) ran this exact topic and rated the surfaced gaps 10/10. Opus produces specific scaffold head-to-head designs ("decellularized tooth bud vs PCL vs GelMA") and large-animal benchmark gaps; Haiku defaults to "more studies needed in diverse populations." First gap on each side lands at ~25-35 s; full top-N takes 2-4 minutes (Opus 4.7 REDUCE is the long pole — synthesis quality is the trade).

![Live A/B compare: Opus 4.7 vs Haiku 4.5 streaming side-by-side against an identical paper corpus](https://lacunose.com/ab-compare.png)

[![Watch the 45-second live A/B](https://img.youtube.com/vi/9xNO4jrLhAU/hqdefault.jpg)](https://youtu.be/9xNO4jrLhAU)
*45-second live recording — same topic, same corpus, both columns filling concurrently.*

> *Same topic. Same corpus. Same pipeline. Different reasoning model.* Across a 6-run Playwright stress test on the live deployment (3 topics × 2 runs each), Opus 4.7 averaged **$1.74 / 60 calls / 6.2 gaps** per analysis; Haiku 4.5 on the same retrieval averaged **$0.20 / 61 calls / 4.0 gaps**. That's a **~9× cost premium for Opus 4.7** and the case this evaluation is making. Haiku output is fluent and grounded but coarser; Opus output names specific populations (`patients ≥75`), specific contradictions (`preclinical cardiac-mass reduction vs. clinical HF outcomes`), and specific methodology gaps (`Delphi-derived core outcome set for orthotopic whole-tooth regeneration`).

**The numbers behind the demo** *(N=85 gaps from 26 production analyses across 5 fields — full eval at [`lacunose-backend/evals/grounding_specificity.md`](lacunose-backend/evals/grounding_specificity.md)):*

| | |
|---|---|
| Gaps with an explicit **suggested duration** in months | **84 / 85 (98.8%)** |
| Gaps with an explicit **suggested sample size** | **72 / 85 (84.7%)** |
| Gaps citing a specific **study design** (RCT, cohort, propensity, GelMA, decellularized, …) | **52 / 85 (61.2%)** |
| Gaps citing a specific **population** (elderly, porcine, ≥75, …) | **26 / 85 (30.6%)** |
| Avg verbatim **evidence quotes** per gap | **2.18** (verbatim guardrail enforces real substring matches) |
| Gaps with **only generic phrasing** ("more studies needed in diverse populations") | **4 / 85 (4.7%)** |

This isn't a topic-idea generator. It's a half-written grant abstract.

**Other pre-warmed topics that return in ~15s:**

**Medicine / life sciences**
- `long-term cardiovascular outcomes of semaglutide in patients over 75 with heart failure`
- `post-surgical delirium prevention in elderly patients`
- `LLM decision support reliability in high-risk oncology cases`

**Computer science / AI**
- `attention mechanism interpretability in small language models`
- `energy efficiency benchmarks for large language model inference at edge`

**Business / economics**
- `absorptive capacity as a mediator between incubation and innovation outcomes`
- `cross-border fintech regulation and SME credit access in emerging markets`

**Social sciences / other fields**
- `multilingual NLP bias in low-resource African languages`
- `urban heat island mitigation in high-density residential districts`
- `psychological safety interventions in remote software engineering teams`

### Contact

- X/Twitter: [@suturednotes](https://github.com/suturednotes)
- Email: `suturednotes@gmail.com`

---

## What researchers are saying

> *"I'm Marwan Kamel, a final-year dentistry student at Alexandria University researching tissue regeneration and AI in dentistry. I searched whole tooth regeneration, and Lacunose surfaced the gap around lack of control over tissue-forming cells. 10/10 — I'd send this to every dental researcher I know."*
>
> **— Marwan Kamel**, Faculty of Dentistry, Alexandria University

> *"I'm Juan Manuel Fraga (MD, DHlthSc), starting to consider gaps in LLM use in medicine, particularly in oncology. I searched LLM use in oncology decision making and Lacunose surfaced: physician experience and workload when using LLM decision support — unmeasured; lack of multilingual and cross-jurisdictional validation; LLM reliability in complex high-risk oncology cases needing a structured validation cohort. 8/10 — I'd absolutely send this to other medical researchers."*
>
> **— Juan Manuel Fraga**, MD, DHlthSc

> *"I looked for the gap regarding the relationship between incubation and innovation, and Lacunose helped me identify that theoretically motivated mediators — absorptive capacity, business performance — fail to mediate expected effects on innovation and competitive advantage, despite positive bivariate associations. That's something I hadn't come across through my own reading. 8/10 — I'd definitely recommend it to other researchers."*
>
> **— Afnane**, Business and Entrepreneurship, PhD Candidate

---

## The problem

A senior biomedical researcher spends **two months reading 200 papers** just to find ten research gaps worth investigating. Most of that time is often wasted — by the time the paper is ready, someone else has already published the same question. First-submission rejection at mid-tier conferences is **40–60%** and a meaningful share of those rejections are "not novel."

The gap-finding step is the actual research. And nobody had built a tool for it.

## What Lacunose does

Type a topic. Ninety seconds later, Lacunose returns ten ranked research gaps — each with a title, research question, suggested study design, novelty and feasibility scores, and verbatim citations from real papers. Nothing hallucinated. Nothing summarized. Real sentences from real published literature.

### Flow 1 — Gap analysis (the main product)

1. User submits a topic, optionally with a 4-slot structured frame (PICO for medicine, SOMX for biology, etc. — 20 field adapters in total).
2. Lacunose queries **ArXiv, PubMed, Crossref, OpenAlex, Semantic Scholar, Europe PMC, and Unpaywall** in parallel. Dedupes across sources, persists up to 500 papers with embeddings.
3. Hybrid retrieval (pgvector + Postgres FTS, fused via Reciprocal Rank Fusion k=60) surfaces the 100 most relevant sections. Cohere rerank v3.5 trims to the top 30.
4. **MAP phase** (Haiku 4.5 × 12 parallel): every section is read for future-work hints, limitations, contradictions, and methodology gaps. Every extracted quote must be a verbatim substring of the source section or the signal is discarded.
5. **Cluster** (local HDBSCAN): groups semantically similar signals into 4–8 themes. No LLM cost.
6. **REDUCE phase** (Opus 4.7 × 6 parallel): synthesizes 2–4 candidate research gaps per cluster. Each candidate includes a title, description, research question, suggested method, novelty and feasibility scores, and evidence citations.
7. **CRITIQUE phase** (Haiku 4.5 × 12 parallel): every candidate is independently validated against the evidence. ~35% are dropped for insufficient grounding. Kept candidates carry the critique rationale.
8. **Rank + stream**: `score = 0.5·novelty + 0.3·feasibility + 0.2·evidence_density`. Near-duplicate titles (cosine > 0.85) are deduped. Top 10 stream to the client one at a time via Supabase Realtime.

### Flow 2 — Opus vs. Haiku, streaming side-by-side from second 0

Toggle "Live compare with Haiku 4.5" before you submit a topic, and Lacunose runs the full pipeline TWICE in parallel against the **same paper corpus** (typically 1,500–2,000 deduped papers; 1,811 for whole tooth regeneration) — Opus 4.7 on the left, Haiku 4.5 on the right. Both columns fill live: as soon as a cluster's REDUCE+CRITIQUE pass produces a grounded candidate, that gap card appears in the matching column. No "click to compare, wait 90 more seconds" — both models race against the same retrieval results from the moment the user submits.

Implementation:
- Opus column reads `gap_items` (persisted, polled every 2.5s — same path as the production single-column flow).
- Haiku column subscribes to `GET /v1/beta/compare-stream/:id` (Server-Sent Events). The endpoint pulls `paper_ids` from the analysis row, runs hybrid retrieval, then iterates clusters sequentially: each cluster's grounded candidate is emitted as an `event: gap` frame the instant CRITIQUE accepts it. A 15-second heartbeat keeps the SSE socket alive through the map phase.
- **Corpus fairness is on the wire.** `gap_analyses.paper_ids` stores the exact paper set the original ingest fetched. The compare endpoint reports `paper_set_source` in the response — `analysis_row` (corpus-identical, the only source we want for an honest A/B), `query_cache` (TTL fallback), or `cited_evidence` (last-resort, biased toward what Opus picked). The UI can render a disclaimer when source isn't `analysis_row`.
- Token counts and dollar cost arrive in the final `event: done` frame — a verifiable receipt, not a marketing number.

Opus 4.7 gaps cite specific populations, specific methods, and specific contradictions. Haiku gaps default to "more studies needed in diverse populations." That divergence is visible on screen at second 30, not at minute three — the single clearest argument that Opus 4.7 specifically is doing cognitive work this pipeline needs.

---

## Why this is more than "wrap one Claude call"

- **Tiered model routing.** Haiku 4.5 for high-volume extraction and critique. Opus 4.7 only for the synthesis step that actually needs judgment. Model matched to the cognitive cost of the stage.
- **Agentic self-critique.** Opus generates candidates. Haiku rejects weak ones with a rationale grounded in the corpus. LLMs arguing with each other before the user sees a result. Visible in the pipeline video.
- **Verbatim quote grounding.** Every citation must be a substring of the actual paper section. Any synthesized quote is dropped before the user sees it. Enforced in both MAP and REDUCE.
- **Prompt caching as a first-class optimization.** The MAP system prompt is marked `cache: true` so Anthropic prompt caching shares the prefix across ~30 parallel Haiku calls — ~90% input-token savings on that prefix.
- **Deterministic ranking after the LLM stack.** Final scoring is a formula, not a vibe. Title-embedding cosine dedupe (Cohere `embed-english-v3.0`, batched in one call per analysis) trims paraphrased near-duplicates that lexical dedupe would miss — "LLM reliability in oncology" and "validation of LLMs for oncologic decisions" collapse into one ranked entry.
- **Real semantic embeddings throughout.** Cluster signals are embedded with the same Cohere v3 model before HDBSCAN, so paraphrased gap signals from different papers cluster correctly instead of fragmenting into kind-buckets. Dev/CI without a Cohere key falls back to a deterministic hash-embed so the pipeline still runs end-to-end.
- **Realtime streaming.** Results commit to Postgres one row at a time. Supabase Realtime pushes each gap to the mobile and web client as it lands, so the user watches "Gap 1 of 10, Gap 2 of 10…" appear live.

---

## Cost profile

| Stage | Model | Calls per analysis | Notes |
|---|---|---|---|
| MAP | claude-haiku-4-5 | ~30 | 12-way parallelism; system prompt cached |
| REDUCE | claude-opus-4-7 | ~6 | one per cluster |
| CRITIQUE | claude-haiku-4-5 | ~20 | one per candidate |
| Cluster + dedupe embeddings | cohere embed-v3 | 2 batched calls | ~30 phrases + ~15 titles, <$0.001/run |

Real production numbers from a Playwright stress test of 6 runs across 3 topics on the live deployment:
- **~60 LLM calls per Opus run · $1.74 mean Opus cost · $0.20 mean Haiku-only cost** (in the live A/B, Haiku is ~9× cheaper than Opus on the same corpus)
- **~90% input-token savings** on the MAP system prefix via Anthropic prompt caching (verified: `cached_input_tokens` ≈ 40k per run on the cached prefix)
- **First gap on each column at ~25-35 s** (SSE `event: gap` emits as each cluster's REDUCE+CRITIQUE pass produces a grounded candidate); **full ranked top-10 at 2-4 minutes** depending on retrieval latency and Opus REDUCE batch behaviour. Opus REDUCE is the long pole (synth-tier latency averages ~30s per cluster); shortening it would require sacrificing the synthesis quality this evaluation is the case for.

---

## Architecture

```
Mobile (Expo/RN)   Web (Next.js)
       \               /
        \             /
   Fastify edge (fn.lacunose.com)
       /              \
   BullMQ chain        SSE compare-stream
 (Opus, persisted)     (Haiku, ephemeral)
       \              /
        \            /
   Postgres (pgvector + FTS) + Supabase Realtime
              |
         Redis · Docker · Hostinger KVM4
```

**Why this architecture:**
- Analyses take 60–120 seconds. Serverless function timeouts don't fit. A persistent Fastify edge + BullMQ worker pool on a single VPS does.
- Every stage is idempotent on a deterministic job ID. Retries don't double-charge LLM tokens.
- Supabase Realtime pushes per-row `gap_items` inserts to the client, so the user sees gaps stream in without polling.

### Field-adapter design

The pipeline is **field-aware**. Each of 20 supported disciplines (medicine, biology, chemistry, physics, materials, mathematics, computer science, engineering, psychology, economics, political science, sociology, geology, geography, history, philosophy, art, business, environmental science, plus a generic fallback) owns:
- A **4-slot structured frame** (PICO for medicine, SOMX for biology, SRCX for chemistry, etc.)
- A **gap taxonomy** — which gap categories make sense in this field (population, geographic, methodology, temporal, etc.)
- A **system-prompt snippet** describing what a novel gap looks like in this field
- A **study-design vocabulary** — field-specific methodology terms fed to the REDUCE phase

Switching fields changes every prompt in the pipeline. No field branching in application code — it's all data.

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 53, React Native (New Architecture), TypeScript strict, Reanimated v4 |
| Web | Next.js 15 App Router, React 19 |
| Edge | Fastify, Node 20, PM2 |
| Workers | BullMQ + Redis |
| Agent / LLM | Claude Opus 4.7 (synth) + Claude Haiku 4.5 (map, critique) via Anthropic Messages API |
| Retrieval | pgvector + Postgres FTS + Reciprocal Rank Fusion (k=60) + Cohere rerank v3.5 (sections) + Cohere embed-english-v3.0 (cluster signals + title dedupe) |
| Data | Self-hosted Supabase (Postgres, Realtime, Storage) |
| Infra | Hostinger KVM4 VPS, Caddy reverse proxy |
| Dev tools | Claude Code (≈18,000 lines of TypeScript across mobile + web + backend, shipped by a medical student with no prior software-engineering background) |

---

## Repo layout

```
lacunose.com/
├── lacunose/                       # Expo / React Native app (iOS + Android)
├── lacunose-backend/               # Node 20 + Fastify + BullMQ workers
│   ├── src/ingest/                 # 7 scientific-database adapters
│   ├── src/retrieval/              # pgvector + FTS + Cohere rerank
│   ├── src/enrich/                 # Cohere embed-v3 helper + hashEmbed fallback
│   ├── src/gap/                    # map → cluster → reduce → critique → rank
│   ├── src/edge/routes/            # Fastify routes including compareStream.ts (SSE)
│   ├── src/llm/                    # provider-agnostic LLM layer + ScopedLLM
│   ├── src/fields/                 # 20 per-field prompt adapters
│   ├── supabase/migrations/        # 0001..0004 (latest: paper_ids on gap_analyses)
│   ├── evals/                      # vitest smoke tests
│   └── infra/                      # Caddyfile, ecosystem, docker-compose
└── website/                        # Next.js landing page + /app beta (invite-gated, live A/B view)
```

---

## How to run the demo

**Option A — the headline live A/B (recommended).**

1. Go to https://lacunose.com/app
2. Enter invite code `lacunose-J8VejgrbErh5`
3. The "Live compare with Haiku 4.5" toggle is **on by default**. Leave it on.
4. Submit `whole tooth regeneration` (medicine). Both columns start filling within ~25–35 seconds. Opus on the left, Haiku on the right, same 1,811-paper corpus, same retrieval, different reasoning model.

**Option B — single-column Opus run.** Turn the Live compare toggle off before submitting. Opus 4.7 runs end-to-end in ~2-4 minutes; gaps stream in via Supabase Realtime as each one passes critique.

**Option C — local dev.** See [`lacunose-backend/README.md`](lacunose-backend/README.md) for the VPS-style setup and [`lacunose/README.md`](lacunose/README.md) for the Expo app.

---

## What I shipped for the hackathon

- Full production pipeline live on `api.lacunose.com` / `fn.lacunose.com`
- 7 scientific-database adapters with cross-source deduplication
- Hybrid retrieval + reranking (pgvector + FTS + RRF + Cohere rerank v3.5)
- Real semantic embeddings throughout — Cohere `embed-english-v3.0` for cluster signals and title dedupe (replaced the Day-1 hash-embed placeholder)
- 3-stage Claude orchestration (MAP → REDUCE → CRITIQUE) with prompt caching, ~90% cache hits on the MAP system prefix
- **Live two-column SSE compare endpoint** (`GET /v1/beta/compare-stream/:id`) — Opus 4.7 + Haiku 4.5 streaming side-by-side from second 0 against an identical paper corpus
- Corpus-fairness mechanism — `paper_ids` persisted on `gap_analyses`, with a `paper_set_source` flag in compare responses so the UI can disclaim non-identical runs
- 20 field-specific prompt adapters with tailored gap taxonomies
- iOS + Android app (Expo, TypeScript strict, New Architecture)
- Public website with invite-gated `/app` beta featuring the live A/B view
- 7-test vitest smoke covering the full SSE pipeline (auth gates, paper-set resolution, end-to-end gap-event emission via mocked Anthropic provider)
- Motion graphic pitch video, rendered via HyperFrames

---

## About the builder

I am a second-year medical student. Last year, as a first-year, I spent two months on my first research paper for a university conference — only to find at submission that other groups had already published the same idea. That wasted two months is why Lacunose exists.

I built Lacunose for medicine first. When it started working on physics, biology, computer science, and even Claude Code's own repository, I expanded it to 20 fields. Every field that does research has researchers publishing questions that were already answered. The pipeline has been run in production across five distinct fields to date.

I also built [Sutured Notes](https://suturednotes.com), an AI app used by 966 medical and healthcare students, more than 50 of them paying subscribers. Same pattern — practitioner hits a wall, Claude Code gets them past it.

Both apps were built with Claude Code. Combined, that's ≈18,000 lines of TypeScript across iOS, Android, web, and a Postgres-backed agentic backend — shipped by someone whose actual day job is studying medicine.

---

## License

Source is provided for judging and technical review only. No commercial use allowed
