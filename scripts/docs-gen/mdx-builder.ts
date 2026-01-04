/**
 * MDX Builder - Writes generated documentation to MDX files
 *
 * Outputs to two locations:
 * 1. frontend/src/docs/guide/ - Bundled in the frontend app
 * 2. docusaurus/guide/ - Public docs site
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DocMapping } from './types.js';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const FRONTEND_GUIDE_DIR = 'frontend/src/docs/guide';
const DOCUSAURUS_GUIDE_DIR = 'docusaurus/guide';

interface GeneratedDoc {
  topic: string;
  frontmatter: {
    title: string;
    description: string;
    sidebar_position: number;
  };
  content: string;
}

/**
 * Build complete MDX file content
 */
function buildMdxFile(doc: GeneratedDoc): string {
  const frontmatter = `---
title: ${doc.frontmatter.title}
description: ${doc.frontmatter.description}
sidebar_position: ${doc.frontmatter.sidebar_position}
---`;

  return `${frontmatter}

${doc.content}
`;
}

/**
 * Write a single MDX file to both frontend and docusaurus locations
 */
export function writeMdxFile(doc: GeneratedDoc, mapping: DocMapping): void {
  const content = buildMdxFile(doc);
  const filename = path.basename(mapping.outputFile);

  // Write to frontend bundle location (primary)
  const frontendPath = path.join(PROJECT_ROOT, mapping.outputFile);
  const frontendDir = path.dirname(frontendPath);
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  fs.writeFileSync(frontendPath, content, 'utf-8');
  console.log(`  Written: ${mapping.outputFile}`);

  // Also copy to docusaurus location
  const docusaurusPath = path.join(PROJECT_ROOT, DOCUSAURUS_GUIDE_DIR, filename);
  const docusaurusDir = path.dirname(docusaurusPath);
  if (!fs.existsSync(docusaurusDir)) {
    fs.mkdirSync(docusaurusDir, { recursive: true });
  }
  fs.writeFileSync(docusaurusPath, content, 'utf-8');
  console.log(`  Copied to: ${DOCUSAURUS_GUIDE_DIR}/${filename}`);
}

/**
 * Write all generated docs
 */
export function writeAllDocs(
  docs: GeneratedDoc[],
  mappings: DocMapping[]
): void {
  for (const doc of docs) {
    const mapping = mappings.find(m => m.topic === doc.topic);
    if (mapping) {
      writeMdxFile(doc, mapping);
    }
  }
}

/**
 * Create guides category file for Docusaurus
 */
export function createGuidesCategory(): void {
  const categoryPath = path.join(PROJECT_ROOT, DOCUSAURUS_GUIDE_DIR, '_category_.json');
  const dir = path.dirname(categoryPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const category = {
    label: 'User Guides',
    position: 2,
    collapsible: true,
    collapsed: false,
    link: {
      type: 'generated-index',
      title: 'User Guides',
      description: 'Learn how to use Eclosion features',
    },
  };

  fs.writeFileSync(categoryPath, JSON.stringify(category, null, 2), 'utf-8');
  console.log('Created guides category file');
}

/**
 * Ensure output directories exist
 */
export function ensureGeneratedDir(): void {
  // Frontend guide directory
  const frontendGuideDir = path.join(PROJECT_ROOT, FRONTEND_GUIDE_DIR);
  if (!fs.existsSync(frontendGuideDir)) {
    fs.mkdirSync(frontendGuideDir, { recursive: true });
  }

  // Docusaurus guide directory
  const docusaurusGuideDir = path.join(PROJECT_ROOT, DOCUSAURUS_GUIDE_DIR);
  if (!fs.existsSync(docusaurusGuideDir)) {
    fs.mkdirSync(docusaurusGuideDir, { recursive: true });
  }
}
