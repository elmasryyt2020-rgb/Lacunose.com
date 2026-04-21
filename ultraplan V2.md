# Lacunose — Ultraplan v2 (1-week hackathon sprint, UI-complete → production base)

## Context

Seif has finished the Lacunose mobile UI (95% complete, field-generalized, polished chat-style Support screen at [lacunose/app/support.tsx](f:\lacunose.com\lacunose\app\support.tsx)), purchased `lacunose.com`, provisioned a Hostinger KVM4 VPS with self-hosted Supabase already running on docker-compose, and has existing Sentry / PostHog / RevenueCat accounts. The target is the Cerebral Valley "Built with 4.7" hackathon in **~7 days**, with **$500 in Anthropic API credits**, a Gemini-based coding tool for frontend work, and Claude as backend + orchestrator. After the hackathon the same codebase flips `LLM_PROVIDER=deepseek` for worldwide launch at ~2% cost.

This plan supersedes [ultraplan.md](f:\lacunose.com\ultraplan.md) (v1) and [implementation-plan.md](f:\lacunose.com\implementation-plan.md) (pre-generalization). The content in this file is the **canonical v2 plan** and will be written to `f:\lacunose.com\ultraplan-v2.md` on exit from plan mode.

**Decisions locked in this session:**
- SSH access: Seif creates a `deploy` user on KVM4 and installs an ED25519 public key I generate on exit.
- VPS state: Supabase docker-compose already running — I pick it up as-is, add hardening + schema, do not wipe.
- Support backend: Zoho Mail inbox `support@lacunose.com` + IMAP poll every 30s for inbound threading; SMTP for outbound. Ticket codes like `LNS-0001`.
- Field scope: **All three pickers combined** — 8 quick chips (top domains) + cluster modal (19 OpenAlex domains with subfield drill-down) + OpenAlex concept autocomplete search box. Every field in the world is reachable.
- Brand: **Lacunose** everywhere.
- Platforms: iOS + Android simultaneously via EAS.
- Team: Solo + parallel Claude Code agents.
- LLM: Opus 4.7 for hackathon (`LLM_PROVIDER=anthropic`), deterministic swap to DeepSeek post-hackathon.

## Current UI state (from audit) — what's done

| Screen / component | Status | Notes |
|---|---|---|
| [app/index.tsx](f:\lacunose.com\lacunose\app\index.tsx) landing | ✅ complete | mock CTAs |
| [app/onboarding.tsx](f:\lacunose.com\lacunose\app\onboarding.tsx) 4-step flow | ✅ complete | topic → PICO → processing → reveal paywall |
| [app/sign-up.tsx](f:\lacunose.com\lacunose\app\sign-up.tsx), [sign-in.tsx](f:\lacunose.com\lacunose\app\sign-in.tsx) | ✅ UI complete | no backend; mock-navigates to tabs |
| [app/(tabs)/home.tsx](f:\lacunose.com\lacunose\app\(tabs)\home.tsx) | ✅ complete | hardcoded recent analyses array |
| [app/(tabs)/analyze.tsx](f:\lacunose.com\lacunose\app\(tabs)\analyze.tsx) | ✅ **field-generalized** | 4 fields with per-field frames (PICO / TDMM / TPOI / SPDE); filter row; usage counter |
| [app/(tabs)/library.tsx](f:\lacunose.com\lacunose\app\(tabs)\library.tsx) | ✅ complete | hardcoded list; search + filter affordances ready |
| [app/(tabs)/me.tsx](f:\lacunose.com\lacunose\app\(tabs)\me.tsx) | ✅ complete | edit / password / ORCID modals; routes to `/support`, `/notifications`, `/paywall` |
| [app/analyze/results.tsx](f:\lacunose.com\lacunose\app\analyze\results.tsx) | ✅ complete | StreamStatus + 3 GapCards + 1 pending skeleton |
| [app/analyze/detail.tsx](f:\lacunose.com\lacunose\app\analyze\detail.tsx) | ✅ complete | 3-tile scores + method card + evidence |
| [app/paywall.tsx](f:\lacunose.com\lacunose\app\paywall.tsx) modal | ✅ complete | Free vs Pro tiers |
| [app/support.tsx](f:\lacunose.com\lacunose\app\support.tsx) | ✅ **chat UI complete** | message bubbles, timestamps, input pill; no backend wiring |
| [app/notifications.tsx](f:\lacunose.com\lacunose\app\notifications.tsx) | ✅ complete | 4 mock notifications |
| [app/privacy.tsx](f:\lacunose.com\lacunose\app\privacy.tsx), [terms.tsx](f:\lacunose.com\lacunose\app\terms.tsx) | ✅ boilerplate | needs hosted public URL |
| [constants/theme.ts](f:\lacunose.com\lacunose\constants\theme.ts) | ✅ dual light/dark | 7-color category palette: sky/mint/lavender/butter/peach/rose/sage |
| [components/Shared.tsx](f:\lacunose.com\lacunose\components\Shared.tsx) | ✅ Icon set (50+), ChipIcon, ScoreDial, CategoryPill, Logo | |

## What must be added to the UI for v2

The user asked explicitly. Minimizing churn — the existing polish stays, only the pieces needed to light up every feature.

### Additions (new components / screens)

1. **Expanded field picker** in [app/(tabs)/analyze.tsx](f:\lacunose.com\lacunose\app\(tabs)\analyze.tsx):
   - Keep the existing 4 quick chips (Medicine, CS, Econ, Psychology).
   - Add 4 more quick chips (Biology, Physics, Chemistry, Engineering) — total 8.
   - Add a **"More fields" pill** that opens `components/FieldClusterModal.tsx` — a bottom-sheet showing all 19 OpenAlex domains grouped into 4 clusters (Life Sciences, Physical Sciences, Social Sciences, Humanities), each expandable to subfields.
   - Add a **search bar inside the modal** (`components/ConceptSearchInput.tsx`) that hits OpenAlex `/concepts?search=…` — autocomplete any concept in the 65K tree.
   - On selection, the analyze screen's structured-frame editor re-renders using the frame template for that field.
