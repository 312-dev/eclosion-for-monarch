---
id: environment-variables
title: Environment Variables
sidebar_label: Environment Variables
sidebar_position: 8
---

# Environment Variables Reference

All available configuration options for Eclosion.

## Core Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `INSTANCE_SECRET` | Access code to protect your instance | - | **Recommended** |
| `PORT` | Port to run on | `5001` | No |
| `TZ` | Timezone | `UTC` | No |

## Session Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_TIMEOUT_MINUTES` | Lock after inactivity | `30` |
| `SESSION_LIFETIME_DAYS` | Cookie lifetime | `7` |
| `SESSION_SECRET` | Fixed session secret | Auto-generated |

## Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_DAILY` | Requests per day per IP | `1000` |
| `RATE_LIMIT_HOURLY` | Requests per hour per IP | `200` |

## Development Only

:::warning
These variables bypass encryption and should **never** be used in production.
:::

| Variable | Description |
|----------|-------------|
| `MONARCH_MONEY_EMAIL` | Pre-configured email (bypasses encryption) |
| `MONARCH_MONEY_PASSWORD` | Pre-configured password (bypasses encryption) |
| `MFA_SECRET_KEY` | TOTP secret for auto-MFA |
| `FLASK_DEBUG` | Enable debug mode (`1` to enable) |
