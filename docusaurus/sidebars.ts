import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Sidebar configuration for user guides (/docs)
 * These are AI-generated from in-app help content
 */
const sidebars: SidebarsConfig = {
  guideSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Features',
      collapsed: false,
      items: [
        'recurring-expenses',
        'setup-wizard',
        'rollup-category',
        'category-linking',
      ],
    },
  ],
};

export default sidebars;
