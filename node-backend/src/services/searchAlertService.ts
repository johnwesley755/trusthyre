import prisma from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';
import { NotificationDispatcher } from './notificationDispatcher';

export interface CreateSearchAlertInput {
  userId: string;
  alertType?: 'JOB_ALERT' | 'CANDIDATE_ALERT';
  title?: string;
  query?: string;
  city?: string;
  category?: string;
  minSalary?: number;
  maxSalary?: number;
  experience?: string;
  frequency?: 'INSTANT' | 'DAILY';
}

export class SearchAlertService {
  /**
   * Creates a new user search alert (candidate job alert or employer talent alert).
   */
  public static async createAlert(input: CreateSearchAlertInput) {
    const alertType = input.alertType || 'JOB_ALERT';
    
    // Auto-generate title if not provided
    const labelParts: string[] = [];
    if (input.query) labelParts.push(`"${input.query}"`);
    if (input.category && input.category !== 'All') labelParts.push(input.category);
    if (input.city) labelParts.push(`in ${input.city}`);
    const generatedTitle = input.title || (labelParts.length > 0 ? labelParts.join(' ') : (alertType === 'JOB_ALERT' ? 'All New Jobs' : 'All New Candidates'));

    const alertId = uuidv4();
    const query = input.query?.trim() || null;
    const city = input.city?.trim() || null;
    const category = (input.category && input.category !== 'All') ? input.category.trim() : null;
    const minSalary = input.minSalary ? Number(input.minSalary) : null;
    const maxSalary = input.maxSalary ? Number(input.maxSalary) : null;
    const experience = (input.experience && input.experience !== 'all') ? input.experience.trim() : null;
    const frequency = input.frequency || 'INSTANT';

    try {
      // 1. Idempotency Check: Prevent duplicate alerts for the same user and search criteria
      let existingAlert: any = null;
      if ((prisma as any).user_search_alerts) {
        existingAlert = await (prisma as any).user_search_alerts.findFirst({
          where: {
            user_id: input.userId,
            alert_type: alertType,
            city: city,
            category: category,
            query: query
          }
        });
      } else {
        const rows = await prisma.$queryRaw<any[]>`
          SELECT * FROM user_search_alerts
          WHERE user_id = ${input.userId}
            AND alert_type = ${alertType}
            AND city IS NOT DISTINCT FROM ${city}
            AND category IS NOT DISTINCT FROM ${category}
            AND query IS NOT DISTINCT FROM ${query}
          LIMIT 1
        `;
        existingAlert = rows[0];
      }

      if (existingAlert) {
        console.log(`[SearchAlertService] Idempotency: alert already exists for user ${input.userId} (ID: ${existingAlert.id}). Reactivating if needed.`);
        if (!existingAlert.is_active) {
          if ((prisma as any).user_search_alerts) {
            return await (prisma as any).user_search_alerts.update({
              where: { id: existingAlert.id },
              data: { is_active: true, updated_at: new Date() }
            });
          } else {
            await prisma.$executeRaw`
              UPDATE user_search_alerts SET is_active = true, updated_at = NOW() WHERE id = ${existingAlert.id}::uuid
            `;
            existingAlert.is_active = true;
          }
        }
        return existingAlert;
      }

      if ((prisma as any).user_search_alerts) {
        return await (prisma as any).user_search_alerts.create({
          data: {
            id: alertId,
            user_id: input.userId,
            alert_type: alertType,
            title: generatedTitle,
            query,
            city,
            category,
            min_salary: minSalary,
            max_salary: maxSalary,
            experience,
            frequency,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      } else {
        const rows = await prisma.$queryRaw<any[]>`
          INSERT INTO user_search_alerts (
            id, user_id, alert_type, title, query, city, category, min_salary, max_salary, experience, frequency, is_active, created_at, updated_at
          ) VALUES (
            ${alertId}::uuid, ${input.userId}, ${alertType}, ${generatedTitle}, ${query}, ${city}, ${category}, ${minSalary}, ${maxSalary}, ${experience}, ${frequency}, true, NOW(), NOW()
          ) RETURNING *
        `;
        return rows[0];
      }
    } catch (err: any) {
      console.error('[SearchAlertService] Error creating search alert:', err.message);
      throw err;
    }
  }

  /**
   * Retrieves active search alerts for a user.
   */
  public static async getUserAlerts(userId: string, alertType?: string) {
    try {
      if ((prisma as any).user_search_alerts) {
        return await (prisma as any).user_search_alerts.findMany({
          where: {
            user_id: userId,
            ...(alertType ? { alert_type: alertType } : {})
          },
          orderBy: { created_at: 'desc' }
        });
      } else {
        if (alertType) {
          return await prisma.$queryRaw<any[]>`
            SELECT * FROM user_search_alerts 
            WHERE user_id = ${userId} AND alert_type = ${alertType}
            ORDER BY created_at DESC
          `;
        }
        return await prisma.$queryRaw<any[]>`
          SELECT * FROM user_search_alerts 
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;
      }
    } catch (err: any) {
      console.error('[SearchAlertService] Error fetching user alerts:', err.message);
      return [];
    }
  }

  /**
   * Toggles the active/paused state of a search alert.
   */
  public static async toggleAlert(alertId: string, userId: string, isActive: boolean) {
    try {
      if ((prisma as any).user_search_alerts) {
        return await (prisma as any).user_search_alerts.updateMany({
          where: { id: alertId, user_id: userId },
          data: { is_active: isActive, updated_at: new Date() }
        });
      } else {
        return await prisma.$executeRaw`
          UPDATE user_search_alerts 
          SET is_active = ${isActive}, updated_at = NOW() 
          WHERE id = ${alertId}::uuid AND user_id = ${userId}
        `;
      }
    } catch (err: any) {
      console.error('[SearchAlertService] Error toggling alert:', err.message);
      throw err;
    }
  }

  /**
   * Deletes a search alert.
   */
  public static async deleteAlert(alertId: string, userId: string) {
    try {
      if ((prisma as any).user_search_alerts) {
        return await (prisma as any).user_search_alerts.deleteMany({
          where: { id: alertId, user_id: userId }
        });
      } else {
        return await prisma.$executeRaw`
          DELETE FROM user_search_alerts 
          WHERE id = ${alertId}::uuid AND user_id = ${userId}
        `;
      }
    } catch (err: any) {
      console.error('[SearchAlertService] Error deleting alert:', err.message);
      throw err;
    }
  }

  /**
   * REVERSE SEARCH MATCHING ENGINE FOR NEW JOBS (Indeed / Naukri Job Alerts Model)
   * Evaluates a newly posted job against registered candidate search alerts.
   * Dispatches push + in-app notification only to matching candidates whose cooldown has elapsed.
   */
  public static async matchNewJobAgainstAlerts(job: {
    id: string;
    title: string;
    description?: string | null;
    industry?: string | null;
    city?: string | null;
    budget?: number | string | null;
    employer_id: string;
    required_skills?: string | null;
    experience_years_required?: number | null;
  }) {
    try {
      const jobCity = (job.city || '').trim().toLowerCase();
      const jobIndustry = (job.industry || '').trim().toLowerCase();
      const jobBudget = job.budget ? Number(job.budget) : 0;
      const jobTitle = (job.title || '').toLowerCase();
      const jobDesc = (job.description || '').toLowerCase();
      const jobSkills = (job.required_skills || '').toLowerCase();

      // Retrieve all active JOB_ALERT subscriptions where cooldown has expired (6 hours)
      // or last_notified_at IS NULL, excluding the job's employer.
      const candidateAlerts = await prisma.$queryRaw<any[]>`
        SELECT id, user_id, title, query, city, category, min_salary, max_salary, experience
        FROM user_search_alerts
        WHERE is_active = true
          AND alert_type = 'JOB_ALERT'
          AND user_id != ${job.employer_id}
          AND (last_notified_at IS NULL OR last_notified_at < NOW() - INTERVAL '6 hours')
      `;

      if (!candidateAlerts || candidateAlerts.length === 0) {
        return;
      }

      const matchedAlertIds: string[] = [];
      const notificationsByUser = new Map<string, { userId: string; alertTitle: string }>();

      for (const alert of candidateAlerts) {
        // 1. City constraint check
        if (alert.city && alert.city.trim() !== '') {
          const alertCity = alert.city.trim().toLowerCase();
          if (jobCity && !jobCity.includes(alertCity) && !alertCity.includes(jobCity)) {
            continue;
          }
        }

        // 2. Industry / Category constraint check
        if (alert.category && alert.category.trim() !== '' && alert.category.toLowerCase() !== 'all') {
          const alertCategory = alert.category.trim().toLowerCase();
          if (jobIndustry && !jobIndustry.includes(alertCategory) && !alertCategory.includes(jobIndustry)) {
            continue;
          }
        }

        // 3. Minimum Salary threshold check
        if (alert.min_salary) {
          const minRequired = Number(alert.min_salary);
          if (jobBudget > 0 && jobBudget < minRequired) {
            continue;
          }
        }

        // 4. Keyword Query match check
        if (alert.query && alert.query.trim() !== '') {
          const q = alert.query.trim().toLowerCase();
          const matchesKeyword = 
            jobTitle.includes(q) || 
            jobDesc.includes(q) || 
            jobSkills.includes(q) ||
            jobIndustry.includes(q);
          if (!matchesKeyword) {
            continue;
          }
        }

        // Passed all search intent filters!
        matchedAlertIds.push(alert.id);
        if (!notificationsByUser.has(alert.user_id)) {
          notificationsByUser.set(alert.user_id, {
            userId: alert.user_id,
            alertTitle: alert.title || job.title
          });
        }
      }

      const notificationsToSend = Array.from(notificationsByUser.values());

      if (notificationsToSend.length === 0) {
        return;
      }

      console.log(`[SearchAlertService] Reverse matching found ${notificationsToSend.length} candidate alert(s) for job "${job.title}".`);

      // Dispatch notifications to each matched candidate
      await Promise.allSettled(
        notificationsToSend.map(({ userId }) =>
          NotificationDispatcher.dispatch({
            userId,
            title: `Job Alert: ${job.title}`,
            message: `A new role in ${job.city || 'your area'} offering ₹${job.budget || 'Competitive'} matches your saved search alert. Tap to view and apply.`,
            type: 'JOB_MATCH_ALERT',
            link: `/search?jobId=${job.id}`,
            data: {
              jobId: String(job.id),
              city: String(job.city || '')
            }
          })
        )
      );

      // Update cooldown timestamp and increment match count for matched alerts
      if (matchedAlertIds.length > 0) {
        await prisma.$executeRaw`
          UPDATE user_search_alerts
          SET last_notified_at = NOW(),
              match_count = match_count + 1,
              updated_at = NOW()
          WHERE id IN (${matchedAlertIds.join("','")}::uuid)
        `.catch(err => {
          // If bulk cast fails, fallback to individual updates
          for (const id of matchedAlertIds) {
            prisma.$executeRaw`
              UPDATE user_search_alerts
              SET last_notified_at = NOW(), match_count = match_count + 1, updated_at = NOW()
              WHERE id = ${id}::uuid
            `.catch(() => {});
          }
        });
      }
    } catch (err: any) {
      console.warn('[SearchAlertService] Error during job reverse match evaluation:', err.message);
    }
  }

  /**
   * REVERSE SEARCH MATCHING ENGINE FOR NEW/AVAILABLE CANDIDATES (Naukri Resdex Model)
   * Evaluates a newly registered or available verified worker against employer candidate alerts.
   */
  public static async matchNewCandidateAgainstAlerts(
    worker: {
      user_id: string;
      full_name?: string | null;
      skills?: string | null;
      city?: string | null;
      location?: string | null;
      specialization?: string | null;
      preferred_roles?: string | null;
      experience_years?: number | null;
      is_available?: boolean | null;
    },
    options?: {
      bypassCooldown?: boolean;
      allowSameUser?: boolean;
      targetUserId?: string;
    }
  ) {
    try {
      if (worker.is_available === false) return;

      const workerCity = (worker.city || '').trim().toLowerCase();
      const workerLocation = (worker.location || '').trim().toLowerCase();
      const workerSkills = (worker.skills || '').toLowerCase();
      const workerSpecialization = (worker.specialization || '').toLowerCase();
      const workerRoles = (worker.preferred_roles || '').toLowerCase();
      const workerName = worker.full_name || 'Verified Specialist';

      // Retrieve candidate alert subscriptions based on filters/simulation mode
      let employerAlerts: any[] = [];
      if (options?.targetUserId) {
        employerAlerts = await prisma.$queryRaw<any[]>`
          SELECT id, user_id, title, query, city, category, experience
          FROM user_search_alerts
          WHERE is_active = true
            AND alert_type = 'CANDIDATE_ALERT'
            AND user_id = ${options.targetUserId}
        `;
      } else if (options?.allowSameUser) {
        employerAlerts = await prisma.$queryRaw<any[]>`
          SELECT id, user_id, title, query, city, category, experience
          FROM user_search_alerts
          WHERE is_active = true
            AND alert_type = 'CANDIDATE_ALERT'
        `;
      } else {
        employerAlerts = await prisma.$queryRaw<any[]>`
          SELECT id, user_id, title, query, city, category, experience
          FROM user_search_alerts
          WHERE is_active = true
            AND alert_type = 'CANDIDATE_ALERT'
            AND user_id != ${worker.user_id}
            AND (last_notified_at IS NULL OR last_notified_at < NOW() - INTERVAL '6 hours')
        `;
      }

      if (!employerAlerts || employerAlerts.length === 0) {
        return;
      }

      const matchedAlertIds: string[] = [];
      const notificationsByUser = new Map<string, { userId: string }>();

      for (const alert of employerAlerts) {
        // 1. City constraint check: If alert.city is specified, ensure candidate matches. If alert.city is null/empty, matches Nationwide!
        if (alert.city && alert.city.trim() !== '') {
          const alertCity = alert.city.trim().toLowerCase();
          const matchesCity = (workerCity && (workerCity.includes(alertCity) || alertCity.includes(workerCity))) ||
                              (workerLocation && (workerLocation.includes(alertCity) || alertCity.includes(workerLocation)));
          if (!matchesCity) {
            continue;
          }
        }

        // 2. Trade/Category or Skills constraint check
        if (alert.category && alert.category.trim() !== '' && alert.category.toLowerCase() !== 'all') {
          const alertTrade = alert.category.trim().toLowerCase();
          const candidateCombined = `${workerSkills} ${workerSpecialization} ${workerRoles}`.toLowerCase();
          if (!candidateCombined.includes(alertTrade)) {
            continue;
          }
        }

        // 3. Keyword Query check
        if (alert.query && alert.query.trim() !== '') {
          const q = alert.query.trim().toLowerCase();
          const candidateCombined = `${workerSkills} ${workerSpecialization} ${workerRoles} ${workerName}`.toLowerCase();
          if (!candidateCombined.includes(q)) {
            continue;
          }
        }

        matchedAlertIds.push(alert.id);
        if (!notificationsByUser.has(alert.user_id)) {
          notificationsByUser.set(alert.user_id, { userId: alert.user_id });
        }
      }

      const notificationsToSend = Array.from(notificationsByUser.values());

      if (notificationsToSend.length === 0) {
        return;
      }

      console.log(`[SearchAlertService] Reverse matching found ${notificationsToSend.length} employer alert(s) for candidate "${workerName}".`);

      await Promise.allSettled(
        notificationsToSend.map(({ userId }) =>
          NotificationDispatcher.dispatch({
            userId,
            title: `Candidate Alert: ${workerName}`,
            message: `A verified specialist with skills in "${worker.skills || 'your trade'}" in ${worker.city || 'your area'} is now available. Tap to view profile.`,
            type: 'CANDIDATE_MATCH_ALERT',
            link: `/find-workers?q=${encodeURIComponent(worker.skills || '')}&city=${encodeURIComponent(worker.city || '')}`,
            data: {
              workerId: String(worker.user_id),
              city: String(worker.city || '')
            }
          })
        )
      );

      if (matchedAlertIds.length > 0) {
        for (const id of matchedAlertIds) {
          prisma.$executeRaw`
            UPDATE user_search_alerts
            SET last_notified_at = NOW(), match_count = match_count + 1, updated_at = NOW()
            WHERE id = ${id}::uuid
          `.catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('[SearchAlertService] Error during candidate reverse match evaluation:', err.message);
    }
  }

  /**
   * Diagnostic simulation endpoint: dispatches a verified candidate match notification to a specific employer
   * to immediately test and prove the alert & notification pipeline end-to-end.
   */
  public static async simulateCandidateMatchForUser(userId: string) {
    try {
      const alerts = await this.getUserAlerts(userId, 'CANDIDATE_ALERT');
      let targetAlert = alerts.find((a: any) => a.is_active);
      if (!targetAlert) {
        targetAlert = await this.createAlert({
          userId,
          alertType: 'CANDIDATE_ALERT',
          title: 'All Verified Specialists',
          frequency: 'INSTANT'
        });
      }

      const mockCity = targetAlert.city || 'Chennai';
      const mockCategory = (targetAlert.category && targetAlert.category !== 'All') ? targetAlert.category : 'Electrician';
      const mockSkills = `${mockCategory}, Safety Certified, Industrial Wiring`;
      const mockWorkerId = `test-specialist-${Date.now().toString(36)}`;
      const mockName = 'Ramesh Kumar (Verified Specialist)';

      console.log(`\n🧪 [SearchAlertService:SIMULATE] Simulating candidate match for user=${userId} with alertId=${targetAlert.id}`);

      const dispatchResult = await NotificationDispatcher.dispatch({
        userId,
        title: `Candidate Match: ${mockName}`,
        message: `A verified specialist with skills in "${mockSkills}" in ${mockCity} is now available for direct hire. Tap to view profile.`,
        type: 'CANDIDATE_MATCH_ALERT',
        link: `/find-workers?q=${encodeURIComponent(mockCategory)}&city=${encodeURIComponent(mockCity)}`,
        data: {
          workerId: mockWorkerId,
          city: mockCity,
          category: mockCategory
        }
      });

      if (targetAlert.id) {
        await prisma.$executeRaw`
          UPDATE user_search_alerts
          SET last_notified_at = NOW(), match_count = match_count + 1, updated_at = NOW()
          WHERE id = ${targetAlert.id}::uuid
        `.catch(() => {});
      }

      return {
        success: true,
        alert: targetAlert,
        mockCandidate: {
          id: mockWorkerId,
          name: mockName,
          skills: mockSkills,
          city: mockCity,
          category: mockCategory
        },
        notification: dispatchResult
      };
    } catch (err: any) {
      console.error('[SearchAlertService] Error simulating candidate match:', err.message);
      throw err;
    }
  }

  /**
   * Diagnostic simulation endpoint: dispatches a verified job opening match notification to a candidate
   * to immediately test and prove the candidate job alert & notification pipeline end-to-end.
   */
  public static async simulateJobMatchForUser(userId: string) {
    try {
      const alerts = await this.getUserAlerts(userId, 'JOB_ALERT');
      let targetAlert = alerts.find((a: any) => a.is_active);
      if (!targetAlert) {
        targetAlert = await this.createAlert({
          userId,
          alertType: 'JOB_ALERT',
          title: 'All New Jobs',
          frequency: 'INSTANT'
        });
      }

      const mockCity = targetAlert.city || 'Chennai';
      const mockCategory = (targetAlert.category && targetAlert.category !== 'All') ? targetAlert.category : 'Construction';
      const mockJobTitle = `${mockCategory} Specialist (Immediate Opening)`;
      const mockSalary = targetAlert.min_salary ? `₹${Number(targetAlert.min_salary).toLocaleString('en-IN')}/mo+` : '₹28,000/mo';
      const mockJobId = `test-job-${Date.now().toString(36)}`;
      const mockCompany = 'L&T Infra Projects Ltd';

      console.log(`\n🧪 [SearchAlertService:SIMULATE] Simulating job match for candidate user=${userId} with alertId=${targetAlert.id}`);

      const dispatchResult = await NotificationDispatcher.dispatch({
        userId,
        title: `Job Match: ${mockJobTitle}`,
        message: `${mockCompany} in ${mockCity} posted a verified job opening for "${mockCategory}" paying ${mockSalary}. Matches your job search alert!`,
        type: 'JOB_MATCH_ALERT',
        link: `/jobs?q=${encodeURIComponent(mockCategory)}&city=${encodeURIComponent(mockCity)}`,
        data: {
          jobId: mockJobId,
          city: mockCity,
          category: mockCategory,
          title: mockJobTitle,
          company: mockCompany
        }
      });

      if (targetAlert.id) {
        await prisma.$executeRaw`
          UPDATE user_search_alerts
          SET last_notified_at = NOW(), match_count = match_count + 1, updated_at = NOW()
          WHERE id = ${targetAlert.id}::uuid
        `.catch(() => {});
      }

      return {
        success: true,
        alert: targetAlert,
        mockJob: {
          id: mockJobId,
          title: mockJobTitle,
          company: mockCompany,
          city: mockCity,
          category: mockCategory,
          salary: mockSalary
        },
        notification: dispatchResult
      };
    } catch (err: any) {
      console.error('[SearchAlertService] Error simulating job match:', err.message);
      throw err;
    }
  }
}

