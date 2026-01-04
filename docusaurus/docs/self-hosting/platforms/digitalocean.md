---
id: digitalocean
title: DigitalOcean
sidebar_label: DigitalOcean
sidebar_position: 1
---

# DigitalOcean Deployment

Deploy Eclosion on DigitalOcean using App Platform or a Droplet.

## Using DigitalOcean App Platform

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **Create App** → **Container Registry**
3. Enter image: `ghcr.io/graysoncadams/eclosion:1.0.0`
4. Configure:
   - HTTP Port: `5001`
   - Add environment variable: `INSTANCE_SECRET`
5. Add a volume mounted to `/app/state`
6. Deploy

## Using a Droplet

```bash
# SSH into your Droplet
ssh root@your-droplet-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Create deployment directory
mkdir -p /opt/eclosion && cd /opt/eclosion

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
services:
  eclosion:
    image: ghcr.io/graysoncadams/eclosion:1.0.0
    container_name: eclosion
    restart: unless-stopped
    ports:
      - "5001:5001"
    volumes:
      - ./data:/app/state
    environment:
      INSTANCE_SECRET: "${INSTANCE_SECRET}"
      TZ: "UTC"
EOF

# Generate and save secret
export INSTANCE_SECRET=$(openssl rand -hex 16)
echo "INSTANCE_SECRET=$INSTANCE_SECRET" > .env
echo "Your access code: $INSTANCE_SECRET"

# Start
docker compose up -d

# Configure firewall
ufw allow 5001/tcp
```

## Next Steps

- Set up a [Reverse Proxy](/docs/self-hosting/reverse-proxy) for HTTPS with Let's Encrypt
- Configure [Monitoring](/docs/self-hosting/monitoring) for uptime alerts
