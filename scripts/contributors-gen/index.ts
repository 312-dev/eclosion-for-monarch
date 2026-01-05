#!/usr/bin/env node
/**
 * Contributor Attribution Generator CLI
 *
 * Generates contributor data from GitHub for feature attribution.
 *
 * Usage:
 *   GITHUB_TOKEN=xxx npx tsx index.ts
 *
 * Environment variables:
 *   GITHUB_TOKEN - Required for GitHub API access (to avoid rate limits)
 */

import { generateContributorsData, writeContributorsData } from './generator.js';

async function main() {
  console.log('='.repeat(60));
  console.log('Contributor Attribution Generator');
  console.log('='.repeat(60));

  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      '\nWarning: GITHUB_TOKEN not set. API rate limits may apply.\n' +
        'Set GITHUB_TOKEN environment variable for better results.\n'
    );
  }

  try {
    const data = await generateContributorsData();

    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));

    const featureIds = Object.keys(data.features);
    console.log(`Features processed: ${featureIds.length}`);

    for (const featureId of featureIds) {
      const feature = data.features[featureId];
      const ideatorStr = feature.ideator
        ? `@${feature.ideator.username}`
        : 'none';
      const contributorCount = feature.contributors.length;
      console.log(
        `  ${featureId}: ideator=${ideatorStr}, contributors=${contributorCount}`
      );
    }

    writeContributorsData(data);

    console.log('\nDone!');
  } catch (error) {
    console.error('Failed to generate contributor data:', error);
    process.exit(1);
  }
}

main();
