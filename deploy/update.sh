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

echo ">>> [2/5] Installing dependencies via npm ci (exact lockfile sync)..."
npm ci --prefer-offline

echo ">>> [3/5] Generating Prisma client & applying migrations..."
npx prisma generate
npx prisma migrate deploy

echo ">>> [4/5] Building Next.js production bundle..."
npm run build

echo ">>> [5/5] Reloading PM2 workers with zero downtime..."
pm2 reload deploy/ecosystem.config.cjs --update-env

echo "=============================================================================="
echo "✅ EsportsAmaze updated successfully with ZERO downtime!"
echo "=============================================================================="
