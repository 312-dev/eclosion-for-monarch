/**
 * Build script for the Electron main process
 *
 * Uses esbuild to bundle the main and preload scripts with all dependencies,
 * ensuring the packaged app doesn't need node_modules.
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('node:fs');

const isWatch = process.argv.includes('--watch');

// Read version from package.json as fallback
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
const appVersion = process.env.ECLOSION_VERSION || pkg.version;

/** @type {import('esbuild').BuildOptions} */
const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: true,
  external: ['electron'],
  logLevel: 'info',
  // Ensure electron is properly externalized and not bundled
  // Inject build-time constants for version and channel
  define: {
    'process.env.NODE_ENV': '"production"',
    '__APP_VERSION__': JSON.stringify(appVersion),
    '__RELEASE_CHANNEL__': JSON.stringify(process.env.RELEASE_CHANNEL || 'dev'),
  },
  // Keep require() calls as-is for external modules
  mainFields: ['main', 'module'],
};

async function build() {
  // Build main process
  const mainContext = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.resolve(__dirname, '../src/main/index.ts')],
    outfile: path.resolve(__dirname, '../dist/main/index.js'),
  });

  // Build preload script
  const preloadContext = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.resolve(__dirname, '../src/preload/index.ts')],
    outfile: path.resolve(__dirname, '../dist/preload/index.js'),
  });

  if (isWatch) {
    console.log('Watching for changes...');
    await Promise.all([
      mainContext.watch(),
      preloadContext.watch(),
    ]);
  } else {
    await Promise.all([
      mainContext.rebuild(),
      preloadContext.rebuild(),
    ]);
    await Promise.all([
      mainContext.dispose(),
      preloadContext.dispose(),
    ]);
    console.log('Build complete');
  }
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
