# Security Hardening

Secure your Eclosion deployment for production use.

## Firewall Configuration

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

## Docker Security

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

## Rate Limiting

Configure via environment variables:

```bash
RATE_LIMIT_DAILY=1000    # Requests per day per IP
RATE_LIMIT_HOURLY=200    # Requests per hour per IP
```

## Additional Recommendations

- Use a reverse proxy with HTTPS (see [[Reverse Proxy|self-hosting-reverse-proxy]])
- Regularly update the Docker image
- Monitor logs for suspicious activity
- Use a strong `INSTANCE_SECRET`
