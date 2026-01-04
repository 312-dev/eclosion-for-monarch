import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Eclosion User Guide',
  tagline: 'Learn how to use Eclosion for Monarch Money',
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
          // Versioning - scoped by site:
          // - Stable site: Only stable versions (1.0, 1.1, etc.)
          // - Beta site: Only pre-release versions (1.1-beta.1, etc.) + Next
          lastVersion: process.env.DOCS_LAST_VERSION || '1.0',
          // Only include versions appropriate for this site
          onlyIncludeVersions: process.env.ECLOSION_BETA === 'true'
            ? ['current'] // Beta site: Next + any beta versions added to this array
            : ['1.0'],    // Stable site: Only stable versions
          versions: {
            current: {
              label: 'Next',
              path: process.env.ECLOSION_BETA === 'true' ? '' : 'next',
              // On beta site, we use the announcement bar instead of this banner
              banner: process.env.ECLOSION_BETA === 'true' ? 'none' : 'unreleased',
            },
            '1.0': {
              label: '1.0',
              banner: 'none',
            },
            // Add pre-release versions here and include in onlyIncludeVersions for beta:
            // '1.1-beta.1': { label: '1.1-beta.1', banner: 'unreleased' },
          },
          includeCurrentVersion: true,
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
          href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki',
          label: 'Self-Hosting',
          position: 'right',
        },
        {
          // Use href (not to) for routes outside Docusaurus - triggers full page navigation
          href: '/',
          label: 'Home',
          position: 'right',
        },
        {
          // Use href (not to) for routes outside Docusaurus - triggers full page navigation
          href: '/demo',
          label: 'Demo',
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
          title: 'User Guide',
          items: [
            {
              label: 'Getting Started',
              to: '/docs',
            },
            {
              label: 'Recurring Expenses',
              to: '/docs/recurring/overview',
            },
          ],
        },
        {
          title: 'Self-Hosting',
          items: [
            {
              label: 'GitHub Wiki',
              href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki',
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
              label: 'GitHub Discussions',
              href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
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