2. **Extended structured-frame templates** in `lib/fields/frames.ts`:
   - 19 templates keyed by OpenAlex domain. Current 4 stay; we add Biology/Chemistry/Physics/Math/Engineering/Materials/Political Science/Sociology/Geology/Geography/History/Philosophy/Art/Business/Environmental Sci/Neuroscience. Generic fallback for anything else.
   - Each template: `{id, label, rows: [{key, label, color, example, placeholder}]}`.
3. **Support chat backend wiring** in [app/support.tsx](f:\lacunose.com\lacunose\app\support.tsx):
   - Add a `ticket_code` subtitle in the header (`LNS-0042 · Usually responds in 5 min`).
   - Replace local `useState` with `useSupportThread()` hook backed by Supabase Realtime.
   - Wire `sendMessage()` to POST `/v1/support/messages`.
   - Show delivery state (pending / sent / read) with small icon next to timestamp.
4. **Auth wiring** in [app/sign-up.tsx](f:\lacunose.com\lacunose\app\sign-up.tsx) and [sign-in.tsx](f:\lacunose.com\lacunose\app\sign-in.tsx):
   - Real Supabase magic-link + Google OAuth + Apple Sign-In handlers.
   - `useAuth()` hook in `lacunose/hooks/useAuth.ts`.
   - Auth context provider in [app/_layout.tsx](f:\lacunose.com\lacunose\app\_layout.tsx) that redirects unauthenticated users from `(tabs)` to `/sign-in`.
5. **Apple / Google compliance additions** in [app/(tabs)/me.tsx](f:\lacunose.com\lacunose\app\(tabs)\me.tsx):
   - **Restore purchases** row (required by Apple).
   - **Delete account** row with confirmation modal (required by Apple).
   - **Analytics opt-out toggle** (PostHog session replay default on per brand plan; user can disable).
6. **RevenueCat wiring** in [app/paywall.tsx](f:\lacunose.com\lacunose\app\paywall.tsx):
   - Replace hardcoded tiers with RevenueCat offerings fetched from `Purchases.getOfferings()`.
   - `purchasePackage()` on CTA; entitlement state updates via listener → reflected in Me screen usage bar.
7. **Data wiring (no visible layout change)**:
   - Home recent analyses → `useAnalyses({limit: 3})` TanStack Query hook.
   - Library grid → `useAnalyses({all: true})`.
   - Results `StreamStatus` + GapCards → `useAnalysis(id)` + `useGapStream(id)` Realtime subscription.
   - Detail → `useGapItem(id)`.
   - Notifications → `useNotifications()` + push-token registration on first launch.
   - Me subscription card → `useEntitlement()` with live RevenueCat state.
8. **Mock toggle**: `EXPO_PUBLIC_USE_MOCKS=true` default in dev, off in production EAS profiles. Mock layer lives in [lacunose/lib/mocks/](f:\lacunose.com\lacunose\lib\mocks\) (new).

### No layout or visual changes

Every other pixel stays. The theme tokens, typography, animations, FloatingNav, GapCard composition, onboarding polish — untouched. The audit confirms this is the right call — the UI is above the production bar already.

## Backend architecture (aligned to the already-running VPS)

### 3.1 KVM4 memory budget (GROBID removed, email + support worker added)

| Service | RAM |
|---|---|
| Postgres 15 + pgvector (already running) | 4 GB |
| Supabase sidecars (Kong, GoTrue, PostgREST, Realtime, Storage, Studio) — already running | 1.2 GB |
| Redis 7 | 512 MB |
| PM2 apps (edge-fn + 6 workers + support-worker = 8 apps, mix of clustered + single) | 3.5 GB |
| Caddy | 150 MB |
| System + docker engine | 1.5 GB |
| PDF parser (PyMuPDF via Python subprocess on demand) | <300 MB transient |
| **Headroom** | **~5 GB** — comfortable |

No GROBID this sprint (saves 2.5 GB). PyMuPDF + regex section splitter ships instead; good enough for future-work mining on ≥70% of OA PDFs.

### 3.2 Topology

```
Caddy (:80, :443, auto-TLS)
├─ api.lacunose.com      → Kong :8000 (existing Supabase)
├─ fn.lacunose.com       → PM2 edge-fn cluster :4000 (new)
└─ grobid.lacunose.com   → reserved, unused v2

PM2 apps (new, docker-hosted or native Node 20):
  edge-fn         ×2 forks  — Fastify HTTP API
  worker-ingest   ×2 forks  — corpus fetch from 7 adapters
  worker-parse    ×1        — PyMuPDF + section heuristics
  worker-embed    ×1        — S2 SPECTER2 + ONNX fallback
  worker-gap      ×2        — map+reduce orchestrator
  worker-critique ×1        — grounding verification
  worker-support  ×1        — Zoho IMAP poller + SMTP send

Redis 7 (new) — BullMQ queues, rate-limit buckets, LLM response cache
```

### 3.3 Data model additions to the already-migrated schema

New tables layered onto the existing Supabase (idempotent migration `0002_v2.sql`):

