/**
 * Sanitize open redirect URLs (CWE-601 Prevention).
 * Ensures that redirect targets are strictly relative, non-protocol, safe application routes.
 */
export const sanitizeRedirectUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '/search';
  const trimmed = url.trim();

  // Reject external protocols, protocol-relative, javascript:, data: or control chars
  if (
    /^(?:[a-z]+:|\/\/)/i.test(trimmed) ||
    /^[/\\]{2,}/.test(trimmed) ||
    /[\r\n\t]/.test(trimmed)
  ) {
    return '/search';
  }

  // Must start with a single "/"
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/search';
  }

  // Whitelist safe in-app relative patterns: /job/:id, /jobs/:id, /search, /tracker, /dashboard
  // Optional query parameters like ?action=apply
  const isSafePath = /^\/(?:job\/[a-zA-Z0-9_\-]+|jobs\/[a-zA-Z0-9_\-]+|search(?:\?[\w=&%-]*)?|find-workers|dashboard|tracker)(?:\?[\w=&%-]*)?$/.test(trimmed);

  return isSafePath ? trimmed : '/search';
};
