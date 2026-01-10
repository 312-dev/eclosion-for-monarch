#!/usr/bin/env tsx
/**
 * Screenshot Generator CLI
 *
 * Generates screenshots of the Eclosion app with macOS window chrome
 * for use in README and marketing materials.
 *
 * Usage:
 *   npm run generate -- --url=http://localhost:4173
 *   npm run generate:local  (builds and serves frontend automatically)
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { captureScreenshots } from './capture.js';
import { addMacOSFrame } from './frame.js';
import { OUTPUT_DIR, DEFAULT_BASE_URL } from './config.js';

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..');
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');

interface ServerHandle {
  url: string;
  cleanup: () => void;
}

/**
 * Build the frontend in demo mode
 */
async function buildFrontend(): Promise<void> {
  console.log('Building frontend in demo mode...');

  return new Promise((resolve, reject) => {
    const proc = spawn('npm', ['run', 'build'], {
      cwd: FRONTEND_DIR,
      env: {
        ...process.env,
        VITE_DEMO_MODE: 'true',
      },
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Start the Vite preview server
 */
async function startPreviewServer(): Promise<ServerHandle> {
  console.log('Starting preview server...');

  return new Promise((resolve, reject) => {
    const proc: ChildProcess = spawn('npm', ['run', 'preview'], {
      cwd: FRONTEND_DIR,
      env: {
        ...process.env,
        VITE_DEMO_MODE: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        proc.kill();
        reject(new Error('Server start timeout (30s)'));
      }
    }, 30000);

    proc.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      // Look for the local URL in Vite's output
      const match = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        const url = match[1];
        console.log(`  Server running at ${url}`);
        resolve({
          url,
          cleanup: () => {
            proc.kill();
          },
        });
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      // Log errors but don't fail - some warnings are normal
      const msg = data.toString().trim();
      if (msg && !msg.includes('ExperimentalWarning')) {
        console.error(`  [server] ${msg}`);
      }
    });

    proc.on('error', (err) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

/**
 * Parse CLI arguments
 */
function parseArgs(): { url?: string; local: boolean } {
  const args = process.argv.slice(2);
  let url: string | undefined;
  let local = false;

  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      url = arg.slice(6);
    } else if (arg === '--local') {
      local = true;
    }
  }

  return { url, local };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Screenshot Generator');
  console.log('='.repeat(50));

  const { url, local } = parseArgs();

  // Ensure output directory exists
  const outputDir = path.join(SCRIPT_DIR, OUTPUT_DIR);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let serverUrl = url ?? DEFAULT_BASE_URL;
  let cleanup: (() => void) | undefined;

  try {
    // For local mode, build and start the server
    if (local && !url) {
      await buildFrontend();
      const server = await startPreviewServer();
      serverUrl = server.url;
      cleanup = server.cleanup;

      // Give server a moment to fully initialize
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Capture screenshots
    console.log(`\nCapturing screenshots from ${serverUrl}...`);
    const screenshots = await captureScreenshots(serverUrl);

    if (screenshots.size === 0) {
      throw new Error('No screenshots were captured');
    }

    // Add macOS frame and save
    console.log('Adding macOS window frame...');
    for (const [filename, buffer] of screenshots) {
      console.log(`  Processing: ${filename}`);
      const framed = await addMacOSFrame(buffer);
      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, framed);
      console.log(`    -> Saved: ${outputPath}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Generated ${screenshots.size} screenshots to ${outputDir}/`);
    console.log('='.repeat(50));

  } finally {
    cleanup?.();
  }
}

// Run
main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
