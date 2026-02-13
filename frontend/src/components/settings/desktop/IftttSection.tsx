/**
 * IFTTT Integration Section
 *
 * Settings section for managing IFTTT connection status.
 * Works on desktop (via fetchApi to localhost Flask) and
 * remotely via tunnel (via fetchApi through tunnel proxy).
 *
 * Shows:
 * - Connection status (connected/disconnected)
 * - Link to IFTTT service page to connect
 * - Disconnect button when connected
 * - Pending queue indicator with drain button
 * - Recent action history
 */

/* eslint-disable max-lines, sonarjs/cognitive-complexity */
// Note: This file should be split into smaller components (ActivityLog, StatusPanel, etc.)

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExternalLink,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Download,
  Search,
  X,
  History,
  Activity,
  Unplug,
} from 'lucide-react';
import { SiIfttt } from 'react-icons/si';
import { fetchApi } from '../../../api/core/fetchApi';
import { Modal } from '../../ui/Modal';
import { Tooltip } from '../../ui/Tooltip';
import { useToast } from '../../../context/ToastContext';
import { useNotifications } from '../../../context/NotificationContext';
import { useTunnelStatus } from '../../../hooks';
import { isDesktopMode } from '../../../utils/apiBase';
import { isTunnelSite } from '../../../utils/environment';
import { scrollContainerTo } from '../../../utils';

const IFTTT_SERVICE_URL = 'https://ifttt.com/eclosion';

interface PendingAction {
  id: string;
  action_slug: string;
  fields: Record<string, string>;
  queued_at: number;
}

interface IftttStatus {
  connected: boolean;
  connectedAt: string | null;
  pendingActions: PendingAction[];
}

interface ActionHistoryEntry {
  id: string;
  action_slug: string;
  fields: Record<string, string>;
  queued_at?: number;
  executed_at: number;
  success: boolean;
  error?: string;
  proxy_error?: string;
  was_queued: boolean;
}

interface TriggerEvent {
  id: string;
  trigger_slug: string;
  timestamp: number;
  data: Record<string, unknown>;
}

interface RefreshResult {
  configured: boolean;
  subdomain?: string;
  events_pushed: Record<string, number | string>;
  active_subscriptions?: Record<string, number>;
  field_options_pushed?: { categories: number; goals: number };
  timestamp: number;
}

// Helper to sum numeric values in an object
function sumObjectValues(obj: Record<string, unknown>): number {
  return Object.values(obj).reduce((sum: number, v) => {
    if (typeof v === 'number') return sum + v;
    if (typeof v === 'object' && v !== null)
      return sum + sumObjectValues(v as Record<string, unknown>);
    return sum;
  }, 0);
}

// Friendly labels for IFTTT data keys
const FRIENDLY_LABELS: Record<string, string> = {
  events_pushed: 'Events Pushed',
  active_subscriptions: 'Active Subscriptions',
  field_options_pushed: 'Field Options Synced',
  goal_achieved: 'Goal Achieved',
  under_budget: 'Under Budget',
  budget_surplus: 'Budget Surplus',
  balance_threshold: 'Balance Threshold',
  under_budget_streak: 'Under-budget Streak',
  new_charge: 'New Charge',
  categories: 'Categories',
  goals: 'Goals',
};

