# GitHub Repository Setup Guide

This guide documents the repository configuration for community readiness and deployment compatibility with Railway/Docker.

## 1. Repository Community Health Files

### Currently Exists
| File | Purpose |
|------|---------|
| `README.md` | Project overview, deployment options |
| `CONTRIBUTING.md` | Development setup, code style, PR process |
| `SECURITY.md` | Encryption details, vulnerability reporting |
| `CHANGELOG.md` | Version history (Keep a Changelog format) |
| `CLAUDE.md` | AI assistant coding standards |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |
| `.github/ISSUE_TEMPLATE/config.yml` | Issue template chooser config |
| `.github/pull_request_template.md` | PR template with checklists |
| `.github/dependabot.yml` | Automated dependency updates |
| `.github/copilot-instructions.md` | GitHub Copilot context |

### Recommended Additions
| File | Purpose | Priority |
|------|---------|----------|
| `LICENSE` | MIT license text | Critical |
| `.github/CODE_OF_CONDUCT.md` | Community behavior standards | High |
| `.github/FUNDING.yml` | Sponsorship links | Optional |
| `.github/workflows/stale.yml` | Auto-close stale issues/PRs | Optional |

---

## 2. CI/CD Workflows

### Existing Workflows

#### `.github/workflows/ci.yml` - Quality Gates
Triggers on every PR:
- **Frontend**: `npm run lint`, `npm run type-check`, `npm run build`
- **Backend**: `ruff check`, `ruff format --check`, `mypy`
- **Docker**: Build validation

#### `.github/workflows/docker-publish.yml` - Image Publishing
- Triggers on `v*` tags
- Multi-platform: `linux/amd64`, `linux/arm64`
- Publishes to `ghcr.io/graysoncadams/eclosion`
- Release channel detection (stable/beta/dev)

---

## 3. Docker Configuration

### Files
- `Dockerfile` - Multi-stage build (Node frontend → Python backend)
- `docker-compose.yml` - Local development with health checks
- `.dockerignore` - Excludes dev files, secrets, caches

### Build Args (set automatically by CI)
| Arg | Description |
|-----|-------------|
| `BUILD_TIME` | Timestamp |
| `GIT_SHA` | Commit hash |
| `VERSION` | Tag name (v1.0.0) |
| `RELEASE_CHANNEL` | stable/beta/dev |

### Environment Variables
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `INSTANCE_SECRET` | Recommended | - | Access protection |
| `PORT` | No | 5001 | Server port |
| `TZ` | No | UTC | Timezone |
| `SESSION_TIMEOUT_MINUTES` | No | 30 | Lock timeout |
| `SESSION_LIFETIME_DAYS` | No | 7 | Cookie lifetime |
| `RATE_LIMIT_DAILY` | No | 1000 | Per-IP daily limit |
| `RATE_LIMIT_HOURLY` | No | 200 | Per-IP hourly limit |

---

## 4. Railway Configuration

### File: `railway.toml`
```toml
[build]
builder = "dockerfile"
dockerfilePath = "./Dockerfile"

[deploy]
startCommand = "python3 app.py"
numReplicas = 1
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Railway Setup Steps
1. Connect GitHub repo to Railway
2. Railway auto-detects `railway.toml`
3. Add environment variable: `INSTANCE_SECRET`
4. Deploy - Railway handles volume mount for `/app/state`

---

## 5. Version System

### How It Works
1. **Source of truth**: `frontend/package.json` version field
2. **Build injection**: Vite injects `__APP_VERSION__` at build time
3. **API endpoints**:
   - `GET /version` - Current version info
   - `POST /version/check` - Compare client vs server
   - `GET /version/changelog` - Parsed changelog entries
   - `GET /version/releases` - GitHub releases list

### Release Process
1. Update `frontend/package.json` version
2. Update `CHANGELOG.md` with new section
3. Commit: `git commit -m "chore: bump version to X.Y.Z"`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push origin main --tags`
6. CI builds and publishes Docker image automatically

---

## 6. Repository Configuration

### Branch Protection on `main`
```bash
gh api repos/{owner}/{repo}/branches/main/protection -X PUT \
  -f required_status_checks='{"strict":true,"contexts":["frontend","backend","docker"]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"required_approving_review_count":1}' \
  -f restrictions=null
```

### Repository Settings
```bash
# Enable squash merge as default, auto-merge, delete branches
gh repo edit --enable-squash-merge --enable-auto-merge --delete-branch-on-merge

# Enable discussions
gh repo edit --enable-discussions

# Add topics for discoverability
gh repo edit --add-topic monarch-money --add-topic budgeting --add-topic finance --add-topic react --add-topic flask
```

---

## 7. CI/CD Enhancement Options

### Stale Issue/PR Workflow
Auto-close inactive issues/PRs after 60 days of inactivity.

### Release Drafter
Auto-generate release notes from PR labels.

### PR Labeler
Auto-label PRs by file paths changed.

### CodeQL Workflow
Automated security scanning for vulnerabilities.

---

## Quick Start Checklist

### Minimum for Community-Ready
- [x] README with clear setup instructions
- [x] CONTRIBUTING.md with dev workflow
- [ ] LICENSE file (MIT)
- [ ] CODE_OF_CONDUCT.md
- [x] Issue templates
- [x] PR template
- [x] CI/CD pipeline
- [x] Security documentation

### For Production Deployment
- [x] Docker multi-stage build
- [x] Railway configuration
- [x] Health check endpoint
- [x] Environment variable documentation
- [x] Version check system
- [x] Changelog management
