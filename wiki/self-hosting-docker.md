# Quick Start with Docker

The fastest way to run Eclosion is with Docker.

## Using Pre-Built Images (Recommended)

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

## Verify Installation

```bash
# Check container is running
docker compose ps

# Check health status
curl http://localhost:5001/health

# View logs
docker compose logs -f
```

## Using Specific Versions

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

## Next Steps

- Set up a [[Reverse Proxy|self-hosting-reverse-proxy]] for HTTPS
- Configure [[Persistent Storage|self-hosting-data-management]] for backups
- Review [[Environment Variables|self-hosting-environment-variables]] for customization