// Collapsible section for displaying refresh results
function RefreshSection({
  data,
  label,
  defaultExpanded = false,
}: Readonly<{ data: Record<string, unknown>; label: string; defaultExpanded?: boolean }>) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!data || Object.keys(data).length === 0) return null;

  const entries = Object.entries(data);
  const total = sumObjectValues(data);

  return (
    <div className="text-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-(--monarch-text-dark) hover:text-(--monarch-primary) transition-colors"
      >
        <ChevronDown size={14} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        <span>{FRIENDLY_LABELS[label] || label}</span>
        <span className="text-(--monarch-text-muted)">({total})</span>
      </button>
      {expanded && (
        <div className="ml-5 mt-1 space-y-0.5">
          {entries.map(([key, value]) => {
            const friendlyKey = FRIENDLY_LABELS[key] || key.replaceAll('_', ' ');
            if (typeof value === 'object' && value !== null) {
              return (
                <RefreshSection
                  key={key}
                  data={value as Record<string, unknown>}
                  label={key}
                  defaultExpanded={false}
                />
              );
            }
            return (
              <div key={key} className="flex items-center gap-2 text-(--monarch-text-muted)">
                <span>{friendlyKey}:</span>
                <span>{String(value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getSubtitle(loading: boolean, connected?: boolean): string {
  if (loading) return 'Checking connection...';
  if (connected) return 'Automate your budgeting';
  return 'Connect to automate';
}

interface StatusBadgeProps {
  connected: boolean;
  tunnelActive: boolean;
  onTest?: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  onRefresh?: () => void;
  testing?: boolean;
  syncing?: boolean;
  disconnecting?: boolean;
  refreshing?: boolean;
}

function StatusBadge({
  connected,
  tunnelActive,
  onTest,
  onSync,
  onDisconnect,
  onRefresh,
  testing,
  syncing,
  disconnecting,
  refreshing,
}: Readonly<StatusBadgeProps>) {
  // When not connected, show refresh button + Connect button instead of badge
  if (!connected) {
    return (
      <div className="pt-2 shrink-0 flex items-center gap-1.5">
        {onRefresh && (
          <Tooltip content={refreshing ? 'Checking...' : 'Check connection status'}>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-md transition-colors hover:bg-black/10 disabled:opacity-50"
              type="button"
              aria-label="Refresh status"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin' : ''}
                style={{ color: 'var(--monarch-text-muted)' }}
              />
            </button>
          </Tooltip>
        )}
        <a
          href={tunnelActive ? IFTTT_SERVICE_URL : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--monarch-orange)',
            color: 'white',
            textDecoration: 'none',
            pointerEvents: tunnelActive ? 'auto' : 'none',
            opacity: tunnelActive ? 1 : 0.5,
            cursor: tunnelActive ? 'pointer' : 'not-allowed',
          }}
          aria-disabled={!tunnelActive}
          onClick={tunnelActive ? undefined : (e) => e.preventDefault()}
        >
          Connect
          <ExternalLink size={14} />
        </a>
      </div>
    );
  }

  return (
    <div className="pt-2 shrink-0 flex items-center gap-1.5">
      {onDisconnect && (
        <Tooltip content={disconnecting ? 'Disconnecting...' : 'Disconnect'}>
          <button
            onClick={onDisconnect}
            disabled={disconnecting}
            className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 disabled:opacity-50"
            type="button"
            aria-label="Disconnect"
          >
            <Unplug
              size={14}
              className={disconnecting ? 'animate-pulse' : ''}
              style={{ color: 'var(--monarch-error)' }}
            />
          </button>
        </Tooltip>
      )}
      {onTest && (
        <Tooltip content={testing ? 'Testing...' : 'Test tunnel connection'}>
          <button
            onClick={onTest}
            disabled={testing}
            className="p-1.5 rounded-md transition-colors hover:bg-black/10 disabled:opacity-50"
            type="button"
            aria-label="Test tunnel"
          >
            <Activity
              size={14}
              className={testing ? 'animate-pulse' : ''}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        </Tooltip>
      )}
      {onSync && (
        <Tooltip content={syncing ? 'Syncing...' : 'Sync events'}>
          <button
            onClick={onSync}
            disabled={syncing}
            className="p-1.5 rounded-md transition-colors hover:bg-black/10 disabled:opacity-50"
            type="button"
            aria-label="Sync events"
          >
            <RefreshCw
              size={14}
              className={syncing ? 'animate-spin' : ''}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        </Tooltip>
      )}
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: 'var(--monarch-success-light, rgba(34, 197, 94, 0.1))',
          color: 'var(--monarch-success, #22c55e)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--monarch-success, #22c55e)' }}
        />
        Connected
      </span>
    </div>
  );
}

function formatActionSlug(slug: string): string {
  const map: Record<string, string> = {
    budget_to: 'Budget to category',
    budget_to_goal: 'Budget to goal',
    move_funds: 'Move funds',
  };
  return map[slug] ?? slug.replaceAll('_', ' ');
}

function formatTriggerSlug(slug: string): string {
  const map: Record<string, string> = {
    goal_achieved: 'Goal achieved',
    under_budget: 'Under budget',
    budget_surplus: 'Budget surplus',
    category_balance_threshold: 'Category threshold',
    under_budget_streak: 'Under-budget streak',
    new_charge: 'New charge',
  };
  return map[slug] ?? slug.replaceAll('_', ' ');
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- Logs Modal ---

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ActionHistoryEntry[];
  triggers: TriggerEvent[];
  lastRefreshResult: RefreshResult | null;
}

type LogTab = 'actions' | 'triggers' | 'status';
type TimeFilter = '1h' | '24h' | '7d' | 'all';

const ITEMS_PER_PAGE = 20;

function LogsModal({
  isOpen,
  onClose,
  actions,
  triggers,
  lastRefreshResult,
}: Readonly<LogsModalProps>) {
  const [tab, setTabState] = useState<LogTab>('triggers');
  const [timeFilter, setTimeFilterState] = useState<TimeFilter>('24h');
  const [searchQuery, setSearchQueryState] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggerTypeFilter, setTriggerTypeFilterState] = useState<string | null>(null);
  const [actionTypeFilter, setActionTypeFilterState] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper to reset pagination when filters change
  const resetPagination = useCallback(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    scrollContainerTo(scrollContainerRef.current, 0);
  }, []);

  // Wrapped setters that reset pagination
  const setTab = useCallback(
    (value: LogTab) => {
      setTabState(value);
      resetPagination();
    },
    [resetPagination]
  );

  const setTimeFilter = useCallback(
    (value: TimeFilter) => {
      setTimeFilterState(value);
      resetPagination();
    },
    [resetPagination]
  );

  const setSearchQuery = useCallback(
    (value: string) => {
      setSearchQueryState(value);
      resetPagination();
    },
    [resetPagination]
  );

  const setTriggerTypeFilter = useCallback(
    (value: string | null) => {
      setTriggerTypeFilterState(value);
      resetPagination();
    },
    [resetPagination]
  );

  const setActionTypeFilter = useCallback(
    (value: string | null) => {
      setActionTypeFilterState(value);
      resetPagination();
    },
    [resetPagination]
  );

  // Get unique types for filtering
  const triggerTypes = [...new Set(triggers.map((t) => t.trigger_slug))];
  const actionTypes = [...new Set(actions.map((a) => a.action_slug))];

  // Compute time filter cutoff (computed fresh each filter call rather than stored in state)
  const getFilterCutoff = useCallback((filter: TimeFilter): number => {
    if (filter === 'all') return 0;
    const now = Date.now();
    const cutoffs: Record<Exclude<TimeFilter, 'all'>, number> = {
      '1h': now - 60 * 60 * 1000,
      '24h': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000,
    };
    return cutoffs[filter];
  }, []);

  // Filter by time
  const filterByTime = useCallback(
    <T extends { timestamp?: number; executed_at?: number }>(items: T[]): T[] => {
      if (timeFilter === 'all') return items;
      const cutoff = getFilterCutoff(timeFilter);
      return items.filter((item) => {
        const ts = item.timestamp ? item.timestamp * 1000 : (item.executed_at ?? 0);
        return ts > cutoff;
      });
    },
    [timeFilter, getFilterCutoff]
  );

  // Filter by search
  const filterBySearch = <T extends object>(items: T[], keys: (keyof T)[]): T[] => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      keys.some((key) => {
        const val = item[key];
        if (typeof val === 'string') return val.toLowerCase().includes(query);
        if (typeof val === 'object' && val)
          return JSON.stringify(val).toLowerCase().includes(query);
        return false;
      })
    );
  };

  // Filter by type
  const filterByType = <T extends { trigger_slug?: string; action_slug?: string }>(
    items: T[],
    typeFilter: string | null,
    slugKey: 'trigger_slug' | 'action_slug'
  ): T[] => {
    if (!typeFilter) return items;
    return items.filter((item) => item[slugKey] === typeFilter);
  };

  const filteredActions = filterBySearch(
    filterByType(filterByTime(actions), actionTypeFilter, 'action_slug'),
    ['action_slug', 'fields', 'error']
  );
  const filteredTriggers = filterBySearch(
    filterByType(filterByTime(triggers), triggerTypeFilter, 'trigger_slug'),
    ['trigger_slug', 'data']
  );

  // Lazy loading with intersection observer
  const currentItems = tab === 'triggers' ? filteredTriggers : filteredActions;
  const hasMore = visibleCount < currentItems.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, currentItems.length));
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, currentItems.length]);

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: '1h', label: '1 hour' },
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activity Log" maxWidth="lg">
      <div className="space-y-4">
        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        >
          <button
            onClick={() => {
              setTab('triggers');
              setActionTypeFilter(null);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: tab === 'triggers' ? 'var(--monarch-bg-card)' : 'transparent',
              color: tab === 'triggers' ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
              boxShadow: tab === 'triggers' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
            type="button"
          >
            <Send size={14} />
            Triggers
            <span
              className="px-1.5 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text-muted)',
              }}
            >
              {filteredTriggers.length}
            </span>
          </button>
          <button
            onClick={() => {
              setTab('actions');
              setTriggerTypeFilter(null);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: tab === 'actions' ? 'var(--monarch-bg-card)' : 'transparent',
              color: tab === 'actions' ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
              boxShadow: tab === 'actions' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
            type="button"
          >
            <Download size={14} />
            Actions
            <span
              className="px-1.5 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text-muted)',
              }}
            >
              {filteredActions.length}
            </span>
          </button>
          <button
            onClick={() => {
              setTab('status');
              setTriggerTypeFilter(null);
              setActionTypeFilter(null);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              backgroundColor: tab === 'status' ? 'var(--monarch-bg-card)' : 'transparent',
              color: tab === 'status' ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
              boxShadow: tab === 'status' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
            type="button"
          >
            <Activity size={14} />
            Status
          </button>
        </div>

        {/* Filters - hidden on status tab */}
        {tab !== 'status' && (
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--monarch-text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border-0 outline-none"
                style={{
                  backgroundColor: 'var(--monarch-bg-page)',
                  color: 'var(--monarch-text-dark)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/10"
                  type="button"
                  aria-label="Clear search"
                >
                  <X size={12} style={{ color: 'var(--monarch-text-muted)' }} />
                </button>
              )}
            </div>

            {/* Time filter */}
            <div className="flex gap-1">
              {timeFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeFilter(opt.value)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor:
                      timeFilter === opt.value ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
                    color: timeFilter === opt.value ? 'white' : 'var(--monarch-text-muted)',
                  }}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type filter - fixed height container, hidden on status tab */}
        {tab !== 'status' && (
          <div className="flex flex-wrap gap-1.5 min-h-7">
            {tab === 'triggers' && triggerTypes.length > 1 && (
              <>
                <button
                  onClick={() => setTriggerTypeFilter(null)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      triggerTypeFilter === null
                        ? 'var(--monarch-orange)'
                        : 'var(--monarch-bg-page)',
                    color: triggerTypeFilter === null ? 'white' : 'var(--monarch-text-muted)',
                  }}
                  type="button"
                >
                  All types
                </button>
                {triggerTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setTriggerTypeFilter(type)}
                    className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        triggerTypeFilter === type
                          ? 'var(--monarch-orange)'
                          : 'var(--monarch-bg-page)',
                      color: triggerTypeFilter === type ? 'white' : 'var(--monarch-text-muted)',
                    }}
                    type="button"
                  >
                    {formatTriggerSlug(type)}
                  </button>
                ))}
              </>
            )}
            {tab === 'actions' && actionTypes.length > 1 && (
              <>
                <button
                  onClick={() => setActionTypeFilter(null)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      actionTypeFilter === null
                        ? 'var(--monarch-orange)'
                        : 'var(--monarch-bg-page)',
                    color: actionTypeFilter === null ? 'white' : 'var(--monarch-text-muted)',
                  }}
                  type="button"
                >
                  All types
                </button>
                {actionTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActionTypeFilter(type)}
                    className="px-2.5 py-1 text-xs font-medium rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        actionTypeFilter === type
                          ? 'var(--monarch-orange)'
                          : 'var(--monarch-bg-page)',
                      color: actionTypeFilter === type ? 'white' : 'var(--monarch-text-muted)',
                    }}
                    type="button"
                  >
                    {formatActionSlug(type)}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* List */}
        <div
          ref={scrollContainerRef}
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: 'var(--monarch-bg-page)', height: '350px', overflowY: 'auto' }}
        >
          {tab === 'triggers' &&
            (filteredTriggers.length === 0 ? (
              <div
                className="p-8 text-center text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                No triggers found
              </div>
            ) : (
              <>
                {filteredTriggers.slice(0, visibleCount).map((event) => (
                  <TriggerLogEntry
                    key={event.id}
                    event={event}
                    expanded={expandedId === event.id}
                    onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                  />
                ))}
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="p-4 text-center text-xs"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    Loading more...
                  </div>
                )}
              </>
            ))}
          {tab === 'actions' &&
            (filteredActions.length === 0 ? (
              <div
                className="p-8 text-center text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                No actions found
              </div>
            ) : (
              <>
                {filteredActions.slice(0, visibleCount).map((entry) => (
                  <ActionLogEntry
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="p-4 text-center text-xs"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    Loading more...
                  </div>
                )}
              </>
            ))}
          {tab === 'status' &&
            (lastRefreshResult ? (
              <div className="p-4 space-y-3">
                <div
                  className="text-sm flex items-center gap-2"
                  style={{ color: 'var(--monarch-text-dark)' }}
                >
                  <Activity size={14} />
                  Last sync: {new Date(lastRefreshResult.timestamp).toLocaleString()}
                </div>
                <div className="space-y-2">
                  <RefreshSection
                    data={lastRefreshResult.events_pushed}
                    label="events_pushed"
                    defaultExpanded={true}
                  />
                  <RefreshSection
                    data={lastRefreshResult.active_subscriptions || {}}
                    label="active_subscriptions"
                    defaultExpanded={true}
                  />
                  <RefreshSection
                    data={lastRefreshResult.field_options_pushed || {}}
                    label="field_options_pushed"
                    defaultExpanded={true}
                  />
                </div>
              </div>
            ) : (
              <div
                className="p-8 text-center text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                No sync data yet. Click the sync button to refresh.
              </div>
            ))}
        </div>
      </div>
    </Modal>
  );
}

