# Eclosion for Monarch

> **Your budgeting, evolved.**

A toolkit for Monarch Money that automates recurring expense tracking. Eclosion creates dedicated budget categories for each subscription and calculates the monthly contribution needed to have funds ready when each bill is due.

*Eclosion (n.): The emergence of an insect from its cocoon or a larva from an egg — symbolizing the transformation and growth of your budget.*

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

Run your own instance on any server with Docker:

```bash
# 1. Clone the repository
git clone https://github.com/GraysonCAdams/eclosion.git
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

## Features

- Automatically detects recurring transactions from Monarch Money
- Creates budget categories for each subscription
- Calculates monthly contribution amounts based on billing frequency
- Tracks progress toward each subscription's target
- Supports rollup categories for grouping small subscriptions
- Encrypted credential storage with strong passphrase protection
- PWA support — install as an app on mobile/desktop

## How It Works

1. **Connect**: Enter your Monarch Money credentials (encrypted locally)
2. **Configure**: Select which category group to use for subscription tracking
3. **Enable**: Choose which recurring items to track
4. **Sync**: Eclosion creates categories and calculates monthly targets

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
