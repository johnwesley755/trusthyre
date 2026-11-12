/**
 * MatchScoreService
 * 
 * Production-grade Candidate-to-Job Matching & Skill Analysis Engine.
 * Evaluates skill overlap, experience alignment, geographic proximity,
 * and verified testing credentials with deterministic weights.
 */

export interface CandidateProfileInput {
  userId?: string;
  id?: string;
  skills?: string[] | string | null;
  preferredRoles?: string[] | string | null;
  preferred_roles?: string[] | string | null;
  experienceYears?: number | null;
  experience_years?: number | null;
  city?: string | null;
  location?: string | null;
  preferredCities?: string[] | string | null;
  preferred_cities?: string[] | string | null;
  willingToRelocate?: boolean | null;
  willing_to_relocate?: boolean | null;
  isVerified?: boolean | null;
  is_verified?: boolean | null;
  bio?: string | null;
  highestEducation?: string | null;
  highest_education?: string | null;
  degree?: string | null;
  specialization?: string | null;
  skillTestResults?: Array<{ score?: number; passed?: boolean; testTitle?: string }>;
}

export interface JobRequirementsInput {
  id?: string;
  title?: string;
  industry?: string | null;
  category?: string | null;
  requiredSkills?: string[] | string | null;
  required_skills?: string[] | string | null;
  skills?: string[] | string | null;
  experienceYearsRequired?: number | null;
  experience_years_required?: number | null;
  city?: string | null;
  location?: string | null;
  description?: string | null;
}

export interface MatchScoreResult {
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

// Semantic Trade Clusters for Blue-Collar & Technical Roles
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

// Common Indian metro clusters for vicinity proximity
const METRO_CLUSTERS: Record<string, string[]> = {
  mumbai: ['mumbai', 'navi mumbai', 'thane', 'kalyan', 'dombivli', 'panvel', 'mira bhayandar'],
  delhi: ['delhi', 'new delhi', 'noida', 'greater noida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad'],
  bengaluru: ['bengaluru', 'bangalore', 'whitefield', 'electronic city', 'sarjapur', 'yelahanka'],
  chennai: ['chennai', 'tambaram', 'avadi', 'ambattur', 'guindy', 'sholinganallur', 'velachery', 'pallavaram'],
  hyderabad: ['hyderabad', 'secunderabad', 'cyberabad', 'hitec city', 'gachibowli', 'kukatpally'],
  kolkata: ['kolkata', 'howrah', 'salt lake', 'new town', 'rajarhat'],
  pune: ['pune', 'pimpri', 'chinchwad', 'hinjewadi', 'hadapsar', 'kharadi']
};

/**
 * Normalizes input list from array, JSON string, or comma-separated string
 */
export const normalizeStringList = (input?: string[] | string | null): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item).trim()).filter(Boolean);
        }
      } catch {
        // fallback to comma split
      }
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

/**
 * Normalizes string for fuzzy/semantic comparison
 */
