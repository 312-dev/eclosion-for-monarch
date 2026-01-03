# Eclosion for Monarch

> **Your budgeting, evolved.**

A self-hosted toolkit that expands what's possible with Monarch Money. Each tool works independently with your account—enable only what you need.

*Eclosion (n.): The emergence of an insect from its cocoon or a larva from an egg — symbolizing the transformation and growth of your budget.*

**[Try the Demo](https://docs.eclosion.app/demo)** · **[Documentation](https://docs.eclosion.app)**

## The Toolkit

### Recurring Expenses *(Available)*
Never miss a bill again. Automatically track and manage recurring expenses with smart category allocation. Eclosion calculates monthly savings targets for annual, semi-annual, and quarterly expenses so you're always prepared.

- **Smart Savings Calculation** — Automatically calculates what to set aside each month
- **Rollup Mode** — Combine small subscriptions into a single category
- **Progress Tracking** — See at a glance if you're on track for each expense
- **Monarch Sync** — Changes sync directly to your Monarch budget

### Linked Goals *(Coming Soon)*
Privacy-first shared goals. Collaborate on financial goals without merging accounts—each partner keeps their own Monarch account and shares only what they want to share.

## Deployment Options

### Option 1: One-Click Deploy (Railway)

Deploy your own instance with a single click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/yE9Dgv?referralCode=epxV1E&utm_medium=integration&utm_source=template&utm_campaign=generic)

> **Note:** After clicking, you'll create a Railway account (if you don't have one), then your instance will deploy automatically. Typical cost is ~$5-7/month.

**Important:** After deployment, set the `INSTANCE_SECRET` environment variable in Railway to protect your instance. Generate one with:
```bash
openssl rand -hex 16
```

Then access your instance at: `https://your-app.railway.app?secret=YOUR_SECRET`

### Option 2: Self-Host with Docker

Run your own instance on any server with Docker. For comprehensive guides including platform-specific instructions (AWS, DigitalOcean, Kubernetes, NAS, Raspberry Pi, etc.) and reverse proxy setup, see the **[Self-Hosting Guide](docs/SELF_HOSTING.md)**.

```bash
# 1. Clone the repository
git clone https://github.com/graysoncadams/eclosion-for-monarch.git
cd eclosion

# 2. Generate a secret access code
export INSTANCE_SECRET=$(openssl rand -hex 16)
echo "Your access code: $INSTANCE_SECRET"

# 3. Start the container
docker compose up -d

# 4. Access at http://localhost:5001?secret=YOUR_SECRET
```

**Docker Compose with custom settings:**

```yaml
# docker-compose.override.yml
services:
  eclosion:
    ports:
      - "8080:5001"  # Use port 8080 instead
    environment:
      INSTANCE_SECRET: "your-secret-here"
      TZ: "America/Los_Angeles"
```

**Updating:**
```bash
docker compose pull
docker compose up -d
```

**Backup your data:**
```bash
docker compose cp eclosion:/app/state ./backup
```

### Option 3: Run Behind a Reverse Proxy

For production deployments with HTTPS (recommended):

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name eclosion.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Why Self-Host?

- **Fully Yours** — You own your copy completely. Your credentials stay encrypted on your server—no one else can access them.
- **Always In Sync** — Changes you make in Eclosion show up in Monarch automatically. No manual updates needed.
- **Set It & Forget It** — Turn on the features you want, and Eclosion handles the rest in the background.

## How It Works

1. **Deploy** — One-click setup with Railway (~$5-7/month) or self-host with Docker
2. **Connect** — Sign in with your Monarch Money credentials (encrypted with a passphrase only you know)
3. **Enable** — Pick the tools you want to use
4. **Relax** — Eclosion syncs with Monarch and keeps everything updated for you

## Security

Your instance is protected with multiple layers of security:

### Instance Access Control
- **Instance Secret**: Set `INSTANCE_SECRET` to require an access code to even view the app
- Access code is stored in a secure HTTP-only cookie after first use
- Protects against unauthorized access to your deployment

### Credential Protection
- **Fernet encryption** (AES-128-CBC + HMAC-SHA256)
- **PBKDF2 key derivation** with 480,000 SHA-256 iterations
- **Strong passphrase requirements** (12+ chars, mixed case, numbers, special chars)
- **File permissions** restricted to owner only (0600)

### Additional Security
- **Rate limiting**: 5 attempts/minute on login and unlock endpoints
- **Session timeout**: Auto-locks after 30 minutes of inactivity
- **Security headers**: CSP, HSTS, X-Frame-Options, etc.
- **Audit logging**: All security events are logged

The server cannot decrypt your credentials without your passphrase.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `INSTANCE_SECRET` | Access code to protect your instance | **Recommended** |
| `TZ` | Timezone (e.g., `America/New_York`) | No |
| `MONARCH_MONEY_EMAIL` | Fallback Monarch email | No |
| `MONARCH_MONEY_PASSWORD` | Fallback Monarch password | No |
| `MFA_SECRET_KEY` | TOTP MFA secret for auto-login | No |

> **Note:** Credentials should be entered via the web UI. Environment variables are only for advanced automation.

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+

### Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the API server
python api.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Full Stack with Docker

```bash
docker compose up --build
```

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Python 3.12 + Flask
- **State**: JSON file-based (no database required)
- **Deployment**: Docker with persistent volume for state
- **PWA**: Installable as a native-like app

## Updating Your Instance

Your current version is displayed in **Settings** at the bottom of the page. When updates are available, a banner appears at the top of the app with a link to view what's new.

### Before Updating

Always backup your data before major updates:

**Docker:**
```bash
docker compose cp eclosion:/app/state ./backup-$(date +%Y%m%d)
```

**Railway:** Data is automatically persisted in your Railway volume. For extra safety, you can download your state from Settings > Export Data (if available).

### Railway

Railway automatically detects when updates are available from the upstream repository:

1. Open your [Railway Dashboard](https://railway.app/dashboard)
2. Click on your Eclosion project
3. If updates are available, you'll see a prompt to redeploy
4. Click **Deploy** to pull the latest version
5. Wait 1-2 minutes for the deployment to complete
6. Refresh the app to use the new version

### Docker Self-Hosted

**Using pre-built images (recommended):**
```bash
docker compose pull
docker compose up -d
```

**Building from source:**
```bash
cd eclosion
git pull
docker compose up -d --build
```

### Rollback to a Previous Version

If you need to revert to a specific version:

**Docker:** Edit `docker-compose.yml` to pin a version:
```yaml
services:
  eclosion:
    image: ghcr.io/graysoncadams/eclosion-for-monarch:1.0.0
```

**Railway:** In your project settings, you can redeploy a previous deployment from the deployment history.

## Uninstalling / Tearing Down

From within the app, go to Settings > Tear Down & Stop Paying to:
1. Delete all Monarch Money categories created by the app
2. Clear all stored credentials and data
3. Get a direct link to delete your Railway project (if applicable)

## License

MIT
