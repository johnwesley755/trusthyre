import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  Send,
  UploadCloud,
  Eye,
  Code,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Image,
  Copy,
  ShieldAlert,
  Sparkles,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { adminEmailTemplateService } from '../../../services/adminEmailTemplate.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { useAuth } from '../../../providers/AuthContext';

export const TRUSTHYRE_LOGO_URL = 'https://trusthyre.com/logo.png';

export const TRUSTHYRE_BRAND_HEADER_SNIPPET = `<!-- Brand Header: Authority Navy (#0F2F63) with Official TrustHyre Logo -->
<tr>
  <td style="padding: 20px 32px; background-color: #0f2f63; border-bottom: 1px solid #1e3a8a;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="left" style="vertical-align: middle;">
          <a href="https://trusthyre.com" target="_blank" style="text-decoration: none; display: inline-block;">
            <img src="https://trusthyre.com/logo.png" alt="TrustHyre" width="150" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
          </a>
        </td>
        <td align="right" style="vertical-align: middle;">
          <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1px; text-transform: uppercase;">
            Verified Workforce
          </span>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

export const TRUSTHYRE_LOGO_SNIPPET = `<a href="https://trusthyre.com" target="_blank" style="text-decoration: none; display: inline-block;">
  <img src="https://trusthyre.com/logo.png" alt="TrustHyre" width="150" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
