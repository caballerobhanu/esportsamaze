# 🚀 EsportsAmaze — Master Production VPS Deployment Guide
**Target System:** Hostinger KVM 4 (Ubuntu 24.04 LTS, 4 vCPU, 8–16 GB RAM)  
**Edge CDN:** Cloudflare Free Tier  
**Stack:** Nginx (Micro-caching + Real-IP) ➔ PM2 (3 Cluster Workers) ➔ Next.js 16 ➔ PostgreSQL 16 (Tuned NVMe Docker Container)

---

## 🏗️ Architecture & Traffic Flow

```
                     Internet Users
                           │
                           ▼
          ┌──────────────────────────────────┐
          │     Cloudflare Global Anycast    │  <-- DDoS protection, Edge SSL, HTTP/3,
          │            (Free Tier)           │      Edge asset caching (300+ PoPs)
          └──────────────────────────────────┘
                           │
                Port 443 (Full Strict SSL)
                           │
                           ▼
          ┌──────────────────────────────────┐
          │         Nginx Reverse Proxy      │  <-- Real-IP resolver, rate limiter (anti-brute force),
          │       + NVMe SSD Micro-Cache     │      Gzip compression, instant stale-while-revalidate
          └──────────────────────────────────┘
                           │
                Port 3000 (Internal Loopback)
                           │
                           ▼
          ┌──────────────────────────────────┐
          │      PM2 Cluster (3 Workers)     │  <-- Zero-downtime rolling reload, 1.5GB RAM ceiling,
          │         Next.js 16 Engine        │      Node.js 22 LTS, ISR revalidation
          └──────────────────────────────────┘
                           │
                Port 5433 (127.0.0.1 Loopback)
                           │
                           ▼
          ┌──────────────────────────────────┐
          │   Dockerized PostgreSQL 16       │  <-- Tuned for NVMe SSD: shared_buffers=2GB,
          │      (Persistent NVMe Volume)    │      work_mem=16MB, random_page_cost=1.1
          └──────────────────────────────────┘
```

---

## 💰 Cost & Efficiency Breakdown

| Component | Cost | Why This Choice? |
| :--- | :--- | :--- |
| **Hostinger KVM 4** | Existing plan | 4 vCPU, 8-16 GB RAM is plenty of headroom for tens of thousands of concurrent users. |
| **Cloudflare** | **$0 / month** (Free) | Offloads 70–90% of global bandwidth, hides origin IP, protects against L3/L4/L7 DDoS. |
| **PostgreSQL 16** | **$0 / month** (Docker) | Runs locally on high-speed NVMe SSD with 2GB shared buffers; no expensive managed DB fees. |
| **Nginx Micro-Cache** | **$0 / month** (Built-in) | Absorbs tournament traffic spikes by caching public reads for 30s. Zero DB hits for concurrent readers. |
| **SSL Certificates** | **$0 / month** | Cloudflare Edge SSL + Cloudflare Origin CA (15-year validity) or Let's Encrypt. |
| **Offsite Backups** | **$0 / month** | Cloudflare R2 (10GB free tier, $0 egress). |

---

## 📋 Pre-Requisite: Cloudflare DNS Setup

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Select your domain (`esportsamaze.com`).
3. Under **DNS ➔ Records**, add:
   - **Type:** `A` | **Name:** `@` | **IPv4 address:** `<YOUR_VPS_IP>` | **Proxy status:** `Proxied (Orange cloud)`
   - **Type:** `CNAME` | **Name:** `www` | **Target:** `esportsamaze.com` | **Proxy status:** `Proxied (Orange cloud)`
4. Under **SSL/TLS**:
   - Set encryption mode to **Full (strict)**.

---

## 🛠️ Step-by-Step Setup on Blank VPS

### Step 1: Connect to your Blank VPS via SSH
From your local terminal (PowerShell, macOS Terminal, or Linux):
```bash
ssh root@<YOUR_VPS_IP>
```

### Step 2: Clone the Repository to `/var/www/esportsamaze`
```bash
# Create web root and clone your repository
mkdir -p /var/www
git clone https://github.com/<YOUR_GITHUB_USER>/esportsamaze.git /var/www/esportsamaze
cd /var/www/esportsamaze
```

### Step 3: Run the Automated Provisioner
Run the setup script. This script handles system upgrades, 4GB swap space, system limits, Docker installation, Node.js 22 LTS, PM2, firewall rules, and Cloudflare Real-IP extraction:
```bash
bash deploy/setup.sh
```

---

## 🔐 Step 4: Configure Production Environment (`.env`)

Edit your `.env` file with your production secrets:
```bash
nano /var/www/esportsamaze/.env
```

