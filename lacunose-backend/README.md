# Lacunose backend

Node 20 + TypeScript ESM. Self-hosted Supabase + Redis on a single Hostinger KVM4; PM2-managed workers + Fastify edge-fn cluster. See [ultraplan V2.md](../ultraplan%20V2.md) for full architecture; this doc is the ops handbook.

## Layout

```
packages/types/src/index.ts     — shared types (mobile + backend)
src/
  lib/                          — env, redis, logger, supabaseAdmin
  llm/                          — provider-agnostic LLM layer (Opus 4.7 ↔ DeepSeek swap)
    providers/{anthropic,deepseek,mock}.ts
  ingest/                       — 7 data-source adapters + dedupe + persist
    adapters/{openalex,semanticScholar,crossref,pubmed,europepmc,arxiv,unpaywall}.ts
  enrich/                       — PDF parse (PyMuPDF) + embedding (S2 SPECTER2 + hash fallback)
  retrieval/                    — pgvector + FTS hybrid + Cohere rerank
  gap/                          — map → cluster → reduce → critique → rank
    prompts/{map,reduce,critique}.ts
  fields/                       — 20 field adapters (per-field prompts, study-design vocab)
  edge/                         — Fastify HTTP API
    routes/{analyses,support,webhooks,account,push,health}.ts
  email/                        — Zoho IMAP poll + SMTP send + RFC-5322 threading
  workers/                      — BullMQ consumers (ingest, parse, embed, gap, critique, support)
supabase/migrations/            — 0001_init.sql, 0002_v2.sql
infra/
  ecosystem.config.cjs          — PM2 definitions (7 apps)
  docker-compose.override.yml   — Redis + Caddy on top of existing Supabase
  Caddyfile                     — HTTPS reverse proxy for api.lacunose.com, fn.lacunose.com
  scripts/{provision.sh,backup-db.sh,migrate.ts,seed-concepts.ts}
```

## First-time VPS setup

Once the `deploy` user is created with our SSH key installed:

```bash
ssh deploy@<VPS-IP>
git clone git@github.com:<you>/lacunose.com.git ~/lacunose.com
cd ~/lacunose.com/lacunose-backend
cp .env.example .env   # then fill in secrets; chmod 600 .env
bash infra/scripts/provision.sh
npm ci
npm run build
npm run migrate
npm run seed:concepts
pm2 start infra/ecosystem.config.cjs
pm2 save
sudo pm2 startup systemd   # make PM2 survive reboot
```

## Daily ops

```bash
pm2 status               # health of all 7 apps
pm2 logs edge-fn         # tail a specific app
pm2 reload all           # zero-downtime redeploy after git pull
curl https://fn.lacunose.com/v1/health
curl https://fn.lacunose.com/v1/ready
```

## Swap to DeepSeek post-hackathon

```bash
sed -i 's/^LLM_PROVIDER=.*/LLM_PROVIDER=deepseek/' .env
pm2 reload all
```

No code changes. Every gap analysis now runs at ~2% of hackathon cost.

## Env contract

See [.env.example](.env.example).
