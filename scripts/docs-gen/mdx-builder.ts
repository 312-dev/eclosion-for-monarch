/**
 * MDX Builder - Writes generated documentation to MDX files
 *
 * Outputs to Docusaurus docs directory for the public user guide site
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DocMapping } from './types.js';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const DOCUSAURUS_DOCS_DIR = 'docusaurus/docs';

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
 * Write a single MDX file to Docusaurus docs directory
 */
export function writeMdxFile(doc: GeneratedDoc, mapping: DocMapping): void {
  const content = buildMdxFile(doc);
  const filename = path.basename(mapping.outputFile);

  // Write to Docusaurus docs directory
  const docusaurusPath = path.join(PROJECT_ROOT, DOCUSAURUS_DOCS_DIR, filename);
  const docusaurusDir = path.dirname(docusaurusPath);
  if (!fs.existsSync(docusaurusDir)) {
    fs.mkdirSync(docusaurusDir, { recursive: true });
  }
  fs.writeFileSync(docusaurusPath, content, 'utf-8');
  console.log(`  Written: ${DOCUSAURUS_DOCS_DIR}/${filename}`);
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
  const categoryPath = path.join(PROJECT_ROOT, DOCUSAURUS_DOCS_DIR, '_category_.json');
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
 * Ensure output directory exists
 */
export function ensureGeneratedDir(): void {
  const docusaurusDocsDir = path.join(PROJECT_ROOT, DOCUSAURUS_DOCS_DIR);
  if (!fs.existsSync(docusaurusDocsDir)) {
    fs.mkdirSync(docusaurusDocsDir, { recursive: true });
  }
}
