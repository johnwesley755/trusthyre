const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&ndash;': '–',
  '&mdash;': '—',
  '&bull;': '•',
};

/**
 * Strips HTML formatting while preserving paragraph breaks and clean plain-text readability.
 * Used for sanitizing scraped job postings, emails, and external requisitions.
 */
export function sanitizeHtmlDescription(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';

  return html
    // Convert line breaks and paragraph ends to newlines
    .replace(/<(?:br\s*\/?>|\/p>|\/div>|\/li>|\/tr>)/gi, '\n')
    // Convert list items to bullet points
    .replace(/<li[^>]*>/gi, '• ')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Unescape common HTML entities
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39|apos|ndash|mdash|bull);/gi, (match) => {
      return HTML_ENTITY_MAP[match.toLowerCase()] || match;
    })
    // Decode numerical entities (e.g. &#160;)
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    // Normalize multiple spaces per line
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    // Collapse 3+ consecutive blank lines to 2
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

