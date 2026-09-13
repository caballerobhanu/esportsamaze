#!/usr/bin/env bash
# ==============================================================================
# EsportsAmaze — Automated Nightly Backup Script (Database + Uploads)
# Runs via cron: 0 3 * * * /bin/bash /var/www/esportsamaze/deploy/backup-cron.sh
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/esportsamaze"
DATE=$(date +"%Y-%m-%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup routine..."

# 1. Backup PostgreSQL database from Docker container and compress with gzip
DB_FILE="$BACKUP_DIR/db_$DATE.sql.gz"
if docker ps --format '{{.Names}}' | grep -q "esportsamaze_postgres"; then
    if docker exec esportsamaze_postgres pg_dump -U postgres esportsamaze | gzip > "$DB_FILE"; then
        FILE_SIZE=$(wc -c < "$DB_FILE" 2>/dev/null || stat -c %s "$DB_FILE" 2>/dev/null || echo 0)
        if [ "$FILE_SIZE" -gt 100 ]; then
            echo "[$DATE] Database backup saved ($FILE_SIZE bytes): $DB_FILE"
            # Verify gzip integrity
            if gzip -t "$DB_FILE" >/dev/null 2>&1; then
                echo "[$DATE] Gzip archive integrity check: OK"
            else
                echo "[$DATE] ERROR: Gzip integrity check failed for $DB_FILE" >&2
                exit 1
            fi
        else
            echo "[$DATE] ERROR: Database backup produced suspiciously small file ($FILE_SIZE bytes)." >&2
            exit 1
        fi
    else
        echo "[$DATE] ERROR: pg_dump execution failed." >&2
        exit 1
    fi
else
    echo "[$DATE] ERROR: PostgreSQL container 'esportsamaze_postgres' is not running." >&2
    exit 1
fi

# 2. Backup uploaded media files (logos, player photos, banners)
if [ -d "/var/www/esportsamaze/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /var/www/esportsamaze uploads
    echo "[$DATE] Media backup saved: $BACKUP_DIR/uploads_$DATE.tar.gz"
fi

# 3. Optional: Offsite Sync to Cloudflare R2 / S3 via rclone (if configured)
if command -v rclone &> /dev/null && rclone listremotes | grep -q "^r2:"; then
    echo "[$DATE] Syncing backups to Cloudflare R2 offsite bucket..."
    rclone copy "$DB_FILE" "r2:esportsamaze-backups/database/" --quiet || true
    if [ -f "$BACKUP_DIR/uploads_$DATE.tar.gz" ]; then
        rclone copy "$BACKUP_DIR/uploads_$DATE.tar.gz" "r2:esportsamaze-backups/media/" --quiet || true
    fi
    echo "[$DATE] Cloudflare R2 offsite sync complete."
fi

# 4. Prune local backups older than 14 days so the disk never fills up
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +14 -delete
echo "[$DATE] Local pruning completed (retained past 14 days of backups)."
echo "[$DATE] Backup finished successfully!"
