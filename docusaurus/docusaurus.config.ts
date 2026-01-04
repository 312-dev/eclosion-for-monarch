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

  onBrokenLinks: 'throw',
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
          lastVersion: 'current',
          versions: {
            current: {
              label: 'Next',
              path: '',
            },
          },
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
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
        },
        {
          href: 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki',
          label: 'Self-Hosting',
          position: 'right',
        },
        {
          href: 'https://eclosion.app',
          label: 'Home',
          position: 'right',
        },
        {
          href: 'https://eclosion.app/demo',
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
              to: '/docs/recurring-expenses',
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
