# Development Workflows

## Dev Builds (Quick Platform Testing)

For testing platform-specific issues without the full 18-minute pipeline:

```bash
# Single platform builds (~5-8 min)
gh workflow run "25 Dev: Build Desktop" -f platform=windows
gh workflow run "25 Dev: Build Desktop" -f platform=macos-arm64
gh workflow run "25 Dev: Build Desktop" -f platform=macos-x64
gh workflow run "25 Dev: Build Desktop" -f platform=linux-x64
gh workflow run "25 Dev: Build Desktop" -f platform=linux-arm64

# With custom version
gh workflow run "25 Dev: Build Desktop" -f platform=windows -f version=1.2.3-test
```

| Feature | Dev Build | Full Pipeline |
|---------|-----------|---------------|
| Build time | ~5-8 min | ~18 min |
| Code signing | Skipped | Full signing |
| Artifacts | Private, 7 days | Published |

## Troubleshooting Local Builds

Log locations by platform:

| Platform | Stable | Beta |
|----------|--------|------|
| macOS | `~/Library/Application Support/Eclosion/logs/` | `~/Library/Application Support/Eclosion Beta/logs/` |
| Windows | `%APPDATA%\Eclosion\logs\` | `%APPDATA%\Eclosion Beta\logs\` |
| Linux | `~/.config/Eclosion/logs/` | `~/.config/Eclosion Beta/logs/` |

```bash
# macOS - Tail main log
tail -f ~/Library/Application\ Support/Eclosion/logs/main.log
```

## Dependency Management

Python dependencies use **hash-pinned lockfiles** for supply chain security.

| File | Purpose | Editable? |
|------|---------|-----------|
| `requirements.in` | Production deps | Yes |
| `requirements.txt` | Locked with hashes | No - auto-generated |
| `requirements-dev.in` | Dev deps | Yes |
| `requirements-dev.txt` | Locked dev deps | No - auto-generated |

**Adding PyPI packages:**
```bash
echo "new-package>=1.0.0" >> requirements.in
pip-compile --generate-hashes --allow-unsafe requirements.in
```

**Git dependencies:** Pin to specific commit (NOT branch):
```
git+https://github.com/org/repo.git@abc123def456
```

## Git Hooks

| Hook | When | What | Time |
|------|------|------|------|
| pre-commit | Every commit | lint-staged (eslint --fix, prettier) | ~2-5s |
| pre-push | Before push | Type checking, tests | ~15-30s |

Bypass (sparingly): `git commit --no-verify` or `git push --no-verify`

## Commit Strategy

Commit frequently after each logical unit of work.

| Do | Don't |
|----|-------|
| Commit after each meaningful change | Batch unrelated changes |
| Commit working code | Wait until "everything is done" |
| Write clear commit messages | Use "updates" or "fixes" |

## Branch Naming

Only these prefixes allowed for PRs to `main`:

| Prefix | Use for |
|--------|---------|
| `feature/` | New features, enhancements |
| `update/` | Fixes, refactors, docs, chores |

**Important:** Do NOT use `fix/`, `refactor/`, `docs/` - use `update/` for all of these.
