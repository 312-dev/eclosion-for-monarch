#!/usr/bin/env tsx
/**
 * Documentation Generator CLI
 *
 * Commands:
 *   extract        - Extract content from source files
 *   diff           - Detect changes compared to manifest
 *   generate       - Generate documentation for changed content
 *   update-manifest - Update manifest with current hashes
 *   all            - Run all steps (extract, diff, generate, update-manifest)
 *
 * Flags:
 *   --force        - Force regeneration of all docs, ignoring manifest
 */

import { extractAllContent, generateTopicHash } from './extractor.js';
import { loadManifest, saveManifest, detectChanges, updateManifest, getTopicsToRegenerate } from './manifest.js';
import { generateDocs } from './generator.js';
import { writeAllDocs, createGuidesCategory, ensureGeneratedDir } from './mdx-builder.js';
import { DOC_MAPPINGS } from './types.js';

import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');

// Get app version from environment or package.json
function getAppVersion(): string {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }

  try {
    const pkgPath = path.join(PROJECT_ROOT, 'frontend/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

async function runExtract(): Promise<Map<string, import('./types.js').ExtractedContent[]>> {
  console.log('\n📦 Extracting content from source files...\n');
  const contentByTopic = extractAllContent(DOC_MAPPINGS);

  for (const [topic, contents] of contentByTopic) {
    console.log(`  ${topic}: ${contents.length} items extracted`);
  }

  return contentByTopic;
}

async function runDiff(contentByTopic: Map<string, import('./types.js').ExtractedContent[]>): Promise<import('./types.js').DiffResult> {
  console.log('\n🔍 Detecting changes...\n');
  const manifest = loadManifest();
  const diffResult = detectChanges(contentByTopic, DOC_MAPPINGS, manifest);

  console.log(`\nSummary:`);
  console.log(`  Added: ${diffResult.added.length} items`);
  console.log(`  Modified: ${diffResult.modified.length} items`);
  console.log(`  Unchanged: ${diffResult.unchanged.length} topics`);
  console.log(`  Has Changes: ${diffResult.hasChanges}`);

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('fs');
    appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${diffResult.hasChanges}\n`);
  }

  return diffResult;
}

async function runGenerate(
  contentByTopic: Map<string, import('./types.js').ExtractedContent[]>,
  diffResult: import('./types.js').DiffResult
): Promise<void> {
  console.log('\n🤖 Generating documentation with AI...\n');

  // Ensure directories exist
  ensureGeneratedDir();
  createGuidesCategory();

  // Get topics that need regeneration
  const topicsToRegenerate = getTopicsToRegenerate(diffResult, DOC_MAPPINGS);

  if (topicsToRegenerate.length === 0) {
    console.log('No topics need regeneration.');
    return;
  }

  console.log(`Regenerating ${topicsToRegenerate.length} topics:`);
  for (const mapping of topicsToRegenerate) {
    console.log(`  - ${mapping.topic}`);
  }

  // Generate docs
  const docs = await generateDocs(contentByTopic, topicsToRegenerate);

  // Write to disk
  console.log('\n📝 Writing MDX files...\n');
  writeAllDocs(docs, topicsToRegenerate);

  console.log(`\n✅ Generated ${docs.length} documentation files`);
}

async function runUpdateManifest(
  contentByTopic: Map<string, import('./types.js').ExtractedContent[]>
): Promise<void> {
  console.log('\n📋 Updating manifest...\n');
  const appVersion = await getAppVersion();
  const manifest = loadManifest();
  const updated = updateManifest(manifest, contentByTopic, DOC_MAPPINGS, appVersion);
  saveManifest(updated);
}

async function main() {
  const command = process.argv[2] || 'all';

  console.log('='.repeat(50));
  console.log('📚 Eclosion Documentation Generator');
  console.log('='.repeat(50));

  try {
    switch (command) {
      case 'extract': {
        await runExtract();
        break;
      }

      case 'diff': {
        const content = await runExtract();
        await runDiff(content);
        break;
      }

      case 'generate': {
        const content = await runExtract();
        const diff = await runDiff(content);
        if (diff.hasChanges) {
          await runGenerate(content, diff);
        } else {
          console.log('\n✅ No changes detected, skipping generation');
        }
        break;
      }

      case 'update-manifest': {
        const content = await runExtract();
        await runUpdateManifest(content);
        break;
      }

      case 'all': {
        const content = await runExtract();
        const diff = await runDiff(content);
        if (diff.hasChanges) {
          await runGenerate(content, diff);
          await runUpdateManifest(content);
        } else {
          console.log('\n✅ No changes detected');
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log('\nUsage: tsx index.ts <command>');
        console.log('Commands: extract, diff, generate, update-manifest, all');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