```sql
-- Support (email-backed chat)
create table support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  ticket_code text unique not null,           -- 'LNS-0042'
  subject text,
  status text default 'open',                  -- open|pending|closed
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);
alter table support_threads enable row level security;
create policy own_threads on support_threads for all using (auth.uid() = user_id);

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references support_threads(id) on delete cascade,
  is_user boolean not null,
  body text not null,
  email_message_id text unique,                -- RFC 5322 Message-ID for IMAP threading
  in_reply_to text,                            -- prior email's Message-ID
  attachments jsonb default '[]',
  created_at timestamptz default now()
);
alter table support_messages enable row level security;
create policy own_thread_messages on support_messages for select using (
  exists (select 1 from support_threads t where t.id = thread_id and t.user_id = auth.uid()));

create sequence if not exists ticket_code_seq start 1;

-- Notifications (push + in-app)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  kind text not null,                          -- 'analysis_complete'|'quota_reset'|'support_reply'|'welcome'
  title text not null,
  body text,
  data jsonb,                                  -- deep-link payload
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
create policy own_notifications on notifications for all using (auth.uid() = user_id);

create table push_tokens (
  user_id uuid references auth.users(id) on delete cascade,
  token text,
  platform text,                               -- 'ios'|'android'
  created_at timestamptz default now(),
  primary key (user_id, token)
);

-- Field catalog cached from OpenAlex concepts tree
create table field_concepts (
  openalex_id text primary key,                -- e.g. 'C71924100' for Medicine
  level int,                                    -- 0..5 in OpenAlex taxonomy
  name text not null,
  parent_ids text[],                           -- ancestors for hierarchical picker
  works_count bigint,                          -- helps rank autocomplete
  frame_template text                          -- matches lib/fields/frames.ts key
);
create index field_concepts_name_trgm on field_concepts using gin (name gin_trgm_ops);
```

All other v1 tables from `ultraplan.md §8` (`papers`, `paper_sections`, `paper_embeddings`, `citations`, `gap_analyses`, `gap_items`, `subscriptions`, `saved_items`, `query_cache`) ship in `0001_init.sql` — applied on top of the already-running Supabase.

### 3.4 Research fields — every field in the world

**Data source: OpenAlex concepts tree** (65K+ concepts, hierarchical).

- **Level 0 (19 domains)** become cluster headers in the `FieldClusterModal`:
  Medicine · Biology · Computer science · Chemistry · Physics · Materials science · Mathematics · Engineering · Psychology · Economics · Political science · Sociology · Geology · Geography · History · Philosophy · Art · Business · Environmental science.
- Grouped in UI as 4 cluster cards: Life Sciences (Medicine, Biology, Psychology, Environmental), Physical Sciences (Physics, Chemistry, Materials, Geology, Geography, Math, Astronomy), Social Sciences (Econ, Political, Sociology, Business, Education), Humanities (History, Philosophy, Art, Literature, Linguistics).
- **Level 1 (285 fields)** like "Cardiology", "Machine learning", "Macroeconomics" — loaded lazily when a cluster expands.
- **Autocomplete search** hits `https://api.openalex.org/concepts?search={q}&per-page=10` — covers anything not in our curated list, including ultra-niche concepts like "quantum chromodynamics" or "Ming dynasty calligraphy". Results stored in `field_concepts` cache for offline use.

**Frame templates (19 for v2 launch, generic fallback for everything else):**

```ts
// lib/fields/frames.ts
export const FRAMES: Record<string, FieldFrame> = {
  medicine:         { rows: ['Population', 'Intervention', 'Comparison', 'Outcome'] },          // PICO
  biology:          { rows: ['System', 'Organism', 'Method', 'Measurement'] },                  // SOMM
  chemistry:        { rows: ['Substrate', 'Reagent', 'Condition', 'Measurement'] },             // SRCM
  physics:          { rows: ['System', 'Method', 'Condition', 'Observable'] },                  // SMCO
  materials:        { rows: ['Composition', 'Processing', 'Structure', 'Property'] },           // CPSP
  mathematics:      { rows: ['Problem', 'Approach', 'Technique', 'Domain'] },                   // PATD
  'computer-science':{ rows: ['Task', 'Dataset', 'Method', 'Metric'] },                         // TDMM
  engineering:      { rows: ['System', 'Constraint', 'Method', 'Performance'] },                // SCMP
  psychology:       { rows: ['Sample', 'Phenomenon', 'Design', 'Evaluation'] },                 // SPDE
  economics:        { rows: ['Treatment', 'Population', 'Outcome', 'Identification'] },         // TPOI
  'political-science':{ rows: ['Context', 'Actor', 'Policy', 'Effect'] },                       // CAPE
  sociology:        { rows: ['Setting', 'Community', 'Method', 'Observation'] },                // SCMO
  geology:          { rows: ['Location', 'Time', 'Process', 'Evidence'] },                      // LTPE
  geography:        { rows: ['Region', 'Phenomenon', 'Scale', 'Evidence'] },                    // RPSE
  history:          { rows: ['Period', 'Actors', 'Region', 'Theme'] },                          // PART
  philosophy:       { rows: ['Position', 'Argument', 'Framework', 'Objection'] },               // PAFO
  art:              { rows: ['Period', 'Work', 'Medium', 'Context'] },                          // PWMC
  business:         { rows: ['Market', 'Firm', 'Practice', 'Outcome'] },                        // MFPO
  'environmental-science':{ rows: ['System', 'Location', 'Method', 'Evidence'] },               // SLME
  // fallback for anything else in OpenAlex
  generic:          { rows: ['Subject', 'Approach', 'Context', 'Outcome'] },                    // SACO
};
```

The analyze screen's frame editor swaps the 4 row labels + colours when the field changes. Zero additional screens.

### 3.5 Gap engine (4 categories shipped, 4 deferred)

