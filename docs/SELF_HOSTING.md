# Self-Hosting Guide

Complete guide for deploying Eclosion on your own infrastructure outside of Railway.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Start with Docker](#quick-start-with-docker)
- [Platform-Specific Guides](#platform-specific-guides)
  - [DigitalOcean](#digitalocean)
  - [AWS](#aws)
  - [Google Cloud Run](#google-cloud-run)
  - [Kubernetes](#kubernetes)
  - [Synology NAS](#synology-nas)
  - [Raspberry Pi](#raspberry-pi)
  - [Unraid](#unraid)
  - [Portainer](#portainer)
- [Reverse Proxy Setup](#reverse-proxy-setup)
  - [Nginx with Let's Encrypt](#nginx-with-lets-encrypt)
  - [Traefik](#traefik)
  - [Caddy](#caddy)
- [Data Management](#data-management)
  - [Persistent Storage](#persistent-storage)
  - [Backup Strategies](#backup-strategies)
  - [Migration](#migration)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)
- [Environment Variables Reference](#environment-variables-reference)

---

## System Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2 cores |
| RAM | 256 MB | 512 MB |
| Disk | 500 MB | 1 GB |
| Architecture | amd64 or arm64 | - |

### Software Requirements

- Docker 20.10+ with Docker Compose v2
- OR Python 3.11+ and Node.js 20+ (for bare metal)

### Network Requirements

- Outbound HTTPS (443) to `api.monarchmoney.com`
- Inbound port of your choice (default: 5001)

---

## Quick Start with Docker

### Using Pre-Built Images (Recommended)

```bash
# 1. Create a directory for your deployment
mkdir eclosion && cd eclosion

# 2. Download the docker-compose file
curl -O https://raw.githubusercontent.com/GraysonCAdams/eclosion/main/docker-compose.yml

# 3. Generate a secret access code
export INSTANCE_SECRET=$(openssl rand -hex 16)
echo "Save this access code: $INSTANCE_SECRET"

# 4. Create .env file
echo "INSTANCE_SECRET=$INSTANCE_SECRET" > .env

# 5. Start the container
docker compose up -d

# 6. Access at http://localhost:5001?secret=YOUR_SECRET
```

### Verify Installation

```bash
# Check container is running
docker compose ps

# Check health status
curl http://localhost:5001/health

# View logs
docker compose logs -f
```

### Using Specific Versions

Pin to a specific version for stability:

```yaml
# docker-compose.yml
services:
  eclosion:
    image: ghcr.io/graysoncadams/eclosion:1.0.0  # Pin to version
```

Available image tags:
- `ghcr.io/graysoncadams/eclosion:1.0.0` - Specific version (recommended for production)
- `ghcr.io/graysoncadams/eclosion:1.0` - Latest patch of minor version

---

## Platform-Specific Guides

### DigitalOcean

#### Using DigitalOcean App Platform

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **Create App** → **Container Registry**
3. Enter image: `ghcr.io/graysoncadams/eclosion:1.0.0`
4. Configure:
   - HTTP Port: `5001`
   - Add environment variable: `INSTANCE_SECRET`
5. Add a volume mounted to `/app/state`
6. Deploy

#### Using a Droplet

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

### AWS

#### Using ECS with Fargate

1. **Create ECS Cluster:**
   ```bash
   aws ecs create-cluster --cluster-name eclosion-cluster
   ```

2. **Create Task Definition** (`task-definition.json`):
   ```json
   {
     "family": "eclosion",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "containerDefinitions": [
       {
         "name": "eclosion",
         "image": "ghcr.io/graysoncadams/eclosion:1.0.0",
         "portMappings": [
           {
             "containerPort": 5001,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "INSTANCE_SECRET",
             "value": "your-secret-here"
           }
         ],
         "mountPoints": [
           {
             "sourceVolume": "eclosion-data",
             "containerPath": "/app/state"
           }
         ],
         "healthCheck": {
           "command": ["CMD-SHELL", "python3 -c \"import urllib.request; urllib.request.urlopen('http://localhost:5001/health')\""],
           "interval": 30,
           "timeout": 5,
           "retries": 3
         }
       }
     ],
     "volumes": [
       {
         "name": "eclosion-data",
         "efsVolumeConfiguration": {
           "fileSystemId": "fs-xxxxxxxx"
         }
       }
     ]
   }
   ```

3. **Register and Run:**
   ```bash
   aws ecs register-task-definition --cli-input-json file://task-definition.json
   aws ecs create-service \
     --cluster eclosion-cluster \
     --service-name eclosion \
     --task-definition eclosion \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
   ```

#### Using EC2

Follow the [DigitalOcean Droplet](#using-a-droplet) instructions - the process is identical.

### Google Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy eclosion \
  --image ghcr.io/graysoncadams/eclosion:1.0.0 \
  --port 5001 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars "INSTANCE_SECRET=your-secret-here" \
  --allow-unauthenticated

# Note: Cloud Run is stateless. For persistent data, use Cloud Storage
# or Filestore mounted via Cloud Run volume mounts.
```

### Kubernetes

```yaml
# eclosion-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: eclosion
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: eclosion-data
  namespace: eclosion
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Secret
metadata:
  name: eclosion-secret
  namespace: eclosion
type: Opaque
stringData:
  instance-secret: "your-secret-here"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eclosion
  namespace: eclosion
spec:
  replicas: 1
  selector:
    matchLabels:
      app: eclosion
  template:
    metadata:
      labels:
        app: eclosion
    spec:
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
        - name: eclosion
          image: ghcr.io/graysoncadams/eclosion:1.0.0
          ports:
            - containerPort: 5001
          env:
            - name: INSTANCE_SECRET
              valueFrom:
                secretKeyRef:
                  name: eclosion-secret
                  key: instance-secret
            - name: TZ
              value: "UTC"
          volumeMounts:
            - name: data
              mountPath: /app/state
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 5001
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 5001
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: eclosion-data
---
apiVersion: v1
kind: Service
metadata:
  name: eclosion
  namespace: eclosion
spec:
  selector:
    app: eclosion
  ports:
    - port: 80
      targetPort: 5001
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: eclosion
  namespace: eclosion
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - eclosion.yourdomain.com
      secretName: eclosion-tls
  rules:
    - host: eclosion.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: eclosion
                port:
                  number: 80
```

Apply with:
```bash
kubectl apply -f eclosion-deployment.yaml
```

### Synology NAS

#### Using Container Manager (DSM 7.2+)

1. Open **Container Manager** → **Registry**
2. Search for `ghcr.io/graysoncadams/eclosion`
3. Download the `1.0.0` tag
4. Go to **Container** → **Create**
5. Configure:
   - **Port**: Local 5001 → Container 5001
   - **Volume**: Create folder `/docker/eclosion` → Mount to `/app/state`
   - **Environment**: Add `INSTANCE_SECRET=your-secret`
6. Apply and start

#### Using Docker via SSH

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

### Raspberry Pi

Works on Pi 3, Pi 4, and Pi 5 (arm64 images available).

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

### Unraid

1. Go to **Docker** → **Add Container**
2. Configure:
   - **Repository**: `ghcr.io/graysoncadams/eclosion:1.0.0`
   - **Port Mapping**: Host `5001` → Container `5001`
   - **Path**: `/mnt/user/appdata/eclosion` → `/app/state`
   - **Variable**: `INSTANCE_SECRET` = your secret
   - **Variable**: `TZ` = your timezone
3. Apply

Or use Community Applications to install if a template is available.

### Portainer

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

---

## Reverse Proxy Setup

### Nginx with Let's Encrypt

#### Install Certbot and Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d eclosion.yourdomain.com
```

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/eclosion
server {
    listen 80;
    server_name eclosion.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name eclosion.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/eclosion.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eclosion.yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/eclosion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Traefik

```yaml
# docker-compose.yml with Traefik
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=you@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt

  eclosion:
    image: ghcr.io/graysoncadams/eclosion:1.0.0
    container_name: eclosion
    restart: unless-stopped
    volumes:
      - eclosion_data:/app/state
    environment:
      INSTANCE_SECRET: "${INSTANCE_SECRET}"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.eclosion.rule=Host(`eclosion.yourdomain.com`)"
      - "traefik.http.routers.eclosion.entrypoints=websecure"
      - "traefik.http.routers.eclosion.tls.certresolver=letsencrypt"
      - "traefik.http.services.eclosion.loadbalancer.server.port=5001"
      # HTTP to HTTPS redirect
      - "traefik.http.routers.eclosion-http.rule=Host(`eclosion.yourdomain.com`)"
      - "traefik.http.routers.eclosion-http.entrypoints=web"
      - "traefik.http.routers.eclosion-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"

volumes:
  eclosion_data:
```

### Caddy

Caddy automatically handles SSL certificates.

```bash
# Caddyfile
eclosion.yourdomain.com {
    reverse_proxy localhost:5001
}
```

Or with Docker:

```yaml
# docker-compose.yml with Caddy
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

  eclosion:
    image: ghcr.io/graysoncadams/eclosion:1.0.0
    container_name: eclosion
    restart: unless-stopped
    volumes:
      - eclosion_data:/app/state
    environment:
      INSTANCE_SECRET: "${INSTANCE_SECRET}"

volumes:
  eclosion_data:
  caddy_data:
  caddy_config:
```

---

## Data Management

### Persistent Storage

All application data is stored in `/app/state` inside the container:

```
/app/state/
├── credentials.json.enc    # Encrypted Monarch credentials
├── settings.json           # User preferences
├── mappings.json           # Category mappings
└── sync_state.json         # Sync status and history
```

**Important:** Always mount a volume to `/app/state` to persist data across container restarts.

### Backup Strategies

#### Manual Backup

```bash
# Create timestamped backup
docker compose cp eclosion:/app/state ./backup-$(date +%Y%m%d-%H%M%S)

# Or using docker directly
docker cp eclosion:/app/state ./backup-$(date +%Y%m%d-%H%M%S)
```

#### Automated Backup with Cron

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * cd /opt/eclosion && docker compose cp eclosion:/app/state /backups/eclosion-$(date +\%Y\%m\%d) 2>/dev/null

# Keep only last 7 days
0 3 * * * find /backups -name "eclosion-*" -mtime +7 -exec rm -rf {} \;
```

#### Backup to Cloud Storage

```bash
#!/bin/bash
# backup-to-s3.sh
BACKUP_DIR="/tmp/eclosion-backup-$(date +%Y%m%d)"
docker compose cp eclosion:/app/state "$BACKUP_DIR"
tar -czf "$BACKUP_DIR.tar.gz" -C /tmp "$(basename $BACKUP_DIR)"
aws s3 cp "$BACKUP_DIR.tar.gz" s3://your-bucket/eclosion-backups/
rm -rf "$BACKUP_DIR" "$BACKUP_DIR.tar.gz"
```

### Migration

#### Moving to a New Server

1. **On the old server:**
   ```bash
   # Stop the container
   docker compose stop eclosion

   # Create backup
   docker compose cp eclosion:/app/state ./eclosion-migration

   # Compress for transfer
   tar -czf eclosion-migration.tar.gz eclosion-migration
   ```

2. **Transfer to new server:**
   ```bash
   scp eclosion-migration.tar.gz user@new-server:/opt/eclosion/
   ```

3. **On the new server:**
   ```bash
   cd /opt/eclosion
   tar -xzf eclosion-migration.tar.gz

   # Start container with migrated data
   docker compose up -d

   # Restore data into container
   docker compose cp eclosion-migration/. eclosion:/app/state/

   # Restart to pick up restored data
   docker compose restart eclosion
   ```

---

## Monitoring & Maintenance

### Health Check Endpoint

The `/health` endpoint returns application status:

```bash
curl http://localhost:5001/health
# Response: {"status": "healthy"}
```

### Monitoring with Uptime Kuma

1. Deploy [Uptime Kuma](https://github.com/louislam/uptime-kuma)
2. Add a new monitor:
   - Type: HTTP(s)
   - URL: `http://eclosion:5001/health`
   - Expected status: 200
   - Check interval: 60s

### Log Management

```bash
# View real-time logs
docker compose logs -f eclosion

# View last 100 lines
docker compose logs --tail 100 eclosion

# Save logs to file
docker compose logs eclosion > eclosion.log 2>&1
```

For production, consider using a log aggregator like Loki or forwarding to a SIEM.

### Automatic Updates with Watchtower

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

---

## Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw allow ssh
sudo ufw allow 443/tcp  # HTTPS only, not 5001 directly
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 5001 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 5001 -j DROP
```

### Docker Security

```yaml
# Enhanced docker-compose.yml
services:
  eclosion:
    image: ghcr.io/graysoncadams/eclosion:1.0.0
    container_name: eclosion
    restart: unless-stopped
    # Security settings
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp
    ports:
      - "127.0.0.1:5001:5001"  # Bind to localhost only
    volumes:
      - eclosion_data:/app/state
    environment:
      INSTANCE_SECRET: "${INSTANCE_SECRET}"
```

### Rate Limiting

Configure via environment variables:

```bash
RATE_LIMIT_DAILY=1000    # Requests per day per IP
RATE_LIMIT_HOURLY=200    # Requests per hour per IP
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker compose logs eclosion

# Common issues:
# - Port already in use: Change the port mapping
# - Permission denied: Check volume permissions
# - Out of memory: Increase container memory limit
```

### Can't Connect to Application

```bash
# Verify container is running
docker compose ps

# Check if port is listening
netstat -tlnp | grep 5001

# Test from inside container
docker compose exec eclosion python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:5001/health').read().decode())"

# Check firewall
sudo ufw status
```

### Data Not Persisting

```bash
# Verify volume is mounted
docker compose exec eclosion ls -la /app/state

# Check volume exists
docker volume ls | grep eclosion

# Inspect volume
docker volume inspect eclosion_data
```

### Monarch API Errors

```bash
# Check credentials are stored
docker compose exec eclosion ls -la /app/state/credentials.json.enc

# View application logs for API errors
docker compose logs eclosion | grep -i "monarch\|api\|error"
```

### Reset Everything

```bash
# Stop and remove container
docker compose down

# Remove data (DESTRUCTIVE - will delete all settings and credentials)
docker volume rm eclosion_data

# Start fresh
docker compose up -d
```

---

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `INSTANCE_SECRET` | Access code to protect your instance | - | **Recommended** |
| `PORT` | Port to run on | `5001` | No |
| `TZ` | Timezone | `UTC` | No |
| `SESSION_TIMEOUT_MINUTES` | Lock after inactivity | `30` | No |
| `SESSION_LIFETIME_DAYS` | Cookie lifetime | `7` | No |
| `SESSION_SECRET` | Fixed session secret | Auto-generated | No |
| `RATE_LIMIT_DAILY` | Daily requests per IP | `1000` | No |
| `RATE_LIMIT_HOURLY` | Hourly requests per IP | `200` | No |
| `FLASK_DEBUG` | Enable debug mode | `0` | No |

### Development-Only Variables

| Variable | Description |
|----------|-------------|
| `MONARCH_MONEY_EMAIL` | Pre-configured email (bypasses encryption) |
| `MONARCH_MONEY_PASSWORD` | Pre-configured password (bypasses encryption) |
| `MFA_SECRET_KEY` | TOTP secret for auto-MFA |

---

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/graysoncadams/eclosion-for-monarch/issues)
- **Security Issues**: See [SECURITY.md](../SECURITY.md) for responsible disclosure
