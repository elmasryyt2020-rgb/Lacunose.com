# Research Gap Finder — App Planning Document

## Context

A client has asked Seif to build an app/webapp where a researcher inputs a field or topic they want to pursue for a master's/PhD/research project, and the app surfaces **gaps in the currently published literature** so the researcher can see exactly where they can contribute novel knowledge.

This is a client project (not SuturedNotes). The client has asked for ideas + execution — Seif wants two deliverables from this plan:
1. **Every worthwhile feature idea** a research-gap-finder could have.
2. A **computer-science-best-practices execution path** (architecture, data pipeline, NLP/LLM choices, evaluation, deployment, cost model).

Seif's existing stack proficiency: React Native / Expo, Supabase (Postgres + Auth + Storage + RLS), custom VPS for AI workloads, Claude API. That should influence technology choices to minimize new learning curves.

### Decisions locked with Seif (pre-plan)
- **Audience**: medical / biomedical researchers first, architecture kept **field-agnostic** so v2 can open to general academic. Data-source priority reflects this: PubMed + Europe PMC + OpenAlex + Semantic Scholar are all v1.
- **Scope**: full feature set is the north-star vision (Sections 2–5), but **we ship a focused MVP first** (Section 4 — MVP Implementation Plan).
- **Platform**: **mobile app** — React Native + Expo, **JavaScript** (not TypeScript), iOS + Android. No web app in v1. This reuses Seif's SuturedNotes skillset directly.
- **Language**: **English only** for v1. Arabic deferred.
- **Hosting**: **self-hosted Supabase + edge functions on a Hostinger VPS**. No Vercel, no managed Supabase. One VPS runs: self-hosted Supabase stack (Postgres + GoTrue auth + PostgREST + Realtime + Storage + Edge Functions), Redis, BullMQ workers, GROBID. Budget for a Hostinger KVM 4 (or higher) — ~$15–30/mo.
- **Build order**: **UI-first**. Scaffold the Expo app with fully mocked responses for the first ~5 weeks so we can demo, user-test, and iterate on UX before writing any real backend code. Swap mocks for real API calls only after the backend is working end-to-end.

---

## 1. Competitive Landscape (what exists, what's missing)

No dominant tool directly markets itself as "research gap finder." Every existing product is either a **discovery tool** (Connected Papers, ResearchRabbit, Litmaps, Inciteful) or a **synthesis tool** (Elicit, Consensus, SciSpace, Undermind) — gap identification is implicit, left to the human reader.

| Tool | Core capability | What it misses (opportunity for us) |
|---|---|---|
| **Elicit** | 138M papers, AI screening, systematic-review automation | No explicit gap detection, no novelty scoring |
| **ResearchRabbit** | Citation-network visualization, topic evolution, Zotero sync | Gaps are visual only — user has to spot them |
| **Connected Papers** | Co-citation / bibliographic coupling graphs | No gap labels, no methodology recommendations |
| **Litmaps** | Interactive maps + new-paper monitoring | Passive monitoring, no gap ranking |
| **Scite.ai** | 1.6B smart citations (support vs. contrast) | Citation quality only — doesn't synthesize gaps |
| **Consensus.app** | Evidence-aggregation / consensus synthesis | Built for consensus, not for what's missing |
| **Semantic Scholar** | 200M papers + S2 influence scores | Discovery engine, no gap module |
| **Undermind.ai** | Successive search, novelty assessment | Enterprise price point, not for students |
| **SciSpace** | 150+ research tools (broad but shallow) | No dedicated gap engine |
| **Inciteful** | Free citation network analysis | Raw graphs only — no interpretation |

**The wedge:** Nothing on the market delivers a *ranked, evidence-backed, explainable list of research gaps with feasibility scoring* tuned for a student researcher choosing a thesis direction. That is the product.

---

## 2. Feature Universe (the full idea space)

Organized by layer. Seif should use this as a menu — not everything ships in v1.

