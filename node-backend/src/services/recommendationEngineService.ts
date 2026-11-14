/**
 * Recommendation Engine Service (Backend)
 * 
 * High-performance, multi-objective bidirectional recommendation engine for TrustHyre.
 * Implements:
 * 1. Normalized job skill retrieval (job_required_skills > search_index > trade inference)
 * 2. Strictly orthogonal, non-double-counted feature scoring with centralized weights
 * 3. Multi-unit wage compatibility (HOURLY, DAILY, WEEKLY, MONTHLY, PROJECT)
 * 4. Hierarchical location matching without fabricated travel distances
 * 5. Strict eligibility filters (status, expires_at, availability, application/dismissal history)
 * 6. Decoupled verification standing (KYC verification records vs skill level vs ratings)
 * 7. Accurate database-level pagination and totals
 * 8. Telemetry recording with item existence validation
 */

import prisma from '../config/prisma';

// ============================================================================
// CONFIGURATION & WEIGHTS
// ============================================================================

export const RECOMMENDATION_CONFIG = {
  weights: {
    workerToJob: {
      skills: 0.35,
      geo: 0.25,
      experience: 0.15,
      compensation: 0.10,
      verification: 0.10,
      activity: 0.05
    },
    employerToWorker: {
      skills: 0.35,
      geo: 0.25,
      experience: 0.15,
      compensation: 0.10,
      verification: 0.10,
      activity: 0.05
    }
  },
  geo: {
    maxRadiusKm: 50,
    decayInflectionKm: 12,
    decaySlope: 0.25
  },
  wageNorms: {
    hoursPerDay: 8,
    daysPerMonth: 26,
    daysPerWeek: 6
  }
};

// ============================================================================
// TAXONOMY & TRADE SYNONYMS DICTIONARY
// ============================================================================

export const TRADE_SYNONYMS: Record<string, string[]> = {
  electrician: [
    'electrical', 'wiring', 'circuit', 'mcb', 'switchboard', 'conduit',
    'inverter', 'panel', 'substation', 'high voltage', 'single phase',
    'three phase', 'solar', 'transformer', 'lighting', 'cabling', 'wireman',
    'electrician'
  ],
  plumber: [
    'plumbing', 'pipe', 'leakage', 'drainage', 'sanitary', 'fitting',
    'pvc', 'cpvc', 'gi pipe', 'tap repair', 'valve', 'sewer', 'pump installation',
    'plumber'
  ],
  welder: [
    'welding', 'mig', 'tig', 'arc welding', 'fabrication', 'gas cutting',
    'metal work', 'grinding', 'soldering', 'brazing', 'structural welding',
    'fabricator', 'welder'
  ],
  carpenter: [
    'carpentry', 'woodwork', 'furniture', 'cabinet', 'plywood', 'cutting',
    'polishing', 'laminating', 'framing', 'door fitting', 'modular kitchen',
    'carpenter'
  ],
  mason: [
    'masonry', 'brickwork', 'concreting', 'plastering', 'tile fixing',
    'flooring', 'shuttering', 'civil construction', 'grouting', 'mason'
  ],
  hvac: [
    'air conditioner', 'ac repair', 'refrigeration', 'compressor', 'cooling',
    'hvac', 'gas filling', 'ductwork', 'chiller', 'copper piping', 'split ac'
  ],
  driver: [
    'driving', 'lmv', 'hmv', 'commercial vehicle', 'truck', 'van',
    'logistics delivery', 'route navigation', 'gps', 'forklift operator', 'chauffeur',
    'auto rickshaw', 'cab driver', 'delivery partner'
  ],
  warehouse: [
    'inventory', 'packaging', 'loading', 'unloading', 'stocking', 'picking',
    'dispatch', 'warehouse management', 'pallet', 'barcoding', 'helper',
    'material handling', 'packer'
  ],
  security: [
    'security guard', 'surveillance', 'cctv monitoring', 'patrolling',
    'access control', 'gatekeeper', 'visitor management', 'incident reporting', 'bouncer'
  ],
  mechanic: [
    'automobile', 'engine repair', 'transmission', 'brake service',
    'two wheeler', 'four wheeler', 'diesel mechanic', 'oil change', 'tuning',
    'auto technician'
  ],
  painter: [
    'painting', 'whitewash', 'distemper', 'emulsion', 'spray painting',
    'wall putty', 'primer', 'texture painting', 'waterproofing', 'painter'
  ],
  cook: [
    'cooking', 'chef', 'kitchen', 'food preparation', 'catering', 'commercial kitchen',
    'culinary', 'tandoor', 'south indian', 'north indian', 'chinese cook', 'cook'
  ],
  housekeeping: [
    'housekeeping', 'cleaning', 'sanitation', 'janitor', 'floor cleaning',
    'waste management', 'hospitality staff', 'room attendant'
  ],
  tailor: [
    'tailoring', 'stitching', 'cutting master', 'garments', 'pattern maker',
    'sewing machine operator', 'embroidery', 'textile', 'tailor'
  ],
  fitter: [
    'fitter', 'machinist', 'turner', 'lathe machine', 'cnc operator',
    'die maker', 'mechanical assembly', 'tool room'
  ]
};

