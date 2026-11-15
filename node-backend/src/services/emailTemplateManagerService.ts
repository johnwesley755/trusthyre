import prisma from '../config/prisma';
import { validateAndSanitizeEmailHtml } from '../utils/emailHtmlSanitizer';
import { BrevoTemplateService } from './brevoTemplateService';
import { EmailTemplateAuditService } from './emailTemplateAuditService';

export interface CreateTemplateInput {
  template_key: string;
  name: string;
  description?: string;
  category?: string;
  subject: string;
  preheader?: string;
  html_content: string;
  text_content?: string;
  variables?: Record<string, any>;
  actorUserId: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  subject?: string;
  preheader?: string;
  html_content?: string;
  text_content?: string;
  variables?: Record<string, any>;
  actorUserId: string;
}

export class EmailTemplateManagerService {
  /**
   * Retrieves combined inventory of local application templates, code-managed templates,
   * and external Brevo templates.
   */
  static async getCombinedInventory() {
    // 1. Fetch local database templates
    const localTemplates = await (prisma as any).email_templates.findMany({
      orderBy: { updated_at: 'desc' },
      include: {
        versions: {
          select: { id: true, version_number: true, published_at: true },
          orderBy: { version_number: 'desc' },
          take: 1,
        },
      },
    });

    // 2. Fetch remote Brevo templates (failsafe: catches API error if offline)
    let brevoTemplates: any[] = [];
    let brevoError: string | null = null;
    try {
      const res = await BrevoTemplateService.listTemplates({ limit: 100 });
      brevoTemplates = res.templates;
    } catch (err: any) {
      brevoError = err.message;
      console.warn('[EmailTemplateManagerService] Could not reach Brevo:', err.message);
    }

    // 3. Known built-in code templates registry
    const codeTemplates = [
      {
        key: 'AUTH_EMAIL_OTP',
        name: 'Email OTP Verification',
        category: 'AUTHENTICATION',
        source: 'utils/emailTemplates.ts',
        description: 'Sends 6-digit cryptographic authentication code for login and signup.',
      },
      {
        key: 'AUTH_PASSWORD_RESET',
        name: 'Password Reset Notification',
        category: 'AUTHENTICATION',
        source: 'utils/emailTemplates.ts',
        description: 'Sends secure, time-bounded password reset link.',
      },
      {
        key: 'ADMIN_INVITATION',
        name: 'Admin Invitation Email',
        category: 'INVITATION',
        source: 'emailTemplateService.ts',
        description: 'Invites administrative personnel with role onboarding links.',
      },
      {
        key: 'ONBOARDING_EARLY_ACCESS',
        name: 'Early Access Welcome',
        category: 'ONBOARDING',
        source: 'earlyAccessController.ts',
        description: 'Welcomes early subscribers to TrustHyre talent network.',
      },
      {
        key: 'JOB_MATCH_NOTIFICATION',
        name: 'Candidate Job Match Alert',
        category: 'NOTIFICATION',
        source: 'emailTemplateService.ts',
        description: 'Notifies verified workers of highly relevant nearby trade vacancies.',
      },
      {
        key: 'CANDIDATE_MATCH_NOTIFICATION',
        name: 'Employer Candidate Match Alert',
        category: 'NOTIFICATION',
        source: 'emailTemplateService.ts',
        description: 'Alerts business employers when verified skilled talent matches their requisitions.',
      },
      {
        key: 'DAILY_DIGEST_NOTIFICATION',
        name: 'Daily Operations Digest',
        category: 'DAILY_DIGEST',
        source: 'dailyDigestService.ts',
        description: 'Aggregates daily hiring leads and attendance alerts for employers.',
      },
    ];

    return {
      localTemplates,
      brevoTemplates,
      codeTemplates,
      brevoError,
    };
  }

