import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read package.json for version
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// ============================================================================
// Changelog Parser
// ============================================================================

interface ChangelogSection {
  added?: string[];
  changed?: string[];
  deprecated?: string[];
  removed?: string[];
  fixed?: string[];
  security?: string[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  summary?: string;
  sections: ChangelogSection;
}

// Regex patterns for parsing
/* eslint-disable sonarjs/slow-regex -- Safe: operates on single changelog lines, not user input */
const VERSION_PATTERN =
  /^## \[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\](?:\([^)]*\))?\s*[-–]?\s*\(?(\d{4}-\d{2}-\d{2})\)?/;
/* eslint-enable sonarjs/slow-regex */
const UNRELEASED_PATTERN = /^## \[Unreleased\]/i;
const SECTION_PATTERN = /^### (.+)/;
const LIST_ITEM_PATTERN = /^[*-]\s+(.+)/;

// Map conventional commit categories to Keep a Changelog sections
const SECTION_MAP: Record<string, keyof ChangelogSection> = {
  features: 'added',
  added: 'added',
  'bug fixes': 'fixed',
  fixed: 'fixed',
  'code refactoring': 'changed',
  changed: 'changed',
  documentation: 'changed',
  miscellaneous: 'changed',
  deprecated: 'deprecated',
  removed: 'removed',
  security: 'security',
};

function cleanItemText(text: string): string {
  /* eslint-disable sonarjs/slow-regex -- Safe: operates on single changelog lines */
  return text
    .replaceAll(/\s*\(\[[a-f0-9]+\]\([^)]+\)\)$/g, '') // Remove (commit link) at end
    .replaceAll(/\s*\([#\d]+\]\([^)]+\)\)/g, '') // Remove (#123](link))
    .replaceAll(/\s*\(#\d+\)/g, '') // Remove (#123)
    .trim();
  /* eslint-enable sonarjs/slow-regex */
}

function parseVersionLine(line: string): { version: string; date: string } | null {
  const match = VERSION_PATTERN.exec(line);
  return match ? { version: match[1], date: match[2] } : null;
}

function parseSectionLine(line: string): keyof ChangelogSection | null {
  const match = SECTION_PATTERN.exec(line);
  return match ? (SECTION_MAP[match[1].toLowerCase()] ?? null) : null;
}

function parseListItem(line: string): string | null {
  const match = LIST_ITEM_PATTERN.exec(line);
  return match ? cleanItemText(match[1]) : null;
}

interface ParserState {
  entries: ChangelogEntry[];
  currentEntry: ChangelogEntry | null;
  currentSection: keyof ChangelogSection | null;
}

function createInitialState(): ParserState {
  return { entries: [], currentEntry: null, currentSection: null };
}

function finalizeEntry(state: ParserState): void {
  if (state.currentEntry) {
    state.entries.push(state.currentEntry);
  }
}

function handleVersionLine(state: ParserState, line: string): boolean {
  const versionInfo = parseVersionLine(line);
  if (!versionInfo) return false;

  finalizeEntry(state);
  state.currentEntry = { ...versionInfo, sections: {} };
  state.currentSection = null;
  return true;
}

function handleUnreleasedLine(state: ParserState, line: string): boolean {
  if (!UNRELEASED_PATTERN.test(line)) return false;

  finalizeEntry(state);
  state.currentEntry = null;
  state.currentSection = null;
  return true;
}

function handleSummaryLine(state: ParserState, line: string): boolean {
  if (!state.currentEntry || !line.startsWith('> ') || state.currentEntry.summary) return false;

  state.currentEntry.summary = line.slice(2).trim();
  return true;
}

function handleSectionLine(state: ParserState, line: string): boolean {
  const section = parseSectionLine(line);
  if (!section) return false;

  state.currentSection = section;
  return true;
}

function handleListItemLine(state: ParserState, line: string): void {
  if (!state.currentEntry || !state.currentSection) return;

  const itemText = parseListItem(line);
  if (!itemText) return;

  state.currentEntry.sections[state.currentSection] ??= [];
  state.currentEntry.sections[state.currentSection]!.push(itemText);
}

function processLine(state: ParserState, line: string): void {
  if (handleVersionLine(state, line)) return;
  if (handleUnreleasedLine(state, line)) return;
  if (!state.currentEntry) return;
  if (handleSummaryLine(state, line)) return;
  if (handleSectionLine(state, line)) return;
  handleListItemLine(state, line);
}

function parseChangelog(content: string): ChangelogEntry[] {
  const state = createInitialState();

  for (const line of content.split('\n')) {
    processLine(state, line);
  }

  finalizeEntry(state);
  return state.entries;
}

// Parse changelog from repo root
function loadChangelog(): ChangelogEntry[] {
  try {
    const changelogPath = resolve(__dirname, '../CHANGELOG.md');
    const content = readFileSync(changelogPath, 'utf-8');
    return parseChangelog(content);
  } catch {
    return [];
  }
}

const changelog = loadChangelog();

// https://vite.dev/config/
export default defineConfig(() => ({
  // Base path for deployment
  // - '/' for web (Cloudflare Pages with custom domain)
  // - './' for desktop (Electron needs relative paths for file:// protocol)
  base: process.env.VITE_DESKTOP_BUILD === 'true' ? './' : '/',

  // Force single React instance for MDXEditor compatibility with React 19
  // MDXEditor bundles its own React/Lexical which causes duplicate instances
  // See: https://github.com/mdx-editor/editor/issues/494
  resolve: {
    alias: {
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
    },
  },

  plugins: [
    // MDX plugin must come before React plugin
    mdx({
      remarkPlugins: [remarkGfm],
      providerImportSource: '@mdx-js/react',
    }),
    react(),
    tailwindcss(),
  ],
  define: {
    // Use VITE_APP_VERSION from CI for beta builds, otherwise use package.json version
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEMO_MODE__: JSON.stringify(process.env.VITE_DEMO_MODE === 'true'),
    __CHANGELOG__: JSON.stringify(changelog),
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/recurring': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
        // Only proxy API calls (paths with subpaths like /recurring/dashboard)
        // Don't proxy the SPA route /recurring itself
        bypass(req) {
          const path = req.url || '';
          // If path is exactly /recurring or /recurring/, don't proxy (return false to skip)
          if (path === '/recurring' || path === '/recurring/') {
            return req.url; // Return the URL to serve it from Vite instead
          }
        },
      },
      '/health': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/security': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/version': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
