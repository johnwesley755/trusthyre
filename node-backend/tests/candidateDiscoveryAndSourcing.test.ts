import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import prisma, { withSystemContext } from '../src/config/prisma';
import { recommendationEngineService } from '../src/services/recommendationEngineService';
import { v4 as uuidv4 } from 'uuid';

describe('Job-Specific Talent Discovery & Candidate Sourcing Tests', () => {
  let employerUserId: string;
  let workerUserId1: string;
  let workerUserId2: string;
  let workerUserId3: string;
  let testJobId: string;

  beforeAll(async () => {
    employerUserId = uuidv4();
    workerUserId1 = uuidv4();
    workerUserId2 = uuidv4();
    workerUserId3 = uuidv4();

    await withSystemContext(prisma, async (tx: any) => {
      // 1. Create Employer User & Profile
      await tx.user_metadata.create({
        data: {
          id: employerUserId,
          email: `${employerUserId}@trusthyre.test`,
          role: 'EMPLOYER',
          first_name: 'Discovery',
          last_name: 'Employer'
        }
      });
      await tx.employer_profiles.create({
        data: {
          id: uuidv4(),
          user_id: employerUserId,
          company_name: 'Discovery Corp',
          is_verified: true
        }
      });

      // 2. Create Active Job
      const job = await tx.jobs.create({
        data: {
          employer_id: employerUserId,
          title: 'Industrial Electrician',
          industry: 'Electrical',
          city: 'Chennai',
          location: 'Guindy',
          status: 'ACTIVE',
          experience_years_required: 2
        }
      });
      testJobId = job.id;

      // 3. Create Worker 1 (Will apply for the job)
      await tx.user_metadata.create({
        data: {
          id: workerUserId1,
          email: `${workerUserId1}@trusthyre.test`,
          role: 'WORKER',
          first_name: 'Applied',
          last_name: 'Worker'
        }
      });
      await tx.worker_profiles.create({
        data: {
          id: uuidv4(),
          user_id: workerUserId1,
          full_name: 'Applied Worker',
          skills: 'Wiring, MCB, Inverter',
          city: 'Chennai',
          experience_years: 3,
          is_available: true
        }
      });

      // Existing application for Worker 1
      await tx.job_applications.create({
        data: {
          id: uuidv4(),
          job_id: testJobId,
          worker_id: workerUserId1,
          status: 'PENDING',
          applied_at: new Date()
        }
      });

      // 4. Create Worker 2 (Eligible, NOT applied - Should appear in Discovery)
      await tx.user_metadata.create({
        data: {
          id: workerUserId2,
          email: `${workerUserId2}@trusthyre.test`,
          role: 'WORKER',
          first_name: 'Discoverable',
          last_name: 'Electrician'
        }
      });
      await tx.worker_profiles.create({
        data: {
          id: uuidv4(),
          user_id: workerUserId2,
          full_name: 'Discoverable Electrician',
          skills: 'Wiring, Transformer, Circuit, MCB',
          city: 'Chennai',
          experience_years: 4,
          is_available: true
        }
      });

      // 5. Create Worker 3 (Different city, lower experience)
      await tx.user_metadata.create({
        data: {
          id: workerUserId3,
          email: `${workerUserId3}@trusthyre.test`,
          role: 'WORKER',
          first_name: 'Remote',
          last_name: 'Worker'
        }
      });
      await tx.worker_profiles.create({
        data: {
          id: uuidv4(),
          user_id: workerUserId3,
          full_name: 'Remote Worker',
          skills: 'Plumbing',
          city: 'Madurai',
          experience_years: 1,
          is_available: true
        }
      });
    });
  });

  afterAll(async () => {
    await withSystemContext(prisma, async (tx: any) => {
      await tx.job_applications.deleteMany({ where: { job_id: testJobId } });
      await tx.jobs.deleteMany({ where: { id: testJobId } });
      await tx.employer_profiles.deleteMany({ where: { user_id: employerUserId } });
      await tx.worker_profiles.deleteMany({
        where: { user_id: { in: [workerUserId1, workerUserId2, workerUserId3] } }
      });
      await tx.user_metadata.deleteMany({
        where: { id: { in: [employerUserId, workerUserId1, workerUserId2, workerUserId3] } }
      });
    });
  });

  it('1. Recommendations exclude candidates who already applied for the selected job', async () => {
    const result = await recommendationEngineService.getRecommendedWorkersForEmployer(
      employerUserId,
      { jobId: testJobId, limit: 10 }
    );

    expect(result.recommendations).toBeDefined();
    const recommendedIds = result.recommendations.map(r => r.worker.userId);

    // Worker 1 already applied, so MUST be excluded
    expect(recommendedIds.includes(workerUserId1)).toBe(false);

    // Worker 2 has not applied and has strong skills, so should be in recommendations
    expect(recommendedIds.includes(workerUserId2)).toBe(true);
  });

  it('2. Structured filters filter recommendations accurately', async () => {
    // City filter
    const chennaiResult = await recommendationEngineService.getRecommendedWorkersForEmployer(
      employerUserId,
      { jobId: testJobId, city: 'Chennai' }
    );
    const chennaiIds = chennaiResult.recommendations.map(r => r.worker.userId);
    expect(chennaiIds.includes(workerUserId2)).toBe(true);
    expect(chennaiIds.includes(workerUserId3)).toBe(false);

    // Min experience filter
    const expResult = await recommendationEngineService.getRecommendedWorkersForEmployer(
      employerUserId,
      { jobId: testJobId, minExp: 3 }
    );
    const expIds = expResult.recommendations.map(r => r.worker.userId);
    expect(expIds.includes(workerUserId2)).toBe(true);
    expect(expIds.includes(workerUserId3)).toBe(false);
  });
});
