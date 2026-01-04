---
id: monitoring
title: Monitoring & Maintenance
sidebar_label: Monitoring
sidebar_position: 5
---

# Monitoring & Maintenance

Monitor and maintain your Eclosion deployment.

## Health Check Endpoint

The `/health` endpoint returns application status:

```bash
curl http://localhost:5001/health
# Response: {"status": "healthy"}
```

## Monitoring with Uptime Kuma

1. Deploy [Uptime Kuma](https://github.com/louislam/uptime-kuma)
2. Add a new monitor:
   - Type: HTTP(s)
   - URL: `http://eclosion:5001/health`
   - Expected status: 200
   - Check interval: 60s

## Log Management

```bash
# View real-time logs
docker compose logs -f eclosion

# View last 100 lines
docker compose logs --tail 100 eclosion

# Save logs to file
docker compose logs eclosion > eclosion.log 2>&1
```

For production, consider using a log aggregator like Loki or forwarding to a SIEM.

## Automatic Updates with Watchtower

```yaml
# Add to docker-compose.yml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=86400  # Check daily
      - WATCHTOWER_INCLUDE_STOPPED=false
    command: eclosion  # Only update eclosion container
```
