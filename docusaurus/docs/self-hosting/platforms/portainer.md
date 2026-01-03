---
id: portainer
title: Portainer
sidebar_label: Portainer
sidebar_position: 8
---

# Portainer Deployment

Deploy Eclosion using Portainer's stack management.

## Setup

1. Go to **Stacks** → **Add Stack**
2. Name: `eclosion`
3. Paste this docker-compose:

```yaml
services:
  eclosion:
    image: ghcr.io/graysoncadams/eclosion:1.0.0
    container_name: eclosion
    restart: unless-stopped
    ports:
      - "5001:5001"
    volumes:
      - eclosion_data:/app/state
    environment:
      INSTANCE_SECRET: "your-secret-here"
      TZ: "UTC"

volumes:
  eclosion_data:
```

4. Deploy the stack

## Verify

Check the container status in Portainer's container list. View logs for any issues.
