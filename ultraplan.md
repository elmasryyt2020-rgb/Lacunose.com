# Lacunose — Ultraplan

**Supersedes [implementation-plan.md](implementation-plan.md).** That doc is preserved as historical context; this is the active spec. Where the two disagree, this document wins.

Brand: **Lacunose** (domain: lacunose.com). The product finds *lacunae* — gaps — in the published record of **any research field**.

---

## 0. What changed vs. implementation-plan.md

| Dimension | Old plan | Ultraplan |
|---|---|---|
| **Scope** | Medical only in v1, general in v2 | **Every research field from day one** (field-adaptive schema + taxonomy) |
| **Build order** | MVP first, full vision later | **Full app base now** — production-ready, every feature in; hackathon-ready demo is a config of the same build |
| **Platform** | Mobile-only, JavaScript | Mobile-only, **TypeScript** (matches the actual repo at [lacunose/](lacunose/)) |
| **Infra** | "Hostinger VPS KVM4/8, self-host everything" | **Hostinger KVM4 (already purchased), cloud PostHog + cloud Sentry** (self-host later if needed), self-hosted Supabase + self-hosted pgvector, **PM2-managed Node edge functions** (not Deno) |
| **LLM** | Anthropic, swap to DeepSeek post-launch | **Provider-agnostic LLM layer from day one.** `LLM_PROVIDER=anthropic` for hackathon judging ("Built with 4.7"), `LLM_PROVIDER=deepseek` for worldwide launch. Swap = one env var. |
| **Context strategy** | Monolithic Opus reduce (used 1M ctx) | **Parallel chunked map-reduce** that works on Opus 4.7 *and* DeepSeek V3.2/V4 (128K ctx) without pipeline changes. Future-proofs the cost switch. |
| **Billing** | Stripe | **RevenueCat + Apple Pay + Google Pay (IAP only)** — no Stripe, no web checkout |
| **Analytics focus** | General funnels | **First-week retention + feature-use-by-day** as the north-star PostHog dashboards |
| **Edge functions** | Deno runtime baked into Supabase | **Node + PM2** on the VPS, reverse-proxied by Caddy. Keeps the whole backend in one runtime (Node), simpler ops, survives VPS reboots. |

Everything else from the original — gap engine techniques, evaluation rigour, evidence-grounded gaps, the "paywall is the onboarding reveal" moment — carries over and gets *more* ambitious, not less.

---

## 1. Hackathon context (Cerebral Valley "Built with 4.7")

Judging criteria: **impact × demo × Opus 4.7 usage**. The plan is tuned to win all three.

- **Impact**: a research-gap finder that works across *every* field (med, CS, humanities, econ, physics, law, biology…) is 100× the TAM of a med-only tool. Pitch angle: "Opus 4.7 gave us the reasoning depth to collapse a 10-person R&D team into one 45-second analysis."
- **Demo**: the streaming gap-card reveal (Supabase Realtime + Opus 4.7 live in the terminal log overlay) *shows* the model reasoning. That's the screenshot/video that judges remember.
- **Opus 4.7 usage**: the reduce/synthesis stage uses Opus 4.7 with prompt caching and tool use (evidence-grounding tool, critique tool) — a real showcase, not a toy wrapper call. During hackathon, we crank the map phase onto Opus too (Haiku 4.5 is the production map model) to show raw 4.7 horsepower.

After the hackathon we flip `LLM_PROVIDER=deepseek`, the exact same pipeline runs at ~2% of the cost, and worldwide launch proceeds. **The code does not change. Only the env file.**

---

## 2. Product scope — field-agnostic from day one

### 2.1 Supported fields (pluggable, not hardcoded)

| Field cluster | Example sub-fields | Primary sources |
|---|---|---|
| **Biomedicine** | Cardiology, oncology, neurology, public health | PubMed, Europe PMC, OpenAlex, S2 |
| **Life sciences** | Molecular biology, ecology, evolution, genetics | Europe PMC, OpenAlex, S2, bioRxiv |
| **Computer science & AI** | ML, systems, HCI, theory, NLP | arXiv, OpenAlex, S2, DBLP, ACL |
| **Physics & math** | Condensed matter, astro, HEP, pure math | arXiv, OpenAlex, S2 |
| **Engineering** | Mech, EE, civil, chemical, materials | OpenAlex, S2, IEEE Xplore (scraped metadata) |
| **Chemistry** | Organic, inorganic, physical, analytical | OpenAlex, S2, ChemRxiv |
| **Earth & environment** | Geology, climate, oceanography | OpenAlex, S2, EarthArXiv |
| **Social sciences** | Psychology, sociology, political science, anthropology | OpenAlex, S2, SSRN, PsyArXiv |
| **Economics & finance** | Micro, macro, econometrics, behavioral | RePEc, NBER, SSRN, OpenAlex |
| **Humanities** | History, literature, philosophy, linguistics | OpenAlex, S2, PhilPapers, JSTOR metadata |
| **Law** | Constitutional, IP, criminal, international | OpenAlex, SSRN (law section), HeinOnline metadata |
| **Education** | Pedagogy, assessment, policy | OpenAlex, ERIC |
| **Business & management** | Strategy, marketing, ops, org behaviour | OpenAlex, SSRN |

**OpenAlex + Semantic Scholar alone cover 250M+ works across every field.** All other sources are enrichments. So the universal baseline works on day one; field adapters just sharpen it.

### 2.2 Field adapters (the cross-field abstraction)

Each field adapter is a single TypeScript module exporting:

```ts
interface FieldAdapter {
  id: string;                              // 'biomed'|'cs'|'econ'|…
  label: string;                           // UI display
  sources: DataSource[];                   // ordered by priority
  structuredFrame: StructuredFrame;        // replaces PICO per field
  gapTaxonomy: GapCategory[];              // which categories apply
  promptHints: { system: string; fewShot: Example[] }; // field-specific grounding for the LLM
  studyDesignVocab: string[];              // lexicon for methodology-gap detection
}
```

**The `structuredFrame` per field** — this replaces the medical-only PICO:

- Biomed: `{population, intervention, comparison, outcome}` (PICO)
- Social sci / psych: `{population, exposure, comparison, outcome}` (PECO) or `{sample, phenomenon, design, evaluation, research-type}` (SPIDER)
- CS / AI: `{task, dataset, method, metric}`
- Physics / chem: `{system, method, measurement, condition}`
- Economics: `{treatment, population, outcome, identification-strategy}`
- Humanities: `{period, corpus, theme, methodology}`
- Law: `{jurisdiction, doctrine, period, methodology}`
- Engineering: `{system, constraint, method, performance-metric}`
- Generic fallback: `{subject, approach, context, outcome}`

The gap engine builds its frequency table over whichever frame the adapter provides. **PICO is a special case of a general "structured coverage grid."** That's the core generalization that makes this cross-field.

### 2.3 Gap categories (universal, colour-coded)

Eight categories, each with a pastel colour from the existing theme ([lacunose/constants/theme.ts](lacunose/constants/theme.ts)):

| Category | Colour | Applies when |
|---|---|---|
| `future-work` | sky | Authors explicitly name open questions in discussion/limitations |
| `methodology` | mint | Study-design distribution is lopsided (e.g., "only cross-sectional studies exist") |
| `coverage` | lavender | Structured-frame cell is under-populated (the PICO-style gap, field-adapted) |
| `contradiction` | rose | NLI detects conflicting claims across papers |
| `geographic` | peach | Regional / affiliation concentration flagged |
| `population` | butter | Demographic under-representation (age, sex, ethnicity, language…) |
| `intersection` | sage | Two adjacent topics rarely co-cited — interdisciplinary white space |
| `temporal` | sky-muted | Topic velocity declining (saturated) or sharply rising (emerging) |

These are rendered by the existing `CategoryPill` in [lacunose/components/Shared.tsx](lacunose/components/Shared.tsx). No new icon work needed — just add the colour mapping.

---

## 3. System architecture (on Hostinger KVM4)

KVM4 = 4 vCPU, 16 GB RAM, 200 GB NVMe, 16 TB transfer. Tight but enough **if** we host PostHog + Sentry in their respective clouds (we do). That frees ~6 GB RAM we'd otherwise burn on those services.

### 3.1 Single-box topology

