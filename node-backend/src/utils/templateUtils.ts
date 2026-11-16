/**
 * Utility functions for email template parameter handling, safe regex escaping,
 * and string interpolation.
 */

/**
 * Escapes any special regular expression metacharacters in a string.
 * Prevents regex injection and syntax errors when building dynamic RegExps from variable keys.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely interpolates dynamic `{{params.variableName}}` placeholders into HTML or text.
 * Uses a functional replacer to prevent JavaScript's String.prototype.replace pattern
 * expansion (e.g., $$, $1, $&, $'), ensuring values like '$1500' or reset tokens with '$'
 * are rendered 100% literally without leaking strings or corrupting HTML.
 */
export function interpolateTemplate(content: string, params: Record<string, any> = {}): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let result = content;

  for (const [key, val] of Object.entries(params)) {
    if (!key) continue;
    const escapedKey = escapeRegExp(key);
    // Matches {{params.varName}} with optional surrounding whitespace
    const regex = new RegExp(`{{\\s*params\\.${escapedKey}\\s*}}`, 'g');
    const safeStringVal = val !== undefined && val !== null ? String(val) : '';
    // Replacer function avoids special '$' character replacement interpretation
    result = result.replace(regex, () => safeStringVal);
  }

  return result;
}

/**
 * Scans template content and extracts all declared variable names from {{params.xyz}} placeholders.
 */
export function extractTemplatePlaceholders(content: string): string[] {
  if (!content || typeof content !== 'string') return [];
  const matches = content.matchAll(/{{\s*params\.([a-zA-Z0-9_]+)\s*}}/g);
  const found = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  return Array.from(found);
}
