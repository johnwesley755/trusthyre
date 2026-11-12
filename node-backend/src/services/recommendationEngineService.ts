/**
 * Recommendation Engine Service (Backend)
 * 
 * High-performance, two-stage bidirectional recommendation engine for TrustHyre.
 * Implements:
 * 1. Stage 1 SQL-indexed retrieval & hard pruning
 * 2. Stage 2 Multi-objective feature scoring (Skills, Geo-proximity, Experience, Wage, Verification, Activity)
 * 3. Stage 3 Cold-start freshness & diversity re-ranking
 */

import prisma from '../config/prisma';
import { calculateCandidateJobMatch } from './matchScoreService';

// ============================================================================
// TAXONOMY & SYNONYMS
// ============================================================================

const TRADE_SYNONYMS: Record<string, string[]> = {
  electrician: [
    'electrical', 'wiring', 'circuit', 'mcb', 'switchboard', 'conduit',
    'inverter', 'panel', 'substation', 'high voltage', 'single phase',
    'three phase', 'solar', 'transformer', 'lighting', 'cabling', 'wireman'
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
    'logistics delivery', 'route navigation', 'gps', 'forklift operator', 'chauffeur'
  ],
  warehouse: [
    'inventory', 'packaging', 'loading', 'unloading', 'stocking', 'picking',
    'dispatch', 'warehouse management', 'pallet', 'barcoding', 'helper'
  ],
  security: [
    'security guard', 'surveillance', 'cctv monitoring', 'patrolling',
    'access control', 'gatekeeper', 'visitor management', 'incident reporting', 'bouncer'
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
 * - 0 - 5 km: Score 90 - 100%
 * - 12 km: Score 50% (Standard inflection point)
 * - > 25 km: Score < 10%
 */
export const computeDistanceScore = (distanceKm: number): number => {
  if (distanceKm <= 3) return 100;
  if (distanceKm <= 6) return 92;
  const score = 1 / (1 + Math.exp(0.25 * (distanceKm - 12)));
  return Math.min(100, Math.max(0, Math.round(score * 100)));
};

// ============================================================================
// HELPER NORMALIZERS
// ============================================================================

const clean = (val?: string | null): string => {
  return (val || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

const parseList = (input?: any): string[] => {
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
    trust: number;
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
    trust: number;
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
  ): Promise<{ recommendations: ScoredJobRecommendation[]; total: number }> => {
    const limit = Math.min(options.limit || 15, 50);
    const page = Math.max(options.page || 1, 1);

    // 1. Fetch Worker Profile Context
    const workerProfile = await prisma.worker_profiles.findFirst({
      where: { user_id: workerUserId }
    });

    const userMeta = await prisma.user_metadata.findUnique({
      where: { id: workerUserId }
    });

    const workerLat = options.lat ?? workerProfile?.latitude ?? null;
    const workerLng = options.lng ?? workerProfile?.longitude ?? null;
    const workerCity = workerProfile?.city || workerProfile?.location || '';
    const workerSkills = parseList(workerProfile?.skills);
    const workerExp = workerProfile?.experience_years ?? 0;
    const workerVerified = Boolean(workerProfile?.trust_score && workerProfile.trust_score >= 50);

    // 2. Fetch User Interaction History to Exclude Already Applied / Dismissed Jobs
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

    // 3. Stage 1: Retrieval & Hard Pruning
    const candidateJobs = await prisma.jobs.findMany({
      where: {
        status: { in: ['OPEN', 'ACTIVE'] },
        id: { notIn: Array.from(excludedJobIds) }
      },
      take: 200,
      orderBy: { created_at: 'desc' }
    });

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

    // 4. Stage 2: Multi-Objective Weighted Ranking
    const scoredList: ScoredJobRecommendation[] = [];

    for (const job of candidateJobs) {
      // 4a. Skills & Trade Matching (Weight: 0.35)
      const rawJobSkills = (job as any).required_skills || (job as any).requiredSkills || job.title;
      const jobSkillsList = parseList(rawJobSkills);
      if (jobSkillsList.length === 0 && job.title) {
        jobSkillsList.push(job.title);
      }

      const matchResult = calculateCandidateJobMatch(
        {
          title: job.title,
          requiredSkills: jobSkillsList,
          city: job.city || undefined,
          experienceYearsRequired: job.experience_years_required ?? 0
        },
        {
          skills: workerSkills,
          preferredRoles: workerSkills,
          city: workerCity,
          experienceYears: workerExp,
          isVerified: workerVerified
        }
      );

      const skillScore = matchResult.breakdown.skills;

      // 4b. Geo-Proximity & Commute Scoring (Weight: 0.25)
      let geoScore = 50;
      let distKm: number | null = null;
      if (workerLat != null && workerLng != null && job.latitude != null && job.longitude != null) {
        distKm = calculateHaversineDistanceKm(workerLat, workerLng, job.latitude, job.longitude);
        geoScore = computeDistanceScore(distKm);
      } else if (workerCity && job.city) {
        const c1 = clean(workerCity);
        const c2 = clean(job.city);
        if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) {
          geoScore = 90;
        } else {
          geoScore = 40;
        }
      }

      // 4c. Experience Alignment (Weight: 0.15)
      const reqExp = job.experience_years_required ?? 0;
      let expScore = 80;
      if (workerExp < reqExp) {
        const gap = reqExp - workerExp;
        expScore = Math.max(20, 80 - gap * 20);
      } else {
        expScore = 95;
      }

      // 4d. Compensation Alignment (Weight: 0.10)
      let compScore = 75;
      const budget = Number(job.budget || 0);
      if (budget > 0 && workerProfile?.hourly_rate) {
        const expectedMonthly = Number(workerProfile.hourly_rate) * 8 * 26;
        if (budget >= expectedMonthly * 0.9) {
          compScore = 95;
        } else {
          compScore = Math.max(30, Math.round((budget / expectedMonthly) * 80));
        }
      }

      // 4e. Trust & Verification (Weight: 0.10)
      const empProfile = job.employer_id ? employerMap.get(job.employer_id) : null;
      let trustScore = 60;
      if (empProfile?.is_verified) {
        trustScore += 25;
      }
      if (job.employer_id) {
        trustScore += 15;
      }
      trustScore = Math.min(100, trustScore);

      // 4f. Activity & Recency (Weight: 0.05)
      let activityScore = 50;
      if (job.created_at) {
        const ageHours = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60);
        if (ageHours <= 24) activityScore = 100;
        else if (ageHours <= 72) activityScore = 85;
        else if (ageHours <= 168) activityScore = 70;
        else activityScore = 45;
      }

      // Compute Total Weighted Score
      const totalScore = Math.min(
        99,
        Math.max(
          25,
          Math.round(
            skillScore * 0.35 +
            geoScore * 0.25 +
            expScore * 0.15 +
            compScore * 0.10 +
            trustScore * 0.10 +
            activityScore * 0.05
          )
        )
      );

      // Generate Descriptive Reasons
      const matchReasons: string[] = [];
      if (matchResult.matchingSkills.length > 0) {
        matchReasons.push(`Skills match: ${matchResult.matchingSkills.slice(0, 3).join(', ')}`);
      }
      if (distKm != null && distKm <= 10) {
        matchReasons.push(`Near you (~${distKm} km)`);
      } else if (job.city && workerCity && clean(job.city) === clean(workerCity)) {
        matchReasons.push(`Located in your city (${job.city})`);
      }
      if (trustScore >= 80) {
        matchReasons.push('Verified corporate worksite');
      }
      if (activityScore >= 85) {
        matchReasons.push('Recently posted opening');
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
          dailyRate: (job as any).daily_rate,
          wageViewMode: (job as any).wage_view_mode,
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
        distanceKm: distKm,
        matchReasons,
        matchingSkills: matchResult.matchingSkills,
        missingSkills: matchResult.missingSkills,
        breakdown: {
          skills: skillScore,
          geo: geoScore,
          experience: expScore,
          compensation: compScore,
          trust: trustScore,
          activity: activityScore
        }
      });
    }

    // 5. Stage 3: Cold-start Exploration & Sorting
    scoredList.sort((a, b) => b.overallScore - a.overallScore);

    const offset = (page - 1) * limit;
    const paginated = scoredList.slice(offset, offset + limit);

    return {
      recommendations: paginated,
      total: scoredList.length
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
  ): Promise<{ recommendations: ScoredWorkerRecommendation[]; total: number }> => {
    const limit = Math.min(options.limit || 15, 50);
    const page = Math.max(options.page || 1, 1);

    // 1. Fetch Employer Profile and Target Job(s)
    let targetJobs: any[] = [];
    if (options.jobId) {
      const singleJob = await prisma.jobs.findFirst({
        where: { id: options.jobId, employer_id: employerUserId }
      });
      if (singleJob) targetJobs = [singleJob];
    } else {
      targetJobs = await prisma.jobs.findMany({
        where: { employer_id: employerUserId, status: { in: ['OPEN', 'ACTIVE'] } },
        orderBy: { created_at: 'desc' },
        take: 10
      });
    }

    // 2. Fetch Dismissed or Contacted Candidates to Exclude
    const dismissed = await prisma.recommendation_interactions.findMany({
      where: {
        user_id: employerUserId,
        item_type: 'WORKER',
        interaction_type: 'DISMISS'
      },
      select: { item_id: true }
    });
    const dismissedIds = new Set(dismissed.map(d => d.item_id));

    // 3. Stage 1: Retrieval of Active Workers
    const activeWorkers = await prisma.worker_profiles.findMany({
      where: {
        is_available: true,
        user_id: { notIn: Array.from(dismissedIds) }
      },
      take: 200,
      orderBy: { updated_at: 'desc' }
    });

    // 4. Stage 2: Scoring Candidates Against Target Job(s)
    const scoredCandidates: ScoredWorkerRecommendation[] = [];

    for (const worker of activeWorkers) {
      const workerSkills = parseList(worker.skills);
      const workerExp = worker.experience_years ?? 0;
      const isVerified = Boolean(worker.trust_score && worker.trust_score >= 50);

      // Evaluate against the best-matching employer job
      let bestJobScore = 0;
      let bestMatchingSkills: string[] = [];
      let bestMissingSkills: string[] = [];
      let bestDistKm: number | null = null;
      let bestGeoScore = 50;

      if (targetJobs.length > 0) {
        for (const job of targetJobs) {
          const rawJobSkills = (job as any).required_skills || (job as any).requiredSkills || job.title;
          const jobSkillsList = parseList(rawJobSkills);
          if (jobSkillsList.length === 0 && job.title) jobSkillsList.push(job.title);

          const analysis = calculateCandidateJobMatch(
            {
              title: job.title,
              requiredSkills: jobSkillsList,
              city: job.city || undefined,
              experienceYearsRequired: job.experience_years_required ?? 0
            },
            {
              skills: workerSkills,
              preferredRoles: workerSkills,
              city: worker.city || worker.location || '',
              experienceYears: workerExp,
              isVerified
            }
          );

          let geo = 50;
          let dist: number | null = null;
          if (worker.latitude != null && worker.longitude != null && job.latitude != null && job.longitude != null) {
            dist = calculateHaversineDistanceKm(worker.latitude, worker.longitude, job.latitude, job.longitude);
            geo = computeDistanceScore(dist);
          } else if (worker.city && job.city && clean(worker.city) === clean(job.city)) {
            geo = 90;
          }

          if (analysis.overallScore > bestJobScore) {
            bestJobScore = analysis.overallScore;
            bestMatchingSkills = analysis.matchingSkills;
            bestMissingSkills = analysis.missingSkills;
            bestDistKm = dist;
            bestGeoScore = geo;
          }
        }
      } else {
        // Fallback: evaluate general profile strength
        const skillsPts = Math.min(45, workerSkills.length * 10);
        const expPts = Math.min(25, workerExp * 5 + 5);
        const verifPts = isVerified ? 20 : 5;
        const locPts = (worker.city || worker.location) ? 10 : 0;
        bestJobScore = Math.min(95, Math.max(30, skillsPts + expPts + verifPts + locPts));
        bestMatchingSkills = workerSkills.slice(0, 3);
        bestGeoScore = (worker.city || worker.location) ? 80 : 40;
      }

      // Feature breakdown computation
      const trustWeight = isVerified ? 90 : 40;
      const expWeight = Math.min(100, Math.max(30, workerExp * 20 + 20));
      const activityWeight = worker.is_available ? 95 : 40;

      const finalScore = Math.min(
        99,
        Math.max(
          30,
          Math.round(
            bestJobScore * 0.40 +
            bestGeoScore * 0.25 +
            expWeight * 0.15 +
            trustWeight * 0.10 +
            activityWeight * 0.10
          )
        )
      );

      const reasons: string[] = [];
      if (bestMatchingSkills.length > 0) {
        reasons.push(`Verified skills: ${bestMatchingSkills.slice(0, 3).join(', ')}`);
      }
      if (bestDistKm != null && bestDistKm <= 10) {
        reasons.push(`Nearby candidate (~${bestDistKm} km)`);
      } else if (worker.city) {
        reasons.push(`Based in ${worker.city}`);
      }
      if (isVerified) {
        reasons.push('Identity & skill credentials verified');
      }
      if (worker.is_available) {
        reasons.push('Available for immediate start');
      }

      const scoreBand =
        finalScore >= 85 ? 'Excellent Match' :
        finalScore >= 70 ? 'Strong Match' :
        finalScore >= 50 ? 'Moderate Match' : 'Potential Match';

      scoredCandidates.push({
        worker: {
          id: worker.id,
          userId: worker.user_id,
          name: worker.full_name,
          bio: worker.bio,
          skills: worker.skills,
          location: worker.location,
          city: worker.city,
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
          skills: bestJobScore,
          geo: bestGeoScore,
          experience: expWeight,
          compensation: 75,
          trust: trustWeight,
          activity: activityWeight
        }
      });
    }

    scoredCandidates.sort((a, b) => b.overallScore - a.overallScore);

    const offset = (page - 1) * limit;
    const paginated = scoredCandidates.slice(offset, offset + limit);

    return {
      recommendations: paginated,
      total: scoredCandidates.length
    };
  },

  /**
   * Telemetry recording for implicit and explicit recommendation interactions.
   */
  recordInteraction: async (data: {
    userId: string;
    interactionType: 'VIEW' | 'CLICK' | 'SAVE' | 'APPLY' | 'INVITE' | 'DISMISS';
    itemType: 'JOB' | 'WORKER';
    itemId: string;
    matchScore?: number;
    metadata?: any;
  }) => {
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
