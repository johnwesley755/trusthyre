/**
 * SEO URL Slug Helper for Job Postings.
 * Format: /job/:area-:title-:date-:id
 * Example: /job/chennai-guindy-electrician-02-nov-2026-e3a84355-ebf3-4374-92db-588744d3c321
 *
 * Shared backend slug generator identical to frontend implementation.
 * Uses NFD normalization, location inclusion, and UTC date formatting.
 */

export interface JobSlugParams {
  id: string;
  title?: string | null;
  city?: string | null;
  location?: string | null;
  created_at?: string | Date | null;
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
 */
export function extractJobIdFromSlug(slugOrId: string | undefined | null): string {
  if (!slugOrId) return '';
  const trimmed = slugOrId.trim();

  const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
  const match = trimmed.match(uuidRegex);
  if (match) {
    return match[0];
  }

  return trimmed;
}

export const ALLOWED_CITIES = [
  'chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'tiruppur', 
  'bengaluru', 'hyderabad', 'mumbai', 'pune', 'delhi', 'kolkata'
];
export const ALLOWED_TRADES = ['electrician', 'driver', 'cook', 'plumber', 'welder', 'security', 'warehouse'];

export interface DistrictTalukData {
  district: string;
  aliases: string[];
  taluks: string[];
}

export const REGIONAL_DISTRICTS_TALUKS: DistrictTalukData[] = [
  {
    district: 'Chennai',
    aliases: ['chennai', 'madras'],
    taluks: ['Guindy', 'Ambattur', 'Alandur', 'Egmore', 'Mylapore', 'Perambur', 'Tondiarpet', 'Velachery', 'Sholinganallur', 'Aminjikarai', 'Ayanavaram', 'Madhavaram', 'Thiruvottiyur', 'T. Nagar', 'Pallavaram', 'Perungudi', 'Thirumazhisai', 'Sriperumbudur']
  },
  {
    district: 'Coimbatore',
    aliases: ['coimbatore', 'kovai'],
    taluks: ['Gandhipuram', 'Peelamedu', 'Saravanampatti', 'Kurichi', 'Singanallur', 'Pollachi', 'Sulur', 'Mettupalayam', 'Annur', 'Kinathukadavu', 'Perur', 'Madukkarai', 'Valparai']
  },
  {
    district: 'Kanchipuram',
    aliases: ['kanchipuram', 'kancheepuram', 'sriperumbudur'],
    taluks: ['Sriperumbudur', 'Kanchipuram', 'Walajabad', 'Kundrathur', 'Uthiramerur']
  },
  {
    district: 'Chengalpattu',
    aliases: ['chengalpattu', 'chengalpet', 'tambaram', 'pallavaram'],
    taluks: ['Tambaram', 'Pallavaram', 'Chengalpattu', 'Vandalur', 'Thiruporur', 'Maduranthakam', 'Cheyyur']
  },
  {
    district: 'Tiruvallur',
    aliases: ['tiruvallur', 'thiruvallur', 'avadi', 'poonamallee'],
    taluks: ['Avadi', 'Poonamallee', 'Tiruvallur', 'Gummidipoondi', 'Ponneri', 'Tiruttani', 'Uthukkottai', 'Thirumazhisai']
  },
  {
    district: 'Madurai',
    aliases: ['madurai'],
    taluks: ['Madurai North', 'Madurai South', 'Madurai East', 'Madurai West', 'Melur', 'Thirumangalam', 'Vadipatti', 'Usilampatti', 'Peraiyur', 'Thiruparankundram', 'KK Nagar', 'Anna Nagar', 'Mattuthavani']
  },
  {
    district: 'Salem',
    aliases: ['salem'],
    taluks: ['Salem', 'Salem South', 'Salem West', 'Attur', 'Mettur', 'Omalur', 'Sankari', 'Yercaud', 'Gangavalli', 'Valapady', 'Kadayampatti', 'Edappadi', 'Fairlands', 'Suramangalam', 'Shevapet', 'Ammapet']
  },
  {
    district: 'Tiruchirappalli',
    aliases: ['tiruchirappalli', 'trichy'],
    taluks: ['Trichy East', 'Trichy West', 'Srirangam', 'Manapparai', 'Lalgudi', 'Thuraiyur', 'Musiri', 'Manachanallur', 'Thottiyam', 'Marungapuri', 'Thillai Nagar', 'Cantonment', 'KK Nagar']
  },
  {
    district: 'Tirupur',
    aliases: ['tirupur', 'tiruppur'],
    taluks: ['Tirupur North', 'Tirupur South', 'Avinashi', 'Palladam', 'Dharapuram', 'Udumalaipettai', 'Kangeyam', 'Madathukulam']
  },
  {
    district: 'Bengaluru',
    aliases: ['bengaluru', 'bangalore'],
    taluks: ['Whitefield', 'Electronic City', 'Peenya', 'Kengeri', 'Yelahanka', 'Anekal', 'Indiranagar', 'Koramangala', 'HSR Layout', 'BTM Layout', 'Marathahalli', 'Jayanagar', 'Hebbal', 'Rajajinagar']
  },
  {
    district: 'Hyderabad',
    aliases: ['hyderabad', 'secunderabad'],
    taluks: ['Madhapur', 'Gachibowli', 'Kukatpally', 'Ameerpet', 'Secunderabad', 'Balanagar', 'Charminar', 'Uppal', 'Malkajgiri', 'Hitec City', 'Jubilee Hills', 'Banjara Hills', 'Kondapur']
  },
  {
    district: 'Mumbai',
    aliases: ['mumbai', 'bombay', 'navi mumbai', 'thane'],
    taluks: ['Andheri', 'Bandra', 'Kurla', 'Borivali', 'Thane', 'Vashi', 'Belapur', 'Dadar', 'Panvel', 'Goregaon', 'Malad', 'Powai', 'Kandivali']
  },
  {
    district: 'Pune',
    aliases: ['pune'],
    taluks: ['Hinjawadi', 'Kothrud', 'Hadapsar', 'Viman Nagar', 'Wakad', 'Baner', 'Pimpri', 'Chinchwad', 'Shivajinagar']
  },
  {
    district: 'Delhi NCR',
    aliases: ['delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'faridabad', 'ghaziabad'],
    taluks: ['South Delhi', 'North Delhi', 'Gurugram', 'Noida', 'Greater Noida', 'Faridabad', 'Ghaziabad', 'Dwarka', 'Okhla', 'Connaught Place', 'Janakpuri', 'Rohini']
  },
  {
    district: 'Kolkata',
    aliases: ['kolkata', 'calcutta'],
    taluks: ['Salt Lake', 'New Town', 'Howrah', 'Park Street', 'Ballygunge', 'Dum Dum', 'Garia', 'Behala']
  }
];

export function getTaluksForCity(city: string | null | undefined): string[] {
  if (!city || !city.trim()) return [];
  const normalized = city.trim().toLowerCase();
  
  const found = REGIONAL_DISTRICTS_TALUKS.find(item => 
    item.district.toLowerCase() === normalized ||
    item.aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))
  );

