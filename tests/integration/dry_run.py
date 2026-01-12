#!/usr/bin/env python3
"""
Integration Test Dry Run Mode

This script shows what integration tests WOULD do without actually executing them.
Use this to review planned operations before running tests against your real Monarch account.

Usage:
    # Show what tests would do (no API calls)
    python tests/integration/dry_run.py

    # After reviewing, run actual tests with approval
    python tests/integration/dry_run.py --execute

Color coding:
    🟢 GREEN  = Read-only (safe, no changes)
    🟡 YELLOW = Additive (creates new data, cleaned up after)
    🟠 ORANGE = Modifying (changes existing test data)
    🔴 RED    = Destructive (deletes ONLY test data with ECLOSION-TEST prefix)
"""

import argparse
import sys
from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class OpType(Enum):
    """Operation types with risk levels."""

    READ = "read"
    CREATE = "create"
    MODIFY = "modify"
    DELETE = "delete"


# ANSI color codes
class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    ORANGE = "\033[38;5;208m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"
    DIM = "\033[2m"


@dataclass
class PlannedOperation:
    """A planned API operation."""

    op_type: OpType
    method: str
    description: str
    test_name: str
    cleanup: bool = False  # True if this is a cleanup operation


# All planned operations from integration tests
PLANNED_OPERATIONS: list[PlannedOperation] = [
    # ==========================================================================
    # test_authentication.py
    # ==========================================================================
    PlannedOperation(
        OpType.READ,
        "login()",
        "Authenticate with Monarch using provided credentials",
        "test_authentication_succeeds",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify authenticated requests work",
        "test_authenticated_request_works",
    ),
    PlannedOperation(
        OpType.READ, "login()", "Test fresh login (separate from fixture)", "test_fresh_login"
    ),
    # ==========================================================================
    # test_sync_readonly.py - All read-only operations
    # ==========================================================================
    PlannedOperation(
        OpType.READ,
        "get_budgets()",
        "Fetch budget data for current month",
        "test_can_fetch_budgets",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "List all categories",
        "test_can_fetch_categories",
    ),
    PlannedOperation(
        OpType.READ,
        "get_recurring_transactions()",
        "List recurring transactions",
        "test_can_fetch_recurring",
    ),
    PlannedOperation(
        OpType.READ, "get_accounts()", "List linked accounts", "test_can_fetch_accounts"
    ),
    PlannedOperation(
        OpType.READ, "get_budgets()", "Verify budget data structure", "test_budget_data_structure"
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify category data structure",
        "test_category_data_structure",
    ),
    # ==========================================================================
    # test_category_lifecycle.py - Create/Delete operations
    # ==========================================================================
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create temporary test category 'ECLOSION-TEST-...'",
        "test_create_and_delete_category",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify category was created",
        "test_create_and_delete_category",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Delete the test category (cleanup)",
        "test_create_and_delete_category",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify category was deleted",
        "test_create_and_delete_category",
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create test category via fixture",
        "test_category_appears_in_list",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Check category appears in list",
        "test_category_appears_in_list",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Cleanup fixture category",
        "test_category_appears_in_list",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category() x3",
        "Create 3 test categories",
        "test_multiple_test_categories",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify all 3 exist",
        "test_multiple_test_categories",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category() x3",
        "Delete all 3 test categories (cleanup)",
        "test_multiple_test_categories",
        cleanup=True,
    ),
    # ==========================================================================
    # test_budget_operations.py - Budget modifications
    # ==========================================================================
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create test category for budget test",
        "test_set_budget_amount",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "set_budget_amount()",
        "Set budget to $100 on test category",
        "test_set_budget_amount",
    ),
    PlannedOperation(
        OpType.READ, "get_budgets()", "Verify budget was set", "test_set_budget_amount"
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Delete test category (cleanup)",
        "test_set_budget_amount",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create test category for update test",
        "test_update_budget_amount",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "set_budget_amount() x2",
        "Set budget to $50, then update to $75",
        "test_update_budget_amount",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Delete test category (cleanup)",
        "test_update_budget_amount",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create test category for zero budget test",
        "test_zero_budget_amount",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "set_budget_amount() x2",
        "Set budget to $100, then to $0",
        "test_zero_budget_amount",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Delete test category (cleanup)",
        "test_zero_budget_amount",
        cleanup=True,
    ),
    # ==========================================================================
    # test_api_coverage.py - Comprehensive API tests
    # ==========================================================================
    PlannedOperation(
        OpType.READ,
        "get_budgets()",
        "Verify budget structure",
        "test_get_budgets_returns_valid_structure",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify category list structure",
        "test_get_transaction_categories_returns_list",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_category_groups()",
        "Verify category groups structure",
        "test_get_transaction_category_groups_returns_structure",
    ),
    PlannedOperation(
        OpType.READ,
        "get_all_recurring_transaction_items()",
        "Verify recurring items structure",
        "test_get_all_recurring_transaction_items",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transactions()",
        "Fetch transactions (last 30 days)",
        "test_get_transactions_returns_structure",
    ),
    PlannedOperation(
        OpType.READ, "get_budgets() x2", "Test different date ranges", "test_get_budgets_date_range"
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create test category for lifecycle test",
        "test_create_and_delete_category_full_lifecycle",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify creation",
        "test_create_and_delete_category_full_lifecycle",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Delete test category",
        "test_create_and_delete_category_full_lifecycle",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify deletion",
        "test_create_and_delete_category_full_lifecycle",
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create for budget test",
        "test_set_budget_amount_on_test_category",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "set_budget_amount()",
        "Set budget to $150",
        "test_set_budget_amount_on_test_category",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Cleanup",
        "test_set_budget_amount_on_test_category",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create for multiple updates test",
        "test_multiple_budget_updates",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "set_budget_amount() x3",
        "Set $50 → $100 → $0",
        "test_multiple_budget_updates",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Cleanup",
        "test_multiple_budget_updates",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create for budget data test",
        "test_category_appears_in_budget_data",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "set_budget_amount()",
        "Set budget to $200",
        "test_category_appears_in_budget_data",
    ),
    PlannedOperation(
        OpType.READ,
        "get_budgets()",
        "Verify in budget data",
        "test_category_appears_in_budget_data",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category()",
        "Cleanup",
        "test_category_appears_in_budget_data",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.READ,
        "get_budgets()",
        "Test with very old date (error handling)",
        "test_get_budgets_invalid_date_handles_gracefully",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transactions()",
        "Test with empty date range",
        "test_get_transactions_empty_range",
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category() x3",
        "Create 3 categories in sequence",
        "test_parallel_category_operations",
    ),
    PlannedOperation(
        OpType.READ,
        "get_transaction_categories()",
        "Verify all 3 exist",
        "test_parallel_category_operations",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_transaction_category() x3",
        "Delete all 3 (cleanup)",
        "test_parallel_category_operations",
        cleanup=True,
    ),
    # ==========================================================================
    # test_services.py - Service-level tests
    # ==========================================================================
    PlannedOperation(
        OpType.READ,
        "CategoryManager.get_category_groups()",
        "Test CategoryManager wrapper",
        "test_category_manager_get_category_groups",
    ),
    PlannedOperation(
        OpType.READ,
        "CategoryManager.get_all_categories_grouped()",
        "Test grouped categories",
        "test_category_manager_get_all_categories_grouped",
    ),
    PlannedOperation(
        OpType.READ,
        "CategoryManager.get_category_groups() x3",
        "Test caching behavior",
        "test_category_manager_caching",
    ),
    PlannedOperation(
        OpType.CREATE,
        "CategoryManager.create_category()",
        "Create via CategoryManager",
        "test_category_manager_create_category_uses_correct_api",
    ),
    PlannedOperation(
        OpType.READ,
        "CategoryManager.get_all_categories_grouped()",
        "Verify creation",
        "test_category_manager_create_category_uses_correct_api",
    ),
    PlannedOperation(
        OpType.DELETE,
        "CategoryManager.delete_category()",
        "Delete via CategoryManager",
        "test_category_manager_create_category_uses_correct_api",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.CREATE,
        "CategoryManager.create_category()",
        "Create for budget test",
        "test_category_manager_set_budget_correct_parameters",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "CategoryManager.set_budget()",
        "Set budget to $123",
        "test_category_manager_set_budget_correct_parameters",
    ),
    PlannedOperation(
        OpType.DELETE,
        "CategoryManager.delete_category()",
        "Cleanup",
        "test_category_manager_set_budget_correct_parameters",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_transaction_category()",
        "Create for safety test",
        "test_delete_category_only_deletes_specified_category",
    ),
    PlannedOperation(
        OpType.READ,
        "get_all_categories_grouped()",
        "Count categories before",
        "test_delete_category_only_deletes_specified_category",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_category()",
        "Delete ONLY the test category",
        "test_delete_category_only_deletes_specified_category",
        cleanup=True,
    ),
    PlannedOperation(
        OpType.READ,
        "get_all_categories_grouped()",
        "Verify count unchanged (safety check)",
        "test_delete_category_only_deletes_specified_category",
    ),
    PlannedOperation(
        OpType.CREATE,
        "create_category()",
        "Create for budget safety test",
        "test_set_budget_only_affects_specified_category",
    ),
    PlannedOperation(
        OpType.MODIFY,
        "set_budget()",
        "Set budget to $999 (distinctive amount)",
        "test_set_budget_only_affects_specified_category",
    ),
    PlannedOperation(
        OpType.DELETE,
        "delete_category()",
        "Cleanup",
        "test_set_budget_only_affects_specified_category",
        cleanup=True,
    ),
]