</a>`;

export const CODE_TEMPLATE_DEFAULTS: Record<string, {
  name: string;
  category: string;
  subject: string;
  preheader: string;
  variables: Record<string, any>;
  html: string;
}> = {
  AUTH_PASSWORD_RESET: {
    name: 'Password Recovery Notification',
    category: 'AUTHENTICATION',
    subject: '{{params.token}} is your TrustHyre password reset code',
    preheader: '{{params.token}} is your TrustHyre password reset code. Valid for 15 minutes.',
    variables: {
      token: '639201',
      recipientEmail: 'user@example.com',
      resetUrl: 'https://trusthyre.com/reset-password?token=639201',
      logoUrl: 'https://trusthyre.com/logo.png',
      expiresInMinutes: 15
    },
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{params.token}} is your TrustHyre password reset code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 47, 99, 0.05);">
          <tr>
            <td style="padding: 20px 32px; background-color: #0f2f63; border-bottom: 1px solid #1e3a8a;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="https://trusthyre.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://trusthyre.com/logo.png" alt="TrustHyre" width="150" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1px; text-transform: uppercase;">
                      Identity Auth
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; color: #1e293b; font-size: 15px; line-height: 1.6;">
              <h2 style="margin: 0 0 16px 0; color: #0f2f63; font-size: 18px; font-weight: 700;">Password Reset Request</h2>
              <p style="margin: 0 0 16px 0; color: #475569;">
                We received a request to reset your TrustHyre password. Use the verification code below or click the reset button to set a new password:
              </p>
              <div style="margin: 24px 0; padding: 18px; background-color: #f1f5f9; border-radius: 10px; text-align: center; border: 1px solid #cbd5e1;">
                <span style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #0f2f63; font-family: monospace;">{{params.token}}</span>
                <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b;">Code expires in {{params.expiresInMinutes}} minutes.</p>
              </div>
              <div style="margin: 24px 0; text-align: center;">
                <a href="{{params.resetUrl}}" style="display: inline-block; background-color: #0f2f63; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                  Reset My Password
                </a>
              </div>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                If you did not request a password reset, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
              © 2026 TrustHyre Technologies. Safe, verified workforce recruitment.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  AUTH_EMAIL_OTP: {
    name: 'Authentication OTP Code',
    category: 'AUTHENTICATION',
    subject: '{{params.otp}} is your TrustHyre verification code',
    preheader: '{{params.otp}} is your TrustHyre verification code. Valid for 15 minutes.',
    variables: {
      otp: '481920',
      recipientEmail: 'user@example.com',
      logoUrl: 'https://trusthyre.com/logo.png',
      expiresInMinutes: 15
    },
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{params.otp}} is your TrustHyre verification code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 47, 99, 0.05);">
          <tr>
            <td style="padding: 20px 32px; background-color: #0f2f63; border-bottom: 1px solid #1e3a8a;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="https://trusthyre.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://trusthyre.com/logo.png" alt="TrustHyre" width="150" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1px; text-transform: uppercase;">
                      Security Code
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; color: #1e293b; font-size: 15px; line-height: 1.6;">
              <h2 style="margin: 0 0 16px 0; color: #0f2f63; font-size: 18px; font-weight: 700;">Verification Code</h2>
              <p style="margin: 0 0 16px 0; color: #475569;">
                Use the one-time passcode below to complete your authentication on TrustHyre:
              </p>
              <div style="margin: 24px 0; padding: 18px; background-color: #eff6ff; border-radius: 10px; text-align: center; border: 1px solid #bfdbfe;">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f2f63; font-family: monospace;">{{params.otp}}</span>
                <p style="margin: 6px 0 0 0; font-size: 11px; color: #1e40af;">Valid for {{params.expiresInMinutes}} minutes. Do not share this code.</p>
              </div>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                If you did not attempt to sign in, please update your account credentials immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
              © 2026 TrustHyre Technologies. Safe, verified workforce recruitment.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  ADMIN_INVITATION: {
    name: 'Admin Console Invitation',
    category: 'INVITATION',
    subject: '🛡️ Invitation to join TrustHyre as an Administrator',
    preheader: 'You have been invited to join the TrustHyre Administrative Portal.',
    variables: {
      inviterName: 'Super Admin',
      recipientEmail: 'new.admin@trusthyre.com',
      acceptUrl: 'https://trusthyre.com/admin/accept-invite?token=sample_token',
      logoUrl: 'https://trusthyre.com/logo.png',
      expiresInHours: 48
    },
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join TrustHyre as an Administrator</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 47, 99, 0.05);">
          <tr>
            <td style="padding: 20px 32px; background-color: #0f2f63; border-bottom: 1px solid #1e3a8a;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="https://trusthyre.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://trusthyre.com/logo.png" alt="TrustHyre" width="150" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1px; text-transform: uppercase;">
                      Admin Portal
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; color: #1e293b; font-size: 15px; line-height: 1.6;">
              <h2 style="margin: 0 0 16px 0; color: #0f2f63; font-size: 18px; font-weight: 700;">Administrator Invitation</h2>
              <p style="margin: 0 0 16px 0; color: #475569;">
                You have been invited by <strong>{{params.inviterName}}</strong> to join the TrustHyre management operations team.
              </p>
              <div style="margin: 28px 0; text-align: center;">
                <a href="{{params.acceptUrl}}" style="display: inline-block; background-color: #0f2f63; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                  Accept Invitation &amp; Set Password
                </a>
              </div>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This invitation link will expire in {{params.expiresInHours}} hours.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
              © 2026 TrustHyre Technologies. Safe, verified workforce recruitment.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
};

const STARTER_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{params.subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Main Card Shell -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 47, 99, 0.05);">
          <!-- Brand Header with Official TrustHyre Logo -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f2f63; border-bottom: 1px solid #1e3a8a;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="https://trusthyre.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://trusthyre.com/logo.png" alt="TrustHyre" width="150" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #ffffff; font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1px; text-transform: uppercase;">
                      Verified Workforce
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px; color: #1e293b; font-size: 15px; line-height: 1.6;">
              <h2 style="margin: 0 0 16px 0; color: #0f2f63; font-size: 18px; font-weight: 600;">Hello {{params.firstName}},</h2>
              <p style="margin: 0 0 16px 0; color: #475569;">
                Thank you for using TrustHyre. Your application for <strong>{{params.jobTitle}}</strong> has been updated.
              </p>
              <div style="margin: 28px 0; text-align: center;">
                <a href="{{params.actionUrl}}" style="display: inline-block; background-color: #0f2f63; color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                  View Application Details
                </a>
              </div>
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                If you have any questions, reach out to our team at support@trusthyre.com.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
              © 2026 TrustHyre Technologies. Safe, transparent hiring for verified skilled workers and businesses.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const EmailTemplateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [category, setCategory] = useState('GENERAL_TRANSACTIONAL');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [htmlContent, setHtmlContent] = useState(STARTER_TEMPLATE);
  const [textContent, setTextContent] = useState('');
  const [variablesJson, setVariablesJson] = useState('{\n  "firstName": "Ravi",\n  "jobTitle": "Master Electrician",\n  "actionUrl": "https://trusthyre.com/jobs",\n  "logoUrl": "https://trusthyre.com/logo.png"\n}');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleAutoDetectVariables = () => {
    const matches = htmlContent.matchAll(/{{\s*params\.([a-zA-Z0-9_]+)\s*}}/g);
    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(variablesJson);
    } catch {
      parsed = {};
    }

    let addedCount = 0;
    for (const m of matches) {
      const varName = m[1];
      if (varName && parsed[varName] === undefined) {
        if (varName === 'recipientEmail' || varName === 'email') {
          parsed[varName] = 'candidate@trusthyre.com';
        } else if (varName.includes('Url') || varName.includes('Link')) {
          parsed[varName] = 'https://trusthyre.com';
        } else if (varName.includes('otp') || varName.includes('token') || varName.includes('code')) {
          parsed[varName] = '639201';
        } else {
          parsed[varName] = `Sample ${varName}`;
        }
        addedCount++;
      }
    }

    setVariablesJson(JSON.stringify(parsed, null, 2));
    setIsDirty(true);
    if (addedCount > 0) {
      toast.success(`Discovered and added ${addedCount} parameter placeholder(s) to sample JSON`);
    } else {
      toast.info('All HTML placeholders are already present in sample JSON');
    }
  };

  const { data: existingTemplate, isLoading } = useQuery({
    queryKey: ['emailTemplate', id],
    queryFn: () => adminEmailTemplateService.getTemplateById(id!),
    enabled: !isNew,
  });

  const { data: inventory, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['adminEmailTemplates'],
    queryFn: adminEmailTemplateService.getInventory,
    enabled: isNew,
  });

  const duplicateKeyTemplate = isNew && templateKey
    ? inventory?.localTemplates?.find((t) => t.template_key.toUpperCase() === templateKey.trim().toUpperCase())
    : null;

  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setTemplateKey(existingTemplate.template_key);
      setCategory(existingTemplate.category);
      setSubject(existingTemplate.subject);
      setPreheader(existingTemplate.preheader || '');
      setHtmlContent(existingTemplate.html_content);
      setTextContent(existingTemplate.text_content || '');
      setVariablesJson(JSON.stringify(existingTemplate.variables || {}, null, 2));
      setIsDirty(false);
    } else if (isNew) {
      const codeKey = searchParams.get('codeKey');
      const paramName = searchParams.get('name');
      const paramCat = searchParams.get('category');
      if (codeKey) {
        // If this template is already managed in the database, redirect directly to edit it!
        const matchedDb = inventory?.localTemplates?.find((t) => t.template_key === codeKey);
        if (matchedDb) {
          navigate(`/admin/email-templates/${matchedDb.id}/edit`, { replace: true });
          return;
        }

        const defaults = CODE_TEMPLATE_DEFAULTS[codeKey];
        if (defaults) {
          setName(defaults.name);
          setTemplateKey(`${codeKey}_CUSTOM`);
          setCategory(defaults.category);
          setSubject(defaults.subject);
          setPreheader(defaults.preheader);
          setHtmlContent(defaults.html);
          setVariablesJson(JSON.stringify(defaults.variables, null, 2));
        } else {
          setTemplateKey(`${codeKey}_CUSTOM`);
          setName(paramName || codeKey.replace(/_/g, ' '));
          if (paramCat) setCategory(paramCat);
          setSubject(`TrustHyre Notification`);
        }
        setIsDirty(false);
      }
    }
  }, [existingTemplate, isNew, searchParams, inventory, navigate]);

  // Save Draft Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedKey = templateKey.trim().toUpperCase();
      if (isNew && !/^[A-Z0-9_]{3,100}$/.test(trimmedKey)) {
        throw new Error('Template key must be 3-100 characters containing only uppercase letters, numbers, and underscores.');
      }
      if (!name.trim()) {
        throw new Error('Template name is required.');
      }
      if (!subject.trim()) {
        throw new Error('Subject line is required.');
      }
      if (!htmlContent.trim()) {
        throw new Error('HTML content is required.');
      }

      let parsedVariables = {};
      try {
        parsedVariables = JSON.parse(variablesJson);
      } catch {
        throw new Error('Variables must be valid JSON');
      }

      if (isNew) {
        return adminEmailTemplateService.createTemplate({
          template_key: trimmedKey,
          name: name.trim(),
          category,
          subject: subject.trim(),
          preheader: preheader.trim(),
          html_content: htmlContent,
          text_content: textContent,
          variables: parsedVariables,
        });
      } else {
        return adminEmailTemplateService.updateDraft(id!, {
          name: name.trim(),
          category,
          subject: subject.trim(),
          preheader: preheader.trim(),
          html_content: htmlContent,
          text_content: textContent,
          variables: parsedVariables,
        });
      }
    },
    onSuccess: (saved) => {
      setIsDirty(false);
      toast.success('Template draft saved successfully');
      queryClient.invalidateQueries({ queryKey: ['adminEmailTemplates'] });
      if (isNew) {
        navigate(`/admin/email-templates/${saved.id}/edit`, { replace: true });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save draft');
    },
  });

  // Test Send Mutation
  const testSendMutation = useMutation({
    mutationFn: (email: string) => {
      let parsedVariables: Record<string, any> = {};
      try {
        parsedVariables = JSON.parse(variablesJson);
      } catch {
        // fallback
      }
      return adminEmailTemplateService.sendTestEmail(id || 'new', email, {
        html_content: htmlContent,
        subject,
        params: parsedVariables,
      });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || `Test email dispatched to ${testEmailRecipient}`);
      setIsTestModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Test Send Failed: ${err.message}`);
    },
  });

  // Publish Mutation (Super Admin Only)
  const publishMutation = useMutation({
    mutationFn: (summary: string) => adminEmailTemplateService.publishTemplate(id!, summary),
    onSuccess: (data) => {
      toast.success(`Published version #${data.version.version_number} and synchronized with Brevo`);
      setIsPublishModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminEmailTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['emailTemplate', id] });
    },
    onError: (err: any) => {
      toast.error(`Publish Failed: ${err.message}`);
    },
  });

  if ((!isNew && isLoading) || (isNew && searchParams.get('codeKey') && isLoadingInventory)) {
    return <AppLoader variant="page" message="Loading template workspace..." />;
  }

  // Parse sample parameters for live preview substitution
  let sampleParams: Record<string, any> = {};
  try {
    sampleParams = JSON.parse(variablesJson);
  } catch {}

  let previewHtml = htmlContent;
  Object.keys(sampleParams).forEach((k) => {
    if (!k) return;
    const escapedKey = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(`{{\\s*params\\.${escapedKey}\\s*}}`, 'g');
    const safeVal = sampleParams[k] !== undefined && sampleParams[k] !== null ? String(sampleParams[k]) : '';
    previewHtml = previewHtml.replace(reg, () => safeVal);
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/email-templates"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isNew ? 'Create Email Template' : `Edit: ${name || 'Template'}`}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono">{templateKey || 'KEY_REQUIRED'}</span>
              <span>•</span>
              <span className="uppercase">{category}</span>
              {existingTemplate?.status && (
                <>
                  <span>•</span>
                  <span className={`font-semibold ${existingTemplate.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {existingTemplate.status}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 transition cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          {!isNew && (
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Send Test
            </button>
          )}

          {!isNew && !isSuperAdmin && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Draft Mode (Super Admin approval required to publish to Brevo)</span>
            </div>
          )}

          {!isNew && isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0f2f63] hover:bg-[#1a4487] text-white transition cursor-pointer shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Publish to Brevo
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Form Settings & Code Editor (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Early Access Welcome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                >
                  <option value="GENERAL_TRANSACTIONAL">General Transactional</option>
                  <option value="ONBOARDING">Onboarding</option>
                  <option value="NOTIFICATION">Notification</option>
                  <option value="INVITATION">Invitation</option>
                  <option value="DAILY_DIGEST">Daily Digest</option>
                  <option value="AUTHENTICATION">Authentication (Protected)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Template Key (Uppercase Unique Identifier) *
                </label>
                <span className="text-[11px] text-slate-400">Used by backend mailers for dynamic lookup</span>
              </div>
              <input
                type="text"
                placeholder="e.g. WELCOME_EARLY_ACCESS"
                value={templateKey}
                disabled={!isNew}
                onChange={(e) => setTemplateKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white disabled:opacity-60"
              />
              {duplicateKeyTemplate && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>A template with key <strong>"{templateKey}"</strong> already exists in the registry.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/email-templates/${duplicateKeyTemplate.id}/edit`)}
                    className="px-2.5 py-1 rounded font-semibold bg-amber-600 hover:bg-amber-700 text-white text-[11px] transition shrink-0 ml-2 cursor-pointer shadow-xs"
                  >
                    Open Existing Template
                  </button>
                </div>
              )}
            </div>

            {/* Subject and Preheader Group */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Subject Line * (Supports {`{{params.var}}`})
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Welcome to TrustHyre, {{params.firstName}}!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    Preheader / Preview Text
                  </label>
                  <input
                    type="text"
                    placeholder="Brief teaser text shown next to subject in inboxes..."
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Realistic Inbox Teaser Simulation */}
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-2 text-xs overflow-hidden">
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                  Inbox Preview
                </span>
                <span className="font-semibold text-slate-800 dark:text-zinc-200 shrink-0">TrustHyre</span>
                <span className="text-slate-400 shrink-0">•</span>
                <span className="font-medium text-slate-700 dark:text-zinc-300 truncate max-w-[260px]">
                  {subject || 'Subject line...'}
                </span>
                <span className="text-slate-400 shrink-0">—</span>
                <span className="text-slate-500 dark:text-zinc-400 truncate">
                  {preheader || 'Preheader teaser snippet...'}
                </span>
              </div>
            </div>
          </div>

          {/* HTML Source Code Editor */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                HTML Source Code (Email-Safe Table Markup)
              </label>
              <span className="text-[11px] text-slate-400">
                Placeholders: <code className="text-[#0f2f63] dark:text-blue-400">{`{{params.variableName}}`}</code>
              </span>
            </div>

            {/* Quick Brand Assets & Snippets */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Image className="w-3 h-3 text-[#0f2f63] dark:text-blue-400" />
                  Brand Snippets:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHtmlContent((prev) => {
                      if (prev.includes('<!-- Brand Header')) {
                        toast.info('Template already has a Brand Header block.');
                        return prev;
                      }
                      // Insert right before <!-- Body --> or append
                      if (prev.includes('<!-- Body -->')) {
                        return prev.replace('<!-- Body -->', `${TRUSTHYRE_BRAND_HEADER_SNIPPET}\n          <!-- Body -->`);
                      }
                      return `${TRUSTHYRE_BRAND_HEADER_SNIPPET}\n${prev}`;
                    });
                    toast.success('Inserted TrustHyre Brand Header with Logo!');
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#0f2f63] hover:bg-[#153e85] text-white transition cursor-pointer shadow-xs flex items-center gap-1"
                >
                  + TrustHyre Brand Header (Logo)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(TRUSTHYRE_LOGO_SNIPPET);
                    setHtmlContent((prev) => `${prev}\n${TRUSTHYRE_LOGO_SNIPPET}`);
                    toast.success('Inserted <img> Logo tag into template!');
                  }}
                  className="px-2 py-1 rounded text-[11px] font-mono bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition cursor-pointer"
                >
                  + Logo Image Tag
                </button>
              </div>

              {/* Copy Logo URL direct helper */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 hidden sm:inline">Hosted Logo:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(TRUSTHYRE_LOGO_URL);
                    toast.success('Copied https://trusthyre.com/logo.png to clipboard');
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-2.5 h-2.5" />
                  Copy Logo URL
                </button>
              </div>
            </div>

            {/* Quick Variable Insertion Bar */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 pb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Insert Variable:</span>
              {[
                'logoUrl',
                'firstName',
                'jobTitle',
                'companyName',
                'actionUrl',
                'otp',
                'recipientEmail',
              ].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    const tag = `{{params.${v}}}`;
                    setHtmlContent((prev) => `${prev}\n${tag}`);
                    toast.info(`Appended ${tag} to template`);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  +{`{{params.${v}}}`}
                </button>
              ))}
            </div>

            <textarea
              rows={22}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-900 text-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 leading-relaxed selection:bg-blue-600 selection:text-white"
            />
          </div>

          {/* Dynamic Variables JSON Schema */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Sample Preview Parameters (JSON)
                </label>
                <p className="text-[11px] text-slate-400">Merged into live preview iframe</p>
              </div>
              <button
                type="button"
                onClick={handleAutoDetectVariables}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition cursor-pointer shadow-xs"
                title="Automatically scan HTML for {{params.varName}} and add missing keys to JSON"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Scan HTML Placeholders
              </button>
            </div>
            <textarea
              rows={5}
              value={variablesJson}
              onChange={(e) => {
                setVariablesJson(e.target.value);
                setIsDirty(true);
              }}
              className="w-full p-2.5 font-mono text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Right Column: Sandboxed Live Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between shadow-xs">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Live Sandboxed Preview
            </span>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  previewMode === 'desktop'
                    ? 'bg-white dark:bg-zinc-700 text-[#0f2f63] dark:text-white shadow-xs'
                    : 'text-slate-400'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  previewMode === 'mobile'
                    ? 'bg-white dark:bg-zinc-700 text-[#0f2f63] dark:text-white shadow-xs'
                    : 'text-slate-400'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div className="bg-slate-200 dark:bg-zinc-950 p-4 rounded-xl border border-slate-300 dark:border-zinc-800 flex justify-center min-h-[580px] overflow-auto">
            <div
              className="transition-all duration-300 bg-white rounded-lg shadow-lg overflow-hidden"
              style={{ width: previewMode === 'mobile' ? '375px' : '100%', height: '720px' }}
            >
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                sandbox="allow-popups"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test Email Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              Send Live Test Email
            </h3>
            
            {/* Rate Limiting Notice */}
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Rate Limiter Active:</strong> Maximum 10 test emails per 5 minutes per administrator.
                <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                  Merges your current editor changes with sample parameters and dispatches live through Brevo transactional delivery.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Recipient Email Address *
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => testSendMutation.mutate(testEmailRecipient)}
                disabled={testSendMutation.isPending || !testEmailRecipient.includes('@')}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0f2f63] hover:bg-[#1a4487] text-white disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
              >
                {testSendMutation.isPending ? 'Sending...' : 'Dispatch Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Publish Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              Publish Template to Production Brevo
            </h3>
            <p className="text-xs text-slate-500">
              This action will synchronize the HTML template with Brevo's production delivery servers, activate the template, and create an immutable version snapshot.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Version Change Summary
              </label>
              <input
                type="text"
                placeholder="e.g. Updated brand button colors and typography"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => publishMutation.mutate(changeSummary)}
                disabled={publishMutation.isPending}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {publishMutation.isPending ? 'Publishing...' : 'Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
