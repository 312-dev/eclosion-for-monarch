<p align="center">
  <img src="desktop/assets/icon.png" alt="Eclosion" width="128">
</p>

<h1 align="center">Eclosion for Monarch</h1>

<p align="center">
  <a href="https://github.com/312-dev/eclosion/actions/workflows/ci.yml"><img src="https://github.com/312-dev/eclosion/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/312-dev/eclosion/releases/latest"><img src="https://img.shields.io/github/v/release/312-dev/eclosion?label=stable" alt="Stable Release"></a>
  <a href="https://github.com/312-dev/eclosion/releases"><img src="https://img.shields.io/github/v/release/312-dev/eclosion?include_prereleases&label=beta" alt="Beta Release"></a>
  <a href="https://github.com/312-dev/eclosion/blob/main/LICENSE"><img src="https://img.shields.io/github/license/312-dev/eclosion" alt="License"></a>
</p>

<p align="center">
  <strong>Your budgeting, evolved.</strong>
</p>

<p align="center">
  An open source desktop & web app that expands what's possible with Monarch Money.<br>
  Each tool works independently with your account—enable only what you need.
</p>

<p align="center">
  <em>Eclosion (n.): The moment a butterfly emerges.</em>
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

## Why Eclosion?

- **Fully Yours** — Your credentials stay encrypted locally—no one else can access them
- **Always In Sync** — Changes sync to Monarch automatically
- **Set It & Forget It** — Enable the tools you want and Eclosion handles the rest

## How It Works

1. **Get Started** — Download the desktop app, self-host with Docker, or deploy to Railway
2. **Connect** — Sign in with your Monarch Money credentials (encrypted with a passphrase only you know)
3. **Enable** — Pick the tools you want to use
4. **Relax** — Eclosion syncs with Monarch and keeps everything updated

## Features

### Recurring Expenses *(Available)*

Never be caught off guard by a bill again. Automatically calculates monthly savings for annual, quarterly, and semi-annual expenses.

- **Smart Savings Calculation** — Automatically calculates monthly savings targets for annual, semi-annual, and quarterly expenses
- **Rollup Mode** — Combine small subscriptions into a single category for simplified budgeting
- **Progress Tracking** — See at a glance if you're on track, behind, or ahead on each expense
- **Monarch Sync** — Syncs directly with your Monarch Money account to update budget targets

### Joint Goals *(Coming Soon)*

Privacy-first shared goals. Collaborate on financial goals without merging accounts or sacrificing privacy.

- **Keep Your Privacy** — Share goal progress without exposing transactions, balances, or spending habits
- **No Account Merging** — Both partners keep separate Monarch accounts
- **Combined Trajectory** — See when you'll reach goals together based on both contributions

### Leaderboard *(Coming Soon)*

Friendly competition with people you trust. Compete with friends and family on a shared spending category.

- **Privacy by Design** — P2P encryption means you only share your score—never your transactions or balances
- **Fair Scoring** — Income-adjusted scoring levels the playing field so everyone can compete meaningfully
- **Multiple Timeframes** — Daily, weekly, and monthly leaderboards

### Inbox Sync *(Coming Soon)*

Automatic transaction splits from your inbox. Connect your email and automatically extract itemized receipts.

- **Email Integration** — Securely connects to Gmail or Outlook with read-only access
- **Smart Itemization** — Automatically splits transactions by item with accurate categories
- **Growing Coverage** — Walmart, Costco, Uber, DoorDash, and more

## Quick Start

### Desktop App (Easiest)

**[Download the latest release](https://github.com/312-dev/eclosion/releases/latest)** for macOS, Windows, or Linux.

No server required—everything runs locally. See the [Desktop App wiki](https://github.com/312-dev/eclosion/wiki/Desktop-App) for build instructions and details.

### One-Click Cloud Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/yE9Dgv?referralCode=epxV1E)

Deploys automatically (~$5-7/month). Set `INSTANCE_SECRET` after deployment to protect your instance.

### Self-Host with Docker

```bash
git clone https://github.com/312-dev/eclosion.git && cd eclosion
export INSTANCE_SECRET=$(openssl rand -hex 16)
docker compose up -d
# Access at http://localhost:5001?secret=YOUR_SECRET
```

See the [Self-Hosting wiki](https://github.com/312-dev/eclosion/wiki/Self-Hosting-Overview) for reverse proxy setup, environment variables, and platform-specific guides.

## Security

Your credentials are protected with Fernet encryption (AES-128-CBC + HMAC-SHA256), PBKDF2 key derivation with 480,000 iterations, and strong passphrase requirements. The server cannot decrypt your credentials without your passphrase.

See the [Security wiki](https://github.com/312-dev/eclosion/wiki/Security) for full details on instance access control, rate limiting, and security headers.

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

**Frontend**: React 19 · TypeScript · Vite · Tailwind CSS<br>
**Backend**: Python 3.12 · Flask<br>
**State**: JSON file-based (no database)<br>
**Deployment**: Docker · Railway · Desktop (Electron + PyInstaller)

## Contributing

Contributions are welcome! See the [Contributing guide](https://github.com/312-dev/eclosion/wiki/Contributing).

- **Report bugs**: [GitHub Issues](https://github.com/312-dev/eclosion/issues)
- **Ask questions**: [GitHub Discussions](https://github.com/312-dev/eclosion/discussions)

## Maintainers

Maintained by [312.dev](https://312.dev). This software is provided as-is for self-hosting.

## License

MIT