**Shipping this week:** future-work, coverage (structured-frame gap enumeration — generalizes PICO), methodology, contradiction.

**Post-hackathon (v1.1):** geographic, population, intersection, temporal.

The schema `gap_items.category` supports all 8 — no migration needed to layer them in.

### 3.6 LLM provider abstraction (unchanged from ultraplan v1)

`src/llm/` with `providers/anthropic.ts`, `providers/deepseek.ts`, `providers/mock.ts`. Semantic tiers `synth | map | critique` map to vendor models. Swap = `LLM_PROVIDER` env var. Full contract in ultraplan v1 §4.

### 3.7 Parallel chunked map-reduce pipeline (unchanged)

Stages 1–10 from ultraplan v1 §5.1. Critical: every LLM call ≤100K input tokens regardless of provider context window, so Opus 4.7 → DeepSeek swap never changes the pipeline.

## 4. Contact Support — email-backed chat architecture

### 4.1 User-visible flow (no change to existing UI shape)

1. User opens [app/support.tsx](f:\lacunose.com\lacunose\app\support.tsx). First-time visit creates a new `support_threads` row with auto-assigned `ticket_code` (e.g. `LNS-0042`). Existing users see their active thread.
2. Header shows `Support · LNS-0042` with existing "Usually responds in 5 min" subtitle.
3. User types → send → optimistic render → POST `/v1/support/messages {body}`.
4. Backend stores message, sends email from `support@lacunose.com` to staff inbox, then returns. Chat bubble turns from pending to sent.
5. Staff replies from their mail client to that email.
6. `worker-support` polls Zoho IMAP every 30s, parses the reply, matches `In-Reply-To` header against `support_messages.email_message_id`, inserts the reply.
7. Supabase Realtime pushes the new `support_messages` row to the mobile client. Bubble appears left-aligned, support-styled.
8. Push notification fires to user via Expo push tokens.

### 4.2 Email envelope design

```
From:       support@lacunose.com
To:         team@lacunose.com              (staff distro)
Reply-To:   support@lacunose.com           (so replies hit the shared inbox)
Subject:    [LNS-0042] First line of message...
Message-ID: <support-{uuid}@lacunose.com>
References: <support-{previous-msg-uuid}@lacunose.com>
X-Lacunose-Thread: LNS-0042
X-Lacunose-User:   {user_id}
X-Lacunose-Email:  seif@researcher.edu

> From user: seif@researcher.edu
> App version: 1.0.0 · iOS 17.4 · iPhone 15
> Ticket: LNS-0042

--- message ---
The message body typed in the app.
```

- `Message-ID` headers make IMAP threading deterministic — no fuzzy subject matching.
- The `X-Lacunose-*` headers let the poller skip heuristics entirely.
- Staff can reply from any client (Gmail, Zoho webmail, Apple Mail) — as long as their client preserves `In-Reply-To` (all major clients do), threading works.

### 4.3 The "code" the user mentioned

`ticket_code` serves double duty:
- Visible in the mobile chat header so users can reference it.
- Embedded in the email subject (`[LNS-0042]`) and `X-Lacunose-Thread` header so staff can search/filter.

### 4.4 Zoho setup Seif runs (before I SSH)

1. Ensure `support@lacunose.com` alias exists on Zoho Mail (or a dedicated user — an alias is fine for volume this week).
2. Generate an **app-specific password** (Zoho → Settings → Security → App Passwords → "Lacunose IMAP").
3. IMAP host: `imap.zoho.com:993` (TLS). SMTP host: `smtp.zoho.com:465` (SSL).
4. Share creds with me via 1Password share link (or env-var values directly; I drop them into `.env` on the VPS, chmod 600, never echo back).

### 4.5 Anti-abuse

- Rate-limit: 10 support messages per user per hour (Redis bucket).
- Outbound email capped at 500/day (Zoho free tier caps) — if exceeded, queue and retry.
- Any inbound email that cannot be matched to a thread by Message-ID → logged, dropped, Sentry alert (catches misconfigured replies).

## 5. VPS setup — what I do, what Seif does

### 5.1 On exit from plan mode, my first actions

1. **Generate ED25519 SSH keypair** (runs on my side; not in plan mode): `ssh-keygen -t ed25519 -f ~/.ssh/lacunose_deploy -C "claude-code@lacunose.com"`. I print the **public key** to chat for Seif to install.
2. Wait for Seif to complete §5.2 below, then SSH in and continue.

### 5.2 What Seif does (takes ~5 minutes)

```bash
# On Hostinger KVM4, as root or existing sudo user:
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
usermod -aG docker deploy       # so we can run docker-compose without sudo
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# paste the public key I give you:
echo "ssh-ed25519 AAAA… claude-code@lacunose.com" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
# allow passwordless sudo for deploy user (optional; scoped):
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy-lacunose
chmod 440 /etc/sudoers.d/deploy-lacunose
```

Seif also sends me, in a secure channel (1Password share link preferred):
- VPS public IP
- Zoho IMAP/SMTP app password
- Anthropic API key (with $500 credits)
- DeepSeek API key (for parity branch)
- Cohere API key
- Semantic Scholar API key
- PubMed (NCBI) API key
- PostHog project key + server-side personal API key
- Sentry DSN (mobile) + Sentry DSN (backend)
- RevenueCat public SDK keys (iOS + Android) + secret webhook token

### 5.3 What I do over SSH (the full VPS buildout)

All steps idempotent; each can be re-run without damage. Approximate wall-clock: 2-3 hours.

