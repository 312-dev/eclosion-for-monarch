#!/usr/bin/env python3
"""
Monarch API Coverage Checker

This script ensures that all Monarch Money API functions used in the application
have corresponding integration tests. It runs as part of CI to catch any new
API usage that lacks test coverage.

Usage:
    python scripts/check-monarch-api-coverage.py

Exit codes:
    0 - All API calls have test coverage
    1 - Missing test coverage for some API calls
"""

import re
import sys
from pathlib import Path

# Root of the project
PROJECT_ROOT = Path(__file__).parent.parent

# Files/directories to scan for Monarch API usage
SOURCE_DIRS = [
    PROJECT_ROOT / "services",
    PROJECT_ROOT / "monarch_utils.py",
    PROJECT_ROOT / "api.py",
]

# Integration test directory
INTEGRATION_TEST_DIR = PROJECT_ROOT / "tests" / "integration"

# Patterns to find Monarch API calls
# These are the MonarchMoney client methods our app uses
API_PATTERNS = [
    r"mm\.get_budgets",
    r"mm\.get_transaction_categories",
    r"mm\.get_transaction_category_groups",
    r"mm\.get_all_recurring_transaction_items",
    r"mm\.get_recurring_transactions",
    r"mm\.get_transactions",
    r"mm\.get_accounts",
    r"mm\.create_transaction_category",
    r"mm\.delete_transaction_category",
    r"mm\.set_budget_amount",
    r"mm\.update_transaction",
    r"mm\.update_flexible_budget",
    r"mm\.gql_call",
    r"monarch_client\.get_budgets",
    r"monarch_client\.get_transaction_categories",
    r"monarch_client\.get_transaction_category_groups",
    r"monarch_client\.get_all_recurring_transaction_items",
    r"monarch_client\.get_recurring_transactions",
    r"monarch_client\.get_transactions",
    r"monarch_client\.get_accounts",
    r"monarch_client\.create_transaction_category",
    r"monarch_client\.delete_transaction_category",
    r"monarch_client\.set_budget_amount",
    r"monarch_client\.update_transaction",
    r"monarch_client\.update_flexible_budget",
    r"monarch_client\.gql_call",
]

# Map of API methods to their canonical names (for reporting)
API_METHOD_NAMES = {
    "get_budgets": "get_budgets()",
    "get_transaction_categories": "get_transaction_categories()",
    "get_transaction_category_groups": "get_transaction_category_groups()",
    "get_all_recurring_transaction_items": "get_all_recurring_transaction_items()",
    "get_recurring_transactions": "get_recurring_transactions()",
    "get_transactions": "get_transactions()",
    "get_accounts": "get_accounts()",
    "create_transaction_category": "create_transaction_category()",
    "delete_transaction_category": "delete_transaction_category()",
    "set_budget_amount": "set_budget_amount()",
    "update_transaction": "update_transaction()",
    "update_flexible_budget": "update_flexible_budget()",
    "gql_call": "gql_call() [GraphQL]",
}


def find_api_calls_in_source() -> set[str]:
    """Find all Monarch API calls used in the source code."""
    api_calls: set[str] = set()

    for source in SOURCE_DIRS:
        if source.is_file():
            files = [source]
        elif source.is_dir():
            files = list(source.glob("**/*.py"))
        else:
            continue

        for file_path in files:
            # Skip test files in source directories
            if "test" in file_path.name.lower():
                continue

            try:
                content = file_path.read_text()

                # Find all API method calls
                for pattern in API_PATTERNS:
                    if re.search(pattern, content):
                        # Extract method name from pattern
                        method_match = re.search(r"\.(\w+)", pattern)
                        if method_match:
                            method_name = method_match.group(1)
                            api_calls.add(method_name)

            except Exception as e:
                print(f"Warning: Could not read {file_path}: {e}")

    return api_calls


def find_api_calls_in_tests() -> set[str]:
    """Find all Monarch API calls that have integration test coverage."""
    tested_calls: set[str] = set()

    if not INTEGRATION_TEST_DIR.exists():
        return tested_calls

    for test_file in INTEGRATION_TEST_DIR.glob("*.py"):
        try:
            content = test_file.read_text()

            # Look for API calls in test files
            for pattern in API_PATTERNS:
                if re.search(pattern, content):
                    method_match = re.search(r"\.(\w+)", pattern)
                    if method_match:
                        tested_calls.add(method_match.group(1))

        except Exception as e:
            print(f"Warning: Could not read {test_file}: {e}")

    return tested_calls


def main() -> int:
    """Check API coverage and report results."""
    print("=" * 60)
    print("Monarch API Integration Test Coverage Check")
    print("=" * 60)
    print()

    # Find API calls in source
    source_calls = find_api_calls_in_source()
    print(f"API calls found in source code: {len(source_calls)}")
    for call in sorted(source_calls):
        print(f"  - {API_METHOD_NAMES.get(call, call)}")
    print()

    # Find API calls in tests
    tested_calls = find_api_calls_in_tests()
    print(f"API calls with integration tests: {len(tested_calls)}")
    for call in sorted(tested_calls):
        print(f"  - {API_METHOD_NAMES.get(call, call)}")
    print()

    # Find missing coverage
    missing = source_calls - tested_calls
    extra = tested_calls - source_calls

    if missing:
        print("ERROR: The following API calls lack integration test coverage:")
        for call in sorted(missing):
            print(f"  - {API_METHOD_NAMES.get(call, call)}")
        print()
        print("Please add integration tests for these API calls in:")
        print(f"  {INTEGRATION_TEST_DIR}")
        print()
        print("See tests/integration/test_api_coverage.py for examples.")
        print()
        return 1

    if extra:
        print("INFO: The following API calls are tested but not used in source:")
        for call in sorted(extra):
            print(f"  - {API_METHOD_NAMES.get(call, call)}")
        print("(This is fine - extra coverage doesn't hurt)")
        print()

    print("SUCCESS: All Monarch API calls have integration test coverage!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