Ensure the following variables are set:
```env
NODE_ENV="production"
PORT=3000

# 1. Database connection to the local Docker PostgreSQL container
DATABASE_URL="postgresql://postgres:YOUR_STRONG_DB_PASSWORD@127.0.0.1:5433/esportsamaze?schema=public"

# 2. Docker container credentials (must match DATABASE_URL password)
POSTGRES_DB="esportsamaze"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="YOUR_STRONG_DB_PASSWORD"

# 3. Secure Admin Auth
ADMIN_PASSWORD="YOUR_SECURE_ADMIN_PASSWORD"
ADMIN_SESSION_SECRET="AUTO_GENERATED_BY_SETUP_SH_OR_RANDOM_HEX_64"

# 4. Canonical Site URL
NEXT_PUBLIC_SITE_URL="https://esportsamaze.com"
```
Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

Apply the database password to the container and run migrations:
```bash
# Restart postgres with the new password
docker compose down && docker compose up -d

# Generate Prisma client and deploy schema
npx prisma generate
npx prisma migrate deploy

# (Optional) Seed initial data if starting fresh:
npm run db:seed
```

---

## 🌐 Step 5: Activate Nginx & SSL

### 1. Link Nginx Configuration
```bash
cp /var/www/esportsamaze/deploy/nginx.conf /etc/nginx/sites-available/esportsamaze.com
ln -sf /etc/nginx/sites-available/esportsamaze.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
```

### 2. Issue SSL Certificate

#### Option A: Cloudflare Origin CA (Recommended for Cloudflare Full Strict)
1. On Cloudflare: go to **SSL/TLS ➔ Origin Server ➔ Create Certificate**.
2. Keep default RSA 2048, validity 15 years, hostnames `esportsamaze.com`, `*.esportsamaze.com`.
3. Create the certificate directory on your VPS:
   ```bash
   mkdir -p /etc/ssl/cloudflare
   ```
4. Save the Origin Certificate:
   ```bash
   nano /etc/ssl/cloudflare/esportsamaze.crt
   # (Paste the Origin Certificate block, save and exit)
   ```
5. Save the Private Key:
   ```bash
   nano /etc/ssl/cloudflare/esportsamaze.key
   # (Paste the Private Key block, save and exit)
   chmod 600 /etc/ssl/cloudflare/esportsamaze.key
   ```
6. Update SSL paths in `/etc/nginx/sites-available/esportsamaze.com`:
   ```bash
   sed -i 's|/etc/letsencrypt/live/esportsamaze.com/fullchain.pem|/etc/ssl/cloudflare/esportsamaze.crt|g' /etc/nginx/sites-available/esportsamaze.com
   sed -i 's|/etc/letsencrypt/live/esportsamaze.com/privkey.pem|/etc/ssl/cloudflare/esportsamaze.key|g' /etc/nginx/sites-available/esportsamaze.com
   ```

#### Option B: Let's Encrypt Certbot
```bash
certbot --nginx -d esportsamaze.com -d www.esportsamaze.com
```

### 3. Reload Nginx
```bash
nginx -t && systemctl reload nginx
```

---

## ⚡ Step 6: Start Application in PM2 Cluster Mode

```bash
cd /var/www/esportsamaze
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

Verify your app is running:
```bash
pm2 status
curl -I https://esportsamaze.com
```

Check the response headers! You should see:
- `x-cache-status: HIT` or `MISS` (served by Nginx micro-cache)
- `cf-cache-status: DYNAMIC` or `HIT` (served by Cloudflare)

---

## 🔄 Daily Operations & Zero-Downtime Updates

Whenever you make code updates or push fixes to GitHub, deploy them to your VPS with **one command**:

```bash
ssh root@<YOUR_VPS_IP> "bash /var/www/esportsamaze/deploy/update.sh"
```

What `deploy/update.sh` does automatically:
1. Pulls the latest commits from Git.
2. Runs pre-update database snapshot into `/var/backups/esportsamaze/`.
3. Validates the test suite (`npm test`).
4. Applies any new Prisma migrations (`prisma migrate deploy`).
5. Builds the production Next.js assets (`npm run build`).
6. Executes rolling reload of PM2 workers (`pm2 reload deploy/ecosystem.config.cjs`).
7. Verifies healthcheck endpoint (`/api/health`).

---

## 🛡️ Monitoring, Logs & Health Checks

- **Live PM2 Resource Monitor:**
  ```bash
  pm2 monit
  ```
- **View Real-Time Application Logs:**
  ```bash
  pm2 logs esportsamaze --lines 50
  ```
- **View Nginx Real-Time Access & Error Logs:**
  ```bash
  tail -f /var/log/nginx/access.log
  tail -f /var/log/nginx/error.log
  ```
- **Inspect PostgreSQL Performance & Connections:**
  ```bash
  docker exec -it esportsamaze_postgres psql -U postgres -d esportsamaze -c "SELECT count(*) FROM pg_stat_activity;"
  ```
- **Check Scheduled Backups:**
  ```bash
  ls -lh /var/backups/esportsamaze
  ```