def get_color(op_type: OpType, cleanup: bool = False) -> str:
    """Get ANSI color for operation type."""
    if cleanup:
        return Colors.DIM + Colors.GREEN  # Cleanup ops are dimmed green
    return {
        OpType.READ: Colors.GREEN,
        OpType.CREATE: Colors.YELLOW,
        OpType.MODIFY: Colors.ORANGE,
        OpType.DELETE: Colors.RED,
    }[op_type]


def get_symbol(op_type: OpType) -> str:
    """Get symbol for operation type."""
    return {
        OpType.READ: "🟢",
        OpType.CREATE: "🟡",
        OpType.MODIFY: "🟠",
        OpType.DELETE: "🔴",
    }[op_type]


def print_header():
    """Print the header."""
    print()
    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}  INTEGRATION TEST DRY RUN - Operation Preview{Colors.RESET}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print()
    print("Legend:")
    print(
        f"  {get_symbol(OpType.READ)} {Colors.GREEN}READ{Colors.RESET}    - Safe, read-only operation"
    )
    print(
        f"  {get_symbol(OpType.CREATE)} {Colors.YELLOW}CREATE{Colors.RESET}  - Creates temporary test data"
    )
    print(
        f"  {get_symbol(OpType.MODIFY)} {Colors.ORANGE}MODIFY{Colors.RESET}  - Modifies test data (budget amounts)"
    )
    print(
        f"  {get_symbol(OpType.DELETE)} {Colors.RED}DELETE{Colors.RESET}  - Removes test data (cleanup only)"
    )
    print()
    print(
        f"{Colors.DIM}Note: All CREATE/MODIFY/DELETE operations target temporary test data{Colors.RESET}"
    )
    print(
        f"{Colors.DIM}      with 'ECLOSION-TEST-' prefix. Your real data is NOT modified.{Colors.RESET}"
    )
    print()


