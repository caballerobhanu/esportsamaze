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
DB_FILE="$BACKUP_DIR/db_$DATE.sql.gz"
if docker ps --format '{{.Names}}' | grep -q "esportsamaze_postgres"; then
    if docker exec esportsamaze_postgres pg_dump -U postgres esportsamaze | gzip > "$DB_FILE"; then
        FILE_SIZE=$(wc -c < "$DB_FILE" 2>/dev/null || stat -c %s "$DB_FILE" 2>/dev/null || echo 0)
        if [ "$FILE_SIZE" -gt 100 ]; then
            echo "[$DATE] Database backup saved successfully ($FILE_SIZE bytes): $DB_FILE"
        else
            echo "[$DATE] ERROR: Database backup produced suspiciously small or empty file ($FILE_SIZE bytes)." >&2
            exit 1
        fi
    else
        echo "[$DATE] ERROR: docker exec pg_dump command failed." >&2
        exit 1
    fi
else
    echo "[$DATE] ERROR: PostgreSQL container 'esportsamaze_postgres' is not running." >&2
    exit 1
fi

# 2. Backup uploaded media files
if [ -d "/var/www/esportsamaze/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /var/www/esportsamaze uploads
    echo "[$DATE] Media backup saved: $BACKUP_DIR/uploads_$DATE.tar.gz"
fi

# 3. Prune backups older than 14 days so the disk never fills up
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +14 -delete
echo "[$DATE] Pruning completed (kept past 14 days of daily backups)."
echo "[$DATE] Backup finished successfully!"
