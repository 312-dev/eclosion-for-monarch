/**
 * Dashboard Tab
 *
 * Post-login landing page showing available tools and community links.
 */

import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import { ToolTile } from '../ui/ToolTile';
import { RecurringIcon, NotesIcon, StashIcon } from '../wizards/WizardComponents';
import { Icons } from '../icons';
import { useDashboardQuery } from '../../api/queries';
import { usePageTitle } from '../../hooks';
import { useDemo } from '../../context/DemoContext';
import { getComingSoonFeatures } from '../../data/features';

function getTools(isDemo: boolean) {
  const prefix = isDemo ? '/demo' : '';
  return [
    {
      id: 'notes',
      name: 'Notes',
      description: 'Add notes to categories that carry forward each month',
      icon: <NotesIcon size={28} />,
      path: `${prefix}/notes`,
    },
    {
      id: 'recurring',
      name: 'Recurring',
      description: 'Track and manage recurring expenses with smart category allocation',
      icon: <RecurringIcon size={28} />,
      path: `${prefix}/recurring`,
    },
    {
      id: 'stash',
      name: 'Stashes',
      description: "Save for today's wants and tomorrow's needs",
      icon: <StashIcon size={28} />,
      path: `${prefix}/stash`,
    },
  ];
}

export function DashboardTab() {
  const navigate = useNavigate();
  const isDemo = useDemo();
  const { data } = useDashboardQuery();
  const tools = getTools(isDemo);

  // Set page title with user's first name
  usePageTitle('Dashboard', data?.config.user_first_name);

  return (
    <div className="max-w-3xl tab-content-enter" data-testid="dashboard-content">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Welcome to Eclosion
        </h1>
        <p className="text-base" style={{ color: 'var(--monarch-text-muted)' }}>
          Expanding what's possible with Monarch. Select a tool to begin.
        </p>
      </div>

      {/* Tools Grid */}
      <section className="mb-10">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-4 px-1"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Available Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <ToolTile
              key={tool.id}
              name={tool.name}
              description={tool.description}
              icon={tool.icon}
              onClick={() => navigate(tool.path)}
            />
          ))}
        </div>
      </section>

      {/* Coming Soon */}
      <section className="mb-10">
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-4 px-1"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Coming Soon
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {getComingSoonFeatures().map((feature) => {
            const IconComponent = Icons[feature.icon];
            return (
              <ToolTile
                key={feature.id}
                name={feature.name}
                description={feature.tagline}
                icon={<IconComponent size={28} />}
                disabled
              />
            );
          })}
        </div>
      </section>

      {/* Community Support Section */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-4 px-1"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Community & Support
        </h2>
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <p className="mb-4" style={{ color: 'var(--monarch-text-dark)' }}>
            Have questions, feedback, or want to connect with other users?
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/312-dev/eclosion"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover-border-to-orange"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <Github size={18} />
              GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