def print_operations():
    """Print all planned operations."""
    current_test = None

    for op in PLANNED_OPERATIONS:
        # Print test name header when it changes
        if op.test_name != current_test:
            current_test = op.test_name
            print(f"\n{Colors.BOLD}📋 {current_test}{Colors.RESET}")

        # Print operation
        color = get_color(op.op_type, op.cleanup)
        symbol = get_symbol(op.op_type)
        cleanup_tag = f" {Colors.DIM}(cleanup){Colors.RESET}" if op.cleanup else ""

        print(
            f"   {symbol} {color}{op.op_type.value.upper():8}{Colors.RESET} "
            f"{op.method:45} {Colors.DIM}{op.description}{Colors.RESET}{cleanup_tag}"
        )


def print_summary():
    """Print operation summary."""
    counts = dict.fromkeys(OpType, 0)
    cleanup_count = 0

    for op in PLANNED_OPERATIONS:
        counts[op.op_type] += 1
        if op.cleanup:
            cleanup_count += 1

    print()
    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}  SUMMARY{Colors.RESET}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print()
    print(f"  {get_symbol(OpType.READ)} Read operations:   {counts[OpType.READ]:3}")
    print(f"  {get_symbol(OpType.CREATE)} Create operations: {counts[OpType.CREATE]:3}")
    print(f"  {get_symbol(OpType.MODIFY)} Modify operations: {counts[OpType.MODIFY]:3}")
    print(
        f"  {get_symbol(OpType.DELETE)} Delete operations: {counts[OpType.DELETE]:3} ({cleanup_count} are cleanup)"
    )
    print()
    total = sum(counts.values())
    print(f"  {Colors.BOLD}Total API calls: ~{total}{Colors.RESET}")
    print()

    # Estimate time with rate limiting
    estimated_seconds = (
        counts[OpType.READ] * 0.5  # 0.5s between reads
        + counts[OpType.CREATE] * 1.0  # 1s for writes
        + counts[OpType.MODIFY] * 1.0
        + counts[OpType.DELETE] * 1.0
        + len({op.test_name for op in PLANNED_OPERATIONS}) * 0.5  # Between-test delays
    )
    print(f"  Estimated time (with rate limiting): ~{estimated_seconds / 60:.1f} minutes")
    print()


