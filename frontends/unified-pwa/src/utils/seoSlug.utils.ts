/**
 * SEO URL Slug Helper for Job Postings.
 * Format: /job/:area-:title-:date-:id
 * Example: /job/chennai-guindy-electrician-02-nov-2026-e3a84355-ebf3-4374-92db-588744d3c321
 *
 * This provides massive SEO ranking boosts on Google for location + trade keywords,
 * while safely retaining the unique UUID at the end for instantaneous database lookup.
 */

export interface JobSlugParams {
  id?: string;
  title?: string;
  city?: string;
  location?: string;
  created_at?: string | Date;
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function sanitizeSlugPart(text: string): string {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')     // replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
    .substring(0, 40);               // cap length
}

export function generateJobSeoSlug(job: JobSlugParams): string {
  if (!job || !job.id) return '';

  const parts: string[] = [];

  // 1. City / Location
  const city = sanitizeSlugPart(job.city || '');
  const area = sanitizeSlugPart(job.location || '');
  if (city) parts.push(city);
  if (area && area !== city) parts.push(area);

  // 2. Title / Role
  const title = sanitizeSlugPart(job.title || 'opening');
  if (title) parts.push(title);

  // 3. Formatted Date in UTC (e.g. 02-nov-2026)
  if (job.created_at) {
    try {
      const d = new Date(job.created_at);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const mmm = MONTH_NAMES[d.getUTCMonth()] || 'nov';
        const yyyy = d.getUTCFullYear();
        parts.push(`${dd}-${mmm}-${yyyy}`);
      }
    } catch {
      // ignore
    }
  }

  // 4. Trailing UUID (always 36 characters)
  const slugPrefix = parts.filter(Boolean).join('-');
  return slugPrefix ? `${slugPrefix}-${job.id}` : job.id;
}

/**
 * Extracts the 36-char UUID from a slug or direct ID string.
 * Supports:
 * - Direct UUID: 'e3a84355-ebf3-4374-92db-588744d3c321'
 * - SEO Slug: 'chennai-guindy-electrician-02-nov-2026-e3a84355-ebf3-4374-92db-588744d3c321'
 */
export function extractJobIdFromSlug(slugOrId: string | undefined): string {
  if (!slugOrId) return '';
  const trimmed = slugOrId.trim();

  // Match UUID regex at the end or exact
  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  const match = trimmed.match(uuidRegex);
  if (match) {
    return match[0];
  }

  return trimmed;
}

