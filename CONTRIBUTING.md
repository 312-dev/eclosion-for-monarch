# Contributing to Eclosion

Thank you for your interest in contributing to Eclosion! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Dependency Management](#dependency-management)
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

   # Install dependencies (hash-verified for supply chain security)
   pip install --require-hashes -r requirements-dev.txt   # PyPI packages with hash verification
   pip install --no-deps -r requirements-vcs.txt          # VCS dependencies

   # Install pre-commit hooks
   pre-commit install

   # Start the API server
   python app.py
   ```

   > **Note:** See [Dependency Management](#dependency-management) for details on adding new packages.

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

## Dependency Management

This project uses **hash-pinned dependencies** for supply chain security, following [OpenSSF Scorecard](https://securityscorecards.dev/) best practices.

### File Structure

| File | Purpose | How to Edit |
|------|---------|-------------|
| `requirements.in` | Production dependencies (version constraints) | Add packages here |
| `requirements.txt` | Locked production deps with hashes | Auto-generated |
| `requirements-dev.in` | Dev dependencies (version constraints) | Add dev packages here |
| `requirements-dev.txt` | Locked dev deps with hashes | Auto-generated |
| `requirements-vcs.txt` | VCS/Git dependencies (branch-pinned) | Edit directly |

### Adding a New Dependency

1. **For PyPI packages**: Add to the appropriate `.in` file:
   ```bash
   # Production dependency
   echo "new-package>=1.0.0" >> requirements.in

   # Development dependency
   echo "new-dev-tool>=2.0.0" >> requirements-dev.in
   ```

2. **Regenerate the locked file with hashes:**
   ```bash
   # Install pip-tools if needed
   pip install pip-tools

   # Regenerate production dependencies
   pip-compile --generate-hashes --allow-unsafe requirements.in

   # Regenerate dev dependencies
   pip-compile --generate-hashes --allow-unsafe requirements-dev.in
   ```

3. **For Git dependencies**: Edit `requirements-vcs.txt` directly:
   ```bash
   # Add to requirements-vcs.txt (pin to branch or commit)
   git+https://github.com/org/repo.git@branch-name
   # Or pin to specific commit:
   git+https://github.com/org/repo.git@abc123def456
   ```

### Why Hash Pinning?

- **Supply chain security**: Hashes ensure you get the exact package that was audited
- **Reproducible builds**: Same hashes = same packages across all environments
- **Tamper detection**: If a package is modified on PyPI, the hash won't match
- **OpenSSF compliance**: Required for high Scorecard ratings

### VCS Dependencies

VCS dependencies (like our monarchmoney fork) cannot be hash-verified because they're not published to PyPI. Instead, they are:
- **Branch or commit-pinned**: Locked to a specific branch or commit SHA
- **Installed separately**: After the hash-verified PyPI packages with `--no-deps`

To update a VCS dependency, edit `requirements-vcs.txt` directly.

## Branching Strategy

This project uses **GitHub Flow**: a simple workflow where all changes go directly to `main`.

### Branch Types

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Single source of truth | [eclosion.app](https://eclosion.app) (stable) |
| `feature/*` | New features, enhancements | : |
| `update/*` | Fixes, refactors, docs, chores | : |

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
| `main` | Must pass | Must pass | 2 approvals |

**Branch protection rules:**
- **2 approving reviews required**: PRs need approval from two different reviewers
- **Last push approval required**: The person who pushed the most recent commit cannot be the sole approver
- **Up-to-date branches required**: Your branch must be rebased on the latest `main` before merging
- **Admins cannot bypass**: These rules apply to everyone, including repository administrators
- **Stale reviews dismissed**: New commits invalidate previous approvals

> **Note**: Documentation-only PRs (markdown files, `docusaurus/`, `scripts/docs-gen/`) can skip CI builds.

**Automated code review:**
- **GitHub Copilot review**: PRs are automatically reviewed by Copilot for code quality issues
- Copilot adds a "needs copilot review" label until review completes
- Issues found by Copilot must be addressed before merging
- Admins can add the `skip-copilot-review` label to bypass (use sparingly)
- Bot PRs (Dependabot, etc.) are automatically skipped

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
| `CI_TRIGGER_PAT` | Automated PRs, GitHub Discussions, trigger CI workflows | `contents:write` + `pull_requests:write` + `discussions:write` (fine-grained) |
| `INTEGRATION_DISPATCH_TOKEN` | Trigger integration test workflows | `actions:write` (fine-grained) |
| `MODELS_TOKEN` | Access GitHub Models API for AI features | GitHub Models access |
| `CLOUDFLARE_API_TOKEN` | Deploy to Cloudflare Pages | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier | : |

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

#### Workflow Permissions

Follow the principle of least privilege by declaring permissions at the job level, not workflow level:

```yaml
# GOOD - Minimal permissions at workflow level, specific permissions per job
permissions: {}  # Deny all at workflow level

jobs:
  check-branch:
    permissions: {}  # Jobs that don't need permissions
    steps: ...

  calculate-version:
    permissions:
      contents: read  # Only what this job needs
    steps: ...

  create-release:
    permissions:
      contents: write  # Only what this job needs
    steps: ...

# BAD - Broad permissions at workflow level
permissions:
  contents: write
  packages: write
  security-events: write
  # All jobs inherit these even if they don't need them
```

Common permission patterns:

| Job Type | Permissions |
|----------|-------------|
| Branch/input validation | `permissions: {}` |
| Read-only operations (checkout, version calc) | `contents: read` |
| Create releases/tags | `contents: write` |
| Push Docker images | `packages: write` |
| Security scan results | `security-events: write` |
| Sigstore signing | `id-token: write` |

This pattern is required for OpenSSF Scorecard compliance and reduces the blast radius if a job is compromised.

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

Pin actions to SHA hashes for supply chain security (following OpenSSF Scorecard best practices):

```yaml
# BAD - mutable branch reference
uses: some-org/some-action@master

# BETTER - version tag (still mutable)
uses: some-org/some-action@v1.2.3

# BEST - SHA hash with version comment (immutable)
uses: some-org/some-action@abc123def456789... # v1.2.3
```

To find the SHA for a version tag:
```bash
# Visit the action's releases page or use git
git ls-remote https://github.com/actions/checkout refs/tags/v4
```

Dependabot will automatically update SHA-pinned actions and maintain the version comment.

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

**Stable releases**: Semantic versioning
- Format: `vX.Y.Z` (e.g., `v1.2.0`)
- Created manually via workflow dispatch
- Version bump type (patch/minor/major) chosen at release time

**Beta releases**: Date-based versioning
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
# Add routes to the appropriate blueprint in blueprints/
# Example: blueprints/recurring.py

from flask import Blueprint, request
from core import api_handler, sanitize_id, sanitize_name
from core.rate_limit import limiter
from . import get_services

recurring_bp = Blueprint("recurring", __name__, url_prefix="/recurring")

@recurring_bp.route("/example", methods=["POST"])
@limiter.limit("10 per minute")  # Rate limit write operations
@api_handler(handle_mfa=False)
async def example_route():
    """Brief description of what this route does."""
    services = get_services()
    data = request.get_json()

    # Sanitize user inputs
    item_id = sanitize_id(data.get("id"))
    name = sanitize_name(data.get("name"))

    result = await services.sync_service.process(item_id, name, data)
    return result  # @api_handler wraps with jsonify() and sanitizes response
```

**Key patterns:**
- `@api_handler` handles async, error handling, and response XSS sanitization
- Use `@limiter.limit()` on write operations (see `core/rate_limit.py`)
- Sanitize inputs with `sanitize_id()`, `sanitize_name()` from `core`
- Access services via `get_services()` from the blueprints module
- Return raw dict/list - `@api_handler` wraps with `jsonify()`

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

### Test Architecture

This project has multiple test layers:

| Test Type | Location | What It Tests | When It Runs |
|-----------|----------|---------------|--------------|
| **Unit tests** | `tests/`, `frontend/src/**/*.test.*` | Individual functions/components | Every PR |
| **E2E tests** | `desktop/e2e/` | UI flows (demo mode) | Every PR |
| **Integration tests** | `tests/integration/` | Real Monarch API | Before releases only |

### Integration Tests (Monarch API)

Integration tests verify that the app works correctly with the real Monarch Money API. These tests:

- **Run automatically** before beta and stable releases
- **Use temporary data** that is created and cleaned up during tests
- **Don't run on PRs**: they only gate releases to avoid unnecessary API usage
- **Are not manually runnable** by contributors

**If you add new Monarch API calls**, you must add corresponding integration tests:

1. Add test cases to `tests/integration/` (see existing tests for patterns)
2. Use the `test_category_prefix` fixture for any categories you create
3. Always clean up test data in a `finally` block
4. The CI check `Check Monarch API integration test coverage` will fail if you miss any

**Example pattern for new API tests:**

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_new_api_function(monarch_client, unique_test_name):
    """Test the new API function."""
    # Create test data
    result = await monarch_client.new_api_function(unique_test_name)

    try:
        # Verify behavior
        assert result is not None
    finally:
        # Always cleanup (if applicable)
        await monarch_client.cleanup_function(result["id"])
```

**Running locally** (for maintainers only : requires credentials):

```bash
INTEGRATION_TEST=true \
MONARCH_EMAIL=your@email.com \
MONARCH_PASSWORD=your-password \
MFA_SECRET_KEY=your-totp-secret \
pytest tests/integration/ -v
```

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
api.py              # Flask app setup and middleware
blueprints/         # Flask blueprints (organized by domain)
  __init__.py       # Services container and registration
  auth.py           # Authentication endpoints
  recurring.py      # Recurring expense tracking
  notes.py          # Category notes management
  security.py       # Security status and audit
  settings.py       # Export/import settings
  admin.py          # Health, version, migrations
core/               # Core utilities
  __init__.py       # Logging, encryption, config, decorators
  middleware.py     # Security middleware functions
  session.py        # Session timeout tracking
  rate_limit.py     # Rate limiter instance
  audit.py          # Audit logging
services/           # Business logic services
  sync_service.py   # Main sync orchestration
  credentials_service.py  # Auth and encryption
state/              # State management and persistence
  db/               # SQLite database (SQLAlchemy ORM)
  state_manager.py  # Legacy state manager (being migrated)
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

1. **State Management**: Use repository classes in `state/db/` for persistence
2. **API Calls**: Use typed functions from `frontend/src/api/client.ts`
3. **Error Handling**: Return proper HTTP status codes with JSON error messages
4. **Types**: Import from `../types` - types are organized by domain

## Questions?

- Open a GitHub Discussion for questions
- Check existing issues before creating new ones
- Read the [README](README.md) for general usage information
- See [SECURITY.md](SECURITY.md) for security-related questions
