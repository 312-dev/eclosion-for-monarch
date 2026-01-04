# Self-Hosting Guide

Complete guide for deploying Eclosion on your own infrastructure.

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

### Network Requirements

- Outbound HTTPS (443) to `api.monarchmoney.com`
- Inbound port of your choice (default: 5001)

## Getting Started

The recommended way to run Eclosion is with Docker. See the [[Docker Quick Start|self-hosting-docker]] guide.

## What's Next?

1. Start with the [[Docker Quick Start|self-hosting-docker]] for the fastest setup
2. Review [[Security|security]] to understand how your credentials are protected
3. Set up [[Reverse Proxy|self-hosting-reverse-proxy]] for HTTPS access
4. Configure [[Monitoring|self-hosting-monitoring]] for production deployments
