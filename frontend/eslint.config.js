import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sonarjs from 'eslint-plugin-sonarjs'
import tailwindCanonicalClasses from 'eslint-plugin-tailwind-canonical-classes'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      sonarjs.configs.recommended,
    ],
    plugins: {
      'tailwind-canonical-classes': tailwindCanonicalClasses,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Tailwind - enforce canonical class names (e.g., min-w-[140px] -> min-w-35)
      'tailwind-canonical-classes/tailwind-canonical-classes': ['warn', {
        cssPath: './src/index.css',
      }],
      // Allow underscore-prefixed variables to indicate intentionally unused
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Disable Fast Refresh warnings - dev-only, doesn't affect production
      'react-refresh/only-export-components': 'off',
      // Disable undefined jsx-a11y rules (plugin not installed)
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      // Warn on files exceeding 300 lines (per CLAUDE.md component size standard)
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],

      // SonarJS rules - set as warnings to allow gradual adoption
      // Code quality (warn - fix when touching these files)
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/no-unused-vars': 'off', // Already covered by @typescript-eslint/no-unused-vars
      'sonarjs/no-nested-functions': 'off', // Common pattern in React components and tests
      'sonarjs/todo-tag': 'warn', // TODOs are normal, warn but don't block
      'sonarjs/redundant-type-aliases': 'warn', // Minor code style
      'sonarjs/single-char-in-character-classes': 'warn', // Minor regex style
      'sonarjs/concise-regex': 'warn', // Minor regex style (e.g., [0-9] -> \d)
      'sonarjs/no-all-duplicated-branches': 'warn', // Code cleanup item
      'sonarjs/no-invariant-returns': 'warn', // Code cleanup item

      // Security (warn - should be fixed, tracked in backlog)
      'sonarjs/slow-regex': 'warn', // ReDoS vulnerability - fix when touching these files

      // False positives for demo/mock data (disable)
      'sonarjs/no-hardcoded-ip': 'off', // Demo data contains fake IPs
      'sonarjs/pseudo-random': 'off', // Used for animations and demo data, not security
    },
  },
])
