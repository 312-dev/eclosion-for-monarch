# Contributing to Eclosion

Thank you for your interest in contributing! This guide will help you get started.

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
   git clone https://github.com/312-dev/eclosion.git
   cd eclosion
   ```

2. **Backend setup**
   ```bash
   # Create virtual environment (recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies (with hash verification for security)
   pip install --require-hashes -r requirements-dev.txt
   pip install --no-deps -r requirements-vcs.txt

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

PRs with other branch name prefixes will be blocked.

### Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat:` | New feature | Minor (1.1.0 → 1.2.0) |
| `fix:` | Bug fix | Patch (1.1.0 → 1.1.1) |
| `docs:` | Documentation only | None |
| `refactor:` | Code refactoring | None |
| `chore:` | Maintenance tasks | None |

Breaking changes (`feat!:` or `BREAKING CHANGE:` footer) trigger a major bump.

Example:
```
feat: add category emoji customization

- Add emoji picker component to category settings
- Store emoji preference in state manager
- Update category display across dashboard

Closes #45
```

See [CONTRIBUTING.md](https://github.com/312-dev/eclosion/blob/main/CONTRIBUTING.md) for full commit guidelines.

## Pull Request Process

This repository uses GitHub Flow. All changes go directly to `main`:

1. **Create a branch** from `main`
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
4. **Push and create a PR** targeting `main` with a clear description
5. **Address review feedback** promptly
6. **Squash merge** when approved

### PR Requirements

| Target Branch | CI Checks | Security Scans | Code Review |
|---------------|-----------|----------------|-------------|
| `main` | Must pass | Must pass | 2 approvals |

For full CI/CD documentation including workflow standards, see [CONTRIBUTING.md](https://github.com/312-dev/eclosion/blob/main/CONTRIBUTING.md#github-actions-workflow-standards).

## Code Style

### Python (Backend)

- Follow PEP 8 with Ruff for linting and formatting
- Use type hints for function parameters and return values
- Keep functions focused and under 50 lines when possible
- Define routes in `blueprints/` directory, not `api.py`

```python
# blueprints/example.py
from flask import Blueprint, request
from core import api_handler, sanitize_name
from core.rate_limit import limiter
from . import get_services

example_bp = Blueprint("example", __name__, url_prefix="/example")

@example_bp.route("/", methods=["POST"])
@limiter.limit("10 per minute")
@api_handler(handle_mfa=False)
async def example_route():
    """Brief description of what this route does."""
    services = get_services()
    data = request.get_json()
    name = sanitize_name(data.get("name"))  # Sanitize user inputs
    return await services.example_service.process(name, data)
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
api.py              # Flask app setup and middleware
app.py              # Application entry point
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
  rate_limit.py     # Rate limiter instance
  sanitization.py   # Input sanitization functions
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

### Key Patterns

1. **State Management**: Use repository classes in `state/db/` for persistence
2. **API Calls**: Use typed functions from `frontend/src/api/client.ts`
3. **Error Handling**: Return proper HTTP status codes with JSON error messages
4. **Types**: Import from `../types` - types are organized by domain

## Questions?

- Open a GitHub Discussion for questions
- Check existing issues before creating new ones
- See [[Security|security]] for security-related questions
