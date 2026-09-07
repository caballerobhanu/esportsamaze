# Moving Your Local Docker Database Data to the VPS

### Step 1: Export Local PostgreSQL Data from your PC (Encoding-Safe)
Do NOT use `>` PowerShell redirection (PowerShell 5.1 forces UTF-16 which corrupts SQL dumps on Linux).
Instead, dump inside the container and use `docker cp` for a binary byte-perfect copy:

On your Windows computer (PowerShell or Command Prompt):
```powershell
# 1. Dump database inside the container
docker exec esportsamaze_postgres pg_dump -U postgres -d esportsamaze -f /tmp/local_db_backup.sql

# 2. Copy the file directly to your computer (preserves pure UTF-8)
docker cp esportsamaze_postgres:/tmp/local_db_backup.sql ./local_db_backup.sql
```

---

### Step 2: Copy the SQL Dump & Uploaded Media to your VPS
From PowerShell on your computer, run:
```powershell
# 1. Copy database dump to VPS
scp local_db_backup.sql root@<YOUR_VPS_IP>:/var/www/esportsamaze/

# 2. Copy all uploaded images/media to VPS
scp -r uploads root@<YOUR_VPS_IP>:/var/www/esportsamaze/
```

---

### Step 3: Restore Database on the VPS
SSH into your VPS:
```bash
ssh root@<YOUR_VPS_IP>
```
Then run:
```bash
cd /var/www/esportsamaze

# Copy dump into VPS postgres container
docker cp local_db_backup.sql esportsamaze_postgres:/tmp/local_db_backup.sql

# Restore dump into the database
docker exec -i esportsamaze_postgres psql -U postgres -d esportsamaze -f /tmp/local_db_backup.sql
```

All your tournaments, matches, teams, player stats, and media assets will now be live on your production server!
