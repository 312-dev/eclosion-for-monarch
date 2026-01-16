/**
 * Formatting Utilities
 *
 * Centralized formatting functions for currency, dates, and frequencies.
 * Eliminates duplication across RecurringList, RollupZone, and ReadyToAssign.
 */

/**
 * Format a number as USD currency.
 *
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  amount: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const maxDigits = options?.maximumFractionDigits ?? 2;
  const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(amount);
}

/**
 * Frequency labels for display.
 */
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Every week',
  every_two_weeks: 'Every 2 weeks',
  twice_a_month: 'Twice a month',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  semiyearly: 'Every 6 months',
  yearly: 'Every year',
};

/**
 * Short frequency labels for compact display.
 */
export const FREQUENCY_SHORT_LABELS: Record<string, string> = {
  weekly: ' every week',
  every_two_weeks: ' every 2 wks',
  twice_a_month: ' 2x/mo',
  monthly: ' every month',
  quarterly: ' every 3 mo',
  semiyearly: ' every 6 mo',
  'semi-annual': ' every 6 mo',
  semiannual: ' every 6 mo',
  yearly: ' every year',
  annual: ' every year',
};

/**
 * Frequency sort order (most frequent first).
 */
export const FREQUENCY_ORDER: Record<string, number> = {
  weekly: 1,
  every_two_weeks: 2,
  twice_a_month: 3,
  monthly: 4,
  quarterly: 5,
  semiyearly: 6,
  yearly: 7,
};

/**
 * Format a frequency string for display.
 *
 * @param freq - The frequency key (e.g., "monthly", "yearly")
 * @returns Human-readable frequency (e.g., "Every month")
 */
export function formatFrequency(freq: string): string {
  return FREQUENCY_LABELS[freq] || freq;
}

/**
 * Format a frequency string in short form.
 *
 * @param freq - The frequency key (e.g., "monthly", "yearly")
 * @returns Short frequency label (e.g., "monthly", "annually")
 */
export function formatFrequencyShort(freq: string): string {
  return FREQUENCY_SHORT_LABELS[freq] || freq;
}

/**
 * Result of relative date formatting.
 */
export interface RelativeDateResult {
  /** Formatted date string (e.g., "Jan 15" or "Jan 15 '25") */
  date: string;
  /** Relative time string in shorthand (e.g., "in 5d", "Tomorrow", "3d ago") */
  relative: string;
}

/**
 * Format a date string with both absolute and relative representations.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Object with formatted date and relative time
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- Date formatting requires many time-range cases
export function formatDateRelative(dateStr: string): RelativeDateResult {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Format date - include year with apostrophe if different year
  const currentYear = today.getFullYear();
  const dateYear = date.getFullYear();
  let formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dateYear !== currentYear) {
    formatted += ` '${String(dateYear).slice(-2)}`;
  }

  let relative = '';
  if (diffDays === 0) {
    relative = 'Today';
  } else if (diffDays === 1) {
    relative = 'Tomorrow';
  } else if (diffDays === -1) {
    relative = '1 day ago';
  } else if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays < 7) {
      relative = `${absDays} days ago`;
    } else if (absDays < 30) {
      const weeks = Math.round(absDays / 7);
      relative = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (absDays < 365) {
      const months = Math.round(absDays / 30);
      relative = months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.round(absDays / 365);
      relative = years === 1 ? '1 year ago' : `${years} years ago`;
    }
  } else if (diffDays < 7) {
    relative = `in ${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    relative = weeks === 1 ? 'in 1 week' : `in ${weeks} weeks`;
  } else if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    relative = months === 1 ? 'in 1 month' : `in ${months} months`;
  } else {
    const years = Math.round(diffDays / 365);
    relative = years === 1 ? 'in 1 year' : `in ${years} years`;
  }

  return { date: formatted, relative };
}

/**
 * Format a number as a percentage.
 *
 * @param value - The value to format (0-100 or 0-1 depending on isDecimal)
 * @param isDecimal - If true, treats value as decimal (0-1), otherwise as percentage (0-100)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercent(value: number, isDecimal = false): string {
  const percent = isDecimal ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

/**
 * Format a date string for due date display.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date (e.g., "Jan 15" or "Jan 15, 2025" if different year)
 */
