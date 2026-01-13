# ProductBoard Sync

Automated pipeline that syncs feature ideas from Monarch Money's ProductBoard to GitHub Discussions, making them visible to the Eclosion community.

## How It Works

The sync pipeline runs weekly (Monday 9am UTC) via GitHub Actions and performs these steps:

1. **Scrape**: Uses Playwright to scrape ideas from Monarch's public ProductBoard portal (500+ votes threshold)
2. **Filter**: Uses Claude AI to evaluate which ideas are feasible for Eclosion to implement
3. **Sync**: Creates GitHub Discussions for feasible ideas in the "Ideas" category
4. **Export**: Generates `data/ideas.json` for frontend consumption

## Files

| File | Purpose |
|------|---------|
| `index.ts` | CLI orchestrator with `scrape`, `filter`, `sync`, `export` commands |
| `scraper.ts` | Playwright-based ProductBoard scraper |
| `filter.ts` | AI filtering using Claude API |
| `sync.ts` | GitHub Discussions sync logic |
| `export.ts` | JSON export for frontend |
| `types.ts` | TypeScript types and configuration |
| `state.json` | Tracks synced ideas to prevent duplicates |

## Local Development

```bash
cd scripts/productboard-sync
npm install
npx playwright install chromium --with-deps

# Run individual steps
npx tsx index.ts scrape
npx tsx index.ts filter    # Requires GH_TOKEN with models.anthropic.com access
npx tsx index.ts sync      # Requires GH_TOKEN with discussions:write
npx tsx index.ts export
```

## GitHub Actions Workflow

The workflow (`.github/workflows/sync-productboard.yml`) runs automatically on a weekly schedule or can be triggered manually.

### Workflow Inputs (Manual Dispatch)

| Input | Description |
|-------|-------------|
| `dry_run` | Only scrape and filter, skip discussion creation |
| `skip_filter` | Skip AI filtering, sync all high-vote ideas |

### How Updates Are Committed

Because `main` is a protected branch requiring PR reviews and status checks, the workflow **does not push directly**. Instead, it:

1. Creates a feature branch (`chore/productboard-sync-YYYYMMDD`)
2. Commits the updated `state.json` and `data/ideas.json`
3. Opens a PR targeting `main`
4. Enables auto-merge (squash) so the PR merges automatically once CI passes

This ensures all changes go through the standard CI pipeline while remaining fully automated.

## Output Files

### `state.json`

Tracks which ideas have been synced and their discussion URLs:

```json
{
  "syncedIdeas": {
    "idea-123": {
      "discussionUrl": "https://github.com/.../discussions/45",
      "syncedAt": "2024-01-15T09:00:00Z"
    }
  },
  "lastRun": "2024-01-15T09:05:00Z"
}
```

### `data/ideas.json`

Frontend-consumable export with aggregated statistics:

```json
{
  "totalIdeas": 15,
  "lastUpdated": "2024-01-15T09:05:00Z",
  "ideas": [...]
}
```
