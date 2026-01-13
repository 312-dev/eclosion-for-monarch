# Adding a New Feature

This guide walks you through adding a complete feature to Eclosion. For general contribution setup, see [[Contributing]].

## Quick Checklist

Use this when implementing a feature. Details for each step are below.

### Frontend
- [ ] Types: `frontend/src/types/{feature}.ts`
- [ ] API client: `frontend/src/api/core/{feature}.ts`
- [ ] Demo client: `frontend/src/api/demo/demo{Feature}.ts`
- [ ] Query hooks: `frontend/src/api/queries/{feature}Queries.ts`
- [ ] Components: `frontend/src/components/{feature}/`
- [ ] Route in `App.tsx` (both production and demo)
- [ ] Rate limit awareness for mutations

### Backend
- [ ] Service: `services/{feature}_service.py`
- [ ] Blueprint: `blueprints/{feature}.py`
- [ ] Register blueprint in `blueprints/__init__.py`
- [ ] Integration tests (if calling Monarch API)

---

## Step 1: Define Types

Create types first - they guide everything else.

```typescript
// frontend/src/types/goals.ts
export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

export interface CreateGoalRequest {
  name: string;
  target_amount: number;
}
```

Re-export from `types/index.ts`:
```typescript
export * from './goals';
```

## Step 2: Backend Service & Blueprint

Services contain business logic with injected dependencies.

```python
# services/goals_service.py
class GoalsService:
    def __init__(self, state_manager: "StateManager"):
        self.state_manager = state_manager

    async def get_goals(self) -> dict:
        return {"goals": self.state_manager.get_goals()}

    async def create_goal(self, name: str, target: float) -> dict:
        goal = {"id": generate_id(), "name": name, "target_amount": target}
        self.state_manager.add_goal(goal)
        return goal
```

Create a blueprint for your feature in `blueprints/goals.py`:

```python
# blueprints/goals.py
from flask import Blueprint, request

from core import api_handler, sanitize_id, sanitize_name
from core.exceptions import ValidationError
from core.rate_limit import limiter

from . import get_services

goals_bp = Blueprint("goals", __name__, url_prefix="/goals")


@goals_bp.route("/", methods=["GET"])
@api_handler(handle_mfa=False)
async def get_goals():
    """Get all goals."""
    services = get_services()
    return await services.goals_service.get_goals()


@goals_bp.route("/", methods=["POST"])
@limiter.limit("10 per minute")  # Rate limit write operations
@api_handler(handle_mfa=False)
async def create_goal():
    """Create a new goal."""
    services = get_services()
    data = request.get_json()

    # Sanitize user inputs
    name = sanitize_name(data.get("name"))
    target = data.get("target_amount")

    if not name:
        raise ValidationError("Goal name is required")

    return await services.goals_service.create_goal(name, target)
```

Register the blueprint in `blueprints/__init__.py`:

```python
def register_blueprints(app: Flask) -> None:
    # ... existing blueprints ...
    from .goals import goals_bp
    app.register_blueprint(goals_bp)
```

**Key patterns:**
- `@api_handler` handles async execution, error handling, and XSS sanitization automatically
- Use `@limiter.limit()` on write operations to prevent abuse
- Use `sanitize_id()`, `sanitize_name()` from `core` for user inputs
- Access services via `get_services()` helper
- Raise `ValidationError` for invalid inputs (returns 400)

## Step 3: API Clients

### Real Client (`api/core/goals.ts`)
```typescript
import { fetchApi } from './fetchApi';
import type { Goal, CreateGoalRequest } from '../../types';

export async function getGoals(): Promise<{ goals: Goal[] }> {
  return fetchApi('/goals');
}

export async function createGoal(req: CreateGoalRequest): Promise<Goal> {
  return fetchApi('/goals', { method: 'POST', body: JSON.stringify(req) });
}
```

### Demo Client (`api/demo/demoGoals.ts`)
```typescript
import { loadDemoState, saveDemoState } from './demoState';
import type { Goal, CreateGoalRequest } from '../../types';

export async function getGoals(): Promise<{ goals: Goal[] }> {
  const state = loadDemoState();
  return { goals: state.goals || [] };
}

export async function createGoal(req: CreateGoalRequest): Promise<Goal> {
  const state = loadDemoState();
  const goal: Goal = { id: crypto.randomUUID(), ...req, current_amount: 0 };
  state.goals = [...(state.goals || []), goal];
  saveDemoState(state);
  return goal;
}
```

Re-export from `client.ts` and `demoClient.ts`.

## Step 4: Query Hooks

Hooks route to real or demo client based on mode.

```typescript
// api/queries/goalsQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';

export function useGoalsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.goals, isDemo),
    queryFn: isDemo ? demoApi.getGoals : api.getGoals,
  });
}

export function useCreateGoalMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: isDemo ? demoApi.createGoal : api.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.goals, isDemo) });
    },
  });
}
```

Add key to `queries/keys.ts`:
```typescript
export const queryKeys = {
  // ...existing
  goals: 'goals' as const,
};
```

## Step 5: Components

### Feature Structure
```
components/goals/
├── index.ts        # Barrel exports
├── GoalCard.tsx    # Individual goal display
└── GoalForm.tsx    # Create/edit form
```

### Rate Limit Awareness

**Required for all mutations:**

```typescript
import { useIsRateLimited } from '../../context/RateLimitContext';

function GoalForm() {
  const isRateLimited = useIsRateLimited();
  const createGoal = useCreateGoalMutation();

  return (
    <button
      disabled={isRateLimited || createGoal.isPending}
      onClick={() => createGoal.mutate(formData)}
    >
      Create Goal
    </button>
  );
}
```

## Step 6: Routes

Add routes in `App.tsx`:

```typescript
// In ProductionRoutes
<Route path="/goals" element={<GoalsTab />} />

// In DemoRoutes
<Route path="/demo/goals" element={<GoalsTab />} />
```

---

## Key Patterns

### Calculation Parity

Demo mode must use the same calculation logic as production:

```typescript
// GOOD - Shared calculation
import { calculateProgress } from '../../utils/calculations';
const progress = calculateProgress(current, target);

// BAD - Reimplemented in demo
const progress = current >= target ? 100 : (current / target) * 100;
```

### Integration Tests

If your feature calls Monarch API, add tests in `tests/integration/`:

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_goal_balance(monarch_client, unique_test_name):
    cat_id = None
    try:
        cat_id = await monarch_client.create_transaction_category(name=unique_test_name, ...)
        balance = await monarch_client.get_category_balance(cat_id)
        assert balance is not None
    finally:
        if cat_id:
            await monarch_client.delete_transaction_category(cat_id)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Query key not found | Add key to `queries/keys.ts` |
| Demo mode not updating | Check `saveDemoState()` is called |
| Rate limit not disabling buttons | Add `useIsRateLimited()` check |
| Backend service not available | Register blueprint in `blueprints/__init__.py` and add service to `Services` container |

---

## Reference PRs

Look at these for real examples:
- **Notes feature** - Full feature with demo mode, context, multiple components
- **Rollup feature** - Complex calculations, integration tests

## Code Standards

See [CLAUDE.md](https://github.com/312-dev/eclosion/blob/main/CLAUDE.md) for:
- Component size limits (300 lines)
- Accessibility requirements
- Hover state patterns
- Animation system
- Z-index hierarchy
