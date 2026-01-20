# Documentation Structure

User-facing documentation is built with Docusaurus in `docusaurus/`. Docs are auto-generated from in-app help content via `scripts/docs-gen/`.

## Hierarchy

Eclosion is a **toolkit** with multiple **features**:

```
docs/
├── intro.mdx              # Getting Started
└── recurring/             # Feature: Recurring Expenses
    ├── _category_.json    # Category metadata
    ├── overview.mdx       # Main overview (position 1)
    ├── setup-wizard.mdx   # Sub-feature (position 2)
    └── rollup-category.mdx
```

## Adding New Features

1. Create folder: `docs/{feature-name}/`
2. Add `_category_.json` with label and position
3. Add `overview.mdx` as entry point
4. Add sub-feature pages with `sidebar_position`
5. Update `sidebars.ts`
6. Update `scripts/docs-gen/types.ts` DOC_MAPPINGS if auto-generating

## Auto-Generated Documentation

The docs generator (`scripts/docs-gen/`) extracts help content from TSX and generates MDX.

**Key files:**
- `scripts/docs-gen/types.ts` - DOC_MAPPINGS defines source files and outputs
- `scripts/docs-gen/generator.ts` - AI prompt and generation
- `scripts/docs-gen/manifest.ts` - Tracks changes, detects human edits

**Human Edit Handling:**
| Scenario | Behavior |
|----------|----------|
| New doc | Generate fresh |
| Source changed, doc untouched | Regenerate |
| Human edited, source unchanged | Skip (preserves edits) |
| Human edited + source changed | Merge mode (AI reconciles) |

**Force regeneration:**
```bash
cd scripts/docs-gen && npx tsx index.ts all --force
```

## Documentation Components

**FeatureGrid + FeatureCard:**
```mdx
import { FeatureCard, FeatureGrid } from '@site/src/components/FeatureCard';
<FeatureGrid>
  <FeatureCard icon={<Package size={24} />} title="Title" description="Description" />
</FeatureGrid>
```

**WorkflowSteps:**
```mdx
import { WorkflowSteps } from '@site/src/components/WorkflowSteps';
<WorkflowSteps title="Steps" steps={[{ title: "Step 1", description: "..." }]} />
```

**AnnotatedImage:**
```mdx
import { AnnotatedImage } from '@site/src/components/AnnotatedImage';
<AnnotatedImage src="/img/screenshot.png" alt="Screenshot" callouts={[{ x: 20, y: 15, label: "1", description: "..." }]} />
```

## Versioning

| Site | Versions | Dropdown |
|------|----------|----------|
| Stable (eclosion.app) | Versioned snapshots | Yes |
| Beta (beta.eclosion.app) | Current docs only | No |

Create version snapshot: `cd docusaurus && npm run docusaurus docs:version X.Y`
