---
id: synology
title: Synology NAS
sidebar_label: Synology NAS
sidebar_position: 5
---

# Synology NAS Deployment

Deploy Eclosion on your Synology NAS using Container Manager or SSH.

## Using Container Manager (DSM 7.2+)

1. Open **Container Manager** → **Registry**
2. Search for `ghcr.io/graysoncadams/eclosion`
3. Download the `1.0.0` tag
4. Go to **Container** → **Create**
5. Configure:
   - **Port**: Local 5001 → Container 5001
   - **Volume**: Create folder `/docker/eclosion` → Mount to `/app/state`
   - **Environment**: Add `INSTANCE_SECRET=your-secret`
6. Apply and start

## Using Docker via SSH

```bash
# SSH into Synology
ssh admin@your-nas-ip

# Create directory
sudo mkdir -p /volume1/docker/eclosion

# Run container
sudo docker run -d \
  --name eclosion \
  --restart unless-stopped \
  -p 5001:5001 \
  -v /volume1/docker/eclosion:/app/state \
  -e INSTANCE_SECRET=your-secret \
  -e TZ=America/New_York \
  ghcr.io/graysoncadams/eclosion:1.0.0
```

## Access

Access Eclosion at `http://your-nas-ip:5001?secret=YOUR_SECRET`
