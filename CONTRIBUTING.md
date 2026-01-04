# Contributing to Eclosion for Monarch

Thank you for your interest in contributing to Eclosion! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
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

## Making Changes

### Branch Naming

Branch names **must** use one of these prefixes (enforced by CI):

| Prefix | Use for | Example |
|--------|---------|---------|
| `feature/` | New features, enhancements | `feature/add-dark-mode` |
| `update/` | Fixes, refactors, docs, chores | `update/fix-login-bug` |

PRs with other branch names will be blocked.

### Commit Messages

Write clear, concise commit messages:
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Fix bug" not "Fixes bug")
- Reference issues when applicable ("Fix #123")

Example:
```
Add category emoji customization

- Add emoji picker component to category settings
- Store emoji preference in state manager
- Update category display across dashboard

Closes #45
```

## Pull Request Process

This project uses **Git Flow**: all contributions go through `develop` before reaching `main`.

### Workflow

```
feature/your-branch → develop → (pre-release) → beta.eclosion.app
                         ↓
                       main → eclosion.app
```

1. **Create a branch from `develop`**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature
   ```

2. **Make your changes** with clear commits

3. **Run quality checks locally**:
   ```bash
   # Frontend
   cd frontend
   npm run lint
   npm run type-check
   npm run build

   # Backend
   ruff check .
   ruff format --check .
   ```

4. **Push and create a PR to `develop`** (not main)
   ```bash
   git push -u origin feature/your-feature
   # Then create PR targeting 'develop' branch
   ```

5. **Address review feedback** promptly

6. **After merge**: Your changes are included in the next pre-release to [beta.eclosion.app](https://beta.eclosion.app)

7. **Release**: Maintainers periodically create pre-releases for beta testing, then merge `develop` → `main` for production

### PR Requirements

**PRs to `develop`:**
- CI checks run (linting, type checking, build)
- Security scans run (results visible in Security tab)
- No approval required - enables fast iteration for beta testing

**PRs to `main`:**
- All CI and security checks must pass
- 1 approval required from a maintainer
- Vulnerabilities rated Medium or higher block merge

> **Note**: PRs directly to `main` will be blocked. Always target `develop`.

## Release Process

This project uses a structured release process with security checks at each stage.

### Deployment Environments

| Environment | URL | Trigger | Approval |
|-------------|-----|---------|----------|
| **Beta** | [beta.eclosion.app](https://beta.eclosion.app) | Pre-release published | Required |
| **Production** | [eclosion.app](https://eclosion.app) | Release published | Required |

### How Releases Work

1. **Development on `develop`**
   - All feature work is merged to `develop` via PRs
   - CI runs tests and checks, but no automatic deployment
   - Changes accumulate until a pre-release is created

2. **Pre-Release (Beta)**
   - When ready for beta testing, maintainers create a GitHub pre-release (e.g., `v1.2.0-beta.1`)
   - Pre-releases require approval before deployment to beta.eclosion.app
   - Each pre-release creates a Docker image and deploys the demo site

3. **Production Release**
   - When `develop` is stable, maintainers merge to `main`
   - [release-please](https://github.com/googleapis/release-please) automatically creates a release PR
   - After merge, a GitHub release is created and deployed to production

### Security Requirements

| Check | develop (beta) | main (production) |
|-------|----------------|-------------------|
| CI checks | Run | Required to pass |
| Security scans | Run (visible) | Required to pass |
| Code review | None | 1 approval |
| Vulnerability threshold | — | Medium+ blocks merge |

**Security scans include:** CodeQL (SAST), dependency audit (npm/pip), container scan (Trivy), DAST (OWASP ZAP)

Beta allows rapid iteration while production enforces strict security gates.

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
