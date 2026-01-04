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
  hash: string;
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
  hasChanges: boolean;
}

export interface DocMapping {
  topic: string;
  sourceFiles: string[];
  outputFile: string;
  feature: string;
  userFlow: string;
}

// Content mapping configuration
// outputFile is the destination in docusaurus/docs/ for the public user guide site
export const DOC_MAPPINGS: DocMapping[] = [
  {
    topic: 'recurring-expenses',
    sourceFiles: [
      'frontend/src/components/layout/AppShell.tsx',
      'frontend/src/components/tabs/RecurringTab.tsx',
      'frontend/src/components/RollupZone.tsx',
    ],
    outputFile: 'docusaurus/docs/recurring-expenses.mdx',
    feature: 'recurring',
    userFlow: 'main-dashboard',
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
    outputFile: 'docusaurus/docs/setup-wizard.mdx',
    feature: 'setup',
    userFlow: 'onboarding',
  },
  {
    topic: 'rollup-category',
    sourceFiles: [
      'frontend/src/components/wizards/steps/RollupConfigStep.tsx',
      'frontend/src/components/RollupZone.tsx',
    ],
    outputFile: 'docusaurus/docs/rollup-category.mdx',
    feature: 'recurring',
    userFlow: 'configuration',
  },
  {
    topic: 'category-linking',
    sourceFiles: [
      'frontend/src/components/LinkCategoryModal.tsx',
      'frontend/src/components/wizards/steps/ItemSelectionStep.tsx',
    ],
    outputFile: 'docusaurus/docs/category-linking.mdx',
    feature: 'recurring',
    userFlow: 'configuration',
  },
];
