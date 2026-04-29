# VPS operations reference

Context for future Claude sessions (or future-you) when updating the backend, the waitlist site, Caddy, or Supabase auth. Everything here was verified live on 2026-04-22.

## Connection

| | |
|---|---|
| **Host** | `187.127.75.87` (Hostinger KVM, hostname `srv1607381.hstgr.cloud`) |
| **User** | `root` (full access; a non-privileged `deploy` user also exists at `/home/deploy`) |
| **Key** | `~/.ssh/lacunose_deploy` (private) / `.pub` (public — pasted in Hostinger SSH panel) |
| **One-liner** | `ssh -i ~/.ssh/lacunose_deploy root@187.127.75.87` |

If SSH breaks with "Permission denied," the Hostinger panel probably rotated the authorized_keys. Re-paste the contents of `~/.ssh/lacunose_deploy.pub` into Hostinger → VPS → SSH Keys.

## Directory layout on the VPS

```
/root/supabase/docker/              # Vendor Supabase self-hosted stack (git clone of supabase/supabase docker/)
  docker-compose.yml                # DO NOT EDIT — vendor file
  docker-compose.caddy.yml          # override: runs Caddy as the edge proxy
  docker-compose.s3.yml             # override: S3-compatible storage
  docker-compose.auth-templates.yml # OUR override: mounts OTP email templates into GoTrue
  Caddyfile                         # edge reverse-proxy config (mounted into supabase-caddy)
  .env                              # all Supabase/GoTrue secrets (JWT_SECRET, POSTGRES_PASSWORD, SMTP, etc.)
  gotrue-templates/                 # OUR OTP-only email templates (.html), mounted into supabase-auth

/home/deploy/lacunose-backend/      # Our Fastify edge-fn + BullMQ workers (git-deployed)
  docker-compose.yml                # Our services: edge-fn, worker-*, lacunose-web
  Dockerfile.edge-fn                # shared image for all our Node services
  .env                              # our backend secrets (OpenAI, Supabase service role, etc.)
  src/                              # TypeScript source (tsx runtime)

/home/deploy/lacunose-website/      # Next.js waitlist site
  Dockerfile                        # multi-stage build → `lacunose-web:latest`
  .env.local                        # Google service-account creds for Sheets write
  src/                              # Next.js 16 app router source
```

## Running services (`docker ps`)

All containers share the external Docker network `supabase_default`. Cross-container DNS works (e.g. Caddy reaches `lacunose-web:3000`, `kong:8000`, `lacunose-edge-fn:4000`).

| Container | Image | Role | Port |
|---|---|---|---|
| `supabase-caddy` | `caddy:2-alpine` | TLS + reverse proxy (only thing on :80/:443) | 80, 443 |
| `supabase-kong` | `kong` | Supabase API gateway | 8000 |
| `supabase-auth` | `supabase/gotrue:v2.186.0` | Auth (email OTP, OAuth) | 9999 (internal) |
| `supabase-rest` | `postgrest` | PostgREST | 3000 (internal) |
| `supabase-storage` | `supabase/storage-api` | Files | 5000 (internal) |
| `supabase-realtime` | `supabase/realtime` | WebSockets | (internal) |
| `supabase-studio` | `supabase/studio` | Admin UI (locked to `${SEIF_IP}`) | 3000 (internal) |
| `supabase-pooler` | `supabase/supavisor` | Postgres connection pool | 5432, 6543 |
| `supabase-db` | `supabase/postgres` | Primary Postgres 15 | (not exposed) |
| `supabase-meta` | `supabase/postgres-meta` | pg metadata for Studio | 8080 (internal) |
| `supabase-analytics` | `supabase/logflare` | Log ingestion | (internal) |
| `supabase-edge-functions` | `supabase/edge-runtime` | Deno edge functions | (internal) |
| `lacunose-redis` | `redis:7-alpine` | BullMQ queue + cache | 127.0.0.1:6379 |
| `lacunose-edge-fn` | `lacunose-edge-fn:latest` | Our Fastify API | 4000 (internal) |
| `lacunose-worker-{ingest,parse,embed,gap,critique,support}` | `lacunose-edge-fn:latest` | BullMQ workers | — |
| **`lacunose-web`** | **`lacunose-web:latest`** | **Next.js waitlist site** | **3000 (internal)** |

## Public URLs → container routing

Defined in `/root/supabase/docker/Caddyfile`:

| URL | → |
|---|---|
| `api.lacunose.com` | `kong:8000` (Supabase REST/Auth/Storage/Realtime) |
| `fn.lacunose.com` | `lacunose-edge-fn:4000` (our Fastify API the app talks to) |
| `lacunose.com`, `www.lacunose.com` | `lacunose-web:3000` (waitlist site) |
| `srv1607381.hstgr.cloud` | `kong:8000` (legacy) |

TLS is handled automatically by Caddy via Let's Encrypt. Nothing else is allowed to bind to :80/:443.

## How to update things

### Update the waitlist website

After editing anything in `f:/lacunose.com/website/`:

