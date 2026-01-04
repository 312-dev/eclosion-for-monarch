import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';
import * as fs from 'fs';
import * as path from 'path';

// Load versions dynamically and filter based on site type (beta vs stable)
const isBetaSite = process.env.ECLOSION_BETA === 'true';
const allVersions: string[] = fs.existsSync(path.join(__dirname, 'versions.json'))
  ? JSON.parse(fs.readFileSync(path.join(__dirname, 'versions.json'), 'utf-8'))
  : [];

// Stable versions are simple semver (e.g., 1.0, 1.1)
const stableVersions = allVersions.filter(v => !v.includes('beta'));

// Beta versions contain 'beta' in the name
// Pre-release versions: 1.1.0-beta.1 (ends with number)
// Develop push versions: 1.0.0-beta.abc1234 (ends with 7-char SHA)
const betaVersions = allVersions.filter(v => v.includes('beta'));
const preReleaseVersions = betaVersions.filter(v => /beta\.\d+$/.test(v));
const developPushVersions = betaVersions.filter(v => /beta\.[a-f0-9]{7}$/.test(v));

// Determine which versions to include
const includedVersions = isBetaSite
  ? ['current', ...betaVersions]  // Beta site: Unreleased + all beta versions
  : stableVersions;               // Stable site: Only stable versions

// Determine default version for beta site:
// 1. Latest pre-release (e.g., 1.1.0-beta.1)
// 2. Fall back to latest develop push if no pre-releases
// 3. Fall back to 'current' if neither exist
const lastVersion = isBetaSite
  ? (preReleaseVersions[0] || developPushVersions[0] || 'current')
  : (stableVersions[0] || 'current');

const config: Config = {
  title: 'Eclosion',
  tagline: 'An evolving toolkit for Monarch Money',
  favicon: 'img/favicon.ico',

  url: 'https://eclosion.app',
  baseUrl: '/',

  organizationName: 'GraysonCAdams',
  projectName: 'eclosion-for-monarch',

  // Links to / and /demo are served by the main React app, not Docusaurus
  // These are valid at runtime but unknown to Docusaurus during build
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        // User guides at /docs
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/GraysonCAdams/eclosion-for-monarch/tree/main/docusaurus/',
          showLastUpdateTime: true,
          // Versioning - dynamically loaded from versions.json
          // Beta site: Shows 'Unreleased' + all beta versions
          // Stable site: Shows only stable versions (1.0, 1.1, etc.)
          lastVersion,
          onlyIncludeVersions: includedVersions,
          versions: {
            current: {
              label: 'Unreleased',
              path: 'next',
              banner: 'unreleased',
            },
            // Stable versions get clean labels
            ...Object.fromEntries(
              stableVersions.map(v => [v, { label: v, banner: 'none' as const }])
            ),
            // Beta versions show full version string
            ...Object.fromEntries(
              betaVersions.map(v => [v, { label: v, banner: 'none' as const }])
            ),
          },
          includeCurrentVersion: isBetaSite, // Only show 'Unreleased' on beta site
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Beta announcement bar - shown when ECLOSION_BETA env var is set
    ...(process.env.ECLOSION_BETA === 'true' && {
      announcementBar: {
        id: 'beta_warning',
        content:
          'You are viewing documentation for the <strong>beta</strong> version. Some features may be unstable. <a href="https://eclosion.app/docs">View stable docs</a>',
        backgroundColor: '#fef3c7',
        textColor: '#92400e',
        isCloseable: false,
      },
    }),
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Eclosion',
      logo: {
        alt: 'Eclosion Logo',
        src: 'img/logo.svg',
        href: '/',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'User Guide',
        },
        {
          type: 'docsVersionDropdown',
          position: 'left',
          dropdownActiveClassDisabled: true,
        },
        {
          // Use href (not to) for routes outside Docusaurus - triggers full page navigation
          href: '/demo',
          label: 'Try Demo',
          position: 'right',
        },
        {
          href: 'https://github.com/GraysonCAdams/eclosion-for-monarch',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs',
            },
            {
              label: 'Recurring Expenses',
              to: '/docs/recurring/overview',
            },
            {
              label: 'Self-Hosting Guide',
              href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki',
            },
          ],
        },
        {
          title: 'Product',
          items: [
            {
              label: 'Home',
              href: '/',
            },
            {
              label: 'Try Demo',
              href: '/demo',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Reddit',
              href: 'https://www.reddit.com/r/Eclosion/',
            },
            {
              label: 'Discussions',
              href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/discussions',
            },
            {
              label: 'Report an Issue',
              href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/issues',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/GraysonCAdams/eclosion-for-monarch',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Eclosion for Monarch. Built with Docusaurus.<br/>Eclosion is not affiliated with, endorsed by, or sponsored by Monarch Money.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'nginx', 'json', 'python', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
