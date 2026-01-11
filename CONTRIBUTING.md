# Contributing to Eclosion

Thank you for your interest in contributing to Eclosion! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
  - [GitHub Actions Workflow Standards](#github-actions-workflow-standards)
- [Release Process](#release-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Architecture Overview](#architecture-overview)

## Code of Conduct

Please be respectful and constructive in all interactions. Contributors of all experience levels are welcome.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (optional, for containerized development)
- PyInstaller (for desktop builds)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/312-dev/eclosion.git
   cd eclosion
   ```

2. **Backend setup**
   ```bash
   # Create virtual environment (recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies
   pip install -r requirements-dev.txt

   # Install pre-commit hooks
   pre-commit install

   # Start the API server
   python app.py
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Full stack with Docker**
   ```bash
   docker compose up --build
   ```

5. **Desktop development** (optional)
   ```bash
   cd desktop
   npm install

   # Development mode (requires backend running separately)
   npm run dev

   # Build for your platform
   npm run dist:mac     # macOS
   npm run dist:win     # Windows
   npm run dist:linux   # Linux
   ```

   The desktop app bundles the Python backend via PyInstaller. For development:
   - Run `python app.py` for the backend
   - Run `cd frontend && npm run dev` for the frontend
   - Run `cd desktop && npm run dev` to test the Electron shell

### Environment Variables

Copy `.env.example` to `.env` and configure:
- `FLASK_DEBUG=1` - Enable debug mode for development
- See `.env.example` for all available options

## Branching Strategy

This project uses **GitHub Flow** — a simple workflow where all changes go directly to `main`.

### Branch Types

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Single source of truth | [eclosion.app](https://eclosion.app) (stable) |
| `feature/*` | New features, enhancements | — |
| `update/*` | Fixes, refactors, docs, chores | — |

### Branch Flow

```
feature/your-branch ──┐
                      ├──► main ──► (tag) ──► eclosion.app / beta.eclosion.app
update/your-branch ───┘
```

- **Beta releases**: Pre-release tags on `main` → deploys to beta.eclosion.app
- **Stable releases**: Release tags on `main` → deploys to eclosion.app

### Branch Naming

Branch names **must** use one of these prefixes (enforced by CI):

| Prefix | Use for | Example |
|--------|---------|---------|
| `feature/` | New features, enhancements | `feature/add-dark-mode` |
| `update/` | Fixes, refactors, docs, chores | `update/fix-login-bug` |

PRs with other branch name prefixes will be blocked.

## Commit Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types and Version Impact

Your commit type determines how the version number changes when releasing:

| Type | Description | Version Bump | Changelog Section |
|------|-------------|--------------|-------------------|
| `feat:` | New feature | **Minor** (1.1.0 → 1.2.0) | Features |
| `fix:` | Bug fix | **Patch** (1.1.0 → 1.1.1) | Bug Fixes |
| `perf:` | Performance improvement | **Patch** | Performance |
| `refactor:` | Code refactoring | None | Code Refactoring |
| `docs:` | Documentation only | None | Documentation |
| `test:` | Adding/updating tests | None | (hidden) |
| `chore:` | Maintenance tasks | None | Miscellaneous |
| `build:` | Build system changes | None | (hidden) |
| `ci:` | CI/CD changes | None | (hidden) |

### Breaking Changes

Breaking changes trigger a **major** version bump (1.1.0 → 2.0.0). Indicate them with:

- Add `!` after the type: `feat!: remove legacy API`
- Or add a footer: `BREAKING CHANGE: description`

### Examples

```
feat: add dark mode toggle

feat(api): add user preferences endpoint

fix: resolve login timeout on slow connections

Closes #123

refactor: extract validation logic into separate module

feat!: change authentication response format

BREAKING CHANGE: The /auth endpoint now returns {token, user} instead of just token.
Migration guide available in docs/migration-v2.md.
```

### Why This Matters

Using the correct commit type ensures:
- Accurate version bumps (feat = minor, fix = patch)
- Clean, categorized changelogs
- Easy tracking of what changed between releases

## Pull Request Process

### Creating a PR

1. **Create a branch from `main`**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **Make your changes** with clear, conventional commits

3. **Run quality checks locally**
   ```bash
   # Frontend
   cd frontend
   npm run lint
   npm run type-check
   npm run build
   npm test

   # Backend
   ruff check .
   ruff format --check .
   pytest
   ```

4. **Push and create a PR to `main`**
   ```bash
   git push -u origin feature/your-feature
   ```
   Then create a PR targeting the `main` branch.

5. **Address review feedback** promptly

### PR Requirements

| Target Branch | CI Checks | Security Scans | Code Review |
|---------------|-----------|----------------|-------------|
| `main` | Must pass | Must pass | 1 approval |

> **Note**: Documentation-only PRs (markdown files, `docusaurus/`, `scripts/docs-gen/`) can skip CI builds.

### Security Thresholds

| Action | Threshold | What's Checked |
|--------|-----------|----------------|
| PR to `main` | Medium+ blocks | CodeQL, npm audit, pip-audit, Trivy, ZAP |
| **Beta release** | **High+ blocks** | Full security scan suite |
| **Stable release** | **Medium+ blocks** | Full security scan suite |

**Security scans include:** CodeQL (SAST), dependency audit (npm/pip), container scan (Trivy), DAST (OWASP ZAP)

### Repository Secrets

The following secrets are required for CI/CD workflows:

| Secret | Purpose | Required Scopes |
|--------|---------|-----------------|
| `CI_TRIGGER_PAT` | Allow automated PRs to trigger CI workflows | `repo` (classic) or `contents:write` + `pull_requests:write` (fine-grained) |
| `DISCUSSIONS_PAT` | Create GitHub Discussions from ProductBoard sync | `discussions:write` |
| `MODELS_TOKEN` | Access GitHub Models API for AI features | GitHub Models access |
| `CLOUDFLARE_API_TOKEN` | Deploy to Cloudflare Pages | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier | — |

**Desktop Signing (macOS only - optional):**

| Secret | Purpose |
|--------|---------|
| `APPLE_CERTIFICATE` | Base64-encoded Developer ID certificate (.p12) |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the certificate |
| `APPLE_ID` | Apple ID email for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

> **Note**: macOS code signing is optional. Without these secrets, the app builds but won't be notarized (users may need to right-click → Open on first launch).

> **Note**: PRs created using `GITHUB_TOKEN` don't trigger other workflows (GitHub's recursive workflow prevention). Workflows that create PRs with auto-merge use `CI_TRIGGER_PAT` to ensure CI runs.

### GitHub Actions Workflow Standards

When contributing workflow changes, follow these patterns:

#### Token Usage

| Token | Use For | NOT For |
|-------|---------|---------|
| `GITHUB_TOKEN` | Most operations, posting commit statuses | Creating releases that need to trigger other workflows |
| `CI_TRIGGER_PAT` | Creating releases/PRs that must trigger downstream workflows | Regular operations |

`GITHUB_TOKEN` pushes and PR creations won't trigger `on: push` or `on: pull_request` events in other workflows (GitHub's infinite loop prevention). However, `gh workflow run` with `GITHUB_TOKEN` **does** work for triggering `workflow_dispatch`.

#### workflow_dispatch + Commit Status Pattern

When workflows are triggered via `workflow_dispatch` (not `pull_request`), their check runs don't automatically appear on PRs. To fix this, pass the commit SHA and post a status:

```yaml
# Caller workflow
- name: Trigger CI
  run: |
    HEAD_SHA=$(gh api repos/${{ github.repository }}/git/ref/heads/$BRANCH --jq '.object.sha')
    gh workflow run ci.yml --ref "$BRANCH" -f head_sha="$HEAD_SHA"

# Target workflow (ci.yml)
on:
  workflow_dispatch:
    inputs:
      head_sha:
        description: 'Commit SHA to post status to'
        required: false
        type: string

jobs:
  ci:
    steps:
      - name: Run checks
        id: check
        run: |
          # ... run checks ...
          echo "result=success" >> $GITHUB_OUTPUT

      - name: Post commit status
        if: github.event_name == 'workflow_dispatch' && inputs.head_sha && always()
        run: |
          gh api repos/${{ github.repository }}/statuses/${{ inputs.head_sha }} \
            -f state="${{ steps.check.outputs.result }}" \
            -f context="CI Status"
```

#### Required Job Settings

All jobs must include:

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # Required - prevents hanging jobs
```

Recommended timeouts by job type:

| Job Type | Timeout |
|----------|---------|
| Simple checks (branch validation, status posting) | 5 min |
| Build/test jobs | 10-15 min |
| Security scans, DAST | 15-20 min |
| Docker multi-arch builds | 30 min |

#### Error Logging

Never log full API responses (may contain tokens):

```yaml
# BAD - exposes secrets
echo "API Response: $RESPONSE"

# GOOD - log only error info
ERROR=$(echo "$RESPONSE" | jq -r '.error.message // "Unknown error"')
echo "API Error: $ERROR"
```

#### Action Versions

Pin actions to specific versions, not branches:

```yaml
# BAD
uses: some-org/some-action@master

# GOOD
uses: some-org/some-action@v1.2.3
```

#### Centralized Trigger Pattern

When multiple jobs in a workflow may push commits, use a dedicated trigger job at the end:

```yaml
# BAD - Each job triggers CI, causing duplicates
generate-summary:
  steps:
    - run: git push
    - run: gh workflow run ci.yml  # First trigger

generate-docs:
  needs: generate-summary
  steps:
    - run: git push
    - run: gh workflow run ci.yml  # Duplicate trigger!

# GOOD - Single trigger after all commits
generate-summary:
  steps:
    - run: git push
    # No trigger here

generate-docs:
  needs: generate-summary
  steps:
    - run: git push
    # No trigger here

trigger-checks:
  needs: [generate-summary, generate-docs]
  if: always()
  steps:
    - run: |
        HEAD_SHA=$(gh api .../git/ref/heads/$BRANCH --jq '.object.sha')
        gh workflow run ci.yml -f head_sha="$HEAD_SHA"  # Single trigger with final SHA
```

#### Keeping Reusable Workflows Generic

Workflows called via `workflow_call` should remain generic and reusable:

```yaml
# BAD - Release-specific logic in a reusable workflow
# generate-docs.yml
- run: gh workflow run require-develop.yml  # This is release.yml's concern

# GOOD - Keep it generic, let the caller handle orchestration
# generate-docs.yml just generates docs
# release.yml handles the trigger orchestration
```

## Release Process

### Versioning

This project uses two versioning schemes:

**Stable releases** — Semantic versioning
- Format: `vX.Y.Z` (e.g., `v1.2.0`)
- Created manually via workflow dispatch
- Version bump type (patch/minor/major) chosen at release time

**Beta releases** — Date-based versioning
- Format: `v{current}-beta.{YYYYMMDD}.{sequence}`
- Example: `v1.1.0-beta.20260104.1`
- Created manually via workflow dispatch

### Deployment Environments

| Environment | URL | Trigger |
|-------------|-----|---------|
| **Beta** | [beta.eclosion.app](https://beta.eclosion.app) | Beta pre-release tag |
| **Production** | [eclosion.app](https://eclosion.app) | Stable release tag |

### Release Flow

```
┌─────────────────────────────────────────────────────────┐
│                      MAIN BRANCH                        │
│  Features merged via PRs (squash merge)                 │
│  CI + Security runs on each push                        │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────────┐     ┌───────────────────┐
│   BETA RELEASE    │     │  STABLE RELEASE   │
│                   │     │                   │
│ Actions → Create  │     │ Actions → Create  │
│ Beta Release      │     │ Stable Release    │
│                   │     │                   │
│ → Security scan   │     │ → Version bump    │
│ → Tag: v1.1.0-    │     │ → Tag: v1.2.0     │
│   beta.20260104.1 │     │ → Changelog       │
│ → Pre-release     │     │ → Release         │
└─────────┬─────────┘     └─────────┬─────────┘
          │                         │
          ▼                         ▼
   beta.eclosion.app         eclosion.app
   Docker: beta tag          Docker: version tag
   Desktop pre-release       Desktop release
```

### Creating a Beta Release

When `main` is ready for beta testing:

1. Go to **Actions** → **Release: Create Beta**
2. Click **Run workflow**
3. Select `main` from the branch dropdown
4. Click **Run workflow**

The workflow automatically:
- Runs full security scan (HIGH+ blocks)
- Creates a tag like `v1.1.0-beta.20260104.1`
- Creates a GitHub pre-release with auto-generated notes
- Deploys to beta.eclosion.app
- Builds Docker image with beta tag
- Builds desktop apps for all platforms

### Creating a Stable Release

When ready for production:

1. Go to **Actions** → **Release: Create Stable**
2. Click **Run workflow**
3. Select `main` from the branch dropdown
4. Choose version bump type (**patch**, **minor**, or **major**)
5. Click **Run workflow**

The workflow automatically:
- Calculates the new version number
- Updates version in all package files
- Runs full security scan (MEDIUM+ blocks)
- Creates a tag like `v1.2.0`
- Generates changelog from commits since last release
- Creates GitHub release with notes
- Deploys to eclosion.app
- Builds Docker image with version tag
- Builds desktop apps for all platforms

### Version Bump Guidelines

| Bump Type | When to Use | Example |
|-----------|-------------|---------|
| **patch** | Bug fixes, minor improvements | 1.2.0 → 1.2.1 |
| **minor** | New features (backward compatible) | 1.2.0 → 1.3.0 |
| **major** | Breaking changes | 1.2.0 → 2.0.0 |

## Code Style

### Python (Backend)

- Follow PEP 8 with Ruff for linting and formatting
- Use type hints for function parameters and return values
- Keep functions focused and under 50 lines when possible

```python
@app.route("/api/example", methods=["POST"])
@async_flask
async def example_route() -> Response:
    """Brief description of what this route does."""
    data = request.get_json()
    result = await service.process(data)
    return jsonify(result)
```

### TypeScript (Frontend)

- Use TypeScript strict mode
- Define types in `src/types/`
- Use the API client from `src/api/client.ts` for all backend calls
- Follow React hooks best practices

```typescript
// Use typed API functions
import { fetchDashboard } from '@/api/client';

// Define props interfaces
interface ComponentProps {
  title: string;
  onAction: () => void;
}

// Use functional components with hooks
export function Component({ title, onAction }: ComponentProps) {
  // ...
}
```

### Tailwind CSS

- Use utility classes, avoid custom CSS when possible
- Follow existing component patterns in `src/components/`
- Use Tailwind's responsive prefixes for mobile support

## Testing

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_savings_calculator.py
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### Desktop Tests

```bash
cd desktop

# Run unit tests
npm test

# Run with watch mode
npm run test:watch

# Lint and type check
npm run lint
npm run type-check
```

## Architecture Overview

### Backend Structure

```
api.py              # Flask routes and app configuration
app.py              # Application entry point
core/               # Core utilities (logging, encryption, config)
services/           # Business logic services
  sync_service.py   # Main sync orchestration
  credentials_service.py  # Auth and encryption
state/              # State management and persistence
  state_manager.py  # JSON-based state persistence
tests/              # Backend tests
```

### Frontend Structure

```
frontend/src/
  api/              # API client for backend communication
  components/       # React components
  constants/        # Application constants
  context/          # React context providers
  hooks/            # Custom React hooks
  pages/            # Page-level components
  test/             # Test utilities and setup
  types/            # TypeScript type definitions
  utils/            # Utility functions
```

### Desktop Structure

```
desktop/
  src/
    main/           # Electron main process
      index.ts      # Entry point
      backend.ts    # Python subprocess management
      window.ts     # BrowserWindow lifecycle
      tray.ts       # System tray integration
      autostart.ts  # Auto-launch on login
      updater.ts    # Auto-update via GitHub Releases
      ipc.ts        # IPC handlers for renderer
    preload/
      index.ts      # Secure context bridge
  scripts/
    build-backend.js    # PyInstaller wrapper
    generate-icons.js   # Icon generation from SVG
    package-all.js      # Full build orchestration
  pyinstaller/
    eclosion.spec       # PyInstaller configuration
  assets/               # App icons (icns, ico, png)
  electron-builder.yml  # Cross-platform build config
```

**Desktop Architecture:**

```
┌─────────────────────────────────────────────────────┐
│                    Electron                          │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │   Main Process  │    │    Renderer (React)     │ │
│  │  - Spawn Python │    │    - Served locally     │ │
│  │  - System tray  │◄──►│    - API calls to       │ │
│  │  - Auto-update  │    │      localhost:PORT     │ │
│  └────────┬────────┘    └─────────────────────────┘ │
│           │                                          │
│           ▼                                          │
│  ┌─────────────────┐                                │
│  │ Python Backend  │  (PyInstaller executable)      │
│  │  - Flask API    │                                │
│  │  - APScheduler  │                                │
│  └─────────────────┘                                │
└─────────────────────────────────────────────────────┘
```

### Key Patterns

1. **State Management**: Use `StateManager` for persistence, never modify JSON directly
2. **API Calls**: Use typed functions from `frontend/src/api/client.ts`
3. **Error Handling**: Return proper HTTP status codes with JSON error messages
4. **Types**: Import from `../types` - types are organized by domain

## Questions?

- Open a GitHub Discussion for questions
- Check existing issues before creating new ones
- Read the [README](README.md) for general usage information
- See [SECURITY.md](SECURITY.md) for security-related questions