```bash
# 1. Push source to VPS (from Windows, in the website/ dir)
#    --exclude=.env.local is CRITICAL: the local copy points LACUNOSE_BACKEND_URL at
#    localhost:4000 for `next dev`, but prod needs http://lacunose-edge-fn:4000 (Docker
#    network DNS). Tar-piping .env.local will silently break /api/beta/analyze with
#    `upstream_failed`. Same goes for any file with values that differ between local
#    and prod (BETA_INVITE_CODE used to drift this way too).
cd f:/lacunose.com/website
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=deploy.sh \
    --exclude=.env.local --exclude=test-results --exclude=playwright-report \
    -cf - . | \
  ssh -i ~/.ssh/lacunose_deploy root@187.127.75.87 \
  'cd /home/deploy/lacunose-website && tar -xf - && chown -R deploy:deploy .'

# 2. Rebuild the image + restart the container
ssh -i ~/.ssh/lacunose_deploy root@187.127.75.87 \
  'cd /home/deploy/lacunose-backend && docker compose build lacunose-web && docker compose up -d lacunose-web'

# 3. Verify
curl -sI https://lacunose.com
# Also verify the proxy can reach the backend — should return 400 invalid_body, not
# 502 upstream_failed:
curl -s -X POST https://lacunose.com/api/beta/verify -H "Content-Type: application/json" \
     -d '{"code":"<invite>"}' -c /tmp/c.txt && \
  curl -s -X POST https://lacunose.com/api/beta/analyze -H "Content-Type: application/json" \
     -b /tmp/c.txt -d '{}'
```

If `.env.local` changed (new Google Sheet, new service account), it gets copied up by the tar-pipe above — but you also need to recreate the container (not just restart) so Docker re-reads `env_file`:

```bash
ssh ... 'cd /home/deploy/lacunose-backend && docker compose up -d --force-recreate lacunose-web'
```

### Update the backend (edge-fn or workers)

The backend lives in `/home/deploy/lacunose-backend/` on the VPS. There's no automated git pipeline yet — deploy is tar-pipe + rebuild, same pattern:

```bash
cd f:/lacunose.com/lacunose-backend
tar --exclude=node_modules --exclude=.git --exclude=.env -cf - . | \
  ssh -i ~/.ssh/lacunose_deploy root@187.127.75.87 \
  'cd /home/deploy/lacunose-backend && tar -xf - && chown -R deploy:deploy .'

# Rebuild the shared image (edge-fn + all workers use it)
ssh ... 'cd /home/deploy/lacunose-backend && docker compose build edge-fn && docker compose up -d'
```

If you only changed one worker's code, `docker compose up -d` reuses cached layers and restarts the affected containers — usually seconds.

### Update Caddy routing (add a subdomain, change a proxy target)

The live Caddyfile is at `/root/supabase/docker/Caddyfile` on the VPS (mounted into `supabase-caddy` read-only). Edit it directly, then reload:

```bash
ssh ... 'vim /root/supabase/docker/Caddyfile'
# OR edit locally and scp up:
scp -i ~/.ssh/lacunose_deploy ./Caddyfile root@187.127.75.87:/root/supabase/docker/Caddyfile

# Reload — note: Caddy's live reload via `caddy reload` DOESN'T always pick up
# host file changes due to a bind-mount inode issue. Just restart the container:
ssh ... 'docker restart supabase-caddy'

# Verify the mounted file matches the host file:
ssh ... 'docker exec supabase-caddy cat /etc/caddy/Caddyfile | tail -20'
```

> The Caddyfile at [`lacunose-backend/infra/Caddyfile`](lacunose-backend/infra/Caddyfile) in our repo is a **reference copy only** — it is NOT deployed. The live file is on the VPS at `/root/supabase/docker/Caddyfile`. Keep them in sync manually if you want the repo to stay honest.

### Update Supabase Auth email templates (OTP emails)

Templates live in `f:/lacunose.com/lacunose-backend/infra/gotrue-templates/` in the repo. On the VPS they're at `/root/supabase/docker/gotrue-templates/`.

```bash
# Edit locally, then upload:
cd f:/lacunose.com/lacunose-backend/infra
tar -cf - gotrue-templates | ssh ... 'cd /root/supabase/docker && tar -xf -'

# Restart auth to pick up new templates (they're mounted :ro, so Go's template cache needs a restart):
ssh ... 'cd /root/supabase/docker && docker compose \
  -f docker-compose.yml \
  -f docker-compose.s3.yml \
  -f docker-compose.caddy.yml \
  -f docker-compose.auth-templates.yml \
  up -d --force-recreate auth'

# Verify:
ssh ... 'docker exec supabase-auth head -5 /etc/gotrue/templates/magic_link.html'
ssh ... 'docker logs supabase-auth --tail 20'
```

Available template variables in GoTrue: `{{ .Token }}` (6-digit OTP), `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .TokenHash }}`. We deliberately do NOT use `{{ .ConfirmationURL }}` — it points at the Supabase dashboard and the app has no deep-link handler.

