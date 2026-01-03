import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Self-Hosting',
      collapsed: false,
      items: [
        'self-hosting/overview',
        'self-hosting/docker',
        {
          type: 'category',
          label: 'Platform Guides',
          items: [
            'self-hosting/platforms/digitalocean',
            'self-hosting/platforms/aws',
            'self-hosting/platforms/gcp',
            'self-hosting/platforms/kubernetes',
            'self-hosting/platforms/synology',
            'self-hosting/platforms/raspberry-pi',
            'self-hosting/platforms/unraid',
            'self-hosting/platforms/portainer',
          ],
        },
        'self-hosting/reverse-proxy',
        'self-hosting/data-management',
        'self-hosting/monitoring',
        'self-hosting/security-hardening',
        'self-hosting/troubleshooting',
        'self-hosting/environment-variables',
      ],
    },
    'security',
    'contributing',
    'changelog',
  ],
};

export default sidebars;