1. **Audit the running Supabase stack** — `docker ps`, confirm Kong/GoTrue/PostgREST/Realtime/Storage/Studio/Postgres all healthy; read current `docker-compose.yml`, back it up.
2. **Harden existing stack**:
   - UFW: default deny; allow 22, 80, 443 only.
   - SSH: disable password auth, key-only (`PasswordAuthentication no`); disable root login; set `fail2ban`.
   - Supabase Studio: restrict to Seif's IP via Caddy basic-auth or IP allowlist.
   - Rotate Supabase anon/service-role keys if defaults are still in place; update `.env` on VPS.
   - Ensure Postgres `listen_addresses='127.0.0.1'` (internal docker network only).
3. **Install Redis 7** via docker-compose override: add `redis` service with persistence + `maxmemory 512mb allkeys-lru`.
4. **Install Caddy** (or extend if present) with Caddyfile:
   ```caddy
   api.lacunose.com { reverse_proxy localhost:8000 }
   fn.lacunose.com  { reverse_proxy localhost:4000 }
   ```
   Both get Let's Encrypt certs automatically.
5. **Install Node 20 LTS + PM2** (via `n` or nodesource). Global: `pm2`, `pm2-logrotate`.
6. **Clone backend repo** to `/home/deploy/lacunose-backend`, set up `.env` with all secrets (mode 600), `npm ci`, `npm run build`.
7. **Apply migrations**: `0001_init.sql` (if not already applied from v1), `0002_v2.sql` (support + notifications + field_concepts). Verify via `psql` that RLS policies are in place.
8. **Seed `field_concepts`** by fetching OpenAlex `/concepts?filter=level:0|1` and bulk-inserting ~304 top-two-level concepts.
9. **Start PM2 apps**: `pm2 start infra/ecosystem.config.cjs`, `pm2 save`, `pm2 startup systemd`.
10. **Backups**: `infra/scripts/backup-db.sh` into cron at 04:00 UTC; uploads encrypted `pg_dump` to Hostinger Object Storage.
11. **Health checks**: `curl https://fn.lacunose.com/v1/health` returns 200; `curl https://api.lacunose.com/rest/v1/` returns PostgREST OpenAPI spec.
12. **Support pipeline smoke test**: insert a fake `support_messages` row with `is_user=true` → worker-support sends a real email to a test staff inbox → reply → IMAP poll picks it up → new row appears.
13. **Final hardening pass**: `lynis audit system`, address any high warnings.

### 5.4 DNS records Seif adds at the registrar

```
Type   Host                    Value                    TTL
A      api                     <VPS-IP>                 300
A      fn                      <VPS-IP>                 300
A      @                       <VPS-IP>      (landing page later)
CNAME  www                     lacunose.com             300
# Zoho MX (should exist)
MX     @    10  mx.zoho.com
MX     @    20  mx2.zoho.com
MX     @    50  mx3.zoho.com
# Email deliverability
TXT    @    "v=spf1 include:zoho.com ~all"
TXT    @    "v=DMARC1; p=quarantine; rua=mailto:dmarc@lacunose.com"
# DKIM (Zoho provides the selector + value in Zoho Admin Console → Email Authentication → DKIM)
TXT    zoho._domainkey   "v=DKIM1; k=rsa; p=<zoho-provides>"
```

I will paste the exact values to copy-paste once I've confirmed the VPS IP and checked Zoho's DKIM panel for the selector.

## 6. Account setup walkthroughs (user runs; I consume keys)

### 6.1 Sentry (new project in existing org)

1. sentry.io → left sidebar **Projects** → **Create Project**.
2. Platform: **React Native**. Alert frequency: default. Project name: `lacunose-mobile`. Team: your existing team. Create.
3. Sentry shows a DSN like `https://xxxx@o123.ingest.sentry.io/456`. Copy it — that's `SENTRY_DSN_MOBILE`.
4. Repeat: Platform **Node.js** → project `lacunose-backend` → copy DSN as `SENTRY_DSN_BACKEND`.
5. For both projects: **Settings → Integrations → Slack** (if you want alerts) or **Email** (default). Configure alert rules for `p95 > 2s`, `error rate > 2%`.
6. Share both DSNs with me via password-manager link.

### 6.2 PostHog (new project in existing org, EU cloud)

1. `eu.posthog.com` → left sidebar project switcher → **+ New project** → name `Lacunose`.
2. **Project Settings → Project API Key** (starts with `phc_`). Copy — `POSTHOG_KEY_MOBILE`.
3. **Account → Personal API Keys → Create** (`label: lacunose-server`, `scopes: feature_flag:read, insight:read`). Copy — `POSTHOG_KEY_SERVER`.
4. **Session Replay → Turn on**. Masking rules: `Mask all inputs: ON`, `Mask text content: OFF`. Sampling: 100% for first 2 weeks, drop to 30% after.
5. **Feature Flags** → create stubs: `gap_engine_v2`, `contradiction_detection_enabled`, `experimental_fields`, `onboarding_variant_b`. Default: off.
6. **Dashboards → New Dashboard** three times:
   - `First-week retention` — pre-built cohort retention insight, filter cohort: `completed ≥ 1 analysis`, stratify by signup week.
   - `Feature-use-by-day` — lifecycle insight per feature event, interval=day.
   - `Monetization funnel` — funnel insight: `signup_completed → analysis_submitted → paywall_shown → paywall_purchase_completed`.
   - I can paste the dashboard JSON configs on exit.
7. Share both keys with me.

### 6.3 RevenueCat (new project)

