# Troubleshooting

Common issues and solutions for Eclosion deployments.

## Container Won't Start

```bash
# Check logs for errors
docker compose logs eclosion

# Common issues:
# - Port already in use: Change the port mapping
# - Permission denied: Check volume permissions
# - Out of memory: Increase container memory limit
```

## Can't Connect to Application

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

## Data Not Persisting

```bash
# Verify volume is mounted
docker compose exec eclosion ls -la /app/state

# Check volume exists
docker volume ls | grep eclosion

# Inspect volume
docker volume inspect eclosion_data
```

## Monarch API Errors

```bash
# Check credentials are stored
docker compose exec eclosion ls -la /app/state/credentials.json.enc

# View application logs for API errors
docker compose logs eclosion | grep -i "monarch\|api\|error"
```

## Reset Everything

```bash
# Stop and remove container
docker compose down

# Remove data (DESTRUCTIVE - will delete all settings and credentials)
docker volume rm eclosion_data

# Start fresh
docker compose up -d
```

## Getting Help

- **GitHub Issues**: [Report bugs](https://github.com/312-dev/eclosion/issues)
- **Security Issues**: See [[Security|security]] for responsible disclosure
