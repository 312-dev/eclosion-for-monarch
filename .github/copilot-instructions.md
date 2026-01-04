# Copilot Instructions for Eclosion for Monarch

## Project Overview

Eclosion for Monarch is a self-hosted toolkit that expands what's possible with Monarch Money. It features a React/TypeScript frontend and Python/Flask backend with recurring expense tracking, smart savings calculations, and direct Monarch sync. The demo mode runs entirely in the browser with localStorage.

## Code Standards

**All code must follow the standards in [CLAUDE.md](../CLAUDE.md).** Key requirements:
- Use CSS/Tailwind for hover effects, not JavaScript handlers
- Components must not exceed 300 lines
- All interactive elements must be accessible (aria-labels, keyboard navigation)
- Use the centralized icon system (`Icons.*`), not inline SVGs
- Use established z-index scale from `constants/index.ts`
- Use centralized animation framework from `index.css`
- No `console.log` statements, no `any` types

## Architecture & Core Components

### Backend (Python/Flask)
- **Entry Point:** `app.py` initializes the app; `api.py` defines routes and configuration.
- **Async Support:** Flask routes use a custom `@async_flask` decorator for `async/await` syntax.
- **State Management:** `state/state_manager.py` handles persistence. State is stored in `state/tracker_state.json`.
  - **Pattern:** Always use `StateManager` methods to load/save state. Do not modify the JSON file directly.
- **Services:** Business logic resides in `services/`.
  - `sync_service.py`: Orchestrates synchronization with Monarch Money.
  - `monarch_utils.py`: Handles direct interaction with Monarch Money API.

### Frontend (React/Vite)
- **Location:** `frontend/` directory.
- **Stack:** React 19, TypeScript, Tailwind CSS v4, Vite.
- **API Client:** All backend communication is centralized in `frontend/src/api/client.ts`.
  - **Pattern:** Use the typed functions in `client.ts` rather than raw `fetch` calls in components.
- **Components:** Located in `frontend/src/components/`.

## Demo Mode Requirements

**All features must work in demo mode.** Demo mode uses localStorage instead of the backend API and is hosted on Cloudflare Pages.

When reviewing PRs that add new features:
1. Check if the feature calls API endpoints
2. Verify equivalent functions exist in `api/demoClient.ts`
3. Ensure new data structures are seeded in `api/demoData.ts`
4. Confirm mutations update localStorage and trigger React Query invalidation

Key demo files:
- `frontend/src/context/DemoContext.tsx` - Provides `useDemo()` hook
- `frontend/src/api/demoClient.ts` - localStorage-based API implementation
- `frontend/src/api/demoData.ts` - Initial seed data for demo
- `frontend/src/api/queries.ts` - Routes queries/mutations based on demo mode

## Tool/Feature Contribution Checklist

When reviewing PRs that add a new tool or major feature, verify:

### Required
- [ ] Demo mode implementation exists in `demoClient.ts`
- [ ] Demo seed data added to `demoData.ts`
- [ ] Components follow 300-line limit (split if larger)
- [ ] All interactive elements have aria-labels
- [ ] Keyboard navigation works for all interactive elements
- [ ] Uses `Icons.*` instead of inline SVGs
- [ ] Uses Tailwind hover classes, not JS handlers
- [ ] No `console.log` or `any` types
- [ ] TypeScript types defined in `types/`

### Backend (if applicable)
- [ ] Routes defined in `api.py` with `@async_flask` decorator
- [ ] Business logic in `services/` directory
- [ ] State changes use `StateManager` methods
- [ ] Error handling returns proper HTTP status codes

### Testing (when test infrastructure exists)
- [ ] Unit tests for utility functions (80%+ coverage)
- [ ] Tests for custom hooks
- [ ] Integration tests for critical user flows

## Development Workflow

### Running the Application
- **Backend:**
  ```bash
  python app.py
  ```
  Runs on `http://localhost:5001`. Requires `.env` file with Monarch credentials.

- **Frontend:**
  ```bash
  cd frontend
  npm run dev
  ```
  Runs on Vite dev server.

- **Docker:**
  ```bash
  docker-compose up
  ```
  Mounts `state/` volume for persistence.

### Build & Deployment
- Frontend build (`npm run build`) is served by the Flask backend via the `static` folder in production.
- `api.py` automatically serves from `static/` if the directory exists.

## Coding Conventions

### Python
- **Async Routes:** When defining new API endpoints that require async operations, always decorate with `@async_flask`.
  ```python
  @app.route("/path", methods=["GET"])
  @async_flask
  async def my_route():
      result = await service.do_work()
      return jsonify(result)
  ```
- **Type Hinting:** Use Python type hints extensively, especially in `dataclasses` within `state_manager.py`.

### TypeScript/React
- **Styling:** Use Tailwind CSS utility classes.
- **Types:** Shared types are defined in `frontend/src/types/index.ts`. Ensure backend response types match these interfaces.

## Critical Files
- `api.py`: API route definitions and app setup.
- `app.py`: Application entry point.
- `state/state_manager.py`: Data models and persistence logic.
- `services/sync_service.py`: Main sync logic.
- `frontend/src/api/client.ts`: Frontend API layer.
- `frontend/src/api/demoClient.ts`: Demo mode API implementation.
- `CLAUDE.md`: Complete code standards reference.
- `CONTRIBUTING.md`: Contributor setup guide.
