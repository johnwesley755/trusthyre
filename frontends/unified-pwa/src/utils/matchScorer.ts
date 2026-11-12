/**
 * MatchScorer Utility (Frontend)
 * 
 * Provides deterministic candidate-to-job matching score calculations,
 * trade synonym parsing, and UI presentation helpers.
 */

export interface MatchAnalysis {
  overallScore: number;
  scoreBand: 'Excellent Match' | 'Strong Match' | 'Moderate Match' | 'Potential Match';
  matchingSkills: string[];
  missingSkills: string[];
  matchSummary: string;
  breakdown: {
    skills: number;
    experience: number;
    location: number;
    verification: number;
  };
}

const TRADE_SYNONYMS: Record<string, string[]> = {
  electrician: [
    'electrical', 'wiring', 'circuit', 'mcb', 'switchboard', 'conduit',
    'inverter', 'panel', 'substation', 'high voltage', 'single phase',
    'three phase', 'solar', 'transformer', 'lighting', 'cabling'
  ],
  plumber: [
    'plumbing', 'pipe', 'leakage', 'drainage', 'sanitary', 'fitting',
    'pvc', 'cpvc', 'gi pipe', 'tap repair', 'valve', 'sewer', 'pump installation'
  ],
  welder: [
    'welding', 'mig', 'tig', 'arc welding', 'fabrication', 'gas cutting',
    'metal work', 'grinding', 'soldering', 'brazing', 'structural welding'
  ],
  carpenter: [
    'carpentry', 'woodwork', 'furniture', 'cabinet', 'plywood', 'cutting',
    'polishing', 'laminating', 'framing', 'door fitting', 'modular kitchen'
  ],
  mason: [
    'masonry', 'brickwork', 'concreting', 'plastering', 'tile fixing',
    'flooring', 'shuttering', 'civil construction', 'grouting'
  ],
  hvac: [
    'air conditioner', 'ac repair', 'refrigeration', 'compressor', 'cooling',
    'hvac', 'gas filling', 'ductwork', 'chiller', 'copper piping', 'split ac'
  ],
  driver: [
    'driving', 'lmv', 'hmv', 'commercial vehicle', 'truck', 'van',
    'logistics delivery', 'route navigation', 'gps', 'forklift operator'
  ],
  warehouse: [
    'inventory', 'packaging', 'loading', 'unloading', 'stocking', 'picking',
    'dispatch', 'warehouse management', 'pallet', 'barcoding'
  ],
  cook: [
    'cooking', 'culinary', 'kitchen', 'food preparation', 'catering',
    'north indian', 'south indian', 'continental', 'tandoor', 'food hygiene'
  ],
  security: [
    'security guard', 'surveillance', 'cctv monitoring', 'patrolling',
    'access control', 'gatekeeper', 'visitor management', 'incident reporting'
  ],
  mechanic: [
    'automobile', 'engine repair', 'transmission', 'brake service',
    'two wheeler', 'four wheeler', 'diesel mechanic', 'oil change', 'tuning'
  ],
  painter: [
    'painting', 'whitewash', 'distemper', 'emulsion', 'spray painting',
    'wall putty', 'primer', 'texture painting', 'waterproofing'
  ]
};

const METRO_CLUSTERS: Record<string, string[]> = {
  mumbai: ['mumbai', 'navi mumbai', 'thane', 'kalyan', 'dombivli', 'panvel', 'mira bhayandar'],
  delhi: ['delhi', 'new delhi', 'noida', 'greater noida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad'],
  bengaluru: ['bengaluru', 'bangalore', 'whitefield', 'electronic city', 'sarjapur', 'yelahanka'],
  chennai: ['chennai', 'tambaram', 'avadi', 'ambattur', 'guindy', 'sholinganallur', 'velachery', 'pallavaram'],
  hyderabad: ['hyderabad', 'secunderabad', 'cyberabad', 'hitec city', 'gachibowli', 'kukatpally'],
  kolkata: ['kolkata', 'howrah', 'salt lake', 'new town', 'rajarhat'],
  pune: ['pune', 'pimpri', 'chinchwad', 'hinjewadi', 'hadapsar', 'kharadi']
};

