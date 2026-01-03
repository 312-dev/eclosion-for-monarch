/**
 * Dashboard Tab
 *
 * Post-login landing page showing available tools and community links.
 */

import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import { ToolTile } from '../ui/ToolTile';
import { RecurringIcon } from '../wizards/WizardComponents';
import { useDashboardQuery } from '../../api/queries';
import { usePageTitle } from '../../hooks';
import { useDemo } from '../../context/DemoContext';

function RedditIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function getTools(isDemo: boolean) {
  const prefix = isDemo ? '/demo' : '';
  return [
    {
      id: 'recurring',
      name: 'Recurring',
      description: 'Track and manage recurring expenses with smart category allocation',
      icon: <RecurringIcon size={28} />,
      path: `${prefix}/recurring`,
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
    <div className="max-w-3xl">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold mb-2"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
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
              href="https://www.reddit.com/r/Eclosion/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover-border-to-orange"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <RedditIcon size={18} />
              Reddit Community
            </a>
            <a
              href="https://github.com/graysoncadams/eclosion-for-monarch"
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