// --- Log Entry Components ---

interface ActionLogEntryProps {
  entry: ActionHistoryEntry;
  expanded: boolean;
  onToggle: () => void;
}

function ActionLogEntry({ entry, expanded, onToggle }: Readonly<ActionLogEntryProps>) {
  const StatusIcon = entry.success ? CheckCircle2 : XCircle;
  const statusColor = entry.success
    ? 'var(--monarch-success, #22c55e)'
    : 'var(--monarch-error, #ef4444)';

  return (
    <div style={{ borderBottom: '1px solid var(--monarch-border)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
        type="button"
      >
        <StatusIcon size={18} style={{ color: statusColor }} className="shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-baseline gap-2">
            <span className="font-medium shrink-0" style={{ color: 'var(--monarch-text-dark)' }}>
              {formatActionSlug(entry.action_slug)}
            </span>
            {entry.was_queued && (
              <Tooltip content="Executed from queue (was offline)">
                <Clock size={12} style={{ color: 'var(--monarch-text-muted)' }} />
              </Tooltip>
            )}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--monarch-text-muted)' }}>
            {new Date(entry.executed_at).toLocaleString()}
            {entry.error && <span style={{ color: 'var(--monarch-error)' }}> · {entry.error}</span>}
          </div>
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform"
          style={{
            color: 'var(--monarch-text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div
            className="p-3 rounded-lg text-xs font-mono space-y-2"
            style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          >
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span style={{ color: 'var(--monarch-text-muted)' }}>Action</span>
              <span style={{ color: 'var(--monarch-text-dark)' }}>{entry.action_slug}</span>
              <span style={{ color: 'var(--monarch-text-muted)' }}>ID</span>
              <span style={{ color: 'var(--monarch-text-dark)' }} className="break-all">
                {entry.id}
              </span>
              <span style={{ color: 'var(--monarch-text-muted)' }}>Time</span>
              <span style={{ color: 'var(--monarch-text-dark)' }}>
                {new Date(entry.executed_at).toLocaleString()}
              </span>
              {entry.was_queued && entry.queued_at && (
                <>
                  <span style={{ color: 'var(--monarch-text-muted)' }}>Queued</span>
                  <span style={{ color: 'var(--monarch-text-dark)' }}>
                    {new Date(entry.queued_at).toLocaleString()}
                  </span>
                </>
              )}
              <span style={{ color: 'var(--monarch-text-muted)' }}>Status</span>
              <span
                style={{ color: entry.success ? 'var(--monarch-success)' : 'var(--monarch-error)' }}
              >
                {entry.success ? 'Success' : 'Failed'}
              </span>
              {entry.error && (
                <>
                  <span style={{ color: 'var(--monarch-text-muted)' }}>Error</span>
                  <span style={{ color: 'var(--monarch-error)' }}>{entry.error}</span>
                </>
              )}
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
              <div className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                Fields received:
              </div>
              <pre
                className="whitespace-pre-wrap break-all"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {JSON.stringify(entry.fields, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TriggerLogEntryProps {
  event: TriggerEvent;
  expanded: boolean;
  onToggle: () => void;
}

function TriggerLogEntry({ event, expanded, onToggle }: Readonly<TriggerLogEntryProps>) {
  const getSummary = (): string | null => {
    const { data } = event;
    if (!data) return null;
    if (data['category_name']) return String(data['category_name']);
    if (data['stash_name']) return String(data['stash_name']);
    if (data['merchant_name']) return String(data['merchant_name']);
    if (data['amount']) return `$${data['amount']}`;
    return null;
  };

  const summary = getSummary();

  return (
    <div style={{ borderBottom: '1px solid var(--monarch-border)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
        type="button"
      >
        <Send size={18} style={{ color: 'var(--monarch-orange)' }} className="shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-baseline gap-2 overflow-hidden">
            <span className="font-medium shrink-0" style={{ color: 'var(--monarch-text-dark)' }}>
              {formatTriggerSlug(event.trigger_slug)}
            </span>
            {summary && (
              <span className="text-sm truncate" style={{ color: 'var(--monarch-text-muted)' }}>
                · {summary}
              </span>
            )}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
            {new Date(event.timestamp * 1000).toLocaleString()}
          </div>
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform"
          style={{
            color: 'var(--monarch-text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div
            className="p-3 rounded-lg text-xs font-mono space-y-2"
            style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          >
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span style={{ color: 'var(--monarch-text-muted)' }}>Trigger</span>
              <span style={{ color: 'var(--monarch-text-dark)' }}>{event.trigger_slug}</span>
              <span style={{ color: 'var(--monarch-text-muted)' }}>ID</span>
              <span style={{ color: 'var(--monarch-text-dark)' }} className="break-all">
                {event.id}
              </span>
              <span style={{ color: 'var(--monarch-text-muted)' }}>Time</span>
              <span style={{ color: 'var(--monarch-text-dark)' }}>
                {new Date(event.timestamp * 1000).toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
              <div className="mb-1" style={{ color: 'var(--monarch-text-muted)' }}>
                Data sent:
              </div>
              <pre
                className="whitespace-pre-wrap break-all"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function IftttSection() {
  const [status, setStatus] = useState<IftttStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [draining, setDraining] = useState(false);
  const [history, setHistory] = useState<ActionHistoryEntry[]>([]);
  const [triggerHistory, setTriggerHistory] = useState<TriggerEvent[]>([]);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [lastRefreshResult, setLastRefreshResult] = useState<RefreshResult | null>(null);
  const [_testResult, setTestResult] = useState<{
    success: boolean;
    status?: number;
    latency?: number;
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [refreshingTriggers, setRefreshingTriggers] = useState(false);
  const toast = useToast();
  const { addNotification } = useNotifications();
  const { status: tunnelStatus } = useTunnelStatus();

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchApi<{
        configured: boolean;
        connected: boolean;
        connectedAt: string | null;
        pendingActions: PendingAction[];
        history: ActionHistoryEntry[];
        triggers: TriggerEvent[];
      }>('/ifttt/connection-status');

      if (!data.configured) {
        setStatus(null);
        return;
      }

      setStatus({
        connected: data.connected,
        connectedAt: data.connectedAt,
        pendingActions: data.pendingActions,
      });
      setHistory(data.history);
      setTriggerHistory(data.triggers);

      // Desktop-only: ensure action secret is provisioned on disk
      if (data.connected && isDesktopMode()) {
        globalThis.electron?.tunnel?.fetchIftttActionSecret?.().catch(() => {
          // Non-fatal — secret may already be on disk
        });
      }
    } catch {
      setStatus({ connected: false, connectedAt: null, pendingActions: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Re-fetch when user returns to the tab (e.g., after connecting on IFTTT)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll every 5 minutes for updates
    const pollInterval = setInterval(
      () => {
        if (document.visibilityState === 'visible') {
          fetchStatus();
        }
      },
      5 * 60 * 1000
    );

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [fetchStatus]);

  // Auto-drain pending actions immediately when detected
  const pendingCount = status?.pendingActions?.length ?? 0;
  useEffect(() => {
    if (pendingCount > 0 && !draining) {
      setDraining(true);
      fetchApi<{
        processed: number;
        succeeded: number;
        failed: number;
        actions: Array<{ action_slug: string; success: boolean; error?: string }>;
      }>('/ifttt/drain-queue', { method: 'POST' })
        .then((result) => {
          if (result.processed > 0) {
            for (const action of result.actions) {
              addNotification({
                type: 'ifttt_queue',
                title: action.success ? 'IFTTT Action Completed' : 'IFTTT Action Failed',
                message: action.success
                  ? `${formatActionSlug(action.action_slug)} executed successfully`
                  : `${formatActionSlug(action.action_slug)}: ${action.error ?? 'Unknown error'}`,
                source: 'ifttt',
              });
            }
          }
          fetchStatus();
        })
        .catch(() => {
          // Will retry on next poll
        })
        .finally(() => {
          setDraining(false);
        });
    }
  }, [pendingCount, draining, addNotification, fetchStatus]);

  const handleRefreshStatus = useCallback(async () => {
    setRefreshingStatus(true);
    await fetchStatus();
    setRefreshingStatus(false);
  }, [fetchStatus]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetchApi('/ifttt/disconnect', { method: 'POST' });
      setStatus({ connected: false, connectedAt: null, pendingActions: [] });
      toast.success('IFTTT disconnected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to disconnect IFTTT: ${msg}`);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDrainQueue = async () => {
    setDraining(true);
    try {
      const result = await fetchApi<{
        processed: number;
        succeeded: number;
        failed: number;
        actions: Array<{ action_slug: string; success: boolean; error?: string }>;
      }>('/ifttt/drain-queue', { method: 'POST' });

      if (result.processed === 0) {
        toast.info('No pending actions to process');
      } else if (result.failed === 0) {
        toast.success(`Processed ${result.succeeded} action${result.succeeded === 1 ? '' : 's'}`);
      } else {
        toast.warning(
          `Processed ${result.succeeded}/${result.processed} actions (${result.failed} failed)`
        );
      }

      for (const action of result.actions) {
        addNotification({
          type: 'ifttt_queue',
          title: action.success ? 'IFTTT Action Completed' : 'IFTTT Action Failed',
          message: action.success
            ? `${formatActionSlug(action.action_slug)} executed successfully`
            : `${formatActionSlug(action.action_slug)}: ${action.error ?? 'Unknown error'}`,
          source: 'ifttt',
        });
      }

      await fetchStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to process queue: ${msg}`);
    } finally {
      setDraining(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await fetchApi<{
        success: boolean;
        status?: number;
        latency?: number;
        error?: string;
      }>('/ifttt/test-tunnel');

      const testError =
        data.error || (data.status && data.status >= 400 ? `HTTP ${data.status}` : undefined);
      const result: { success: boolean; status?: number; latency?: number; error?: string } = {
        success: data.success,
      };
      if (data.status !== undefined) result.status = data.status;
      if (data.latency !== undefined) result.latency = data.latency;
      if (testError !== undefined) result.error = testError;
      setTestResult(result);

      if (data.success) {
        toast.success(`Tunnel working (${data.latency}ms)`);
      } else {
        const errorMsg = data.error || `HTTP ${data.status}`;
        toast.error(`Tunnel test failed: ${errorMsg}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Test failed';
      setTestResult({ success: false, error });
      toast.error(error);
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshTriggers = async () => {
    setRefreshingTriggers(true);
    try {
      const data = await fetchApi<RefreshResult & { configured: boolean }>(
        '/ifttt/refresh-triggers',
        {
          method: 'POST',
        }
      );

      setLastRefreshResult({
        ...data,
        timestamp: Date.now(),
      });

      if (!data.configured) {
        toast.warning('IFTTT not configured - tunnel creds may need to be pushed');
        return;
      }

      const eventsPushed = data.events_pushed || {};
      const totalEvents = Object.values(eventsPushed).reduce(
        (sum: number, v) => sum + (typeof v === 'number' ? v : 0),
        0
      );

      const fieldOptions = data.field_options_pushed;
      const totalFieldOptions = (fieldOptions?.categories || 0) + (fieldOptions?.goals || 0);

      if (totalEvents > 0) {
        toast.success(`Pushed ${totalEvents} trigger events`);
      } else if (totalFieldOptions > 0) {
        toast.success(`Refreshed field options (${totalFieldOptions} items)`);
      } else {
        toast.info('No new trigger events to push');
      }

      await fetchStatus();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Refresh failed';
      toast.error(`Failed to refresh triggers: ${error}`);
    } finally {
      setRefreshingTriggers(false);
    }
  };

  // Only render on desktop or when accessed via tunnel
  if (!isDesktopMode() && !isTunnelSite()) return null;

  // On tunnel sites, tunnel is always active (we're accessing through it)
  const tunnelActive = isTunnelSite() || !!tunnelStatus?.active;

  return (
    <div
      className="sm:rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        opacity: tunnelActive ? 1 : 0.6,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <SiIfttt size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                IFTTT Integration
              </div>
              <div
                className="text-sm mt-0.5 flex items-center flex-wrap gap-x-1.5"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                <span>
                  {tunnelActive
                    ? getSubtitle(loading, status?.connected)
                    : 'Start Remote Access to connect'}
                </span>
                {tunnelActive && status?.connected && (
                  <a
                    href={IFTTT_SERVICE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline whitespace-nowrap"
                    style={{ color: 'var(--monarch-orange)' }}
                  >
                    · Manage applets
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {tunnelActive && !loading && (
            <StatusBadge
              connected={!!status?.connected}
              tunnelActive={tunnelActive}
              onTest={handleTestConnection}
              onSync={handleRefreshTriggers}
              onDisconnect={handleDisconnect}
              onRefresh={handleRefreshStatus}
              testing={testing}
              syncing={refreshingTriggers}
              disconnecting={disconnecting}
              refreshing={refreshingStatus}
            />
          )}
        </div>

        {/* Queue status & Activity Log - divider line with small text */}
        {tunnelActive && status?.connected && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
            <div className="flex items-center justify-between">
              {status.pendingActions.length > 0 && (
                <div
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  <AlertTriangle size={12} style={{ color: 'var(--monarch-warning, #eab308)' }} />
                  <span>{status.pendingActions.length} queued</span>
                  <button
                    onClick={handleDrainQueue}
                    disabled={draining}
                    className="ml-1 font-medium hover:opacity-80 disabled:opacity-50"
                    style={{ color: 'var(--monarch-orange)' }}
                    type="button"
                  >
                    {draining ? 'Processing...' : 'Process now'}
                  </button>
                </div>
              )}
              <button
                onClick={() => setLogsModalOpen(true)}
                className="flex items-center gap-1 text-xs hover:opacity-80 ml-auto"
                style={{ color: 'var(--monarch-text-muted)' }}
                type="button"
              >
                <History size={12} />
                Activity
                {(() => {
                  // Show last refresh time, or fall back to most recent trigger event
                  const lastSyncTime =
                    lastRefreshResult?.timestamp ??
                    (triggerHistory[0]?.timestamp ? triggerHistory[0].timestamp * 1000 : null);
                  return lastSyncTime ? (
                    <span style={{ color: 'var(--monarch-text-muted)' }}>
                      · {formatRelativeTime(lastSyncTime)}
                    </span>
                  ) : null;
                })()}
              </button>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        <LogsModal
          isOpen={logsModalOpen}
          onClose={() => setLogsModalOpen(false)}
          actions={history}
          triggers={triggerHistory}
          lastRefreshResult={lastRefreshResult}
        />
      </div>
    </div>
  );
}