  return found ? found.taluks : [];
}

/**
 * Normalizes an area/taluk name into a clean URL slug
 * (e.g., 'T. Nagar' -> 't-nagar', 'Whitefield' -> 'whitefield')
 */
export function slugifyNeighborhood(area: string): string {
  return sanitizeSlugPart(area);
}

/**
 * Resolves whether an area/taluk is valid for a given city across India.
 */
export function isValidNeighborhoodForCity(city: string, neighborhoodSlug: string): { valid: boolean; areaName: string } {
  const normCity = (city || '').trim().toLowerCase();
  const normSlug = (neighborhoodSlug || '').trim().toLowerCase().replace(/-jobs$/, '');
  
  const taluks = getTaluksForCity(normCity);
  for (const t of taluks) {
    if (slugifyNeighborhood(t) === normSlug) {
      return { valid: true, areaName: t };
    }
  }

  return { valid: false, areaName: normSlug.charAt(0).toUpperCase() + normSlug.slice(1) };
}

/**
 * Builds the canonical hierarchical Job URL:
 * /:city/:title-slug/job/:id
 * Example: /chennai/electrician-in-guindy/job/e3a84355-ebf3-4374-92db-588744d3c321
 */
export function generateHierarchicalJobUrl(job: JobSlugParams): string {
  if (!job || !job.id) return '';
  const city = sanitizeSlugPart(job.city || 'chennai') || 'chennai';
  const area = sanitizeSlugPart(job.location || '');
  const title = sanitizeSlugPart(job.title || 'opening');
  
  const titleParts: string[] = [];
  if (title) titleParts.push(title);
  if (area && area !== city) titleParts.push(`in-${area}`);
  const titleSlug = titleParts.filter(Boolean).join('-') || 'opening';

  return `/${city}/${titleSlug}/job/${job.id}`;
}

export const TRADE_KEYWORD_MAP: Record<string, string[]> = {
  electrician: ['electrician', 'wireman', 'electrical'],
  driver: ['driver', 'delivery', 'chauffeur'],
  cook: ['cook', 'chef', 'kitchen'],
  plumber: ['plumber', 'plumbing', 'pipe'],
  welder: ['welder', 'fabricator', 'welding'],
  security: ['security', 'guard', 'watchman'],
  warehouse: ['warehouse', 'packing', 'picker', 'loader', 'logistics'],
};


