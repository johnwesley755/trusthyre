const HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  ndash: '–',
  mdash: '—',
  bull: '•',
};

/**
 * Strips HTML formatting and converts entities safely without regex tag nesting or double escaping.
 * Fully compliant with CodeQL rules:
 * - js/incomplete-multi-character-sanitization
 * - js/double-escaping
 */
export function sanitizeHtmlDescription(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Replace block line breaks before character iteration
  const withLineBreaks = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr)>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');

  // 2. Character-by-character tag stripping (avoids RegExp incomplete multi-character match alert)
  let cleanText = '';
  let insideTag = false;

  for (let i = 0; i < withLineBreaks.length; i++) {
    const char = withLineBreaks[i];
    if (char === '<') {
      insideTag = true;
    } else if (char === '>') {
      insideTag = false;
    } else if (!insideTag) {
      cleanText += char;
    }
  }

  // 3. Single-pass entity replacement callback (prevents CWE-116 double unescaping alert)
  const unescaped = cleanText.replace(/&([a-zA-Z0-9#]+);/g, (match, entity) => {
    const lower = entity.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(HTML_ENTITIES, lower)) {
      return HTML_ENTITIES[lower];
    }
    if (lower.startsWith('#x')) {
      const hex = parseInt(lower.slice(2), 16);
      return !isNaN(hex) ? String.fromCharCode(hex) : match;
    }
    if (lower.startsWith('#')) {
      const dec = parseInt(lower.slice(1), 10);
      return !isNaN(dec) ? String.fromCharCode(dec) : match;
    }
    return match;
  });

  // 4. Normalize spacing
  return unescaped
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

