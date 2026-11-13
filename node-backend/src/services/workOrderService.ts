import crypto from 'crypto';
import prisma from '../config/prisma';
import { NotificationDispatcher } from './notificationDispatcher';

export interface CreateWorkOrderInput {
  jobId?: string;
  applicationId?: string;
  workerId: string;
  
  jobTitle: string;
  workDescription?: string;
  worksiteName: string;
  worksiteAddress: string;
  city: string;
  district?: string;
  taluk?: string;
  latitude?: number;
  longitude?: number;
  
  startDate: string; // ISO date string (YYYY-MM-DD)
  expectedEndDate?: string;
  workDurationDays?: number;
  shiftTiming: string;
  weeklyRestDay?: string;
  dailyWorkingHours: number;
  overtimeTerms?: string;
  
  wageAmount: number;
  wageFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT';
  foodProvided?: boolean;
  accommodationProvided?: boolean;
  transportProvided?: boolean;
  otherBenefits?: string;
  agreedDeductions?: string;

  autoSend?: boolean;
}

export interface UpdateWorkOrderInput {
  jobTitle?: string;
  workDescription?: string;
  worksiteName?: string;
  worksiteAddress?: string;
  city?: string;
  district?: string;
  taluk?: string;
  latitude?: number;
  longitude?: number;
  
  startDate?: string;
  expectedEndDate?: string;
  workDurationDays?: number;
  shiftTiming?: string;
  weeklyRestDay?: string;
  dailyWorkingHours?: number;
  overtimeTerms?: string;
  
  wageAmount?: number;
  wageFrequency?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT';
  foodProvided?: boolean;
  accommodationProvided?: boolean;
  transportProvided?: boolean;
  otherBenefits?: string;
  agreedDeductions?: string;
}

export class WorkOrderService {

