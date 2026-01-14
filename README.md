<p align="center">
  <img src="desktop/assets/icon.png" alt="Eclosion" width="128">
</p>

<h1 align="center">Eclosion for Monarch</h1>

<p align="center">
  <a href="https://github.com/312-dev/eclosion/actions/workflows/01-ci.yml"><img src="https://github.com/312-dev/eclosion/actions/workflows/01-ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/312-dev/eclosion/actions/workflows/10-security.yml"><img src="https://github.com/312-dev/eclosion/actions/workflows/10-security.yml/badge.svg" alt="Security"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/312-dev/eclosion"><img src="https://api.scorecard.dev/projects/github.com/312-dev/eclosion/badge" alt="OpenSSF Scorecard"></a>
  <a href="https://www.bestpractices.dev/projects/11728"><img src="https://www.bestpractices.dev/projects/11728/badge" alt="OpenSSF Best Practices"></a>
  <a href="https://github.com/312-dev/eclosion/releases/latest"><img src="https://img.shields.io/github/v/release/312-dev/eclosion?label=stable" alt="Stable Release"></a>
  <a href="https://github.com/312-dev/eclosion/releases"><img src="https://img.shields.io/github/v/release/312-dev/eclosion?include_prereleases&label=beta" alt="Beta Release"></a>
  <a href="https://github.com/312-dev/eclosion/blob/main/LICENSE"><img src="https://img.shields.io/github/license/312-dev/eclosion" alt="License"></a>
</p>

<p align="center">
  Open source desktop & web app that extends Monarch Money with additional budgeting tools.<br>
  Runs locally or self-hosted. Each feature is modular; enable only what you need.
</p>

<p align="center">
  <strong><a href="https://eclosion.app/demo">Try the Demo</a></strong> ·
  <strong><a href="https://eclosion.app">Documentation</a></strong> ·
  <strong><a href="https://github.com/312-dev/eclosion/wiki">Wiki</a></strong>
</p>

<table align="center">
  <tr>
    <td align="center">
      <a href="https://eclosion.app/demo/dashboard">
        <img src="https://github.com/312-dev/eclosion/releases/latest/download/screenshot-dashboard.png" alt="Dashboard" width="280">
      </a>
      <br><em>Dashboard</em>
    </td>
    <td align="center">
      <a href="https://eclosion.app/demo/recurring">
        <img src="https://github.com/312-dev/eclosion/releases/latest/download/screenshot-recurring.png" alt="Recurring Expenses" width="280">
      </a>
      <br><em>Recurring Expenses</em>
    </td>
    <td align="center">
      <a href="https://eclosion.app/demo/settings">
        <img src="https://github.com/312-dev/eclosion/releases/latest/download/screenshot-settings.png" alt="Settings" width="280">
      </a>
      <br><em>Settings</em>
    </td>
  </tr>
</table>

## Overview

- **Local-first**: Credentials encrypted locally with Fernet (AES-128-CBC + HMAC-SHA256); server never sees your passphrase
- **Monarch sync**: Reads and writes directly to your Monarch account via their GraphQL API
- **Modular**: Each feature operates independently; enable/disable as needed

## Features

### Available

| Feature | Description |
|---------|-------------|
| **Recurring Expenses** | Monthly savings targets for non-monthly expenses (annual, quarterly, semi-annual). Calculates targets, tracks progress, syncs to Monarch. Supports rollup categories for aggregating subscriptions. |
| **Monthly Notes** | Persistent notes for Monarch categories/groups. Auto-carry-forward, revision history, inline math evaluation. |

### Planned

| Feature | Description |
|---------|-------------|
| **Joint Goals** | Shared goal tracking between two Monarch accounts. Share progress without exposing transactions/balances. |
| **Leaderboard** | Category spending competition with P2P encrypted score sharing. Income-adjusted scoring, multiple timeframes. |
| **Inbox Sync** | Email integration for receipt itemization. Parses receipts from Walmart, Costco, Uber, DoorDash, etc. |
| **Shared Budget** | Expense splitting and settlement tracking. Configurable split ratios with per-transaction overrides. |
| **Allowance** | Habit-based allowance accumulation. Define habits with reward values, track completions. |

## Quick Start

### Desktop App

**[Download the latest release](https://github.com/312-dev/eclosion/releases/latest)** for macOS, Windows, or Linux.

Runs locally with an embedded Python backend. See the [Desktop App wiki](https://github.com/312-dev/eclosion/wiki/Desktop-App) for build instructions.

### Docker

**From registry (recommended):**

```bash
export INSTANCE_SECRET=$(openssl rand -hex 16)
docker run -d \
  -p 5001:5001 \
  -v eclosion-data:/app/data \
  -e INSTANCE_SECRET=$INSTANCE_SECRET \
  ghcr.io/312-dev/eclosion:stable
# Access at http://localhost:5001?secret=YOUR_SECRET
```

**From source:**

```bash
git clone https://github.com/312-dev/eclosion.git && cd eclosion
export INSTANCE_SECRET=$(openssl rand -hex 16)
docker compose up -d
```

See the [Self-Hosting wiki](https://github.com/312-dev/eclosion/wiki/Self-Hosting-Overview) for reverse proxy setup and environment variables.

## Security

Credentials are encrypted with Fernet (AES-128-CBC + HMAC-SHA256) using PBKDF2 key derivation (480,000 iterations).

|  | Desktop | Server/Docker |
|--|---------|---------------|
| **Data location** | Local machine only | Server filesystem |
| **Access control** | None needed (localhost) | Instance secret required |
| **Encryption key** | OS keychain (Touch ID / Keychain) | User-entered passphrase |
| **Network exposure** | None | Requires HTTPS in production |

See the [Security wiki](https://github.com/312-dev/eclosion/wiki/Security) for full details.

## Local Development

```bash
# Backend
pip install -r requirements.txt && python app.py

# Frontend (separate terminal)
cd frontend && npm install && npm run dev

# Or run everything with Docker
docker compose up --build
```

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19, TypeScript 5, Vite 7, Tailwind CSS 4 |
| **Backend** | Python 3.11+, Flask, APScheduler |
| **Desktop** | Electron, PyInstaller (embedded Python) |
| **State** | SQLite (SQLAlchemy ORM) |
| **CI/CD** | GitHub Actions, Docker (GHCR), Cloudflare Pages |

## Contributing

See the [Contributing guide](https://github.com/312-dev/eclosion/wiki/Contributing).

- **Bugs**: [GitHub Issues](https://github.com/312-dev/eclosion/issues)
- **Questions**: [GitHub Discussions](https://github.com/312-dev/eclosion/discussions)

## Maintainers

Created by [@GraysonCAdams](https://github.com/GraysonCAdams). Maintained by [312.dev](https://312.dev).

See [contributors](https://github.com/312-dev/eclosion/graphs/contributors) for the full list.

## License

MIT