```
┌──────────────────────────────────────────────────────────────────────┐
│              MOBILE APP (iOS + Android) — Expo + TypeScript          │
│  Expo Router · @supabase/supabase-js · react-native-purchases        │
│  (RevenueCat) · Sentry RN SDK · posthog-react-native                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  HTTPS (api.lacunose.com)
                             ▼
╔══════════════════════════════════════════════════════════════════════╗
║               HOSTINGER KVM4 VPS  (Ubuntu 22.04 LTS)                 ║
║                                                                      ║
║  Caddy (reverse proxy + auto-HTTPS via Let's Encrypt)                ║
║    api.lacunose.com        → Kong (Supabase) on :8000                ║
║    fn.lacunose.com         → PM2 edge-function cluster on :4000      ║
║    grobid.lacunose.com     → GROBID (internal auth) on :8070         ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │  SELF-HOSTED SUPABASE (docker-compose)                         │  ║
║  │    Kong gateway   :8000                                        │  ║
║  │    GoTrue (auth)  :9999                                        │  ║
║  │    PostgREST      :3000                                        │  ║
║  │    Realtime       :4000 (internal; exposed by Kong)            │  ║
║  │    Storage        :5000                                        │  ║
║  │    Postgres 15 + pgvector + pg_trgm  :5432                     │  ║
║  │    Supabase Studio (firewalled to Seif's IP)                   │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │  PM2 ecosystem (Node 20 LTS, TypeScript via tsx)               │  ║
║  │    edge-fn        ×2 forks  — HTTP handlers (see §7)           │  ║
║  │    worker-ingest  ×2 forks  — fetches corpora                  │  ║
║  │    worker-parse   ×1 fork   — GROBID orchestration             │  ║
║  │    worker-embed   ×1 fork   — SPECTER2 via S2 API + ONNX fallbk│  ║
║  │    worker-gap     ×2 forks  — map+reduce gap pipeline          │  ║
║  │    worker-critique×1 fork   — grounding + critique             │  ║
║  │    pm2-logrotate + pm2-auto-pull (deploy hook)                 │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  Redis 7  (BullMQ queues + rate-limit token buckets + LLM cache)     ║
║  GROBID   (dockerized, 2 GB RAM reserved, Java heap capped)          ║
║                                                                      ║
║  Nightly: pg_dump → Hostinger Object Storage (encrypted)             ║
║  Firewall: ufw — 22 (key only) / 80 / 443 only; everything else int. ║
╚══════════════════════════════════════════════════════════════════════╝
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│    EXTERNAL SaaS (cloud, not on VPS)                                 │
│    Sentry.io          — errors (mobile + server)                     │
│    PostHog Cloud (EU) — product analytics + session recordings       │
│    RevenueCat         — Apple/Google IAP receipt validation          │
│    Anthropic API      — Claude Opus 4.7 + Haiku 4.5 (hackathon)      │
│    DeepSeek API       — V4 + V3.2 (post-hackathon swap)              │
│    Cohere             — rerank-3                                     │
│    Semantic Scholar   — SPECTER2 embeddings + citation intent        │
│    OpenAlex / PubMed / Europe PMC / arXiv / Crossref / Unpaywall     │
│    Zoho Mail          — SMTP relay for GoTrue magic-link emails      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 KVM4 memory budget (16 GB total)

| Service | RAM | Why |
|---|---|---|
| Postgres 15 + pgvector | 4 GB | shared_buffers=1GB, work_mem=32MB, heavy use from workers |
| Supabase sidecars (GoTrue+PostgREST+Realtime+Storage+Kong+Studio) | 1.2 GB | lean Go/Node services |
| Redis | 512 MB | `maxmemory 512mb allkeys-lru` |
| GROBID | 2.5 GB | JVM `-Xmx2g`, the real RAM hog |
| PM2 (all forks: edge-fn + 7 worker forks) | 3.5 GB | node --max-old-space-size=384 per fork |
| Caddy | 150 MB | tiny |
| System, cron, ssh, ufw, docker engine | 1.5 GB | |
| **Headroom** | **~2.6 GB** | Handles traffic spikes and OS page cache |

**If we outgrow this**, the first thing to exile is GROBID — move to a $5/mo dedicated parser box, or replace it with a PyMuPDF + heuristic section detector (worse quality, but 200 MB RAM). Both are documented in §6.4.

### 3.3 Why PM2-managed Node edge functions instead of Deno

- One runtime (Node 20 LTS) across all server code — shared modules, shared TypeScript types, shared error handling, shared tests.
- Survives VPS reboots (`pm2 save` + `pm2 startup` → systemd).
- `pm2 reload` is a zero-downtime rolling restart across forks.
- `pm2 monit` and `pm2 logs` give console-level ops without shipping logs anywhere.
- Shared code with workers: the edge function that enqueues a job imports the exact same BullMQ queue definition the worker consumes. No duplicated job schemas.
- Still talks to Supabase via PostgREST/GoTrue over HTTPS — it's just a Node process running Express/Fastify instead of Deno's serve().
- Trade-off we accept: we give up `supabase functions deploy` convenience. Replaced by a two-line `pm2 reload edge-fn` after `git pull`.

### 3.4 Why KVM4 now, upgrade path later

- Hackathon demo traffic: ~dozens of users. KVM4 is massive overkill for that.
- Beta (200–500 users, 1–3 analyses/week each): KVM4 holds with the memory budget above.
- Growth signal (≥ 1,000 WAU with steady analyses): upgrade to KVM8 (8 vCPU / 32 GB). Zero code change — same docker-compose, `docker compose up -d`, migrate in-place.
- Real scale (≥ 10,000 WAU): split Postgres onto a dedicated DB box, keep workers on app box. Still zero code change.

---

## 4. LLM abstraction layer (the swap guarantee)

This is the single most important piece of the codebase. Done right, the Opus 4.7 → DeepSeek swap is `LLM_PROVIDER=deepseek` in `.env.production` and a `pm2 reload`. Done wrong, it's a 2-week rewrite.

### 4.1 File layout ([lacunose-backend/src/llm/](lacunose-backend/src/llm/))

```
src/llm/
├── index.ts                    # public API: llm.chat(), llm.critique(), llm.embed()
├── types.ts                    # Message, ChatOptions, ChatResponse, ToolDef
├── router.ts                   # reads LLM_PROVIDER env → returns provider
├── providers/
│   ├── anthropic.ts            # Claude Opus 4.7 + Haiku 4.5, prompt caching, tool use
│   ├── deepseek.ts             # DeepSeek V4 (reasoner) + V3.2 (chat), OpenAI-compat
│   └── mock.ts                 # deterministic fixtures for tests
├── cache.ts                    # Redis-backed response cache (hash of messages → resp)
├── chunk.ts                    # splits inputs to fit a given provider's ctx window
└── parallel.ts                 # p-limit concurrency wrapper for map phase
```

### 4.2 The unified interface

```ts
// types.ts
export type Role = "system" | "user" | "assistant" | "tool";
export type Message = { role: Role; content: string; toolCallId?: string; toolCalls?: ToolCall[] };

