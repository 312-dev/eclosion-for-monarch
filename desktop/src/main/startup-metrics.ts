/**
 * Startup Performance Metrics
 *
 * Measures and tracks startup performance to detect regressions.
 * Records timestamps at key points and calculates durations.
 */

import { getStore, type MetricsHistoryEntry } from './store';
import { debugLog } from './logger';

// Re-export MetricsHistoryEntry from store for backwards compatibility
export type { MetricsHistoryEntry } from './store';

/**
 * Store key for historical metrics.
 */
const METRICS_HISTORY_KEY = 'startup.metricsHistory' as const;
const MAX_HISTORY_ENTRIES = 50;

/**
 * Startup timing milestones.
 */
export interface StartupMilestones {
  processStart: number;
  appReady?: number;
  backendStarting?: number;
  backendStarted?: number;
  windowCreated?: number;
  initialized?: number;
}

/**
 * Calculated startup metrics.
 */
export interface StartupMetrics {
  /** Total time from process start to fully initialized (ms) */
  totalStartup: number;
  /** Time from process start to app ready (ms) */
  appReady: number;
  /** Time to start the backend (ms) */
  backendStart: number;
  /** Time to create the window (ms) */
  windowCreate: number;
  /** Time from window create to fully initialized (ms) */
  postWindow: number;
  /** ISO timestamp of when this metric was recorded */
  timestamp: string;
  /** App version */
  version: string;
}

// MetricsHistoryEntry is now imported from ./store

/**
 * Current session's milestones.
 */
const milestones: StartupMilestones = {
  processStart: Date.now(),
};

/**
 * Record a milestone timestamp.
 */
export function recordMilestone(name: keyof Omit<StartupMilestones, 'processStart'>): void {
  milestones[name] = Date.now();
  debugLog(`Startup milestone: ${name} at ${Date.now() - milestones.processStart}ms`);
}

/**
 * Calculate metrics from milestones.
 */
export function calculateMetrics(version: string): StartupMetrics | null {
  if (!milestones.initialized) {
    return null;
  }

  const processStart = milestones.processStart;

  return {
    totalStartup: milestones.initialized - processStart,
    appReady: (milestones.appReady ?? processStart) - processStart,
    backendStart: milestones.backendStarted && milestones.backendStarting
      ? milestones.backendStarted - milestones.backendStarting
      : 0,
    windowCreate: milestones.windowCreated && milestones.backendStarted
      ? milestones.windowCreated - milestones.backendStarted
      : 0,
    postWindow: milestones.initialized && milestones.windowCreated
      ? milestones.initialized - milestones.windowCreated
      : 0,
    timestamp: new Date().toISOString(),
    version,
  };
}

/**
 * Save metrics to history.
 */
export function saveMetricsToHistory(metrics: StartupMetrics): void {
  const history = getStore().get(METRICS_HISTORY_KEY, []);

  const entry: MetricsHistoryEntry = {
    ...metrics,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };

  history.push(entry);

  // Keep only the last MAX_HISTORY_ENTRIES
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.splice(0, history.length - MAX_HISTORY_ENTRIES);
  }

  getStore().set(METRICS_HISTORY_KEY, history);
  debugLog(`Saved startup metrics: ${metrics.totalStartup}ms total`);
}

/**
 * Get metrics history.
 */
export function getMetricsHistory(): MetricsHistoryEntry[] {
  return getStore().get(METRICS_HISTORY_KEY, []);
}

/**
 * Clear metrics history.
 */
export function clearMetricsHistory(): void {
  getStore().delete(METRICS_HISTORY_KEY);
  debugLog('Cleared startup metrics history');
}

/**
 * Get average metrics from history.
 */
export function getAverageMetrics(): Partial<StartupMetrics> | null {
  const history = getMetricsHistory();
  if (history.length === 0) {
    return null;
  }

  const sum = history.reduce(
    (acc, entry) => ({
      totalStartup: acc.totalStartup + entry.totalStartup,
      appReady: acc.appReady + entry.appReady,
      backendStart: acc.backendStart + entry.backendStart,
      windowCreate: acc.windowCreate + entry.windowCreate,
      postWindow: acc.postWindow + entry.postWindow,
    }),
    { totalStartup: 0, appReady: 0, backendStart: 0, windowCreate: 0, postWindow: 0 }
  );

  const count = history.length;
  return {
    totalStartup: Math.round(sum.totalStartup / count),
    appReady: Math.round(sum.appReady / count),
    backendStart: Math.round(sum.backendStart / count),
    windowCreate: Math.round(sum.windowCreate / count),
    postWindow: Math.round(sum.postWindow / count),
  };
}

/**
 * Get current session's milestones (for diagnostics).
 */
export function getCurrentMilestones(): StartupMilestones {
  return { ...milestones };
}

/**
 * Finalize metrics and save to history.
 * Call this after initialization is complete.
 */
export function finalizeStartupMetrics(version: string): StartupMetrics | null {
  const metrics = calculateMetrics(version);
  if (metrics) {
    saveMetricsToHistory(metrics);
    logMetricsSummary(metrics);
  }
  return metrics;
}

/**
 * Log a summary of startup metrics.
 */
function logMetricsSummary(metrics: StartupMetrics): void {
  debugLog('=== Startup Performance ===');
  debugLog(`Total: ${metrics.totalStartup}ms`);
  debugLog(`  App Ready: ${metrics.appReady}ms`);
  debugLog(`  Backend Start: ${metrics.backendStart}ms`);
  debugLog(`  Window Create: ${metrics.windowCreate}ms`);
  debugLog(`  Post-Window: ${metrics.postWindow}ms`);
  debugLog('===========================');

  // Check for regression (compare to average)
  const avgMetrics = getAverageMetrics();
  if (avgMetrics && avgMetrics.totalStartup) {
    const diff = metrics.totalStartup - avgMetrics.totalStartup;
    const percentDiff = Math.round((diff / avgMetrics.totalStartup) * 100);
    if (percentDiff > 20) {
      debugLog(`WARNING: Startup ${percentDiff}% slower than average (${avgMetrics.totalStartup}ms)`);
    } else if (percentDiff < -20) {
      debugLog(`Startup ${Math.abs(percentDiff)}% faster than average (${avgMetrics.totalStartup}ms)`);
    }
  }
}

/**
 * Get formatted metrics for display.
 */
export function getFormattedMetrics(): {
  current: StartupMetrics | null;
  average: Partial<StartupMetrics> | null;
  history: MetricsHistoryEntry[];
} {
  const history = getMetricsHistory();
  const current = history.length > 0 ? history[history.length - 1] : null;
  const average = getAverageMetrics();

  return { current, average, history };
}
