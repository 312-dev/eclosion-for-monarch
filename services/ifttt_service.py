"""
IFTTT Event Service

Handles communication between the Eclosion desktop app and the IFTTT worker:
- Pushes trigger events to the broker when stashes are funded
- Polls for queued actions when the app comes online
- Pushes field option caches for offline dropdown population
"""

import json
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

BROKER_URL = "https://ifttt-api.eclosion.app"


class IftttService:
    """Manages IFTTT integration state and broker communication."""

    def __init__(self, subdomain: str | None = None, management_key: str | None = None):
        self.subdomain = subdomain
        self.management_key = management_key

    @classmethod
    def from_tunnel_creds(cls) -> "IftttService":
        """Create an IftttService from the in-memory tunnel credentials.

        Credentials are pushed to Flask via IPC from Electron, stored in memory.
        Falls back to env vars for backwards compatibility (dev mode).
        """
        from core.middleware import get_ifttt_tunnel_creds

        subdomain, management_key = get_ifttt_tunnel_creds()
        if subdomain and management_key:
            return cls(subdomain=subdomain, management_key=management_key)

        # Fallback to env vars (e.g., dev mode without desktop)
        return cls(
            subdomain=os.environ.get("TUNNEL_SUBDOMAIN"),
            management_key=os.environ.get("TUNNEL_MANAGEMENT_KEY"),
        )

    @property
    def _headers(self) -> dict[str, str]:
        """Common headers for broker API calls."""
        return {
            "Content-Type": "application/json",
            "X-Subdomain": self.subdomain or "",
            "X-Management-Key": self.management_key or "",
        }

    @property
    def is_configured(self) -> bool:
        """Check if IFTTT integration credentials are available."""
        return bool(self.subdomain and self.management_key)

    async def push_trigger_event(
        self,
        trigger_slug: str,
        event_id: str,
        data: dict[str, str],
    ) -> dict[str, Any]:
        """
        Push a trigger event to the broker Durable Object.

        Args:
            trigger_slug: The trigger type (e.g., "goal_achieved")
            event_id: Unique event ID for deduplication
            data: Trigger-specific data fields
        """
        if not self.is_configured:
            return {"success": False, "error": "IFTTT not configured"}

        import time

        payload = {
            "id": event_id,
            "trigger_slug": trigger_slug,
            "timestamp": int(time.time()),
            "data": data,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BROKER_URL}/api/events/push",
                    json=payload,
                    headers=self._headers,
                )
                result: dict[str, Any] = response.json()
                return result
        except Exception as e:
            logger.error(f"Failed to push IFTTT event: {e}")
            return {"success": False, "error": str(e)}

    async def poll_queued_actions(self) -> list[dict[str, Any]]:
        """
        Poll the broker for actions queued while offline.

        Returns a list of QueuedAction objects.
        """
        if not self.is_configured:
            return []

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{BROKER_URL}/api/queue/pending",
                    headers=self._headers,
                )
                result: dict[str, Any] = response.json()
                actions: list[dict[str, Any]] = result.get("actions", [])
                return actions
        except Exception as e:
            logger.error(f"Failed to poll IFTTT queue: {e}")
            return []

    async def ack_action(self, action_id: str) -> dict[str, Any]:
        """
        Acknowledge that a queued action was executed.

        Args:
            action_id: The ID of the action to acknowledge
        """
        if not self.is_configured:
            return {"success": False, "error": "IFTTT not configured"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BROKER_URL}/api/queue/ack",
                    json={"id": action_id},
                    headers=self._headers,
                )
                result: dict[str, Any] = response.json()
                return result
        except Exception as e:
            logger.error(f"Failed to ACK IFTTT action: {e}")
            return {"success": False, "error": str(e)}

    async def push_field_options(
        self,
        categories: list[dict[str, str]],
        stashes: list[dict[str, str]] | None = None,
        goals: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """
        Push current category/stash/goal lists to broker for offline caching.

        Called after each sync so IFTTT can populate dropdowns even when offline.

        Args:
            categories: List of {label, value} category options
            stashes: List of {label, value} stash options (optional)
            goals: List of {label, value} goal options (optional)
        """
        if not self.is_configured:
            return {"success": False, "error": "IFTTT not configured"}

        fields: dict[str, list[dict[str, str]]] = {"category": categories}
        if stashes:
            fields["stash"] = stashes
        if goals:
            fields["goal"] = goals

        payload = {"fields": fields}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{BROKER_URL}/api/field-options/push",
                    json=payload,
                    headers=self._headers,
                )
                result: dict[str, Any] = response.json()
                return result
        except Exception as e:
            logger.error(f"Failed to push IFTTT field options: {e}")
            return {"success": False, "error": str(e)}

    async def get_active_subscriptions(self) -> dict[str, set[str]]:
        """
        Fetch active trigger subscriptions from the broker.

        Returns a dict mapping trigger_slug to a set of subscribed category IDs.
        A wildcard ("*") in the set means push all events for that trigger.

        Example: {"category_balance_threshold": {"cat:abc123", "cat:def456"}}
        """
        if not self.is_configured:
            return {}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{BROKER_URL}/api/subscriptions",
                    headers=self._headers,
                )
                data = response.json()
                subscriptions = data.get("subscriptions", [])

                # Group by trigger_slug, collecting category values
                result: dict[str, set[str]] = {}
                for sub in subscriptions:
                    trigger_slug = sub.get("trigger_slug", "")
                    fields = sub.get("fields", {})
                    category = fields.get("category", "")

                    if trigger_slug not in result:
                        result[trigger_slug] = set()

                    # Empty category means "all categories" (wildcard)
                    if not category:
                        result[trigger_slug].add("*")
                    else:
                        result[trigger_slug].add(category)

                return result
        except Exception as e:
            logger.error(f"Failed to fetch IFTTT subscriptions: {e}")
            return {}

    async def check_goal_achievements(
        self,
        stash_items: list[dict[str, Any]],
    ) -> list[str]:
        """
        Check if any stash items just reached their target.
        Pushes trigger events for newly achieved goals.

        Args:
            stash_items: List of stash items with balance and target data

        Returns:
            List of event IDs that were pushed
        """
        if not self.is_configured:
            return []

        from datetime import datetime

        pushed_events: list[str] = []

        for item in stash_items:
            balance = item.get("balance", 0)
            target = item.get("target_amount", 0)
            item_id = item.get("id", "")
            name = item.get("name", "Unknown")

            # Check if goal is achieved (balance >= target, and target > 0)
            if target > 0 and balance >= target:
                event_id = f"goal-{item_id}-achieved"

                result = await self.push_trigger_event(
                    trigger_slug="goal_achieved",
                    event_id=event_id,
                    data={
                        "goal_name": name,
                        "target_amount": f"${target:,.0f}",
                        "achieved_at": datetime.now().isoformat(),
                    },
                )

                if result.get("stored") or result.get("id"):
                    pushed_events.append(event_id)

        return pushed_events

    async def check_under_budget(
        self,
        budget_data: dict[str, dict[str, float]],
        category_info: dict[str, dict[str, str]],
        subscriptions: dict[str, set[str]] | None = None,
    ) -> list[str]:
        """
        Check for categories that are under budget and push trigger events.
        Only fires after day 25 of the month to avoid premature triggers.

        Args:
            budget_data: category_id -> {budgeted, actual, remaining, rollover}
            category_info: category_id -> {name, group_id, group_name}
            subscriptions: Active trigger subscriptions (from get_active_subscriptions)

        Returns:
            List of event IDs that were pushed
        """
        if not self.is_configured:
            return []

        from datetime import datetime

        now = datetime.now()
        if now.day < 25:
            return []

        # Get subscribed categories for this trigger
        subscribed = subscriptions.get("under_budget", set()) if subscriptions else set()
        if not subscribed:
            return []  # No active subscriptions, skip pushing

        push_all = "*" in subscribed

        month_key = now.strftime("%Y-%m")
        pushed_events: list[str] = []

        for cat_id, budget in budget_data.items():
            # Skip if not subscribed (unless wildcard)
            if not push_all and f"cat:{cat_id}" not in subscribed:
                continue

            budgeted = budget.get("budgeted", 0)
            actual = abs(budget.get("actual", 0))

            if budgeted > 0 and actual < budgeted:
                amount_saved = int(budgeted - actual)
                percent_saved = int((amount_saved / budgeted) * 100) if budgeted else 0
                info = category_info.get(cat_id, {})
                event_id = f"under-budget-{cat_id}-{month_key}"

                result = await self.push_trigger_event(
                    trigger_slug="under_budget",
                    event_id=event_id,
                    data={
                        "category_name": info.get("name", "Unknown"),
                        "category_id": f"cat:{cat_id}",
                        "budget_amount": str(int(budgeted)),
                        "actual_spending": str(int(actual)),
                        "amount_saved": str(amount_saved),
                        "percent_saved": str(percent_saved),
                    },
                )

                if result.get("stored") or result.get("id"):
                    pushed_events.append(event_id)

        return pushed_events

    async def check_budget_surplus(
        self,
        category_manager: Any,
    ) -> list[str]:
        """
        Check for monthly budget surplus and push trigger event.
        Only fires after day 25 of the month.

        Args:
            category_manager: CategoryManager instance for fetching budget summary

        Returns:
            List of event IDs that were pushed
        """
        if not self.is_configured:
            return []

        from datetime import datetime

        now = datetime.now()
        if now.day < 25:
            return []

        summary = await category_manager.get_ready_to_assign()
        planned_expenses = abs(summary.get("planned_expenses", 0))
        actual_expenses = abs(summary.get("actual_expenses", 0))

        if planned_expenses <= 0 or actual_expenses >= planned_expenses:
            return []

        surplus = int(planned_expenses - actual_expenses)
        if surplus <= 0:
            return []

        month_key = now.strftime("%Y-%m")
        month_name = now.strftime("%B %Y")
        event_id = f"surplus-{month_key}"

        percent_saved = int((surplus / planned_expenses) * 100) if planned_expenses else 0

        result = await self.push_trigger_event(
            trigger_slug="budget_surplus",
            event_id=event_id,
            data={
                "surplus_amount": str(surplus),
                "total_budget": str(int(planned_expenses)),
                "total_spent": str(int(actual_expenses)),
                "percent_saved": str(percent_saved),
                "month": month_name,
            },
        )

        if result.get("stored") or result.get("id"):
            return [event_id]
        return []

    async def check_balance_thresholds(
        self,
        budget_data: dict[str, dict[str, float]],
        category_info: dict[str, dict[str, str]],
        subscriptions: dict[str, set[str]] | None = None,
    ) -> list[str]:
        """
        Push balance events only for categories with active IFTTT subscriptions.

        Args:
            budget_data: category_id -> {budgeted, actual, remaining, rollover}
            category_info: category_id -> {name, group_id, group_name}
            subscriptions: Active trigger subscriptions (from get_active_subscriptions)

        Returns:
            List of event IDs that were pushed
        """
        if not self.is_configured:
            return []

        from datetime import datetime

        # Get subscribed categories for this trigger
        subscribed = (
            subscriptions.get("category_balance_threshold", set()) if subscriptions else set()
        )
        if not subscribed:
            return []  # No active subscriptions, skip pushing

        # Check for wildcard (user wants all categories)
        push_all = "*" in subscribed

        month_key = datetime.now().strftime("%Y-%m")
        pushed_events: list[str] = []

        for cat_id, budget in budget_data.items():
            # Skip if not subscribed (unless wildcard)
            if not push_all and f"cat:{cat_id}" not in subscribed:
                continue

            remaining = budget.get("remaining", 0)
            info = category_info.get(cat_id, {})
            event_id = f"balance-{cat_id}-{month_key}"

            result = await self.push_trigger_event(
                trigger_slug="category_balance_threshold",
                event_id=event_id,
                data={
                    "category_name": info.get("name", "Unknown"),
                    "category_id": f"cat:{cat_id}",
                    "current_balance": str(int(remaining)),
                },
            )

            if result.get("stored") or result.get("id"):
                pushed_events.append(event_id)

        return pushed_events

    async def check_spending_streaks(
        self,
        budget_data: dict[str, dict[str, float]],
        category_info: dict[str, dict[str, str]],
        subscriptions: dict[str, set[str]] | None = None,
    ) -> list[str]:
        """
        Track consecutive months under budget per category.
        Uses a state file to persist streak counts across syncs.
        Only checks near end of month (day >= 28).

        Args:
            budget_data: category_id -> {budgeted, actual, remaining, rollover}
            category_info: category_id -> {name, group_id, group_name}
            subscriptions: Active trigger subscriptions (from get_active_subscriptions)

        Returns:
            List of event IDs that were pushed
        """
        if not self.is_configured:
            return []

        import os
        from datetime import datetime

        now = datetime.now()
        if now.day < 28:
            return []

        # Get subscribed categories for this trigger
        subscribed = subscriptions.get("spending_streak", set()) if subscriptions else set()
        if not subscribed:
            return []  # No active subscriptions, skip pushing

        push_all = "*" in subscribed

        month_key = now.strftime("%Y-%m")

        # Load streak state
        state_dir = os.environ.get("STATE_DIR", os.path.expanduser("~/.config/Eclosion"))
        streak_file = os.path.join(state_dir, "ifttt-streak-state.json")

        try:
            with open(streak_file) as f:
                streak_state = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            streak_state = {}

        pushed_events: list[str] = []

        for cat_id, budget in budget_data.items():
            # Skip if not subscribed (unless wildcard)
            if not push_all and f"cat:{cat_id}" not in subscribed:
                continue

            budgeted = budget.get("budgeted", 0)
            actual = abs(budget.get("actual", 0))

            if budgeted <= 0:
                continue

            cat_streak = streak_state.get(cat_id, {"count": 0, "last_month": ""})

            # Only update once per month
            if cat_streak["last_month"] == month_key:
                continue

            if actual <= budgeted:
                cat_streak["count"] += 1
            else:
                cat_streak["count"] = 0

            cat_streak["last_month"] = month_key
            streak_state[cat_id] = cat_streak

            # Push streak event at every increment (worker filters by triggerFields)
            if cat_streak["count"] >= 1:
                info = category_info.get(cat_id, {})
                event_id = f"streak-{cat_id}-{cat_streak['count']}-{month_key}"

                result = await self.push_trigger_event(
                    trigger_slug="spending_streak",
                    event_id=event_id,
                    data={
                        "category_name": info.get("name", "Unknown"),
                        "category_id": f"cat:{cat_id}",
                        "streak_count": str(cat_streak["count"]),
                        "budget_amount": str(int(budgeted)),
                        "current_spending": str(int(actual)),
                    },
                )

                if result.get("stored") or result.get("id"):
                    pushed_events.append(event_id)

        # Save streak state
        try:
            os.makedirs(os.path.dirname(streak_file), exist_ok=True)
            with open(streak_file, "w") as f:
                json.dump(streak_state, f)
        except Exception as e:
            logger.warning(f"Failed to save IFTTT streak state: {e}")

        return pushed_events

    async def check_new_charges(
        self,
        category_info: dict[str, dict[str, str]],
        subscriptions: dict[str, set[str]] | None = None,
    ) -> list[str]:
        """
        Check for new expense transactions and push trigger events.
        Uses a state file to track which transaction IDs have already been pushed.

        Each transaction is pushed with its category, amount, merchant,
        pending status, and date. The worker filters by user-configured
        triggerFields (optional category, include_pending checkbox).

        Args:
            category_info: category_id -> {name, group_id, group_name}
            subscriptions: Active trigger subscriptions (from get_active_subscriptions)

        Returns:
            List of event IDs that were pushed
        """
        logger.info(
            f"[IFTTT] check_new_charges called, is_configured={self.is_configured}, subdomain={self.subdomain}"
        )
        if not self.is_configured:
            logger.info("[IFTTT] Skipping new charges check - not configured")
            return []

        # Get subscribed categories for this trigger
        subscribed = subscriptions.get("new_charge", set()) if subscriptions else set()
        if not subscribed:
            logger.info("[IFTTT] Skipping new charges - no active subscriptions")
            return []

        push_all = "*" in subscribed

        import os
        from datetime import datetime, timedelta

        from monarch_utils import get_mm

        mm = await get_mm()

        # Fetch recent transactions (last 3 days to catch stragglers)
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")

        result = await mm.get_transactions(
            limit=200,
            start_date=start_date,
            end_date=end_date,
        )

        transactions = result.get("allTransactions", {}).get("results", [])

        logger.info(
            f"[IFTTT] Fetched {len(transactions)} transactions from {start_date} to {end_date}"
        )

        if not transactions:
            return []

        # Load seen transaction IDs
        state_dir = os.environ.get("STATE_DIR", os.path.expanduser("~/.config/Eclosion"))
        seen_file = os.path.join(state_dir, "ifttt-seen-charges.json")

        try:
            with open(seen_file) as f:
                seen_state = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            seen_state = {"seen_ids": [], "last_cleanup": ""}

        seen_ids = set(seen_state.get("seen_ids", []))
        pushed_events: list[str] = []
        skipped_seen = 0
        skipped_income = 0
        skipped_unsubscribed = 0

        for txn in transactions:
            txn_id = txn.get("id", "")
            if not txn_id or txn_id in seen_ids:
                skipped_seen += 1
                continue

            # Only push expense transactions (negative amounts in Monarch)
            amount = txn.get("amount", 0)
            if amount >= 0:
                seen_ids.add(txn_id)
                skipped_income += 1
                continue

            category = txn.get("category") or {}
            category_id = category.get("id", "")

            # Skip if not subscribed (unless wildcard)
            if not push_all and f"cat:{category_id}" not in subscribed:
                seen_ids.add(txn_id)
                skipped_unsubscribed += 1
                continue

            info = category_info.get(category_id, {})
            category_name = info.get("name", category.get("name", "Uncategorized"))

            merchant = txn.get("merchant") or {}
            merchant_name = merchant.get("name", txn.get("originalName", "Unknown"))

            is_pending = txn.get("isPending", False)
            txn_date = txn.get("date", end_date)

            event_id = f"charge-{txn_id}"

            push_result = await self.push_trigger_event(
                trigger_slug="new_charge",
                event_id=event_id,
                data={
                    "transaction_id": txn_id,
                    "amount": str(abs(int(amount))),
                    "merchant_name": merchant_name,
                    "category_name": category_name,
                    "category_id": f"cat:{category_id}",
                    "is_pending": "true" if is_pending else "false",
                    "date": txn_date,
                },
            )

            seen_ids.add(txn_id)
            if push_result.get("stored") or push_result.get("id"):
                pushed_events.append(event_id)
                logger.info(
                    f"[IFTTT] New charge pushed: ${abs(int(amount))} at {merchant_name} ({category_name}) on {txn_date}"
                )

        logger.info(
            f"[IFTTT] Transaction summary: {len(pushed_events)} pushed, {skipped_seen} seen, {skipped_income} income, {skipped_unsubscribed} unsubscribed"
        )

        # Cleanup: only keep IDs from the last 7 days worth of runs
        today = datetime.now().strftime("%Y-%m-%d")
        if seen_state.get("last_cleanup", "") != today:
            # Trim to last 2000 entries to prevent unbounded growth
            seen_list = list(seen_ids)
            if len(seen_list) > 2000:
                seen_list = seen_list[-2000:]
            seen_state["seen_ids"] = seen_list
            seen_state["last_cleanup"] = today
        else:
            seen_state["seen_ids"] = list(seen_ids)

        try:
            os.makedirs(os.path.dirname(seen_file), exist_ok=True)
            with open(seen_file, "w") as f:
                json.dump(seen_state, f)
        except Exception as e:
            logger.warning(f"Failed to save IFTTT seen charges state: {e}")

        return pushed_events

    def _parse_category_or_group_id(self, value: str) -> tuple[str, str]:
        """
        Parse a prefixed ID into (type, id) tuple.

        Supports:
        - "group:<uuid>" -> ("group", "<uuid>")
        - "cat:<uuid>" -> ("category", "<uuid>")
        """
        if value.startswith("group:"):
            return ("group", value[6:])
        elif value.startswith("cat:"):
            return ("category", value[4:])
        else:
            # Assume raw category ID for backwards compatibility
            return ("category", value)

    async def execute_queued_action(
        self,
        action: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Execute a single queued action locally.

        Args:
            action: QueuedAction dict with action_slug and fields

        Returns:
            Execution result
        """
        from services.category_manager import CategoryManager
        from services.stash_service import StashService

        action_slug = action.get("action_slug", "")
        fields = action.get("fields", {})

        try:
            if action_slug == "budget_to":
                raw_id = fields.get("category", "")
                amount = float(fields.get("amount", 0))
                if raw_id and amount > 0:
                    id_type, entity_id = self._parse_category_or_group_id(raw_id)
                    cm = CategoryManager()
                    if id_type == "group":
                        result = await cm.allocate_to_group(entity_id, amount)
                    else:
                        result = await cm.allocate_to_category(entity_id, amount)
                    return result
                return {"success": False, "error": "Invalid category or amount"}

            elif action_slug == "budget_to_goal":
                goal_id = fields.get("goal", "")
                amount = int(float(fields.get("amount", 0)))
                if goal_id and amount > 0:
                    service = StashService()
                    result = await service.allocate_funds(goal_id, amount)
                    return result
                return {"success": False, "error": "Invalid goal or amount"}

            elif action_slug == "move_funds":
                raw_source_id = fields.get("source_category", "")
                raw_dest_id = fields.get("destination_category", "")
                amount = float(fields.get("amount", 0))
                if raw_source_id and raw_dest_id and raw_source_id != raw_dest_id and amount > 0:
                    source_type, source_id = self._parse_category_or_group_id(raw_source_id)
                    dest_type, dest_id = self._parse_category_or_group_id(raw_dest_id)
                    cm = CategoryManager()
                    result = await cm.move_funds_mixed(
                        source_id, source_type, dest_id, dest_type, amount
                    )
                    return result
                return {"success": False, "error": "Invalid move funds parameters"}

            else:
                return {"success": False, "error": f"Unknown action: {action_slug}"}

        except Exception as e:
            logger.error(f"Failed to execute queued IFTTT action: {e}")
            return {"success": False, "error": str(e)}

    async def drain_queue(self) -> list[dict[str, Any]]:
        """
        Poll and execute all queued actions.
        Called on tunnel startup for offline catch-up.

        Returns:
            List of execution results for each action
        """
        actions = await self.poll_queued_actions()

        if not actions:
            return []

        results = []
        for action in actions:
            action_id = action.get("id", "")
            result = await self.execute_queued_action(action)
            result["action_id"] = action_id
            result["action_slug"] = action.get("action_slug", "")
            result["fields"] = action.get("fields", {})

            # ACK the action regardless of success (don't retry forever)
            if action_id:
                await self.ack_action(action_id)

            results.append(result)

        return results
