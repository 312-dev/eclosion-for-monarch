/**
 * Type definitions for the documentation generator
 */

export type ContentType = 'tour' | 'wizard' | 'modal' | 'tooltip' | 'feature';

export interface SourceLocation {
  file: string;
  line: number;
  component: string;
}

export interface ContentData {
  title?: string;
  description?: string;
  steps?: Array<{ title: string; content: string; selector?: string }>;
  sections?: Array<{ heading: string; items: string[] }>;
  rawText?: string;
}

export interface ContentContext {
  feature: string;
  userFlow: string;
  relatedComponents: string[];
}

export interface ExtractedContent {
  id: string;
  type: ContentType;
  source: SourceLocation;
  content: ContentData;
  context: ContentContext;
  hash: string;
}

export interface ManifestEntry {
  /** Hash of source content (to detect when source changes) */
  hash: string;
  /** Hash of the generated doc file (to detect human edits) */
  generatedDocHash?: string;
  lastGenerated: string;
  sourceFiles: string[];
  outputFile: string;
}

export interface Manifest {
  version: string;
  generated: string;
  appVersion: string;
  contents: Record<string, ManifestEntry>;
}

export interface DiffResult {
  added: ExtractedContent[];
  modified: ExtractedContent[];
  unchanged: string[];
  /** Topics where human edited the generated doc - need AI merge */
  humanEdited: string[];
  hasChanges: boolean;
}

export interface DocMapping {
  topic: string;
  sourceFiles: string[];
  outputFile: string;
  feature: string;
  userFlow: string;
  /** Parent feature for hierarchical organization (e.g., 'recurring' for sub-features) */
  parentFeature?: string;
  /** Sidebar position within the parent category */
  sidebarPosition?: number;
}

// Content mapping configuration
// outputFile is the destination in docusaurus/docs/ for the public user guide site
//
// DOCUMENTATION HIERARCHY:
// The docs are organized by feature. Each major feature (like "recurring") gets its own
// folder under docs/. Sub-features are nested within that folder.
//
// Structure:
// - docs/intro.mdx (Getting Started)
// - docs/recurring/ (Recurring Expenses feature)
//   - overview.mdx (main feature overview, sidebar_position: 1)
//   - setup-wizard.mdx (sub-feature, sidebar_position: 2)
//   - rollup-category.mdx (sub-feature, sidebar_position: 3)
//   - category-linking.mdx (sub-feature, sidebar_position: 4)
//
// When adding new features:
// 1. Create a new folder under docs/ (e.g., docs/savings/)
// 2. Add overview.mdx as the main entry point
// 3. Add sub-feature docs with appropriate sidebar positions
// 4. Update sidebars.ts to add the new category
//
export const DOC_MAPPINGS: DocMapping[] = [
  {
    topic: 'recurring-overview',
    sourceFiles: [
      'frontend/src/components/layout/AppShell.tsx',
      'frontend/src/components/tabs/RecurringTab.tsx',
      'frontend/src/components/RollupZone.tsx',
    ],
    outputFile: 'docusaurus/docs/recurring/overview.mdx',
    feature: 'recurring',
    userFlow: 'main-dashboard',
    sidebarPosition: 1,
  },
  {
    topic: 'setup-wizard',
    sourceFiles: [
      'frontend/src/components/wizards/RecurringSetupWizard.tsx',
      'frontend/src/components/wizards/steps/WelcomeStep.tsx',
      'frontend/src/components/wizards/steps/CategoryStep.tsx',
      'frontend/src/components/wizards/steps/ItemSelectionStep.tsx',
      'frontend/src/components/wizards/steps/RollupConfigStep.tsx',
      'frontend/src/components/wizards/steps/FinishStep.tsx',
    ],
    outputFile: 'docusaurus/docs/recurring/setup-wizard.mdx',
    feature: 'recurring',
    userFlow: 'onboarding',
    parentFeature: 'recurring',
    sidebarPosition: 2,
  },
  {
    topic: 'rollup-category',
    sourceFiles: [
      'frontend/src/components/wizards/steps/RollupConfigStep.tsx',
      'frontend/src/components/RollupZone.tsx',
    ],
    outputFile: 'docusaurus/docs/recurring/rollup-category.mdx',
    feature: 'recurring',
    userFlow: 'configuration',
    parentFeature: 'recurring',
    sidebarPosition: 3,
  },
  {
    topic: 'category-linking',
    sourceFiles: [
      'frontend/src/components/LinkCategoryModal.tsx',
      'frontend/src/components/wizards/steps/ItemSelectionStep.tsx',
    ],
    outputFile: 'docusaurus/docs/recurring/category-linking.mdx',
    feature: 'recurring',
    userFlow: 'configuration',
    parentFeature: 'recurring',
    sidebarPosition: 4,
  },
];
