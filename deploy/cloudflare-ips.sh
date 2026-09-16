#!/usr/bin/env bash
# ==============================================================================
# EsportsAmaze — Cloudflare Real-IP Updater for Nginx
# Fetches official Cloudflare edge IP ranges and generates /etc/nginx/conf.d/cloudflare.conf
# ==============================================================================

set -euo pipefail

CONF_FILE="/etc/nginx/conf.d/cloudflare.conf"
TEMP_FILE=$(mktemp)

echo "# Cloudflare Real-IP Configuration (Generated $(date -u))" > "$TEMP_FILE"
echo "# Allows Nginx to see the real visitor IP behind Cloudflare proxy" >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

# Fetch IPv4 ranges
echo "# IPv4" >> "$TEMP_FILE"
curl -sL https://www.cloudflare.com/ips-v4 | while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;" >> "$TEMP_FILE"
done

# Fetch IPv6 ranges
echo "" >> "$TEMP_FILE"
echo "# IPv6" >> "$TEMP_FILE"
curl -sL https://www.cloudflare.com/ips-v6 | while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;" >> "$TEMP_FILE"
done

echo "" >> "$TEMP_FILE"
echo "real_ip_header CF-Connecting-IP;" >> "$TEMP_FILE"

# Only overwrite if output is non-empty and valid
if [ -s "$TEMP_FILE" ] && grep -q "set_real_ip_from" "$TEMP_FILE"; then
    mkdir -p /etc/nginx/conf.d
    mv "$TEMP_FILE" "$CONF_FILE"
    echo "✅ Successfully generated $CONF_FILE"
    if nginx -t >/dev/null 2>&1; then
        systemctl reload nginx 2>/dev/null || true
        echo "✅ Nginx reloaded with updated Cloudflare IP ranges."
    fi
else
    echo "❌ Error fetching Cloudflare IP list. Conf not modified." >&2
    rm -f "$TEMP_FILE"
    exit 1
fi
