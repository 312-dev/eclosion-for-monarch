/**
 * Utility Functions
 *
 * Re-exports all utility functions for convenient importing.
 *
 * Usage:
 *   import { formatCurrency, getStatusLabel } from '../utils';
 */

export {
  formatCurrency,
  formatFrequency,
  formatFrequencyShort,
  formatDateRelative,
  formatPercent,
  formatDueDate,
  formatDate,
  formatInterval,
  formatDateTime,
  decodeHtmlEntities,
  spacifyEmoji,
  FREQUENCY_LABELS,
  FREQUENCY_SHORT_LABELS,
  FREQUENCY_ORDER,
  type RelativeDateResult,
} from './formatters';

export { getErrorMessage, handleApiError, isRateLimitError, getRetryAfter } from './errors';

export {
  getStatusLabel,
  getStatusStyles,
  getStatusStylesExtended,
  calculateDisplayStatus,
  isAttentionStatus,
  isHealthyStatus,
  type StatusStyles,
  type StatusStylesExtended,
} from './status';

export {
  isBetaEnvironment,
  getDocsBaseUrl,
  getDocsUrl,
  getSiteBaseUrl,
  setBetaModeOverride,
  getBetaModeOverride,
} from './environment';

export { evaluateMathExpression } from './mathEvaluator';

export { getNormalizationDate, calculateMonthlyTarget } from './calculations';

export {
  buildCategoryGroupsWithNotes,
  convertEffectiveGeneralNote,
  hasAnyNotes,
} from './notesTransform';

export { sanitizeHtml } from './sanitizeHtml';

export { isSafeUrl, getSafeHref } from './safeUrl';
