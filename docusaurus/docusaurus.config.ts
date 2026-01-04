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
        href: 'https://eclosion.app',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'User Guide',
        },
        {
          href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki',
          label: 'Self-Hosting',
          position: 'right',
        },
        {
          to: '/',
          label: 'Home',
          position: 'right',
        },
        {
          to: '/demo',
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
      copyright: `Copyright ${new Date().getFullYear()} Eclosion for Monarch. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'nginx', 'json', 'python', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
