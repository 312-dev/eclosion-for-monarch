/**
 * Parser Utilities
 *
 * Shared utilities for bookmark parsers.
 */

/**
 * Decode HTML entities in bookmark titles.
 * Browser page titles sometimes contain entities like &#39; (apostrophe).
 */
export function decodeHtmlEntities(text: string): string {
  // Named entities
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  let decoded = text;

  // Replace named entities
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.split(entity).join(char);
  }

  // Replace numeric entities (decimal: &#39; and hex: &#x27;)
  decoded = decoded.replaceAll(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
  decoded = decoded.replaceAll(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

  return decoded;
}