export interface ChatOptions {
  model: "synth" | "map" | "critique";   // semantic tier, not vendor model name
  messages: Message[];
  tools?: ToolDef[];
  cache?: { key: string; ttlSec: number };  // Redis response cache
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: object;                    // enforce JSON mode
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens?: number };
  provider: "anthropic" | "deepseek" | "mock";
  model: string;  // concrete vendor model used
  latencyMs: number;
}
```

**Semantic tiers, not vendor names.** Calling code never says "use Opus 4.7" — it says `model: "synth"`. The router resolves that:

| Tier | `LLM_PROVIDER=anthropic` | `LLM_PROVIDER=deepseek` |
|---|---|---|
| `synth` (deep reasoning, reduce phase) | `claude-opus-4-7` | `deepseek-reasoner` (V4/R1) |
| `map` (fast extraction from single paper) | `claude-haiku-4-5-20251001` | `deepseek-chat` (V3.2) |
| `critique` (grounding verification) | `claude-haiku-4-5-20251001` | `deepseek-chat` (V3.2) |

For the **hackathon**, we add `LLM_PROVIDER=anthropic-allopus` which remaps `map` and `critique` to `claude-opus-4-7` too — max "Built with 4.7" surface area for the judges.

### 4.3 Feature parity contract

| Capability | Anthropic | DeepSeek | How the adapter handles divergence |
|---|---|---|---|
| Chat | ✅ | ✅ | identical |
| JSON mode / tool use | ✅ (tool use) | ✅ (tool-calls + JSON) | adapter translates tool schema |
| Prompt caching | ✅ (`cache_control`) | ❌ as of 2026-01 | Redis-layer cache in `cache.ts` covers DeepSeek |
| Long context (>128K) | ✅ (1M Opus 4.7) | partial (128K ctx) | `chunk.ts` always keeps payloads ≤ 100K tokens — works for both |
| Streaming | ✅ SSE | ✅ SSE | same interface |
| Vision | ✅ | ⚠️ only V-L variants | we don't use vision in v1 |

**The chunking rule (critical):** even on Opus with 1M ctx, we never send >100K input tokens to a single call. This means the entire pipeline is provider-agnostic by design — nothing breaks when we flip the env var.

### 4.4 Evaluation harness for the swap

Before flipping to DeepSeek in production, the eval set (§13) runs on both providers with the same prompts. Target: DeepSeek precision@10 within 10% of Opus. If gap quality regresses by more than that, we add retrieval filters or increase the chunk overlap before degrading the experience.

---

## 5. Parallel chunked pipeline (fast on Opus, safe on DeepSeek)

The core insight: *a gap analysis is embarrassingly parallel*. 200 papers × independent extraction = 200 independent LLM calls that can run concurrently. A monolithic "dump all 200 abstracts into one Opus call" works on 1M ctx but is slow, expensive, and blocks the DeepSeek future.

### 5.1 Pipeline stages

```
┌────────────────────────────────────────────────────────────────┐
│ Stage 1 — INGEST (IO-bound, fan out to data sources)           │
│   parallel over {pubmed, openalex, s2, arxiv, europepmc, …}    │
│   ↓ yields ~500–2000 raw papers                                │
├────────────────────────────────────────────────────────────────┤
│ Stage 2 — DEDUPE (CPU-bound, single-threaded is fine)          │
│   DOI → PMID/arXivID → fuzzy title+author                      │
│   ↓ yields ~300–1500 unique papers                             │
├────────────────────────────────────────────────────────────────┤
│ Stage 3 — ENRICH (IO-bound, bounded parallelism)               │
│   parallel(concurrency=8):                                     │
│     unpaywall.resolve → optional PDF → GROBID → sections       │
│     S2.getEmbedding → if missing, self-embed via ONNX          │
│   ↓ yields papers with sections[] + embeddings[]               │
├────────────────────────────────────────────────────────────────┤
│ Stage 4 — RETRIEVE (Postgres, single query)                    │
│   hybrid: pgvector HNSW top-100 ∪ FTS BM25 top-100             │
│   → Cohere rerank-3 → top-30 sections                          │
├────────────────────────────────────────────────────────────────┤
│ Stage 5 — MAP (LLM-bound, MASSIVE parallelism) ★               │
│   parallel(concurrency=12):                                    │
│     for each of ~30 reranked sections:                         │
│       llm.chat({model:"map", prompt:"extract gap signals"})   │
│   ↓ yields ~30 signal bags                                     │
├────────────────────────────────────────────────────────────────┤
│ Stage 6 — CLUSTER (CPU-bound, single-threaded)                 │
│   HDBSCAN on signal embeddings → 4–8 clusters                  │
├────────────────────────────────────────────────────────────────┤
│ Stage 7 — REDUCE (LLM-bound, one call per cluster IN PARALLEL) │
│   parallel(concurrency=6):                                     │
│     for each cluster:                                          │
│       llm.chat({model:"synth",                                 │
│                 prompt:"synthesize 2–4 gaps for this cluster"}) │
│   ↓ yields 8–24 candidate gaps                                 │
├────────────────────────────────────────────────────────────────┤
│ Stage 8 — CRITIQUE (LLM-bound, parallel)                       │
│   parallel(concurrency=12):                                    │
│     for each candidate gap:                                    │
│       llm.chat({model:"critique",                              │
│                 prompt:"is this grounded in the quote?"})       │
│   + non-LLM verbatim-quote guardrail (string match)            │
│   ↓ drops ungrounded gaps → yields 5–15 survivors              │
├────────────────────────────────────────────────────────────────┤
│ Stage 9 — RANK (CPU-bound)                                     │
│   score = 0.5·novelty + 0.3·feasibility + 0.2·evidence_density │
│   dedupe semantically (cosine > 0.85) → top 10                 │
├────────────────────────────────────────────────────────────────┤
│ Stage 10 — STREAM                                              │
│   INSERT into gap_items one at a time → Postgres logical       │
│   replication → Supabase Realtime → mobile app renders         │
└────────────────────────────────────────────────────────────────┘
```

**Stage 5 and 7 are where the win lives.** 30 map calls + 6 reduce calls + 15 critique calls = ~51 parallel LLM calls per analysis. On Opus that's ~25 seconds wall-clock with concurrency 12 (parallel > sequential for this workload). On DeepSeek it's ~15 seconds because DeepSeek is faster per token.

### 5.2 Why this wins on both Opus and DeepSeek

- **Opus 4.7 (1M ctx, premium price)**: we don't waste the 1M window on one giant call — we use it for richness per call (full sections, few-shot examples, tool definitions), then multiply by parallelism. Cost per analysis stays bounded.
- **DeepSeek V4 (128K ctx, 1/50 price)**: the chunking means nothing ever needs to fit in 1M — we're always well under 128K per call. No quality cliff on the swap.

### 5.3 Back-pressure + cost caps

- `bull` priority queues. Free-tier analyses run at priority 1 (background). Paid at priority 10.
- Hard cap: any single analysis burns ≤ 500K total tokens. If the chunker would exceed, it truncates deterministically (by rerank score, low-to-high).
- Per-user monthly quota tracked in Postgres (`subscriptions.analyses_used_this_period`), reset on renewal via a cron in PM2.

### 5.4 Parallel development work-stream mapping

The user also asked to *parallelise the dev work* (partly because DeepSeek has smaller context windows for code, so smaller task units = better quality when we use DeepSeek-based AI coding). We split the codebase into **six independent work-streams**, each a separate Claude Code agent / `isolation: worktree` worktree:

| Stream | Scope | Touches only | Parallel-safe? |
|---|---|---|---|
| **A. Mobile shell** | Expo app routes, theme, nav, auth screens | [lacunose/app/](lacunose/app/), [lacunose/components/](lacunose/components/), [lacunose/constants/](lacunose/constants/) | yes |
| **B. Mobile data layer** | Supabase client, RevenueCat, PostHog, Sentry wiring, TanStack Query hooks | `lacunose/lib/`, `lacunose/hooks/` (new dir) | yes |
| **C. Backend infra** | docker-compose, Caddyfile, PM2 ecosystem, provisioning scripts | `lacunose-backend/infra/` | yes |
| **D. Backend edge fn + Supabase schema** | Migrations, RLS, edge-fn HTTP handlers | `lacunose-backend/supabase/`, `lacunose-backend/src/edge/` | yes |
| **E. Ingestion + enrichment** | Adapters, dedupe, GROBID orchestration, embeddings | `lacunose-backend/src/ingest/`, `lacunose-backend/src/enrich/` | yes |
| **F. Gap engine** | LLM layer, map/reduce/critique/rank, prompts | `lacunose-backend/src/llm/`, `lacunose-backend/src/gap/` | yes |

Each stream has a clear interface boundary (TypeScript types exported from a shared `types/` package). Streams A and B agree on hooks + mock data shape. Streams D and E agree on the queue payload types. Streams E and F agree on the `Paper` + `Section` + `Embedding` types. Those type packages are defined in week 1 and rarely change.

---

## 6. Data sources + ingestion (field-aware)

### 6.1 Source matrix

| Source | Coverage | Rate limit (with polite headers/key) | Cost | Fields it shines in |
|---|---|---|---|---|
| **OpenAlex** | 250M works, all fields, citation graph | 100 req/s with mailto | free | all |
| **Semantic Scholar** | 220M papers, SPECTER2, citation intent | 1 req/s with API key | free | all |
| **Crossref** | 150M DOIs (metadata spine) | ~50 req/s polite pool | free | all |
| **PubMed E-utilities** | 35M biomed citations, MeSH | 10 req/s with key | free | biomed |
| **Europe PMC** | 40M biomed, 8M full-text, NLP annotations | 10 req/s | free | biomed |
| **arXiv API** | 2.4M preprints | 1 req/3s (soft) | free | CS, physics, math, econ |
| **Unpaywall** | OA resolution for any DOI | 100k req/day | free | all |
| **bioRxiv / medRxiv / ChemRxiv** | domain preprints | polite pool | free | bio, med, chem |
| **ERIC** | education research | polite | free | education |
| **RePEc (IDEAS)** | economics working papers | polite | free | economics |
| **SSRN** | social sci + law + bus | scraping-risky, use OpenAlex proxy | — | soc/law/bus |
| **PhilPapers** | philosophy | polite | free | philosophy |
| **CORE** | OA full text across all | 10 req/s with key | free | all |
| **DOAJ** | OA journals index | polite | free | all |

**v1 active adapters:** OpenAlex + Semantic Scholar + Crossref + PubMed + Europe PMC + arXiv + Unpaywall. That gets us 95% coverage across every field. RePEc + PhilPapers + ERIC + CORE layer in as v1.1 enrichments, ordered by user feedback.

### 6.2 Adapter interface

```ts
// src/ingest/adapter.ts
export interface SourceAdapter {
  id: string;                                   // 'openalex'
  applicableFields: string[] | "all";
  search(query: Query, limit: number): AsyncIterable<RawPaper>;
  resolveFullText?(paper: RawPaper): Promise<string | null>;
}
```

All adapters implement `search` as an async iterable so we can stream → dedupe on the fly without buffering 2000 papers in memory.

### 6.3 Query planner (field-aware)

Given `{topic, field}`, the planner:

1. Picks adapters from the field's `sources` list (OpenAlex + S2 always, plus field-specific).
2. Expands the topic query using the field adapter's controlled vocabulary if available (MeSH for biomed via E-utilities `einfo`, arXiv category codes for CS/physics, JEL codes for economics).
3. Runs adapters in parallel (Stage 1 above) with per-adapter rate-limit token buckets in Redis.
4. Caches the raw corpus by `(normalized-query, field, date-range)` for 7 days. Second user submitting same topic jumps straight to Stage 4.

### 6.4 Full-text parsing strategy (GROBID vs. lighter)

**Default (v1 launch):** GROBID dockerized. Best-quality section isolation; isolates "Future Work" / "Limitations" cleanly, which is gold for Technique A.

**Fallback (if KVM4 memory becomes a problem):** PyMuPDF + regex section detector. Cheap, worse quality (misses ~15% of future-work sections). Swap via `PDF_PARSER=pymupdf` env var; both implement the same `parseSections(pdfUrl) → Section[]` interface.

**Pragmatic optimization:** we don't need full text for most gap signals. Abstracts + OpenAlex's `abstract_inverted_index` + S2 TLDRs are sufficient for Techniques B (coverage), D (contradiction detection via abstracts), and most of C (LLM synthesis). GROBID matters most for Technique A (future-work mining) and even then only ~30% of the corpus has open-access PDFs. So the parser is not on the hot path for every analysis — it's a background enrichment worker that runs opportunistically.

### 6.5 Dedupe

DOI exact → PMID exact → arXiv ID exact → Jaro-Winkler(title) ≥ 0.92 AND author-last-name overlap ≥ 1. Persisted to `papers.id` so downstream stages always see one canonical row per work.

---

## 7. Edge functions (Node + PM2, not Deno)

Server-side HTTP handlers live in `src/edge/`. They run as a PM2 app named `edge-fn` with 2 forks, load-balanced by PM2's cluster mode (each fork listens on the same port; OS picks).

### 7.1 Routes

```
POST   /v1/analyses                     — create analysis (auth, rate-limit, enqueue)
GET    /v1/analyses/:id                 — hydrate analysis + gaps (RLS via PostgREST anyway)
POST   /v1/analyses/:id/export          — render PDF or Markdown
POST   /v1/webhooks/revenuecat           — receipt validation callback
POST   /v1/account/delete                — GDPR/Apple-required full delete (cascades)
GET    /v1/health                        — liveness
GET    /v1/ready                         — readiness (Redis ping + Postgres ping)
```

### 7.2 Framework

Fastify 4 (fast, schema-first, first-class TypeScript). Each route has a JSON schema validated on entry. Errors flow to a single handler that pushes to Sentry and returns a sanitized body.

### 7.3 Auth

Mobile app puts the Supabase JWT in `Authorization: Bearer`. Edge fn verifies via `@supabase/ssr` using the self-hosted Supabase's JWT secret (shared via env). On success the request proceeds; on failure, 401.

### 7.4 Rate limits

- Free tier: 3 analyses / calendar month.
- Pro tier: 50 analyses / calendar month.
- Premium tier: 150 analyses / calendar month.
- Abuse guard (independent of tier): 1 analysis every 10 seconds, burst of 3. Token bucket in Redis, keyed by user ID.

---

## 8. Data schema (field-agnostic)

Deltas from the old plan: every `structuredFrame` is stored as JSONB, not a PICO-specific set of columns. `gap_items.category` uses the 8 universal categories from §2.3.

```sql
-- migrations/0001_init.sql
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Canonical work
create table papers (
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
  field           text[],                     -- ['cs.LG','stat.ML'] or ['cardiology']
  authors         jsonb,                      -- [{name, orcid, affiliation}, …]
  citation_count  int default 0,
  source          text not null,              -- 'openalex'|'s2'|'pubmed'|'arxiv'|…
  ingested_at     timestamptz default now()
);
create index papers_title_trgm on papers using gin (title gin_trgm_ops);
create index papers_fts on papers using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')));
create index papers_field on papers using gin (field);

