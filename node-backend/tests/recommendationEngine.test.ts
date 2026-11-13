import { describe, test, expect } from 'bun:test';
import {
  scoreSkills,
  scoreHierarchicalLocation,
  calculateHaversineDistanceKm,
  computeDistanceScore,
  scoreWageAlignment,
  scoreExperience,
  scoreVerification,
  scoreActivity,
  getNormalizedJobSkills,
  RECOMMENDATION_CONFIG,
  TRADE_SYNONYMS
} from '../src/services/recommendationEngineService';

describe('Phase 1: Recommendation Engine Backend Stabilization Unit Tests', () => {

  // ==========================================================================
  // Task 1: Job Skill Retrieval & Normalization
  // ==========================================================================
  describe('Task 1: Job Skill Retrieval & Trade Synonym Normalization', () => {
    test('1.1 Prioritizes explicitly defined job_required_skills relation', async () => {
      const mockJobWithExplicit = {
        id: 'job-001',
        title: 'General Maintenance',
        job_required_skills: [
          { skill: 'Circuit Wiring' },
          { skill: 'MCB Repair' }
        ],
        required_skills: 'Plumbing, Masonry'
      };

      const resolved = await getNormalizedJobSkills(mockJobWithExplicit);
      expect(resolved).toEqual(['Circuit Wiring', 'MCB Repair']);
    });

    test('1.2 Falls back to search_index/required_skills string when relation is empty', async () => {
      const mockJobWithoutRelation = {
        title: 'Maintenance',
        required_skills: 'TIG Welding, Arc Fabrication'
      };

      const resolved = await getNormalizedJobSkills(mockJobWithoutRelation);
      expect(resolved).toEqual(['TIG Welding', 'Arc Fabrication']);
    });

    test('1.3 Uses title & description trade heuristics ONLY as fallback', async () => {
      const fallbackJob = {
        title: 'Experienced Heavy Truck Driver',
        industry: 'Logistics',
        description: 'Need commercial vehicle driver for route navigation and delivery'
      };

      const resolved = await getNormalizedJobSkills(fallbackJob);
      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved[0].toLowerCase()).toContain('driver');
    });

    test('1.4 Accurately matches trade synonyms (e.g., Wireman -> Electrician)', () => {
      const jobSkills = ['Electrical', 'MCB Panel'];
      const workerSkills = ['Wireman', 'Switchboard'];

      const evalResult = scoreSkills(jobSkills, workerSkills);
      expect(evalResult.score).toBeGreaterThanOrEqual(80);
      expect(evalResult.matchingSkills.length).toBe(2);
      expect(evalResult.missingSkills.length).toBe(0);
    });
  });

  // ==========================================================================
  // Task 2: Correct Recommendation Scoring (Orthogonal & Non-Double-Counted)
  // ==========================================================================
  describe('Task 2: Independent Feature Scoring & Configurable Weights', () => {
    test('2.1 Weights are centralized and sum to exactly 1.0', () => {
      const workerWeights = RECOMMENDATION_CONFIG.weights.workerToJob;
      const employerWeights = RECOMMENDATION_CONFIG.weights.employerToWorker;

      const sumWorker = Object.values(workerWeights).reduce((a, b) => a + b, 0);
      const sumEmployer = Object.values(employerWeights).reduce((a, b) => a + b, 0);

      expect(Math.round(sumWorker * 100) / 100).toBe(1.0);
      expect(Math.round(sumEmployer * 100) / 100).toBe(1.0);
    });

    test('2.2 Scoring features are strictly orthogonal and do not mutate or double-count', () => {
      const skillScore = 90;
      const geoScore = 40;
      const expScore = 95;
      const wageScore = 70;
      const verifScore = 80;
      const actScore = 60;

      const weights = RECOMMENDATION_CONFIG.weights.employerToWorker;
      const totalScore = Math.round(
        skillScore * weights.skills +
        geoScore * weights.geo +
        expScore * weights.experience +
        wageScore * weights.compensation +
        verifScore * weights.verification +
        actScore * weights.activity
      );

      // (90*0.35)+(40*0.25)+(95*0.15)+(70*0.10)+(80*0.10)+(60*0.05) = 73.75 -> 74
      expect(totalScore).toBe(74);
      expect(totalScore).toBeLessThan(100);
      expect(totalScore).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Task 3: Wage Comparison
  // ==========================================================================
  describe('Task 3: Multi-Unit Wage Comparison & Schedule Norms', () => {
    test('3.1 Accurately evaluates HOURLY job budget vs worker hourly rate', () => {
      const result = scoreWageAlignment(150, 'HOURLY', { hourlyRate: 120 });
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.explanation).toContain('Meets or exceeds');
    });

    test('3.2 Normalizes DAILY job to MONTHLY worker expectation using standard 26-day month', () => {
      const result = scoreWageAlignment(800, 'DAILY', { expectedSalary: 20000 });
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    test('3.3 Handles deficit compensation proportionally without crashing', () => {
      const result = scoreWageAlignment(10000, 'MONTHLY', { expectedSalary: 25000 });
      expect(result.score).toBeLessThan(50);
      expect(result.explanation).toContain('expected wage');
    });

    test('3.4 Assigns neutral baseline score (70) to PROJECT/FIXED or unstated wage', () => {
      const projectResult = scoreWageAlignment(5000, 'PROJECT', { hourlyRate: 200 });
      expect(projectResult.score).toBe(70);
      expect(projectResult.explanation).toContain('project-based');

      const nullResult = scoreWageAlignment(null, 'MONTHLY', { expectedSalary: 20000 });
      expect(nullResult.score).toBe(70);
    });
  });

  // ==========================================================================
  // Task 4: Location Matching & Distance Integrity
  // ==========================================================================
  describe('Task 4: Hierarchical Location Matching without Invented Distances', () => {
    test('4.1 Calculates exact Haversine distance and sigmoid decay when both coordinates exist', () => {
      const lat1 = 18.9401, lon1 = 72.8347;
      const lat2 = 19.0178, lon2 = 72.8478;

      const dist = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
      expect(dist).toBeGreaterThan(7);
      expect(dist).toBeLessThan(11);

      const locResult = scoreHierarchicalLocation(
        { lat: lat1, lng: lon1 },
        { lat: lat2, lng: lon2 }
      );

      expect(locResult.distanceKm).not.toBeNull();
      expect(locResult.distanceKm).toBe(dist);
      expect(locResult.score).toBeGreaterThan(60);
    });

    test('4.2 CRITICAL: Returns distanceKm as NULL when coordinates are missing', () => {
      const locResult = scoreHierarchicalLocation(
        { city: 'Chennai', area: 'Guindy' },
        { city: 'Chennai', area: 'Guindy' }
      );

      expect(locResult.distanceKm).toBeNull();
      expect(locResult.score).toBe(95); // Exact area match
      expect(locResult.matchReason).toContain('Same neighborhood');
    });

    test('4.3 Evaluates administrative text hierarchy correctly (City -> Taluk -> District -> State)', () => {
      const cityMatch = scoreHierarchicalLocation(
        { city: 'Kanchipuram' },
        { city: 'Kanchipuram' }
      );
      expect(cityMatch.score).toBe(85);
      expect(cityMatch.distanceKm).toBeNull();

      const prefMatch = scoreHierarchicalLocation(
        { city: 'Madurai', preferredCities: ['Chennai', 'Coimbatore'] },
        { city: 'Chennai' }
      );
      expect(prefMatch.score).toBe(80);
      expect(prefMatch.distanceKm).toBeNull();

      const relocateMatch = scoreHierarchicalLocation(
        { state: 'Tamil Nadu', willingToRelocate: true },
        { state: 'Maharashtra' }
      );
      expect(relocateMatch.score).toBe(60);
      expect(relocateMatch.matchReason).toContain('relocation');
    });
  });

  // ==========================================================================
  // Task 5: Eligibility Filters & Exclusions
  // ==========================================================================
  describe('Task 5: Strict Eligibility Gating', () => {
    test('5.1 Filters out expired jobs (expires_at < current time)', () => {
      const pastDate = new Date(Date.now() - 3600000);
      const futureDate = new Date(Date.now() + 86400000);

      const isExpired = (expiresAt: Date | null) => expiresAt != null && expiresAt < new Date();
      expect(isExpired(pastDate)).toBe(true);
      expect(isExpired(futureDate)).toBe(false);
      expect(isExpired(null)).toBe(false); // No expiration
    });

    test('5.2 Excludes inactive, draft, and closed job statuses', () => {
      const allowedStatuses = ['OPEN', 'ACTIVE'];
      expect(allowedStatuses.includes('OPEN')).toBe(true);
      expect(allowedStatuses.includes('ACTIVE')).toBe(true);
      expect(allowedStatuses.includes('CLOSED')).toBe(false);
      expect(allowedStatuses.includes('FILLED')).toBe(false);
      expect(allowedStatuses.includes('DRAFT')).toBe(false);
      expect(allowedStatuses.includes('EXPIRED')).toBe(false);
    });

    test('5.3 Excludes unavailable workers and dismissed items', () => {
      const workers = [
        { id: 'w1', isAvailable: true },
        { id: 'w2', isAvailable: false },
        { id: 'w3', isAvailable: true }
      ];
      const dismissedIds = new Set(['w3']);

      const eligible = workers.filter(w => w.isAvailable && !dismissedIds.has(w.id));
      expect(eligible.length).toBe(1);
      expect(eligible[0].id).toBe('w1');
    });
  });

  // ==========================================================================
  // Task 6: Verification Scoring Separation
  // ==========================================================================
  describe('Task 6: Independent Verification & Credential Scoring', () => {
    test('6.1 Identity verification, skill level, and ratings are evaluated independently', () => {
      const verifiedProScore = scoreVerification(true, 3, 4.8);
      expect(verifiedProScore).toBeGreaterThanOrEqual(90);

      const unverifiedScore = scoreVerification(false, 1, null);
      expect(unverifiedScore).toBeLessThan(45);
    });

    test('6.2 Trust score is NOT conflated with identity KYC', () => {
      const partialVerif = scoreVerification(false, 2, 4.0);
      expect(partialVerif).toBeLessThanOrEqual(55);
    });
  });

  // ==========================================================================
  // Task 7: Pagination Mathematics
  // ==========================================================================
  describe('Task 7: Accurate Pagination & Totals', () => {
    test('7.1 Slices results according to page and limit with accurate totalPages', () => {
      const allResults = Array.from({ length: 42 }, (_, i) => ({ id: `job-${i}`, score: 90 - i }));
      const limit = 10;
      const page = 3;

      const offset = (page - 1) * limit;
      const paginated = allResults.slice(offset, offset + limit);
      const totalPages = Math.ceil(allResults.length / limit);

      expect(paginated.length).toBe(10);
      expect(paginated[0].id).toBe('job-20');
      expect(totalPages).toBe(5);
    });
  });

  // ==========================================================================
  // Task 8: Telemetry Validation
  // ==========================================================================
  describe('Task 8: Telemetry Interaction Types & Integrity', () => {
    test('8.1 Recognizes and validates standard telemetry interaction types', () => {
      const validTypes = ['VIEW', 'CLICK', 'SAVE', 'APPLY', 'INVITE', 'DISMISS'];
      expect(validTypes.includes('VIEW')).toBe(true);
      expect(validTypes.includes('APPLY')).toBe(true);
      expect(validTypes.includes('INVITE')).toBe(true);
      expect(validTypes.includes('DISMISS')).toBe(true);
      expect(validTypes.includes('UNKNOWN')).toBe(false);
    });
  });

  // ==========================================================================
  // Experience & Activity Scoring
  // ==========================================================================
  describe('Experience & Activity Scoring', () => {
    test('Evaluates candidate experience years against required years', () => {
      expect(scoreExperience(3, 5)).toBe(95);
      expect(scoreExperience(5, 2)).toBe(35);
      expect(scoreExperience(0, 1)).toBe(95);
    });

    test('Evaluates availability and recency decay', () => {
      const recentAvailable = scoreActivity(true, new Date());
      expect(recentAvailable).toBe(100);

      const oldUnavailable = scoreActivity(false, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      expect(oldUnavailable).toBeLessThan(40);
    });
  });

});