### 2.1 Input methods
- Free-text topic query + discipline tag
- Seed paper(s): researcher pastes DOIs or uploads PDFs as anchors
- Upload researcher's CV / ORCID to profile expertise and bias gap suggestions toward their skillset
- Upload a draft thesis proposal — app checks the proposal against live literature and flags weak novelty claims
- Upload advisor's publication list → "gaps that complement your lab's strengths"
- Conversational refinement (chat: "narrow this to pediatric populations")
- Arabic-language input (given Seif's MENA base)

### 2.2 Retrieval & coverage
- Primary sources: **OpenAlex** (breadth), **Semantic Scholar** (citations + SPECTER2 embeddings), **Crossref** (DOI spine), **PubMed / Europe PMC** (biomedical), **arXiv** (preprints), **CORE** (OA full text), **Unpaywall** (OA resolution)
- Multilingual indexing (non-English literature often hides novel work)
- Preprint toggle (include / exclude not-yet-peer-reviewed)
- Grey literature toggle (dissertations, government reports, conference proceedings)
- Open-access preference toggle
- Date-range filter
- Field / sub-field filter

### 2.3 Gap-detection techniques (the engine)
1. **Future-work / limitations mining** — NLP extraction of "future research should…", "limited by…", "understudied" phrasing from discussion sections. JMIR 2024 study shows this catches ~21 canonical gaps in COVID literature.
2. **Citation network structural holes** — betweenness + persistent-homology analysis. ROAD-tv (2025) reports 83% precision vs. 52% for naïve citation heuristics.
3. **Topic-modeling evolution (BERTopic over time)** — detect saturated topics (declining publication velocity) and emerging topics.
4. **Contradiction / disagreement detection** — cross-paper claim conflicts (Scite-style).
5. **Claim extraction → claim graph** — surface "no claims exist for population X" gaps.
6. **PICO / PECO gap enumeration** — enumerate (Population, Intervention, Comparison, Outcome) tuples and flag under-populated cells. Especially powerful in clinical/biomedical fields.
7. **Bibliometric keyword co-occurrence** — isolated keyword clusters = underexplored intersections.
8. **Methodology gap detection** — "only 3% of studies use longitudinal design" → clear white space.
9. **Geographic / demographic gap detection** — flags WEIRD-sample overrepresentation, region and demographic blind spots.
10. **Interdisciplinary intersection detection** — papers co-citing field A and field B; sparse intersections → innovation zones.
11. **LLM-based synthesis** — cluster abstracts, prompt Claude Opus to generate candidate gaps, **always grounded in ≥2 cited papers per gap**.
12. **Temporal trend forecasting (stretch)** — predict which gaps will be hot in 12–24 months based on citation velocity.

### 2.4 Output formats
- **Ranked gap list** — each gap has novelty score (1–10), feasibility score, evidence-density badge, and 3+ cited papers
- **Auto-generated research questions** — 5–10 concrete thesis questions per topic
- **Methodology recommendations** — "only qualitative studies exist; an RCT would advance the field"
- **Suggested study designs** — mixed-methods, sample size estimates, time horizon
- **Novelty confidence interval** — "80% confident this gap is novel based on the last 3 years of literature"
- **Gap map visualization** — interactive citation network with gaps overlaid as nodes (react-force-graph / Cytoscape.js)
- **Heatmaps** — evidence density by methodology × population × geography
- **Exportable gap report** — PDF / DOCX with full citations (feeds directly into proposal writing)
- **Suggested collaborators** — "Dr. X at MIT is working on an adjacent problem"

### 2.5 Collaboration & productivity
- Save & version gap analyses (iterate as literature updates)
- Annotate gaps ("high priority", "needs grant funding", "advisor likes this")
- Export to Zotero / Mendeley with gap tags and notes pre-populated
- Share with advisor / co-authors, threaded comments
- Advisor dashboard: supervise multiple students' gap searches
- Obsidian / Roam export for personal knowledge management

### 2.6 Trust & quality signals
- Evidence strength per gap (citation count + velocity of supporting papers)
- Consensus vs. controversy flag (agreement among papers identifying the same gap)
- Methodological quality score (gaps identified in systematic reviews > ad-hoc observation)
- Hallucination mitigation — every gap claim links to verbatim source snippets the user can click through
- Bias flags (single-author, single-institution, single-funder over-weighting)
- Disclosure of training / index cutoff date
- Diversity audit (flags WEIRD-sample bias in gap recommendations)

### 2.7 Monetization (100M Hormozi Frameworks)
- **Decoy Pricing & Offers**:
  - **Decoy (Basic)**: $10/mo — Top 3 gaps per analysis, basic PDF export. (Pushes users to Pro).
  - **Main Offer (Pro)**: $20/mo (Global) / ~200 EGP (MENA Region) — 50 analyses/month, full ranked gap list, Zotero sync, and 1-click Proposal generation.
  - **Premium Anchor**: $50/mo — 150 analyses/month, plus 1-on-1 methodology consulting (pushes users to see $20 as a steal).
- **Attraction Offer (Lead Magnet)**: Try 3 full analyses totally free (no credit card needed). At the end of the analysis pipeline, users see their first 2 gaps unblurred, with the remaining highly-ranked gaps blurred out via a paywall (Curiosity-driven paywall).
- **"Win Your Money Back" Guarantee**: In classic Hormozi style, users who successfully publish or submit a master's thesis citing gap analyses generated by the platform within 12 months get a full 1-year subscription refunded. This creates high-value testimonials and massive social proof.
- **Classic Upsell**: "Do you want fries with that?" → Add AI-drafted introduction/literature review paragraphs per gap for an extra $5/report.

### 2.8 Differentiation plays (what will actually matter)
1. **Evidence-grounded gaps** — every claim clickable back to ≥2 source papers (no one does this well)
2. **Feasibility scoring** — pairs novelty with resources needed (only tool thinking about the student's reality)
3. **Advisor-complement mode** — "gaps that fit your lab's strengths"
4. **Methodology + geography + demographic gap surfacing** — explicitly flags equity blind spots
5. **Arabic-first option** — MENA-focused positioning, huge untapped market Seif knows personally

---

## 3. Recommended Technical Architecture

Modular monolith with async workers, everything running on a single Hostinger VPS. No microservices until scale demands them. Mobile-only frontend (Expo + React Native in JavaScript). Self-hosted Supabase stack provides auth, Postgres, realtime, storage, and edge functions in one docker-compose bundle.

```
┌──────────────────────────────────────────────────────────────┐
│                   MOBILE APP (iOS + Android)                 │
│   React Native + Expo (JavaScript)                           │
│   Expo Router + @supabase/supabase-js + NativeWind           │
│   Realtime subscription to gap_items for streaming UI        │
└───────────┬──────────────────────────────────────────────────┘
            │  HTTPS (Kong gateway)
            ▼
╔══════════════════════════════════════════════════════════════╗
║             HOSTINGER VPS  (single box, docker-compose)      ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │        SELF-HOSTED SUPABASE STACK                       │  ║
║  │  Kong gateway → GoTrue (auth) / PostgREST / Realtime    │  ║
║  │                 Storage / Edge Functions (Deno)         │  ║
║  │                                                          │  ║
║  │  Postgres 15 + pgvector + pg_trgm                        │  ║
║  │    papers · sections · embeddings · citations ·          │  ║
║  │    gap_analyses · gap_items · subscriptions              │  ║
║  │    Row-Level Security per user                           │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  EDGE FUNCTIONS (Deno, called from mobile app)          │  ║
║  │    analyses-create   → enqueue analysis, rate-limit     │  ║
║  │    analyses-export   → render PDF/MD                    │  ║
║  │    stripe-webhook    → update subscription tier         │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  WORKER PROCESSES (Node, BullMQ, long-running)          │  ║
║  │    ingest-worker   (PubMed/EuropePMC/OpenAlex/S2)       │  ║
║  │    parse-worker    (GROBID sidecar)                     │  ║
║  │    embed-worker    (SPECTER2)                           │  ║
║  │    analyze-worker  (gap engine → writes gap_items,      │  ║
║  │                     Realtime streams to app)            │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  Redis (BullMQ queue + rate-limit token buckets)             ║
║  GROBID (dockerized, PDF → TEI sections)                     ║
║  Caddy (HTTPS + reverse proxy)                               ║
╚══════════════════════════════════════════════════════════════╝
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│              EXTERNAL APIs (called from workers)             │
│   PubMed · Europe PMC · OpenAlex · Semantic Scholar ·        │
│   Unpaywall · Anthropic (Claude Opus + Haiku) · Cohere rerank│
└──────────────────────────────────────────────────────────────┘
```

**How the mobile app streams gap results without SSE:**
Expo can't natively consume HTTP streaming SSE the way a browser can. Instead we use **Supabase Realtime**: when the `analyze-worker` inserts rows into `gap_items`, Postgres Logical Replication → Realtime → mobile client receives each row via WebSocket. This is cleaner than SSE for mobile and it's what Supabase is already giving us for free.

### 3.1 Tech stack (opinionated defaults)

| Layer | Choice | Why |
|---|---|---|
| Mobile frontend | **Expo SDK (latest) + React Native, JavaScript** | Seif's primary stack from SuturedNotes — no learning curve. JS not TS per Seif's preference. |
| Navigation | **Expo Router** (file-based) | Mirrors Next.js App Router mental model; simpler than React Navigation for greenfield apps |
| Styling | **NativeWind** (Tailwind for RN) or **react-native-paper** | Pick NativeWind if Seif likes Tailwind; RN Paper if he prefers Material Design components |
| State | **Zustand** + **TanStack Query** | Lightweight; Query handles caching + retries against edge functions |
| Auth client | **@supabase/supabase-js** + **expo-auth-session** | Magic-link flow via GoTrue; deep link back into the app |
| Realtime | **Supabase Realtime** (WebSocket) | Streams gap_items to the app as workers insert them |
| Auth backend | **GoTrue** (part of self-hosted Supabase) | Magic link + Google OAuth |
| Relational DB | **Postgres 15** (part of self-hosted Supabase) with **pgvector** + **pg_trgm** | Single DB holds everything |
| Vector search | **pgvector (HNSW)** | No separate vector DB needed |
| Full-text search | **Postgres FTS** | Defer Meilisearch until real UX pain |
| API layer | **Supabase Edge Functions (Deno)** | Lightweight, run inside the self-hosted stack, easy to deploy with `supabase functions deploy` |
| Job queue | **BullMQ + Redis** (separate Node process on the same VPS) | Mature Node ecosystem; edge functions enqueue, long-running Node workers consume |
| PDF parsing | **GROBID** (dockerized sidecar) | Proven, outputs structured TEI sections |
| Embeddings | **SPECTER2 via Semantic Scholar API** (free, cached for 200M papers), self-hosted SPECTER2 via Hugging Face + ONNX as fallback for new papers | Domain-specific for academic text |
| Reranker | **Cohere rerank-3** API | $0.00003/token, big quality lift |
| LLM | **Claude Opus 4.7** (synthesis) + **Claude Haiku 4.5** (map + critique) | **Hackathon Strategy:** Use Anthropic keys for "Built with 4.7". Post-hackathon, simply swap the `.env` keys to DeepSeek V4 / V3.2 to run the exact same Map-Reduce pipeline at 1/50th the cost. |
| Observability | **Sentry** (mobile + server errors) + **Langfuse** (self-hosted, LLM traces) + **PostHog** (self-hosted, product analytics) | All three have free / self-host options, fit on the same VPS |
| Billing | **Stripe** + **stripe-react-native** + **RevenueCat** (optional, simplifies IAP) | Seif already knows this from SuturedNotes; RevenueCat handles iOS/Android IAP headaches |
| Email (transactional + business) | **Zoho Mail** with SMTP relay for Supabase magic-link emails | 500 EGP/year (~$10/year). Handles both business email address (e.g. hello@yourdomain) and outbound auth emails — GoTrue accepts any SMTP provider |
| Hosting | **Single Hostinger VPS (KVM 4 / KVM 8)** running docker-compose | One box, one bill, ~$15–30/mo |
| App distribution | **Expo EAS Build + EAS Submit** | Builds IPA/AAB in the cloud, ships to App Store + Play Store |

### 3.2 Data model (core tables)

```sql
CREATE TABLE papers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doi          TEXT UNIQUE,
  openalex_id  TEXT UNIQUE,
  s2_id        TEXT UNIQUE,
  title        TEXT NOT NULL,
  abstract     TEXT,
  year         INT,
  venue        TEXT,
  fields       TEXT[],            -- ['oncology', 'machine learning']
  authors      JSONB,             -- [{name, orcid, affiliation}, …]
  citation_count INT DEFAULT 0,
  full_text_url TEXT,
  source       TEXT,              -- 'openalex' | 's2' | 'crossref' | 'arxiv'
  ingested_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE paper_sections (        -- from PDF parse
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id   UUID REFERENCES papers(id) ON DELETE CASCADE,
  kind       TEXT,               -- 'abstract'|'intro'|'methods'|'results'|'discussion'|'limitations'|'future_work'
  text       TEXT,
  position   INT
);

CREATE TABLE paper_embeddings (
  paper_id   UUID REFERENCES papers(id) ON DELETE CASCADE,
  section_id UUID REFERENCES paper_sections(id) ON DELETE CASCADE,
  embedding  vector(768),        -- SPECTER2
  adapter    TEXT,               -- 'proximity'|'classification'|'search'
  PRIMARY KEY (paper_id, section_id, adapter)
);

CREATE INDEX ON paper_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE citations (
  src_paper UUID REFERENCES papers(id) ON DELETE CASCADE,
  dst_paper UUID REFERENCES papers(id) ON DELETE CASCADE,
  context   TEXT,                -- sentence where citation appears
  intent    TEXT,                -- 'background'|'methods'|'results' (S2 classification)
  PRIMARY KEY (src_paper, dst_paper)
);

CREATE TABLE gap_analyses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  topic       TEXT,
  filters     JSONB,              -- date range, fields, methods filters
  status      TEXT,               -- 'queued'|'running'|'done'|'failed'
  created_at  TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE gap_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id    UUID REFERENCES gap_analyses(id) ON DELETE CASCADE,
  title          TEXT,
  description    TEXT,
  category       TEXT,            -- 'methodology'|'population'|'intersection'|'temporal'|'geography'
  novelty_score  NUMERIC,         -- 0–10
  feasibility_score NUMERIC,      -- 0–10
  evidence       JSONB,           -- [{paper_id, quote, section, relevance}, …]
  research_question TEXT,
  suggested_method  TEXT
);
```

RLS: users can only see their own `gap_analyses` and `gap_items`. `papers`, `paper_sections`, `paper_embeddings`, `citations` are shared-read (they are the cached public corpus).

### 3.3 The ingestion pipeline (end-to-end)

1. **Seed corpus**. For each topic a user searches, query all four primary sources in parallel:
   - **PubMed E-utilities** (`/esearch.fcgi` → `/efetch.fcgi`) — primary for medicine, 35M+ citations, 100% MEDLINE abstract coverage, MeSH indexing
   - **Europe PMC** (`/search`) — 40M+ abstracts + 8M+ full texts, NLP-enriched disease/gene annotations, 10 req/s no auth
   - **OpenAlex** (`/works?search=…`) — breadth across fields, citation graph, non-English coverage
   - **Semantic Scholar** (`/graph/v1/paper/search`) — citation intent classification + free SPECTER2 embeddings
   Paginate to ~500–2000 papers per topic. Each source is a pluggable adapter so adding arXiv/Crossref/CORE in v1.x is trivial.
2. **Dedupe**. DOI exact match → merge. Fuzzy title (Jaro-Winkler > 0.92) + author overlap → merge. MinHash / LSH if the corpus ever exceeds 5M papers.
3. **Fetch full text**. Use **Unpaywall** to resolve open-access URLs. For papers without OA, store metadata-only.
4. **Parse PDFs** with GROBID or Marker → structured sections. Critically important: isolate `limitations` and `future work` sections — they are gold for future-work mining.
5. **Embed sections** with SPECTER2 (prefer cached S2 embeddings; only embed new sections ourselves). Store in `paper_embeddings`.
6. **Build citation edges** from OpenAlex / S2 reference lists. Store in `citations`.
7. **Job orchestration**. Every step is an idempotent BullMQ job with exponential backoff. Workers are stateless; Redis holds the queue. Restarts are safe.
8. **Rate limit etiquette**. Honor each API's limits (Semantic Scholar 1 req/s with key, OpenAlex ~100k req/day, PubMed 10 req/s with key). Token-bucket per API stored in Redis.

### 3.4 The gap-analysis pipeline (on-demand)

Triggered when a user submits a topic. Runs as a `gap-analysis-worker` job, streams progress to the UI via SSE.

1. **Retrieve** — hybrid search: SPECTER2 dense top-50 ∪ Postgres FTS BM25 top-50, then Cohere rerank-3 → top-30 sections.
2. **Cluster** — run BERTopic (or simpler: Leiden clustering on embedding graph) to group retrieved papers into 4–8 sub-topics. Each cluster becomes a candidate gap neighborhood.
3. **Extract signals per cluster**:
   - future-work sentences (keyword + dependency parse)
   - methodology distribution
   - population / geographic distribution (NER over affiliations + abstracts)
   - citation-graph structural holes (betweenness centrality)
   - temporal publication velocity (declining / stable / rising)
4. **Map Phase (Parallel Extraction) with Claude Haiku 4.5**: Do NOT concatenate all papers. Process each retrieved paper independently to extract raw gap sentences natively. *(Note: For the Hackathon, you might even use Opus 4.7 here to show extreme performance, though Haiku/DeepSeek is better for later production).*
5. **Reduce Phase (Synthesis) with Claude Opus 4.7**: Send the aggregated raw gap signals to Opus 4.7 to flex its long-context complex reasoning abilities.
   - System instruction: Cluster these mapped gap fragments into 3-5 high-novelty, strongly-grounded research gaps. Identify hidden contradictions across mapped extractions.
   - **Grounding rule**: Every synthesized gap must cite ≥2 paper IDs and accurately quote source text.
6. **Critique pass (Claude Haiku 4.5)**: "Is each of these gaps novel, feasible, and exactly matching the original source quote?" Gaps that hallucinate are dropped.
7. **Rank** — combine the LLM's novelty score, structural-hole score, and citation-velocity into a final list. Stream to UI via Postgres Realtime.

**Latency budget**: 30–90 seconds for a full analysis. Streaming UI keeps it tolerable.

### 3.5 Preventing hallucination (non-negotiable)

- Every gap must be backed by verbatim quotes from stored sections — the UI shows the snippet on hover.
- Critique pass runs retrieval-based verification: does the cited passage actually support the claim?
- Any gap where the critique model disagrees is flagged or dropped.
- User-facing disclosure: "Generated gaps are based on literature indexed through [date]. Verify before citing in a proposal."

### 3.6 Evaluation (how we know it works)

No public benchmark exists, so Seif must build one:

- Recruit 3–5 domain experts (reach into Seif's med-school network).
- Pick 3 topics per field, run the tool, collect expert labels on gap validity.
- Track: **precision@10**, **recall of known gaps**, **inter-rater agreement (Cohen's κ)**, **hallucination rate** (% of gaps where the critique disagrees with evidence).
- Target for v1 launch: precision@10 ≥ 0.7, hallucination rate ≤ 5%.

Additional automated metrics: retrieval recall@k on a holdout of known seed-papers, cost per analysis, p95 latency.

### 3.7 Cost model (rough, 1,000 researchers/month, 1 analysis each, ~200 papers/analysis)

| Item | Monthly |
|---|---|
| Hostinger KVM 4 VPS (Supabase + workers + Redis + GROBID + Caddy) | $15 |
| Hostinger KVM 8 upgrade (if KVM 4 is too tight — recommended) | +$15 |
| Hostinger backups + snapshot storage | $5 |
| Zoho Mail (transactional + business, 500 EGP/year ≈ $10/year) | ~$1 |
| Anthropic API keys, Cohere, Stripe, Supabase managed dev mirror | $0 (pay-as-you-go below) |
| OpenAlex / Semantic Scholar / PubMed / Europe PMC / Crossref | $0 |
| Embeddings (SPECTER2 free via S2; self-host for new papers — no API cost) | ~$0 |
| Claude Opus 4.7 / Haiku 4.5 (Hackathon Mode) | Covered by Hackathon credits |
| DeepSeek V4 / V3.2 Map-Reduce (Production Mode Post-Hackathon) | ~$5 total |
| Cohere rerank-3 | ~$5 |
| Sentry / self-hosted Langfuse / self-hosted PostHog | $0 (fit on the same VPS if KVM 8) |
| Apple Developer + Google Play ($99/yr + $25 one-time, amortized) | ~$10 |
| Domain | $1 |
| **Total** | **~$80–100/mo at launch scale** |

Cost per paying user at $20/mo Pro (Global) or 200 EGP (MENA) with a raised limit of ~50 analyses/month: COGS ~$1.50 per user, gross margin ~90%+. The architecture leverages **Anthropic Opus 4.7 for Hackathon Judging**, but cleanly flips via `.env` to **DeepSeek V4/V3.2 for Production** using the exact same Map-Reduce routing, slashing regular production marginal unit costs to under $0.05.

**Cost caveat:** the KVM 4 is tight. Budget for KVM 8 (~$30/mo) if you want everything, including Langfuse/PostHog, on the same box.

### 3.8 Security & compliance
- Secrets in Supabase Vault or VPS `.env`; never in Git
- RLS on all user-owned tables
- Per-user rate limits (tracked in Redis) — free: 3 analyses/month, Pro: 100/month
- Store abstracts + metadata; **do not redistribute full PDFs** — link out to publisher / arXiv
- Attribute data sources prominently in UI ("Powered by OpenAlex, Semantic Scholar, Crossref")
- GDPR: user export + delete flows
- Honor every upstream API's terms of service; no scraping Google Scholar

---

## 4. MVP Implementation Plan (THIS IS WHAT WE BUILD FIRST)

This is the concrete, shippable MVP. It is deliberately narrow so we can launch in ~14 weeks, collect real user feedback, and then expand toward the full Section 2 vision. The architecture below is **exactly the same** as the full-scope architecture in Section 3 — we're not building a throwaway prototype. Every MVP choice is additive; nothing gets rewritten when we layer on v1.1, v1.2, v2.

### 4.1 MVP feature surface (what the user actually sees)

**App name: Lacuna** (from the Latin for "gap"). Brand name used everywhere — App Store, splash, Logo mark.

**In:**
- **Onboarding-as-paywall flow** (the key conversion mechanic): new user selects a topic → sees PICO frame auto-filled → watches a live analysis terminal → sees 1 teaser gap with the rest blurred → "Sign up to reveal 7 more gaps." This turns the signup moment into a high-value payoff, not a friction gate.
- Google / Apple / Email social sign-in (Supabase Auth)
- Analyze form: Instrument Serif large text input, subfield chip picker, filter row (preprints, open-access, years, study designs), ink pill "Find gaps" CTA
- Live-streaming analysis page: `StreamingStatus` progress card → ranked list of `GapCard` components appearing one-by-one via Supabase Realtime
- Each gap card: category pill, Instrument Serif title, description, novelty + feasibility score tiles (pastel bg + fill bar), collapsible evidence section with verbatim quotes + paper metadata
- Gap detail screen: `ScoreBig` pastel tiles (Instrument Serif 48px score), suggested research question, methodology recommendation with Est. N/sites/duration, evidence list with section type badges
- Library screen: saved analyses in 2-column grid, filter chips
- Export to PDF + Markdown
- Free tier: 3 analyses/month; Pro $20/mo capped at 20 analyses/month, via Stripe

**Out of MVP (stays in Section 2 menu for v1.1+):**
- PDF / CV / proposal upload inputs
- Interactive citation map visualization
- Collaboration, advisor dashboard, Zotero sync, Obsidian export
- Contradiction detection, claim graph, temporal forecasting, geographic/demographic audit, interdisciplinary intersection
- Mobile app
- Institutional tier
- Non-medical fields, Arabic

The three gap techniques that SHIP in the MVP engine are: **future-work mining**, **PICO enumeration** (the medical killer feature), and **LLM synthesis with grounding**. That's it. Everything else in Section 2's technique list is layered in post-launch.

### 4.2 Repo structure (two repos, not a monorepo)

Because the mobile app (JS, Expo, managed workflow) and the backend (Node workers, edge functions, docker-compose) have very different tooling, two separate repos keeps things simple. Monorepo is overkill for a two-developer project.

**Repo 1: `research-gap-finder-app`** — the Expo mobile app (JavaScript)

```
research-gap-finder-app/
├── app/                              # Expo Router file-based routes
│   ├── _layout.js                    # root stack, auth gate, fonts, theme provider
│   ├── index.js                      # → redirects to /login or /(tabs)/dashboard
│   ├── login.js                      # full auth + onboarding flow (state machine)
│   │                                 #   get-started → onboard-a/b/c/reveal → sign-up/sign-in
│   ├── (tabs)/
│   │   ├── _layout.js                # floating black pill tab bar (FloatingTabBar)
│   │   ├── dashboard.js              # saved analyses list + new-analysis button
│   │   ├── library.js                # 2-column grid of all analyses, filter chips
│   │   ├── analyze.js                # topic input + subfield picker + filter rows
│   │   └── settings.js               # account, tier, usage bar, upgrade, sign out
│   └── analyses/
│       ├── [id].js                   # streaming results (the hero screen)
│       └── detail.js                 # gap detail: ScoreBig tiles, evidence, method card
├── components/
│   ├── GapCard.js                    # the key component — renders a single gap
│   ├── EvidenceQuote.js              # expandable verbatim-quote card
│   ├── ScoreBadge.js                 # score tile with pastel bg + animated fill bar
│   ├── CategoryPill.js               # future-work / methodology / PICO / etc.
│   ├── StreamingStatus.js            # progress bar + step list with check/spinner
│   ├── AnalysisCard.js               # dashboard card with rotating vivid accent strip
│   ├── EmptyState.js
│   ├── UpgradeSheet.js               # Stripe/RevenueCat paywall sheet
│   ├── Logo.js                       # Lacuna logo mark (two dashes + butter dot)
│   └── ui/                           # Button, Input, Sheet, StatusPill, etc.
├── lib/
│   ├── supabase.js                   # createClient + auth helpers
│   ├── api/
│   │   ├── analyses.js               # createAnalysis, getAnalysis, subscribeToGaps
│   │   ├── export.js                 # exportPdf, exportMarkdown
│   │   └── billing.js                # Stripe/RevenueCat wrappers
│   ├── mocks/                        # === UI-FIRST MOCK LAYER ===
│   │   ├── mockAnalyses.js           # fake analyses + gap data
│   │   ├── mockStream.js             # simulates gap cards arriving over time
│   │   └── index.js                  # toggled via __DEV__ + env flag
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useAnalysis.js            # TanStack Query: analysis + gap list
│   │   └── useGapStream.js           # subscribes to Supabase Realtime
│   └── theme.js                      # colors, typography, spacing
├── assets/                           # fonts, icons, app icon, splash
├── app.json                          # Expo config
├── eas.json                          # EAS Build/Submit config
├── babel.config.js
└── package.json
```

**Repo 2: `research-gap-finder-backend`** — workers + edge functions + infra (Node / Deno)

```
research-gap-finder-backend/
├── supabase/                         # supabase CLI self-host layout
│   ├── config.toml
│   ├── migrations/
│   │   └── 0001_init.sql             # schema from 4.3
│   ├── functions/                    # EDGE FUNCTIONS (Deno)
│   │   ├── analyses-create/
│   │   │   └── index.ts              # POST: rate-limit, insert, enqueue
│   │   ├── analyses-export/
│   │   │   └── index.ts              # GET: render PDF/MD
│   │   └── stripe-webhook/
│   │       └── index.ts              # POST: update subscription
│   └── seed.sql                      # dev-only seed data
├── workers/                          # Node.js, BullMQ
│   ├── src/
│   │   ├── index.js                  # bootstrap: connect redis, spawn all workers
│   │   ├── queue.js                  # BullMQ queue definitions
│   │   ├── workers/
│   │   │   ├── ingest.js             # fetches corpus from 4 APIs
│   │   │   ├── parse.js              # GROBID → sections
│   │   │   ├── embed.js              # SPECTER2 → pgvector
│   │   │   └── analyze.js            # gap engine orchestrator
│   │   ├── adapters/
│   │   │   ├── pubmed.js
│   │   │   ├── europepmc.js
│   │   │   ├── openalex.js
│   │   │   ├── semanticScholar.js
│   │   │   ├── unpaywall.js
│   │   │   └── rateLimit.js          # Redis token bucket
│   │   ├── retrieval/
│   │   │   ├── hybridSearch.js       # pgvector + FTS
│   │   │   └── rerank.js             # Cohere rerank-3
│   │   ├── gapEngine/
│   │   │   ├── futureWorkMiner.js
│   │   │   ├── picoEnumerator.js
│   │   │   ├── llmSynthesizer.js     # Claude Opus with caching
│   │   │   ├── critique.js           # Claude Haiku
│   │   │   ├── ranker.js
│   │   │   └── prompts/
│   │   │       ├── synthSystem.txt
│   │   │       ├── synthFewShot.json
│   │   │       └── critique.txt
│   │   ├── dedupe.js
│   │   └── lib/
│   │       ├── supabaseAdmin.js
│   │       ├── anthropic.js
│   │       ├── logger.js
│   │       └── sentry.js
│   ├── package.json
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml            # supabase + redis + grobid + workers + caddy
│   ├── caddy/Caddyfile               # HTTPS reverse proxy
│   ├── .env.example
│   └── scripts/
│       ├── provision-vps.sh          # bootstrap the Hostinger VPS
│       ├── backup-db.sh              # nightly pg_dump to Hostinger storage
│       └── restore-db.sh
└── evals/
    ├── gold-set/                     # expert-labeled gaps (JSON)
    └── run.js                        # precision@10, Cohen's κ, hallucination
```

Why JavaScript for the app per Seif's preference, but TypeScript in the backend `supabase/functions/` (Deno): Supabase edge functions are Deno, which is TS-native. It's not extra work — the templates already ship as `.ts`. The Node workers can stay JS (`.js`) to match Seif's preference.

### 4.3 MVP data schema (trimmed from Section 3.2 — only what the MVP needs)

Ship these tables in `0001_init.sql`. The fuller schema in Section 3.2 is the v1.1+ target.

```sql
create extension if not exists vector;
create extension if not exists pg_trgm;

create table papers (
  id uuid primary key default gen_random_uuid(),
  doi text unique,
  pmid text unique,
  openalex_id text unique,
  s2_id text unique,
  title text not null,
  abstract text,
  year int,
  venue text,
  mesh_terms text[],
  authors jsonb,
  citation_count int default 0,
  source text not null,                -- 'pubmed'|'europepmc'|'openalex'|'s2'
  ingested_at timestamptz default now()
);
create index papers_title_trgm on papers using gin (title gin_trgm_ops);
create index papers_fts on papers using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')));

create table paper_sections (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references papers(id) on delete cascade,
  kind text,                           -- 'abstract'|'methods'|'results'|'discussion'|'limitations'|'future_work'
  text text,
  position int
);

create table paper_embeddings (
  paper_id uuid references papers(id) on delete cascade,
  section_id uuid references paper_sections(id) on delete cascade,
  embedding vector(768),
  primary key (paper_id, section_id)
);
create index on paper_embeddings using hnsw (embedding vector_cosine_ops);

create table gap_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  topic text not null,
  subfield text,
  status text not null default 'queued',  -- queued|running|done|failed
  error text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table gap_analyses enable row level security;
create policy own_analyses on gap_analyses for all using (auth.uid() = user_id);

create table gap_items (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references gap_analyses(id) on delete cascade,
  rank int,
  title text,
  description text,
  category text,                       -- 'future-work'|'methodology'|'pico'|'llm-synthesis'
  novelty_score numeric,
  feasibility_score numeric,
  research_question text,
  suggested_method text,
  evidence jsonb                       -- [{paper_id, quote, section_id, relevance}, ...]
);
alter table gap_items enable row level security;
create policy own_gap_items on gap_items for select using (
  exists (select 1 from gap_analyses a where a.id = analysis_id and a.user_id = auth.uid())
);

create table subscriptions (
  user_id uuid primary key references auth.users(id),
  tier text not null default 'free',   -- 'free'|'pro'
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);
```

### 4.4 MVP ingestion pipeline (what the worker does)

On analysis submit, the `analyze` worker orchestrates this sequence. Each step is its own BullMQ job so any step can retry independently.

```
[user submits topic]
        │
        ▼
1. search-corpus job
   ├─ pubmed.search(topic, limit=500)        // parallel
   ├─ europepmc.search(topic, limit=500)
   ├─ openalex.search(topic, limit=500)
   └─ s2.search(topic, limit=500)
        │
        ▼
2. dedupe job
   ├─ DOI exact match → merge
   ├─ PMID exact match → merge
   └─ Jaro-Winkler title > 0.92 + author overlap → merge
        │  (persists new rows to `papers`)
        ▼
3. fetch-fulltext job (best-effort, non-blocking)
   └─ unpaywall.resolve(doi) → if OA, download PDF to /tmp
        │
        ▼
4. parse-sections job
   └─ GROBID (dockerized on VPS) → TEI XML → structured sections
        │  (persists to `paper_sections`)
        │  ***critical: isolate `limitations` + `future_work` sections***
        ▼
5. embed job
   ├─ for each paper with s2_id: fetch free SPECTER2 embedding from S2 API
   └─ for papers without s2_id: self-embed title+abstract via SPECTER2 adapter
        │  (persists to `paper_embeddings`)
        ▼
6. retrieve job
   └─ hybrid search top-100 sections relevant to the original topic
      (dense pgvector + FTS BM25 → Cohere rerank-3 → top-30)
        │
        ▼
7. gap-engine job (see 4.5)
        │
        ▼
[stream gap_items to UI as they're written]
```

**Rate-limit etiquette (MVP):**
- PubMed: 10 req/s with API key (token bucket in Redis)
- Europe PMC: 10 req/s (same pattern)
- OpenAlex: polite pool with mailto in User-Agent, ~100 req/s
- Semantic Scholar: 1 req/s with API key
- All adapters retry 3x with exponential backoff; failures are logged to Sentry, never silently swallowed

**Caching:** if another user submits a topic whose normalized query matches within 7 days, reuse the cached corpus — skip steps 1–5, jump straight to step 6. This is a big cost saver.

### 4.5 Gap engine — MVP pipeline (the core IP)

This is where the product lives or dies. Three gap techniques run in parallel over the top-30 reranked sections.

**Honest assessment of MVP coverage:** The 3 MVP techniques will NOT catch every possible gap — no system can. What they do well: future-work mining catches gaps authors explicitly named (high precision); PICO enumeration systematically maps the combinatorial research space (uniquely powerful for medicine); LLM synthesis catches implicit patterns across clusters that no single paper names. What they miss in v1: citation network structural holes (gaps at field-intersection borders), contradiction-based gaps (where Paper A says X and Paper B says ¬X), methodology gaps (e.g., "everyone used cross-sectional design"), and geographic/demographic blind spots. A domain expert with 10 years of field experience still has an edge on *implicit* gaps. The full 12-technique engine (Section 2.3) closes most of this gap — add citation structural holes and methodology gap detection first (v1.1, highest-leverage additions).

**Technique A — Future-work mining** (`workers/src/gapEngine/futureWorkMiner.js`)
- Filter sections where `kind in ('limitations','future_work','discussion')`
- Pattern-match sentences containing phrases like: `future (research|studies|work) should`, `limited by`, `understudied`, `remains unclear`, `further investigation`, `not yet (examined|explored)`
- Run dependency parse (spaCy or Stanza) to extract the object of the "should" / "unclear" clause
- Cluster semantically-similar extractions using SPECTER2 embeddings + agglomerative clustering
- Output: list of `{quote, paper_id, section_id, extracted_gap_phrase}` grouped by cluster

**Technique B — PICO enumeration** (`workers/src/gapEngine/picoEnumerator.js`) — *the medical killer feature*
- For each paper in the top-30, use Claude Haiku with a strict JSON-schema prompt to extract `{population, intervention, comparison, outcome}` from the abstract
- Build a 4-dimensional frequency table across the corpus
- Identify under-sampled cells: any (P, I, C, O) tuple where the paper count is ≤ 20th percentile of the full grid but the parent dimensions are well-populated → that's a gap
- Output: list of `{pico_gap, evidence_papers_for_each_dimension}`

**Technique C — Map-Reduce Synthesis (Opus 4.7 Hackathon / DeepSeek Prod)** (`workers/src/gapEngine/llmSynthesizer.js`)
- **Map (Haiku 4.5 / DeepSeek V3.2):** Process all 30 top sections independently in parallel to harvest standalone gap fragments.
- **Reduce (Opus 4.7 / DeepSeek V4):** Aggregate fragments logically. Call Opus 4.7's complex reasoning to structure contradictions and themes:

```
SYSTEM (cached, ~1500 tokens):
You are a research-gap analyst for medical literature.
Your job: given a cluster of medical papers, produce 2-4 specific,
novel, feasible research gaps that a master's or PhD student could
investigate in a 12-18 month project.

HARD RULES (never violate):
1. Every gap claim MUST cite at least 2 paper IDs from the cluster.
2. Every gap claim MUST quote verbatim text from a cited paper.
3. If you cannot ground a gap in quoted evidence, do NOT output it.
4. Score novelty 1-10 (1 = already studied, 10 = clear white space).
5. Score feasibility 1-10 (1 = requires MRI/large grant, 10 = chart review).
6. Each gap needs: title, description, novelty, feasibility, research_question,
   suggested_method, evidence[{paper_id, quote}].
7. Output strict JSON, no prose.

FEW-SHOT EXAMPLE: [1-2 good gap examples from the eval set]

USER (dynamic, per cluster):
CLUSTER TOPIC: {cluster_label}
PAPERS:
  [{id, title, abstract, future_work_quotes, methods_quotes}, ...]

Return a JSON array of 2-4 gap objects.
```

**Critique pass** (`workers/src/gapEngine/critique.js`)
- For each candidate gap from A + B + C, call Claude Haiku 4.5 (DeepSeek V3.2 in Prod):
  - "Does the cited quote actually support this gap claim? Answer GROUNDED or UNGROUNDED with 1-sentence rationale."
- Drop any UNGROUNDED gaps.
- **Hard verification**: for every `evidence[i].quote`, run a string-match against `paper_sections.text`. If the quote isn't verbatim in the stored section, drop the gap. This is a non-LLM guardrail — it cannot be bypassed by a hallucination.

**Ranking** (`workers/src/gapEngine/ranker.js`)
- Final score per gap = `0.5 * novelty + 0.3 * feasibility + 0.2 * evidence_density`
- Dedupe semantically-similar gaps across techniques (cosine similarity > 0.85 → merge)
- Return top 10

### 4.6 Hackathon Showcase vs Post-Hackathon Economics

**Hackathon Phase (Opus 4.7 + Haiku 4.5):**
To maximize scores for the "Built with 4.7" hackathon, the pipeline uses Anthropic models natively. Costs will be artificially higher per analysis, but acceptable for a competition/demo environment using free API credits.

**Production Phase (DeepSeek V3.2 + V4 Swap):**
Because DeepSeek models are structured identically in API format, swapping `.env` keys post-hackathon drops costs by two orders of magnitude without changing the Map-Reduce pipeline.
- **DeepSeek Map Phase**: ~$0.28 per 1M tokens. Splitting contexts leverages high throughput.
- **DeepSeek Reduce Phase**: ~$0.30/1M - $0.50/1M tokens.

**Per-analysis cost estimate (Production Swap):**
- Embeddings: ~$0.01 (free via S2 for most papers)
- Cohere rerank: ~$0.02
- DeepSeek V3.2 Map + Critique: ~$0.01
- DeepSeek V4 Reduce Synthesis: ~$0.01
- DeepSeek V3.2 PICO extraction (30 papers): ~$0.01
- **Total per analysis: ~$0.04 - $0.06**

At $20/mo Pro (Global) or 200 EGP (MENA), granting a robust **50 analyses/month**, the gross margin reaches an incredible 90%+. Even heavily localized regional pricing is extremely profitable (200 EGP ≈ $4. $4 rev vs $0.50-$2 COGS ensures a highly scalable, asset-light SaaS). Free tier at 3 analyses/month → sub-$0.20 CAC per free user.

### 4.7 API surface — Supabase edge functions + PostgREST + Realtime

The mobile app talks to the backend through three channels, all bundled inside the self-hosted Supabase stack:

**1. Auto-generated PostgREST (for all simple CRUD):**
The mobile app uses `@supabase/supabase-js` to read `gap_analyses` and `gap_items` directly. Row-Level Security gates everything to the authenticated user. No custom endpoint needed for reads.

```js
// Example: fetch an analysis + its gaps
const { data: analysis } = await supabase
  .from('gap_analyses').select('*').eq('id', analysisId).single()
const { data: gaps } = await supabase
  .from('gap_items').select('*').eq('analysis_id', analysisId).order('rank')
```

**2. Supabase Realtime (streaming gaps to the app):**
```js
// Subscribe to gap_items as the analyze-worker inserts them
const channel = supabase
  .channel(`analysis:${analysisId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'gap_items',
        filter: `analysis_id=eq.${analysisId}` },
      payload => pushGapIntoUi(payload.new))
  .subscribe()
```

**3. Edge functions (Deno) — for things that need server-side logic:**

```
POST /functions/v1/analyses-create
  body: { topic, subfield }
  auth: Authorization: Bearer <jwt>
  action:
    1. verify JWT via GoTrue
    2. check user's subscription tier + monthly quota (free: 3/mo, pro: 20/mo)
    3. insert gap_analyses row (status='queued')
    4. enqueue `analyze` job to BullMQ via Redis connection
    5. return { id }

GET /functions/v1/analyses-export?id=…&format=pdf|md
  auth: Authorization: Bearer <jwt>
  action:
    1. verify JWT + RLS ownership
    2. fetch gap_analyses + gap_items
    3. render PDF (via @react-pdf/renderer in Deno-compatible wrapper)
       or Markdown (direct string template)
    4. return file with Content-Type

POST /functions/v1/stripe-webhook
  auth: Stripe signature header
  action: upsert subscriptions row on customer.subscription.* events
```

Edge functions run in the Supabase stack's Deno runtime (port 9000 by default). Caddy reverse-proxies them under `api.yourdomain.com/functions/v1/*`. Workers are a separate Node process on the same VPS that pulls jobs from Redis.

### 4.8 Mobile screens (the nine screens that ship)

**App name: Lacuna.** The name references the Latin word for "gap" — exact fit for the product. Use this as the brand name in the App Store listing, splash screen, and Logo component.

**Design system** (finalized, implemented in `lib/theme.js`):
- Warm neutral base: bg `#F1EEE8`, ink `#0E0E0C`
- Display font: Instrument Serif (italic for emotional words: "space", "next", "claimed")
- UI font: Inter (500/600/700 weights)
- Vivid pastel category palette: sky `#A8CCDF` (future-work), mint `#A8D4A2` (methodology), lavender `#C4B4E4` (PICO), butter `#F2D96A` (LLM synthesis), peach `#F5BFA0` (geography), rose `#E8A8A8` (population)
- Floating black pill tab nav (home/layers/sparkle/person icons, active item shows colored chip + label)

All screens built with Expo Router file-based routing. Every screen works against the mock layer (`lib/mocks/`) for the first ~5 weeks of development.

**Auth + onboarding flow** (`app/login.js`) — single file, internal screen state machine:

1. **Get started**: ambient pastel blobs (butter/sky/lavender), Logo mark, Instrument Serif 52px "Find the *space* where you matter.", subtitle, single black pill "Get started" CTA, "Already have an account? Sign in" footer.

2. **Onboard A — Topic picker** (step 1/4): "Pick a topic you're curious about." — 2×2 grid of topic cards (GLP-1 agonists / CAR-T therapy / Microbiome / ML in imaging). Selected card gets its category color bg + 2px ink border + check badge. "Or describe your own…" below the grid.

3. **Onboard B — PICO frame** (step 2/4): "Here is your PICO frame." — 4 rows (P=rose, I=lavender, C=mint, O=sky) auto-filled from the selected topic. User can edit. Auto-fill notice with sparkle icon at bottom.

4. **Onboard C — Live analysis** (step 3/4): "Watch the engine run." — animated progress bar + ink terminal log box that reveals steps one-by-one (FETCH / PARSE / EMBED / CLUSTER / GAP with color-coded prefixes). This is the key trust-building moment before paywall.

5. **Onboard Reveal — Paywall** (step 4/4): "You found a gap nobody else has *claimed.*" — 1 teaser gap card (rank box, category pill, partially revealed title with blurred/blocked portion, novelty score, locked feasibility). 3 blurred placeholder cards below under a fog overlay. "🔒 7 more gaps waiting" label. CTA changes to butter pill "Sign up to reveal" (not ink). *This is the conversion moment — the user has now seen the engine work and wants their gaps.*

All 4 onboard steps share a shell: dot pager (active dot width=22, inactive=6) top-left, Skip button top-right (hidden on step 4), scrollable content area, fixed CTA at bottom.

6. **Sign up** (`sign-up` state): back chip + Logo top bar, "Create your *account.*", "Free forever. 3 analyses a month.", Google / Apple / Email social buttons (icon anchored left, text centered), Terms · Privacy footer.

7. **Sign in** (`sign-in` state): "Welcome *back.*", email + password fields (password shows "Show/Hide" toggle), "Sign in" ink pill, OR divider, Google + Apple side-by-side half-width buttons.

**Post-auth screens (tab navigation):**

8. **Dashboard** (`app/(tabs)/dashboard.js`) — Logo mark top-left, ink round "+" new-analysis button top-right, Instrument Serif "Recent analyses" heading, pull-to-refresh list of `AnalysisCard` components (rotating vivid accent strip, topic text, gap count badge, date + status pill). Empty state with centered prompt.

9. **Analyze form** (`app/(tabs)/analyze.js`) — Instrument Serif 32px "What area of medicine do you want to *explore?*", raw TextInput with Instrument Serif font (no box chrome), subfield chip picker (horizontal wrap, active = ink bg white text), filter rows in white card (Include preprints / Open-access / Years / Study designs), ink pill "Find gaps" CTA with "≈ 45 sec · 500 papers" subtitle.

10. **Streaming results** (`app/analyses/[id].js`) — the hero screen. `StreamingStatus` card (progress bar, step list with check/spinner icons). Vertical list of `GapCard` components appearing one-by-one via Supabase Realtime. Share + Export chips in header.

11. **Gap detail** (`app/analyses/detail.js`) — `ScoreBig` tiles (pastel bg, Instrument Serif 48px number/10), black card with suggested research question, white method card with Est. N/sites/duration, evidence list with section badges (limitations/future-work/discussion).

12. **Library** (`app/(tabs)/library.js`) — "Library" Instrument Serif heading, filter chip row (All / Running / Done / Saved), 2-column grid of past analysis cards (squircle icon, topic, field label, "N gaps · date").

13. **Settings** (`app/(tabs)/settings.js`) — Instrument Serif heading + ink avatar with initial, butter upgrade pill, catSynthesis usage fill bar ("2 of 3 analyses used"), tier-based sign-out.

**Tab bar** (`app/(tabs)/_layout.js`): custom floating black pill nav — `FloatingTabBar` component using Tabs `tabBar` prop. 4 tabs: home (dashboard), layers (library), sparkle (analyze), person (settings). Active tab renders colored chip with icon + label text, inactive tabs show icon only.

**Key component: GapCard** (`components/GapCard.js`): Instrument Serif 22px title, category pill, score tiles with pastel bg and animated fill bar, italic Instrument Serif block quotes, expandable evidence section with surfaceAlt bg cards. This receives the most design polish — it is the product.

The mock layer (`lib/mocks/mockStream.js`) fakes the Realtime subscription — yields a pre-written gap every 2 seconds. Toggle via `USE_MOCKS` env flag in `app.json` extra config.

### 4.9 Evaluation set (build this BEFORE launch — gates shipping)

This is non-negotiable. Without it we have no idea if the product actually works.

- Recruit 6 medical experts from Seif's Banha / MENA network (residents, junior faculty, med-school colleagues)
- Pick 6 topics spanning cardiology, oncology, neurology, infectious disease, surgery, public health
- For each topic: experts independently list 5–10 real research gaps they know of from the field (~30 gold gaps per topic = ~180 total)
- Run the MVP on each topic, compute:
  - **Precision@10**: what fraction of the top-10 gaps are in the expert-labeled set (or judged valid by a blinded expert review)
  - **Recall**: what fraction of expert-labeled gaps the system surfaces
  - **Cohen's κ** across expert raters on blinded validation
  - **Hallucination rate**: % of gaps where the automated quote-verification fails or the critique pass flags UNGROUNDED
- **Launch gates**: precision@10 ≥ 0.6, hallucination rate ≤ 5%. If not met, iterate on prompts, retrieval, and ranking — do not ship.

### 4.10 Week-by-week MVP tasks — UI-first build order (14 weeks)

The plan is deliberately split into three phases: **A. UI with mocks** (weeks 1–5), **B. Backend + infra** (weeks 6–11), **C. Integration + eval + beta** (weeks 12–14). This lets Seif put something in users' hands as a design / UX prototype very early, validate the flow, and avoid spending backend weeks building features the UX eventually throws away.

#### Phase A — Mobile UI with mocked data (weeks 1–5)

| Week | Task | Key deliverable |
|---|---|---|
| **1** | Validate + design | 5 expert calls with medical researchers. Signed SOW with client. Figma design pass on the 7 screens (or paper sketches if skipping Figma). Decide NativeWind vs RN Paper. Provision the Expo project + a new Supabase project (even just managed for dev) for testing the auth SDK. |
| **2** | Expo scaffold + auth + theme | `research-gap-finder-app` repo created with Expo Router. Theme (colors, typography, spacing) in `lib/theme.js`. Splash + login screen working with real Supabase magic link against dev project. Bottom tab bar shell. |
| **3** | Dashboard + analyze form (with mocks) | `mockAnalyses.js` with 6 fake analyses. Dashboard screen pulls from mocks, shows empty state, list state, and loading state. Analyze form with topic + sub-field picker, navigates to results screen with a new mock id. |
| **4** | **GapCard polish + streaming results screen (the hero week)** | `GapCard` component designed and polished against 8 real-looking mock gaps: title, category pill, dual score badges, evidence expander with verbatim quotes, paper tap-out. `mockStream.js` fakes Realtime by yielding one gap every 2 seconds. Progress header ("Fetching papers…"). This screen is the product — over-invest here. |
| **5** | Settings, export sheet, upgrade paywall, polish | Settings screen with account + usage + tier. Export sheet UI (PDF / MD / copy link) — it just shows a stub alert for now. Upgrade sheet UI wired to Stripe/RevenueCat test mode. Loading states, error states, pull-to-refresh everywhere. **End of week 5: demoable UI prototype** — Seif can send a TestFlight / Expo Go build to 5 beta researchers for pure UX feedback, no backend. |

#### Phase B — Backend: Hostinger VPS + self-hosted Supabase + workers (weeks 6–11)

| Week | Task | Key deliverable |
|---|---|---|
| **6** | VPS + self-hosted Supabase + schema | Provision Hostinger KVM (8GB+ RAM). Install docker + docker-compose. Bring up the full Supabase self-hosted stack via the official compose file. Caddy HTTPS on `api.yourdomain.com`. Apply `0001_init.sql` migration. Dev-smoke-test magic-link auth from a throwaway Expo app against the self-hosted URL. |
| **7** | Ingestion adapters — PubMed + Europe PMC | `pubmed.js` + `europepmc.js` with rate-limited token buckets in Redis. Integration test: fetch 500 papers for "type 2 diabetes prevention" and persist to `papers`. |
| **8** | Ingestion adapters — OpenAlex + Semantic Scholar + dedupe | Two more adapters + `dedupe.js` (DOI → PMID → Jaro-Winkler title + author overlap). 4-source ingest running end-to-end. GROBID docker sidecar + `parse.js` worker isolating `limitations` and `future_work` sections. |
| **9** | Embeddings + hybrid retrieval | `embed.js` worker using S2 cached SPECTER2 embeddings where available, self-hosted SPECTER2 fallback for new papers. `hybridSearch.js` combining pgvector HNSW + Postgres FTS. Cohere rerank wrapper. Smoke test: given "type 2 diabetes prevention", top-30 reranked sections look plausible. |
| **10** | Gap engine A + B — future-work mining + PICO | `futureWorkMiner.js` (NLP extraction + clustering + grounding). `picoEnumerator.js` (Claude Haiku strict-JSON extraction → frequency table → under-sampled cell detection). Unit tests against labeled sentences. |
| **11** | Gap engine C + critique + ranking + edge functions | `llmSynthesizer.js` (Claude Opus with cached system prompt, map-reduce over clusters). `critique.js` (Haiku pass + verbatim-quote guardrail). `ranker.js`. `analyze.js` worker orchestrates the full pipeline and inserts `gap_items` one-by-one. Edge functions: `analyses-create`, `analyses-export`, `stripe-webhook`. Realtime streaming verified end-to-end with `curl` + a small test harness. |

#### Phase C — Integration, evaluation, beta (weeks 12–14)

| Week | Task | Key deliverable |
|---|---|---|
| **12** | **Swap mocks for real API** (the other hero week) | In the Expo app, flip the env flag from `USE_MOCKS=true` to `false`. Replace mock fetches with real Supabase calls. Replace `mockStream.js` with a real Supabase Realtime subscription. End-to-end test on a physical device: topic in → real analysis → real gaps stream in → PDF export works. Fix every UX papercut discovered in real usage. |
| **13** | Evaluation set + hardening | Recruit 6 medical experts from Seif's Banha / MENA network. Build the 6-topic gold set (~180 labeled gaps). Run `evals/run.js`. Iterate prompts, retrieval k, ranking weights until **precision@10 ≥ 0.6 and hallucination rate ≤ 5%**. Fix top failure modes. |
| **14** | Private beta | EAS Build → TestFlight (iOS) + Google Play internal testing (Android). Invite 30–50 beta researchers from Seif's network. Sentry + Langfuse + PostHog dashboards watched daily. Collect feedback, pricing-willingness interviews. |

**Launch gate at end of week 14:** eval metrics passing + no P0 bugs + 10+ positive beta testimonials → submit to App Store + Play Store for public review.

**Why UI-first works here:** the gap cards + streaming results screen IS the product. If the UX of reading a gap + drilling into evidence isn't compelling, no amount of backend quality saves you. Conversely, if the UX is great and a beta user says "I'd pay for this even with fake data" — you know the backend investment is worth it. Standard startup de-risking.

### 4.11 What comes after the MVP (v1.1 → v2)

Once the MVP is live and the gap engine is proven, we layer in features from Section 2 in priority order. Suggested sequence (each ~2–4 weeks):

1. **v1.1** — Interactive citation-map visualization + Zotero/Mendeley export (the two most-requested features in every similar tool)
2. **v1.2** — PDF proposal upload (critique user's draft against literature) + seed-paper input
3. **v1.3** — Geographic / demographic bias detection (leverages PubMed's affiliation metadata)
4. **v1.4** — Contradiction detection (NLI model on claim pairs)
5. **v1.5** — Advisor dashboard + collaboration + threaded comments
6. **v1.6** — Temporal trend forecasting ML model
7. **v2.0** — Expand to non-medical fields (adds arXiv, CORE, Crossref adapters; new eval sets per field)
8. **v2.1** — Mobile app (Expo, reuses Seif's SuturedNotes shell)
9. **v2.2** — Arabic UI + Arabic-language paper ingestion
10. **v2.3** — Institutional tier (SSO, API access, librarian seats)

Each of these is roughly 2–4 weeks. After 6 months post-MVP-launch the product is at v1.4–1.5; after 12 months it's approaching the full Section 2 vision.

---

## 4a. Reference: full-scope v1 (deferred — the north-star vision)

*This is what Seif originally said he wanted. Keeping it as a reference for the long-horizon roadmap. Sections 5+ timelines refer to the full-scope build, NOT the MVP above.*

**IN for v1 (medical, web, English):**

*Input*
- Free-text topic query + medical sub-field tag (cardiology, oncology, …)
- Seed paper input (paste DOIs or upload PDFs)
- Upload researcher's CV / ORCID for expertise-profiling
- Upload draft proposal / thesis document → gap analysis + novelty critique
- Upload advisor's publication list → "gaps that complement your lab"
- Conversational refinement chat

*Retrieval & coverage*
- **PubMed / Entrez** (primary — medical ground truth, MeSH, 100% abstracts)
- **Europe PMC** (biomedical full-text + NLP disease/gene annotations)
- **OpenAlex** (breadth + citation graph)
- **Semantic Scholar + S2AG** (citation intent + free SPECTER2 embeddings)
- **Unpaywall** (OA full-text resolution)
- Preprint toggle (bioRxiv / medRxiv) + grey-literature toggle (dissertations, reports)
- Date-range filter, sub-field filter

*Gap detection engine (all 12 techniques)*
1. Future-work / limitations mining (NLP dependency parse on discussion sections)
2. Citation-network structural holes (betweenness + persistent homology)
3. BERTopic topic-modeling evolution over time
4. Contradiction / disagreement detection (NLI models + Scite-style citation intent)
5. Claim extraction → claim graph
6. **PICO gap enumeration** — huge leverage in medicine; enumerate (Population, Intervention, Comparison, Outcome) tuples and flag under-sampled cells. This is the medical killer feature.
7. Bibliometric keyword co-occurrence networks
8. Methodology gap detection (study-design distribution)
9. Geographic / demographic gap detection (WEIRD-sample bias, age, sex, ethnicity)
10. Interdisciplinary intersection detection
11. LLM synthesis with citation grounding (Claude Opus 4.6)
12. Temporal trend forecasting (citation-velocity ML model)

*Output surface*
- Ranked gap list — novelty score, feasibility score, evidence-density heatmap, category badge
- Auto-generated research questions (5–10) per analysis
- Methodology recommendations + suggested study designs + sample-size estimates
- Novelty confidence interval
- Interactive gap map (react-force-graph on citation network with gaps overlaid)
- Methodology × population × geography heatmap
- Exportable PDF / DOCX / Markdown gap report with full citations
- Suggested collaborators (PubMed author search for adjacent work)

*Collaboration & productivity*
- Saved, versioned gap analyses (auto-refresh as literature updates)
- Annotations + tags per gap
- **Zotero + Mendeley export** with gap tags pre-populated
- Share gap analyses with advisor / co-authors + threaded comments
- Advisor dashboard for supervising multiple students
- Obsidian / Roam export

*Trust & quality signals*
- Every gap claim linked to verbatim source snippets (click-to-verify)
- Consensus vs. controversy flag
- Methodological quality score
- Automated critique pass (Claude Haiku 4.5) to reject ungrounded gaps
- Bias flags (author / institution / funding concentration)
- Diversity audit (WEIRD-sample overrepresentation warnings)
- Training-cutoff disclosure banner

*Auth, billing, tiers*
- Supabase Auth (magic link + Google OAuth)
- Stripe billing
- **Free**: 3 gap analyses/month, top-5 gaps per analysis, basic export
- **Pro ($20/mo)**: 20 analyses/month (capped to hold ~50% margin at ~$0.48/analysis COGS), full gap list, all exports, collaboration, Zotero/Mendeley sync, advisor dashboard
- **Institutional ($5K–50K/yr)**: API access, SSO, university-branded dashboard, librarian seats — sales-led, post-launch

*Observability & eval*
- Langfuse for every LLM trace
- PostHog funnels
- Sentry error tracking
- Expert eval set: **6 medical experts from Seif's Banha + MENA network**, 3 topics each, gold-labelled gaps. Precision@10 and hallucination rate tracked weekly.

**OUT for v1 (explicit deferrals):**
- Mobile apps (iOS / Android) — v2
- Arabic UI / Arabic-language papers — v2
- Non-medical fields (CS, economics, humanities) — v2, but the architecture is field-agnostic so it's a config + eval-set expansion, not a rewrite
- arXiv / CORE / Lens / Dimensions adapters — v1.x additions when expanding fields

---

## 5. Phased execution timeline — honest version

The full feature set is a **significantly larger build than a lean MVP**. With Seif as solo dev at ~15 h/week alongside SuturedNotes and medical school, this is **9–12 months** to public launch. With one additional full-stack engineer it compresses to **5–6 months**. Recommendation: **hire a contract engineer** for phases 3–6 — the ingestion pipeline, gap engine, and evaluation set are the three places where parallelizing pays off the most.

Phases are sequenced so every phase ends in a demoable artifact, even if not yet shippable.

| Phase | Weeks | Deliverable |
|---|---|---|
| **0. Validate + contract** | 1–2 | 5 medical expert interviews. Manual gap analysis on 3 medical topics to prove the idea. Signed SOW with client (scope, IP, payment schedule). |
| **1. Foundation** | 3–4 | Expo app + self-hosted Supabase scaffold on Hostinger VPS, Auth + Stripe/RevenueCat, pgvector, Redis + BullMQ running. EAS Build wired. |
| **2. Ingestion — medical core** | 5–8 | PubMed, Europe PMC, OpenAlex, Semantic Scholar adapters. Dedupe (DOI + fuzzy title + MinHash). GROBID PDF parsing with section isolation. Nightly poller populates corpus for a seed list of 20 medical topics. |
| **3. Retrieval + embeddings** | 9–10 | SPECTER2 embeddings (free via S2 where cached, self-embed new papers). Hybrid search (pgvector + Postgres FTS) + Cohere rerank-3. Internal test harness: retrieval recall@k on known seed papers. |
| **4. Gap engine — core techniques** | 11–14 | Future-work mining, methodology distribution, BERTopic clustering, citation-network structural holes, **PICO enumeration** (the medical killer feature), LLM synthesis with grounding, Claude Haiku critique pass. |
| **5. Gap engine — advanced techniques** | 15–18 | Contradiction detection (NLI), claim graph, geographic/demographic bias, interdisciplinary intersection detection, temporal trend forecasting ML model. |
| **6. Output surface + UI** | 19–22 | Topic input flow, streaming results, evidence-quote hover cards, research-question and methodology recommendations, PDF/DOCX/Markdown export, **interactive gap map** (react-force-graph), heatmap viz. |
| **7. Collaboration layer** | 23–25 | Saved/versioned analyses, annotations, share links, threaded comments, advisor dashboard, Zotero + Mendeley export, Obsidian/Roam export. |
| **8. Trust & quality layer** | 26–27 | Bias flags, diversity audit, consensus/controversy flags, critique-pass audit logs, training-cutoff disclosure, full hallucination pass. |
| **9. Expert eval set + hardening** | 28–30 | Recruit 6 medical experts. Build labelled eval set. Iterate on prompts and ranking until precision@10 ≥ 0.7 and hallucination rate ≤ 5%. Fix top failure modes. |
| **10. Private beta** | 31–33 | 30–100 beta researchers from Seif's network. Langfuse + PostHog feedback loop. Pricing experiments. |
| **11. Public launch** | 34–36 | Paid Pro tier live, landing page, content marketing, outreach to medical faculties. Institutional-sales conversations begin. |

**Total: ~36 weeks = ~8.5 months with a second engineer, ~12 months solo.**

*Team-size recommendation:* Seif is already splitting focus across SuturedNotes + medical school + content. Taking on a 12-month solo client build at full scope is a recipe for stalling. Two honest options:
1. **Hire a contract full-stack engineer** (React/Node + Python for ML bits) for phases 3–6, funded from the client's initial payment. Compresses the project and de-risks delivery.
2. **Negotiate scope with the client**: ship a lean v1 at ~14 weeks, then v1.1 / v1.2 every 4–6 weeks after, building toward the full feature set post-launch. This is what I'd recommend if the client is reasonable.

---

## 6. Critical paths (where the code lives)

This is a **new standalone project** in two separate repos — it should NOT live inside the Seif's-Personal-assistant workspace. See Section 4.2 for the concrete file layouts.

- **`research-gap-finder-app`** (Expo + React Native, JavaScript) — lives on Seif's dev machine, builds via EAS Build for iOS + Android distribution
- **`research-gap-finder-backend`** (Node workers + Deno edge functions + docker-compose) — deployed to the Hostinger VPS via git push + docker-compose pull/up

---

## 7. Reusable assets from Seif's existing work

The mobile-only + Expo + self-hosted decision means Seif can directly lift a lot of infrastructure from SuturedNotes:

- **Expo app shell** — Expo Router layout, theme, splash, auth flow → copy-paste from SuturedNotes, swap the business logic
- **Supabase auth client + magic-link flow** — same code, new URL pointing at the Hostinger-hosted self-hosted Supabase
- **Row-Level Security patterns** — the `auth.uid() = user_id` policies mirror what SuturedNotes already does
- **Stripe + RevenueCat subscription flow** — same pattern, new product IDs
- **Claude API wrapper with prompt caching** — Seif already has this from SuturedNotes question generation
- **VPS ops playbook** — Seif is already running a custom VPS (api.suturednotes.online) for OCR + question generation; the same ops knowledge transfers directly to the Hostinger VPS

---

## 8. Verification plan

How we'll know v1 actually works, end-to-end:

**Functional checks:**
- Unit tests on each adapter (OpenAlex, S2, Crossref) with recorded fixtures
- Integration test: submit a topic → full pipeline runs → ≥5 grounded gaps returned
- Snapshot test: given a fixed corpus, gap output is stable run-to-run (for regression detection)

**Quality checks:**
- Expert eval set: 3 domain experts, 3 topics each, labeled gold gaps. Run weekly; track precision@10 and hallucination rate over time.
- Citation check: every `evidence[*].quote` string must appear verbatim in the referenced `paper_sections.text`. Automated; any mismatch is a bug.

**Manual acceptance (before launch):**
- Run the tool on 5 topics in Seif's own field (medicine); have Seif verify the gaps are non-obvious and citeable
- Run it on 3 topics from unrelated fields (CS, economics, biology) to check field-transfer
- Submit a known-dead topic (fully saturated) and verify the tool correctly reports "no meaningful gaps found"
- Latency: p95 end-to-end ≤ 90 seconds
- Cost: ≤ $0.20 per analysis at target scale

**Production monitoring:**
- Langfuse traces for every Claude call (cost, latency, quality)
- PostHog funnels: signup → first analysis → gap saved → Pro upgrade
- Sentry for any ingestion or worker errors

---

## 9. Open questions for Seif (to resolve before kickoff)

Audience, scope, platform, and language are locked (see Context section). Remaining business questions Seif needs to pin down with the client before writing a line of code:

1. **Client relationship** — paid build-for-hire, revenue share, equity, or a hybrid? IP ownership (client-owned, Seif-owned, joint)? Exclusivity clause?
2. **Payment structure** — milestone-based (aligned to the phases in Section 5) or retainer? How much upfront to fund infra + a contract engineer?
3. **Team size decision** — solo (12 months) or hire a contract full-stack engineer for phases 3–6 (8.5 months)? If hiring, who pays — Seif from the initial payment, or the client directly?
4. **Infra + LLM cost coverage during dev** — the $150–200/month infra cost and higher LLM costs during eval should be a pass-through to the client, not absorbed by Seif.
5. **Launch go-to-market** — is the client helping with distribution (faculty intros, institutional sales) or is that on Seif?
6. **Expert evaluators** — Seif needs 6 medical experts for the eval set. Can the client introduce any, or does Seif recruit entirely from his Banha network?