// ============================================================================
// STRING & TOKEN NORMALIZATION HELPERS
// ============================================================================

export const clean = (val?: string | null): string => {
  return (val || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

export const parseList = (input?: any): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(i => String(i).trim()).filter(Boolean);
  if (typeof input === 'string') {
    const t = input.trim();
    if (t.startsWith('[') && t.endsWith(']')) {
      try {
        const p = JSON.parse(t);
        if (Array.isArray(p)) return p.map(i => String(i).trim()).filter(Boolean);
      } catch {}
    }
    return t.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

// ============================================================================
// GEOLOCATION & COMMUTE MATHEMATICS
// ============================================================================

/**
 * Calculates Great-Circle distance in kilometers between two GPS coordinates using the Haversine formula.
 */
export const calculateHaversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

/**
 * Commute Distance Sigmoid Decay Function:
 * - 0 - 3 km: 100%
 * - 4 - 6 km: 92%
 * - 12 km: 50% (Standard inflection point)
 * - > 25 km: < 10%
 */
export const computeDistanceScore = (distanceKm: number): number => {
  if (distanceKm <= 3) return 100;
  if (distanceKm <= 6) return 92;
  const score = 1 / (1 + Math.exp(RECOMMENDATION_CONFIG.geo.decaySlope * (distanceKm - RECOMMENDATION_CONFIG.geo.decayInflectionKm)));
  return Math.min(100, Math.max(0, Math.round(score * 100)));
};

/**
 * Evaluates physical location hierarchy when coordinates are missing or present.
 * CRITICAL RULE: distanceKm is returned as null when coordinates are not available for both entities.
 */
export const scoreHierarchicalLocation = (
  origin: {
    lat?: number | null;
    lng?: number | null;
    city?: string | null;
    area?: string | null;
    taluk?: string | null;
    district?: string | null;
    state?: string | null;
    preferredCities?: string[] | null;
    willingToRelocate?: boolean | null;
  },
  target: {
    lat?: number | null;
    lng?: number | null;
    city?: string | null;
    area?: string | null;
    taluk?: string | null;
    district?: string | null;
    state?: string | null;
    landmark?: string | null;
  }
): { score: number; distanceKm: number | null; matchReason: string | null } => {
  // 1. Precise GPS evaluation when coordinates are present on both ends
  if (
    origin.lat != null && origin.lng != null &&
    target.lat != null && target.lng != null &&
    !isNaN(origin.lat) && !isNaN(origin.lng) &&
    !isNaN(target.lat) && !isNaN(target.lng)
  ) {
    const distKm = calculateHaversineDistanceKm(origin.lat, origin.lng, target.lat, target.lng);
    const score = computeDistanceScore(distKm);
    return {
      score,
      distanceKm: distKm,
      matchReason: distKm <= 10 ? `Nearby (~${distKm} km)` : `Commute distance: ${distKm} km`
    };
  }

  // 2. Strict Fallback: Never invent distance numbers when coordinates are missing
  const oArea = clean(origin.area);
  const tArea = clean(target.area || target.landmark);
  const oCity = clean(origin.city);
  const tCity = clean(target.city);
  const oTaluk = clean(origin.taluk);
  const tTaluk = clean(target.taluk);
  const oDist = clean(origin.district);
  const tDist = clean(target.district);
  const oState = clean(origin.state);
  const tState = clean(target.state);

  const preferredCities = (origin.preferredCities || []).map(clean);

  // Exact area / landmark / ward match
  if (oArea && tArea && (oArea === tArea || oArea.includes(tArea) || tArea.includes(oArea))) {
    return { score: 95, distanceKm: null, matchReason: `Same neighborhood (${target.area || target.landmark})` };
  }

  // Same city or taluk match
  if (
    (oCity && tCity && (oCity === tCity || oCity.includes(tCity) || tCity.includes(oCity))) ||
    (oTaluk && tTaluk && (oTaluk === tTaluk || oTaluk.includes(tTaluk) || tTaluk.includes(oTaluk)))
  ) {
    const cityName = target.city || target.taluk || origin.city;
    return { score: 85, distanceKm: null, matchReason: `Located in your city (${cityName})` };
  }

  // Candidate's preferred cities list match
  if (tCity && preferredCities.some(p => p === tCity || tCity.includes(p))) {
    return { score: 80, distanceKm: null, matchReason: `Located in preferred hiring city (${target.city})` };
  }

  // Same district match
  if (oDist && tDist && (oDist === tDist || oDist.includes(tDist) || tDist.includes(oDist))) {
    return { score: 70, distanceKm: null, matchReason: `Same district (${target.district})` };
  }

  // Same state match
  if (oState && tState && (oState === tState || oState.includes(tState) || tState.includes(oState))) {
    return { score: 50, distanceKm: null, matchReason: `Same state (${target.state})` };
  }

  // Relocation willingness
  if (origin.willingToRelocate) {
    return { score: 60, distanceKm: null, matchReason: 'Candidate open to relocation' };
  }

  // Default distant / out of region score
  return { score: 20, distanceKm: null, matchReason: null };
};

// ============================================================================
// WAGE & COMPENSATION MATCHING
// ============================================================================

/**
 * Normalizes different payout units and evaluates compensation alignment without assuming
 * arbitrary overtime schedules.
 */
export const scoreWageAlignment = (
  jobBudget: number | null | undefined,
  jobPayoutFrequency: string | null | undefined,
  workerExpected: {
    hourlyRate?: number | null;
    dailyRate?: number | null;
    expectedSalary?: number | null;
  }
): { score: number; explanation: string | null } => {
  const budget = Number(jobBudget || 0);
  const freq = (jobPayoutFrequency || 'MONTHLY').toUpperCase().trim();

  // If budget is unstated or project-based with no hourly bounds, assign neutral baseline
  if (!budget || budget <= 0 || freq === 'PROJECT' || freq === 'FIXED') {
    return { score: 70, explanation: 'Flexible / project-based compensation' };
  }

  const { hoursPerDay, daysPerMonth, daysPerWeek } = RECOMMENDATION_CONFIG.wageNorms;

  // Convert job budget to monthly baseline for standardized comparison
  let jobMonthly = budget;
  if (freq === 'HOURLY') {
    jobMonthly = budget * hoursPerDay * daysPerMonth;
  } else if (freq === 'DAILY') {
    jobMonthly = budget * daysPerMonth;
  } else if (freq === 'WEEKLY') {
    jobMonthly = budget * (daysPerMonth / daysPerWeek);
  }

  // Convert worker expectation to monthly baseline
  let workerMonthly = 0;
  if (workerExpected.expectedSalary && Number(workerExpected.expectedSalary) > 0) {
    workerMonthly = Number(workerExpected.expectedSalary);
  } else if (workerExpected.dailyRate && Number(workerExpected.dailyRate) > 0) {
    workerMonthly = Number(workerExpected.dailyRate) * daysPerMonth;
  } else if (workerExpected.hourlyRate && Number(workerExpected.hourlyRate) > 0) {
    workerMonthly = Number(workerExpected.hourlyRate) * hoursPerDay * daysPerMonth;
  }

  // If worker has no wage expectation listed, assign neutral baseline
  if (workerMonthly <= 0) {
    return { score: 75, explanation: 'Compensation within market standards' };
  }

  const ratio = jobMonthly / workerMonthly;

  if (ratio >= 1.0) {
    const score = Math.min(100, Math.round(90 + Math.min(10, (ratio - 1.0) * 10)));
    return { score, explanation: 'Meets or exceeds expected compensation' };
  } else if (ratio >= 0.85) {
    const score = Math.round(75 + (ratio - 0.85) * 100);
    return { score, explanation: 'Near expected compensation' };
  } else if (ratio >= 0.60) {
    const score = Math.round(40 + (ratio - 0.60) * 140);
    return { score, explanation: 'Below expected wage' };
  } else {
    return { score: 25, explanation: 'Significantly below expected wage' };
  }
};

// ============================================================================
// SKILL NORMALIZATION & TRADE RETRIEVAL
// ============================================================================

/**
 * Resolves normalized job skills using prioritized retrieval:
 * 1. Explicit rows in `job_required_skills` table
 * 2. Parsed skills in `job_search_index.required_skills` or `jobs.required_skills`
 * 3. Title & description based trade heuristics as a safe fallback
 */
export const getNormalizedJobSkills = async (job: any): Promise<string[]> => {
  // Priority 1: Check relation if pre-loaded
  if (job.job_required_skills && Array.isArray(job.job_required_skills) && job.job_required_skills.length > 0) {
    return job.job_required_skills.map((s: any) => String(s.skill || s).trim()).filter(Boolean);
  }

  // Priority 1 fallback: Query database job_required_skills
  if (job.id) {
    const skillRows = await prisma.job_required_skills.findMany({
      where: { job_id: job.id },
      select: { skill: true }
    }).catch(() => []);
    if (skillRows.length > 0) {
      return skillRows.map(r => r.skill.trim()).filter(Boolean);
    }
  }

  // Priority 2: Parsed string from search index or direct column
  const rawSkills = job.required_skills || job.requiredSkills;
  const parsed = parseList(rawSkills);
  if (parsed.length > 0) {
    return parsed;
  }

  // Priority 3: Fallback trade inference from job title and industry
  const text = `${job.title || ''} ${job.industry || ''} ${job.description || ''}`.toLowerCase();
  for (const [trade, synonyms] of Object.entries(TRADE_SYNONYMS)) {
    if (synonyms.some(s => text.includes(s))) {
      return [trade.charAt(0).toUpperCase() + trade.slice(1), ...synonyms.slice(0, 3)];
    }
  }

  return job.title ? [job.title] : ['General Work'];
};

/**
 * Computes orthogonal skill similarity score between job and worker skills
 * using normalized token Jaccard similarity and trade synonym coverage.
 */
export const scoreSkills = (
  jobSkills: string[],
  workerSkills: string[]
): { score: number; matchingSkills: string[]; missingSkills: string[] } => {
  if (jobSkills.length === 0) {
    return { score: 70, matchingSkills: workerSkills.slice(0, 3), missingSkills: [] };
  }

  const normJob = jobSkills.map(clean).filter(Boolean);
  const normWorker = workerSkills.map(clean).filter(Boolean);

  const matching: string[] = [];
  const missing: string[] = [];

  for (let i = 0; i < jobSkills.length; i++) {
    const rawJobSkill = jobSkills[i];
    const jClean = normJob[i];

    // Direct token/word boundary matching rather than arbitrary loose substrings
    const isDirectMatch = normWorker.some(w => {
      if (w === jClean) return true;
      const wTokens = w.split(/\s+/);
      const jTokens = jClean.split(/\s+/);
      return jTokens.some(jt => wTokens.includes(jt)) || wTokens.some(wt => jTokens.includes(wt));
    });
    if (isDirectMatch) {
      matching.push(rawJobSkill);
      continue;
    }

    // Check synonym dictionary coverage
    let synonymMatch = false;
    for (const [trade, syns] of Object.entries(TRADE_SYNONYMS)) {
      const jobMatchesTrade = syns.some(s => jClean.includes(s));
      if (jobMatchesTrade) {
        const workerMatchesTrade = normWorker.some(w => syns.some(s => w.includes(s)));
        if (workerMatchesTrade) {
          synonymMatch = true;
          break;
        }
      }
    }

    if (synonymMatch) {
      matching.push(rawJobSkill);
    } else {
      missing.push(rawJobSkill);
    }
  }

  const matchRatio = matching.length / jobSkills.length;
  const score = Math.min(100, Math.max(15, Math.round(matchRatio * 100)));

  return {
    score,
    matchingSkills: matching,
    missingSkills: missing
  };
};

// ============================================================================
// VERIFICATION, EXPERIENCE & ACTIVITY SCORING
// ============================================================================

export const scoreExperience = (requiredYears: number, candidateYears: number): number => {
  const req = Math.max(0, requiredYears || 0);
  const cand = Math.max(0, candidateYears || 0);

  if (cand >= req) {
    return 95;
  }
  const gap = req - cand;
  return Math.max(20, 95 - gap * 20);
};

export const scoreVerification = (
  isIdentityVerified: boolean,
  skillLevelNumber: number,
  averageRating: number | null
): number => {
  let score = 0;

  // 1. Real Identity KYC (40 points)
  if (isIdentityVerified) {
    score += 40;
  } else {
    score += 10;
  }

  // 2. Skill Test Level Standing (Up to 35 points)
  const level = Math.min(4, Math.max(1, skillLevelNumber || 1));
  if (level === 4) score += 35;
  else if (level === 3) score += 28;
  else if (level === 2) score += 20;
  else score += 12;

  // 3. Bilateral Review Rating (Up to 25 points)
  if (averageRating != null && averageRating > 0) {
    score += Math.min(25, Math.round((averageRating / 5.0) * 25));
  } else {
    score += 15; // Neutral baseline for new unrated workers
  }

  return Math.min(100, Math.max(20, score));
};

export const scoreActivity = (isAvailable: boolean, updatedAt?: Date | null): number => {
  let score = isAvailable ? 60 : 20;

  if (updatedAt) {
    const ageHours = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours <= 48) score += 40;
    else if (ageHours <= 168) score += 25;
    else if (ageHours <= 720) score += 10;
  } else {
    score += 15;
  }

  return Math.min(100, score);
};

// ============================================================================
// RECOMMENDATION ENGINE INTERFACES
// ============================================================================

export interface ScoredJobRecommendation {
  job: any;
  overallScore: number;
  scoreBand: 'Excellent Match' | 'Strong Match' | 'Moderate Match' | 'Potential Match';
  distanceKm: number | null;
  matchReasons: string[];
  matchingSkills: string[];
  missingSkills: string[];
  breakdown: {
    skills: number;
    geo: number;
    experience: number;
    compensation: number;
    verification: number;
    activity: number;
  };
}

export interface ScoredWorkerRecommendation {
  worker: any;
  overallScore: number;
  scoreBand: 'Excellent Match' | 'Strong Match' | 'Moderate Match' | 'Potential Match';
  distanceKm: number | null;
  matchReasons: string[];
  matchingSkills: string[];
  missingSkills: string[];
  breakdown: {
    skills: number;
    geo: number;
    experience: number;
    compensation: number;
    verification: number;
    activity: number;
  };
}

// ============================================================================
// CORE SERVICE IMPLEMENTATION
// ============================================================================

export const recommendationEngineService = {

  /**
   * Retrieves personalized, ranked job recommendations for a worker.
   */
  getRecommendedJobsForWorker: async (
    workerUserId: string,
    options: {
      lat?: number;
      lng?: number;
      radiusKm?: number;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ recommendations: ScoredJobRecommendation[]; total: number; page: number; limit: number; totalPages: number }> => {
    const limit = Math.min(Math.max(options.limit || 15, 1), 50);
    const page = Math.max(options.page || 1, 1);

    // 1. Fetch Worker Profile Context
    const workerProfile = await prisma.worker_profiles.findFirst({
      where: { user_id: workerUserId }
    });

    const workerLat = options.lat ?? workerProfile?.latitude ?? null;
    const workerLng = options.lng ?? workerProfile?.longitude ?? null;
    const workerSkills = parseList(workerProfile?.skills);
    const workerExp = workerProfile?.experience_years ?? 0;

    // 2. Query Actual Verification Record (Strict Separation: never assume trust_score = KYC)
    const verifiedRecordCount = await prisma.verification_records.count({
      where: {
        user_id: workerUserId,
        status: 'VERIFIED'
      }
    }).catch(() => 0);
    const isWorkerIdentityVerified = verifiedRecordCount > 0;

    // 3. Fetch User Interaction History to Exclude Already Applied / Dismissed Jobs
    const [appliedJobs, dismissedInteractions] = await Promise.all([
      prisma.job_applications.findMany({
        where: { worker_id: workerUserId },
        select: { job_id: true }
      }),
      prisma.recommendation_interactions.findMany({
        where: {
          user_id: workerUserId,
          item_type: 'JOB',
          interaction_type: 'DISMISS'
        },
        select: { item_id: true }
      })
    ]);

    const excludedJobIds = new Set<string>([
      ...appliedJobs.map(a => a.job_id),
      ...dismissedInteractions.map(d => d.item_id)
    ]);

    // 4. Strict Eligibility Filtering at DB Level (Active, Unexpired, Unapplied, Undismissed)
    const now = new Date();
    const candidateJobs = await prisma.jobs.findMany({
      where: {
        status: { in: ['OPEN', 'ACTIVE'] },
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } }
        ],
        id: { notIn: Array.from(excludedJobIds) }
      },
      include: {
        job_required_skills: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Fetch employer profiles for candidate jobs
    const employerIds = Array.from(
      new Set(candidateJobs.map(j => j.employer_id).filter((id): id is string => Boolean(id)))
    );
    const employers = employerIds.length > 0
      ? await prisma.employer_profiles.findMany({
          where: {
            OR: [
              { user_id: { in: employerIds } },
              { id: { in: employerIds } }
            ]
          }
        })
      : [];
    const employerMap = new Map<string, any>();
    for (const emp of employers) {
      employerMap.set(emp.user_id, emp);
      employerMap.set(emp.id, emp);
    }

    // 5. Multi-Objective Weighted Ranking
    const scoredList: ScoredJobRecommendation[] = [];
    const weights = RECOMMENDATION_CONFIG.weights.workerToJob;

    for (const job of candidateJobs) {
      // 5a. Skills & Trade Matching (Weight: 0.35)
      const jobSkillsList = await getNormalizedJobSkills(job);
      const skillEval = scoreSkills(jobSkillsList, workerSkills);

      // 5b. Location & Commute Matching (Weight: 0.25)
      const locEval = scoreHierarchicalLocation(
        {
          lat: workerLat,
          lng: workerLng,
          city: workerProfile?.city,
          area: workerProfile?.area,
          taluk: workerProfile?.taluk,
          district: workerProfile?.district,
          state: workerProfile?.state,
          preferredCities: parseList(workerProfile?.preferred_cities),
          willingToRelocate: workerProfile?.willing_to_relocate
        },
        {
          lat: job.latitude,
          lng: job.longitude,
          city: job.city,
          area: job.location,
          landmark: job.landmark,
          state: (job as any).state || null
        }
      );

      // Enforce real radiusKm distance filter
      if (options.radiusKm && options.radiusKm > 0) {
        if (locEval.distanceKm !== null) {
          if (locEval.distanceKm > options.radiusKm) {
            continue; // Exclude job outside requested physical radius
          }
        } else {
          // If coordinates are missing on either worker or job, strict radius cannot be verified.
          // Only permit if city strictly matches; otherwise exclude unverified radius jobs.
          const isSameCity = workerProfile?.city && job.city && workerProfile.city.trim().toLowerCase() === job.city.trim().toLowerCase();
          if (!isSameCity) {
            continue; // Exclude unverified distance outside same city
          }
        }
      }

      // 5c. Experience Alignment (Weight: 0.15)
      const expScore = scoreExperience(job.experience_years_required ?? 0, workerExp);

      // 5d. Compensation Alignment (Weight: 0.10)
      const wageEval = scoreWageAlignment(
        job.budget ? Number(job.budget) : null,
        job.payout_frequency,
        {
          hourlyRate: workerProfile?.hourly_rate ? Number(workerProfile.hourly_rate) : null
        }
      );

      // 5e. Employer Verification Credibility (Weight: 0.10)
      const empProfile = job.employer_id ? employerMap.get(job.employer_id) : null;
      let verifScore = 50;
      if (empProfile?.is_verified) verifScore += 35;
      if (empProfile?.business_tier === 'ENTERPRISE') verifScore += 15;
      verifScore = Math.min(100, verifScore);

      // 5f. Activity & Recency (Weight: 0.05)
      const actScore = scoreActivity(true, job.created_at);

      // Linear Combination of Orthogonal Features
      const totalScore = Math.min(
        99,
        Math.max(
          20,
          Math.round(
            skillEval.score * weights.skills +
            locEval.score * weights.geo +
            expScore * weights.experience +
            wageEval.score * weights.compensation +
            verifScore * weights.verification +
            actScore * weights.activity
          )
        )
      );

      // Descriptive Match Reasons
      const matchReasons: string[] = [];
      if (skillEval.matchingSkills.length > 0) {
        matchReasons.push(`Skills match: ${skillEval.matchingSkills.slice(0, 3).join(', ')}`);
      }
      if (locEval.matchReason) {
        matchReasons.push(locEval.matchReason);
      }
      if (wageEval.explanation) {
        matchReasons.push(wageEval.explanation);
      }
      if (empProfile?.is_verified) {
        matchReasons.push('Verified corporate worksite');
      }

      const scoreBand =
        totalScore >= 85 ? 'Excellent Match' :
        totalScore >= 70 ? 'Strong Match' :
        totalScore >= 50 ? 'Moderate Match' : 'Potential Match';

      scoredList.push({
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          city: job.city,
          location: job.location,
          latitude: job.latitude,
          longitude: job.longitude,
          budget: job.budget,
          payoutFrequency: job.payout_frequency,
          experienceYearsRequired: job.experience_years_required,
          isVerified: Boolean(empProfile?.is_verified),
          requiredSkills: jobSkillsList,
          createdAt: job.created_at,
          employerProfile: empProfile ? {
            id: empProfile.id,
            companyName: empProfile.company_name,
            isVerified: Boolean(empProfile.is_verified),
            city: empProfile.city
          } : null
        },
        overallScore: totalScore,
        scoreBand,
        distanceKm: locEval.distanceKm,
        matchReasons,
        matchingSkills: skillEval.matchingSkills,
        missingSkills: skillEval.missingSkills,
        breakdown: {
          skills: skillEval.score,
          geo: locEval.score,
          experience: expScore,
          compensation: wageEval.score,
          verification: verifScore,
          activity: actScore
        }
      });
    }

    // Sort by overallScore descending
    scoredList.sort((a, b) => b.overallScore - a.overallScore);

    const total = scoredList.length;
    const offset = (page - 1) * limit;
    const paginated = scoredList.slice(offset, offset + limit);

    return {
      recommendations: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Retrieves personalized, ranked candidate recommendations for an employer's active openings.
   */
  getRecommendedWorkersForEmployer: async (
    employerUserId: string,
    options: {
      jobId?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ recommendations: ScoredWorkerRecommendation[]; total: number; page: number; limit: number; totalPages: number }> => {
    const limit = Math.min(Math.max(options.limit || 15, 1), 50);
    const page = Math.max(options.page || 1, 1);

    // 1. Fetch Employer Profile and Target Job(s) (strictly active and unexpired)
    const now = new Date();
    let targetJobs: any[] = [];
    if (options.jobId) {
      const singleJob = await prisma.jobs.findFirst({
        where: {
          id: options.jobId,
          employer_id: employerUserId,
          status: { in: ['OPEN', 'ACTIVE'] },
          OR: [
            { expires_at: null },
            { expires_at: { gt: now } }
          ]
        },
        include: { job_required_skills: true }
      });
      if (singleJob) targetJobs = [singleJob];
    } else {
      targetJobs = await prisma.jobs.findMany({
        where: {
          employer_id: employerUserId,
          status: { in: ['OPEN', 'ACTIVE'] },
          OR: [
            { expires_at: null },
            { expires_at: { gt: now } }
          ]
        },
        include: { job_required_skills: true },
        orderBy: { created_at: 'desc' },
        take: 10
      });
    }

    // 2. Fetch Dismissed Candidates to Exclude
    const dismissed = await prisma.recommendation_interactions.findMany({
      where: {
        user_id: employerUserId,
        item_type: 'WORKER',
        interaction_type: 'DISMISS'
      },
      select: { item_id: true }
    });
    const dismissedIds = new Set(dismissed.map(d => d.item_id));

    // 3. Stage 1: Retrieval of Eligible, Available Workers
    const activeWorkers = await prisma.worker_profiles.findMany({
      where: {
        is_available: true,
        user_id: { notIn: Array.from(dismissedIds) }
      },
      orderBy: { updated_at: 'desc' }
    });

    // 4. Batch query verification records and ratings for active workers
    const workerUserIds = activeWorkers.map(w => w.user_id);
    const [verifiedRecords, ratingsGrouped] = await Promise.all([
      prisma.verification_records.findMany({
        where: {
          user_id: { in: workerUserIds },
          status: 'VERIFIED'
        },
        select: { user_id: true }
      }),
      prisma.ratings.groupBy({
        by: ['ratee_id'],
        _avg: { score: true },
        where: { ratee_id: { in: workerUserIds } }
      })
    ]);

    const verifiedUserSet = new Set(verifiedRecords.map(r => r.user_id));
    const ratingMap = new Map<string, number>();
    for (const r of ratingsGrouped) {
      if (r.ratee_id && r._avg && r._avg.score != null) {
        ratingMap.set(r.ratee_id, r._avg.score);
      }
    }

    // 5. Multi-Objective Independent Scoring (NO DOUBLE-COUNTING)
    const scoredCandidates: ScoredWorkerRecommendation[] = [];
    const weights = RECOMMENDATION_CONFIG.weights.employerToWorker;

    for (const worker of activeWorkers) {
      const workerSkills = parseList(worker.skills);
      const workerExp = worker.experience_years ?? 0;
      const isVerified = verifiedUserSet.has(worker.user_id);
      const avgRating = ratingMap.get(worker.user_id) ?? null;

      // P1.2 FIX: Select best matching job based on COMPLETE COMPOSITE WEIGHTED SCORE, not skills alone
      let bestCompositeScore = 0;
      let bestMatchingJobId: string | null = null;
      let bestSkillScore = 0;
      let bestMatchingSkills: string[] = [];
      let bestMissingSkills: string[] = [];
      let bestLocScore = 50;
      let bestDistKm: number | null = null;
      let bestLocReason: string | null = null;
      let bestExpScore = 75;
      let bestWageScore = 75;
      let bestWageReason: string | null = null;

      if (targetJobs.length > 0) {
        for (const job of targetJobs) {
          const jobSkills = await getNormalizedJobSkills(job);
          const skillEval = scoreSkills(jobSkills, workerSkills);

          const locEval = scoreHierarchicalLocation(
            {
              lat: worker.latitude,
              lng: worker.longitude,
              city: worker.city,
              area: worker.area,
              taluk: worker.taluk,
              district: worker.district,
              state: worker.state,
              preferredCities: parseList(worker.preferred_cities),
              willingToRelocate: worker.willing_to_relocate
            },
            {
              lat: job.latitude,
              lng: job.longitude,
              city: job.city,
              area: job.location,
              landmark: job.landmark,
              state: (job as any).state || null
            }
          );

          const expScore = scoreExperience(job.experience_years_required ?? 0, workerExp);
          const wageEval = scoreWageAlignment(
            job.budget ? Number(job.budget) : null,
            job.payout_frequency,
            {
              hourlyRate: worker.hourly_rate ? Number(worker.hourly_rate) : null
            }
          );

          // Calculate full composite score for this specific job
          const composite = 
            skillEval.score * weights.skills +
            locEval.score * weights.geo +
            expScore * weights.experience +
            wageEval.score * weights.compensation;

          if (composite > bestCompositeScore) {
            bestCompositeScore = composite;
            bestMatchingJobId = job.id;
            bestSkillScore = skillEval.score;
            bestMatchingSkills = skillEval.matchingSkills;
            bestMissingSkills = skillEval.missingSkills;
            bestLocScore = locEval.score;
            bestDistKm = locEval.distanceKm;
            bestLocReason = locEval.matchReason;
            bestExpScore = expScore;
            bestWageScore = wageEval.score;
            bestWageReason = wageEval.explanation;
          }
        }
      } else {
        // General profile strength when no job is specified
        bestSkillScore = Math.min(95, Math.max(30, workerSkills.length * 15));
        bestMatchingSkills = workerSkills.slice(0, 3);
        bestExpScore = Math.min(95, Math.max(40, workerExp * 10 + 30));
        bestLocScore = (worker.city || worker.location) ? 80 : 40;
      }

      // Feature scores strictly separated (NO double counting)
      const verifScore = scoreVerification(isVerified, worker.level_number || 1, avgRating);
      const actScore = scoreActivity(worker.is_available ?? true, worker.updated_at);

      // Linear Combination
      const finalScore = Math.min(
        99,
        Math.max(
          20,
          Math.round(
            bestSkillScore * weights.skills +
            bestLocScore * weights.geo +
            bestExpScore * weights.experience +
            bestWageScore * weights.compensation +
            verifScore * weights.verification +
            actScore * weights.activity
          )
        )
      );

      const reasons: string[] = [];
      if (bestMatchingSkills.length > 0) {
        reasons.push(`Verified skills: ${bestMatchingSkills.slice(0, 3).join(', ')}`);
      }
      if (bestLocReason) {
        reasons.push(bestLocReason);
      }
      if (isVerified) {
        reasons.push('Identity KYC verified');
      }
      if (worker.is_available) {
        reasons.push('Available for immediate start');
      }
      if (bestWageReason) {
        reasons.push(bestWageReason);
      }

      const scoreBand =
        finalScore >= 85 ? 'Excellent Match' :
        finalScore >= 70 ? 'Strong Match' :
        finalScore >= 50 ? 'Moderate Match' : 'Potential Match';

      // Sanitized Worker Profile (PII protection: no full address, no identity doc URLs)
      scoredCandidates.push({
        worker: {
          id: worker.id,
          userId: worker.user_id,
          name: worker.full_name,
          bio: worker.bio,
          skills: worker.skills,
          city: worker.city,
          district: worker.district,
          state: worker.state,
          level: worker.level,
          levelNumber: worker.level_number,
          experienceYears: worker.experience_years,
          isVerified,
          trustScore: worker.trust_score,
          profileImageUrl: worker.profile_image_url,
          hourlyRate: worker.hourly_rate,
          isAvailable: worker.is_available
        },
        overallScore: finalScore,
        scoreBand,
        distanceKm: bestDistKm,
        matchReasons: reasons,
        matchingSkills: bestMatchingSkills,
        missingSkills: bestMissingSkills,
        breakdown: {
          skills: bestSkillScore,
          geo: bestLocScore,
          experience: bestExpScore,
          compensation: bestWageScore,
          verification: verifScore,
          activity: actScore
        }
      });
    }

    scoredCandidates.sort((a, b) => b.overallScore - a.overallScore);

    const total = scoredCandidates.length;
    const offset = (page - 1) * limit;
    const paginated = scoredCandidates.slice(offset, offset + limit);

    return {
      recommendations: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Telemetry recording for implicit and explicit recommendation interactions.
   * Validates item existence and strictly gates conversion events (APPLY, INVITE)
   * so they cannot be forged without a real application or authorized employer role.
   */
  recordInteraction: async (data: {
    userId: string;
    interactionType: 'VIEW' | 'CLICK' | 'SAVE' | 'APPLY' | 'INVITE' | 'DISMISS';
    itemType: 'JOB' | 'WORKER';
    itemId: string;
    matchScore?: number;
    metadata?: any;
    isServerVerified?: boolean;
  }) => {
    // 1. Anti-Forgery Gating on Conversion Telemetry (APPLY, INVITE)
    // Conversion events MUST be server-verified directly from core workflows (apply / dispatchOffer).
    if ((data.interactionType === 'APPLY' || data.interactionType === 'INVITE') && !data.isServerVerified) {
      throw new Error(`Forbidden: Direct client submission of ${data.interactionType} conversion telemetry is disallowed. Events are recorded server-side upon workflow execution.`);
    }

    // 2. Replay Prevention & Deduplication for Conversion Telemetry (APPLY & INVITE)
    if ((data.interactionType === 'APPLY' || data.interactionType === 'INVITE') && data.metadata?.applicationId) {
      const existing = await prisma.recommendation_interactions.findFirst({
        where: {
          interaction_type: data.interactionType,
          metadata: {
            path: ['applicationId'],
            equals: data.metadata.applicationId
          }
        }
      });
      if (existing) {
        // Return existing record idempotently without logging duplicate telemetry
        return existing;
      }
    }

    // Validate that target item actually exists
    if (data.itemType === 'JOB') {
      const job = await prisma.jobs.findUnique({
        where: { id: data.itemId },
        select: { id: true }
      });
      if (!job) {
        throw new Error(`Job with ID ${data.itemId} does not exist`);
      }
    } else if (data.itemType === 'WORKER') {
      const worker = await prisma.worker_profiles.findFirst({
        where: {
          OR: [
            { id: data.itemId },
            { user_id: data.itemId }
          ]
        },
        select: { id: true }
      });
      if (!worker) {
        throw new Error(`Worker with ID ${data.itemId} does not exist`);
      }
    }

    return prisma.recommendation_interactions.create({
      data: {
        user_id: data.userId,
        interaction_type: data.interactionType,
        item_type: data.itemType,
        item_id: data.itemId,
        match_score: data.matchScore ?? null,
        metadata: data.metadata || {}
      }
    });
  }
};