def print_safety_notes():
    """Print safety information."""
    print(f"{Colors.BOLD}SAFETY NOTES:{Colors.RESET}")
    print()
    print("  ✅ All operations target TEMPORARY test data only")
    print("  ✅ Test categories use 'ECLOSION-TEST-' prefix")
    print("  ✅ All created data is automatically cleaned up")
    print("  ✅ Your existing categories/budgets are NOT modified")
    print("  ✅ Rate limiting prevents API overload")
    print()
    print(
        f"  {Colors.YELLOW}⚠️  If tests fail mid-run, orphaned test data can be cleaned up with:{Colors.RESET}"
    )
    print(
        "     INTEGRATION_TEST=true pytest tests/integration/conftest.py::test_cleanup_orphaned -v"
    )
    print()


def prompt_for_approval() -> bool:
    """Prompt user for approval to run tests."""
    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print()
    print(f"{Colors.BOLD}Ready to execute?{Colors.RESET}")
    print()
    print("This will run the integration tests against your REAL Monarch account.")
    print("Review the operations above to ensure you're comfortable proceeding.")
    print()

    try:
        response = input(
            f"{Colors.BOLD}Type 'yes' to proceed, anything else to cancel: {Colors.RESET}"
        )
        return response.strip().lower() == "yes"
    except (KeyboardInterrupt, EOFError):
        print()
        return False


def run_tests():
    """Run the actual integration tests."""
    import subprocess

    print()
    print(f"{Colors.BOLD}Running integration tests...{Colors.RESET}")
    print()

    result = subprocess.run(
        ["pytest", "tests/integration/", "-v", "--tb=short"],
        env={**dict(__import__("os").environ), "INTEGRATION_TEST": "true"},
        cwd=Path(__file__).parent.parent.parent,
    )

    return result.returncode


def main():
    parser = argparse.ArgumentParser(
        description="Preview integration test operations before running them."
    )
    parser.add_argument(
        "--execute",
        "-x",
        action="store_true",
        help="Actually run the tests (will prompt for confirmation)",
    )
    parser.add_argument(
        "--no-prompt",
        "-y",
        action="store_true",
        help="Skip confirmation prompt (use with --execute)",
    )

    args = parser.parse_args()

    # Always show the dry run first
    print_header()
    print_operations()
    print_summary()
    print_safety_notes()

    if not args.execute:
        print(f"{Colors.DIM}This was a dry run. No API calls were made.{Colors.RESET}")
        print()
        print(
            f"To execute tests, run: {Colors.BOLD}python tests/integration/dry_run.py --execute{Colors.RESET}"
        )
        print()
        return 0

    # Execution mode
    if args.no_prompt or prompt_for_approval():
        return run_tests()
    else:
        print()
        print(f"{Colors.YELLOW}Cancelled.{Colors.RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
