---
id: overview
title: Self-Hosting Overview
sidebar_label: Overview
sidebar_position: 1
---

# Self-Hosting Guide

Complete guide for deploying Eclosion on your own infrastructure outside of Railway.

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

## Deployment Options

Choose the deployment method that works best for your infrastructure:

### Recommended: Docker

The easiest way to run Eclosion. See the [Docker Quick Start](/docs/self-hosting/docker) guide.

### Platform-Specific Guides

- [DigitalOcean](/docs/self-hosting/platforms/digitalocean) - App Platform or Droplet
- [AWS](/docs/self-hosting/platforms/aws) - ECS/Fargate or EC2
- [Google Cloud Run](/docs/self-hosting/platforms/gcp) - Serverless containers
- [Kubernetes](/docs/self-hosting/platforms/kubernetes) - Full K8s deployment
- [Synology NAS](/docs/self-hosting/platforms/synology) - Container Manager or SSH
- [Raspberry Pi](/docs/self-hosting/platforms/raspberry-pi) - ARM-based deployment
- [Unraid](/docs/self-hosting/platforms/unraid) - Docker on Unraid
- [Portainer](/docs/self-hosting/platforms/portainer) - Docker management UI

## What's Next?

1. Start with the [Docker Quick Start](/docs/self-hosting/docker) for the fastest setup
2. Review [Security](/docs/security) to understand how your credentials are protected
3. Set up [Reverse Proxy](/docs/self-hosting/reverse-proxy) for HTTPS access
4. Configure [Monitoring](/docs/self-hosting/monitoring) for production deployments