create table paper_sections (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid references papers(id) on delete cascade,
  kind        text,                           -- abstract|intro|methods|results|discussion|limitations|future_work
  text        text,
  position    int
);

create table paper_embeddings (
  paper_id    uuid references papers(id) on delete cascade,
  section_id  uuid references paper_sections(id) on delete cascade,
  embedding   vector(768),
  adapter     text default 'specter2-proximity',
  primary key (paper_id, section_id, adapter)
);
create index paper_embeddings_hnsw on paper_embeddings using hnsw (embedding vector_cosine_ops);

create table citations (
  src_paper uuid references papers(id) on delete cascade,
  dst_paper uuid references papers(id) on delete cascade,
  context   text,
  intent    text,                             -- 'background'|'methods'|'results' (S2)
  primary key (src_paper, dst_paper)
);

-- User-owned
create table gap_analyses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) not null,
  topic          text not null,
  field          text not null,               -- from §2.1
  structured_frame jsonb,                     -- filled by adapter, e.g. {population, intervention, …}
  filters        jsonb,                       -- {years, study_designs, preprints, oa_only, …}
  status         text not null default 'queued',  -- queued|running|done|failed
  error          text,
  cost_tokens    jsonb default '{}'::jsonb,   -- {input, output, cached, provider}
  created_at     timestamptz default now(),
  completed_at   timestamptz
);
alter table gap_analyses enable row level security;
create policy own_analyses on gap_analyses for all using (auth.uid() = user_id);

create table gap_items (
  id                 uuid primary key default gen_random_uuid(),
  analysis_id        uuid references gap_analyses(id) on delete cascade,
  rank               int,
  title              text,
  description        text,
  category           text not null,           -- future-work|methodology|coverage|contradiction|geographic|population|intersection|temporal
  novelty_score      numeric,
  feasibility_score  numeric,
  evidence_density   numeric,
  research_question  text,
  suggested_method   text,
  suggested_n        int,
  suggested_duration_months int,
  evidence           jsonb,                   -- [{paper_id, quote, section_id, relevance}, …]
  created_at         timestamptz default now()
);
alter table gap_items enable row level security;
create policy own_gap_items on gap_items for select using (
  exists (select 1 from gap_analyses a where a.id = analysis_id and a.user_id = auth.uid()));

-- RevenueCat-synced subscription (see §9)
create table subscriptions (
  user_id                 uuid primary key references auth.users(id),
  tier                    text not null default 'free',  -- free|pro|premium
  rc_app_user_id          text unique,
  rc_entitlement          text,                          -- 'pro_monthly','premium_annual',…
  platform                text,                          -- 'ios'|'android'
  period_start            timestamptz,
  period_end              timestamptz,
  analyses_used_this_period int default 0,
  will_renew              boolean,
  updated_at              timestamptz default now()
);

-- Saved / annotated analyses (collaboration v1)
create table saved_items (
  user_id    uuid references auth.users(id),
  gap_id     uuid references gap_items(id) on delete cascade,
  note       text,
  tag        text[],                           -- 'high-priority','advisor-likes','grant-worthy'
  saved_at   timestamptz default now(),
  primary key (user_id, gap_id)
);
alter table saved_items enable row level security;
create policy own_saved on saved_items for all using (auth.uid() = user_id);