export const normalizeList = (input?: string[] | string | null): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(i => String(i).trim()).filter(Boolean);
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(i => String(i).trim()).filter(Boolean);
      } catch {
        // fallback
      }
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const cleanText = (val?: string | null): string => {
  return (val || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

export const calculateMatchScore = (job: any, candidate: any): MatchAnalysis => {
  if (!job || !candidate) {
    return {
      overallScore: 50,
      scoreBand: 'Moderate Match',
      matchingSkills: [],
      missingSkills: [],
      matchSummary: 'Baseline profile review',
      breakdown: { skills: 50, experience: 50, location: 50, verification: 50 }
    };
  }

  // 1. Required Skills
  const rawJobSkills = job.requiredSkills || job.required_skills || job.skills;
  let reqSkills = normalizeList(rawJobSkills);
  if (reqSkills.length === 0 && job.title) {
    const cleanTitle = cleanText(job.title);
    for (const [trade, synonyms] of Object.entries(TRADE_SYNONYMS)) {
      if (cleanTitle.includes(trade) || synonyms.some(s => cleanTitle.includes(s))) {
        reqSkills = [trade, ...synonyms.slice(0, 3)];
        break;
      }
    }
    if (reqSkills.length === 0) reqSkills = [job.title.trim()];
  }

  // 2. Candidate Skills & Trade Context
  const candSkills = normalizeList(candidate.skills);
  const candRoles = normalizeList(candidate.preferredRoles || candidate.preferred_roles);
  const allCandSkills = Array.from(new Set([...candSkills, ...candRoles]));

  const contextStr = cleanText([
    candidate.bio,
    candidate.highestEducation || candidate.highest_education,
    candidate.degree,
    candRoles.join(' ')
  ].filter(Boolean).join(' '));

  // 3. Match Skills
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];
  let totalMatchPts = 0;

  for (const req of reqSkills) {
    const reqClean = cleanText(req);
    let matched = false;

    // Direct / Substring
    for (const cs of allCandSkills) {
      const csClean = cleanText(cs);
      if (csClean === reqClean) {
        matched = true;
        totalMatchPts += 1.0;
        break;
      }
      if (csClean.includes(reqClean) || reqClean.includes(csClean)) {
        matched = true;
        totalMatchPts += 0.85;
        break;
      }
    }

    // Trade Synonyms
    if (!matched) {
      for (const [, synonyms] of Object.entries(TRADE_SYNONYMS)) {
        const matchesCluster = synonyms.some(syn => reqClean.includes(syn) || syn.includes(reqClean));
        if (matchesCluster) {
          const candHasSynonym = allCandSkills.some(cs => {
            const csClean = cleanText(cs);
            return synonyms.some(syn => csClean.includes(syn) || syn.includes(csClean));
          });
          if (candHasSynonym) {
            matched = true;
            totalMatchPts += 0.75;
            break;
          }
          if (contextStr && synonyms.some(syn => contextStr.includes(syn))) {
            matched = true;
            totalMatchPts += 0.5;
            break;
          }
        }
      }
    }

    if (matched) {
      matchingSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  }

  const skillScoreRaw = reqSkills.length > 0
    ? Math.min(100, Math.round((totalMatchPts / reqSkills.length) * 100))
    : (allCandSkills.length > 0 ? 70 : 40);

  // 4. Experience Score
  const reqExp = Number(job.experienceYearsRequired ?? job.experience_years_required ?? 0);
  const candExp = Number(candidate.experienceYears ?? candidate.experience_years ?? candidate.experience ?? 0);
  let expScore = 60;
  if (reqExp <= 0) {
    expScore = candExp > 0 ? 100 : 80;
  } else if (candExp >= reqExp) {
    expScore = 100;
  } else if (candExp >= reqExp * 0.75) {
    expScore = 85;
  } else if (candExp >= reqExp * 0.5) {
    expScore = 65;
  } else if (candExp > 0) {
    expScore = 45;
  } else {
    expScore = 25;
  }

  // 5. Location Score
  const jobCity = cleanText(job.city || job.location);
  const candCity = cleanText(candidate.city || candidate.location);
  const prefCities = normalizeList(candidate.preferredCities || candidate.preferred_cities).map(cleanText);
  const willingToRelocate = Boolean(candidate.willingToRelocate ?? candidate.willing_to_relocate);

  let locScore = 40;
  if (!jobCity) {
    locScore = 85;
  } else if (candCity && candCity === jobCity) {
    locScore = 100;
  } else {
    let inSameMetro = false;
    for (const [, cluster] of Object.entries(METRO_CLUSTERS)) {
      if (cluster.includes(jobCity) && cluster.includes(candCity)) {
        inSameMetro = true;
        break;
      }
    }
    if (inSameMetro) locScore = 90;
    else if (prefCities.includes(jobCity)) locScore = 85;
    else if (willingToRelocate) locScore = 75;
    else locScore = 30;
  }

  // 6. Verification Score
  const isVerified = Boolean(candidate.isVerified || candidate.is_verified || candidate.identityVerified);
  let certScore = 30;
  if (isVerified) certScore += 45;
  if (candidate.skillTestResults && candidate.skillTestResults.length > 0) {
    certScore += 25;
  }
  certScore = Math.min(100, Math.max(20, certScore));

  // 7. Aggregate
  const overallScore = Math.min(100, Math.max(10, Math.round(
    (skillScoreRaw * 0.45) +
    (expScore * 0.25) +
    (locScore * 0.15) +
    (certScore * 0.15)
  )));

  let scoreBand: MatchAnalysis['scoreBand'] = 'Potential Match';
  if (overallScore >= 85) scoreBand = 'Excellent Match';
  else if (overallScore >= 70) scoreBand = 'Strong Match';
  else if (overallScore >= 50) scoreBand = 'Moderate Match';

  return {
    overallScore,
    scoreBand,
    matchingSkills,
    missingSkills,
    matchSummary: `${scoreBand} (${overallScore}%). Matches ${matchingSkills.length} of ${reqSkills.length} required skills.`,
    breakdown: {
      skills: skillScoreRaw,
      experience: expScore,
      location: locScore,
      verification: certScore
    }
  };
};

/**
 * Returns accessible styling tokens for match score display
 */
export const getMatchScoreVisuals = (score: number) => {
  if (score >= 85) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      fill: '#10b981',
      badge: 'Excellent Match'
    };
  }
  if (score >= 70) {
    return {
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-700 dark:text-sky-300',
      border: 'border-sky-200 dark:border-sky-800/60',
      fill: '#0284c7',
      badge: 'Strong Match'
    };
  }
  if (score >= 50) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/60',
      fill: '#f59e0b',
      badge: 'Moderate Match'
    };
  }
  return {
    bg: 'bg-slate-100 dark:bg-zinc-800',
    text: 'text-slate-700 dark:text-zinc-300',
    border: 'border-slate-200 dark:border-zinc-700',
    fill: '#64748b',
    badge: 'Potential Match'
  };
};