1. `app.revenuecat.com` → top-left project switcher → **+ New Project** → name `Lacunose`.
2. **Apps → + New App → iOS**. Bundle ID must match App Store Connect (e.g. `com.lacunose.app`). Upload App Store Connect shared secret (from App Store Connect → Users and Access → Keys → In-App Purchase). Copy **Public API Key** → `REVENUECAT_KEY_IOS`.
3. **Apps → + New App → Android**. Package name `com.lacunose.app`. Upload service account JSON from Google Play Console → API access → Service accounts. Copy **Public API Key** → `REVENUECAT_KEY_ANDROID`.
4. **Products** (sync from stores after you create them in App Store Connect + Play Console):
   - `lacunose.pro.monthly`, `lacunose.pro.annual`
   - `lacunose.premium.monthly`, `lacunose.premium.annual`
5. **Entitlements → + New** twice: `pro`, `premium`. Attach matching products.
6. **Offerings → default** (auto-created) → add 4 packages matching the 4 products.
7. **Integrations → Webhooks → + Add** → URL `https://fn.lacunose.com/v1/webhooks/revenuecat` → authorization header: `Bearer <random-token>`. Copy that token — `REVENUECAT_WEBHOOK_TOKEN`.
8. **Project Settings → API Keys → Secret Key** → copy — `REVENUECAT_SECRET_KEY` (backend use only).
9. Share all four values with me: iOS key, Android key, webhook token, secret key.

### 6.4 Apple / Google store setup (Seif does; I verify)

- **App Store Connect**: create app record, bundle ID, primary category Education + secondary Medical. Add 4 IAP products matching the RevenueCat SKUs. Submit app privacy questionnaire (Sentry + PostHog + RC categories). Upload TestFlight build via EAS Submit.
- **Google Play Console**: create app, internal testing track. Add 4 subscription products. Data safety form (same categories). Upload AAB via EAS Submit.

## 7. Day-by-day execution

UI is already built, so days shift toward backend + wiring. Six parallel Claude Code worktrees map to streams; Seif reviews at a daily 17:00 window.

### Day 0 — Preflight (2 hours after plan mode exits)

- I print public SSH key; Seif installs per §5.2.
- I generate shared types in `packages/types/` and commit.
- I scaffold `lacunose-backend/` with `tsconfig`, `package.json`, `infra/ecosystem.config.cjs`, `infra/docker-compose.override.yml` (adds Redis + Caddy). Commit.
- Seif performs §6.1–6.3 account setup walkthroughs.
- Seif creates Apple + Google IAP products (takes 30 min per store).

**Gate**: deploy user reachable, secrets in my hands, types package builds clean.

### Day 1 — VPS hardening + schema + adapters (streams C, E)

- §5.3 steps 1–5 (VPS audit + harden + Redis + Caddy + Node + PM2).
- `supabase/migrations/0001_init.sql` + `0002_v2.sql` applied; RLS verified.
- `src/ingest/adapters/{openalex,semanticScholar,crossref,pubmed,europepmc,arxiv,unpaywall}.ts` implemented with Redis token buckets.
- `src/ingest/dedupe.ts` unit-tested.
- `field_concepts` seeded with OpenAlex top 2 levels.

**Gate**: 500-paper fetch for "CAR-T therapy" lands in `papers`. Supabase Studio shows 304 concepts in `field_concepts`.

### Day 2 — LLM layer + retrieval + gap engine scaffolding (stream F)

- `src/llm/` full implementation: providers (anthropic, deepseek, mock), router, cache (Redis), chunk, parallel.
- `src/enrich/embed.ts`: S2 SPECTER2 where cached, ONNX fallback.
- `src/retrieval/hybrid.ts`: pgvector + FTS + Cohere rerank top-30.
- `src/gap/map.ts`: per-section signal extraction (Haiku during dev, Opus flag for hackathon).
- `src/gap/cluster.ts`: HDBSCAN on signal embeddings.

**Gate**: topic → corpus → top-30 sections → 30 map signals → 4–8 clusters (eyeball quality).

### Day 3 — Reduce, critique, rank, edge-fn routes, support worker (streams F, D)

- `src/gap/reduce.ts`: per-cluster Opus 4.7 synth with `cache_control` few-shot.
- `src/gap/critique.ts`: Haiku + verbatim-quote guardrail.
- `src/gap/rank.ts`: composite score + semantic dedupe.
- `src/workers/gap.ts`: full pipeline orchestrator; streams `gap_items` inserts.
- `src/edge/app.ts` Fastify routes: `POST /v1/analyses`, `GET /v1/analyses/:id`, `POST /v1/analyses/:id/export`, `POST /v1/support/messages`, `POST /v1/webhooks/revenuecat`, `POST /v1/account/delete`, `/v1/push/register`, `/v1/health`, `/v1/ready`.
- `src/workers/support.ts`: Zoho IMAP poller (every 30s) + SMTP send with RFC 5322 threading headers.

**Gate**: curl end-to-end: submit analysis with real JWT → 5–10 gaps stream in within 90s → grounding guardrail 100%. Support smoke test: POST message → email sent → manual reply lands → poll picks up → Realtime delivers.

### Day 4 — Mobile wiring: auth, data, Realtime (streams A, B)

- `lib/supabase.ts`, `lib/sentry.ts`, `lib/analytics/{posthog,events}.ts`, `lib/billing/revenuecat.ts`.
- `hooks/{useAuth,useAnalysis,useGapStream,useGapItem,useAnalyses,useEntitlement,useSupportThread,useNotifications}.ts`.
- `lib/api/{analyses,gaps,support,export}.ts`.
- `lib/fields/{frames.ts,concepts.ts,searchConcepts.ts}` (19 frames + OpenAlex autocomplete).
- Auth provider in [app/_layout.tsx](f:\lacunose.com\lacunose\app\_layout.tsx); redirects unauthed users from `(tabs)` to `/sign-in`.
- Wire [sign-up.tsx](f:\lacunose.com\lacunose\app\sign-up.tsx) and [sign-in.tsx](f:\lacunose.com\lacunose\app\sign-in.tsx) to Supabase magic link + Apple Sign-In + Google OAuth.
- Wire [home.tsx](f:\lacunose.com\lacunose\app\(tabs)\home.tsx), [library.tsx](f:\lacunose.com\lacunose\app\(tabs)\library.tsx), [results.tsx](f:\lacunose.com\lacunose\app\analyze\results.tsx), [detail.tsx](f:\lacunose.com\lacunose\app\analyze\detail.tsx), [support.tsx](f:\lacunose.com\lacunose\app\support.tsx), [notifications.tsx](f:\lacunose.com\lacunose\app\notifications.tsx), [me.tsx](f:\lacunose.com\lacunose\app\(tabs)\me.tsx) to real hooks.

