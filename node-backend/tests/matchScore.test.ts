import { calculateCandidateJobMatch } from '../src/services/matchScoreService';

describe('MatchScoreService Unit Tests', () => {
  const sampleJob = {
    id: 'job-123',
    title: 'Senior Industrial Electrician',
    industry: 'Manufacturing',
    requiredSkills: ['Wiring', 'Circuit Breakers', 'PLC Troubleshooting', 'Three Phase Motors'],
    experienceYearsRequired: 3,
    city: 'Mumbai',
    location: 'Andheri East, Mumbai'
  };

  test('High Match: Candidate with identical trade skills, sufficient experience, same city, and verification', () => {
    const candidate = {
      userId: 'user-001',
      skills: ['Wiring', 'Circuit Breakers', 'PLC Troubleshooting', 'Three Phase Motors', 'Inverter'],
      experienceYears: 4,
      city: 'Mumbai',
      isVerified: true,
      skillTestResults: [{ score: 88, passed: true }]
    };

    const result = calculateCandidateJobMatch(sampleJob, candidate);
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.scoreBand).toBe('Excellent Match');
    expect(result.matchingSkills.length).toBe(4);
    expect(result.missingSkills.length).toBe(0);
    expect(result.breakdown.skills).toBe(100);
    expect(result.breakdown.experience).toBe(100);
    expect(result.breakdown.location).toBe(100);
  });

  test('Strong Match: Trade synonym match (Electrician synonyms) in nearby metro area', () => {
    const candidate = {
      userId: 'user-002',
      skills: ['Electrical wiring', 'Substation panel', 'Switchboard installation'],
      preferredRoles: ['Electrician'],
      experienceYears: 3,
      city: 'Navi Mumbai', // same metro cluster
      isVerified: true,
      skillTestResults: [{ score: 75, passed: true }]
    };

    const result = calculateCandidateJobMatch(sampleJob, candidate);
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.scoreBand).toBe('Strong Match');
    expect(result.breakdown.location).toBe(90); // Navi Mumbai in Mumbai cluster
  });

  test('Moderate Match: Candidate with partial skills and less experience', () => {
    const candidate = {
      userId: 'user-003',
      skills: ['Wiring', 'Basic Lighting'],
      experienceYears: 1,
      city: 'Pune',
      willingToRelocate: true,
      isVerified: false
    };

    const result = calculateCandidateJobMatch(sampleJob, candidate);
    expect(result.overallScore).toBeLessThan(70);
    expect(result.overallScore).toBeGreaterThanOrEqual(40);
    expect(result.missingSkills).toContain('PLC Troubleshooting');
  });

  test('Low Match: Mismatched trade (e.g. Cook applying for Electrician)', () => {
    const candidate = {
      userId: 'user-004',
      skills: ['Tandoor Cooking', 'Food Hygiene', 'North Indian Gravy'],
      preferredRoles: ['Chef'],
      experienceYears: 5,
      city: 'Chennai',
      willingToRelocate: false,
      isVerified: false
    };

    const result = calculateCandidateJobMatch(sampleJob, candidate);
    expect(result.overallScore).toBeLessThan(50);
    expect(result.scoreBand).toBe('Potential Match');
    expect(result.matchingSkills.length).toBe(0);
  });
});

