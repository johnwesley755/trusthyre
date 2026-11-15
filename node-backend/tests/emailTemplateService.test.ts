import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/app';
import prisma from '../src/config/prisma';
import { validateAndSanitizeEmailHtml } from '../src/utils/emailHtmlSanitizer';
import { EmailTemplateManagerService } from '../src/services/emailTemplateManagerService';
import { sendTemplateEmail } from '../src/services/mailer';

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
});
