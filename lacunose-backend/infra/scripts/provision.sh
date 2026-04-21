#!/usr/bin/env bash
# Provision / update a Hostinger KVM4 VPS for Lacunose.
# Idempotent — safe to re-run. Run as the `deploy` user with sudo privileges.
set -euo pipefail

REPO_DIR="/home/deploy/lacunose-backend"
NODE_VERSION="20"

echo "==> [1/10] apt update + baseline packages"
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  curl ca-certificates gnupg lsb-release \
  ufw fail2ban unattended-upgrades \
  build-essential git jq \
  python3 python3-pip python3-venv \
  postgresql-client-15 2>/dev/null || sudo apt-get install -y postgresql-client

echo "==> [2/10] firewall"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "==> [3/10] fail2ban"
sudo systemctl enable --now fail2ban

echo "==> [4/10] automatic security updates"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> [5/10] SSH hardening (key-only, no root)"
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh

echo "==> [6/10] Node.js ${NODE_VERSION} via NodeSource"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_VERSION" ]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> [7/10] PM2 (global) + logrotate"
sudo npm install -g pm2
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true

echo "==> [8/10] Python deps for PDF parsing"
python3 -m pip install --user --break-system-packages pymupdf

echo "==> [9/10] Docker group membership (for existing Supabase compose)"
if ! id -nG "$USER" | grep -qw docker; then
  sudo usermod -aG docker "$USER"
  echo "NOTE: log out and back in so 'docker' group applies."
fi

echo "==> [10/10] Caddy + Redis containers (via docker-compose.override.yml)"
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR"
  # Assumes the Supabase compose file is already running.
  # Caddy + Redis attach to the existing supabase_default network.
  docker compose -f infra/docker-compose.override.yml up -d
fi

echo ""
echo "✅ Provisioning complete."
echo "Next: cd $REPO_DIR && npm ci && npm run build && pm2 start infra/ecosystem.config.cjs && pm2 save"
