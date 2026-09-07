#!/usr/bin/env bash
# ==============================================================================
# EsportsAmaze — Automated Nightly Backup Script (Database + Uploads)
# Runs via cron: 0 3 * * * /bin/bash /var/www/esportsamaze/deploy/backup-cron.sh
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/esportsamaze"
DATE=$(date +"%Y-%m-%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

# 1. Backup PostgreSQL database from Docker container and compress with gzip
if docker ps --format '{{.Names}}' | grep -q "esportsamaze_postgres"; then
    docker exec -t esportsamaze_postgres pg_dump -U postgres esportsamaze | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
    echo "[$DATE] Database backup saved: $BACKUP_DIR/db_$DATE.sql.gz"
else
    echo "[$DATE] Warning: PostgreSQL container 'esportsamaze_postgres' is not running."
fi

# 2. Backup uploaded media files
if [ -d "/var/www/esportsamaze/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /var/www/esportsamaze uploads
    echo "[$DATE] Media backup saved: $BACKUP_DIR/uploads_$DATE.tar.gz"
fi

# 3. Prune backups older than 14 days so the 200GB disk never fills up
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +14 -exec rm {} \;
echo "[$DATE] Pruning completed (kept past 14 days of daily backups)."
echo "[$DATE] Backup finished successfully!"
