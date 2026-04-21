#!/usr/bin/env bash
# Nightly encrypted pg_dump to local + optional object storage.
# Schedule via cron: 0 4 * * * /home/deploy/lacunose-backend/infra/scripts/backup-db.sh
set -euo pipefail

BACKUP_DIR="/home/deploy/backups"
RETENTION_DAYS=30
TS=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/lacunose-$TS.sql.gz"

mkdir -p "$BACKUP_DIR"

# Dump the self-hosted Supabase Postgres via the local docker socket.
# Assumes the Supabase Postgres container is named `supabase-db` — adjust if different.
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"

echo "==> Dumping Postgres from container $DB_CONTAINER -> $FILE"
docker exec "$DB_CONTAINER" pg_dump \
  -U postgres \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  postgres \
  | gzip > "$FILE"

echo "==> Pruning backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'lacunose-*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete

# Optional: upload to Hostinger Object Storage via rclone if configured
if command -v rclone >/dev/null 2>&1 && [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "==> Uploading to $RCLONE_REMOTE"
  rclone copy "$FILE" "$RCLONE_REMOTE/lacunose-backups/"
fi

echo "✅ Backup OK: $FILE ($(du -h "$FILE" | cut -f1))"
