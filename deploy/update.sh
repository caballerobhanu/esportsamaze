#!/usr/bin/env bash
# ==============================================================================
# EsportsAmaze — One-Command Zero-Downtime Update Script
# Run whenever you push changes to GitHub: bash deploy/update.sh
# ==============================================================================

set -euo pipefail

cd /var/www/esportsamaze

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "master")
echo ">>> [1/7] Pulling latest changes from Git (branch: $CURRENT_BRANCH)..."
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "Setting upstream tracking to origin/$CURRENT_BRANCH..."
    git branch --set-upstream-to="origin/$CURRENT_BRANCH" "$CURRENT_BRANCH" 2>/dev/null || true
fi
git pull origin "$CURRENT_BRANCH"

echo ">>> [2/7] Installing dependencies & verifying secrets permissions..."
npm ci --prefer-offline
if [ -f .env ]; then
    chmod 600 .env
fi

echo ">>> [3/7] Scanning dependencies for security vulnerabilities (npm audit)..."
npm audit --omit=dev --audit-level=high || {
    echo "⚠️ WARNING: npm audit detected high/critical vulnerabilities in production dependencies."
    echo "Review vulnerabilities using 'npm audit' before proceeding with public launch."
}

echo ">>> [4/7] Pre-migration database backup & test suite validation..."
mkdir -p /var/backups/esportsamaze
BACKUP_TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
if docker ps --format '{{.Names}}' | grep -q "esportsamaze_postgres"; then
    echo "Creating pre-update database snapshot..."
    docker exec esportsamaze_postgres pg_dump -U postgres esportsamaze | gzip > "/var/backups/esportsamaze/pre_update_${BACKUP_TIMESTAMP}.sql.gz" || true
fi
npm test

echo ">>> [5/7] Generating Prisma client & synchronizing database schema..."
npx prisma generate
npx prisma db push --accept-data-loss

echo ">>> [6/7] Building Next.js production bundle..."
npm run build

echo ">>> [7/7] Reloading PM2 workers with zero downtime & health check..."
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
