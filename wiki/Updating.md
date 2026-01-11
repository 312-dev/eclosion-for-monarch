# Updating & Rollback

How to update Eclosion and roll back if needed.

## Checking Your Version

Your current version is displayed in **Settings** at the bottom of the page. When updates are available, a banner appears at the top of the app with a link to view what's new.

## Before Updating

Always backup your data before major updates.

**Docker:**
```bash
docker compose cp eclosion:/app/state ./backup-$(date +%Y%m%d)
```

**Railway:** Data is automatically persisted in your Railway volume. For extra safety, export your data from Settings if available.

**Desktop:** Your data is stored locally in the app's data directory. The app creates automatic backups during updates.

---

## Desktop App

The desktop app checks for updates automatically on launch.

### Automatic Updates

1. A notification appears: "Update available. Restart to install?"
2. Click to restart and apply the update
3. The app relaunches with the new version

### Manual Check

You can also manually check for updates in the Settings menu.

---

## Docker Self-Hosted

### Using Pre-Built Images (Recommended)

```bash
docker compose pull
docker compose up -d
```

### Building from Source

```bash
cd eclosion
git pull
docker compose up -d --build
```

---

## Railway

Railway automatically detects when updates are available from the upstream repository.

1. Open your [Railway Dashboard](https://railway.app/dashboard)
2. Click on your Eclosion project
3. If updates are available, you'll see a prompt to redeploy
4. Click **Deploy** to pull the latest version
5. Wait 1-2 minutes for the deployment to complete
6. Refresh the app to use the new version

---

## Rollback to a Previous Version

If you need to revert to a specific version:

### Docker

Edit `docker-compose.yml` to pin a version:

```yaml
services:
  eclosion:
    image: ghcr.io/312-dev/eclosion:1.0.0
```

Then restart:
```bash
docker compose up -d
```

### Railway

In your project settings, you can redeploy a previous deployment from the deployment history.

### Desktop

1. Download the specific version from [GitHub Releases](https://github.com/312-dev/eclosion/releases)
2. Uninstall the current version
3. Install the downloaded version
4. Disable auto-updates in Settings if you want to stay on that version

---

## Release Channels

| Channel | Tag Format | Use Case |
|---------|------------|----------|
| **Stable** | `v1.0.0` | Production use |
| **Beta** | `v1.1.0-beta.20240115.1` | Testing new features |

Beta releases are pre-releases and may have bugs. Use stable releases for production deployments.
