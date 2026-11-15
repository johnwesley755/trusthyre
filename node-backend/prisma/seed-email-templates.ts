import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getOtpTemplate, getResetPasswordTemplate } from '../src/utils/emailTemplates';
import {
  renderAdminInvitationEmail,
  renderCandidateMatchEmail,
  renderJobMatchEmail,
  renderNotificationEmail,
  renderEmailShell
} from '../src/services/emailTemplateService';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const SYSTEM_TEMPLATES = [
  {
    template_key: 'AUTH_EMAIL_OTP',
    name: 'Email OTP Verification',
    category: 'AUTHENTICATION',
    description: 'Sends 6-digit cryptographic authentication code for login and candidate verification.',
    subject: '{{params.otp}} is your TrustHyre verification code',
    preheader: '{{params.otp}} is your TrustHyre verification code. Valid for 15 minutes.',
    variables: {
      otp: '481920',
      email: 'candidate@example.com'
    },
    html_content: getOtpTemplate('{{params.otp}}', '{{params.email}}'),
    text_content: 'Your TrustHyre verification code is {{params.otp}}. Valid for 15 minutes. Single use only.',
  },
  {
    template_key: 'AUTH_PASSWORD_RESET',
    name: 'Password Recovery Notification',
    category: 'AUTHENTICATION',
    description: 'Sends secure, single-use, time-bounded password reset link and authorization code.',
    subject: '{{params.token}} is your TrustHyre password reset code',
    preheader: '{{params.token}} is your TrustHyre password reset code. Valid for 15 minutes.',
    variables: {
      token: '639201',
      email: 'user@example.com',
      resetUrl: 'https://trusthyre.com/reset-password?token=639201'
    },
    html_content: getResetPasswordTemplate('{{params.token}}', '{{params.email}}'),
    text_content: 'We received a request to reset your password. Use code {{params.token}} or open: {{params.resetUrl}}',
  },
  {
    template_key: 'ADMIN_INVITATION',
    name: 'Admin Invitation & Provisioning',
    category: 'INVITATION',
    description: 'Invites administrative personnel to manage the TrustHyre console with secure role onboarding.',
    subject: '🛡️ Invitation to join TrustHyre as an Administrator',
    preheader: 'You have been invited by {{params.invitedBy}} to join the TrustHyre Administrative Portal.',
    variables: {
      invitedBy: 'Super Admin',
      email: 'new.admin@trusthyre.com',
      inviteLink: 'https://trusthyre.com/admin/accept-invite?token=sample_token',
      expiresInHours: 48
    },
    html_content: renderAdminInvitationEmail({
      recipientName: 'Administrator',
      email: '{{params.email}}',
      inviteLink: '{{params.inviteLink}}',
      invitedBy: '{{params.invitedBy}}',
      expiresInHours: 48
    }).html,
    text_content: 'TrustHyre Administrator Invitation. Open {{params.inviteLink}} to configure your password and activate your account.',
  },
  {
    template_key: 'CANDIDATE_MATCH_NOTIFICATION',
    name: 'Employer Candidate Match Alert',
    category: 'NOTIFICATION',
    description: 'Alerts business employers when verified skilled talent matches their active search requisitions.',
    subject: '🎯 Candidate Match: {{params.candidateName}} ({{params.roleOrTrade}})',
    preheader: 'A verified candidate matching your requirements in {{params.location}} is ready for hire.',
    variables: {
      recipientName: 'Acme Infrastructure',
      candidateName: 'Ramesh Kumar',
      roleOrTrade: 'Master Electrician',
      location: 'Chennai Metro Hub',
      experienceYears: '6',
      targetLink: 'https://trusthyre.com/find-workers',
      skills: ['Industrial Wiring', 'LT Switchgear', 'Safety Certified']
    },
    html_content: renderCandidateMatchEmail({
      recipientName: '{{params.recipientName}}',
      candidateName: '{{params.candidateName}}',
      roleOrTrade: '{{params.roleOrTrade}}',
      location: '{{params.location}}',
      experienceYears: 6,
      targetLink: '{{params.targetLink}}',
      skills: ['Industrial Wiring', 'LT Switchgear', 'Safety Certified']
    }).html,
    text_content: 'Candidate Match: {{params.candidateName}} is ready for hire in {{params.location}}. Review profile: {{params.targetLink}}',
  },
  {
    template_key: 'JOB_MATCH_NOTIFICATION',
    name: 'Candidate Job Match Alert',
    category: 'NOTIFICATION',
    description: 'Notifies verified workers of highly relevant nearby trade vacancies with verified compensation.',
    subject: '💼 New Job Match: {{params.jobTitle}} at {{params.companyName}}',
    preheader: 'A new verified opening matching your criteria in {{params.location}} is open for applications.',
    variables: {
      recipientName: 'Ravi',
      jobTitle: 'High Voltage Wireman',
      companyName: 'L&T Construction',
      location: 'Chennai Metro',
      salary: '₹28,000 / month',
      targetLink: 'https://trusthyre.com/jobs',
      skills: ['Electrical Maintenance', 'Blueprint Reading']
    },
    html_content: renderJobMatchEmail({
      recipientName: '{{params.recipientName}}',
      jobTitle: '{{params.jobTitle}}',
      companyName: '{{params.companyName}}',
      location: '{{params.location}}',
      salary: '{{params.salary}}',
      targetLink: '{{params.targetLink}}',
      skills: ['Electrical Maintenance', 'Blueprint Reading']
    }).html,
    text_content: 'New Job Match: {{params.jobTitle}} at {{params.companyName}}. Apply directly: {{params.targetLink}}',
  },
  {
    template_key: 'SYSTEM_NOTIFICATION',
    name: 'Platform Notification & Status Update',
    category: 'NOTIFICATION',
    description: 'Universal notification for user account changes, verification approvals, and order milestones.',
    subject: '{{params.title}}',
    preheader: '{{params.message}}',
    variables: {
      recipientName: 'Member',
      title: 'Trust Badge Awarded',
      message: 'Your government identity documents have been verified by our compliance team.',
      targetLink: 'https://trusthyre.com/profile',
      buttonText: 'View Verified Profile'
    },
    html_content: renderNotificationEmail({
      recipientName: '{{params.recipientName}}',
      title: '{{params.title}}',
      message: '{{params.message}}',
      targetLink: '{{params.targetLink}}',
      buttonText: '{{params.buttonText}}'
    }).html,
    text_content: 'TrustHyre Notification: {{params.title}} - {{params.message}}. View details: {{params.targetLink}}',
  },
  {
    template_key: 'ONBOARDING_EARLY_ACCESS',
    name: 'Early Access Launch Welcome',
    category: 'ONBOARDING',
    description: 'Welcomes early subscribers and partners to the TrustHyre skilled workforce talent network.',
    subject: 'Welcome to TrustHyre Early Access - Priority Confirmation',
    preheader: 'Your early access request has been confirmed. Priority Access ID: {{params.priorityId}}',
    variables: {
      recipientName: 'Talent Partner',
      priorityId: 'TH-PRIORITY-2026',
      targetLink: 'https://trusthyre.com'
    },
    html_content: renderEmailShell({
      title: 'Welcome to TrustHyre Early Access',
      preheader: 'Your early access request has been confirmed. Priority Access ID: {{params.priorityId}}',
      badgeText: '🚀 EARLY ACCESS CONFIRMED',
      recipientName: '{{params.recipientName}}',
      bodyHtml: `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 1.5px solid #DBEAFE; border-radius: 14px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 3px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 12px 0; color: #0F2F63; font-size: 18px; font-weight: 700;">Welcome to TrustHyre, {{params.recipientName}}!</h2>
              <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
                Thank you for joining our early access talent and employer network. We are building India's most trusted, verified blue-collar and skilled trade hiring ecosystem.
              </p>
              <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #0F2F63; font-weight: 600;">
                Priority Access ID: <strong>{{params.priorityId}}</strong>
              </div>
            </td>
          </tr>
        </table>
      `,
      targetLink: '{{params.targetLink}}',
      buttonText: 'Explore TrustHyre Platform',
      secondaryInfo: 'Direct employer connections • 100% Verified trade profiles • Zero brokerage'
    }),
    text_content: 'Welcome to TrustHyre Early Access! Your Priority ID is {{params.priorityId}}. Explore: https://trusthyre.com',
  }
];

