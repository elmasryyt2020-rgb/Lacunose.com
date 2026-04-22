#!/usr/bin/env bash
# Deploy the Lacunose waitlist website to the VPS.
#
# Prereqs (set as env vars or exported before running):
#   VPS_HOST   — e.g. vps.lacunose.com or 203.0.113.4
#   VPS_USER   — SSH user on the VPS (e.g. deploy)
#   SSH_KEY    — path to the private key, defaults to ~/.ssh/lacunose_deploy_ed25519
#
# Usage:
#   VPS_HOST=1.2.3.4 VPS_USER=deploy ./deploy.sh
#   VPS_HOST=1.2.3.4 VPS_USER=deploy ./deploy.sh --first-time   # also uploads .env.local
#
# Expects the following on the server:
#   /home/<VPS_USER>/lacunose-website/         — rsync target
#   /home/<VPS_USER>/lacunose-backend/         — clone of the backend repo holding ecosystem.config.cjs
#   pm2 installed globally, Node 20+

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

: "${VPS_HOST:?VPS_HOST is required}"
: "${VPS_USER:?VPS_USER is required}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/lacunose_deploy_ed25519}"
FIRST_TIME=0
for arg in "$@"; do
  case "$arg" in
    --first-time) FIRST_TIME=1 ;;
  esac
done

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)
REMOTE="${VPS_USER}@${VPS_HOST}"
REMOTE_DIR="/home/${VPS_USER}/lacunose-website"
BACKEND_DIR="/home/${VPS_USER}/lacunose-backend"

echo "==> Building Next.js site locally"
npm ci
npm run build

echo "==> Ensuring remote dir exists"
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p '$REMOTE_DIR'"

echo "==> rsync'ing site to $REMOTE:$REMOTE_DIR"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude 'node_modules' \
  --exclude '.next/cache' \
  --exclude '.env.local' \
  --exclude '.git' \
  --exclude 'deploy.sh' \
  ./ "$REMOTE:$REMOTE_DIR/"

if [[ "$FIRST_TIME" -eq 1 ]]; then
  echo "==> First-time deploy: uploading .env.local"
  scp "${SSH_OPTS[@]}" .env.local "$REMOTE:$REMOTE_DIR/.env.local"
  ssh "${SSH_OPTS[@]}" "$REMOTE" "chmod 600 '$REMOTE_DIR/.env.local'"
fi

echo "==> Installing production deps on remote"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '$REMOTE_DIR' && npm ci --omit=dev"

echo "==> Reloading PM2 web-waitlist app"
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd '$BACKEND_DIR' && pm2 startOrReload infra/ecosystem.config.cjs --only web-waitlist && pm2 save"

echo "==> Reloading Caddy (best-effort)"
ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo systemctl reload caddy 2>/dev/null || docker compose -f /home/${VPS_USER}/lacunose-backend/infra/docker-compose.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || echo 'WARN: reload Caddy manually'"

echo "==> Smoke test"
curl -sI "https://lacunose.com" | head -5 || echo "WARN: curl failed (DNS/TLS may still be propagating)"

echo "Done. Visit https://lacunose.com"