**Gate**: fresh install on iPhone → sign up → run analysis in any of the 4 visible fields → gaps stream in → paywall hits after 3 free analyses → sandbox purchase upgrades tier.

### Day 5 — Field expansion UI, support wiring, compliance adds (stream A)

- New `components/FieldClusterModal.tsx` with 4 cluster cards → 19 domains → subfield drill-down.
- New `components/ConceptSearchInput.tsx` — autocomplete against `/concepts?search=` via `useConceptSearch()` with 300ms debounce.
- Extend [analyze.tsx](f:\lacunose.com\lacunose\app\(tabs)\analyze.tsx): 8 quick chips + "More fields" pill opens modal; selected field drives frame editor from new `lib/fields/frames.ts`.
- [support.tsx](f:\lacunose.com\lacunose\app\support.tsx) header shows `LNS-<code>`.
- [me.tsx](f:\lacunose.com\lacunose\app\(tabs)\me.tsx): new rows — Restore purchases, Delete account (confirm modal → `/v1/account/delete`), Analytics opt-out toggle.
- Push notifications: `expo-notifications` request permission on first launch after onboarding; register token to `/v1/push/register`.
- Privacy + Terms hosted at `https://lacunose.com/privacy` and `/terms` (static HTML on Caddy or via marketing site).

**Gate**: any of 65K OpenAlex concepts selectable via search → frame editor falls back to generic template if niche; analysis still runs. Apple checklist green.

### Day 6 — Polish, demo seeds, dashboards, observability

- Pre-seed corpora + cached gap_analyses for 3 demo topics so hackathon demo never hits cold APIs:
  - Biomed: "CAR-T therapy in pediatric acute lymphoblastic leukemia"
  - CS: "Efficient attention mechanisms for long-context transformers"
  - Humanities: "Postcolonial climate fiction in anglophone literature"
- PostHog dashboards provisioned (§6.2.6).
- Sentry alert rules wired to Slack or email.
- Session replay tested + masking rules verified.
- 2-minute demo video recorded; backup tablet copy.
- README at repo root with architecture diagram.
- TestFlight + Play internal test uploads.

**Gate**: demo rehearsal on iPhone + Pixel in airplane mode (hitting cache) → streaming reveal works in <60s per demo topic.

### Day 7 — Hackathon submission + post-hackathon parity branch

- Morning smoke tests × 3.
- Show-device `LLM_PROVIDER=anthropic-allopus` set so every call is Opus 4.7 (max "Built with 4.7" surface area).
- Submit video + writeup.
- Post-hackathon branch: `LLM_PROVIDER=deepseek` parity-tested on the 3 demo topics; merge but do not deploy until judging ends.

## 8. Critical files

### Existing (extend; do not rewrite)

- [lacunose/app/_layout.tsx](f:\lacunose.com\lacunose\app\_layout.tsx) — add AuthProvider, Sentry + PostHog + RC init
- [lacunose/app/sign-up.tsx](f:\lacunose.com\lacunose\app\sign-up.tsx), [sign-in.tsx](f:\lacunose.com\lacunose\app\sign-in.tsx) — real Supabase auth
- [lacunose/app/onboarding.tsx](f:\lacunose.com\lacunose\app\onboarding.tsx) — field picker for step 1 (was medical-only prompt)
- [lacunose/app/(tabs)/home.tsx](f:\lacunose.com\lacunose\app\(tabs)\home.tsx), [library.tsx](f:\lacunose.com\lacunose\app\(tabs)\library.tsx) — swap mocks for hooks
- [lacunose/app/(tabs)/analyze.tsx](f:\lacunose.com\lacunose\app\(tabs)\analyze.tsx) — 8 chips + More pill + FieldClusterModal; 19 frames
- [lacunose/app/(tabs)/me.tsx](f:\lacunose.com\lacunose\app\(tabs)\me.tsx) — restore, delete, opt-out, live entitlement
- [lacunose/app/analyze/results.tsx](f:\lacunose.com\lacunose\app\analyze\results.tsx), [detail.tsx](f:\lacunose.com\lacunose\app\analyze\detail.tsx) — Realtime subscription
- [lacunose/app/paywall.tsx](f:\lacunose.com\lacunose\app\paywall.tsx) — RevenueCat offerings
- [lacunose/app/support.tsx](f:\lacunose.com\lacunose\app\support.tsx) — useSupportThread hook + ticket code
- [lacunose/app/notifications.tsx](f:\lacunose.com\lacunose\app\notifications.tsx) — useNotifications hook
- [lacunose/components/Shared.tsx](f:\lacunose.com\lacunose\components\Shared.tsx) — extend CategoryPill map with 2 more categories (contradiction, coverage)
- [lacunose/constants/theme.ts](f:\lacunose.com\lacunose\constants\theme.ts) — add contradiction→rose and coverage→lavender already exists under pico; extend CategoryPill mapping

### New in mobile

