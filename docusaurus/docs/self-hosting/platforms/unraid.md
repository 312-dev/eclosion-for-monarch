---
id: unraid
title: Unraid
sidebar_label: Unraid
sidebar_position: 7
---

# Unraid Deployment

Deploy Eclosion on Unraid using the Docker interface.

## Setup

1. Go to **Docker** → **Add Container**
2. Configure:
   - **Repository**: `ghcr.io/graysoncadams/eclosion:1.0.0`
   - **Port Mapping**: Host `5001` → Container `5001`
   - **Path**: `/mnt/user/appdata/eclosion` → `/app/state`
   - **Variable**: `INSTANCE_SECRET` = your secret
   - **Variable**: `TZ` = your timezone
3. Apply

Or use Community Applications to install if a template is available.

## Access

Access at `http://your-unraid-ip:5001?secret=YOUR_SECRET`
