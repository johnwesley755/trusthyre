import { Context } from 'hono';
import { EmailTemplateManagerService } from '../services/emailTemplateManagerService';
import { BrevoTemplateService } from '../services/brevoTemplateService';
import { EmailTemplateAuditService } from '../services/emailTemplateAuditService';

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
    if (!id) {
      return c.json({ success: false, message: 'Template ID is required.' }, 400);
    }
    const body = await c.req.json();
    const user = c.get('user');
    const actorUserId = user?.id || user?.user_id || 'ADMIN';

    if (!body.email || !body.email.includes('@')) {
      return c.json({ success: false, message: 'A valid test email address is required.' }, 400);
    }

    const template = await EmailTemplateManagerService.getTemplateById(id);

    // If template has Brevo ID, execute through Brevo test endpoint
    if (template.brevo_template_id) {
      await BrevoTemplateService.sendTestEmail(template.brevo_template_id, body.email.trim());
    } else {
      // Create temporary inactive template in Brevo to execute sendTest
      const temp = await BrevoTemplateService.createTemplate({
        templateName: `[TEST] ${template.name}`,
        subject: template.subject,
        htmlContent: template.html_content,
        isActive: false,
      });
      await BrevoTemplateService.sendTestEmail(temp.id, body.email.trim());
    }

    await EmailTemplateAuditService.record({
      templateId: id,
      actorUserId,
      action: 'TEST_EMAIL_SENT',
      metadata: { recipientEmail: body.email.trim() },
    });

    return c.json({ success: true, message: `Test email dispatched to ${body.email.trim()}` });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
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
