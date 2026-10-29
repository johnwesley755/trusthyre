export interface TradeCoverPreset {
  id: string;
  label: string;
  industry: string;
  url: string;
}

export const TRADE_COVER_PRESETS: TradeCoverPreset[] = [
  {
    id: 'electrical',
    label: 'Electrical & Power',
    industry: 'ELECTRICAL',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'logistics',
    label: 'Delivery & Logistics',
    industry: 'LOGISTICS',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'construction',
    label: 'Construction & Masonry',
    industry: 'CONSTRUCTION',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'plumbing',
    label: 'Plumbing & Pipefitting',
    industry: 'PLUMBING',
    url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cooking',
    label: 'Commercial Kitchen & Chef',
    industry: 'COOKING_CHEF',
    url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'maintenance',
    label: 'Facility Maintenance & Repair',
    industry: 'MAINTENANCE',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'hospitality',
    label: 'Hospitality & Hotel Staff',
    industry: 'HOSPITALITY',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'domestic_help',
    label: 'Housekeeping & Cleaning',
    industry: 'DOMESTIC_HELP',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'security',
    label: 'Security & Surveillance',
    industry: 'SECURITY',
    url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing & Fabrication',
    industry: 'MANUFACTURING',
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80',
  },
];

/**
 * Resolves a default high-resolution trade banner based on job title and industry keyword analysis.
 */
export const resolveTradeCover = (title?: string, industry?: string): string => {
  const normIndustry = (industry || '').trim().toUpperCase();
  const text = `${title || ''} ${industry || ''}`.toLowerCase();

  // 1. Direct match by industry code
  if (normIndustry === 'ELECTRICAL' || text.includes('electr') || text.includes('wire') || text.includes('power')) {
    return TRADE_COVER_PRESETS[0].url; // Electrical
  }
  if (normIndustry === 'LOGISTICS' || text.includes('driv') || text.includes('deliver') || text.includes('logist') || text.includes('cargo') || text.includes('vehicle') || text.includes('courier')) {
    return TRADE_COVER_PRESETS[1].url; // Logistics & Delivery
  }
  if (normIndustry === 'CONSTRUCTION' || text.includes('construct') || text.includes('mason') || text.includes('carpenter') || text.includes('build') || text.includes('weld')) {
    return TRADE_COVER_PRESETS[2].url; // Construction & Masonry
  }
  if (normIndustry === 'PLUMBING' || text.includes('plumb') || text.includes('pipe') || text.includes('drain')) {
    return TRADE_COVER_PRESETS[3].url; // Plumbing
  }
  if (normIndustry === 'COOKING_CHEF' || text.includes('cook') || text.includes('chef') || text.includes('kitchen') || text.includes('hotel food') || text.includes('cater') || text.includes('restaurant')) {
    return TRADE_COVER_PRESETS[4].url; // Kitchen & Cooking
  }
  if (normIndustry === 'MAINTENANCE' || text.includes('technician') || text.includes('repair') || text.includes('maintain') || text.includes('mechanic') || text.includes('ac repair') || text.includes('hvac')) {
    return TRADE_COVER_PRESETS[5].url; // Maintenance & Repair
  }
  if (normIndustry === 'HOSPITALITY' || text.includes('hotel') || text.includes('resort') || text.includes('guest') || text.includes('front desk') || text.includes('concierge')) {
    return TRADE_COVER_PRESETS[6].url; // Hospitality
  }
  if (normIndustry === 'DOMESTIC_HELP' || text.includes('clean') || text.includes('maid') || text.includes('housekeep') || text.includes('sweeper') || text.includes('sanitation')) {
    return TRADE_COVER_PRESETS[7].url; // Housekeeping & Cleaning
  }
  if (normIndustry === 'SECURITY' || text.includes('secur') || text.includes('guard') || text.includes('watchman') || text.includes('cctv') || text.includes('patrol')) {
    return TRADE_COVER_PRESETS[8].url; // Security
  }
  if (normIndustry === 'MANUFACTURING' || text.includes('manufactur') || text.includes('factory') || text.includes('machin') || text.includes('assembly') || text.includes('operator')) {
    return TRADE_COVER_PRESETS[9].url; // Manufacturing & Fabrication
  }

  // Fallback to Electrical / Industrial standard
  return TRADE_COVER_PRESETS[0].url;
};

/**
 * Priority resolver:
 * 1. Uploaded custom workplace photo (Cloudinary / S3 / Direct URL)
 * 2. If not uploaded, fallback to smart trade/category image matching what they chose (e.g. Electrician, Construction, Logistics)
 */
export const getEffectiveCoverUrl = (job?: {
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
  coverImage?: string | null;
  title?: string;
  industry?: string;
} | null): string | null => {
  if (!job) return null;
  const directImage = job.coverImageUrl || job.cover_image_url || job.coverImage;
  if (directImage && typeof directImage === 'string' && directImage.trim() !== '') {
    return directImage.trim();
  }
  // When no custom image is uploaded, show the trade/category image matching what they chose
  return resolveTradeCover(job.title, job.industry);
};
