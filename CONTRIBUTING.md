# Contributing to Eclosion for Monarch

Thank you for your interest in contributing to Eclosion! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
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

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/graysoncadams/eclosion-for-monarch.git
   cd eclosion-for-monarch
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

### Environment Variables

Copy `.env.example` to `.env` and configure:
- `FLASK_DEBUG=1` - Enable debug mode for development
- See `.env.example` for all available options

## Branching Strategy

This project uses a **Git Flow** workflow where all changes flow through `develop` before reaching `main`.

### Branch Types

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production-ready code | [eclosion.app](https://eclosion.app) |
| `develop` | Integration branch for features | [beta.eclosion.app](https://beta.eclosion.app) (via pre-release) |
| `feature/*` | New features, enhancements | — |
| `update/*` | Fixes, refactors, docs, chores | — |

### Branch Flow

```
feature/your-branch ──┐
                      ├──► develop ──► (beta release) ──► beta.eclosion.app
update/your-branch ───┘        │
                               ▼
                             main ──► (release) ──► eclosion.app
```

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

[release-please](https://github.com/googleapis/release-please) automatically:
- Reads your commit messages when `develop` is merged to `main`
- Determines the appropriate version bump
- Generates the changelog
- Creates a release PR

Using the correct commit type ensures accurate versioning and a useful changelog for users.

## Pull Request Process

### Creating a PR

1. **Create a branch from `develop`**
   ```bash
   git checkout develop
   git pull origin develop
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

4. **Push and create a PR to `develop`** (not main)
   ```bash
   git push -u origin feature/your-feature
   ```
   Then create a PR targeting the `develop` branch.

5. **Address review feedback** promptly

### PR Requirements

| Target Branch | CI Checks | Security Scans | Code Review | Vulnerability Threshold |
|---------------|-----------|----------------|-------------|------------------------|
| `develop` | Run | Run (visible) | None required | — |
| `main` | Must pass | Must pass | 1 approval | Medium+ blocks merge |

> **Note**: PRs directly to `main` will be blocked. Always target `develop` first.

**Security scans include:** CodeQL (SAST), dependency audit (npm/pip), container scan (Trivy), DAST (OWASP ZAP)

## Release Process

### Versioning

This project uses two versioning schemes:

**Production releases** — Semantic versioning managed by release-please
- Format: `vX.Y.Z` (e.g., `v1.2.0`)
- Version determined automatically from conventional commits

**Beta releases** — Date-based versioning
- Format: `v{current}-beta.{YYYYMMDD}.{sequence}`
- Example: `v1.1.0-beta.20260104.1`
- Created via manual workflow dispatch

### Deployment Environments

| Environment | URL | Trigger | Approval |
|-------------|-----|---------|----------|
| **Beta** | [beta.eclosion.app](https://beta.eclosion.app) | Beta pre-release created | Required |
| **Production** | [eclosion.app](https://eclosion.app) | Release published | Required |

### Release Flow

```
┌─────────────────────────────────────────────────────────┐
│                    DEVELOP BRANCH                       │
│  Features merged via PRs                                │
│  CI runs on each push                                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│        MANUAL: Run "Create Beta Release" workflow       │
│  → Reads version from package.json (e.g., 1.1.0)        │
│  → Creates tag: v1.1.0-beta.20260104.1                  │
│  → Creates GitHub pre-release                           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              AUTOMATIC: prereleased event               │
│  → Deploys to beta.eclosion.app                         │
│  → Builds Docker image with beta tag                    │
└─────────────────────────────────────────────────────────┘
                      │
                      │ (when ready for production)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 PR: develop → main                      │
│  → CI + Security checks must pass                       │
│  → Requires maintainer approval                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│            AUTOMATIC: release-please runs               │
│  → Analyzes commits since last release                  │
│  → Determines version bump (patch/minor/major)          │
│  → Creates release PR with changelog                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              MERGE: Release PR                          │
│  → GitHub release created (e.g., v1.2.0)                │
│  → Production deployment triggered                      │
│  → Docker image published                               │
│  → Future betas use new version as base                 │
└─────────────────────────────────────────────────────────┘
```

### Creating a Beta Release

When `develop` is ready for beta testing:

1. Go to **Actions** → **Create Beta Release**
2. Click **Run workflow**
3. Select `develop` from the branch dropdown
4. Click **Run workflow**

The workflow automatically:
- Reads the current version from `package.json`
- Creates a tag like `v1.1.0-beta.20260104.1`
- Creates a GitHub pre-release with auto-generated notes
- Triggers deployment to beta.eclosion.app
- Builds and publishes a Docker image

### How release-please Works

When `develop` is merged to `main`:

1. **Commit analysis** — Scans all commits since the last release tag
2. **Version calculation** — Determines bump from commit types:
   - Any `feat!:` or `BREAKING CHANGE:` → major bump
   - Any `feat:` → minor bump
   - Only `fix:`/`perf:` → patch bump
3. **PR creation** — Creates/updates a release PR with:
   - Version bumps in `package.json`, `pyproject.toml`
   - Updated `CHANGELOG.md`
4. **Release** — When the PR is merged:
   - GitHub release is created
   - Production deployment triggers
   - Docker image is published

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
