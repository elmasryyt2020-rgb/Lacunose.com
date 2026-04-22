# Lacunose — Post-Hackathon Roadmap

Written 2026-04-22. Lives at repo root so future-me can find it quickly.

---

## Context to load before touching any of this

- Read [CLAUDE.md](CLAUDE.md) first — that's the always-current project context.
- **Current shipping stack** (as of hackathon): Opus 4.7 everywhere (`LLM_PROVIDER=anthropic-allopus`), abstracts-only corpus, ~$3/analysis, 2-8 gaps per run.
- **The expert-quality target** (from a 2026-04-22 conversation with Seif): a senior researcher reading 200 papers deeply over 2 months produces ~5-15 novel gaps with tacit knowledge. We can get to ~70% of that on **corpus info volume** with full-text + DeepSeek, in 10 min for ~$1. The remaining 30% is judgment/tacit — see "Judgment layer" below.
- **Legal constraint** decided by Seif: no Sci-Hub, no Anna's Archive, no LibGen integration — the commercial + App Store risk is un-insurable.

---

## Priority 1 — Paywall full-text mode (v1.1, 2-day project)

### Goal

Gate full-text ingestion behind the **Premium** tier. Free + Pro stay on abstracts-only (current behavior). Premium gets 5-10× richer gap quality for the same topic because per-paper signal goes from 150 tokens (abstract) to 5,000 tokens (full text).

### Why gate behind Premium (Seif's decision)

- Full-text mode costs ~$1/analysis with DeepSeek, but ~$120/analysis on Opus. Gating behind Premium makes the expensive path opt-in and also gives Premium a real feature differentiator (currently Premium only has more quota, which is a weak pitch).
- Creates a natural funnel: Free shows 3 gaps → Pro shows 8 gaps → Premium shows 15 gaps with deeper evidence.

### Adapters to add

Add these in order of cost/benefit:

**(1) CORE.ac.uk adapter** — new file `src/ingest/adapters/core.ts`
- API docs: https://api.core.ac.uk/docs/v3
- Free tier: 10k req/day (enough for hackathon-scale; enterprise for later)
- Register at: https://core.ac.uk/services/api
- Endpoint: `GET https://api.core.ac.uk/v3/search/works?q=...&limit=100`
- Returns 250M+ OA papers. Especially strong for humanities, social sci, non-Elsevier science.
- Follow existing adapter pattern (see `semanticScholar.ts` for template).
- Add to ingestion source order AFTER openalex, BEFORE s2.

