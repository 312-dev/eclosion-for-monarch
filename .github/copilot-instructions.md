# Copilot Instructions for Monarch Money Recurring Savings Tracker

## Project Overview
This is a full-stack application for tracking recurring savings in Monarch Money. It consists of a Python Flask backend and a React/TypeScript frontend.

## Architecture & Core Components

### Backend (Python/Flask)
- **Entry Point:** `app.py` initializes the app; `api.py` defines routes and configuration.
- **Async Support:** Flask routes use a custom `@async_flask` decorator to handle `async/await` syntax (see `api.py`).
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
- Frontend build (`npm run build`) is intended to be served by the Flask backend via the `static` folder in production.
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
- `state/state_manager.py`: Data models and persistence logic.
- `services/sync_service.py`: Main sync logic.
- `frontend/src/api/client.ts`: Frontend API layer.
