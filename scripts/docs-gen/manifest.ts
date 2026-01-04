/**
 * Manifest management - tracks content hashes for diff detection
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { Manifest, ManifestEntry, DiffResult, ExtractedContent, DocMapping } from './types.js';
import { generateTopicHash } from './extractor.js';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'docusaurus/docs/_generated/content-manifest.json');

/**
 * Compute SHA256 hash of a file on disk
 */
export function hashFile(filePath: string): string | null {
  try {
    const absolutePath = path.join(PROJECT_ROOT, filePath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    const content = fs.readFileSync(absolutePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Read file content from disk
 */
export function readDocFile(filePath: string): string | null {
  try {
    const absolutePath = path.join(PROJECT_ROOT, filePath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    return fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    return null;
  }
}

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
  const humanEdited: string[] = [];

  for (const mapping of mappings) {
    const topicContent = contentByTopic.get(mapping.topic) ?? [];
    const currentSourceHash = generateTopicHash(topicContent);
    const existingEntry = manifest.contents[mapping.topic];

    // Check if human edited the doc file
    const currentDocHash = hashFile(mapping.outputFile);
    const wasHumanEdited = existingEntry?.generatedDocHash &&
      currentDocHash &&
      existingEntry.generatedDocHash !== currentDocHash;

    if (!existingEntry) {
      // New topic - generate fresh
      added.push(...topicContent);
      console.log(`[NEW] ${mapping.topic}`);
    } else if (wasHumanEdited && existingEntry.hash !== currentSourceHash) {
      // Source changed AND human edited - need AI merge
      humanEdited.push(mapping.topic);
      modified.push(...topicContent);
      console.log(`[MERGE NEEDED] ${mapping.topic} (source changed + human edits detected)`);
    } else if (wasHumanEdited) {
      // Human edited but source unchanged - skip regeneration
      unchanged.push(mapping.topic);
      console.log(`[HUMAN EDITED] ${mapping.topic} (skipping - human edits preserved)`);
    } else if (existingEntry.hash !== currentSourceHash) {
      // Source changed, no human edits - regenerate fresh
      modified.push(...topicContent);
      console.log(`[MODIFIED] ${mapping.topic} (source changed)`);
    } else {
      // Nothing changed
      unchanged.push(mapping.topic);
      console.log(`[UNCHANGED] ${mapping.topic}`);
    }
  }

  return {
    added,
    modified,
    unchanged,
    humanEdited,
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
  appVersion: string,
  generatedTopics?: string[]
): Manifest {
  manifest.appVersion = appVersion;

  for (const mapping of mappings) {
    const topicContent = contentByTopic.get(mapping.topic) ?? [];
    const sourceHash = generateTopicHash(topicContent);

    // Only update generatedDocHash if we actually generated this topic
    const wasGenerated = !generatedTopics || generatedTopics.includes(mapping.topic);
    const generatedDocHash = wasGenerated ? hashFile(mapping.outputFile) : manifest.contents[mapping.topic]?.generatedDocHash;

    manifest.contents[mapping.topic] = {
      hash: sourceHash,
      generatedDocHash: generatedDocHash ?? undefined,
      lastGenerated: wasGenerated ? new Date().toISOString() : manifest.contents[mapping.topic]?.lastGenerated ?? new Date().toISOString(),
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
