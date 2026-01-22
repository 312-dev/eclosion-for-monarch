# Available to Stash Calculation

This document describes the formula for calculating "Available to Stash" - the amount of money a user can safely allocate to Stash items without disrupting their existing budget or financial commitments.

## Philosophy

Unlike YNAB's zero-based budgeting where every dollar is explicitly assigned, Monarch Money uses traditional budgeting where categories have budgets but dollars aren't "moved" between accounts. This calculation bridges that gap by determining truly unallocated money.

## The Formula

```typescript
Available to Stash = Cash
                   + Expected Income (optional)
                   - Current CC Balances
                   - Unspent Expense Budgets
                   - Monarch Goal Balances
                   - Stash Balances
```

### Components

| Component | Description | Source |
|-----------|-------------|--------|
| **Cash** | Sum of enabled cash accounts (checking, savings, PayPal/Venmo) | Monarch accounts |
| **Expected Income** | Planned income not yet received (optional toggle) | Monarch planned income |
| **CC Balances** | Current credit card balances | Monarch accounts |
| **Unspent Expense Budgets** | `Σ max(0, budget - spent)` for expense categories | Monarch budget data |
| **Goal Balances** | Current balances of Monarch savings goals | Monarch goals |
| **Stash Balances** | Current balances of Stash items | Eclosion stash data |

### Account Types

| Account Type | Include in Cash? |
|--------------|------------------|
| Checking | Yes |
| Savings | Yes |
| PayPal/Venmo | Yes |
| HSA | No |
| Brokerage | No |
| Crypto | No |
| 401k/IRA | No |

## Why `max(0, budget - spent)` for Categories

We use "unspent budget" rather than "total budget" to avoid double-counting with CC balances.

### The Problem with Total Budget

If we subtracted total budgets AND CC balances:
- User budgets $500 for groceries
- Spends $200 on CC
- CC balance: $200
- Budget remaining: $300
- If we subtract both: $500 + $200 = $700 committed (wrong!)

### The Solution

Using `max(0, budget - spent)`:
- Only counts the UNSPENT portion of the budget
- CC spending is captured in the CC balance
- No double-counting

### Tracing Through Scenarios

| Event | Cash | CC | Unspent Budget | Available |
|-------|------|-----|----------------|-----------|
| Start (budget $500) | $5,000 | $0 | $500 | $4,500 |
| Spend $200 on CC | $5,000 | $200 | $300 | $4,500 |
| Spend full $500 on CC | $5,000 | $500 | $0 | $4,500 |
| Overspend $600 on CC | $5,000 | $600 | $0 | $4,400 |
| Pay $300 to CC | $4,700 | $300 | $0 | $4,400 |

## Monarch Goals vs Stash

**Important:** To avoid double-counting:
- Subtract Monarch Goal **balances** (money already saved)
- Do NOT subtract monthly contribution budgets toward goals
- Goal contributions map to category budgets, which reduces available when contributed

When a user contributes to a goal:
1. The goal balance increases
2. The contribution shows as "spent" in the savings category
3. Available decreases by the goal balance increase
4. No double-counting because we exclude savings categories from expense budgets

## Edge Cases

### Income Categories
**Filter to expense categories only** when calculating unspent budgets. Income categories would incorrectly subtract expected income.

### Pending CC Transactions
Pending transactions may show in category `spent` but NOT in CC balance. This can cause available to appear slightly higher while transactions are pending, then drop when posted.

**Recommendation:** Document this limitation. Available may be slightly overstated during pending transaction windows.

### Newly Added Credit Cards
For CCs added mid-month with existing balances:
- No historical balance data exists
- Use current balance (safe assumption: it's real debt)

### CC with Positive Balance (Overpayment)
If a CC has a negative balance (credit to user):
- `Available = Cash - (-$100) = Cash + $100`
- Correctly treats CC credit as available funds

### Expected Income Toggle

| Mode | What it counts | Use case |
|------|----------------|----------|
| Conservative (default) | Only cash on hand | "Don't count chickens before hatching" |
| Include expected | Cash + planned income | "I know my paycheck is coming" |

Based on Monarch's planned income for the month.

## Implementation Notes

### Data Requirements

The calculation requires these data points from Monarch:
1. Account balances (with account type filtering)
2. Credit card balances
3. Category budget and actual amounts for the current month
4. Savings goal balances
5. Planned income (for optional toggle)

### Optimistic Updates

When users allocate funds to Stash:
1. Stash balance increases
2. Available should decrease
3. Either re-sync from Monarch or optimistically update the cache

### Demo Mode Parity

Demo mode must implement the same calculation using localStorage data. Import and use the shared calculation function.
