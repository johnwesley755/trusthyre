import { Context } from 'hono';
import { EmailTemplateManagerService } from '../services/emailTemplateManagerService';
import { BrevoTemplateService } from '../services/brevoTemplateService';
import { EmailTemplateAuditService } from '../services/emailTemplateAuditService';
import { sendEmail } from '../services/mailer';
import { validateAndSanitizeEmailHtml } from '../utils/emailHtmlSanitizer';
import { interpolateTemplate } from '../utils/templateUtils';

export async function getTemplateInventory(c: Context) {
  try {
    const inventory = await EmailTemplateManagerService.getCombinedInventory();
    return c.json({ success: true, data: inventory });
  } catch (err: any) {
    console.error('[adminEmailTemplateController] getTemplateInventory error:', err);
    return c.json({ success: false, message: err.message }, 500);
  }
}

export async function getTemplateById(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const template = await EmailTemplateManagerService.getTemplateById(id);
    return c.json({ success: true, data: template });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 404);
  }
}

export async function createTemplate(c: Context) {
  try {
    const body = await c.req.json();
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || 'ADMIN';

    const sanitizedKey = (body.template_key || '').trim().toUpperCase();
    if (!/^[A-Z0-9_]{3,100}$/.test(sanitizedKey)) {
      return c.json({
        success: false,
        message: 'template_key must be 3-100 characters containing only uppercase letters, numbers, and underscores.',
      }, 400);
    }

    const name = (body.name || '').trim();
    if (!name || name.length > 255) {
      return c.json({
        success: false,
        message: 'Template name is required and cannot exceed 255 characters.',
      }, 400);
    }

    const subject = (body.subject || '').trim();
    if (!subject || subject.length > 500) {
      return c.json({
        success: false,
        message: 'Template subject is required and cannot exceed 500 characters.',
      }, 400);
    }

    if (!body.html_content?.trim()) {
      return c.json({ success: false, message: 'html_content is required.' }, 400);
    }

    const template = await EmailTemplateManagerService.createDraft({
      template_key: sanitizedKey,
      name,
      description: body.description,
      category: body.category,
      subject,
      preheader: body.preheader,
      html_content: body.html_content,
      text_content: body.text_content,
      variables: body.variables,
      actorUserId,
    });

    return c.json({ success: true, data: template }, 201);
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
}

export async function updateDraft(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const body = await c.req.json();
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || user?.sub || 'ADMIN';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const updated = await EmailTemplateManagerService.updateDraft(id, {
      ...body,
      actorUserId,
    }, isSuperAdmin);

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
}

export async function duplicateTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || 'ADMIN';

    const duplicated = await EmailTemplateManagerService.duplicate(id, actorUserId, body.template_key);
    return c.json({ success: true, data: duplicated }, 201);
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
}

