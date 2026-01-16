/**
 * HTML Sanitization Utilities
 *
 * Simple HTML sanitizer for rendering external HTML content safely.
 * Strips potentially dangerous tags and attributes while preserving formatting.
 */

/**
 * Allowed HTML tags for sanitized content.
 * These are safe formatting tags commonly used in rendered markdown.
 */
const ALLOWED_TAGS = new Set([
  'p',
  'div',
  'span',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
]);

/**
 * Allowed attributes for specific tags.
 */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

/**
 * Attributes allowed on all tags (for styling).
 */
const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['class', 'id']);

/**
 * Checks if a URL is safe (not javascript:, data:, etc.)
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  // Allow relative URLs, http, https, and mailto
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('mailto:')) return true;
  // Block javascript:, data:, vbscript:, etc.
  return !trimmed.includes(':');
}

/**
 * Sanitizes an HTML string by removing dangerous tags and attributes.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering with dangerouslySetInnerHTML
 *
 * @example
 * const safe = sanitizeHtml('<script>alert("xss")</script><p>Hello</p>');
 * // Returns: '<p>Hello</p>'
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Use DOMParser for proper HTML parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Recursively sanitize nodes
  // eslint-disable-next-line sonarjs/cognitive-complexity -- Security-critical: must check all node types and attributes
  function sanitizeNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Remove disallowed tags entirely
    if (!ALLOWED_TAGS.has(tagName)) {
      // For disallowed tags, just return their text content
      const fragment = doc.createDocumentFragment();
      for (const child of Array.from(element.childNodes)) {
        const sanitized = sanitizeNode(child);
        if (sanitized) fragment.appendChild(sanitized);
      }
      return fragment;
    }

    // Create new element with only allowed attributes
    const newElement = doc.createElement(tagName);
    const allowedAttrs = ALLOWED_ATTRIBUTES[tagName];

    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase();

      // Skip event handlers
      if (attrName.startsWith('on')) continue;

      // Check if attribute is allowed
      const isAllowed = GLOBAL_ALLOWED_ATTRIBUTES.has(attrName) || allowedAttrs?.has(attrName);
      if (!isAllowed) continue;

      // Validate URL attributes
      if (attrName === 'href' || attrName === 'src') {
        if (!isSafeUrl(attr.value)) continue;
      }

      newElement.setAttribute(attrName, attr.value);
    }

    // Add safety attributes to links
    if (tagName === 'a') {
      newElement.setAttribute('rel', 'noopener noreferrer');
    }

    // Recursively sanitize children
    for (const child of Array.from(element.childNodes)) {
      const sanitized = sanitizeNode(child);
      if (sanitized) newElement.appendChild(sanitized);
    }

    return newElement;
  }

  // Sanitize the body content
  const fragment = doc.createDocumentFragment();
  for (const child of Array.from(doc.body.childNodes)) {
    const sanitized = sanitizeNode(child);
    if (sanitized) fragment.appendChild(sanitized);
  }

  // Convert back to HTML string
  const container = doc.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}
