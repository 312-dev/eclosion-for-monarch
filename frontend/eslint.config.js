import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sonarjs from 'eslint-plugin-sonarjs'
import tailwindCanonicalClasses from 'eslint-plugin-tailwind-canonical-classes'
import unicorn from 'eslint-plugin-unicorn'
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
      'jsx-a11y': jsxA11y,
      'tailwind-canonical-classes': tailwindCanonicalClasses,
      unicorn,
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
      'sonarjs/prefer-read-only-props': 'warn', // Mark component props as readonly

      // Security (warn - should be fixed, tracked in backlog)
      'sonarjs/slow-regex': 'warn', // ReDoS vulnerability - fix when touching these files

      // False positives for demo/mock data (disable)
      'sonarjs/no-hardcoded-ip': 'off', // Demo data contains fake IPs
      'sonarjs/pseudo-random': 'off', // Used for animations and demo data, not security

      // Unicorn rules - modern JavaScript patterns (warn for gradual adoption)
      'unicorn/prefer-global-this': 'warn', // globalThis over window
      'unicorn/prefer-code-point': 'warn', // codePointAt() over charCodeAt()
      'unicorn/prefer-string-replace-all': 'warn', // replaceAll() over replace() with /g
      'unicorn/prefer-number-properties': 'warn', // Number.parseInt, Number.isNaN, etc.
      'unicorn/prefer-at': 'warn', // .at(-1) over [arr.length - 1]
      'unicorn/prefer-export-from': 'warn', // export { x } from 'y' over import+export
      'unicorn/prefer-logical-operator-over-ternary': 'warn', // a ?? b over a ? a : b
      'unicorn/no-negated-condition': 'warn', // Avoid negated conditions
      // Disabled unicorn rules (too noisy or conflicts)
      'unicorn/filename-case': 'off', // Project uses PascalCase for components
      'unicorn/prevent-abbreviations': 'off', // Would require massive renames
      'unicorn/no-null': 'off', // null is used intentionally in many places
      'unicorn/no-array-callback-reference': 'off', // Common React pattern
      'unicorn/no-useless-undefined': 'off', // TypeScript sometimes requires explicit undefined

      // JSX Accessibility rules (warn for gradual adoption)
      'jsx-a11y/prefer-tag-over-role': 'warn', // <article> over role="article"
      'jsx-a11y/no-static-element-interactions': 'warn', // Require handlers on interactive elements
      'jsx-a11y/click-events-have-key-events': 'warn', // onClick needs onKeyDown
      'jsx-a11y/no-noninteractive-element-interactions': 'warn', // Non-interactive shouldn't have handlers
      'jsx-a11y/anchor-is-valid': 'warn', // Anchors need href or button
    },
  },

  // Custom widget components that legitimately need ARIA roles
  // Native HTML elements cannot provide the required UX (styling, grouping, search)
  {
    files: [
      '**/SearchableSelect.tsx', // Custom dropdown: role="listbox" (native select can't search/group)
      '**/EmojiPicker.tsx', // Custom picker: role="dialog" (no native emoji picker)
      '**/CategoryGroupDropdown.tsx', // Custom dropdown: role="listbox" (native select can't group visually)
      '**/ProgressBar.tsx', // Custom progress: role="progressbar" (native progress unstyled)
      '**/DesktopUpdateBanner.tsx', // Status + progress indicators
      '**/StabilizationTimeline.tsx', // Popover: role="dialog"
      '**/StaleWarningPopover.tsx', // Popover: role="dialog"
      '**/MonthPicker.tsx', // Picker: role="dialog"
      '**/MerchantIcon.tsx', // Image with fallback handlers
      '**/ReadyToAssign.tsx', // Custom progress indicator
    ],
    rules: {
      'jsx-a11y/prefer-tag-over-role': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },

  // Collapsible/expandable containers with nested interactive elements
  // Using role="button" on container avoids nested button issues while maintaining a11y
  {
    files: [
      '**/RollupZone.tsx', // Collapsible header with nested buttons
      '**/RollupStats.tsx', // Budget input container (stops propagation)
      '**/RecurringItemHeader.tsx', // Double-click to edit name
      '**/RollupNameEditor.tsx', // Double-click to edit rollup name
    ],
    rules: {
      'jsx-a11y/prefer-tag-over-role': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
    },
  },

  // Modal components - backdrop click-to-close is a standard pattern
  // The backdrop div needs onClick but doesn't need keyboard handler (Escape key handled separately)
  {
    files: ['**/*Modal.tsx', '**/*Overlay.tsx'],
    rules: {
      'jsx-a11y/prefer-tag-over-role': 'off', // Modals use role="dialog"
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
    },
  },

  // Chart components - complex mouse interactions for tooltips/zoom
  {
    files: ['**/charts/*.tsx'],
    rules: {
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },

  // Marketing/landing pages - interactive demos and animations
  {
    files: ['**/marketing/**/*.tsx', '**/pages/LandingPage.tsx'],
    rules: {
      'jsx-a11y/prefer-tag-over-role': 'off', // Demo components use semantic roles
      'jsx-a11y/no-static-element-interactions': 'off', // Interactive demos
    },
  },

  // Notes editor - click-to-edit patterns
  {
    files: ['**/notes/*.tsx'],
    rules: {
      'jsx-a11y/no-static-element-interactions': 'off', // Click to edit
    },
  },

  // Wizard components - selectable cards
  {
    files: ['**/wizards/**/*.tsx'],
    rules: {
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },

  // Test files - testing ARIA patterns intentionally
  {
    files: ['**/*.test.tsx'],
    rules: {
      'jsx-a11y/prefer-tag-over-role': 'off',
    },
  },
])