export async function importBrevoTemplate(c: Context) {
  try {
    const brevoId = c.req.param('brevoTemplateId');
    if (!brevoId) {
      return c.json({ success: false, message: 'Brevo template ID is required.' }, 400);
    }
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || 'ADMIN';

    const imported = await EmailTemplateManagerService.importBrevoTemplate(brevoId, actorUserId);
    return c.json({ success: true, data: imported }, 201);
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
}

export async function renderLocalPreview(c: Context) {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));

    let template: any = null;
    if (id && id !== 'new') {
      try {
        template = await EmailTemplateManagerService.getTemplateById(id);
      } catch {
        // template not found, fall back to body
      }
    }

    let html = body.html_content || template?.html_content || '';
    const sampleParams = body.params || {};

    const defaultParams: Record<string, any> = {
      logoUrl: 'https://trusthyre.com/logo.png',
      currentYear: new Date().getFullYear(),
      supportEmail: 'support@trusthyre.com',
      portalUrl: 'https://trusthyre.com',
      ...(template?.variables || {}),
      ...sampleParams,
    };

    const renderedHtml = interpolateTemplate(html, defaultParams);
    const renderedSubject = interpolateTemplate(body.subject || template?.subject || 'TrustHyre Notification', defaultParams);
    const renderedPreheader = interpolateTemplate(body.preheader || template?.preheader || '', defaultParams);

    return c.json({
      success: true,
      data: {
        renderedHtml,
        subject: renderedSubject,
        preheader: renderedPreheader,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
}

export async function sendTestEmail(c: Context) {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || user?.sub || 'ADMIN';

    const recipientEmail = (body.email || body.recipientEmail || '').trim();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return c.json({ success: false, message: 'A valid recipient email address is required (e.g. name@domain.com).' }, 400);
    }

    let template: any = null;
    if (id && id !== 'new') {
      try {
        template = await EmailTemplateManagerService.getTemplateById(id);
      } catch {
        // template not yet persisted, proceed with body content
      }
    }

    let rawHtml = body.html_content || template?.html_content || '';
    let rawSubject = body.subject || template?.subject || 'TrustHyre Notification';

    if (!rawHtml) {
      return c.json({ success: false, message: 'HTML content is required for test email dispatch.' }, 400);
    }

    // Validate and sanitize HTML content to prevent malicious or disallowed elements in test emails
    const sanitizeResult = validateAndSanitizeEmailHtml(rawHtml);
    if (!sanitizeResult.isValid) {
      return c.json({
        success: false,
        message: `Template HTML validation failed: ${sanitizeResult.violations.join(' ')}`,
        violations: sanitizeResult.violations,
      }, 400);
    }

    // Merge sample preview parameters with canonical defaults
    const mergedParams: Record<string, any> = {
      logoUrl: 'https://trusthyre.com/logo.png',
      currentYear: new Date().getFullYear(),
      supportEmail: 'support@trusthyre.com',
      portalUrl: 'https://trusthyre.com',
      ...(template?.variables || {}),
      ...(body.params || {}),
    };

    // Safe literal interpolation (immune to $1, $&, $' pattern expansion)
    const renderedHtml = interpolateTemplate(sanitizeResult.sanitizedHtml, mergedParams);
    const renderedSubject = interpolateTemplate(rawSubject, mergedParams);

    const testSubject = renderedSubject.startsWith('[TEST]')
      ? renderedSubject
      : `[TEST] ${renderedSubject}`;

    // Dispatch directly via Brevo transactional mailer
    await sendEmail(recipientEmail, testSubject, renderedHtml, {
      category: 'transactional',
    });

    if (template?.id) {
      await EmailTemplateAuditService.record({
        templateId: template.id,
        actorUserId,
        action: 'TEST_EMAIL_SENT',
        metadata: {
          recipientEmail,
          subject: testSubject,
        },
      });
    }

    return c.json({
      success: true,
      message: `Test email successfully dispatched to ${recipientEmail}`,
      data: {
        recipient: recipientEmail,
        subject: testSubject,
      },
    });
  } catch (err: any) {
    console.error('[adminEmailTemplateController] sendTestEmail error:', err);
    return c.json({ success: false, message: err.message || 'Failed to dispatch test email.' }, 500);
  }
}

export async function archiveTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || 'ADMIN';

    const archived = await EmailTemplateManagerService.archiveTemplate(id, actorUserId);
    return c.json({ success: true, data: archived });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
}

export async function publishTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || 'SUPER_ADMIN';

    const result = await EmailTemplateManagerService.publish(id, actorUserId, body.change_summary);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
}

export async function rollbackTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const body = await c.req.json();
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || 'SUPER_ADMIN';

    if (!body.version_id) {
      return c.json({ success: false, message: 'version_id is required for rollback.' }, 400);
    }

    const updated = await EmailTemplateManagerService.rollback(id, body.version_id, actorUserId);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
}

export async function syncBrevoTemplates(c: Context) {
  try {
    const result = await BrevoTemplateService.listTemplates({ limit: 100 }, true);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
}
