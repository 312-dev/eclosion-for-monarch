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
        {
          type: 'category',
          label: 'Recurring Expenses',
          collapsed: false,
          link: {
            type: 'doc',
            id: 'recurring/overview',
          },
          items: [
            'recurring/setup-wizard',
            'recurring/rollup-category',
            'recurring/category-linking',
          ],
        },
        {
          type: 'category',
          label: 'Monthly Notes',
          collapsed: false,
          link: {
            type: 'doc',
            id: 'notes/overview',
          },
          items: [],
        },
      ],
    },
    'faq',
  ],
};

export default sidebars;