-- Shared corpus caching
create table query_cache (
  query_hash  text primary key,                -- sha256(normalized_query + field + filters)
  field       text,
  paper_ids   uuid[],
  expires_at  timestamptz
);
```

**Shared read, private write.** `papers`, `paper_sections`, `paper_embeddings`, `citations`, `query_cache` are shared read (cached corpus). `gap_analyses`, `gap_items`, `saved_items`, `subscriptions` are RLS-gated to `auth.uid()`.

---

## 9. Subscriptions — RevenueCat + Apple Pay + Google Pay

No Stripe. No web checkout. Mobile-only IAP, validated server-side via RevenueCat webhooks.

### 9.1 Products (App Store Connect + Google Play Console)

| SKU | Tier | Price | Entitlement |
|---|---|---|---|
| `lacunose.pro.monthly` | Pro | $19.99 / mo | `pro` |
| `lacunose.pro.annual` | Pro | $179.99 / yr (save 25%) | `pro` |
| `lacunose.premium.monthly` | Premium | $49.99 / mo | `premium` |
| `lacunose.premium.annual` | Premium | $449.99 / yr (save 25%) | `premium` |

Regional pricing via App Store / Google Play storefront tiers — automatic. MENA tier matches ~200 EGP/mo for Pro (Apple/Google auto-adjust).

Free tier has no product; it's the default when no entitlement is active.

### 9.2 Feature gate table

| Feature | Free | Pro | Premium |
|---|---|---|---|
| Analyses / month | 3 | 50 | 150 |
| Top-N gaps per analysis | 3 | all | all |
| PDF export | ✅ (watermark) | ✅ | ✅ |
| Markdown / DOCX export | — | ✅ | ✅ |
| Zotero sync | — | ✅ | ✅ |
| Gap detail — full evidence | — | ✅ | ✅ |
| Library filters + search | limited | ✅ | ✅ |
| Contradiction + intersection techniques | — | ✅ | ✅ |
| Geographic / demographic audit | — | ✅ | ✅ |
| Advisor-complement mode | — | — | ✅ |
| Proposal upload + critique | — | — | ✅ |
| Priority queue (analyses run faster) | — | — | ✅ |
| Early-access feature flags | — | — | ✅ |

### 9.3 Client wiring

```ts
// lacunose/lib/billing/revenuecat.ts
import Purchases from 'react-native-purchases';

export async function initBilling(userId: string) {
  Purchases.configure({ apiKey: Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY, appUserID: userId });
  Purchases.addCustomerInfoUpdateListener(ci => {
    // mirror to zustand store; drives UI feature-gating
    setEntitlement(ci.entitlements.active);
  });
}

export async function presentPaywall() {
  const offering = await Purchases.getOfferings();
  // render our own custom paywall (UpgradeSheet component) — more on-brand than RC's UI
  return offering.current;
}
```

### 9.4 Server wiring (RevenueCat webhook)

RevenueCat → `POST https://fn.lacunose.com/v1/webhooks/revenuecat` with an auth token we verify via HMAC. Handler upserts the `subscriptions` row. Event types handled: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`. All other events are logged and ignored.

On every analysis creation, the edge fn reads `subscriptions.tier` (not the client-claimed entitlement) to decide the monthly cap. **Never trust the client for entitlements.**

### 9.5 Apple / Google compliance gotchas

- Apple requires in-app "Restore Purchases" — exposed in settings.
- Apple requires in-app account deletion — `/v1/account/delete` cascades everything via Postgres `ON DELETE CASCADE`.
- Google Play requires data-safety form declaring every category of data we collect (email via auth; usage analytics via PostHog; crash data via Sentry; purchase data via RevenueCat).
- Both require a public privacy policy ([lacunose/app/privacy.tsx](lacunose/app/privacy.tsx) already exists — must mirror to a public URL, `lacunose.com/privacy`).

---

## 10. PostHog — first-week retention + feature-use analytics

The user's north-star dashboard.

### 10.1 Setup

Cloud PostHog (EU region for GDPR). `posthog-react-native` SDK wired in the root layout. Identification with the Supabase user ID.

```ts
// lacunose/lib/analytics/posthog.ts
import PostHog from 'posthog-react-native';
export const posthog = new PostHog(POSTHOG_KEY, {
  host: 'https://eu.posthog.com',
  captureAppLifecycleEvents: true,
  enableSessionReplay: true,        // with auto-masking of sensitive fields
});
export function identify(userId: string, props: Record<string, unknown>) {
  posthog.identify(userId, { ...props, platform: Platform.OS });
}
```

Session replay is default-on with masked inputs. Users can opt out in settings — required for Apple approval in some regions.

### 10.2 Event taxonomy (the canonical list)

All events are snake_case. All use the same property bag: `{ user_id, tier, platform, app_version, field?, analysis_id?, gap_id?, ab_variant? }`.

**Onboarding funnel**
- `app_opened` (first time / returning)
- `onboarding_started`
- `onboarding_step_a_completed` (topic picker)
- `onboarding_step_b_completed` (structured frame confirmed)
- `onboarding_step_c_completed` (live analysis watched)
- `onboarding_step_reveal_shown` (the teaser paywall)
- `signup_submitted` (`method`: google|apple|email)
- `signup_completed`
- `signin_completed`

**Core loop**
- `analysis_submitted` (`field`, `topic_length_chars`, `used_filters`)
- `analysis_running_viewed` (time the user actually watches the stream)
- `first_gap_rendered` (wall-clock latency from submit)
- `all_gaps_rendered` (full set in)
- `gap_expanded` (user tapped to see evidence)
- `evidence_quote_tapped` (user clicked through to a paper)
- `gap_saved`
- `analysis_completed_view` (user scrolled to end)
- `export_requested` (`format`: pdf|md|zotero)
- `export_completed`

**Monetization**
- `paywall_shown` (`trigger`: onboarding_reveal|quota_exhausted|locked_feature|upgrade_tapped)
- `paywall_purchase_started` (`sku`)
- `paywall_purchase_completed` (`sku`, `revenue_cents`, `currency`)
- `paywall_dismissed` (`dwell_sec`)
- `restore_purchases_tapped`

**Feature-touch tracking** (used for the Feature-Use-by-Day dashboard)
- `tab_home_viewed`, `tab_library_viewed`, `tab_analyze_viewed`, `tab_me_viewed`
- `library_filter_applied` (`filter`)
- `library_item_opened`
- `settings_opened`
- `notifications_enabled` / `notifications_disabled`

**Lifecycle**
- `session_started`, `session_ended` (auto by SDK)
- `day_n_return` (fired by a daily local notification check: n = 1,3,7,14,30)

### 10.3 The three dashboards Seif watches daily

**Dashboard 1 — First-week retention**
- Cohort by signup week.
- D1, D3, D7 return rates (line chart, week-over-week).
- Breakdown by acquisition source (utm / RC attribution).
- Breakdown by field (did a CS user retain differently than a biomed user?).
- Goal: **D7 retention ≥ 25%** for the activated cohort (defined as users who completed ≥ 1 analysis).

**Dashboard 2 — Feature-use-by-day**
- For each core feature (analyze, library, gap_expanded, evidence_tapped, export, save) plot *% of users who touched this feature by day N after signup*.
- Identifies which features drive retention (feature X adopted by day 3 → 2× D7 retention = X is a keystone feature).
- Drives what we promote in onboarding and push-notification hooks.

**Dashboard 3 — Monetization funnel**
- `signup_completed` → `analysis_submitted` (first-analysis) → `paywall_shown` → `paywall_purchase_completed`.
- Conversion rate at each step, by field, by trigger.
- Time-to-first-paid: median days from signup to purchase.

### 10.4 Feature flags (via PostHog)

- `gap_engine_v2` — new ranker weights, 10% rollout
- `contradiction_detection_enabled` — gate a technique behind Pro
- `experimental_fields` — law / humanities, 20% rollout
- `onboarding_variant_b` — A/B different copy on the reveal paywall

The app checks flags on launch and again when foregrounded. Server also reads flags via PostHog's server SDK for experiments that affect what the backend does (e.g. which gap techniques run).

---

## 11. Sentry

