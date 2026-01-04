/**
 * Manifest management - tracks content hashes for diff detection
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Manifest, ManifestEntry, DiffResult, ExtractedContent, DocMapping } from './types.js';
import { generateTopicHash } from './extractor.js';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'docusaurus/docs/_generated/content-manifest.json');

/**
 * Load existing manifest or return empty one
 */
export function loadManifest(): Manifest {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load manifest:', error);
  }

  return {
    version: '1.0.0',
    generated: new Date().toISOString(),
    appVersion: '',
    contents: {},
  };
}

/**
 * Save manifest to disk
 */
export function saveManifest(manifest: Manifest): void {
  const dir = path.dirname(MANIFEST_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  manifest.generated = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Manifest saved to ${MANIFEST_PATH}`);
}

/**
 * Compare extracted content against manifest to find changes
 */
export function detectChanges(
  contentByTopic: Map<string, ExtractedContent[]>,
  mappings: DocMapping[],
  manifest: Manifest
): DiffResult {
  const added: ExtractedContent[] = [];
  const modified: ExtractedContent[] = [];
  const unchanged: string[] = [];

  for (const mapping of mappings) {
    const topicContent = contentByTopic.get(mapping.topic) ?? [];
    const currentHash = generateTopicHash(topicContent);
    const existingEntry = manifest.contents[mapping.topic];

    if (!existingEntry) {
      // New topic
      added.push(...topicContent);
      console.log(`[NEW] ${mapping.topic}`);
    } else if (existingEntry.hash !== currentHash) {
      // Modified topic
      modified.push(...topicContent);
      console.log(`[MODIFIED] ${mapping.topic} (hash changed)`);
    } else {
      // Unchanged
      unchanged.push(mapping.topic);
      console.log(`[UNCHANGED] ${mapping.topic}`);
    }
  }

  return {
    added,
    modified,
    unchanged,
    hasChanges: added.length > 0 || modified.length > 0,
  };
}

/**
 * Update manifest with new content hashes
 */
export function updateManifest(
  manifest: Manifest,
  contentByTopic: Map<string, ExtractedContent[]>,
  mappings: DocMapping[],
  appVersion: string
): Manifest {
  manifest.appVersion = appVersion;

  for (const mapping of mappings) {
    const topicContent = contentByTopic.get(mapping.topic) ?? [];
    const hash = generateTopicHash(topicContent);

    manifest.contents[mapping.topic] = {
      hash,
      lastGenerated: new Date().toISOString(),
      sourceFiles: mapping.sourceFiles,
      outputFile: mapping.outputFile,
    };
  }

  return manifest;
}

/**
 * Get topics that need regeneration
 */
export function getTopicsToRegenerate(
  diffResult: DiffResult,
  mappings: DocMapping[]
): DocMapping[] {
  const changedTopics = new Set<string>();

  for (const content of [...diffResult.added, ...diffResult.modified]) {
    // Find which topic this content belongs to
    for (const mapping of mappings) {
      if (mapping.sourceFiles.some(f => content.source.file.includes(f.replace('frontend/', '')))) {
        changedTopics.add(mapping.topic);
      }
    }
  }

  return mappings.filter(m => changedTopics.has(m.topic));
}