### Change Supabase env / secrets (SMTP creds, JWT secret, SITE_URL, etc.)

`/root/supabase/docker/.env` on the VPS. Edit, then:

```bash
ssh ... 'cd /root/supabase/docker && docker compose \
  -f docker-compose.yml -f docker-compose.s3.yml -f docker-compose.caddy.yml -f docker-compose.auth-templates.yml \
  up -d'
```

Only containers whose env actually changed will recreate.

### Update the Supabase stack itself (GoTrue, PostgREST, Storage versions)

Don't. The vendor compose is pinned. If you absolutely have to:

```bash
ssh ... 'cd /root/supabase && git fetch && git pull'
# Then review the diff in /root/supabase/docker/docker-compose.yml for breaking changes
# (especially JWT_KEYS, new required env vars). Apply with the full override chain.
```

Supabase self-hosted upgrades have historically required manual migrations and occasional env var renames. Budget real time.

## Common diagnostics

### "Site is down"

```bash
ssh ... 'docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "Up "'
# Any container NOT "Up" is the culprit. Get its logs:
ssh ... 'docker logs <name> --tail 100'
```

### "Caddy isn't serving my new subdomain"

1. `ssh ... 'docker exec supabase-caddy cat /etc/caddy/Caddyfile'` — does it show the expected block?
2. If yes but still 404: `docker restart supabase-caddy`. Bind-mount inode mismatch is the #1 cause.
3. Check DNS: `dig +short <subdomain>.lacunose.com` should return `187.127.75.87`.
4. Check TLS: `docker logs supabase-caddy --tail 50 | grep -i acme` for Let's Encrypt failures.

### "Magic link email still has the old link"

```bash
# Confirm the template file is what you expect:
ssh ... 'docker exec supabase-auth cat /etc/gotrue/templates/magic_link.html'

# Confirm env vars are set:
ssh ... 'docker inspect supabase-auth --format "{{range .Config.Env}}{{println .}}{{end}}" | grep TEMPLATES'

# Force a full recreate (template cache invalidation):
ssh ... 'cd /root/supabase/docker && docker compose -f docker-compose.yml -f docker-compose.s3.yml -f docker-compose.caddy.yml -f docker-compose.auth-templates.yml up -d --force-recreate auth'
```

### "Waitlist form submissions aren't showing up in the Google Sheet"

```bash
# Check the container can reach Google APIs and has the creds:
ssh ... 'docker logs lacunose-web --tail 50'
ssh ... 'docker exec lacunose-web env | grep GOOGLE'   # should show SHEET_ID + SERVICE_ACCOUNT_EMAIL

# Test the endpoint:
curl -X POST https://lacunose.com/api/waitlist -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
# Expect: {"success":true,"message":"Joined waitlist"}
```

If `GOOGLE_PRIVATE_KEY` got mangled during `.env.local` upload (newlines often do), the request will fail with a JWT signing error. The key must be a single line with `\n` as literal escape sequences OR a real multi-line value quoted properly.

### "I added something but the container didn't pick it up"

The order of cause, most → least common:

1. **Env file changed → need `--force-recreate`** (`docker compose restart` reuses the old env).
2. **Bind-mounted file changed via `sed -i` or editor that does atomic-rename → container has stale inode.** Fix: `docker restart <name>`.
3. **Image was rebuilt but container still running old image** → `docker compose up -d <name>` (not `restart`).
4. **Network cache** → unlikely here; `supabase_default` is stable.

## Backups worth knowing about

- Caddyfile edits leave `/root/supabase/docker/Caddyfile.bak.<timestamp>` files. Clean them up periodically.
- Postgres data is in the Docker volume `supabase_db_config` + `supabase_db_data`. There's no off-box backup configured yet — if you care about the DB, set up `pg_dump` to S3 before production traffic.
- `/var/lib/docker/volumes/supabase_caddy_data/` holds the Let's Encrypt certs. Don't delete unless you want a 1-hour ACME re-issue delay.

## Things I haven't automated but probably should eventually

- **CI deploy** — a GitHub Action on push to `master` that builds + rsyncs + restarts. Requires storing the SSH key as a secret.
- **Postgres backup** — nightly `pg_dump` piped to a bucket.
- **Monitoring** — nothing pages you if a container dies. `restart: unless-stopped` handles crashes but not OOMs that loop.
- **`.env` drift check** — repo doesn't track `.env` / `.env.local` (correctly), but there's no check that VPS values match the `.env.example` shape.

## Things I DID automate / leave for myself later

- [website/deploy.sh](website/deploy.sh) — hand-runnable deploy script, assumes `rsync` available (Windows git-bash doesn't have it, so the tar-pipe commands above are the real deploy path on your machine).
- [lacunose-backend/infra/gotrue-templates/README.md](lacunose-backend/infra/gotrue-templates/README.md) — how to apply the OTP templates on a fresh VPS.
- [lacunose-backend/infra/docker-compose.auth-templates.yml](lacunose-backend/infra/docker-compose.auth-templates.yml) — the override that mounts the templates + sets env vars.
