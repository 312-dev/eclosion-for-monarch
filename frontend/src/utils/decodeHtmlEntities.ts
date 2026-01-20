/**
 * Decode HTML entities in strings.
 *
 * The API sanitizes responses with HTML encoding for XSS protection (CodeQL requirement).
 * This function decodes those entities for display in React components.
 *
 * Common entities decoded:
 * - &#39; or &apos; -> ' (apostrophe)
 * - &amp; -> & (ampersand)
 * - &lt; -> < (less than)
 * - &gt; -> > (greater than)
 * - &quot; -> " (quote)
 *
 * Uses a map-based approach instead of innerHTML to satisfy CodeQL security requirements.
 */

// Map of common HTML entities to their decoded characters
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&copy;': '\u00A9', // ©
  '&reg;': '\u00AE', // ®
  '&trade;': '\u2122', // ™
  '&ndash;': '\u2013', // –
  '&mdash;': '\u2014', // —
  '&lsquo;': '\u2018', // '
  '&rsquo;': '\u2019', // '
  '&ldquo;': '\u201C', // "
  '&rdquo;': '\u201D', // "
  '&hellip;': '\u2026', // …
};

// Regex to match numeric entities (&#123; or &#x1a;)
const NUMERIC_ENTITY_REGEX = /&#(\d+);|&#x([0-9a-fA-F]+);/g;

// Regex to match named entities
const NAMED_ENTITY_REGEX = /&[a-zA-Z0-9]+;/g;

/**
 * Decode a single HTML numeric entity to its character.
 */
function decodeNumericEntity(match: string, decimal: string, hex: string): string {
  const codePoint = decimal ? Number.parseInt(decimal, 10) : Number.parseInt(hex, 16);
  // Validate code point is in valid Unicode range and not a control character
  if (codePoint >= 0x20 && codePoint <= 0x10ffff && codePoint !== 0x7f) {
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return match; // Invalid code point, return original
    }
  }
  return match; // Invalid or control character, return original
}

export function decodeHtmlEntities(text: string): string {
  let decoded = text;
  let previous = '';

  // Decode repeatedly until stable (handles double-encoded entities like &amp;#39;)
  // Limit iterations to prevent infinite loops
  let iterations = 0;
  const maxIterations = 5;

  while (decoded !== previous && iterations < maxIterations) {
    previous = decoded;
    iterations++;

    // Decode numeric entities first
    decoded = decoded.replaceAll(NUMERIC_ENTITY_REGEX, decodeNumericEntity);

    // Decode named entities
    decoded = decoded.replaceAll(NAMED_ENTITY_REGEX, (match) => {
      return HTML_ENTITIES[match] ?? match;
    });
  }

  return decoded;
}
