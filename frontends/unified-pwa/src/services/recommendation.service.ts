import apiClient from '../api/apiClient';
import type { Job } from '../types';
import type { WorkerPreferences } from '../modules/profile/components/PreferencesModal';
import { calculateMatchScore } from '../utils/matchScorer';

export interface RecommendedJob extends Job {
  matchPercentage: number;
  matchReasons: string[];
}

export const recommendationService = {
  getRecommendedJobs: async (preferences?: WorkerPreferences): Promise<RecommendedJob[]> => {
    // 1. Fetch available jobs
    const res = await apiClient.get<any>('/api/search/jobs');
    const jobsList: Job[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);

    const userPrefs: WorkerPreferences = preferences || (() => {
      const saved = localStorage.getItem('worker_job_preferences');
      return saved ? JSON.parse(saved) : {
        skills: ['Electrician', 'Plumber', 'Carpenter'],
        minHourlyRate: 200,
        maxDistanceKm: 25,
        preferredCity: 'Chennai',
        jobTypes: ['Full-time'],
        availability: 'IMMEDIATE'
      };
    })();

    // 2. Score and rank jobs using dynamic matching engine
    const scoredJobs: RecommendedJob[] = jobsList.map((job) => {
      const analysis = calculateMatchScore(job, {
        skills: userPrefs.skills,
        preferredRoles: userPrefs.skills,
        city: userPrefs.preferredCity,
        location: userPrefs.preferredCity,
        preferredCities: [userPrefs.preferredCity],
        experienceYears: 2,
        isVerified: true
      });

      const reasons: string[] = [];
      if (analysis.matchingSkills.length > 0) {
        reasons.push(`Skills overlap: ${analysis.matchingSkills.join(', ')}`);
      }
      if (job.city && userPrefs.preferredCity && job.city.toLowerCase().includes(userPrefs.preferredCity.toLowerCase())) {
        reasons.push(`Preferred location: ${job.city}`);
      }
      if (job.budget && job.budget >= userPrefs.minHourlyRate * 8) {
        reasons.push(`Rate matches pay expectation`);
      }
      if (reasons.length === 0) {
        reasons.push(analysis.matchSummary);
      }

      return {
        ...job,
        matchPercentage: analysis.overallScore,
        matchReasons: reasons
      };
    });

    // Sort by match percentage descending
    scoredJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return scoredJobs;
  }
};
