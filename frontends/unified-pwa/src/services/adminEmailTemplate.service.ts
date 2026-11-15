import apiClient from '../api/apiClient';

export interface EmailTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  subject: string;
  preheader?: string;
  html_content: string;
  text_content?: string;
  variables: Record<string, any>;
  brevo_template_id?: string;
  change_summary?: string;
  created_by?: string;
  published_at: string;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  preheader?: string;
  html_content: string;
  text_content?: string;
  variables: Record<string, any>;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  source_type: 'APPLICATION' | 'BREVO_IMPORT';
  brevo_template_id?: string;
  published_version_id?: string;
  is_system: boolean;
  is_locked: boolean;
  created_by?: string;
  updated_by?: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  versions?: EmailTemplateVersion[];
}

export interface BrevoRemoteTemplate {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  testSent: boolean;
  sender?: { name?: string; email?: string };
  createdAt?: string;
  modifiedAt?: string;
}

export interface TemplateInventoryResponse {
  localTemplates: EmailTemplate[];
  brevoTemplates: BrevoRemoteTemplate[];
  codeTemplates: Array<{
    key: string;
    name: string;
    category: string;
    source: string;
    description: string;
  }>;
  brevoError?: string;
}

export const adminEmailTemplateService = {
  getInventory: async (): Promise<TemplateInventoryResponse> => {
    const res = await apiClient.get('/api/admin/email-templates');
    return res.data?.data || res.data;
  },

  getTemplateById: async (id: string): Promise<EmailTemplate> => {
    const res = await apiClient.get(`/api/admin/email-templates/${id}`);
    return res.data?.data || res.data;
  },

  createTemplate: async (data: {
    template_key: string;
    name: string;
    description?: string;
    category?: string;
    subject: string;
    preheader?: string;
    html_content: string;
    text_content?: string;
    variables?: Record<string, any>;
  }): Promise<EmailTemplate> => {
    const res = await apiClient.post('/api/admin/email-templates', data);
    return res.data?.data || res.data;
  },

  updateDraft: async (id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const res = await apiClient.put(`/api/admin/email-templates/${id}`, data);
    return res.data?.data || res.data;
  },

  duplicateTemplate: async (id: string, templateKey?: string): Promise<EmailTemplate> => {
    const res = await apiClient.post(`/api/admin/email-templates/${id}/duplicate`, { template_key: templateKey });
    return res.data?.data || res.data;
  },

  importBrevoTemplate: async (brevoTemplateId: string | number): Promise<EmailTemplate> => {
    const res = await apiClient.post(`/api/admin/email-templates/import/${brevoTemplateId}`);
    return res.data?.data || res.data;
  },

  renderPreview: async (id: string, htmlContent?: string, params?: Record<string, any>): Promise<{ renderedHtml: string; subject: string; preheader?: string }> => {
    const res = await apiClient.post(`/api/admin/email-templates/${id}/preview`, { html_content: htmlContent, params });
    return res.data?.data || res.data;
  },

  sendTestEmail: async (
    id: string,
    email: string,
    options?: {
      html_content?: string;
      subject?: string;
      params?: Record<string, any>;
    }
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    const endpoint = !id || id === 'new' ? '/api/admin/email-templates/test' : `/api/admin/email-templates/${id}/test`;
    const res = await apiClient.post(endpoint, { email, ...options });
    return res.data;
  },

  publishTemplate: async (id: string, changeSummary?: string): Promise<{ template: EmailTemplate; version: EmailTemplateVersion }> => {
    const res = await apiClient.post(`/api/admin/email-templates/${id}/publish`, { change_summary: changeSummary });
    return res.data?.data || res.data;
  },

  rollbackTemplate: async (id: string, versionId: string): Promise<EmailTemplate> => {
    const res = await apiClient.post(`/api/admin/email-templates/${id}/rollback`, { version_id: versionId });
    return res.data?.data || res.data;
  },

  syncBrevo: async (): Promise<{ count: number; templates: BrevoRemoteTemplate[] }> => {
    const res = await apiClient.post('/api/admin/email-templates/sync');
    return res.data?.data || res.data;
  },
};
