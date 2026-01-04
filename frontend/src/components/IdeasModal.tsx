import { useState, useEffect } from 'react';
import { ThumbsUp, ExternalLink, Search, X } from 'lucide-react';
import { useDemo } from '../context/DemoContext';

/** Public idea from the ideas.json export */
interface PublicIdea {
  id: string;
  title: string;
  description: string;
  votes: number;
  category: string;
  productboardUrl: string;
  discussionUrl: string | null;
  discussionNumber: number | null;
  status: 'open' | 'closed';
  closedReason: 'monarch-committed' | 'eclosion-shipped' | null;
  closedAt: string | null;
}

interface IdeasData {
  generatedAt: string;
  votesThreshold: number;
  totalIdeas: number;
  openCount: number;
  closedCount: number;
  ideas: PublicIdea[];
}

interface IdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Sample data for demo mode */
const DEMO_IDEAS: IdeasData = {
  generatedAt: new Date().toISOString(),
  votesThreshold: 500,
  totalIdeas: 5,
  openCount: 3,
  closedCount: 2,
  ideas: [
    {
      id: 'demo-1',
      title: 'Multi-currency account support',
      description: 'Track accounts and transactions in multiple currencies with automatic conversion...',
      votes: 42,
      category: 'Dashboard & System Wide',
      productboardUrl: 'https://portal.productboard.com/example/1',
      discussionUrl: null,
      discussionNumber: null,
      status: 'open',
      closedReason: null,
      closedAt: null,
    },
    {
      id: 'demo-2',
      title: 'Custom recurring expense categories',
      description: 'Allow users to create custom categories for recurring expenses beyond the defaults...',
      votes: 28,
      category: 'Recurring & Bills',
      productboardUrl: 'https://portal.productboard.com/example/2',
      discussionUrl: null,
      discussionNumber: null,
      status: 'open',
      closedReason: null,
      closedAt: null,
    },
    {
      id: 'demo-3',
      title: 'Better transaction search',
      description: 'Advanced search filters including date ranges, amount ranges, and merchant search...',
      votes: 15,
      category: 'Transactions',
      productboardUrl: 'https://portal.productboard.com/example/3',
      discussionUrl: null,
      discussionNumber: null,
      status: 'open',
      closedReason: null,
      closedAt: null,
    },
    {
      id: 'demo-4',
      title: 'Bank sync improvements',
      description: 'Better handling of pending transactions and faster sync times...',
      votes: 89,
      category: 'Accounts',
      productboardUrl: 'https://portal.productboard.com/example/4',
      discussionUrl: null,
      discussionNumber: null,
      status: 'closed',
      closedReason: 'monarch-committed',
      closedAt: '2024-12-15T00:00:00Z',
    },
    {
      id: 'demo-5',
      title: 'Recurring expense tracking',
      description: 'Track and forecast recurring expenses like subscriptions and bills...',
      votes: 156,
      category: 'Recurring & Bills',
      productboardUrl: 'https://portal.productboard.com/example/5',
      discussionUrl: null,
      discussionNumber: null,
      status: 'closed',
      closedReason: 'eclosion-shipped',
      closedAt: '2024-11-01T00:00:00Z',
    },
  ],
};

const IDEAS_JSON_URL = 'https://raw.githubusercontent.com/graysoncadams/eclosion-for-monarch/main/data/ideas.json';
const NEW_DISCUSSION_URL = 'https://github.com/graysoncadams/eclosion-for-monarch/discussions/new?category=Ideas';

export function IdeasModal({ isOpen, onClose }: IdeasModalProps) {
  const isDemo = useDemo();
  const [data, setData] = useState<IdeasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveTab('open');

      if (isDemo) {
        setData(DEMO_IDEAS);
      } else {
        fetchIdeas();
      }
    }
  }, [isOpen, isDemo]);

  const fetchIdeas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(IDEAS_JSON_URL);
      if (!response.ok) {
        throw new Error(`Failed to load ideas: ${response.status}`);
      }
      const json = (await response.json()) as IdeasData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const ideas = data?.ideas ?? [];
  const openIdeas = ideas.filter((i) => i.status === 'open');
  const closedIdeas = ideas.filter((i) => i.status === 'closed');

  const currentIdeas = activeTab === 'open' ? openIdeas : closedIdeas;
  const filteredIdeas = currentIdeas.filter(
    (idea) =>
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 rounded-xl shadow-xl max-h-[85vh] flex flex-col modal-content bg-monarch-bg-card border border-monarch-border">
        {/* Header */}
        <div className="p-4 border-b border-monarch-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-monarch-text-dark">Community Ideas</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors text-monarch-text-muted"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm mt-1 text-monarch-text-muted">
            Vote on ideas you'd like Eclosion to build
          </p>
        </div>

        {/* Suggest button and search */}
        <div className="p-4 border-b border-monarch-border space-y-3">
          <a
            href={NEW_DISCUSSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-monarch-orange hover:opacity-90"
          >
            Suggest an Idea
            <ExternalLink className="w-4 h-4" />
          </a>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-monarch-text-muted" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg text-sm border border-monarch-border bg-monarch-bg-card text-monarch-text-dark"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-monarch-border">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'open'
                ? 'text-monarch-orange border-b-2 border-monarch-orange'
                : 'text-monarch-text-muted hover:text-monarch-text-dark'
            }`}
          >
            Open ({data?.openCount ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'closed'
                ? 'text-monarch-orange border-b-2 border-monarch-orange'
                : 'text-monarch-text-muted hover:text-monarch-text-dark'
            }`}
          >
            Closed ({data?.closedCount ?? 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-monarch-text-muted">Loading ideas...</div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-monarch-error mb-2">{error}</p>
              <button
                onClick={fetchIdeas}
                className="text-sm text-monarch-orange hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredIdeas.length === 0 ? (
            <div className="text-center py-8 text-monarch-text-muted">
              {searchQuery ? 'No ideas match your search' : `No ${activeTab} ideas`}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-monarch-border text-center text-xs text-monarch-text-muted">
          {data && (
            <>
              Last updated: {new Date(data.generatedAt).toLocaleDateString()}
              {' · '}
              Ideas with {data.votesThreshold}+ votes on Monarch's roadmap
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IdeaCard({ idea }: { idea: PublicIdea }) {
  return (
    <div
      className="p-4 rounded-lg border border-monarch-border bg-monarch-bg-page transition-colors hover:border-monarch-orange/30"
    >
      <div className="flex items-start gap-3">
        {/* Vote count */}
        <div className="flex flex-col items-center min-w-[50px] py-1">
          <ThumbsUp className="w-4 h-4 text-monarch-text-muted mb-1" />
          <span className="text-sm font-semibold text-monarch-text-dark">{idea.votes}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-monarch-text-dark leading-snug">
              {idea.discussionUrl ? (
                <a
                  href={idea.discussionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-monarch-orange transition-colors"
                >
                  {idea.title}
                </a>
              ) : (
                idea.title
              )}
            </h3>

            {/* Status badge for closed */}
            {idea.status === 'closed' && idea.closedReason && (
              <span
                className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                  idea.closedReason === 'eclosion-shipped'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {idea.closedReason === 'eclosion-shipped' ? 'Shipped' : 'Monarch building'}
              </span>
            )}
          </div>

          <p className="text-xs text-monarch-text-muted mt-1 line-clamp-2">{idea.description}</p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 rounded bg-monarch-bg-card text-monarch-text-muted">
              {idea.category}
            </span>
            <a
              href={idea.productboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-monarch-text-muted hover:text-monarch-orange transition-colors flex items-center gap-1"
            >
              View on Monarch
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
