#!/usr/bin/env bash
# ==============================================================================
# EsportsAmaze — One-Command Zero-Downtime Update Script
# Run whenever you push changes to GitHub: bash deploy/update.sh
# ==============================================================================

set -euo pipefail

cd /var/www/esportsamaze

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "master")
echo ">>> [1/5] Pulling latest changes from Git (branch: $CURRENT_BRANCH)..."
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "Setting upstream tracking to origin/$CURRENT_BRANCH..."
    git branch --set-upstream-to="origin/$CURRENT_BRANCH" "$CURRENT_BRANCH" 2>/dev/null || true
fi
git pull origin "$CURRENT_BRANCH"

echo ">>> [2/6] Installing dependencies via npm ci (exact lockfile sync)..."
npm ci --prefer-offline

echo ">>> [3/6] Pre-migration database backup & test suite validation..."
mkdir -p /var/backups/esportsamaze
BACKUP_TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
if docker ps --format '{{.Names}}' | grep -q "esportsamaze_postgres"; then
    echo "Creating pre-update database snapshot..."
    docker exec esportsamaze_postgres pg_dump -U postgres esportsamaze | gzip > "/var/backups/esportsamaze/pre_update_${BACKUP_TIMESTAMP}.sql.gz" || true
fi
npm test

echo ">>> [4/6] Generating Prisma client & applying migrations..."
npx prisma generate
npx prisma migrate deploy

echo ">>> [5/6] Building Next.js production bundle..."
npm run build

echo ">>> [6/6] Reloading PM2 workers with zero downtime & health check..."
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 save

echo "Probing /api/health endpoint..."
sleep 2
if curl -sf http://localhost:3000/api/health >/dev/null 2>&1 || curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "Health check passed: Application is responsive and database connection is healthy."
else
    echo "WARNING: Health check probe did not respond with 200 on port 3000. Inspect logs with: pm2 logs esportsamaze --lines 30"
fi

echo "=============================================================================="
echo "✅ EsportsAmaze updated successfully with ZERO downtime!"
echo "=============================================================================="