  /**
   * Generates a collision-resistant, concurrency-safe work order number.
   * Format: WO-YYYYMMDD-XXXX (e.g. WO-20261113-1001-A4B7)
   */
  private static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const count = await prisma.work_orders.count({
      where: {
        order_number: { startsWith: `WO-${dateStr}` }
      }
    });
    const seq = String(count + 1001).padStart(4, '0');
    return `WO-${dateStr}-${seq}-${randSuffix}`;
  }

  /**
   * Canonical SHA-256 hash calculation of work order terms
   */
  public static computeTermsHash(terms: Record<string, any>): string {
    const canonicalStr = JSON.stringify({
      jobTitle: (terms.job_title || terms.jobTitle || '').trim(),
      workDescription: (terms.work_description || terms.workDescription || '').trim(),
      worksiteName: (terms.worksite_name || terms.worksiteName || '').trim(),
      worksiteAddress: (terms.worksite_address || terms.worksiteAddress || '').trim(),
      city: (terms.city || '').trim(),
      district: (terms.district || '').trim(),
      taluk: (terms.taluk || '').trim(),
      latitude: terms.latitude ?? null,
      longitude: terms.longitude ?? null,
      startDate: terms.start_date || terms.startDate,
      expectedEndDate: terms.expected_end_date !== undefined ? (terms.expected_end_date || null) : (terms.expectedEndDate || null),
      workDurationDays: terms.work_duration_days ?? terms.workDurationDays ?? null,
      shiftTiming: (terms.shift_timing || terms.shiftTiming || '').trim(),
      weeklyRestDay: (terms.weekly_rest_day || terms.weeklyRestDay || '').trim(),
      dailyWorkingHours: Number(terms.daily_working_hours || terms.dailyWorkingHours || 0),
      overtimeTerms: (terms.overtime_terms || terms.overtimeTerms || '').trim(),
      wageAmount: Number(terms.wage_amount || terms.wageAmount || 0),
      wageFrequency: terms.wage_frequency || terms.wageFrequency,
      foodProvided: Boolean(terms.food_provided ?? terms.foodProvided),
      accommodationProvided: Boolean(terms.accommodation_provided ?? terms.accommodationProvided),
      transportProvided: Boolean(terms.transport_provided ?? terms.transportProvided),
      otherBenefits: (terms.other_benefits || terms.otherBenefits || '').trim(),
      agreedDeductions: (terms.agreed_deductions || terms.agreedDeductions || '').trim()
    });
    return crypto.createHash('sha256').update(canonicalStr).digest('hex');
  }

  /**
   * 1. Create Digital Work Order with strict ownership and relationship validation
   */
  public static async createWorkOrder(employerId: string, input: CreateWorkOrderInput) {
    if (!employerId) throw new Error("Employer authentication required");
    if (!input.workerId) throw new Error("Worker recipient required");
    if (!input.jobTitle) throw new Error("Job title is required");
    if (!input.worksiteName || !input.worksiteAddress || !input.city) {
      throw new Error("Worksite name, address, and city are mandatory");
    }
    if (!input.startDate) throw new Error("Start date is required");
    if (!input.shiftTiming) throw new Error("Shift timing is required");
    if (!input.wageAmount || input.wageAmount <= 0) {
      throw new Error("Agreed wage amount must be greater than zero");
    }
    if (!input.dailyWorkingHours || input.dailyWorkingHours <= 0) {
      throw new Error("Daily working hours must be greater than zero");
    }

    // Verify worker exists
    const workerProfile = await prisma.worker_profiles.findFirst({
      where: { user_id: input.workerId }
    });
    if (!workerProfile) {
      throw new Error("Target worker profile not found");
    }
    const targetWorkerUserId = workerProfile.user_id;

    // Verify employer profile
    const employerProfile = await prisma.employer_profiles.findUnique({
      where: { user_id: employerId }
    });
    if (!employerProfile) {
      throw new Error("Employer profile not found for this account");
    }

    // P3.1 FIX: Strict Job and Application Ownership & Relationship Validation
    if (input.jobId) {
      const job = await prisma.jobs.findUnique({
        where: { id: input.jobId }
      });
      if (!job) throw new Error("Job not found");
      if (job.employer_id !== employerId) {
        throw new Error("Forbidden: You do not own the specified job");
      }
      if (!job.status || !['OPEN', 'ACTIVE'].includes(job.status)) {
        throw new Error(`Cannot issue work order for job with status: ${job.status || 'UNKNOWN'}`);
      }
    }

    if (input.applicationId) {
      const application = await prisma.job_applications.findUnique({
        where: { id: input.applicationId },
        include: { jobs: true }
      });
      if (!application) throw new Error("Job application not found");
      if (application.jobs.employer_id !== employerId) {
        throw new Error("Forbidden: Application does not belong to your job posting");
      }
      if (application.worker_id !== targetWorkerUserId) {
        throw new Error("Forbidden: Application does not belong to the selected worker");
      }
      if (input.jobId && application.job_id !== input.jobId) {
        throw new Error("Application jobId mismatch with provided jobId");
      }

      // Constrain application status: must be eligible for hiring
      const eligibleStatuses = ['SHORTLISTED', 'INTERVIEWING', 'OFFER_EXTENDED', 'ACCEPTED', 'PENDING'];
      if (!eligibleStatuses.includes(application.status?.toUpperCase() || '')) {
        throw new Error(`Cannot issue work order for application in "${application.status}" state. Only active or shortlisted applications are eligible.`);
      }

      // Prevent duplicate active work orders for the same application
      const existingActiveOrder = await prisma.work_orders.findFirst({
        where: {
          application_id: input.applicationId,
          status: { notIn: ['CANCELLED', 'DECLINED'] }
        }
      });
      if (existingActiveOrder) {
        throw new Error(`An active work order (${existingActiveOrder.order_number}) already exists for this application.`);
      }
    }

    const orderNumber = await this.generateOrderNumber();
    const initialStatus = input.autoSend ? 'SENT' : 'DRAFT';
    const termsHash = this.computeTermsHash(input);

    return prisma.$transaction(async (tx) => {
      const workOrder = await tx.work_orders.create({
        data: {
          order_number: orderNumber,
          job_id: input.jobId || null,
          application_id: input.applicationId || null,
          employer_id: employerId,
          worker_id: targetWorkerUserId,
          
          job_title: input.jobTitle.trim(),
          work_description: input.workDescription?.trim() || null,
          worksite_name: input.worksiteName.trim(),
          worksite_address: input.worksiteAddress.trim(),
          city: input.city.trim(),
          district: input.district?.trim() || null,
          taluk: input.taluk?.trim() || null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          
          start_date: new Date(input.startDate),
          expected_end_date: input.expectedEndDate ? new Date(input.expectedEndDate) : null,
          work_duration_days: input.workDurationDays ?? null,
          shift_timing: input.shiftTiming.trim(),
          weekly_rest_day: input.weeklyRestDay?.trim() || 'SUNDAY',
          daily_working_hours: input.dailyWorkingHours,
          overtime_terms: input.overtimeTerms?.trim() || null,
          
          wage_amount: input.wageAmount,
          wage_frequency: input.wageFrequency || 'DAILY',
          food_provided: Boolean(input.foodProvided),
          accommodation_provided: Boolean(input.accommodationProvided),
          transport_provided: Boolean(input.transportProvided),
          other_benefits: input.otherBenefits?.trim() || null,
          agreed_deductions: input.agreedDeductions?.trim() || null,
          
          status: initialStatus,
          terms_version: 1
        }
      });

      // Record Version 1 in work_order_terms_versions
      await tx.work_order_terms_versions.create({
        data: {
          work_order_id: workOrder.id,
          version_number: 1,
          terms_snapshot: workOrder as any,
          terms_hash: termsHash,
          created_by_user_id: employerId,
          change_summary: 'Initial draft terms'
        }
      });

      // Record event in audit trail
      await tx.work_order_events.create({
        data: {
          work_order_id: workOrder.id,
          actor_id: employerId,
          actor_role: 'EMPLOYER',
          event_type: input.autoSend ? 'SENT' : 'CREATED',
          notes: input.autoSend ? 'Work order drafted and dispatched directly' : 'Work order drafted',
          snapshot: workOrder as any
        }
      });

      // Dispatch notification if autoSend
      if (input.autoSend) {
        await NotificationDispatcher.dispatch({
          userId: targetWorkerUserId,
          title: "Digital Work Order Received 📜",
          message: `${employerProfile?.company_name || 'An employer'} issued a formal work order for "${input.jobTitle}". Tap to review and confirm terms.`,
          type: "WORK_ORDER_SENT",
          link: `/work-orders/${workOrder.id}`,
          data: { workOrderId: workOrder.id, orderNumber }
        }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));
      }

      return workOrder;
    });
  }

  /**
   * 2. Send Draft Work Order
   */
  public static async sendWorkOrder(employerId: string, orderId: string) {
    const order = await prisma.work_orders.findUnique({
      where: { id: orderId }
    });
    if (!order) throw new Error("Work order not found");
    if (order.employer_id !== employerId) {
      throw new Error("Forbidden: You do not own this work order");
    }
    if (order.status !== 'DRAFT') {
      throw new Error(`Cannot send work order in status: ${order.status}`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.work_orders.update({
        where: { id: orderId },
        data: {
          status: 'SENT',
          updated_at: new Date()
        }
      });

      await tx.work_order_events.create({
        data: {
          work_order_id: orderId,
          actor_id: employerId,
          actor_role: 'EMPLOYER',
          event_type: 'SENT',
          notes: 'Work order terms issued to candidate for digital acceptance'
        }
      });

      const employerProfile = await tx.employer_profiles.findUnique({
        where: { user_id: employerId }
      });

      await NotificationDispatcher.dispatch({
        userId: order.worker_id,
        title: "Digital Work Order Received 📜",
        message: `${employerProfile?.company_name || 'An employer'} issued a formal work order for "${order.job_title}". Tap to review and confirm terms.`,
        type: "WORK_ORDER_SENT",
        link: `/work-orders/${order.id}`,
        data: { workOrderId: order.id, orderNumber: order.order_number }
      }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));

      return updated;
    });
  }

  /**
   * 3. Worker Response: ACCEPT, DECLINE, or CLARIFY
   * Records exact accepted terms hash and version number
   */
  public static async respondToWorkOrder(
    workerUserId: string,
    orderId: string,
    action: 'ACCEPT' | 'DECLINE' | 'CLARIFY',
    notes?: string
  ) {
    const order = await prisma.work_orders.findUnique({
      where: { id: orderId }
    });
    if (!order) throw new Error("Work order not found");
    if (order.worker_id !== workerUserId) {
      throw new Error("Forbidden: You are not the assigned worker for this work order");
    }
    if (order.status !== 'SENT') {
      throw new Error(`Cannot respond to work order currently in status: ${order.status}`);
    }

    const now = new Date();
    let nextStatus = order.status;
    let eventType: string = action;
    let notificationTitle = '';
    let notificationMessage = '';

    const currentTermsHash = this.computeTermsHash(order);

    if (action === 'ACCEPT') {
      nextStatus = 'ACCEPTED';
      eventType = 'ACCEPTED';
      notificationTitle = 'Work Order Terms Confirmed 🤝';
      notificationMessage = `The candidate has confirmed and accepted work order ${order.order_number} for "${order.job_title}".`;
    } else if (action === 'DECLINE') {
      nextStatus = 'DECLINED';
      eventType = 'DECLINED';
      notificationTitle = 'Work Order Declined ❌';
      notificationMessage = `The candidate declined work order ${order.order_number} for "${order.job_title}". Reason: ${notes || 'Terms not suitable'}`;
    } else if (action === 'CLARIFY') {
      nextStatus = 'DRAFT';
      eventType = 'CLARIFICATION_REQUESTED';
      notificationTitle = 'Work Order Clarification Requested 💬';
      notificationMessage = `The candidate requested clarification on work order ${order.order_number}: "${notes || 'Please review terms'}".`;
    }

    return prisma.$transaction(async (tx) => {
      // Optimistic concurrency verification inside transaction
      const currentOrder = await tx.work_orders.findUnique({
        where: { id: orderId }
      });
      if (!currentOrder || currentOrder.status !== 'SENT') {
        throw new Error(`Conflict: Work order status changed to "${currentOrder?.status || 'UNKNOWN'}" before action could be completed.`);
      }

      const updated = await tx.work_orders.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          worker_response_notes: notes || null,
          accepted_at: action === 'ACCEPT' ? now : undefined,
          declined_at: action === 'DECLINE' ? now : undefined,
          accepted_terms_version: action === 'ACCEPT' ? currentOrder.terms_version : null,
          accepted_terms_hash: action === 'ACCEPT' ? currentTermsHash : null,
          updated_at: now
        }
      });

      await tx.work_order_events.create({
        data: {
          work_order_id: orderId,
          actor_id: workerUserId,
          actor_role: 'WORKER',
          event_type: eventType,
          notes: notes || null,
          snapshot: {
            status: nextStatus,
            acceptedTermsVersion: order.terms_version,
            acceptedTermsHash: currentTermsHash
          } as any
        }
      });

      await NotificationDispatcher.dispatch({
        userId: order.employer_id,
        title: notificationTitle,
        message: notificationMessage,
        type: `WORK_ORDER_${eventType}`,
        link: `/work-orders/${order.id}`,
        data: { workOrderId: order.id, orderNumber: order.order_number, action }
      }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));

      return updated;
    });
  }

  /**
   * 4. Update Terms (Employer)
   * Comprehensive material change detection: any changes to title, description,
   * worksite, dates, hours, wage, or benefits reset acceptance and invalidate future shifts.
   */
  public static async updateTerms(employerId: string, orderId: string, input: UpdateWorkOrderInput) {
    const order = await prisma.work_orders.findUnique({
      where: { id: orderId }
    });
    if (!order) throw new Error("Work order not found");
    if (order.employer_id !== employerId) {
      throw new Error("Forbidden: You do not own this work order");
    }

    if (['COMPLETED', 'CANCELLED', 'DECLINED'].includes(order.status)) {
      throw new Error(`Cannot modify terms for work order in ${order.status} state`);
    }

    // P3.2 FIX: Comprehensive Material Change Detection across ALL terms
    const isMaterialChange = 
      (input.jobTitle !== undefined && input.jobTitle.trim() !== order.job_title) ||
      (input.workDescription !== undefined && input.workDescription.trim() !== (order.work_description || '')) ||
      (input.worksiteName !== undefined && input.worksiteName.trim() !== order.worksite_name) ||
      (input.worksiteAddress !== undefined && input.worksiteAddress.trim() !== order.worksite_address) ||
      (input.city !== undefined && input.city.trim() !== order.city) ||
      (input.district !== undefined && input.district.trim() !== (order.district || '')) ||
      (input.taluk !== undefined && input.taluk.trim() !== (order.taluk || '')) ||
      (input.latitude !== undefined && input.latitude !== order.latitude) ||
      (input.longitude !== undefined && input.longitude !== order.longitude) ||
      (input.workDurationDays !== undefined && input.workDurationDays !== order.work_duration_days) ||
      (input.startDate !== undefined && new Date(input.startDate).getTime() !== new Date(order.start_date).getTime()) ||
      (input.expectedEndDate !== undefined && (input.expectedEndDate ? new Date(input.expectedEndDate).getTime() : 0) !== (order.expected_end_date ? new Date(order.expected_end_date).getTime() : 0)) ||
      (input.shiftTiming !== undefined && input.shiftTiming.trim() !== order.shift_timing) ||
      (input.weeklyRestDay !== undefined && input.weeklyRestDay.trim() !== (order.weekly_rest_day || '')) ||
      (input.dailyWorkingHours !== undefined && input.dailyWorkingHours !== Number(order.daily_working_hours)) ||
      (input.overtimeTerms !== undefined && input.overtimeTerms.trim() !== (order.overtime_terms || '')) ||
      (input.wageAmount !== undefined && input.wageAmount !== Number(order.wage_amount)) ||
      (input.wageFrequency !== undefined && input.wageFrequency !== order.wage_frequency) ||
      (input.foodProvided !== undefined && input.foodProvided !== order.food_provided) ||
      (input.accommodationProvided !== undefined && input.accommodationProvided !== order.accommodation_provided) ||
      (input.transportProvided !== undefined && input.transportProvided !== order.transport_provided) ||
      (input.otherBenefits !== undefined && input.otherBenefits.trim() !== (order.other_benefits || '')) ||
      (input.agreedDeductions !== undefined && input.agreedDeductions.trim() !== (order.agreed_deductions || ''));

    // If order was ACCEPTED or IN_PROGRESS, material changes reset status to SENT for renewed acceptance
    const wasActive = ['ACCEPTED', 'IN_PROGRESS'].includes(order.status);
    const newStatus = (wasActive && isMaterialChange) ? 'SENT' : order.status;
    const nextVersion = order.terms_version + 1;

    return prisma.$transaction(async (tx) => {
      // Optimistic concurrency check: re-verify status inside transaction
      const currentOrder = await tx.work_orders.findUnique({
        where: { id: orderId }
      });
      if (!currentOrder || ['COMPLETED', 'CANCELLED', 'DECLINED'].includes(currentOrder.status)) {
        throw new Error(`Conflict: Work order was already cancelled or completed`);
      }

      const updated = await tx.work_orders.update({
        where: { id: orderId },
        data: {
          job_title: input.jobTitle?.trim(),
          work_description: input.workDescription !== undefined ? input.workDescription?.trim() : undefined,
          worksite_name: input.worksiteName?.trim(),
          worksite_address: input.worksiteAddress?.trim(),
          city: input.city?.trim(),
          district: input.district !== undefined ? input.district?.trim() : undefined,
          taluk: input.taluk !== undefined ? input.taluk?.trim() : undefined,
          latitude: input.latitude !== undefined ? input.latitude : undefined,
          longitude: input.longitude !== undefined ? input.longitude : undefined,
          
          start_date: input.startDate ? new Date(input.startDate) : undefined,
          expected_end_date: input.expectedEndDate !== undefined ? (input.expectedEndDate ? new Date(input.expectedEndDate) : null) : undefined,
          work_duration_days: input.workDurationDays !== undefined ? input.workDurationDays : undefined,
          shift_timing: input.shiftTiming?.trim(),
          weekly_rest_day: input.weeklyRestDay?.trim(),
          daily_working_hours: input.dailyWorkingHours,
          overtime_terms: input.overtimeTerms !== undefined ? input.overtimeTerms?.trim() : undefined,
          
          wage_amount: input.wageAmount,
          wage_frequency: input.wageFrequency,
          food_provided: input.foodProvided,
          accommodation_provided: input.accommodationProvided,
          transport_provided: input.transportProvided,
          other_benefits: input.otherBenefits !== undefined ? input.otherBenefits?.trim() : undefined,
          agreed_deductions: input.agreedDeductions !== undefined ? input.agreedDeductions?.trim() : undefined,
          
          status: newStatus,
          terms_version: nextVersion,
          accepted_at: (wasActive && isMaterialChange) ? null : currentOrder.accepted_at,
          accepted_terms_version: (wasActive && isMaterialChange) ? null : currentOrder.accepted_terms_version,
          accepted_terms_hash: (wasActive && isMaterialChange) ? null : currentOrder.accepted_terms_hash,
          updated_at: new Date()
        }
      });

      const newTermsHash = this.computeTermsHash(updated);

      // Record new terms version
      await tx.work_order_terms_versions.create({
        data: {
          work_order_id: orderId,
          version_number: nextVersion,
          terms_snapshot: updated as any,
          terms_hash: newTermsHash,
          created_by_user_id: employerId,
          change_summary: isMaterialChange ? 'Material terms amended by employer' : 'Minor terms updated'
        }
      });

      await tx.work_order_events.create({
        data: {
          work_order_id: orderId,
          actor_id: employerId,
          actor_role: 'EMPLOYER',
          event_type: 'UPDATED',
          notes: isMaterialChange 
            ? `Version ${nextVersion} issued: Material terms amended; renewed acceptance required from candidate` 
            : `Version ${nextVersion} issued: Terms updated by employer`,
          snapshot: updated as any
        }
      });

      // P3.7 FIX: If amended materially, cancel all future scheduled shifts and invalidate attendance challenges
      if (wasActive && isMaterialChange) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const affectedShifts = await tx.shifts.findMany({
          where: {
            work_order_id: orderId,
            shift_date: { gte: today },
            status: 'SCHEDULED'
          },
          select: { id: true }
        });

        const affectedShiftIds = affectedShifts.map(s => s.id);

        if (affectedShiftIds.length > 0) {
          // Invalidate active challenges for these cancelled shifts
          await tx.attendance_challenges.updateMany({
            where: {
              shift_id: { in: affectedShiftIds },
              consumed_at: null
            },
            data: {
              consumed_at: new Date()
            }
          });

          await tx.shifts.updateMany({
            where: {
              id: { in: affectedShiftIds }
            },
            data: {
              status: 'CANCELLED',
              notes: 'Automatically cancelled due to material work order amendment. Needs rescheduling after re-acceptance.'
            }
          });
        }
      }

      if (isMaterialChange && wasActive) {
        await NotificationDispatcher.dispatch({
          userId: order.worker_id,
          title: "Work Order Terms Amended ⚠️",
          message: `Employer amended terms for "${order.job_title}". Please review and confirm the updated conditions.`,
          type: "WORK_ORDER_AMENDED",
          link: `/work-orders/${order.id}`,
          data: { workOrderId: order.id, orderNumber: order.order_number }
        }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));
      }

      return updated;
    });
  }

  /**
   * 5. Cancel Work Order (Employer or Worker mutual)
   * Automatically cancels future scheduled shifts and blocks attendance
   */
  public static async cancelWorkOrder(userId: string, orderId: string, reason?: string) {
    const order = await prisma.work_orders.findUnique({
      where: { id: orderId }
    });
    if (!order) throw new Error("Work order not found");
    if (order.employer_id !== userId && order.worker_id !== userId) {
      throw new Error("Forbidden: You are not authorized to cancel this work order");
    }

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new Error(`Cannot cancel work order in ${order.status} state`);
    }

    const isEmployer = order.employer_id === userId;

    return prisma.$transaction(async (tx) => {
      // Optimistic check inside transaction
      const currentOrder = await tx.work_orders.findUnique({
        where: { id: orderId }
      });
      if (!currentOrder || ['COMPLETED', 'CANCELLED'].includes(currentOrder.status)) {
        throw new Error(`Conflict: Work order is already cancelled or completed`);
      }

      const updated = await tx.work_orders.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          updated_at: new Date()
        }
      });

      await tx.work_order_events.create({
        data: {
          work_order_id: orderId,
          actor_id: userId,
          actor_role: isEmployer ? 'EMPLOYER' : 'WORKER',
          event_type: 'CANCELLED',
          notes: reason || 'Work order cancelled'
        }
      });

      // P3.7 FIX: Cancel all future scheduled shifts and invalidate challenge credentials
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const affectedShifts = await tx.shifts.findMany({
        where: {
          work_order_id: orderId,
          shift_date: { gte: today },
          status: 'SCHEDULED'
        },
        select: { id: true }
      });

      const affectedShiftIds = affectedShifts.map(s => s.id);
      if (affectedShiftIds.length > 0) {
        await tx.attendance_challenges.updateMany({
          where: {
            shift_id: { in: affectedShiftIds },
            consumed_at: null
          },
          data: {
            consumed_at: new Date()
          }
        });

        await tx.shifts.updateMany({
          where: {
            id: { in: affectedShiftIds }
          },
          data: {
            status: 'CANCELLED',
            notes: `Work order cancelled: ${reason || 'Mutual cancellation'}`
          }
        });
      }

      const recipientUserId = isEmployer ? order.worker_id : order.employer_id;
      await NotificationDispatcher.dispatch({
        userId: recipientUserId,
        title: "Work Order Cancelled",
        message: `Work order ${order.order_number} for "${order.job_title}" was cancelled. Reason: ${reason || 'Mutual cancellation'}`,
        type: "WORK_ORDER_CANCELLED",
        link: `/work-orders/${order.id}`,
        data: { workOrderId: order.id, orderNumber: order.order_number }
      }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));

      return updated;
    });
  }

  /**
   * 6. Query Employer Work Orders
   */
  public static async getEmployerWorkOrders(employerId: string, params?: { status?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 15;
    const offset = (page - 1) * limit;

    const where: any = { employer_id: employerId };
    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    const [orders, total] = await Promise.all([
      prisma.work_orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          order_number: true,
          job_id: true,
          application_id: true,
          employer_id: true,
          worker_id: true,
          job_title: true,
          work_description: true,
          worksite_name: true,
          worksite_address: true,
          city: true,
          district: true,
          taluk: true,
          start_date: true,
          expected_end_date: true,
          work_duration_days: true,
          shift_timing: true,
          weekly_rest_day: true,
          daily_working_hours: true,
          overtime_terms: true,
          wage_amount: true,
          wage_frequency: true,
          food_provided: true,
          accommodation_provided: true,
          transport_provided: true,
          other_benefits: true,
          agreed_deductions: true,
          status: true,
          terms_version: true,
          accepted_terms_version: true,
          accepted_at: true,
          created_at: true,
          updated_at: true,
          jobs: { select: { id: true, title: true, city: true } }
        }
      }),
      prisma.work_orders.count({ where })
    ]);

    const workerIds = Array.from(new Set(orders.map(o => o.worker_id)));
    const workers = await prisma.worker_profiles.findMany({
      where: { user_id: { in: workerIds } },
      select: { user_id: true, full_name: true, phone_number: true, profile_image_url: true, level: true, trust_score: true }
    });
    const workerMap = new Map(workers.map(w => [w.user_id, w]));

    const enriched = orders.map(order => ({
      ...order,
      worker: workerMap.get(order.worker_id) || null
    }));

    return {
      workOrders: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 7. Query Worker Work Orders
   */
  public static async getWorkerWorkOrders(workerUserId: string, params?: { status?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 15;
    const offset = (page - 1) * limit;

    const where: any = { worker_id: workerUserId };
    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    const [orders, total] = await Promise.all([
      prisma.work_orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          order_number: true,
          job_id: true,
          application_id: true,
          employer_id: true,
          worker_id: true,
          job_title: true,
          work_description: true,
          worksite_name: true,
          worksite_address: true,
          city: true,
          district: true,
          taluk: true,
          start_date: true,
          expected_end_date: true,
          work_duration_days: true,
          shift_timing: true,
          weekly_rest_day: true,
          daily_working_hours: true,
          overtime_terms: true,
          wage_amount: true,
          wage_frequency: true,
          food_provided: true,
          accommodation_provided: true,
          transport_provided: true,
          other_benefits: true,
          agreed_deductions: true,
          status: true,
          terms_version: true,
          accepted_terms_version: true,
          accepted_at: true,
          created_at: true,
          updated_at: true,
          jobs: { select: { id: true, title: true, city: true } }
        }
      }),
      prisma.work_orders.count({ where })
    ]);

    const employerIds = Array.from(new Set(orders.map(o => o.employer_id)));
    const employers = await prisma.employer_profiles.findMany({
      where: { user_id: { in: employerIds } },
      select: { user_id: true, company_name: true, is_verified: true, city: true, business_tier: true }
    });
    const employerMap = new Map(employers.map(e => [e.user_id, e]));

    const enriched = orders.map(order => ({
      ...order,
      employer: employerMap.get(order.employer_id) || null
    }));

    return {
      workOrders: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 8. Get Single Work Order Details, Versions & Audit Trail
   */
  public static async getWorkOrderById(userId: string, userRole: string, orderId: string) {
    const order = await prisma.work_orders.findUnique({
      where: { id: orderId },
      include: {
        jobs: {
          select: { id: true, title: true, city: true, employer_id: true }
        },
        job_applications: {
          select: { id: true, status: true, applied_at: true }
        },
        terms_versions: {
          orderBy: { version_number: 'desc' }
        },
        events: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!order) throw new Error("Work order not found");

    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (!isAdmin && order.employer_id !== userId && order.worker_id !== userId) {
      throw new Error("Forbidden: You do not have access to this work order");
    }

    const [worker, employer] = await Promise.all([
      prisma.worker_profiles.findUnique({
        where: { user_id: order.worker_id },
        select: {
          user_id: true,
          full_name: true,
          phone_number: true,
          profile_image_url: true,
          skills: true,
          level: true,
          trust_score: true,
          city: true
        }
      }),
      prisma.employer_profiles.findUnique({
        where: { user_id: order.employer_id },
        select: {
          user_id: true,
          company_name: true,
          is_verified: true,
          city: true,
          address: true,
          business_tier: true
        }
      })
    ]);

    return {
      ...order,
      worker,
      employer
    };
  }
}
