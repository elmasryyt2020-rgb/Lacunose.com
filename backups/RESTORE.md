# VPS Restore Guide

This folder contains the full VPS backup created on 2026-05-18.

## Current Backup

- Bundle: `backups/lacunose-vps-20260518-050824.bundle.tgz`
- SHA256 file: `backups/lacunose-vps-20260518-050824.bundle.tgz.sha256`
- Size: `5,475,068,474` bytes
- SHA256: `4dcfdae0df4209bcfe1839eca646b7431198dc1fd224d628dea5207ae32d6f82`
- Remote copy also exists on the old VPS at `/root/backups/lacunose-vps-20260518-050824.bundle.tgz`

This backup contains production secrets, SSH material, environment files, database dumps, Redis data, Docker volumes, server config, and Docker images. Keep it private.

## One Command From This Windows Machine

After buying a new VPS, make sure root SSH works, then run this from `F:\lacunose.com`:

```powershell
powershell -ExecutionPolicy Bypass -File .\backups\restore-to-new-vps.ps1 -Host <NEW_VPS_IP> -KeyPath "$env:USERPROFILE\.ssh\<ROOT_SSH_KEY>"
```

The helper uploads the bundle and checksum to `/root`, verifies the checksum on the new VPS, extracts the bundle, and runs the bundled restore script.

## One Command On The New VPS

If the bundle has already been uploaded to `/root/lacunose-vps-20260518-050824.bundle.tgz`, SSH into the new VPS as root and run:

```bash
sudo bash -lc 'set -euo pipefail; B=/root/lacunose-vps-20260518-050824.bundle.tgz; D=/root/lacunose-vps-20260518-050824; rm -rf "$D"; tar -xzf "$B" -C /root; bash "$D/restore/restore-vps.sh" "$D"'
```

## What The Restore Does

- Installs baseline packages and Docker if missing.
- Creates the `deploy` user if missing.
- Restores `/root/supabase/docker`, Lacunose backend, Lacunose website, MOH chatbot files, SSH config, UFW, fail2ban, and systemd unit files.
- Loads the saved Docker images.
- Restores all Docker named volumes, including Redis, Caddy, Supabase config, deno cache, and MinIO data.
- Starts Supabase, restores Postgres from `pg_dumpall`, then starts the full Supabase stack.
- Starts the Lacunose backend, workers, website, and MOH chatbot.
- Applies the firewall baseline for SSH, HTTP, and HTTPS.

## After Restore

1. Point DNS records for `lacunose.com`, `www.lacunose.com`, `api.lacunose.com`, and `fn.lacunose.com` to the new VPS IP.
2. Wait for DNS propagation, then let Caddy issue fresh Let's Encrypt certificates.
3. Check containers:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
```

4. Check health endpoints:

```bash
curl -fsS https://fn.lacunose.com/v1/health
curl -fsS https://fn.lacunose.com/v1/ready
curl -fsSI https://lacunose.com
```

## Notes

- The restore script uses the logical Postgres dump as the source of truth. The physical Postgres data directory from the file archive is moved aside during restore.
- Running restore on a non-empty server can overwrite files, Docker volumes, and container state. Use a fresh VPS.
- The backup was verified locally by comparing its SHA256 against the server-generated checksum.
