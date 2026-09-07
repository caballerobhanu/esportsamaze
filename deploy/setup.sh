#!/usr/bin/env bash
# ==============================================================================
# EsportsAmaze — Hostinger KVM 4 Production Server Provisioner
# Automated setup for Ubuntu 22.04 / 24.04 / 26.04 LTS
# Run as root on your VPS: bash deploy/setup.sh
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/esportsamaze"

echo "=============================================================================="
echo ">>> [1/11] System Updates & Core Utilities..."
echo "=============================================================================="
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx \
  fail2ban unattended-upgrades ca-certificates gnupg htop logrotate

echo "=============================================================================="
echo ">>> [2/11] Configuring 4GB Swap Space & Swappiness..."
echo "=============================================================================="
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "✅ 4GB Swap initialized (swappiness=10)."
else
    echo "Swapfile already exists."
fi

echo "=============================================================================="
echo ">>> [3/11] Hardening System Limits (File Descriptors)..."
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
echo ">>> [4/11] Configuring UFW Firewall & Fail2ban (Brute-Force Shield)..."
echo "=============================================================================="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable fail2ban
systemctl restart fail2ban

echo "=============================================================================="
echo ">>> [5/11] SSH Hardening Check..."
echo "=============================================================================="
if [ -f /root/.ssh/authorized_keys ] && [ -s /root/.ssh/authorized_keys ]; then
    mkdir -p /etc/ssh/sshd_config.d
    cat << 'EOF' > /etc/ssh/sshd_config.d/99-hardened.conf
# SSH Hardening: Disable password logins (keys only)
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
EOF
    systemctl reload ssh || systemctl reload sshd || true
    echo "✅ SSH Key detected: Password authentication disabled (key-only login enforced)."
else
    echo "⚠️ NOTICE: No SSH keys found in /root/.ssh/authorized_keys."
    echo "Password authentication kept ACTIVE so you are not locked out."
    echo "To enforce key-only SSH later, add your public key to ~/.ssh/authorized_keys and run:"
    echo "  echo 'PasswordAuthentication no' > /etc/ssh/sshd_config.d/99-hardened.conf && systemctl reload ssh"
fi

echo "=============================================================================="
echo ">>> [6/11] Installing Node.js 22 LTS & PM2..."
echo "=============================================================================="
if ! command -v node &> /dev/null || [[ "$(node -v)" != v22* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 20M || true
pm2 set pm2-logrotate:retain 7 || true

echo "=============================================================================="
echo ">>> [7/11] Installing Docker & Docker Compose..."
echo "=============================================================================="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh || apt-get install -y docker.io docker-compose-v2
    systemctl enable docker
    systemctl start docker
fi

echo "=============================================================================="
echo ">>> [8/11] Verifying Application Directory & Environment..."
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
        echo "⚠️ Remember to edit .env and set your custom ADMIN_PASSWORD and DATABASE_URL."
    else
        echo "❌ ERROR: .env file missing in $APP_DIR."
        exit 1
    fi
fi

echo "=============================================================================="
echo ">>> [9/11] Starting PostgreSQL Database Container..."
echo "=============================================================================="
if [ -f "docker-compose.yml" ]; then
    docker compose up -d
    echo "Waiting 5 seconds for PostgreSQL container to initialize..."
    sleep 5
fi

echo "=============================================================================="
echo ">>> [10/11] Installing Dependencies (npm ci) & Building Next.js..."
echo "=============================================================================="
npm ci --prefer-offline
npx prisma generate
npx prisma migrate deploy
npm run build

echo "=============================================================================="
echo ">>> [11/11] Starting PM2 Cluster & Scheduled Backups..."
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

echo "=============================================================================="
echo "🎉 SERVER PROVISIONING COMPLETE!"
echo ""
echo "Final 3 commands to finish putting your site live:"
echo ""
echo "1. Verify PM2 reboot persistence (if not already enabled above):"
echo "   pm2 save && pm2 startup"
echo ""
echo "2. Enable Nginx reverse proxy:"
echo "   cp deploy/nginx.conf /etc/nginx/sites-available/esportsamaze.com"
echo "   ln -sf /etc/nginx/sites-available/esportsamaze.com /etc/nginx/sites-enabled/"
echo "   rm -f /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Issue free SSL certificate via Let's Encrypt:"
echo "   certbot --nginx -d esportsamaze.com -d www.esportsamaze.com"
echo "=============================================================================="
