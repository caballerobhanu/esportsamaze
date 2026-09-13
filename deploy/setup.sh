#!/usr/bin/env bash
# ==============================================================================
# EsportsAmaze — Production Server Provisioner (Hostinger KVM / Ubuntu 24.04 LTS)
# Automated setup for: 4 vCPU / 8-16 GB RAM / Cloudflare Edge / Next.js 16 / Postgres 16
# Run as root on your blank VPS: bash deploy/setup.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/esportsamaze"
CACHE_DIR="/var/cache/nginx/esportsamaze"

echo "=============================================================================="
echo ">>> [1/12] System Updates & Core Utilities..."
echo "=============================================================================="
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y
apt-get install -y software-properties-common
add-apt-repository -y universe || true
apt-get update
apt-get install -y curl git ufw nginx fail2ban unattended-upgrades \
  ca-certificates gnupg htop logrotate
apt-get install -y certbot python3-certbot-nginx || apt-get install -y certbot || true

echo "=============================================================================="
echo ">>> [2/12] Configuring 4GB Swap Space (swappiness=10)..."
echo "=============================================================================="
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "✅ 4GB Swap initialized (prevents OOM during heavy builds and peak traffic)."
else
    echo "Swapfile already exists."
fi

echo "=============================================================================="
echo ">>> [3/12] Hardening System Limits (File Descriptors 65,535)..."
echo "=============================================================================="
if ! grep -q "nofile 65535" /etc/security/limits.conf; then
    cat << 'EOF' >> /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF
fi

echo "=============================================================================="
echo ">>> [4/12] Configuring UFW Firewall & Fail2ban Shield..."
echo "=============================================================================="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable fail2ban
systemctl restart fail2ban
echo "✅ UFW Firewall & Fail2ban enabled."

echo "=============================================================================="
echo ">>> [5/12] SSH Hardening Verification..."
echo "=============================================================================="
if [ -f /root/.ssh/authorized_keys ] && [ -s /root/.ssh/authorized_keys ]; then
    mkdir -p /etc/ssh/sshd_config.d
    cat << 'EOF' > /etc/ssh/sshd_config.d/99-hardened.conf
# SSH Hardening: Key-only authentication enforced
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
EOF
    systemctl reload ssh || systemctl reload sshd || true
    echo "✅ SSH Key detected: Password authentication disabled."
else
    echo "⚠️ NOTICE: No SSH keys found in /root/.ssh/authorized_keys."
    echo "Password authentication left ACTIVE to prevent accidental lockout."
fi

echo "=============================================================================="
echo ">>> [6/12] Installing Node.js 22 LTS & PM2 Production Process Manager..."
echo "=============================================================================="
if ! command -v node &> /dev/null || [[ "$(node -v)" != v22* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 20M || true
pm2 set pm2-logrotate:retain 7 || true
echo "✅ Node.js $(node -v) & PM2 installed."

echo "=============================================================================="
echo ">>> [7/12] Installing Docker & Docker Compose v2..."
echo "=============================================================================="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh || apt-get install -y docker.io docker-compose-v2
    systemctl enable docker
    systemctl start docker
fi
echo "✅ Docker $(docker --version) ready."

echo "=============================================================================="
echo ">>> [8/12] Configuring Nginx Microcache & Cloudflare Real-IP Ranges..."
echo "=============================================================================="
mkdir -p "$CACHE_DIR"
chown -R www-data:www-data "$CACHE_DIR"
chmod 750 "$CACHE_DIR"

if [ -f "$APP_DIR/deploy/cloudflare-ips.sh" ]; then
    chmod +x "$APP_DIR/deploy/cloudflare-ips.sh"
    bash "$APP_DIR/deploy/cloudflare-ips.sh" || true
fi

echo "=============================================================================="
echo ">>> [9/12] Verifying Application Directory & Environment Configuration..."
echo "=============================================================================="
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -f "package.json" ]; then
    echo "❌ ERROR: No package.json found in $APP_DIR"
    echo "Please clone your repository into $APP_DIR first:"
    echo "  git clone <YOUR_GIT_REPO_URL> $APP_DIR"
    exit 1
fi

if [ ! -f ".env" ]; then
    if [ -f "deploy/.env.example" ]; then
        cp deploy/.env.example .env
        RAND_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
        sed -i "s/replace_with_openssl_rand_hex_32_output/$RAND_SECRET/" .env
        echo "Created .env from deploy/.env.example with auto-generated ADMIN_SESSION_SECRET."
        echo "⚠️ Remember to edit .env to review ADMIN_PASSWORD and DATABASE_URL."
    else
        echo "❌ ERROR: .env file missing in $APP_DIR."
        exit 1
    fi
fi
chmod 600 .env
echo "✅ Strict permissions enforced: .env set to chmod 600."

echo "=============================================================================="
echo ">>> [10/12] Launching Tuned PostgreSQL 16 Container (docker-compose)..."
echo "=============================================================================="
if [ -f "docker-compose.yml" ]; then
    docker compose up -d
    echo "Waiting for PostgreSQL healthcheck..."
    for i in {1..30}; do
        if docker exec esportsamaze_postgres pg_isready -U postgres -d esportsamaze >/dev/null 2>&1; then
            echo "✅ PostgreSQL is healthy and responding on 127.0.0.1:5433."
            break
        fi
        sleep 1
    done
fi

echo "=============================================================================="
echo ">>> [11/12] Installing Dependencies (npm ci), Prisma Deploy & Next.js Build..."
echo "=============================================================================="
npm ci --prefer-offline
npx prisma generate
npx prisma migrate deploy
npm run build

echo "=============================================================================="
echo ">>> [12/12] Starting PM2 Cluster (3 Workers) & Setting Up Cron Backups..."
echo "=============================================================================="
pm2 delete esportsamaze 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
STARTUP_CMD=$(pm2 startup systemd -u root --hp /root | grep -E '^sudo env|^env ' || true)
if [ -n "$STARTUP_CMD" ]; then
    eval "$STARTUP_CMD" || true
fi
pm2 save

chmod +x deploy/backup-cron.sh
chmod +x deploy/update.sh
(crontab -l 2>/dev/null | grep -v "backup-cron.sh" ; echo "0 3 * * * /bin/bash $APP_DIR/deploy/backup-cron.sh > /dev/null 2>&1") | crontab -
(crontab -l 2>/dev/null | grep -v "cloudflare-ips.sh" ; echo "0 4 1 * * /bin/bash $APP_DIR/deploy/cloudflare-ips.sh > /dev/null 2>&1") | crontab -

echo "=============================================================================="
echo "🎉 SERVER PROVISIONING COMPLETE!"
echo ""
echo "Final steps to activate your site via Cloudflare:"
echo ""
echo "1. Activate Nginx reverse proxy:"
echo "   cp deploy/nginx.conf /etc/nginx/sites-available/esportsamaze.com"
echo "   ln -sf /etc/nginx/sites-available/esportsamaze.com /etc/nginx/sites-enabled/"
echo "   rm -f /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "2. SSL Certificate (Choose ONE):"
echo "   A) Let's Encrypt automated cert:"
echo "      certbot --nginx -d esportsamaze.com -d www.esportsamaze.com"
echo "   B) Cloudflare Origin CA (Recommended for Cloudflare Full Strict):"
echo "      Paste Cloudflare Origin Cert into /etc/ssl/certs/esportsamaze.crt"
echo "      Paste Cloudflare Private Key into /etc/ssl/private/esportsamaze.key"
echo "=============================================================================="
