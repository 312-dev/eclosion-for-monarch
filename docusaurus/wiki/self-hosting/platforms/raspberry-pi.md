---
id: raspberry-pi
title: Raspberry Pi
sidebar_label: Raspberry Pi
sidebar_position: 6
---

# Raspberry Pi Deployment

Deploy Eclosion on Raspberry Pi 3, 4, or 5 (arm64 images available).

## Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Create deployment
mkdir ~/eclosion && cd ~/eclosion

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
      TZ: "America/New_York"
EOF

# Generate secret
export INSTANCE_SECRET=$(openssl rand -hex 16)
echo "INSTANCE_SECRET=$INSTANCE_SECRET" > .env
echo "Access code: $INSTANCE_SECRET"

# Start
docker compose up -d
```

## Performance Notes

- Pi 3: May experience slower sync times
- Pi 4/5: Recommended for best performance
- Use an SSD for faster data access