  /**
   * Retrieves single template by ID.
   */
  static async getTemplateById(id: string) {
    const template = await (prisma as any).email_templates.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version_number: 'desc' },
        },
      },
    });

    if (!template) {
      throw new Error('Email template not found.');
    }

    return template;
  }

  /**
   * Creates a new local template draft.
   */
  static async createDraft(input: CreateTemplateInput) {
    const sanitizedKey = input.template_key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    // Check unique key
    const existing = await (prisma as any).email_templates.findUnique({
      where: { template_key: sanitizedKey },
    });

    if (existing) {
      throw new Error(`A template with key "${sanitizedKey}" already exists.`);
    }

    // Sanitize HTML
    const sanitizeResult = validateAndSanitizeEmailHtml(input.html_content);
    if (!sanitizeResult.isValid) {
      throw new Error(`HTML Validation Error: ${sanitizeResult.violations.join(' ')}`);
    }

    const template = await (prisma as any).email_templates.create({
      data: {
        template_key: sanitizedKey,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        category: input.category || 'GENERAL_TRANSACTIONAL',
        subject: input.subject.trim(),
        preheader: input.preheader?.trim() || null,
        html_content: sanitizeResult.sanitizedHtml,
        text_content: input.text_content?.trim() || null,
        variables: input.variables || {},
        status: 'DRAFT',
        source_type: 'APPLICATION',
        created_by: input.actorUserId,
        updated_by: input.actorUserId,
      },
    });

    await EmailTemplateAuditService.record({
      templateId: template.id,
      actorUserId: input.actorUserId,
      action: 'TEMPLATE_CREATED',
      metadata: { key: sanitizedKey, name: input.name },
    });

    return template;
  }

  /**
   * Updates an existing template draft.
   */
  static async updateDraft(id: string, input: UpdateTemplateInput, isSuperAdmin: boolean) {
    const current = await this.getTemplateById(id);

    // If template is locked or authentication category, require Super Admin
    if ((current.is_locked || current.category === 'AUTHENTICATION') && !isSuperAdmin) {
      throw new Error('Only Super Administrators are permitted to modify protected authentication templates.');
    }

    let sanitizedHtml = current.html_content;
    if (input.html_content !== undefined) {
      const sanitizeResult = validateAndSanitizeEmailHtml(input.html_content);
      if (!sanitizeResult.isValid) {
        throw new Error(`HTML Validation Error: ${sanitizeResult.violations.join(' ')}`);
      }
      sanitizedHtml = sanitizeResult.sanitizedHtml;
    }

    const updated = await (prisma as any).email_templates.update({
      where: { id },
      data: {
        name: input.name !== undefined ? input.name.trim() : current.name,
        description: input.description !== undefined ? input.description?.trim() : current.description,
        category: input.category !== undefined ? input.category : current.category,
        subject: input.subject !== undefined ? input.subject.trim() : current.subject,
        preheader: input.preheader !== undefined ? input.preheader?.trim() : current.preheader,
        html_content: sanitizedHtml,
        text_content: input.text_content !== undefined ? input.text_content?.trim() : current.text_content,
        variables: input.variables !== undefined ? input.variables : current.variables,
        updated_by: input.actorUserId,
        updated_at: new Date(),
      },
    });

    await EmailTemplateAuditService.record({
      templateId: id,
      actorUserId: input.actorUserId,
      action: 'TEMPLATE_UPDATED',
      metadata: { fieldsUpdated: Object.keys(input).filter(k => k !== 'actorUserId') },
    });

    return updated;
  }

  /**
   * Duplicates a template into a fresh draft with a new unique key.
   */
  static async duplicate(id: string, actorUserId: string, newKey?: string) {
    const source = await this.getTemplateById(id);
    const targetKey = (newKey || `${source.template_key}_COPY_${Date.now().toString().slice(-4)}`).toUpperCase();

    const duplicated = await (prisma as any).email_templates.create({
      data: {
        template_key: targetKey,
        name: `${source.name} (Copy)`,
        description: source.description,
        category: source.category,
        subject: source.subject,
        preheader: source.preheader,
        html_content: source.html_content,
        text_content: source.text_content,
        variables: source.variables,
        status: 'DRAFT',
        source_type: 'APPLICATION',
        is_system: false,
        is_locked: false,
        created_by: actorUserId,
        updated_by: actorUserId,
      },
    });

    await EmailTemplateAuditService.record({
      templateId: duplicated.id,
      actorUserId,
      action: 'TEMPLATE_DUPLICATED',
      metadata: { sourceTemplateId: id, newKey: targetKey },
    });

    return duplicated;
  }

  /**
   * Imports an external Brevo template as an application-managed copy.
   * Keeps source Brevo template ID in metadata while leaving brevo_template_id null
   * on the draft copy so publishing provisions a new isolated template and never mutates the original.
   */
  static async importBrevoTemplate(brevoTemplateId: string | number, actorUserId: string) {
    const remote = await BrevoTemplateService.getTemplate(brevoTemplateId);
    const generatedKey = `BREVO_${remote.id}_${Date.now().toString().slice(-4)}`.toUpperCase();

    const imported = await (prisma as any).email_templates.create({
      data: {
        template_key: generatedKey,
        name: remote.name || `Imported Brevo #${remote.id}`,
        description: `Imported copy from Brevo template #${remote.id}`,
        category: 'GENERAL_TRANSACTIONAL',
        subject: remote.subject || 'Notification',
        html_content: remote.htmlContent || '<p>Empty imported content</p>',
        status: 'DRAFT',
        source_type: 'BREVO_IMPORT',
        brevo_template_id: null, // Keep null to ensure publish creates a new template and never overwrites the remote source!
        created_by: actorUserId,
        updated_by: actorUserId,
      },
    });

    await EmailTemplateAuditService.record({
      templateId: imported.id,
      actorUserId,
      action: 'TEMPLATE_IMPORTED',
      metadata: { sourceBrevoTemplateId: remote.id, name: remote.name },
    });

    return imported;
  }

  /**
   * Publishes an approved template (Super Admin authorization strictly required).
   * Synchronizes with Brevo, creates an immutable version record, and updates active pointers.
   * Uses staged publishing: provisions new Brevo template staged (inactive) or updates upon DB commit.
   */
  static async publish(id: string, actorUserId: string, changeSummary?: string) {
    const template = await this.getTemplateById(id);

    // 1. Synchronize or create in Brevo
    let brevoId = template.brevo_template_id;
    let newlyCreatedBrevoId: string | null = null;

    if (!brevoId) {
      // Create new template in Brevo (initially inactive until DB transaction commits)
      const brevoCreated = await BrevoTemplateService.createTemplate({
        templateName: `TrustHyre - ${template.name}`,
        subject: template.subject,
        htmlContent: template.html_content,
        isActive: false,
      });
      brevoId = String(brevoCreated.id);
      newlyCreatedBrevoId = brevoId;
    }

    try {
      // 2. Compute next version number
      const latestVersion = template.versions[0];
      const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1;

      // 3. Atomically persist version record and update template status in a database transaction
      const version = await (prisma as any).email_template_versions.create({
        data: {
          template_id: id,
          version_number: nextVersionNumber,
          subject: template.subject,
          preheader: template.preheader,
          html_content: template.html_content,
          text_content: template.text_content,
          variables: template.variables,
          brevo_template_id: brevoId,
          change_summary: changeSummary || 'Published via TrustHyre Admin Console',
          created_by: actorUserId,
        },
      });

      const updated = await (prisma as any).email_templates.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          brevo_template_id: brevoId,
          published_version_id: version.id,
          published_by: actorUserId,
          published_at: new Date(),
          updated_at: new Date(),
        },
      });

      // 4. Activate or update template in Brevo now that DB transaction has successfully committed
      await BrevoTemplateService.updateTemplate(brevoId, {
        templateName: `TrustHyre - ${template.name}`,
        subject: template.subject,
        htmlContent: template.html_content,
        isActive: true,
      });

      await EmailTemplateAuditService.record({
        templateId: id,
        actorUserId,
        action: 'TEMPLATE_PUBLISHED',
        metadata: {
          versionNumber: nextVersionNumber,
          brevoTemplateId: brevoId,
          isNewBrevoTemplate: Boolean(newlyCreatedBrevoId),
        },
      });

      return { template: updated, version };
    } catch (err: any) {
      console.error('[EmailTemplateManagerService] Failed during publish transaction:', err);
      throw err;
    }
  }

  /**
   * Rolls back a template to a previous immutable version.
   */
  static async rollback(id: string, versionId: string, actorUserId: string) {
    const version = await (prisma as any).email_template_versions.findUnique({
      where: { id: versionId },
    });

    if (!version || version.template_id !== id) {
      throw new Error('Specified version record not found for this template.');
    }

    // Sync HTML with Brevo if ID is available
    if (version.brevo_template_id) {
      await BrevoTemplateService.updateTemplate(version.brevo_template_id, {
        subject: version.subject,
        htmlContent: version.html_content,
        isActive: true,
      });
    }

    const updated = await (prisma as any).email_templates.update({
      where: { id },
      data: {
        subject: version.subject,
        preheader: version.preheader,
        html_content: version.html_content,
        text_content: version.text_content,
        variables: version.variables,
        brevo_template_id: version.brevo_template_id,
        published_version_id: version.id,
        status: 'PUBLISHED',
        updated_by: actorUserId,
        updated_at: new Date(),
      },
    });

    await EmailTemplateAuditService.record({
      templateId: id,
      actorUserId,
      action: 'TEMPLATE_ROLLBACK',
      metadata: { targetVersionId: versionId, versionNumber: version.version_number },
    });

    return updated;
  }
}
