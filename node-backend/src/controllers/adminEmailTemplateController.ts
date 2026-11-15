import { Context } from 'hono';
import { EmailTemplateManagerService } from '../services/emailTemplateManagerService';
import { BrevoTemplateService } from '../services/brevoTemplateService';
import { EmailTemplateAuditService } from '../services/emailTemplateAuditService';
import { sendEmail } from '../services/mailer';

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

    if (!body.template_key || !body.name || !body.subject || !body.html_content) {
      return c.json({ success: false, message: 'template_key, name, subject, and html_content are required.' }, 400);
    }

    const template = await EmailTemplateManagerService.createDraft({
      template_key: body.template_key,
      name: body.name,
      description: body.description,
      category: body.category,
      subject: body.subject,
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
    const actorUserId = user?.id || user?.user_id || 'ADMIN';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'admin@trusthyre.com';

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
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const template = await EmailTemplateManagerService.getTemplateById(id);

    let html = body.html_content || template.html_content;
    const sampleParams = body.params || {};

    const defaultParams: Record<string, any> = {
      logoUrl: 'https://trusthyre.com/logo.png',
      currentYear: new Date().getFullYear(),
      supportEmail: 'support@trusthyre.com',
      portalUrl: 'https://trusthyre.com',
      ...sampleParams,
    };

    // Simple placeholder substitution for local preview: {{params.variable}}
    Object.keys(defaultParams).forEach((key) => {
      const reg = new RegExp(`{{\\s*params\\.${key}\\s*}}`, 'g');
      html = html.replace(reg, String(defaultParams[key]));
    });

    return c.json({
      success: true,
      data: {
        renderedHtml: html,
        subject: template.subject,
        preheader: template.preheader,
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

    // Merge sample preview parameters with canonical defaults
    const mergedParams: Record<string, any> = {
      logoUrl: 'https://trusthyre.com/logo.png',
      currentYear: new Date().getFullYear(),
      supportEmail: 'support@trusthyre.com',
      portalUrl: 'https://trusthyre.com',
      ...(template?.variables || {}),
      ...(body.params || {}),
    };

    let renderedHtml = rawHtml;
    let renderedSubject = rawSubject;

    Object.keys(mergedParams).forEach((key) => {
      const reg = new RegExp(`{{\\s*params\\.${key}\\s*}}`, 'g');
      renderedHtml = renderedHtml.replace(reg, String(mergedParams[key]));
      renderedSubject = renderedSubject.replace(reg, String(mergedParams[key]));
    });

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
