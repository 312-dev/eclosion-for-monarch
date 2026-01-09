import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';
import * as fs from 'fs';
import * as path from 'path';

// Site type and version configuration
const isBetaSite = process.env.ECLOSION_BETA === 'true';
const betaVersion = process.env.ECLOSION_VERSION; // e.g., "1.1.0-beta.1"

// Load stable versions from versions.json (only used for stable site)
const stableVersions: string[] = fs.existsSync(path.join(__dirname, 'versions.json'))
  ? JSON.parse(fs.readFileSync(path.join(__dirname, 'versions.json'), 'utf-8')).filter((v: string) => !v.includes('beta'))
  : [];

// Beta site: Shows only current docs labeled with the pre-release version
// Stable site: Shows versioned docs from versions.json (1.0, 1.1, etc.)
const includedVersions = isBetaSite ? ['current'] : stableVersions;
const lastVersion = isBetaSite ? 'current' : (stableVersions[0] || 'current');

const config: Config = {
  title: 'Eclosion',
  tagline: 'An evolving toolkit for Monarch Money',
  favicon: 'img/favicon.ico',

  url: 'https://eclosion.app',
  baseUrl: '/',

  organizationName: 'GraysonCAdams',
  projectName: 'eclosion-for-monarch',

  // SEO: Head tags for all pages
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'Monarch Money, budgeting, personal finance, recurring expenses, self-hosted, expense tracking, documentation',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'author',
        content: 'Eclosion',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
  ],

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
          // Versioning configuration
          // Beta site: Shows only current docs labeled with pre-release version (no version dropdown)
          // Stable site: Shows versioned docs with version dropdown
          lastVersion,
          onlyIncludeVersions: includedVersions,
          versions: {
            // Current docs - only define when building beta site
            // (Docusaurus fails if versions config references versions not in onlyIncludeVersions)
            ...(isBetaSite && {
              current: {
                label: betaVersion || 'Next',
                path: '',
                banner: 'none',
              },
            }),
            // Stable versions get clean labels
            ...Object.fromEntries(
              stableVersions.map(v => [v, { label: v, banner: 'none' as const }])
            ),
          },
          includeCurrentVersion: isBetaSite, // Only include current on beta site
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // SEO: Open Graph / Social Card image
    image: 'img/social-card.png',
    metadata: [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image:alt', content: 'Eclosion - Self-hosted toolkit for Monarch Money' },
      { property: 'og:image:width', content: '1280' },
      { property: 'og:image:height', content: '640' },
      { property: 'og:image:alt', content: 'Eclosion - Self-hosted toolkit for Monarch Money' },
      { property: 'og:site_name', content: 'Eclosion for Monarch' },
    ],
    // Beta announcement bar - shown when ECLOSION_BETA env var is set
    ...(process.env.ECLOSION_BETA === 'true' && {
      announcementBar: {
        id: 'beta_warning',
        content:
          'You are viewing documentation for the <strong>beta</strong> version. Some features may be unstable. <a href="https://eclosion.app/docs">View stable docs</a>',
        backgroundColor: '#ede9fe',
        textColor: '#6d28d9',
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
        // Version dropdown - only show on stable site (beta has single version)
        ...(!isBetaSite ? [{
          type: 'docsVersionDropdown' as const,
          position: 'left' as const,
          dropdownActiveClassDisabled: true,
        }] : []),
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
      copyright: `Copyright ${new Date().getFullYear()} 312.dev and contributors. Built with Docusaurus.<br/>Eclosion is not affiliated with, endorsed by, or sponsored by Monarch Money.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'nginx', 'json', 'python', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
