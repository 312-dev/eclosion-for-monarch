---
id: gcp
title: Google Cloud Run
sidebar_label: Google Cloud
sidebar_position: 3
---

# Google Cloud Run Deployment

Deploy Eclosion as a serverless container on Google Cloud Run.

## Deploy to Cloud Run

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
```

:::warning Stateless Environment
Cloud Run is stateless. For persistent data, use Cloud Storage or Filestore mounted via Cloud Run volume mounts.
:::

## Persistent Storage Options

### Using Cloud Storage FUSE

1. Create a Cloud Storage bucket
2. Mount using Cloud Run volume mounts
3. Configure the container to use the mounted path

### Using Filestore

1. Create a Filestore instance
2. Configure VPC connector for Cloud Run
3. Mount the NFS share in your container

## Next Steps

- Review [Data Management](/self-hosting/data-management) for backup strategies
- Configure [Monitoring](/self-hosting/monitoring) with Cloud Monitoring
