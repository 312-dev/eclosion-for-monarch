import { useState, useEffect } from 'react';
import { ThumbsUp, ExternalLink, Search, X, AtSign } from 'lucide-react';
import { IdeatorAvatar } from './ui/IdeatorAvatar';
import { getUsernameForIdea, getAvatarUrlForIdea } from './marketing/IdeasBoard/useIdeasAnimation';
import type { PublicIdea, IdeasData } from '../types/ideas';
import { Portal } from './Portal';

interface IdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IDEAS_JSON_URL = 'https://raw.githubusercontent.com/graysoncadams/eclosion-for-monarch/main/data/ideas.json';
const NEW_DISCUSSION_URL = 'https://github.com/graysoncadams/eclosion-for-monarch/discussions/new?category=Ideas';

export function IdeasModal({ isOpen, onClose }: IdeasModalProps) {
  const [data, setData] = useState<IdeasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveTab('open');
      // Always fetch real ideas from GitHub, even in demo mode
      fetchIdeas();
    }
  }, [isOpen]);

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
    <Portal>
      <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 rounded-xl shadow-xl max-h-[85vh] flex flex-col modal-content bg-monarch-bg-card border border-monarch-border">
        {/* Header */}
        <div className="p-4 border-b border-monarch-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-monarch-text-dark">Community Ideas</h2>
              <p className="text-sm mt-0.5 text-monarch-text-muted">
                Ideas from{' '}
                <a
                  href="https://github.com/GraysonCAdams/eclosion-for-monarch/discussions/categories/ideas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-monarch-text-dark hover:underline"
                >
                  Eclosion's GitHub
                </a>
                {' '}and{' '}
                <a
                  href="https://portal.productboard.com/3qsdvcsy5aq69hhkycf4dtpi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-monarch-text-dark hover:underline"
                >
                  Monarch Money's roadmap
                </a>
              </p>
            </div>
            <a
              href={NEW_DISCUSSION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors bg-monarch-orange hover:opacity-90 shrink-0"
            >
              Suggest an Idea
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-monarch-bg-page transition-colors text-monarch-text-muted shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-monarch-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-monarch-text-muted" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-lg text-sm border border-monarch-border bg-monarch-bg-page text-monarch-text-dark placeholder:text-monarch-text-muted"
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
          {data && <>Last updated: {new Date(data.generatedAt).toLocaleDateString()}</>}
        </div>
      </div>
    </div>
    </Portal>
  );
}

function IdeaCard({ idea }: { idea: PublicIdea }) {
  const username = getUsernameForIdea(idea);
  const avatarUrl = getAvatarUrlForIdea(idea);

  return (
    <div
      className="p-4 rounded-lg border border-monarch-border bg-monarch-bg-page transition-colors hover:border-monarch-orange/30"
    >
      {/* User info */}
      <div className="flex items-center gap-2 mb-3">
        <IdeatorAvatar avatarUrl={avatarUrl} username={username} size="sm" />
        <span className="text-sm font-medium text-monarch-text-dark">{username}</span>
      </div>

      <div className="flex items-start gap-3">
        {/* Vote count - links to discussion for voting */}
        <a
          href={idea.discussionUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center min-w-[50px] py-1 rounded-lg transition-colors hover:bg-monarch-orange/10"
          title="Vote on GitHub"
          aria-label={`Vote for ${idea.title} (${idea.votes} votes)`}
        >
          <ThumbsUp className="w-4 h-4 text-monarch-text-muted mb-1" />
          <span className="text-sm font-semibold text-monarch-text-dark">{idea.votes}</span>
        </a>

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
                className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${
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

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Source badge */}
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${
                idea.source === 'github'
                  ? 'bg-monarch-orange/10 text-monarch-orange'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              <AtSign className="w-3 h-3" />
              {idea.source === 'github' ? 'Eclosion' : 'Monarch'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {idea.category}
            </span>
            {idea.productboardUrl && (
              <a
                href={idea.productboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-monarch-text-muted hover:text-monarch-orange transition-colors flex items-center gap-1"
              >
                View on Monarch
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
