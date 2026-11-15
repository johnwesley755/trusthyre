export interface BrevoTemplateRecord {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  testSent: boolean;
  sender?: { name?: string; email?: string };
  replyTo?: string;
  toField?: string;
  tag?: string;
  htmlContent?: string;
  createdAt?: string;
  modifiedAt?: string;
}

export interface BrevoListTemplatesOptions {
  limit?: number;
  offset?: number;
  status?: boolean;
  sort?: 'desc' | 'asc';
}

export class BrevoTemplateService {
  private static cache: { data: BrevoTemplateRecord[]; timestamp: number } | null = null;
  private static CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  private static getApiKey(): string {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('Email provider integration is not configured: BREVO_API_KEY is missing.');
    }
    return apiKey;
  }

  /**
   * Retrieves remote Brevo transactional templates with pagination.
   */
  static async listTemplates(options: BrevoListTemplatesOptions = {}, forceRefresh: boolean = false): Promise<{ count: number; templates: BrevoTemplateRecord[] }> {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.cache.timestamp < this.CACHE_TTL_MS && !options.offset) {
      return { count: this.cache.data.length, templates: this.cache.data };
    }

    const apiKey = this.getApiKey();
    const limit = Math.min(options.limit || 50, 1000);
    const offset = options.offset || 0;
    const sort = options.sort || 'desc';

    const url = new URL('https://api.brevo.com/v3/smtp/templates');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('sort', sort);
    if (typeof options.status === 'boolean') {
      url.searchParams.set('templateStatus', String(options.status));
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to list Brevo templates (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json();
    const templates = (data.templates || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      isActive: t.isActive,
      testSent: t.testSent,
      sender: t.sender,
      replyTo: t.replyTo,
      toField: t.toField,
      tag: t.tag,
      htmlContent: t.htmlContent,
      createdAt: t.createdAt,
      modifiedAt: t.modifiedAt,
    }));

    if (offset === 0) {
      this.cache = { data: templates, timestamp: now };
    }

    return { count: data.count || templates.length, templates };
  }

  /**
   * Retrieves one template by numeric/string ID from Brevo.
   */
  static async getTemplate(templateId: string | number): Promise<BrevoTemplateRecord> {
    const apiKey = this.getApiKey();
    const res = await fetch(`https://api.brevo.com/v3/smtp/templates/${templateId}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch Brevo template #${templateId} (HTTP ${res.status}): ${errText}`);
    }

    return res.json();
  }

  /**
   * Creates an inactive template in Brevo for safe review prior to publishing.
   */
  static async createTemplate(payload: {
    templateName: string;
    subject: string;
    htmlContent: string;
    senderName?: string;
    senderEmail?: string;
    tag?: string;
    isActive?: boolean;
  }): Promise<{ id: number }> {
    const apiKey = this.getApiKey();
    const senderEmail = (payload.senderEmail || process.env.BREVO_SENDER_EMAIL || 'noreply@trusthyre.com').trim();
    const senderName = (payload.senderName || process.env.BREVO_SENDER_NAME || 'TrustHyre').trim();

    const body = {
      templateName: payload.templateName,
      subject: payload.subject,
      sender: { name: senderName, email: senderEmail },
      htmlContent: payload.htmlContent,
      tag: payload.tag || 'trusthyre-managed',
      isActive: Boolean(payload.isActive), // Default to false/inactive for safe review
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/templates', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create template in Brevo (HTTP ${res.status}): ${errText}`);
    }

    // Invalidate cache
    this.cache = null;
    return res.json();
  }

  /**
   * Updates an existing TrustHyre-managed template in Brevo.
   */
  static async updateTemplate(
    templateId: string | number,
    payload: {
      templateName?: string;
      subject?: string;
      htmlContent?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    const apiKey = this.getApiKey();
    const body: any = {};
    if (payload.templateName) body.templateName = payload.templateName;
    if (payload.subject) body.subject = payload.subject;
    if (payload.htmlContent) body.htmlContent = payload.htmlContent;
    if (typeof payload.isActive === 'boolean') body.isActive = payload.isActive;

    const res = await fetch(`https://api.brevo.com/v3/smtp/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to update Brevo template #${templateId} (HTTP ${res.status}): ${errText}`);
    }

    this.cache = null;
  }

  /**
   * Sends a test email to an explicit recipient using Brevo's sendTest endpoint.
   */
  static async sendTestEmail(templateId: string | number, testEmail: string): Promise<void> {
    if (!testEmail || !testEmail.includes('@')) {
      throw new Error('A valid, explicit test email address must be provided.');
    }

    const apiKey = this.getApiKey();
    const res = await fetch(`https://api.brevo.com/v3/smtp/templates/${templateId}/sendTest`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        emailTo: [testEmail.trim()],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to send test email via Brevo (HTTP ${res.status}): ${errText}`);
    }
  }
}
