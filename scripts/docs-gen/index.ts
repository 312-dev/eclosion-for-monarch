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

import { extractAllContent } from './extractor.js';
import { loadManifest, saveManifest, detectChanges, updateManifest, getTopicsToRegenerate, readDocFile } from './manifest.js';
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
): Promise<string[]> {
  console.log('\n🤖 Generating documentation with AI...\n');

  // Ensure directories exist
  ensureGeneratedDir();
  createGuidesCategory();

  // Get topics that need regeneration
  const topicsToRegenerate = getTopicsToRegenerate(diffResult, DOC_MAPPINGS);

  if (topicsToRegenerate.length === 0) {
    console.log('No topics need regeneration.');
    return [];
  }

  console.log(`Regenerating ${topicsToRegenerate.length} topics:`);
  for (const mapping of topicsToRegenerate) {
    const isMerge = diffResult.humanEdited.includes(mapping.topic);
    console.log(`  - ${mapping.topic}${isMerge ? ' (merge mode)' : ''}`);
  }

  // Build merge topics map for human-edited docs
  const mergeTopics = new Map<string, string>();
  for (const topic of diffResult.humanEdited) {
    const mapping = DOC_MAPPINGS.find(m => m.topic === topic);
    if (mapping) {
      const currentDoc = readDocFile(mapping.outputFile);
      if (currentDoc) {
        mergeTopics.set(topic, currentDoc);
      }
    }
  }

  if (mergeTopics.size > 0) {
    console.log(`\n📎 ${mergeTopics.size} topic(s) will use merge mode to preserve human edits`);
  }

  // Generate docs (with merge mode where needed)
  const docs = await generateDocs(contentByTopic, topicsToRegenerate, mergeTopics);

  // Write to disk
  console.log('\n📝 Writing MDX files...\n');
  writeAllDocs(docs, topicsToRegenerate);

  console.log(`\n✅ Generated ${docs.length} documentation files`);

  // Return list of generated topics for manifest update
  return docs.map(d => d.topic);
}

async function runUpdateManifest(
  contentByTopic: Map<string, import('./types.js').ExtractedContent[]>,
  generatedTopics?: string[]
): Promise<void> {
  console.log('\n📋 Updating manifest...\n');
  const appVersion = getAppVersion();
  const manifest = loadManifest();
  const updated = updateManifest(manifest, contentByTopic, DOC_MAPPINGS, appVersion, generatedTopics);
  saveManifest(updated);
}

async function runForceGenerate(
  contentByTopic: Map<string, import('./types.js').ExtractedContent[]>
): Promise<void> {
  console.log('\n🤖 Force generating all documentation...\n');
  ensureGeneratedDir();
  createGuidesCategory();
  const docs = await generateDocs(contentByTopic, DOC_MAPPINGS);
  console.log('\n📝 Writing MDX files...\n');
  writeAllDocs(docs, DOC_MAPPINGS);
  console.log(`\n✅ Generated ${docs.length} documentation files`);
}

async function main() {
  const args = process.argv.slice(2);
  const forceFlag = args.includes('--force');
  const command = args.find(arg => !arg.startsWith('--')) || 'all';

  console.log('='.repeat(50));
  console.log('📚 Eclosion Documentation Generator');
  if (forceFlag) {
    console.log('⚡ Force mode: regenerating all docs');
  }
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
        if (forceFlag) {
          await runForceGenerate(content);
        } else {
          const diff = await runDiff(content);
          if (diff.hasChanges) {
            await runGenerate(content, diff);
          } else {
            console.log('\n✅ No changes detected, skipping generation');
          }
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
        if (forceFlag) {
          await runForceGenerate(content);
          await runUpdateManifest(content, DOC_MAPPINGS.map(m => m.topic));
        } else {
          const diff = await runDiff(content);
          if (diff.hasChanges) {
            const generatedTopics = await runGenerate(content, diff);
            await runUpdateManifest(content, generatedTopics);
          } else {
            console.log('\n✅ No changes detected');
          }
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log('\nUsage: tsx index.ts <command> [--force]');
        console.log('Commands: extract, diff, generate, update-manifest, all');
        console.log('Flags: --force (regenerate all docs, ignoring manifest)');
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