Cloud Sentry. One org, two projects: `lacunose-mobile` and `lacunose-backend`.

### 11.1 Mobile

```ts
// lacunose/app/_layout.tsx
import * as Sentry from '@sentry/react-native';
Sentry.init({
  dsn: SENTRY_DSN_MOBILE,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  enableAutoSessionTracking: true,
  integrations: [new Sentry.ReactNativeTracing({ routingInstrumentation: expoRouterInstrumentation })],
});
```

PII scrubbing: email addresses masked. Supabase user ID used as `sentry.setUser({ id })`.

### 11.2 Backend

Every PM2 app initializes Sentry in `src/lib/sentry.ts`. BullMQ jobs wrap handler in `Sentry.startTransaction`. LLM calls add breadcrumbs with token counts. Edge-fn Fastify registers the Sentry error handler.

### 11.3 Alerts

- Any uncaught error in `worker-gap` → Slack alert.
- p95 analysis latency > 120s over 10 min → Slack alert.
- Error rate ≥ 2% of mobile sessions → alert.
- RevenueCat webhook failure → alert.

---

## 12. Mobile app — aligned with the current repo

The repo at [lacunose/](lacunose/) is TypeScript-strict with Expo Router and the `RGF` theme object. **Do not rebrand the code** — just rename `RGF` → `LNS` (or keep `RGF`; it's internal) and extend it. The ultraplan's mobile plan assumes this exact codebase.

### 12.1 Existing structure (what to keep)

- [lacunose/app/_layout.tsx](lacunose/app/_layout.tsx) — root stack, explicit screens
- [lacunose/app/(tabs)/_layout.tsx](lacunose/app/(tabs)/_layout.tsx) — `FloatingNav` floating pill bar
- [lacunose/app/(tabs)/home.tsx](lacunose/app/(tabs)/home.tsx), [library.tsx](lacunose/app/(tabs)/library.tsx), [analyze.tsx](lacunose/app/(tabs)/analyze.tsx), [me.tsx](lacunose/app/(tabs)/me.tsx)
- [lacunose/app/analyze/](lacunose/app/analyze/) — results + detail (to be hardened)
- [lacunose/components/Shared.tsx](lacunose/components/Shared.tsx) — `Icon`, `BlackPill`, `ChipIcon`, `ScoreDial`, `CategoryPill`
- [lacunose/constants/theme.ts](lacunose/constants/theme.ts) — `RGF` tokens

### 12.2 What to add

```
lacunose/
├── lib/
│   ├── supabase.ts                     # createClient with URL=https://api.lacunose.com
│   ├── billing/
│   │   ├── revenuecat.ts
│   │   └── paywall.ts                  # useEntitlement() hook
│   ├── analytics/
│   │   ├── posthog.ts
│   │   └── events.ts                   # type-safe event emitters
│   ├── sentry.ts
│   ├── api/
│   │   ├── analyses.ts                 # createAnalysis, listAnalyses, getAnalysis
│   │   ├── gaps.ts                     # subscribeToGaps (Realtime), toggleSave
│   │   └── export.ts
│   ├── mocks/
│   │   ├── mockAnalyses.ts             # field-agnostic mock data across ≥6 fields
│   │   ├── mockStream.ts
│   │   └── index.ts                    # toggled by EXPO_PUBLIC_USE_MOCKS
│   ├── llm/                            # client-side LLM is NOT used in v1; placeholder
│   ├── fields/                         # field catalog + adapter metadata (mirrors backend)
│   │   └── index.ts
│   └── store.ts                        # zustand: auth, entitlement, feature flags
├── hooks/
│   ├── useAuth.ts
│   ├── useAnalysis.ts                  # TanStack Query
│   ├── useGapStream.ts                 # Realtime subscription
│   ├── useEntitlement.ts               # reads from RC + cached server truth
│   └── usePostHog.ts
└── components/
    ├── GapCard.tsx                     # extracted from Shared for the hero polish
    ├── EvidenceQuote.tsx
    ├── StreamingStatus.tsx
    ├── AnalysisCard.tsx
    ├── UpgradeSheet.tsx                # our paywall (not RC's UI)
    ├── FieldPicker.tsx                 # dropdown with field catalogue
    ├── StructuredFrameEditor.tsx       # PICO/PECO/task-dataset-method/etc. editor
    └── FilterRow.tsx
```

### 12.3 Screens (12 screens to ship)

1. `index.tsx` — get-started landing (exists).
2. `onboarding.tsx` — 4-step flow (topic → field → live stream → reveal paywall). Must be field-aware: let the user pick any field, not just medical.
3. `sign-up.tsx`, `sign-in.tsx` — Google + Apple + Email (exist).
4. `(tabs)/home.tsx` — dashboard: recent analyses, CTA.
5. `(tabs)/analyze.tsx` — field picker + topic input + structured-frame auto-fill + filter row + "Find gaps" CTA.
6. `(tabs)/library.tsx` — 2-col grid of saved analyses, filter chips.
7. `(tabs)/me.tsx` — profile, usage bar, tier, upgrade CTA, sign-out.
8. `analyze/results.tsx` — streaming results (hero screen).
9. `analyze/detail.tsx` — gap detail with ScoreBig, evidence, method card.
10. `paywall.tsx` (modal) — RevenueCat paywall in our design.
11. `notifications.tsx` — notification settings.
12. `privacy.tsx`, `terms.tsx` — legal (exist).

All screens support the existing `RGF` theme and FloatingNav. The structured-frame editor changes its schema based on the selected field (PICO for biomed, task/dataset/method/metric for CS, etc.).

### 12.4 Realtime streaming pattern

```ts
// hooks/useGapStream.ts
export function useGapStream(analysisId: string) {
  const [gaps, setGaps] = useState<GapItem[]>([]);
  useEffect(() => {
    const channel = supabase.channel(`analysis:${analysisId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gap_items',
          filter: `analysis_id=eq.${analysisId}` },
        ({ new: g }) => setGaps(prev => insertSorted(prev, g, 'rank'))
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [analysisId]);
  return gaps;
}
```

The `StreamingStatus` component in parallel listens to `gap_analyses` row updates (status transitions queued → running → done) and to a side channel `analysis:${id}:progress` published from the worker via `pg_notify`.

### 12.5 Mock mode (weeks 1–5)

`EXPO_PUBLIC_USE_MOCKS=true` in dev. Mocks simulate the full stream, produce gaps across multiple fields (biomed, CS, humanities, econ), and let every screen be testable without backend. This gates nothing — the flag flips off in production builds.

---

## 13. Evaluation — across fields

No public "gap benchmark" exists. We build one per field.

### 13.1 Field-spanning gold set

- **6 fields** to start: biomedicine, CS/ML, economics, psychology, physics, education.
- **3 topics per field** = 18 topics.
- **3 expert labellers per field** (recruited from Seif's network and via paid Upwork for fields outside his reach, ~$100/expert for 3 topics).
- Each expert lists 5–10 gaps they know from their field per topic = ~270 gold gaps total.
- Stored in `evals/gold/<field>/<topic>.json`.

### 13.2 Metrics

- **Precision@10**: fraction of top-10 gaps judged valid by a blinded second expert.
- **Recall**: fraction of expert-labeled gaps that the system produces (semantic match via embedding cosine ≥ 0.75).
- **Cohen's κ**: inter-rater agreement.
- **Hallucination rate**: % of gaps dropped by the verbatim-quote guardrail or the critique model.
- **Cross-field consistency**: is precision@10 within ±0.1 across fields? If not, the prompts are biased toward the domain they were written in.

### 13.3 Launch gates

- Precision@10 ≥ 0.6 in every field we claim to support.
- Hallucination rate ≤ 5% across fields.
- p95 latency ≤ 90 s per analysis.
- DeepSeek parity: precision@10 within 10% of Opus on the same topics (validates the swap).

---

## 14. Security, privacy, ops

### 14.1 Secrets

- `.env` file on VPS, mode 600, owned by the deploy user.
- Mobile secrets injected at build time via EAS env vars, scoped per `eas.json` profile (dev / preview / prod).
- No secrets in git. Pre-commit hook scans for AWS/Anthropic key patterns (add to stream C's infra repo).

### 14.2 RLS

All user-owned tables have `enable row level security` + `auth.uid() = user_id` policies (see §8). Shared corpus tables (`papers`, etc.) have `select` policies for any authenticated user.

### 14.3 Backups

Nightly `pg_dump --format=custom --compress=9` to Hostinger Object Storage. 30-day retention. Monthly test restore into a throwaway docker Postgres to verify dump integrity. Script in `infra/scripts/backup-db.sh`.

### 14.4 Firewall + hardening

- `ufw`: 22 (SSH, key-only), 80, 443 only.
- SSH: password auth off, fail2ban on, root login disabled, keys rotated every 90 days.
- Docker daemon: no TCP socket, Unix socket only.
- Automatic security updates via `unattended-upgrades` with reboot window at 4 AM UTC Sunday.
- Postgres: `listen_addresses='127.0.0.1'` only (not exposed beyond the docker network).

### 14.5 Data handling

- We **store abstracts + sections + metadata**. We **do not redistribute full PDFs** — link out.
- Users can export their data (`GET /v1/account/export`, returns zipped JSON) and delete their account (`POST /v1/account/delete`), per GDPR and Apple guidelines.
- Abstracts under OpenAlex CC0 — safe to store. S2 TLDRs: metadata-style, safe to cache. PubMed abstracts: US gov, public domain. arXiv abstracts: arXiv license allows mirror with attribution.
- Attribution visible in the app: "Powered by OpenAlex, Semantic Scholar, PubMed, Europe PMC, arXiv, Crossref, Unpaywall."

---

## 15. Hackathon demo plan (Cerebral Valley Built with 4.7)

### 15.1 The 60-second pitch

> *"Every researcher — in any field — spends months looking for where they can contribute something new. Lacunose does it in 45 seconds. Behind it is Claude Opus 4.7 running a 51-call parallel map-reduce pipeline: one reasoner, all the evidence, grounded to verbatim quotes. Watch."* \[tap analyze → gaps stream in\] *"Biomed, CS, humanities — the same engine, any field, production-ready, monetized through App Store and Play Store. This is what 4.7 unlocks."*

### 15.2 Demo setup

- Pre-seed corpus for 3 topics across 3 fields (CAR-T, transformer-efficiency, climate-adaptation-in-agriculture) so we never hit a cold-start API delay.
- `LLM_PROVIDER=anthropic-allopus` for the demo — every call is Opus 4.7.
- Live streaming UI with the terminal-style progress overlay from onboarding C shown as each stage fires.
- Fallback: pre-recorded 45s video on a tablet if Wi-Fi is hostile.

### 15.3 What the judges see of Opus 4.7

- A side panel toggle ("Show the model's reasoning") that surfaces the Opus reduce-stage response for each cluster — this is literally the 4.7 reasoning chain, with evidence citations. Nothing wins a "Built with 4.7" judging pod faster than showing the model reasoning.
- A ledger in settings: "Tokens processed by Claude Opus 4.7 this session: N." Gratuitous, but effective.

### 15.4 Submission materials

- 2-minute demo video (streaming UI + reasoning panel + swap-to-DeepSeek teaser at the end).
- README with the architecture diagram from §3.1.
- "Why Opus 4.7" writeup: the 1M context enables the few-shot library we ship with each synth call (~30K tokens of examples pinned via `cache_control`) plus full sections from 30 reranked papers plus tool-use for the evidence-grounding tool — other models can't hold that.

---

## 16. Parallel dev strategy — Claude Code orchestration

The user also wants the *development* parallelized, ideally with small-context-window-friendly task units (because a post-launch pass may use DeepSeek-based coding tools). Mapping to the six work-streams (§5.4):

### 16.1 Kickoff week (week 0)

Before any stream forks:
1. Define shared types package `packages/types/` (TypeScript) — `Paper`, `Section`, `Embedding`, `GapItem`, `GapAnalysis`, `AnalysisJob`, `FieldAdapter`. 1-day task.
2. Commit schema migrations `0001_init.sql`. 1-day task.
3. Commit LLM unified interface contract (`llm/types.ts` + `llm/index.ts` stubs). 1-day task.

Only after those three are merged do streams fork. Each stream gets its own git worktree (`Agent … isolation: worktree`) so nothing blocks anything.

### 16.2 Stream charter template

Each of the six agents gets a brief like:

> "You own stream D (backend edge-fn + schema). Boundaries: you import from `packages/types` and emit nothing from outside `lacunose-backend/src/edge/` and `lacunose-backend/supabase/`. Stream E owns ingestion; if you need the ingest queue shape, read its `types.ts` — don't modify it. Produce these artifacts by end of week N: \[list\]. Open a PR to main when each artifact passes its tests. Do not touch files outside your boundary."

### 16.3 Merge cadence

Daily merge window at 17:00 local. Each stream PRs its day's work. Seif reviews, merges in an order that respects dependencies (types → backend → workers → mobile client wiring). If a stream is blocked on another's type change, it stops and opens a "type change request" PR against `packages/types`.

### 16.4 Why this matters for small-context models

When we later run maintenance / feature work with a DeepSeek-backed coding agent (128K context), each stream's code fits comfortably in context. A monorepo-wide task ("add feature X everywhere") would blow context; a stream-scoped task ("add feature X in stream F only, here's the interface contract") fits. The parallel-dev structure is forward-compatible with small-context AI-pair-programming.

---

## 17. Execution timeline

Not "MVP then later" — it's "full app base, sequenced". Designed for Seif + 1 contract engineer + 6 Claude Code agents over 14 weeks.

| Week | Streams active | Deliverable |
|---|---|---|
| **0** | — | Shared types, schema migration, LLM interface contract, EAS + VPS provisioned, cloud accounts (Sentry, PostHog EU, RevenueCat, Anthropic, DeepSeek, Cohere) |
| **1** | A, B, C | Expo app theme + nav extended to full field picker; Supabase client + RC + PostHog + Sentry wired (against mocks); docker-compose bringing up self-hosted Supabase on VPS |
| **2** | A, B, C, D | All 12 screens scaffolded with mocks across 6 fields; migrations applied; edge-fn skeleton + PM2 ecosystem file; Caddy HTTPS on `api.lacunose.com` |
| **3** | A, B, E | `GapCard` + streaming screen hero polish across all 8 categories; TanStack Query hooks finalized; OpenAlex + Semantic Scholar + Crossref adapters end-to-end |
| **4** | A, E, F | Structured-frame editor per field; PubMed + Europe PMC + arXiv adapters + dedupe; LLM router + Anthropic adapter + Redis cache layer |
| **5** | A, D, E, F | Onboarding + paywall reveal flow polished; edge-fn routes complete (analyses-create, export, webhooks); GROBID orchestration; parse worker isolating `limitations`/`future_work` |
| **6** | E, F | Embeddings pipeline (S2 cached + ONNX fallback); hybrid retrieval (pgvector + FTS) + Cohere rerank; first end-to-end test corpus → reranked top-30 |
| **7** | F | Gap engine Map phase (per-paper signal extraction); Cluster phase (HDBSCAN); first real gaps flowing through |
| **8** | F | Gap engine Reduce phase (per-cluster synthesis with caching); Critique phase + verbatim guardrail; Ranker |
| **9** | B, D, F | Wire mobile to real backend; swap `EXPO_PUBLIC_USE_MOCKS=false`; Realtime subscription end-to-end; first hallucination-audited end-to-end run |
| **10** | A, B, D | RevenueCat subscriptions live in sandbox; all PostHog events emitting; Sentry dogfooded on errors; feature flags rolled out |
| **11** | F | Add all 8 gap categories (contradiction NLI, geographic NER, intersection detection, methodology distribution, temporal velocity) — the "full base" catch-up from the MVP 3 |
| **12** | all | Eval set: 6 fields × 3 topics × 3 experts; run `evals/run.ts`; iterate until precision@10 ≥ 0.6 in every field; DeepSeek parity test |
| **13** | all | Hardening: error states, retry flows, account delete, Apple/Google compliance checklist, privacy policy published |
| **14** | — | Hackathon submission + TestFlight + Play Internal Test + 50-user beta |

**Post-hackathon (week 15+):** flip `LLM_PROVIDER=deepseek`, re-run the eval set, iterate, open to worldwide launch. Expected COGS drop: ~50×.

---

## 18. Cost model

### 18.1 Fixed monthly

| Item | Monthly |
|---|---|
| Hostinger KVM4 VPS | $10 |
| Hostinger Object Storage (backups, ~50 GB) | $2 |
| Zoho Mail (business + SMTP relay) | $1 |
| Domain (lacunose.com, amortized) | $1 |
| Sentry (team plan, 50K events) | $26 |
| PostHog EU cloud (1M events free tier initially) | $0 |
| RevenueCat (free up to $10K MTR) | $0 |
| Apple Developer | $8 |
| Google Play Console (one-time $25, amortized 12 mo) | $2 |
| **Fixed total** | **~$50/mo** |

### 18.2 Variable per-analysis (LLM + rerank)

**Hackathon mode (`anthropic-allopus`):**
- Opus 4.7 map: 30 calls × ~3K in / 500 out = ~$3.00 / analysis
- Opus 4.7 synth: 6 calls × 15K in / 2K out (with caching: 80% hit rate) = ~$1.20 / analysis
- Opus 4.7 critique: 15 calls × 1K in / 200 out = ~$0.40 / analysis
- Cohere rerank: ~$0.02 / analysis
- Embeddings: ~$0.01 (mostly cached via S2)
- **Total: ~$4.65 / analysis** — fine for hackathon credits; unacceptable for scale.

**Hackathon mode (production split `anthropic`):** Haiku for map/critique, Opus only for synth:
- Haiku map: ~$0.10
- Opus synth: ~$1.20
- Haiku critique: ~$0.05
- Cohere: ~$0.02
- **Total: ~$1.40 / analysis** — usable.

**Post-hackathon (`deepseek`):**
- DeepSeek V3.2 map: ~$0.01
- DeepSeek V4 synth: ~$0.03
- DeepSeek V3.2 critique: ~$0.01
- Cohere: ~$0.02
- **Total: ~$0.07 / analysis** — dream economics.

### 18.3 Break-even math

Pro at $19.99/mo, 50 analyses cap, ~15 analyses/mo average actual:
- Hackathon pricing: 15 × $1.40 = $21 COGS — loss-making on an average Pro user.
- DeepSeek pricing: 15 × $0.07 = $1.05 COGS — 95% gross margin.

Hence the swap. Hackathon demo runs on free Anthropic credits; production runs on DeepSeek.

---

## 19. Risks + mitigations

| Risk | Mitigation |
|---|---|
| **DeepSeek gap-quality cliff vs. Opus** | Eval parity test gated in the launch checklist (§13.3). If DeepSeek falls >10%, stay on Anthropic + Haiku blend (§18.2), still usable at scale with Pro pricing. |
| **KVM4 memory pressure (esp. GROBID)** | §6.4 fallback path. Also `ufw`-monitored alerts on RAM > 80%. Upgrade to KVM8 is in-place. |
| **Apple rejects IAP for not using RevenueCat paywall UI** | Our custom paywall is fine — Apple only mandates that purchases go through IAP APIs, which RC does for us. Include restore-purchases + delete-account from day one. |
| **RevenueCat webhook downtime** | We also poll `Purchases.getCustomerInfo()` on app foreground and mirror to server as a belt-and-braces. |
| **Data source rate limits / bans** | Token buckets in Redis per source; polite user-agents with mailto; exponential backoff; Sentry alert on ≥5 consecutive 429s. |
| **Field-bias in prompts** | 6-field eval set; cross-field precision consistency gate (§13.3). Prompts use the field adapter's `promptHints` so each field gets its own system prompt + few-shot set. |
| **Hackathon Wi-Fi failure** | Pre-recorded demo video fallback. Pre-seeded corpus so no live API calls needed. |
| **Single-point-of-failure VPS** | Nightly encrypted backups to object storage. Spin-up playbook: `infra/scripts/provision-vps.sh` boots a fresh KVM4 to running state in <30 min from a cold backup. |
| **Seif burning out** | Six parallel Claude Code agents own the dependency bottlenecks. Seif's role is reviewer + integrator + eval-set curator — not sole implementer. |

---

## 20. Open questions — before I write more code

These don't block writing this plan, but I want clear answers before phase 1 starts. In auto mode I proceed with the best-default answer unless you say otherwise.

1. **Brand**: Lacunose (matches domain) — **defaulting to yes**. Say "call it Lacuna instead" if you want the old brand name back.
2. **Regional pricing strategy**: Apple/Google auto-storefront tiers, or manual per-region tiers (e.g. explicit 200 EGP MENA tier)? **Defaulting to auto-storefront** — simpler, still captures the MENA discount via purchasing-power-parity tiers.
3. **Session replay in PostHog**: default on with masking, or opt-in? **Defaulting to opt-in** — Apple privacy guidelines + it's the least-surprising default. We surface the toggle on the Me screen.
4. **Android MVP or iOS-first?** EAS builds both; App Store review is slower. **Defaulting to both simultaneously.**
5. **Arabic RTL support**: in scope for this build or v1.1? Original plan deferred it. **Defaulting to v1.1** unless you say otherwise — it's a 1-week language+RTL pass best done after English UX is stable.
6. **Expert evaluators outside biomed**: Seif's network covers biomed; who covers CS/econ/humanities/physics/psychology gold-set labels? **Defaulting to paid labellers via Upwork / Polymarket / Prolific at ~$100 per expert-topic-day, capped at $1,800 total.**
7. **How much of the old `implementation-plan.md` do you want preserved inline**? **Defaulting to: this doc supersedes it but we keep the old file as historical context.**
8. **Hackathon submission date** — I haven't looked this up. If it's <14 weeks out, we need to collapse streams (skip advanced gap categories, ship with 4 of 8 to hit the demo date). Tell me the deadline and I'll re-time the plan.

---

## Appendix A. Env var reference

```
# LLM
LLM_PROVIDER=anthropic|anthropic-allopus|deepseek|mock
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
COHERE_API_KEY=

