# Reverse Proxy Setup

Configure HTTPS access to Eclosion with a reverse proxy.

## Nginx with Let's Encrypt

### Install Certbot and Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d eclosion.yourdomain.com
```

### Nginx Configuration

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

## Traefik

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

## Caddy

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