export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const sameYear = date.getFullYear() === today.getFullYear();

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Format a date string for compact display.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date (e.g., "Jan 15")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format an interval in minutes for display.
 *
 * @param minutes - Interval in minutes
 * @returns Human-readable interval (e.g., "6 hours", "30 minutes")
 */
export function formatInterval(minutes: number): string {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/**
 * Format an ISO datetime string for display.
 *
 * @param isoString - ISO datetime string or null
 * @returns Formatted datetime (e.g., "Jan 15, 2025 at 3:45 PM") or "Never"
 */
export function formatDateTime(isoString: string | null): string {
  if (!isoString) return 'Never';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Map of common HTML entity names to their character equivalents.
 * Covers the most frequently used entities in text content.
 */
const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  copy: '©',
  reg: '®',
  trade: '™',
  mdash: '—',
  ndash: '–',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
  bull: '•',
  hellip: '…',
};

/**
 * Decode HTML entities in a string.
 *
 * Handles common named entities (&amp;, &lt;, etc.) and numeric entities
 * (&#39;, &#x27;). Uses a pure JavaScript implementation to avoid XSS
 * concerns from DOM-based decoding.
 *
 * @param text - String potentially containing HTML entities
 * @returns Decoded string with entities replaced by actual characters
 */
export function decodeHtmlEntities(text: string): string {
  if (!text?.includes('&')) return text;

  return text.replaceAll(/&(#?\w+);/g, (match, entity: string) => {
    // Numeric entity: &#123; or &#x7B;
    if (entity.startsWith('#')) {
      const code = entity.startsWith('#x')
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    // Named entity: &amp;, &lt;, etc.
    return HTML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Regex pattern to match leading emoji(s) at the start of a string.
 * Matches common emoji patterns including:
 * - Basic emoji (single codepoint)
 * - Emoji with variation selectors (e.g., ❤️)
 * - Emoji with skin tone modifiers (e.g., 👋🏻)
 * - Compound emoji with ZWJ (e.g., 👨‍👩‍👧, 👨🏻‍💻)
 * - Keycap emoji (e.g., 0️⃣, #️⃣, *️⃣)
 * - Flag emoji (regional indicator pairs, e.g., 🇺🇸)
 * - Tag sequence flags (e.g., 🏴󠁧󠁢󠁥󠁮󠁧󠁿)
 *
 * Unicode ranges used:
 * - Skin tone modifiers: U+1F3FB-1F3FF
 * - Regional indicators: U+1F1E6-1F1FF
 * - Tag characters: U+E0020-E007F (with U+E007F as terminator)
 */
const LEADING_EMOJI_REGEX = new RegExp(
  '^(' +
    // Keycap sequences: digit/hash/asterisk + optional variation selector + combining enclosing keycap
    '[\\d#*]\\uFE0F?\\u20E3|' +
    // Flag emoji: pair of regional indicator symbols
    '[\\u{1F1E6}-\\u{1F1FF}]{2}|' +
    // Tag sequence (subdivision flags): base + tag chars + terminator
    '\\u{1F3F4}[\\u{E0020}-\\u{E007E}]+\\u{E007F}|' +
    // Standard emoji (presentation or with variation selector) + optional skin tone
    '(?:\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F)[\\u{1F3FB}-\\u{1F3FF}]?' +
    ')' +
    // ZWJ sequences: zero-width joiner + emoji element (with optional skin tone), repeated
    '(?:\\u200D(?:\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F)[\\u{1F3FB}-\\u{1F3FF}]?)*',
  'u'
);

/**
 * Add a space after leading emoji if one doesn't exist.
 *
 * Monarch category names often have emojis directly concatenated with the name
 * (e.g., "🙏Dining Out"). This function adds proper spacing for display.
 *
 * @param text - String that may start with an emoji
 * @returns String with space added after leading emoji, or original if no emoji or already spaced
 */
export function spacifyEmoji(text: string): string {
  if (!text) return text;

  const match = LEADING_EMOJI_REGEX.exec(text);
  if (!match) return text;

  const emoji = match[0];
  const rest = text.slice(emoji.length);

  // Already has a space after emoji
  if (rest.startsWith(' ')) return text;

  // No text after emoji
  if (!rest) return text;

  return `${emoji} ${rest}`;
}
