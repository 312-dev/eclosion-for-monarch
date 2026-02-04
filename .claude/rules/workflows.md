# Workflows

## Git Hooks

| Hook | When | What |
|------|------|------|
| pre-commit | Every commit | lint-staged (eslint --fix, prettier) |
| pre-push | Before push | Type checking, tests |

Bypass (sparingly): `--no-verify`.

## Commits

Commit frequently after each logical unit. Clear descriptive messages. Don't batch unrelated changes.

## Dev Builds

```bash
gh workflow run "25 Dev: Build Desktop" -f platform={windows|macos-arm64|macos-x64|linux-x64|linux-arm64}
```

Single platform, ~5-8 min, unsigned, 7-day artifact retention. Use for platform-specific testing.

## Dependencies (Python)

Hash-pinned lockfiles. Edit `requirements.in`/`requirements-dev.in`, then `pip-compile --generate-hashes --allow-unsafe`. Git deps pinned to commit in `requirements-vcs.txt`.

## Log Locations

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Eclosion{, Beta}/logs/` |
| Windows | `%APPDATA%\Eclosion{, Beta}\logs\` |
| Linux | `~/.config/Eclosion{, Beta}/logs/` |