export async function seedTemplates(dbUrl: string, dbName: string) {
  const prismaClient = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const tpl of SYSTEM_TEMPLATES) {
      const existing: any = await (prismaClient as any).email_templates.findUnique({
        where: { template_key: tpl.template_key }
      });

      if (existing) {
        await (prismaClient as any).email_templates.update({
          where: { id: existing.id },
          data: {
            name: tpl.name,
            category: tpl.category,
            description: tpl.description,
            subject: tpl.subject,
            preheader: tpl.preheader,
            html_content: tpl.html_content,
            text_content: tpl.text_content,
            variables: tpl.variables,
            is_system: true,
            status: 'PUBLISHED',
            updated_at: new Date()
          }
        });
        updatedCount++;
      } else {
        const created: any = await (prismaClient as any).email_templates.create({
          data: {
            template_key: tpl.template_key,
            name: tpl.name,
            category: tpl.category,
            description: tpl.description,
            subject: tpl.subject,
            preheader: tpl.preheader,
            html_content: tpl.html_content,
            text_content: tpl.text_content,
            variables: tpl.variables,
            status: 'PUBLISHED',
            source_type: 'APPLICATION',
            is_system: true,
            created_by: 'SYSTEM_MIGRATION',
            published_by: 'SUPER_ADMIN',
            published_at: new Date(),
            versions: {
              create: {
                version_number: 1,
                subject: tpl.subject,
                preheader: tpl.preheader,
                html_content: tpl.html_content,
                text_content: tpl.text_content,
                variables: tpl.variables,
                change_summary: 'Initial baseline migration of production template from codebase',
                created_by: 'SYSTEM_MIGRATION',
                published_at: new Date()
              }
            }
          },
          include: { versions: true }
        });

        if (created.versions && created.versions.length > 0) {
          await (prismaClient as any).email_templates.update({
            where: { id: created.id },
            data: { published_version_id: created.versions[0].id }
          });
        }

        createdCount++;
      }
    }

    console.log(`[seed-email-templates] ${dbName}: ${createdCount} created, ${updatedCount} updated.`);
  } finally {
    await prismaClient.$disconnect();
  }
}

async function run() {
  const localDbUrl = process.env.DATABASE_URL;
  if (localDbUrl) {
    await seedTemplates(localDbUrl, 'Local DB');
  }
}

run().catch((err) => {
  console.error('[seed-email-templates] Execution error:', err);
  process.exit(1);
});