# Supabase (self-hosted)
SUPABASE_URL=https://api.lacunose.com
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
POSTGRES_URL=postgres://…@localhost:5432/postgres

# Queue / cache
REDIS_URL=redis://localhost:6379

# PDF
PDF_PARSER=grobid|pymupdf
GROBID_URL=http://grobid.lacunose.internal:8070

# Data sources
PUBMED_API_KEY=
SEMANTIC_SCHOLAR_API_KEY=
POLITE_EMAIL=hello@lacunose.com

# Billing
REVENUECAT_SECRET_KEY=
REVENUECAT_WEBHOOK_TOKEN=

# Observability
SENTRY_DSN_MOBILE=
SENTRY_DSN_BACKEND=
POSTHOG_HOST=https://eu.posthog.com
POSTHOG_KEY_MOBILE=
POSTHOG_KEY_SERVER=

# Expo / mobile (EAS-only)
EXPO_PUBLIC_SUPABASE_URL=https://api.lacunose.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_REVENUECAT_IOS=
EXPO_PUBLIC_REVENUECAT_ANDROID=
EXPO_PUBLIC_USE_MOCKS=false
```

## Appendix B. File layout summary

```
lacunose.com/                                      ← this repo (workspace root)
├── lacunose/                                      ← Expo app (TS, existing)
│   ├── app/                                       ← existing routes + additions per §12.3
│   ├── components/
│   ├── constants/theme.ts                         ← RGF tokens (keep)
│   ├── lib/                                       ← per §12.2
│   ├── hooks/
│   └── …
├── lacunose-backend/                              ← new (Node 20 + TS)
│   ├── src/
│   │   ├── edge/                                  ← Fastify routes (stream D)
│   │   ├── workers/                               ← BullMQ workers (streams E + F)
│   │   ├── ingest/                                ← adapters (stream E)
│   │   ├── enrich/                                ← parse + embed (stream E)
│   │   ├── gap/                                   ← techniques (stream F)
│   │   ├── llm/                                   ← provider-agnostic layer (stream F)
│   │   └── lib/                                   ← supabase admin, sentry, logger
│   ├── supabase/
│   │   └── migrations/0001_init.sql
│   ├── infra/
│   │   ├── docker-compose.yml
│   │   ├── Caddyfile
│   │   ├── ecosystem.config.cjs                   ← PM2
│   │   └── scripts/
│   ├── evals/
│   │   ├── gold/<field>/<topic>.json
│   │   └── run.ts
│   └── packages/
│       └── types/                                 ← shared TS types (consumed by mobile + backend)
├── research gap finder (3)/                       ← design mockups (reference only — unchanged)
├── implementation-plan.md                         ← historical context
├── ultraplan.md                                   ← THIS DOC
└── CLAUDE.md
```

---

*End of ultraplan. Grill me on §20's defaults, confirm the hackathon deadline, and I'll fork the six Claude Code streams and start shipping.*