**(2) Preprint-matching adapter** — extend `src/enrich/` with a matcher
- For every paper with a DOI but no `full_text_url`, look up the same paper on arXiv / bioRxiv / medRxiv / SSRN by (title + first-author-lastname + year).
- arXiv API: `http://export.arxiv.org/api/query?search_query=ti:"<title>"+AND+au:<author>`
- bioRxiv: `https://api.biorxiv.org/details/biorxiv/<doi>` (first try DOI lookup before title matching)
- If match found, set `full_text_url` to the preprint PDF URL.
- Run as a post-ingest enrichment step, NOT inline (don't block ingest on this).
- Expected hit rate: 80% STEM post-2018, 30-40% overall.

**(3) Unpaywall polish**
- Already integrated. Verify we're using `best_oa_location.url_for_pdf` field, not `url_for_landing_page` (landing pages are HTML paywalls).
- Ensure we're passing the email via `?email=support@lacunose.com` query param (required by TOS, gets us higher rate limits).

### Full-text parse pipeline changes

Current `worker-parse` uses PyMuPDF subprocess and outputs `paper_sections.text` rows. Changes needed:

- **Section caps**: limit `paper_sections.text` to 10,000 chars per section (currently unbounded). Extremely long sections (>10k) get truncated to the introduction + conclusion. Reason: Opus/DeepSeek context windows are huge but per-call quality degrades with massive sections.
- **Section-type classification**: currently every section gets `kind='body'`. Add a classifier (simple heuristics: header regex for "Introduction", "Methods", "Results", "Discussion", "Conclusion", "Limitations"). Limitations-heavy sections get prioritized in the map phase — that's where the best gap signals live.
- **PDF extraction hardening**: `isLikelyPaywall()` (added 2026-04-22, see `src/workers/ingest.ts`) — extend this list as we discover new publisher landing-page patterns. Empirically observed-useless hosts so far: NEJM, Lancet, JAMA, Blood, JCO, Elsevier, Springer, Wiley, ASH.

### Retrieval widening

`src/retrieval/hybrid.ts` currently retrieves top-30 sections. With full-text mode, we have 10-50× more sections per paper (5k chars → ~3-5 sections per paper). Change:

- **Free/Pro**: top-30 sections (current)
- **Premium**: top-200 sections
- This drives per-analysis cost; with DeepSeek this is ~$0.80 extra per premium run

### LLM layer

**Swap to DeepSeek for Premium full-text** to make the cost work:

- Current: `LLM_PROVIDER=anthropic-allopus` for everyone
- Target: route per-tier in `src/llm/router.ts`:
  - Free/Pro: `anthropic` (Haiku map + Opus reduce/critique, existing mix)
  - Premium: `deepseek` for map (cheap high-volume), `anthropic` Opus 4.7 for reduce/critique (best quality synthesis on the few surviving candidates)
- This hybrid approach keeps the "Built with 4.7" story for hackathon judging of the Premium tier while also having the volume-processing power of DeepSeek for map.

### Judgment layer (closing the expert gap)

Raw volume + OK prompts gets to ~70% of expert quality. The last 30% is judgment. Ideas:

- **Author h-index as ranking signal**: we already have `authors` with names + ORCIDs from S2. Add a lookup to OpenAlex's author API to get h-index per author. Weight high-h-index authors more in the retrieval ranker.
- **Venue prestige**: use CiteScore/JIF per venue as a multiplier in the rank phase (Nature/NEJM paper carries more signal than a predatory-journal paper). OpenAlex has this via `source.h_index`.
- **"Final judgment" Opus pass**: after rank, do one more Opus 4.7 call with all surviving gaps + the topic, asking "which 3 of these are most novel?" and promote those 3 to the top. Adds $0.05 per analysis, big quality win.
- **Contradiction cross-referencing**: when two gaps reference the same papers but disagree, elevate both and flag the disagreement visually. Currently critique drops these.

### Verification after shipping

- Manual eval: 5 topics (one per cluster: life sci, phys sci, social sci, humanities, CS) × run Free / Pro / Premium → 15 total analyses → have Seif rank-order output quality. Premium should clearly win.
- Automated eval: reuse the `evals/` directory if it exists; write gap-quality checks (verbatim quotes match source, no generic "more research needed", evidence count ≥ 2 per gap).
- Cost eval: log `costUsd` per tier, confirm Premium < $1.50, Pro < $0.50, Free < $0.20.

---

## Priority 2 — ORCID integration (v1.1 minor)

Currently hidden in the Me screen ([app/(tabs)/me.tsx](lacunose/app/(tabs)/me.tsx) line 205, commented out — search for "ORCID Integration — hidden for hackathon").

### Steps

1. Register OAuth app at https://orcid.org/developer-tools (free, instant)
2. Backend endpoint `POST /v1/orcid/exchange` — receives ORCID auth code, swaps for ORCID iD via ORCID's public token endpoint, stores in `auth.users.user_metadata.orcid_id`
3. Mobile: use `expo-auth-session`. Flow:
   - User taps "Connect ORCID" → opens in-app browser to `https://orcid.org/oauth/authorize?...`
   - Auth success → redirects to `lacunose://orcid?code=...`
   - Mobile POSTs code to backend `/v1/orcid/exchange`
4. Uncomment the ORCID row in me.tsx
5. Show connected ORCID in profile view (formatted as `0000-0002-1825-0097`)

### Use cases

- Filter analyses by "papers where I'm an author" (requires matching ORCID in Author records — already normalized in our schema via `authors: [{ name, orcid }]`)
- Pre-fill author attribution on exported reports
- Verification badge in support chat ("verified researcher")

---

## Priority 2.5 — `.edu` email verification + institutional discount hook

Clarification written 2026-04-22 after Seif asked about "institutional access via .edu affiliation" and whether we'd use his personal credentials to scrape publisher sites.

### What this is NOT

**NOT** individual-user institutional SSO. We will never:
- Use a single user's credentials to scrape publisher sites for other users (illegal, detectable, will get the account banned, violates every university AUP)
- Build per-user Shibboleth/SAML/OpenAthens federated auth into the mobile app. Integrating 5,000 universities' SSO implementations individually is a 6-12 month engineering project for every major publisher relationship. Research Rabbit, Litmaps, Elicit all considered and rejected this.

### What this IS

`.edu` email acts as a **membership badge**, not a credential:

1. At signup, verify the user's email domain belongs to a recognized educational institution (`bnu.edu.eg`, `stanford.edu`, `ucl.ac.uk`, etc.)
2. Check if that institution is a Lacunose **institutional customer** (see Priority 5 — site licenses)
3. If yes → auto-upgrade user to Premium tier, library is billed
4. If no → normal free/paid flow, with a CTA: "Is your library a Lacunose customer? Ask them to subscribe →"

### Implementation notes

- Use a library like [email-validator with institutional-domains list](https://github.com/Hipo/university-domains-list) — ~10,000 edu domains, MIT-licensed JSON
- Email verification code path already exists in sign-up flow — add a `is_student: true` flag when OTP hit an edu domain
- New backend table `institutional_licenses`: `(domain text primary key, customer_name text, plan text, seats int, period_end timestamptz)`
- Nightly job checks domain against licenses table, promotes matching users to Premium entitlement (RevenueCat override)

### Why this matters

- Gets users on a free Premium tier without us losing money (library pays)
- Students tell each other about apps they use for research → viral within a uni
- Establishes a pipeline to institutional sales: "we have 2,000 students from your uni using Lacunose free — convert to a site license"

---

## Priority 3 — Publisher TDM API partnerships (v2, 3-month project)

For the 30% of papers CORE + preprints + Unpaywall don't cover, the legitimate commercial path is per-publisher Text-and-Data-Mining (TDM) agreements.

### Publishers to approach (in order)

1. **Elsevier** — https://dev.elsevier.com/tecdoc_text_mining.html — most aggressive TDM program, covers Lancet, Cell, Neuron, etc. Academic free, commercial per-quote pricing. Biggest gain for medicine + biology.
2. **Springer Nature** — https://www.springernature.com/gp/researchers/text-and-data-mining — covers Nature, Sci Reports, BMC, etc.
3. **Wiley** — harder to get, smaller TDM team
4. **ACS** — chemistry-heavy, worth it if Lacunose goes hard into chemistry
5. **IEEE Xplore** — CS/electrical engineering, good for Lacunose's CS use case

### Business ask

These are relationship deals. Send an email to their editorial API contact saying:
- Who we are (Lacunose, founded 2026, mobile research-gap discovery)
- How many users / analyses/month (honest numbers, even if small)
- Use case (abstract + section-level extraction, no full-text redistribution, LLM reasoning over sections, gap cards cite with DOI link out)
- Pricing expectation (usage-based, sub-$0.01/paper accessed)

### Implementation once a deal lands

- New adapter `src/ingest/adapters/elsevier_tdm.ts` (or springer_tdm, etc.)
- API key in .env `ELSEVIER_TDM_API_KEY=...`
- When ingestion encounters a DOI prefix `10.1016/` (Elsevier) and has no OA copy, query the TDM API for sections
- Critical: respect TDM TOS — never store full-text beyond 24h cache, never expose to users as "full text view", only use for LLM input

### Cache economics (added 2026-04-22 after Seif asked "couldn't we pay per-use + cache?")

This is the entire business model at maturity. Flow:

1. First user queries topic X → fetch via publisher TDM → pay per paper → cache `papers.full_text_xml` (24h TTL per TOS) + `gap_analyses` results (permanent, our processed derivative work)
2. Second user queries similar topic → hybrid retrieval hits our existing paper corpus + cached embeddings → zero TDM calls
3. After 6-12 months of user growth, cache hit rate on popular papers reaches 70-80% — marginal cost per new analysis drops to cents

**TOS-compliant caching split**:
- **Raw full-text XML/PDF**: cache 24h max (Elsevier TDM limit), then purge. Used only as LLM input during that window.
- **Our derived outputs**: `gap_items`, `paper_sections.text` embeddings, clustering results — these are our transformative derivative work under fair use. Permanent cache OK.
- **Citation metadata** (title, DOI, year, abstract, references list): cache permanently under CrossRef / CC0 metadata licenses.

**Dashboards to build** to manage the unit economics:
- TDM call rate per publisher per day — watch for cost spike
- Cache hit rate per adapter
- $ spent on TDM vs $ revenue from Premium — this is the core P&L dial

**Minimum scale before worth negotiating**:
- ~3,000 paying Premium users ($120k/yr revenue)
- OR 5+ institutional licenses ($25k+/yr total, enough to hit Elsevier's minimums)
- Below this, stick to CORE + preprint matching for the gap not covered by OA

---

## Priority 4 — Miscellaneous polish (backlog)

### Mobile app
- **Library filter modal** — removed in hackathon cleanup. Consider re-adding if users ask for sort-by-date. Quick win, 30 min.
- **Push notifications** — Expo token registration runs on iOS only. Android is blocked on FCM credentials: follow https://docs.expo.dev/push-notifications/fcm-credentials/, add `google-services.json` + `android.googleServicesFile` to `app.json`, then remove the Android early-return in `hooks/usePushRegistration.ts`. Once tokens are flowing, wire `worker-support` to send pushes on gap-analysis completion + support reply. 2 hr after credentials are in Firebase.
- **Share + PDF download on results screen** — Share/Download buttons hidden in hackathon build (`app/analyze/results.tsx`). Wire `/v1/analyses/:id/export?format=pdf` (currently returns 501) and iOS/Android share sheet. 1 day.
- **Voice-input mic on topic field** — mic button hidden on home + analyze screens in hackathon. Wire `expo-speech-recognition` or native STT once recording-permissions copy is drafted. 3 hr.
- **Zotero sync** — paywall copy promises it but not built. API docs at https://www.zotero.org/support/dev/web_api/v3/start. Pro feature, 2 days.
- **Dark mode toggle** — theme still supports dark mode; toggle button hidden from Me screen header for hackathon. Re-add after auditing every screen's dark palette. 2 hr.
- **Change Password flow** — row hidden on Me screen, modal unreachable but still present in the JSX. Users only use email OTP today. Re-enable once Supabase email+password is turned on. 1 hr.
- **Contact Support screen** — row hidden on Me screen. `app/support.tsx` still exists as a route. 2 hr to wire intake form + email routing.
- **Google Sign-In on Android** — `androidClientId` now read from `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in `providers/AuthProvider.tsx`, but the env is empty. Manual steps (can't be automated): (1) create an Android OAuth 2.0 client in Google Cloud Console under the existing project; (2) register the debug keystore SHA-1 (`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`) and the release keystore SHA-1 from the `.jks` file; (3) paste the client ID into `.env`. The shared `webClientId` must belong to the same GCP project as the Android client. Missing SHA-1 is the most common `DEVELOPER_ERROR` cause.
- **Home / library gap count is approximate** — after switching `useAnalyses` to fetch the top gap for home-card titles, `gap_items.length` on cards reflects "≥1 gap" rather than the true total. If exact per-analysis totals matter, add a separate `count(*)` query hook. 30 min.
- **Analyses history pagination** — library loads all analyses at once. At 100+ per user this'll get slow. Add infinite scroll. 3 hr.

### Backend
- **Redis eviction policy persistence** — ran `CONFIG REWRITE` but container was started without a config file, so the `noeviction` setting reverts on container recreate. Mounted a config file or add to docker-compose command line. Low priority (we force it on container start).
- **Sentry release tracking** — DSN is configured but we're not sending release version. `SENTRY_RELEASE=${commit_hash}` should be set at build time in Dockerfile. Helps debug "which commit broke X".
- **Rate limit the analysis POST per-user** — currently only quota-bound. Add a 5/min limit to prevent a buggy client from spamming /v1/analyses and draining quota.
- **Background queue metrics dashboard** — no visibility into BullMQ queue depths, failure rates, worker health beyond docker logs. Add bull-board or Grafana + Prometheus.
- **Gap analysis evaluation harness** — `evals/` directory exists, build out pytest-style quality tests: given topic X, expect at least 1 gap in category Y with evidence from paper set Z.

### Known small bugs (not blocking)
- Supabase `field_concepts` has 333 rows instead of 133 because seed ran twice during debugging. Deduplicate with `delete from field_concepts a using field_concepts b where a.ctid < b.ctid and a.openalex_id = b.openalex_id;` — actually returned 0 rows last time, so the 333 might all be legitimate. Worth re-verifying.
- OpenAlex seed logs say 23 level-0 but the data model expects 19. There are 4 extra concepts at level 0 that aren't in NAME_TO_FRAME → they get 'generic' frame. Fine for now, but investigate which 4 (could be newly-added OpenAlex domains).
- Paper-sections URI-too-long is FIXED (batched) as of 2026-04-22, but keep an eye on similar patterns if new code paths add more `.in()` filters.

---

## Priority 5 — Business / monetization

### Pricing to revisit once we have data
- Currently Pro $20/mo, Premium $40/mo (both annual = 17% off)
- If Premium full-text is 10× more useful, $40 is under-priced. Consider $60-80 once we have usage data showing willingness-to-pay.
- Student discount: 50% off Pro with .edu email verification. Huge market we're not tapping.

### Free tier calibration
- Currently 3 analyses/month. Data will tell us if 3 is too few (low conversion) or too many (premium cannibalization). Hypothesis: 5-7 gives users enough rope to form a habit before hitting the wall.

### Institutional / site-license tier
- Separate SKU: `Lacunose Institutional` — unlimited analyses, all users on a `.edu` domain, billed to library. Standard academic library sale: 3-month pilot → renewal. Target unit price: $2,000-5,000/year per institution depending on FTE.

---

## Priority 6 — Marketing / distribution

### Post-hackathon launch narrative
- **Story**: "A PhD student reading 1,500 abstracts for you in 3 minutes" — emotional, concrete, no jargon
- **Proof**: show the actual CAR-T gap output from Seif's 2026-04-22 test (predictors of durable remission vs early relapse) — a real novel research question not obvious from any single abstract
- **Demo video**: 90 seconds, screen-record of "type topic → 3 min timelapse → 6 real gaps with citations"

### Channels
- **Twitter/Academia hashtags**: #LitReview, #ResearchGap, #PhDChat
- **Reddit**: r/PhDStudents, r/labrats, r/AskAcademia
- **Hacker News**: launch post on a Tuesday 9am PST — lead with the mechanism (Opus 4.7 + 1,500-paper map-reduce with grounding)
- **ResearchGate / Academia.edu** — advertise directly to researchers
- **Student union newsletters** — student-discount angle

---

## Claude note to self

When Seif asks me to pick this up post-hackathon, the order of operations should be:

1. Re-read [CLAUDE.md](CLAUDE.md) for any conventions added since.
2. Pull the current state of Anthropic/DeepSeek model IDs (they change). Update `ANTHROPIC_OPUS_MODEL`, `ANTHROPIC_HAIKU_MODEL`, DeepSeek model IDs in .env.example.
3. Start with Priority 1 section (a) CORE.ac.uk adapter — it's the single biggest quality unlock and zero legal risk.
4. Then (b) preprint matcher.
5. Then DeepSeek routing per-tier.
6. Then judgment layer (h-index + venue prestige weighting).
7. Test against 5 canonical topics Seif picks. Compare gap counts + quality vs current hackathon baseline. Don't ship Premium feature until quality win is obvious.

**Don't let me skip the eval step.** Full-text mode could go sideways in surprising ways (longer context = more hallucination risk, even with grounding guardrails). Measure.

**Don't let me touch Sci-Hub.** Seif and I agreed it's off-limits. Any "creative workaround" I propose in the future is me forgetting this decision. Push back on myself.

**Don't let me expand scope.** Each priority section is deliberately scoped. If mid-build I start proposing "while we're in here, let's also..." — stop, note it in backlog, finish the scoped piece first.

---

End of roadmap. Last updated: 2026-04-22 by Claude + Seif.
