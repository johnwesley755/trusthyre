export interface TradeCoverPreset {
  id: string;
  label: string;
  industry: string;
  url: string;
}

export const TRADE_COVER_PRESETS: TradeCoverPreset[] = [
  {
    id: 'education',
    label: 'Education & Academic Counseling',
    industry: 'EDUCATION',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Medical Staff',
    industry: 'HEALTHCARE',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'retail',
    label: 'Retail & Counter Sales',
    industry: 'RETAIL',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'office',
    label: 'Office & Customer Support',
    industry: 'OFFICE_ADMIN',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'driving',
    label: 'Driver & Mobility Fleet',
    industry: 'AUTOMOTIVE',
    url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80',
  },
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
 * Resolves a clean, user-facing category badge for any job, fixing legacy 'Logistics' tags.
 */
export const resolveJobCategoryLabel = (title?: string, industry?: string): string => {
  const normIndustry = (industry || '').trim().toUpperCase();
  const text = `${title || ''} ${industry || ''}`.toLowerCase();

  // 1. Education, Counseling & Academic
  if (normIndustry === 'EDUCATION' || text.includes('counsel') || text.includes('admission') || text.includes('teacher') || text.includes('tutor') || text.includes('faculty') || text.includes('academic') || text.includes('school') || text.includes('college')) {
    return 'Education & Training';
  }

  // 2. Healthcare & Medical Staff
  if (normIndustry === 'HEALTHCARE' || text.includes('nurse') || text.includes('clinic') || text.includes('hospital') || text.includes('pharma') || text.includes('patient') || text.includes('doctor') || text.includes('medical')) {
    return 'Healthcare & Medical';
  }

  // 3. Retail & Counter Sales
  if (normIndustry === 'RETAIL' || text.includes('cashier') || text.includes('retail') || text.includes('counter sales') || text.includes('store keeper') || text.includes('sales executive') || text.includes('showroom')) {
    return 'Retail & Counter Sales';
  }

  // 4. Office & Administration
  if (normIndustry === 'OFFICE_ADMIN' || text.includes('receptionist') || text.includes('front desk') || text.includes('telecaller') || text.includes('bpo') || text.includes('data entry') || text.includes('office assistant') || text.includes('clerk')) {
    return 'Office & Support';
  }

  // 5. Electrical & Power
  if (normIndustry === 'ELECTRICAL' || text.includes('electr') || text.includes('wireman') || text.includes('power grid') || text.includes('substation')) {
    return 'Electrical & Power';
  }

  // 6. Plumbing & Pipefitting
  if (normIndustry === 'PLUMBING' || text.includes('plumb') || text.includes('pipe') || text.includes('drainage') || text.includes('sanitation')) {
    return 'Plumbing & Pipefitting';
  }

  // 7. Commercial Cooking & Chef
  if (normIndustry === 'COOKING_CHEF' || text.includes('cook') || text.includes('chef') || text.includes('kitchen') || text.includes('baker') || text.includes('cater') || text.includes('food service')) {
    return 'Hospitality & Cooking';
  }

  // 8. Construction & Masonry
  if (normIndustry === 'CONSTRUCTION' || text.includes('construct') || text.includes('mason') || text.includes('carpenter') || text.includes('painter') || text.includes('welder') || text.includes('civil')) {
    return 'Construction & Masonry';
  }

  // 9. Facility Maintenance & Repair
  if (normIndustry === 'MAINTENANCE' || text.includes('technician') || text.includes('repair') || text.includes('maintain') || text.includes('mechanic') || text.includes('ac repair') || text.includes('hvac')) {
    return 'Maintenance & Repair';
  }

  // 10. Security Services
  if (normIndustry === 'SECURITY' || text.includes('secur') || text.includes('guard') || text.includes('watchman') || text.includes('cctv') || text.includes('patrol')) {
    return 'Security Services';
  }

  // 11. Delivery, Driver & Logistics
  if (normIndustry === 'LOGISTICS' || normIndustry === 'AUTOMOTIVE' || text.includes('driv') || text.includes('deliver') || text.includes('rider') || text.includes('courier') || text.includes('van') || text.includes('auto driver') || text.includes('logist') || text.includes('cargo') || text.includes('warehouse') || text.includes('packer') || text.includes('loader')) {
    return 'Logistics & Delivery';
  }

  // 12. Housekeeping & Cleaning
  if (normIndustry === 'DOMESTIC_HELP' || text.includes('clean') || text.includes('maid') || text.includes('housekeep') || text.includes('sweeper') || text.includes('janitor')) {
    return 'Housekeeping & Cleaning';
  }

  // 13. Manufacturing & Fabrication
  if (normIndustry === 'MANUFACTURING' || text.includes('manufactur') || text.includes('factory') || text.includes('machin') || text.includes('assembly') || text.includes('operator') || text.includes('fitter')) {
    return 'Manufacturing & Fabrication';
  }

  // If already a clean capitalized string, return it; otherwise return verified opening
  if (industry && industry !== 'Field Operations & Logistics' && industry !== 'Field Operations & Services' && industry !== 'General') {
    return industry;
  }

  return 'Verified Opening';
};

/**
 * Resolves a default high-resolution trade banner based on job title and industry keyword analysis.
 */
export const resolveTradeCover = (title?: string, industry?: string): string => {
  const normIndustry = (industry || '').trim().toUpperCase();
  const text = `${title || ''} ${industry || ''}`.toLowerCase();

  // 1. Education & Counseling
  if (normIndustry === 'EDUCATION' || text.includes('counsel') || text.includes('admission') || text.includes('teacher') || text.includes('tutor') || text.includes('faculty') || text.includes('academic') || text.includes('school') || text.includes('college')) {
    return TRADE_COVER_PRESETS[0].url; // Education
  }

  // 2. Healthcare
  if (normIndustry === 'HEALTHCARE' || text.includes('nurse') || text.includes('clinic') || text.includes('hospital') || text.includes('pharma') || text.includes('patient') || text.includes('doctor') || text.includes('medical')) {
    return TRADE_COVER_PRESETS[1].url; // Healthcare
  }

  // 3. Retail & Counter Sales
  if (normIndustry === 'RETAIL' || text.includes('cashier') || text.includes('retail') || text.includes('counter sales') || text.includes('store keeper') || text.includes('sales executive') || text.includes('showroom')) {
    return TRADE_COVER_PRESETS[2].url; // Retail
  }

  // 4. Office & Admin
  if (normIndustry === 'OFFICE_ADMIN' || text.includes('receptionist') || text.includes('front desk') || text.includes('telecaller') || text.includes('bpo') || text.includes('data entry') || text.includes('office assistant') || text.includes('clerk')) {
    return TRADE_COVER_PRESETS[3].url; // Office
  }

  // 5. Driver / Automotive
  if (normIndustry === 'AUTOMOTIVE' || text.includes('driver') || text.includes('chauffeur') || text.includes('van driver') || text.includes('auto driver') || text.includes('cab driver')) {
    return TRADE_COVER_PRESETS[4].url; // Automotive & Driver
  }

  // 6. Electrical
  if (normIndustry === 'ELECTRICAL' || text.includes('electr') || text.includes('wireman') || text.includes('power grid')) {
    return TRADE_COVER_PRESETS[5].url; // Electrical
  }

  // 7. Delivery & Logistics
  if (normIndustry === 'LOGISTICS' || text.includes('deliver') || text.includes('courier') || text.includes('rider') || text.includes('logist') || text.includes('cargo') || text.includes('warehouse') || text.includes('packer') || text.includes('loader')) {
    return TRADE_COVER_PRESETS[6].url; // Logistics & Delivery
  }

  // 8. Construction & Masonry
  if (normIndustry === 'CONSTRUCTION' || text.includes('construct') || text.includes('mason') || text.includes('carpenter') || text.includes('build') || text.includes('weld') || text.includes('painter')) {
    return TRADE_COVER_PRESETS[7].url; // Construction & Masonry
  }

  // 9. Plumbing
  if (normIndustry === 'PLUMBING' || text.includes('plumb') || text.includes('pipe') || text.includes('drain')) {
    return TRADE_COVER_PRESETS[8].url; // Plumbing
  }

  // 10. Cooking & Kitchen
  if (normIndustry === 'COOKING_CHEF' || text.includes('cook') || text.includes('chef') || text.includes('kitchen') || text.includes('hotel food') || text.includes('cater') || text.includes('restaurant')) {
    return TRADE_COVER_PRESETS[9].url; // Kitchen & Cooking
  }

  // 11. Maintenance & Repair
  if (normIndustry === 'MAINTENANCE' || text.includes('technician') || text.includes('repair') || text.includes('maintain') || text.includes('mechanic') || text.includes('ac repair') || text.includes('hvac')) {
    return TRADE_COVER_PRESETS[10].url; // Maintenance & Repair
  }

  // 12. Hospitality
  if (normIndustry === 'HOSPITALITY' || text.includes('hotel') || text.includes('resort') || text.includes('guest') || text.includes('concierge')) {
    return TRADE_COVER_PRESETS[11].url; // Hospitality
  }

  // 13. Housekeeping & Cleaning
  if (normIndustry === 'DOMESTIC_HELP' || text.includes('clean') || text.includes('maid') || text.includes('housekeep') || text.includes('sweeper') || text.includes('sanitation')) {
    return TRADE_COVER_PRESETS[12].url; // Housekeeping & Cleaning
  }

  // 14. Security
  if (normIndustry === 'SECURITY' || text.includes('secur') || text.includes('guard') || text.includes('watchman') || text.includes('cctv') || text.includes('patrol')) {
    return TRADE_COVER_PRESETS[13].url; // Security
  }

  // 15. Manufacturing & Fabrication
  if (normIndustry === 'MANUFACTURING' || text.includes('manufactur') || text.includes('factory') || text.includes('machin') || text.includes('assembly') || text.includes('operator')) {
    return TRADE_COVER_PRESETS[14].url; // Manufacturing & Fabrication
  }

  // Smart fallback
  return TRADE_COVER_PRESETS[5].url; // Electrical / Power default
};

/**
 * Priority resolver:
 * 1. Uploaded custom workplace photo (Cloudinary / S3 / Direct URL)
 * 2. If not uploaded, fallback to smart trade/category image matching what they chose (e.g. Electrician, Construction, Education)
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