- `lacunose/lib/supabase.ts`, `lib/sentry.ts`
- `lacunose/lib/billing/revenuecat.ts`, `lib/billing/paywall.ts`
- `lacunose/lib/analytics/{posthog,events}.ts`
- `lacunose/lib/api/{analyses,gaps,support,export,notifications}.ts`
- `lacunose/lib/fields/{frames.ts,concepts.ts,searchConcepts.ts}`
- `lacunose/lib/mocks/{analyses,gaps,stream,index}.ts`
- `lacunose/lib/store.ts` (zustand)
- `lacunose/hooks/{useAuth,useAnalysis,useGapStream,useGapItem,useAnalyses,useEntitlement,useSupportThread,useNotifications,useConceptSearch,useThemeMode}.ts`
- `lacunose/components/{FieldClusterModal,ConceptSearchInput,DeleteAccountSheet,OptOutToggle}.tsx`

### New backend repo `lacunose-backend/`

- `packages/types/src/index.ts` — `Paper`, `Section`, `GapItem`, `GapAnalysis`, `AnalysisJob`, `SupportThread`, `SupportMessage`, `FieldConcept`, `LLMMessage`, `ChatOptions`
- `src/llm/{index,router,types,cache,chunk,parallel}.ts` + `providers/{anthropic,deepseek,mock}.ts`
- `src/ingest/adapters/{openalex,semanticScholar,crossref,pubmed,europepmc,arxiv,unpaywall}.ts` + `dedupe.ts`, `rateLimit.ts`
- `src/enrich/{parsePdf,embed}.ts`
- `src/retrieval/hybrid.ts`
- `src/gap/{map,cluster,reduce,critique,rank,prompts/*}.ts`
- `src/fields/index.ts` — 19 field adapters
- `src/edge/{app,routes/*,auth,rateLimit}.ts` (Fastify)
- `src/workers/{ingest,parse,embed,gap,critique,support}.ts` (BullMQ)
- `src/email/{zohoImap,zohoSmtp,threading}.ts` — support email bridge
- `supabase/migrations/{0001_init.sql,0002_v2.sql}`
- `infra/{docker-compose.override.yml,Caddyfile,ecosystem.config.cjs,scripts/{provision.sh,backup-db.sh,restore-db.sh,seed-concepts.ts}}`

## 9. Verification

**Build-time:**
- `tsc --noEmit` clean in mobile + backend + types.
- `npm run lint` clean in [lacunose/](f:\lacunose.com\lacunose\).
- `docker compose ps` shows all services healthy on VPS.
- `pm2 status` shows 8 apps online, all green.

**End-to-end analysis (per demo field, post-day-3):**
1. Fresh user signs up via magic link.
2. Submits "efficient attention mechanisms for long-context transformers" in field=Computer Science.
3. Watches `gap_items` stream in within 90s; 5–10 rows with 4 categories represented.
4. Expands evidence on rank-1 gap; verbatim quote matches `paper_sections.text`.
5. Exports as PDF; file downloads cleanly.
6. Submits 3 more analyses → hits paywall → sandbox purchase → tier flips to `pro` within 10s via RC webhook.

**Support email bridge:**
1. App: user sends "Hello, I need help with X" → chat shows pending → sent within 3s.
2. Staff inbox (`team@lacunose.com`): receives email `Subject: [LNS-0042] Hello, I need help with X`, `Message-ID: <support-xxx@lacunose.com>`.
3. Staff replies inline from any mail client.
4. Within 30s of send, app chat shows the reply via Realtime.
5. User receives Expo push notification.

**Cross-field stress test:**
- Run analysis in 5 fields spanning clusters: Medicine, Computer Science, Economics, Philosophy, Materials Science.
- Each completes in <120s p95 with no ungrounded gaps after critique.
- Generic frame fallback kicks in correctly for a niche OpenAlex concept like "quantum chromodynamics" or "medieval manuscript illumination".

**Hackathon readiness (day 7 AM):**
- 3 demo topics execute from app cold-start in <60s each.
- Reasoning panel opens without lag.
- Opus 4.7 token ledger updates visibly.
- Backup tablet plays demo video without Wi-Fi.

**DeepSeek parity (post-submission):**
- Same 3 demo topics run with `LLM_PROVIDER=deepseek` on parity branch.
- Precision alignment within 10% of Opus baseline on manual review.
- Hallucination rate ≤5%.

## 10. What I need from Seif to start

On ExitPlanMode approval, I need:
1. Install my SSH public key per §5.2 (I'll print the key immediately after ExitPlanMode approval).
2. Provide VPS public IP in chat.
3. Share secrets via 1Password link (or chat, in which case I recommend rotating after setup): Zoho app password, Anthropic key, DeepSeek key, Cohere key, S2 key, PubMed key.
4. Run §6.1–6.3 account walkthroughs (Sentry, PostHog, RevenueCat) and share keys.
5. Create App Store Connect + Play Console IAP products (§6.4) — can happen in parallel with my day-1 backend work.
6. Add DNS records per §5.4 once I confirm the VPS IP.

I do everything else over SSH + in the repos.

## 11. Reference

- Full architectural spec (v1 deep dive): [f:\lacunose.com\ultraplan.md](f:\lacunose.com\ultraplan.md)
- Original medical-only plan: [f:\lacunose.com\implementation-plan.md](f:\lacunose.com\implementation-plan.md)
- Existing Expo app: [f:\lacunose.com\lacunose\](f:\lacunose.com\lacunose\)
- Project conventions: [f:\lacunose.com\CLAUDE.md](f:\lacunose.com\CLAUDE.md)
- This canonical v2 content will be written on exit to `f:\lacunose.com\ultraplan-v2.md`.
