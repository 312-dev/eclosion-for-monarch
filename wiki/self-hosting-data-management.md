# Data Management

Manage persistent storage, backups, and migrations for Eclosion.

## Persistent Storage

All application data is stored in `/app/state` inside the container:

```
/app/state/
├── credentials.json.enc    # Encrypted Monarch credentials
├── settings.json           # User preferences
├── mappings.json           # Category mappings
└── sync_state.json         # Sync status and history
```

> **Important:** Always mount a volume to `/app/state` to persist data across container restarts.

## Backup Strategies

### Manual Backup

```bash
# Create timestamped backup
docker compose cp eclosion:/app/state ./backup-$(date +%Y%m%d-%H%M%S)

# Or using docker directly
docker cp eclosion:/app/state ./backup-$(date +%Y%m%d-%H%M%S)
```

### Automated Backup with Cron

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * cd /opt/eclosion && docker compose cp eclosion:/app/state /backups/eclosion-$(date +\%Y\%m\%d) 2>/dev/null

# Keep only last 7 days
0 3 * * * find /backups -name "eclosion-*" -mtime +7 -exec rm -rf {} \;
```

### Backup to Cloud Storage

```bash
#!/bin/bash
# backup-to-s3.sh
BACKUP_DIR="/tmp/eclosion-backup-$(date +%Y%m%d)"
docker compose cp eclosion:/app/state "$BACKUP_DIR"
tar -czf "$BACKUP_DIR.tar.gz" -C /tmp "$(basename $BACKUP_DIR)"
aws s3 cp "$BACKUP_DIR.tar.gz" s3://your-bucket/eclosion-backups/
rm -rf "$BACKUP_DIR" "$BACKUP_DIR.tar.gz"
```

## Migration

### Moving to a New Server

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
