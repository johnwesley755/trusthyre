import sanitizeHtml from 'sanitize-html';

export interface SanitizeResult {
  isValid: boolean;
  sanitizedHtml: string;
  violations: string[];
}

/**
 * Strict email-safe allowlist tags according to RFC and major email client compatibility
 * (Gmail, Outlook, Apple Mail, Yahoo).
 */
const EMAIL_SAFE_ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'body', 'br', 'center', 'div', 'em', 'font',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'html', 'i', 'img',
  'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strike', 'strong',
  'style', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'title', 'tr', 'u', 'ul', 'meta'
];

/**
 * Permitted attributes on HTML elements.
 * JavaScript event handlers (onclick, onload, onerror) are strictly disallowed.
 */
const EMAIL_SAFE_ALLOWED_ATTRIBUTES = {
  '*': ['style', 'class', 'id', 'align', 'valign', 'width', 'height', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'dir', 'lang'],
  a: ['href', 'name', 'target', 'title', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'border', 'style'],
  table: ['border', 'cellpadding', 'cellspacing', 'width', 'align', 'bgcolor', 'role', 'summary', 'style'],
  td: ['align', 'valign', 'width', 'height', 'colspan', 'rowspan', 'bgcolor', 'style'],
  th: ['align', 'valign', 'width', 'height', 'colspan', 'rowspan', 'bgcolor', 'scope', 'style'],
  meta: ['http-equiv', 'content', 'name', 'charset'],
  font: ['color', 'face', 'size'],
};

/**
 * Validates and sanitizes email HTML source.
 * Enforces email-safe markup, removes executable JavaScript, and strips hostile event handlers.
 */
export function validateAndSanitizeEmailHtml(html: string): SanitizeResult {
  const violations: string[] = [];

  if (!html || typeof html !== 'string') {
    return {
      isValid: false,
      sanitizedHtml: '',
      violations: ['HTML content is required.'],
    };
  }

  // Pre-scan for banned executable components
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(html)) {
    violations.push('Execution of <script> tags is forbidden in email templates.');
  }

  if (/\bon\w+\s*=/i.test(html)) {
    violations.push('Inline JavaScript event handlers (onclick, onerror, onload, etc.) are forbidden.');
  }

  if (/javascript\s*:/i.test(html)) {
    violations.push('Executable javascript: URIs are forbidden.');
  }

  if (/<iframe|<object|<embed|<form|<input|<button/i.test(html)) {
    violations.push('Interactive form/embed tags (<iframe, <object, <embed, <form, <button) are not permitted in transactional email.');
  }

  const sanitized = sanitizeHtml(html, {
    allowedTags: EMAIL_SAFE_ALLOWED_TAGS,
    allowedAttributes: EMAIL_SAFE_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    allowVulnerableTags: true,
  });

  return {
    isValid: violations.length === 0,
    sanitizedHtml: sanitized,
    violations,
  };
}