const cleanStr = (val?: string | null): string => {
  return (val || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Checks if candidate skill aligns with a required skill via exact, substring, or trade cluster
 */
const checkSkillMatch = (required: string, candidateSkills: string[], candidateTextContext: string): { matched: boolean; score: number } => {
  const reqClean = cleanStr(required);
  if (!reqClean) return { matched: false, score: 0 };

  // 1. Direct exact or substring match in candidate skills
  for (const cSkill of candidateSkills) {
    const cClean = cleanStr(cSkill);
    if (cClean === reqClean) {
      return { matched: true, score: 1.0 };
    }
    if (cClean.includes(reqClean) || reqClean.includes(cClean)) {
      return { matched: true, score: 0.85 };
    }
  }

  // 2. Trade Synonym Cluster match
  for (const [, synonyms] of Object.entries(TRADE_SYNONYMS)) {
    const reqMatchesCluster = synonyms.some(syn => reqClean.includes(syn) || syn.includes(reqClean));
    if (reqMatchesCluster) {
      for (const cSkill of candidateSkills) {
        const cClean = cleanStr(cSkill);
        const candidateMatchesCluster = synonyms.some(syn => cClean.includes(syn) || syn.includes(cClean));
        if (candidateMatchesCluster) {
          return { matched: true, score: 0.75 };
        }
      }
      // Check trade match in full bio/context
      if (candidateTextContext) {
        const contextMatches = synonyms.some(syn => candidateTextContext.includes(syn));
        if (contextMatches) {
          return { matched: true, score: 0.5 };
        }
      }
    }
  }

  // 3. Fallback: Check if required skill keywords appear in candidate bio or education
  if (candidateTextContext && candidateTextContext.includes(reqClean)) {
    return { matched: true, score: 0.5 };
  }

  return { matched: false, score: 0 };
};

/**
 * Calculates Candidate-to-Job Matching Score & Skill Set Analysis
 */
export const calculateCandidateJobMatch = (
  job: JobRequirementsInput,
  candidate: CandidateProfileInput
): MatchScoreResult => {
  // 1. Prepare Job Requirements
  const rawJobSkills = job.requiredSkills || job.required_skills || job.skills;
  let requiredSkills = normalizeStringList(rawJobSkills);

  // If no explicit skills listed, extract from title & industry
  if (requiredSkills.length === 0) {
    const title = cleanStr(job.title);
    for (const [trade, synonyms] of Object.entries(TRADE_SYNONYMS)) {
      if (title.includes(trade) || synonyms.some(s => title.includes(s))) {
        requiredSkills = [trade, ...synonyms.slice(0, 3)];
        break;
      }
    }
    if (requiredSkills.length === 0 && job.title) {
      requiredSkills = [job.title.trim()];
    }
  }

  // 2. Prepare Candidate Profile
  const candidateSkills = normalizeStringList(candidate.skills);
  const preferredRoles = normalizeStringList(candidate.preferredRoles || candidate.preferred_roles);
  const allCandidateSkills = Array.from(new Set([...candidateSkills, ...preferredRoles]));

  const candidateContext = cleanStr([
    candidate.bio,
    candidate.highestEducation || candidate.highest_education,
    candidate.degree,
    candidate.specialization,
    preferredRoles.join(' ')
  ].filter(Boolean).join(' '));

  // 3. Calculate Skill Overlap Score (Weight: 45%)
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];
  let totalSkillPoints = 0;

  if (requiredSkills.length > 0) {
    for (const reqSkill of requiredSkills) {
      const match = checkSkillMatch(reqSkill, allCandidateSkills, candidateContext);
      if (match.matched && match.score > 0) {
        matchingSkills.push(reqSkill);
        totalSkillPoints += match.score;
      } else {
        missingSkills.push(reqSkill);
      }
    }
  }

  const skillScoreRaw = requiredSkills.length > 0
    ? Math.min(100, Math.round((totalSkillPoints / requiredSkills.length) * 100))
    : (allCandidateSkills.length > 0 ? 70 : 40);

  // 4. Calculate Experience Score (Weight: 25%)
  const requiredExp = job.experienceYearsRequired != null
    ? Number(job.experienceYearsRequired)
    : (job.experience_years_required != null ? Number(job.experience_years_required) : 0);

  const candidateExp = candidate.experienceYears != null
    ? Number(candidate.experienceYears)
    : (candidate.experience_years != null ? Number(candidate.experience_years) : 0);

  let expScore = 60;
  if (requiredExp <= 0) {
    expScore = candidateExp > 0 ? 100 : 80;
  } else if (candidateExp >= requiredExp) {
    expScore = 100;
  } else if (candidateExp >= requiredExp * 0.75) {
    expScore = 85;
  } else if (candidateExp >= requiredExp * 0.5) {
    expScore = 65;
  } else if (candidateExp > 0) {
    expScore = 45;
  } else {
    expScore = 25;
  }

  // 5. Calculate Location & Proximity Score (Weight: 15%)
  const jobCity = cleanStr(job.city || job.location);
  const candidateCity = cleanStr(candidate.city || candidate.location);
  const preferredCities = normalizeStringList(candidate.preferredCities || candidate.preferred_cities).map(cleanStr);
  const willingToRelocate = Boolean(candidate.willingToRelocate ?? candidate.willing_to_relocate);

  let locScore = 40;
  if (!jobCity) {
    locScore = 85;
  } else if (candidateCity && candidateCity === jobCity) {
    locScore = 100;
  } else {
    // Check metropolitan cluster
    let inSameMetro = false;
    for (const [, cluster] of Object.entries(METRO_CLUSTERS)) {
      if (cluster.includes(jobCity) && cluster.includes(candidateCity)) {
        inSameMetro = true;
        break;
      }
    }

    if (inSameMetro) {
      locScore = 90;
    } else if (preferredCities.includes(jobCity)) {
      locScore = 85;
    } else if (willingToRelocate) {
      locScore = 75;
    } else {
      locScore = 30;
    }
  }

  // 6. Calculate Verification & Credentials Score (Weight: 15%)
  const isVerified = Boolean(candidate.isVerified ?? candidate.is_verified);
  const testResults = candidate.skillTestResults || [];
  const passedTests = testResults.filter(t => t.passed || (t.score != null && t.score >= 70));
  const avgTestScore = testResults.length > 0
    ? Math.round(testResults.reduce((sum, t) => sum + (t.score || 0), 0) / testResults.length)
    : 0;

  let certScore = 30; // base baseline
  if (isVerified) {
    certScore += 35; // +35 for Aadhaar / Biometric verification
  }
  if (passedTests.length > 0) {
    certScore += Math.min(35, Math.round((avgTestScore / 100) * 35)); // up to +35 for test score
  }

  certScore = Math.min(100, Math.max(20, certScore));

  // 7. Weighted Total Score (0 - 100)
  const weightedScore = Math.round(
    (skillScoreRaw * 0.45) +
    (expScore * 0.25) +
    (locScore * 0.15) +
    (certScore * 0.15)
  );

  const overallScore = Math.min(100, Math.max(10, weightedScore));

  // 8. Determine Score Band & Summary
  let scoreBand: MatchScoreResult['scoreBand'] = 'Potential Match';
  if (overallScore >= 85) {
    scoreBand = 'Excellent Match';
  } else if (overallScore >= 70) {
    scoreBand = 'Strong Match';
  } else if (overallScore >= 50) {
    scoreBand = 'Moderate Match';
  }

  const matchSummary = `${scoreBand} (${overallScore}%). Matches ${matchingSkills.length} of ${requiredSkills.length} required skills with ${candidateExp} yrs experience in ${candidate.city || 'local zone'}.`;

  return {
    overallScore,
    scoreBand,
    matchingSkills,
    missingSkills,
    matchSummary,
    breakdown: {
      skills: skillScoreRaw,
      experience: expScore,
      location: locScore,
      verification: certScore
    }
  };
};
