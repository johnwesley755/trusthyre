import prisma from '../config/prisma';

export type TemplateAuditAction =
  | 'TEMPLATE_CREATED'
  | 'TEMPLATE_UPDATED'
  | 'TEMPLATE_DUPLICATED'
  | 'TEMPLATE_IMPORTED'
  | 'TEMPLATE_PREVIEWED'
  | 'TEST_EMAIL_SENT'
  | 'TEMPLATE_PUBLISHED'
  | 'TEMPLATE_ACTIVATED'
  | 'TEMPLATE_DEACTIVATED'
  | 'TEMPLATE_ROLLBACK'
  | 'TEMPLATE_ARCHIVED'
  | 'BREVO_SYNC_FAILED';

export interface AuditLogOptions {
  templateId?: string;
  actorUserId: string;
  action: TemplateAuditAction;
  metadata?: Record<string, any>;
}

export class EmailTemplateAuditService {
  /**
   * Records an administrative action in the audit log.
   * Strips any sensitive credentials, tokens, or raw OTP values from metadata.
   */
  static async record(options: AuditLogOptions): Promise<void> {
    try {
      const sanitizedMeta = { ...(options.metadata || {}) };

      // Ensure no raw secrets, OTPs, or reset tokens are ever logged
      delete sanitizedMeta.otp;
      delete sanitizedMeta.token;
      delete sanitizedMeta.password;
      delete sanitizedMeta.apiKey;
      delete sanitizedMeta.secret;

      await (prisma as any).email_template_audit_logs.create({
        data: {
          template_id: options.templateId || null,
          actor_user_id: options.actorUserId || 'SYSTEM',
          action: options.action,
          metadata: sanitizedMeta,
        },
      });
    } catch (err: any) {
      console.error('[EmailTemplateAuditService] Failed to record audit log:', err.message);
    }
  }

  /**
   * Retrieves audit logs for a template or actor.
   */
  static async getLogs(templateId?: string, limit: number = 50) {
    const where: any = {};
    if (templateId) where.template_id = templateId;

    return (prisma as any).email_template_audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Math.min(limit, 100),
    });
  }
}
