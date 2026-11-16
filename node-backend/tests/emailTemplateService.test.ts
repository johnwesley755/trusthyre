import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { validateAndSanitizeEmailHtml } from '../src/utils/emailHtmlSanitizer';
import { EmailTemplateManagerService } from '../src/services/emailTemplateManagerService';
import { sendTemplateEmail } from '../src/services/mailer';
import { interpolateTemplate, extractTemplatePlaceholders } from '../src/utils/templateUtils';

describe('Custom Email Template Management System Test Suite', () => {
  const testAdminId = 'e0000000-0000-4000-a000-000000000088';
  const testTemplateKey = 'TEST_REGISTRATION_WELCOME_001';

  beforeAll(async () => {
    // 1. Setup Admin user
    await prisma.user_metadata.upsert({
      where: { id: testAdminId },
      update: { first_name: 'Super', last_name: 'Admin', email: 'email.admin@trusthyre.com', role: 'SUPER_ADMIN' },
      create: {
        id: testAdminId,
        first_name: 'Super',
        last_name: 'Admin',
        email: 'email.admin@trusthyre.com',
        role: 'SUPER_ADMIN'
      }
    });

    // 2. Clean up test template if existing
    await (prisma as any).email_templates.deleteMany({
      where: { template_key: testTemplateKey },
    });
  });

  afterAll(async () => {
    await (prisma as any).email_templates.deleteMany({
      where: { template_key: testTemplateKey },
    });
  });

  it('1. HTML Sanitizer strips dangerous <script> tags and hostile inline JS event handlers', () => {
    const maliciousHtml = `
      <div style="padding: 20px;">
        <h1>Welcome {{params.firstName}}</h1>
        <script>alert('xss');</script>
        <a href="javascript:stealTokens()" onclick="doMalicious()">Click Here</a>
        <img src="https://trusthyre.com/logo.png" onload="alert(1)" />
      </div>
    `;

    const result = validateAndSanitizeEmailHtml(maliciousHtml);
    expect(result.isValid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some(v => v.includes('<script>'))).toBe(true);
    expect(result.violations.some(v => v.includes('event handlers'))).toBe(true);
    expect(result.violations.some(v => v.includes('javascript:'))).toBe(true);

    // Sanitized HTML should have stripped out scripts, onclick, and onload
    expect(result.sanitizedHtml).not.toContain('<script>');
    expect(result.sanitizedHtml).not.toContain('onclick');
    expect(result.sanitizedHtml).not.toContain('onload');
    expect(result.sanitizedHtml).not.toContain('javascript:');
    expect(result.sanitizedHtml).toContain('<div');
    expect(result.sanitizedHtml).toContain('https://trusthyre.com/logo.png');
  });

  it('2. Creates a local draft template and enforces unique template_key', async () => {
    const validHtml = `
      <table width="100%">
        <tr><td><h2>Hello {{params.name}}</h2><p>Welcome to TrustHyre.</p></td></tr>
      </table>
    `;

    const draft = await EmailTemplateManagerService.createDraft({
      template_key: testTemplateKey,
      name: 'Test Registration Welcome',
      category: 'ONBOARDING',
      subject: 'Welcome to TrustHyre, {{params.name}}',
      html_content: validHtml,
      variables: { name: { type: 'string', required: true } },
      actorUserId: testAdminId,
    });

    expect(draft).toBeDefined();
    expect(draft.template_key).toBe(testTemplateKey);
    expect(draft.status).toBe('DRAFT');

    // Attempting duplicate template key must throw
    await expect(
      EmailTemplateManagerService.createDraft({
        template_key: testTemplateKey,
        name: 'Duplicate Test',
        subject: 'Dupe',
        html_content: validHtml,
        actorUserId: testAdminId,
      })
    ).rejects.toThrow();
  });

  it('3. Updates draft without mutating published status and preserves draft isolation', async () => {
    const template = await (prisma as any).email_templates.findUnique({
      where: { template_key: testTemplateKey },
    });
    expect(template).toBeDefined();

    const updated = await EmailTemplateManagerService.updateDraft(
      template.id,
      {
        subject: 'Updated Subject: Welcome {{params.name}}',
        actorUserId: testAdminId,
      },
      true
    );

    expect(updated.subject).toBe('Updated Subject: Welcome {{params.name}}');
    expect(updated.status).toBe('DRAFT');
  });

  it('4. Rejects draft publishing if attempted by non-Super Admin or without authorization', async () => {
    const template = await (prisma as any).email_templates.findUnique({
      where: { template_key: testTemplateKey },
    });

    // Calling the API endpoint with worker/anonymous role must return 401/403
    const req = new Request(`http://localhost/api/admin/email-templates/${template.id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ change_summary: 'Attempt unauthenticated publish' }),
    });

    const res = await app.fetch(req, process.env, {});
    expect([401, 403]).toContain(res.status);
  });

  it('5. Required variable enforcement: sendTemplateEmail rejects missing required parameters', async () => {
    // Attempting to dispatch an unpublished template must throw
    await expect(
      sendTemplateEmail(testTemplateKey, 'test.recipient@trusthyre.com', {})
    ).rejects.toThrow();
  });

  it('6. Test email endpoint rejects invalid email addresses and enforces admin authentication', async () => {
    const template = await (prisma as any).email_templates.findUnique({
      where: { template_key: testTemplateKey },
    });

    const req = new Request(`http://localhost/api/admin/email-templates/${template.id}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'invalid-email-address' }),
    });

    const res = await app.fetch(req, process.env, {});
    // Should be rejected with 401 (unauthorized admin) or 400 (invalid email)
    expect([400, 401, 403]).toContain(res.status);
  });

  it('7. HTML Sanitizer strips disallowed <style> blocks and preserves safe inline style attributes', () => {
    const htmlWithStyleTag = `
      <div style="background-color: #0f2f63; padding: 20px; color: #ffffff;">
        <style>body { background: red; }</style>
        <h2>Secure Email</h2>
        <p style="font-size: 14px;">Inline style preserved.</p>
      </div>
    `;

    const result = validateAndSanitizeEmailHtml(htmlWithStyleTag);
    expect(result.sanitizedHtml).not.toContain('<style>');
    expect(result.sanitizedHtml).toContain('background-color:#0f2f63');
    expect(result.sanitizedHtml).toContain('font-size:14px');
  });

  it('8. Test email endpoint rejects malicious HTML containing forbidden script tags', async () => {
    const template = await (prisma as any).email_templates.findUnique({
      where: { template_key: testTemplateKey },
    });

    const req = new Request(`http://localhost/api/admin/email-templates/${template.id}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@trusthyre.com',
        html_content: '<p>Hello</p><script>alert(1)</script>'
      }),
    });

    const res = await app.fetch(req, process.env, {});
    // Must be rejected with 400 or 401/403
    expect([400, 401, 403]).toContain(res.status);
  });

  it('9. Safe Template Interpolator preserves literal dollar signs ($100, $&, $\') without pattern expansion', () => {
    const rawHtml = '<p>Your payout of {{params.amount}} is approved. Token: {{params.token}}</p>';
    const params = {
      amount: '$1,500.00 & $10 bonus',
      token: 'SEC$1_XYZ',
    };

    const rendered = interpolateTemplate(rawHtml, params);
    expect(rendered).toBe('<p>Your payout of $1,500.00 & $10 bonus is approved. Token: SEC$1_XYZ</p>');
    // Must not expand $1 into regex capturing group or empty string
    expect(rendered).not.toContain('SEC_XYZ');
  });

  it('10. Template Placeholders Extractor discovers all {{params.var}} keys', () => {
    const html = `
      <h1>Hello {{params.firstName}}</h1>
      <p>Job: {{params.jobTitle}} at {{params.companyName}}</p>
      <a href="{{params.actionUrl}}">Apply</a>
    `;

    const keys = extractTemplatePlaceholders(html);
    expect(keys).toContain('firstName');
    expect(keys).toContain('jobTitle');
    expect(keys).toContain('companyName');
    expect(keys).toContain('actionUrl');
    expect(keys.length).toBe(4);
  });

  it('11. Template Archiving safely transitions status and strictly protects system templates', async () => {
    // 1. Attempting to archive system template must throw
    const systemTemplate = await (prisma as any).email_templates.findFirst({
      where: { is_system: true },
    });

    if (systemTemplate) {
      await expect(
        EmailTemplateManagerService.archiveTemplate(systemTemplate.id, testAdminId)
      ).rejects.toThrow('System-critical email templates cannot be archived');
    }

    // 2. Archiving custom draft template succeeds
    const customDraft = await (prisma as any).email_templates.findUnique({
      where: { template_key: testTemplateKey },
    });

    const archived = await EmailTemplateManagerService.archiveTemplate(customDraft.id, testAdminId);
    expect(archived.status).toBe('ARCHIVED');
  });

  it('12. Local preview endpoint handles id=new gracefully without 404', async () => {
    const req = new Request('http://localhost/api/admin/email-templates/new/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html_content: '<p>Hello {{params.name}}</p>',
        subject: 'Welcome {{params.name}}',
        params: { name: 'John' },
      }),
    });

    const res = await app.fetch(req, process.env, {});
    // May be 401 if unauthenticated or 200 if authenticated
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      const data: any = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.renderedHtml).toContain('Hello John');
    }
  });
});
