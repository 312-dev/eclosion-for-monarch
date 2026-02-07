# IFTTT Service Admin Panel Configuration

Complete reference for configuring the Eclosion IFTTT integration in the [IFTTT service admin panel](https://ifttt.com/developers).

---

## Triggers

### 1. `goal_achieved`

| Setting | Value |
|---------|-------|
| **Name** | Savings goal achieved |
| **Slug** | `goal_achieved` |
| **Description** | This trigger fires when one of your savings goals reaches its target amount in Monarch. |
| **Verbiage** | `{{fields.goal_name.value}} is fully funded` |
| **Endpoint** | `POST /ifttt/v1/triggers/goal_achieved` |
| **Realtime** | Yes |

**Trigger Fields:**

| # | Label | Slug | Type | Required | Help text |
|---|-------|------|------|----------|-----------|
| 1 | Which goal should trigger this? | `goal_name` | Drop-down list (dynamic) | Yes | The savings goal to watch for completion |

**Ingredients:**

| # | Label | Slug | Type | Note | Example |
|---|-------|------|------|------|---------|
| 1 | Goal name | `GoalName` | String | The name of the savings goal that was achieved. | Emergency Fund |
| 2 | Target amount | `TargetAmount` | String | The dollar amount the goal was set to reach. | 5000 |
| 3 | Achieved at | `AchievedAt` | Date with time (ISO8601) | The date and time when the goal was fully funded. | 2026-02-05T14:30:00Z |

---

### 2. `under_budget`

| Setting | Value |
|---------|-------|
| **Name** | Category under budget |
| **Slug** | `under_budget` |
| **Description** | This trigger fires near the end of the month when a budget category's spending comes in under its budgeted amount. Use it to reward yourself for staying on track. |
| **Verbiage** | `{{fields.category.value}} is under budget by at least {{fields.threshold_percent}}%` |
| **Endpoint** | `POST /ifttt/v1/triggers/under_budget` |
| **Realtime** | Yes |

**Trigger Fields:**

| # | Label | Slug | Type | Required | Regex | Regex error | Help text |
|---|-------|------|------|----------|-------|-------------|-----------|
| 1 | Which category do you want to monitor? | `category` | Drop-down list (dynamic) | Yes | | | The budget category to check for under-budget spending |
| 2 | What minimum savings percentage should trigger this? | `threshold_percent` | Text input | No | `^\d+$` | Must be a whole number | Only fire if savings reach this percentage of budget (e.g. 10 for 10%). Leave blank to trigger for any savings. |

**Dynamic Validation:** `POST /ifttt/v1/triggers/under_budget/fields/threshold_percent/validate` — Integer 1-100 or empty.

**Ingredients:**

| # | Label | Slug | Type | Note | Example |
|---|-------|------|------|------|---------|
| 1 | Category name | `CategoryName` | String | The name of the budget category that came in under budget. | Groceries |
| 2 | Budget amount | `BudgetAmount` | String | The total amount budgeted for this category this month. | 500 |
| 3 | Actual spending | `ActualSpending` | String | The total amount actually spent in this category this month. | 420 |
| 4 | Amount saved | `AmountSaved` | String | The dollar amount saved compared to the budgeted amount. | 80 |
| 5 | Percent saved | `PercentSaved` | String | The percentage of the budget that was saved this month. | 16 |

---

### 3. `budget_surplus`

| Setting | Value |
|---------|-------|
| **Name** | Monthly budget surplus |
| **Slug** | `budget_surplus` |
| **Description** | This trigger fires near the end of the month when your total spending across all categories comes in under your total planned budget. |
| **Verbiage** | `your monthly surplus is at least ${{fields.minimum_amount}}` |
| **Endpoint** | `POST /ifttt/v1/triggers/budget_surplus` |
| **Realtime** | Yes |

**Trigger Fields:**

| # | Label | Slug | Type | Required | Regex | Regex error | Help text |
|---|-------|------|------|----------|-------|-------------|-----------|
| 1 | What is the minimum surplus amount to trigger this? | `minimum_amount` | Text input | No | `^\d+$` | Must be a whole number | Only fire if the surplus is at least this many dollars. Leave blank to trigger for any surplus. |

**Dynamic Validation:** `POST /ifttt/v1/triggers/budget_surplus/fields/minimum_amount/validate` — Positive integer or empty.

**Ingredients:**

| # | Label | Slug | Type | Note | Example |
|---|-------|------|------|------|---------|
| 1 | Surplus amount | `SurplusAmount` | String | The total dollar surplus across all budget categories for the month. | 150 |
| 2 | Total budget | `TotalBudget` | String | The total amount planned for all expense categories this month. | 3500 |
| 3 | Total spent | `TotalSpent` | String | The total amount actually spent across all categories this month. | 3350 |
| 4 | Percent saved | `PercentSaved` | String | The percentage of total planned spending that was saved. | 4 |
| 5 | Month | `Month` | String | The month and year this surplus was calculated for. | January 2026 |

---

### 4. `category_balance_threshold`

| Setting | Value |
|---------|-------|
| **Name** | Category balance reaches threshold |
| **Slug** | `category_balance_threshold` |
| **Description** | This trigger fires when a category's remaining balance crosses a dollar amount you specify — either rising above or dropping below the threshold. |
| **Verbiage** | `{{fields.category.value}} balance goes {{fields.direction.value}} ${{fields.threshold_amount}}` |
| **Endpoint** | `POST /ifttt/v1/triggers/category_balance_threshold` |
| **Realtime** | Yes |

**Trigger Fields:**

| # | Label | Slug | Type | Required | Regex | Regex error | Help text |
|---|-------|------|------|----------|-------|-------------|-----------|
| 1 | Which category do you want to monitor? | `category` | Drop-down list (dynamic) | Yes | | | The budget category to watch |
| 2 | What dollar amount is your threshold? | `threshold_amount` | Text input | Yes | `^\d+$` | Must be a whole number | The dollar amount to compare against the category's remaining balance |
| 3 | Should it trigger above or below the threshold? | `direction` | Drop-down list (static) | Yes | | | Fire when the balance goes above or below the specified amount |

**Static options for `direction`:**

| Label | Value |
|-------|-------|
| Reaches or exceeds | `above` |
| Drops below | `below` |

**Dynamic Validation:** `POST /ifttt/v1/triggers/category_balance_threshold/fields/threshold_amount/validate` — Positive integer.

**Ingredients:**

| # | Label | Slug | Type | Note | Example |
|---|-------|------|------|------|---------|
| 1 | Category name | `CategoryName` | String | The name of the budget category whose balance crossed the threshold. | Fun Money |
| 2 | Current balance | `CurrentBalance` | String | The category's current remaining balance for this month. | 250 |
| 3 | Threshold | `Threshold` | String | The dollar threshold amount that was configured for this trigger. | 200 |
| 4 | Direction | `Direction` | String | Whether the balance went above or below the configured threshold. | above |

---

### 5. `spending_streak`

| Setting | Value |
|---------|-------|
| **Name** | Spending streak |
| **Slug** | `spending_streak` |
| **Description** | This trigger fires when a category stays under budget for a specified number of consecutive months. Builds over time — the longer the streak, the more trigger events. |
| **Verbiage** | `{{fields.category.value}} is under budget for {{fields.streak_months}} consecutive months` |
| **Endpoint** | `POST /ifttt/v1/triggers/spending_streak` |
| **Realtime** | Yes |

**Trigger Fields:**

| # | Label | Slug | Type | Required | Regex | Regex error | Help text |
|---|-------|------|------|----------|-------|-------------|-----------|
| 1 | Which category do you want to track? | `category` | Drop-down list (dynamic) | Yes | | | The budget category to track for consecutive under-budget months |
| 2 | How many consecutive months under budget? | `streak_months` | Text input | Yes | `^\d+$` | Must be a whole number | The minimum number of consecutive under-budget months before this fires (e.g. 3) |

**Dynamic Validation:** `POST /ifttt/v1/triggers/spending_streak/fields/streak_months/validate` — Integer >= 2.

**Ingredients:**

| # | Label | Slug | Type | Note | Example |
|---|-------|------|------|------|---------|
| 1 | Category name | `CategoryName` | String | The name of the budget category on a spending streak. | Dining Out |
| 2 | Streak count | `StreakCount` | String | The number of consecutive months this category has been under budget. | 3 |
| 3 | Budget amount | `BudgetAmount` | String | The current month's budgeted amount for this category. | 300 |
| 4 | Current spending | `CurrentSpending` | String | The amount spent so far in this category for the current month. | 180 |

---

### 6. `new_charge`

| Setting | Value |
|---------|-------|
| **Name** | New charge |
| **Slug** | `new_charge` |
| **Description** | This trigger fires when a new expense transaction appears in your Monarch account. Optionally filter by category and choose whether to include pending transactions. |
| **Verbiage** | `a new charge appears in {{fields.category.value}}` |
| **Endpoint** | `POST /ifttt/v1/triggers/new_charge` |
| **Realtime** | Yes |

**Trigger Fields:**

| # | Label | Slug | Type | Required | Help text |
|---|-------|------|------|----------|-----------|
| 1 | Which category should trigger this? | `category` | Drop-down list (dynamic) | No | Only trigger for charges in this category. Leave blank for all categories. |
| 2 | Should pending transactions be included? | `include_pending` | Checkboxes (static) | No | By default only settled transactions trigger. Check this to also include pending charges. |

**Static options for `include_pending`:**

| Label | Value |
|-------|-------|
| Include pending transactions | `include_pending` |

**Ingredients:**

| # | Label | Slug | Type | Note | Example |
|---|-------|------|------|------|---------|
| 1 | Amount | `Amount` | String | The dollar amount of the charge as a whole number. | 42 |
| 2 | Merchant name | `MerchantName` | String | The name of the merchant or payee for this transaction. | Whole Foods |
| 3 | Category name | `CategoryName` | String | The budget category this transaction is filed under. | Groceries |
| 4 | Is pending | `IsPending` | String | Whether this transaction is still pending or has been settled. | false |
| 5 | Date | `Date` | Date (ISO8601) | The date the transaction occurred. | 2026-02-05 |

---

## Actions

### 1. `budget_to`

| Setting | Value |
|---------|-------|
| **Name** | Budget funds to a category |
| **Slug** | `budget_to` |
| **Description** | Increases a Monarch budget category's planned amount for the current month. The added amount is on top of whatever is already budgeted. |
| **Verbiage** | `budget ${{fields.amount}} to {{fields.category.label}}` |
| **Endpoint** | `POST /ifttt/v1/actions/budget_to` |

**Action Fields:**

| # | Label | Slug | Type | Required | Regex | Regex error | Help text |
|---|-------|------|------|----------|-------|-------------|-----------|
| 1 | Which category? | `category` | Drop-down list (dynamic) | Yes | | | The budget category to add funds to |
| 2 | How much? | `amount` | Text input | Yes | `^\d+$` | Must be a whole number | Dollar amount to add to the category's budget (whole dollars, e.g. 50) |

---

### 2. `budget_to_goal`

| Setting | Value |
|---------|-------|
| **Name** | Budget funds to a savings goal |
| **Slug** | `budget_to_goal` |
| **Description** | Increases a savings goal's budgeted amount for the current month. The added amount is on top of whatever is already budgeted toward this goal. |
| **Verbiage** | `budget ${{fields.amount}} to {{fields.goal.label}}` |
| **Endpoint** | `POST /ifttt/v1/actions/budget_to_goal` |

**Action Fields:**

| # | Label | Slug | Type | Required | Regex | Regex error | Help text |
|---|-------|------|------|----------|-------|-------------|-----------|
| 1 | Which goal? | `goal` | Drop-down list (dynamic) | Yes | | | The savings goal to add funds to |
| 2 | How much? | `amount` | Text input | Yes | `^\d+$` | Must be a whole number | Dollar amount to add to the goal's budget (whole dollars, e.g. 25) |

---

### 3. `move_funds`

| Setting | Value |
|---------|-------|
| **Name** | Move funds between categories |
| **Slug** | `move_funds` |
| **Description** | Moves budget funds from one category to another. Reduces the source category's budget and increases the destination's by the same amount. Total planned spending stays the same. |
| **Verbiage** | `move ${{fields.amount}} from {{fields.source_category.label}} to {{fields.destination_category.label}}` |
| **Endpoint** | `POST /ifttt/v1/actions/move_funds` |

**Action Fields:**

| # | Label | Slug | Type | Required | Regex | Regex error | Help text |
|---|-------|------|------|----------|-------|-------------|-----------|
| 1 | Which category to take from? | `source_category` | Drop-down list (dynamic) | Yes | | | The category whose budget will be reduced |
| 2 | Which category to move to? | `destination_category` | Drop-down list (dynamic) | Yes | | | The category whose budget will be increased |
| 3 | How much? | `amount` | Text input | Yes | `^\d+$` | Must be a whole number | Dollar amount to move (whole dollars, e.g. 50). Clamped to available source budget. |

---

## Queries

### 1. `list_achieved_goals`

| Setting | Value |
|---------|-------|
| **Name** | List achieved goals |
| **Slug** | `list_achieved_goals` |
| **Description** | This query returns a list of savings goals that have reached their target amount. |
| **Endpoint** | `POST /ifttt/v1/queries/list_achieved_goals` |

**Query Fields:** None

**Ingredients:**

| # | Name | Slug | Type | Note | Example |
|---|------|------|------|------|---------|
| 1 | GoalName | `goal_name` | String | The name of the savings goal that was achieved. | Emergency Fund |
| 2 | TargetAmount | `target_amount` | String | The dollar amount the goal was set to reach. | 5000 |
| 3 | AchievedAt | `achieved_at` | Date with time (ISO8601) | The date and time when the goal was fully funded. | 2026-02-05T14:30:00Z |

---

### 2. `list_category_budgets`

| Setting | Value |
|---------|-------|
| **Name** | List category budgets |
| **Slug** | `list_category_budgets` |
| **Description** | This query returns the current month's budget status for all your expense categories, including budgeted amount, actual spending, and remaining balance. |
| **Endpoint** | `POST /ifttt/v1/queries/list_category_budgets` |

**Query Fields:** None

**Ingredients:**

| # | Name | Slug | Type | Note | Example |
|---|------|------|------|------|---------|
| 1 | CategoryName | `category_name` | String | The name of the budget category. | Groceries |
| 2 | GroupName | `group_name` | String | The category group this category belongs to. | Food & Dining |
| 3 | BudgetAmount | `budget_amount` | String | The total amount budgeted for this category this month. | 500 |
| 4 | ActualSpending | `actual_spending` | String | The total amount actually spent in this category this month. | 320 |
| 5 | Remaining | `remaining` | String | The remaining budget balance for this category this month. | 180 |
| 6 | Rollover | `rollover` | String | The amount rolled over from the previous month. | 0 |
| 7 | Status | `status` | String | Whether the category is under budget, over budget, or on track. | under_budget |

---

### 3. `list_under_budget_categories`

| Setting | Value |
|---------|-------|
| **Name** | List under-budget categories |
| **Slug** | `list_under_budget_categories` |
| **Description** | This query returns categories where spending is currently below the budgeted amount, sorted by largest savings first. |
| **Endpoint** | `POST /ifttt/v1/queries/list_under_budget_categories` |

**Query Fields:** None

**Ingredients:**

| # | Name | Slug | Type | Note | Example |
|---|------|------|------|------|---------|
| 1 | CategoryName | `category_name` | String | The name of the budget category that is under budget. | Groceries |
| 2 | BudgetAmount | `budget_amount` | String | The total amount budgeted for this category this month. | 500 |
| 3 | ActualSpending | `actual_spending` | String | The total amount actually spent in this category this month. | 320 |
| 4 | AmountSaved | `amount_saved` | String | The dollar amount saved compared to the budgeted amount. | 180 |
| 5 | PercentSaved | `percent_saved` | String | The percentage of the budget that has been saved so far. | 36 |

---

### 4. `budget_summary`

| Setting | Value |
|---------|-------|
| **Name** | Monthly budget summary |
| **Slug** | `budget_summary` |
| **Description** | This query returns a single-row summary of your current month's budget, including planned vs. actual income and expenses, surplus, and ready-to-assign amount. |
| **Endpoint** | `POST /ifttt/v1/queries/budget_summary` |

**Query Fields:** None

**Ingredients:**

| # | Name | Slug | Type | Note | Example |
|---|------|------|------|------|---------|
| 1 | Month | `month` | String | The month and year this summary covers. | February 2026 |
| 2 | PlannedIncome | `planned_income` | String | The total income planned for this month. | 5000 |
| 3 | ActualIncome | `actual_income` | String | The total income actually received this month. | 5200 |
| 4 | PlannedExpenses | `planned_expenses` | String | The total amount planned for all expense categories. | 3500 |
| 5 | ActualExpenses | `actual_expenses` | String | The total amount actually spent across all categories. | 3350 |
| 6 | Surplus | `surplus` | String | The difference between planned and actual expenses. | 150 |
| 7 | ReadyToAssign | `ready_to_assign` | String | The amount of unbudgeted money available to assign. | 1850 |

---

## Scaffolding (`GET /ifttt/v1/test/setup`)

### Trigger Samples

```json
{
  "goal_achieved": { "goal_name": "Emergency Fund" },
  "under_budget": { "category": "test-category-groceries", "threshold_percent": "10" },
  "budget_surplus": { "minimum_amount": "50" },
  "category_balance_threshold": { "category": "test-category-groceries", "threshold_amount": "200", "direction": "above" },
  "spending_streak": { "category": "test-category-groceries", "streak_months": "3" },
  "new_charge": { "category": "test-category-groceries", "include_pending": "include_pending" }
}
```

### Action Samples

```json
{
  "budget_to": { "category": "test-category-id", "amount": "50" },
  "budget_to_goal": { "goal": "test-goal-id", "amount": "100" },
  "move_funds": { "source_category": "test-category-groceries", "destination_category": "test-category-rent", "amount": "25" }
}
```

### Query Samples

```json
{
  "list_achieved_goals": {},
  "list_category_budgets": {},
  "list_under_budget_categories": {},
  "budget_summary": {}
}
```

### Trigger Field Validations

```json
{
  "under_budget": {
    "threshold_percent": { "valid": "10", "invalid": "abc" }
  },
  "budget_surplus": {
    "minimum_amount": { "valid": "50", "invalid": "-10" }
  },
  "category_balance_threshold": {
    "threshold_amount": { "valid": "200", "invalid": "notanumber" }
  },
  "spending_streak": {
    "streak_months": { "valid": "3", "invalid": "0" }
  }
}
```

---

## Regex Validation Summary

All numeric text input fields (trigger fields and action fields only) use `^\d+$` (whole numbers only, no decimals). Ingredients do not have regex validation.

| Component | Field | Regex | Regex error | Required |
|-----------|-------|-------|-------------|----------|
| Trigger `under_budget` | `threshold_percent` | `^\d+$` | Must be a whole number | No |
| Trigger `budget_surplus` | `minimum_amount` | `^\d+$` | Must be a whole number | No |
| Trigger `category_balance_threshold` | `threshold_amount` | `^\d+$` | Must be a whole number | Yes |
| Trigger `spending_streak` | `streak_months` | `^\d+$` | Must be a whole number | Yes |
| Action `budget_to` | `amount` | `^\d+$` | Must be a whole number | Yes |
| Action `budget_to_goal` | `amount` | `^\d+$` | Must be a whole number | Yes |
| Action `move_funds` | `amount` | `^\d+$` | Must be a whole number | Yes |

---

## Nothing to Remove

All existing components remain in use. The changes are purely additive.

| Existing Component | Type | Status |
|--------------------|------|--------|
| `goal_achieved` | Trigger | Kept |
| `budget_to` | Action | Renamed from `allocate_to_category` |
| `budget_to_goal` | Action | Renamed from `allocate_to_goal` |
| `list_achieved_goals` | Query | Kept |
