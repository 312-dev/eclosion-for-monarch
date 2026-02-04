# Available to Stash Calculation

## Formula

```
Available = Cash + Expected Income (optional) - CC Balances - Unspent Expense Budgets - Goal Balances - Stash Balances - Left to Budget
```

**Cash accounts:** checking, savings, PayPal/Venmo. Exclude HSA, brokerage, crypto, retirement.

## Key Details

**Unspent budgets:** Use `max(0, remaining)` where `remaining = previousMonthRollover + budgeted - spent`. This avoids double-counting with CC balances (CC spending already captured in CC balance).

**Left to Budget:** Monarch's "Ready to Assign" — subtract it because user may intend to budget it elsewhere.

**Monarch Goals:** Subtract goal *balances* only, not monthly contribution budgets. Contributions flow through category budgets.

**Expected Income:** Optional toggle. Conservative (default) = cash only. Include expected = cash + planned income.

## Edge Cases

- Filter to **expense categories only** for unspent budgets (income categories would double-subtract)
- Pending CC transactions may temporarily overstate available (pending in category `spent` but not yet in CC balance)
- CC with positive balance (credit/overpayment): correctly treated as available funds
- Demo mode must import shared calculation function, not reimplement
