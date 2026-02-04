# Documentation

Docusaurus docs in `docusaurus/`. Auto-generated from TSX via `scripts/docs-gen/`.

## Structure

Each feature gets a folder under `docs/` with `_category_.json`, `overview.mdx` entry point, and sub-feature pages. Update `sidebars.ts` and `scripts/docs-gen/types.ts` DOC_MAPPINGS when adding features.

## Auto-Generation

Generator extracts help from TSX → MDX. Manifest tracks hashes to detect human edits. Human-edited + source-changed docs enter merge mode (AI reconciles). Force regen: `cd scripts/docs-gen && npx tsx index.ts all --force`.

## Components

- `FeatureGrid`/`FeatureCard` — feature highlights with icons
- `WorkflowSteps` — step-by-step instructions
- `AnnotatedImage` — screenshots with numbered callouts

## Versioning

Stable (eclosion.app): versioned snapshots via `npm run docusaurus docs:version X.Y`. Beta (beta.eclosion.app): current docs only, version from `ECLOSION_VERSION` env var, no dropdown.
