import prisma from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';
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
   * Generates a sequential, clean human-readable work order number.
   * Format: WO-YYYYMMDD-XXXX (e.g. WO-20261113-1001)
   */
  private static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.work_orders.count({
      where: {
        order_number: { startsWith: `WO-${dateStr}` }
      }
    });
    const suffix = String(count + 1001).padStart(4, '0');
    return `WO-${dateStr}-${suffix}`;
  }

  /**
   * 1. Create Digital Work Order (Employer / Spot-Hiring)
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
      where: {
        user_id: input.workerId
      }
    });
    if (!workerProfile) {
      throw new Error("Target worker profile not found");
    }
    const targetWorkerUserId = workerProfile.user_id;

    // Verify employer profile
    const employerProfile = await prisma.employer_profiles.findUnique({
      where: { user_id: employerId }
    });

    const orderNumber = await this.generateOrderNumber();
    const initialStatus = input.autoSend ? 'SENT' : 'DRAFT';

    const workOrder = await prisma.work_orders.create({
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
        
        status: initialStatus
      }
    });

    // Record creation event in audit trail
    await prisma.work_order_events.create({
      data: {
        work_order_id: workOrder.id,
        actor_id: employerId,
        actor_role: 'EMPLOYER',
        event_type: input.autoSend ? 'SENT' : 'CREATED',
        notes: input.autoSend ? 'Work order drafted and dispatched directly' : 'Work order drafted',
        snapshot: workOrder as any
      }
    });

    // If autoSend, dispatch notification immediately
    if (input.autoSend) {
      await NotificationDispatcher.dispatch({
        userId: targetWorkerUserId,
        title: "Digital Work Order Received 📜",
        message: `${employerProfile?.company_name || 'An employer'} issued a formal work order for "${input.jobTitle}". Tap to review and sign terms.`,
        type: "WORK_ORDER_SENT",
        link: `/work-orders/${workOrder.id}`,
        data: { workOrderId: workOrder.id, orderNumber }
      }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));
    }

    return workOrder;
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

    const updated = await prisma.work_orders.update({
      where: { id: orderId },
      data: {
        status: 'SENT',
        updated_at: new Date()
      }
    });

    await prisma.work_order_events.create({
      data: {
        work_order_id: orderId,
        actor_id: employerId,
        actor_role: 'EMPLOYER',
        event_type: 'SENT',
        notes: 'Work order terms issued to candidate for digital acceptance'
      }
    });

    const employerProfile = await prisma.employer_profiles.findUnique({
      where: { user_id: employerId }
    });

    await NotificationDispatcher.dispatch({
      userId: order.worker_id,
      title: "Digital Work Order Received 📜",
      message: `${employerProfile?.company_name || 'An employer'} issued a formal work order for "${order.job_title}". Tap to review and sign terms.`,
      type: "WORK_ORDER_SENT",
      link: `/work-orders/${order.id}`,
      data: { workOrderId: order.id, orderNumber: order.order_number }
    }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));

    return updated;
  }

  /**
   * 3. Worker Response: ACCEPT, DECLINE, or CLARIFY
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

    if (action === 'ACCEPT') {
      nextStatus = 'ACCEPTED';
      eventType = 'ACCEPTED';
      notificationTitle = 'Work Order Accepted & Signed 🤝';
      notificationMessage = `The candidate has digitally accepted and signed work order ${order.order_number} for "${order.job_title}".`;
    } else if (action === 'DECLINE') {
      nextStatus = 'DECLINED';
      eventType = 'DECLINED';
      notificationTitle = 'Work Order Declined ❌';
      notificationMessage = `The candidate declined work order ${order.order_number} for "${order.job_title}". Reason: ${notes || 'Terms not suitable'}`;
    } else if (action === 'CLARIFY') {
      nextStatus = 'DRAFT'; // Returns to draft for employer amendment
      eventType = 'CLARIFICATION_REQUESTED';
      notificationTitle = 'Work Order Clarification Requested 💬';
      notificationMessage = `The candidate requested clarification on work order ${order.order_number}: "${notes || 'Please review terms'}".`;
    }

    const updated = await prisma.work_orders.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        worker_response_notes: notes || null,
        accepted_at: action === 'ACCEPT' ? now : undefined,
        declined_at: action === 'DECLINE' ? now : undefined,
        updated_at: now
      }
    });

    await prisma.work_order_events.create({
      data: {
        work_order_id: orderId,
        actor_id: workerUserId,
        actor_role: 'WORKER',
        event_type: eventType,
        notes: notes || null,
        snapshot: updated as any
      }
    });

    // Notify the employer
    await NotificationDispatcher.dispatch({
      userId: order.employer_id,
      title: notificationTitle,
      message: notificationMessage,
      type: `WORK_ORDER_${eventType}`,
      link: `/work-orders/${order.id}`,
      data: { workOrderId: order.id, orderNumber: order.order_number, action }
    }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));

    return updated;
  }

  /**
   * 4. Update Terms (Employer)
   * Material changes reset status to DRAFT or SENT requiring renewed worker acceptance
   */
  public static async updateTerms(employerId: string, orderId: string, input: UpdateWorkOrderInput) {
    const order = await prisma.work_orders.findUnique({
      where: { id: orderId }
    });
    if (!order) throw new Error("Work order not found");
    if (order.employer_id !== employerId) {
      throw new Error("Forbidden: You do not own this work order");
    }

    const unmodifiableStatuses = ['COMPLETED', 'CANCELLED', 'DECLINED'];
    if (unmodifiableStatuses.includes(order.status)) {
      throw new Error(`Cannot modify terms for work order in ${order.status} state`);
    }

    // Detect if wage, hours, location, or dates are modified
    const isMaterialChange = 
      (input.wageAmount !== undefined && input.wageAmount !== Number(order.wage_amount)) ||
      (input.wageFrequency !== undefined && input.wageFrequency !== order.wage_frequency) ||
      (input.dailyWorkingHours !== undefined && input.dailyWorkingHours !== Number(order.daily_working_hours)) ||
      (input.worksiteAddress !== undefined && input.worksiteAddress !== order.worksite_address) ||
      (input.startDate !== undefined && new Date(input.startDate).getTime() !== new Date(order.start_date).getTime());

    // If previously accepted and material change occurs, reset to SENT for renewed acceptance
    const newStatus = (order.status === 'ACCEPTED' && isMaterialChange) ? 'SENT' : order.status;

    const updated = await prisma.work_orders.update({
      where: { id: orderId },
      data: {
        job_title: input.jobTitle?.trim(),
        work_description: input.workDescription !== undefined ? input.workDescription?.trim() : undefined,
        worksite_name: input.worksiteName?.trim(),
        worksite_address: input.worksiteAddress?.trim(),
        city: input.city?.trim(),
        district: input.district !== undefined ? input.district?.trim() : undefined,
        taluk: input.taluk !== undefined ? input.taluk?.trim() : undefined,
        latitude: input.latitude,
        longitude: input.longitude,
        
        start_date: input.startDate ? new Date(input.startDate) : undefined,
        expected_end_date: input.expectedEndDate ? new Date(input.expectedEndDate) : undefined,
        work_duration_days: input.workDurationDays,
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
        accepted_at: (order.status === 'ACCEPTED' && isMaterialChange) ? null : order.accepted_at,
        updated_at: new Date()
      }
    });

    await prisma.work_order_events.create({
      data: {
        work_order_id: orderId,
        actor_id: employerId,
        actor_role: 'EMPLOYER',
        event_type: 'UPDATED',
        notes: isMaterialChange 
          ? 'Material terms amended; renewed acceptance required from candidate' 
          : 'Terms updated by employer',
        snapshot: updated as any
      }
    });

    if (isMaterialChange && order.status === 'ACCEPTED') {
      await NotificationDispatcher.dispatch({
        userId: order.worker_id,
        title: "Work Order Terms Amended ⚠️",
        message: `Employer amended terms for "${order.job_title}". Please review and re-accept the updated conditions.`,
        type: "WORK_ORDER_AMENDED",
        link: `/work-orders/${order.id}`,
        data: { workOrderId: order.id, orderNumber: order.order_number }
      }).catch(err => console.warn('[WorkOrderService] Notification error:', err.message));
    }

    return updated;
  }

  /**
   * 5. Cancel Work Order (Employer or Worker mutual)
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

    const updated = await prisma.work_orders.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        updated_at: new Date()
      }
    });

    const isEmployer = order.employer_id === userId;
    await prisma.work_order_events.create({
      data: {
        work_order_id: orderId,
        actor_id: userId,
        actor_role: isEmployer ? 'EMPLOYER' : 'WORKER',
        event_type: 'CANCELLED',
        notes: reason || 'Work order cancelled'
      }
    });

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
        include: {
          jobs: { select: { id: true, title: true, city: true } }
        }
      }),
      prisma.work_orders.count({ where })
    ]);

    // Batch enrich worker profile information
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
        include: {
          jobs: { select: { id: true, title: true, city: true } }
        }
      }),
      prisma.work_orders.count({ where })
    ]);

    // Batch enrich employer profile information
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
   * 8. Get Single Work Order Details & Audit Trail
   */
  public static async getWorkOrderById(userId: string, userRole: string, orderId: string) {
    const order = await prisma.work_orders.findUnique({
      where: { id: orderId },
      include: {
        jobs: true,
        job_applications: true,
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

    // Enrich both parties
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
