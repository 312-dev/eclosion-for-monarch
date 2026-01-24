#!/usr/bin/env python3
"""
Check file length limits for Python files.

This script enforces a maximum line count per file, similar to ESLint's max-lines
rule for the frontend. Files exceeding the limit will cause the check to fail.

Usage:
    python scripts/check-file-length.py [files...]
    python scripts/check-file-length.py --all

Configuration:
    MAX_LINES: Maximum allowed lines per file (default: 500)
    EXCLUDED_PATHS: Paths that are exempt from the check

Exit codes:
    0: All files pass
    1: One or more files exceed the limit
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Configuration
MAX_LINES = 500  # Python files can be slightly longer than TSX components (300)
WARN_LINES = 400  # Warn when approaching the limit

# Files/paths that are exempt from the check
EXCLUDED_PATHS = {
    "lib/",  # Legacy backup files
    "tests/",  # Test files can be longer
    "__pycache__/",
    ".venv/",
    "migrations/",  # Auto-generated
    "node_modules/",  # Third-party code
    "desktop/",  # Electron app (has its own linting)
    "scripts/",  # Build/utility scripts
    "docusaurus/",  # Documentation site
}

# Common messages for legacy files
_REFACTOR_MSG = "TODO: Refactor into smaller modules"
_SPLIT_MSG = "Consider splitting by domain"

# Specific files that are known to be long and tracked for refactoring
LEGACY_FILES = {
    "services/stash_service.py": _REFACTOR_MSG,
    "services/sync_service.py": _REFACTOR_MSG,
    "services/category_manager.py": _REFACTOR_MSG,
    "services/settings_export_service.py": _REFACTOR_MSG,
    "state/state_manager.py": _SPLIT_MSG,
    "state/db/repositories/tracker_repo.py": _REFACTOR_MSG,
    "state/db/repositories/notes_repo.py": _REFACTOR_MSG,
    "blueprints/recurring.py": _REFACTOR_MSG,
    "blueprints/stash.py": _REFACTOR_MSG,
    "monarch_utils.py": _REFACTOR_MSG,
}


def _is_meaningful_line(line: str, in_multiline: bool) -> tuple[bool, bool]:
    """
    Check if a line is meaningful (not blank/comment).

    Returns:
        (is_meaningful, new_multiline_state)
    """
    stripped = line.strip()

    # Handle multiline strings (docstrings)
    for quote in ('"""', "'''"):
        if quote in stripped:
            count = stripped.count(quote)
            if count == 1:
                return True, not in_multiline
            return True, in_multiline

    if in_multiline:
        return True, True

    # Skip blank lines and pure comments
    if not stripped or stripped.startswith("#"):
        return False, False

    return True, False


def count_lines(file_path: Path) -> int:
    """Count non-blank, non-comment lines in a Python file."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return 0

    meaningful_lines = 0
    in_multiline = False

    for line in content.splitlines():
        is_meaningful, in_multiline = _is_meaningful_line(line, in_multiline)
        if is_meaningful:
            meaningful_lines += 1

    return meaningful_lines


def is_excluded(file_path: Path, root: Path) -> bool:
    """Check if a file should be excluded from the check."""
    relative = str(file_path.relative_to(root))

    for excluded in EXCLUDED_PATHS:
        if excluded in relative:
            return True

    return False


def check_file(file_path: Path, root: Path) -> tuple[bool, str | None]:
    """
    Check a single file for length violations.

    Returns:
        (passed, message): passed is True if file is OK, message is warning/error text
    """
    relative = str(file_path.relative_to(root))

    if is_excluded(file_path, root):
        return True, None

    lines = count_lines(file_path)

    # Check if it's a known legacy file
    if relative in LEGACY_FILES:
        if lines > MAX_LINES:
            return True, f"  {relative}: {lines} lines (legacy file - {LEGACY_FILES[relative]})"
        return True, None

    if lines > MAX_LINES:
        return False, f"  {relative}: {lines} lines (max {MAX_LINES})"

    if lines > WARN_LINES:
        return True, f"  {relative}: {lines} lines (approaching limit of {MAX_LINES})"

    return True, None


def find_python_files(root: Path) -> list[Path]:
    """Find all Python files in the project."""
    files = []

    for pattern in ["*.py"]:
        for file_path in root.rglob(pattern):
            if not is_excluded(file_path, root):
                files.append(file_path)

    return sorted(files)


def _get_files_to_check(args: argparse.Namespace) -> list[Path]:
    """Determine which files to check based on arguments."""
    root = args.root.resolve()

    if args.all:
        return find_python_files(root)
    if args.files:
        return [Path(f).resolve() for f in args.files if f.endswith(".py")]
    return []


def _categorize_result(passed: bool, message: str | None) -> str | None:
    """Categorize a check result into error, warning, legacy, or None."""
    if not message:
        return None
    if not passed:
        return "error"
    if "legacy file" in message:
        return "legacy"
    return "warning"


def _print_results(errors: list[str], warnings: list[str], legacy: list[str], total: int) -> int:
    """Print results and return exit code."""
    if legacy:
        print("Legacy files (tracked for refactoring):")
        for msg in legacy:
            print(msg)
        print()

    if warnings:
        print("Warnings (approaching limit):")
        for msg in warnings:
            print(msg)
        print()

    if errors:
        print(f"Files exceeding {MAX_LINES} line limit:")
        for msg in errors:
            print(msg)
        print()
        print("Please refactor large files into smaller, focused modules.")
        print("See CLAUDE.md for component size guidelines.")
        return 1

    if not errors and not warnings and not legacy:
        print(f"All {total} Python files pass length check.")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Python file length limits")
    parser.add_argument(
        "files",
        nargs="*",
        help="Files to check (if empty, checks staged files or use --all)",
    )
    parser.add_argument("--all", action="store_true", help="Check all Python files")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Project root")
    args = parser.parse_args()

    files = _get_files_to_check(args)
    if not files:
        return 0

    root = args.root.resolve()
    errors: list[str] = []
    warnings: list[str] = []
    legacy: list[str] = []

    for file_path in files:
        if not file_path.exists():
            continue

        passed, message = check_file(file_path, root)
        category = _categorize_result(passed, message)

        if category == "error":
            errors.append(message)  # type: ignore[arg-type]
        elif category == "legacy":
            legacy.append(message)  # type: ignore[arg-type]
        elif category == "warning":
            warnings.append(message)  # type: ignore[arg-type]

    return _print_results(errors, warnings, legacy, len(files))


if __name__ == "__main__":
    sys.exit(main())
