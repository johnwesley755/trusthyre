import { prisma } from '../config/prisma';
import { sanitizeHtmlDescription } from '../utils/textSanitizer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface IngestRequirementInput {
  title: string;
  category?: string;
  description?: string;
  city?: string;
  location?: string;
  workersNeeded?: number;
  salaryRange?: string;
  sourceName: string;
  sourceUrl: string;
  externalListingId?: string;
}

export interface IngestLeadInput {
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  industry?: string;
  city?: string;
  state?: string;
  address?: string;
  officialEmail?: string;
  officialPhone?: string;
  contactPageUrl?: string;
  requirements: IngestRequirementInput[];
}

export interface IngestLeadResult {
  lead: any;
  requirements: any[];
  isNewLead: boolean;
  duplicatesMergedCount: number;
  newRequirementsCount: number;
}

export class LeadService {
  /**
   * Normalizes company name by stripping common corporate suffixes and punctuation.
   */
  static normalizeCompanyName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\b(private limited|pvt ltd|pvt\. ltd\.|ltd|limited|llc|inc|corp|corporation|group|enterprises|co\.)\b/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Safely formats and normalizes URLs to ensure they are valid and clickable.
   */
  static normalizeUrl(urlOrDomain?: string | null): string | null {
    if (!urlOrDomain) return null;
    const trimmed = urlOrDomain.trim();
    if (!trimmed || trimmed === '#' || trimmed === 'null' || trimmed === 'undefined') return null;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  static readonly AGGREGATOR_DOMAINS = new Set([
    'apna.co',
    'workindia.in',
    'naukri.com',
    'indeed.com',
    'linkedin.com',
    'foundit.in',
    'shine.com',
    'quikr.com',
    'olx.in',
    'glassdoor.com',
    'ambitionbox.com',
    'talent.com',
    'simplyhired.co.in',
  ]);

  /**
   * Extracts root apex domain from any URL or domain string.
   * Excludes generic job portal domains so distinct employers aren't falsely merged.
   */
  static extractApexDomain(urlOrDomain?: string | null): string | null {
    if (!urlOrDomain) return null;
    try {
      const sanitized = this.normalizeUrl(urlOrDomain) || urlOrDomain;
      const hostname = new URL(sanitized).hostname.toLowerCase().replace(/^www\./, '');
      const parts = hostname.split('.');
      
      let apex = hostname;
      // Handle known multi-part TLDs (e.g. .co.in, .org.in, .net.in, .ac.in, .gov.in, .co.uk)
      if (parts.length >= 3 && (parts[parts.length - 2] === 'co' || parts[parts.length - 2] === 'org' || parts[parts.length - 2] === 'net' || parts[parts.length - 2] === 'ac' || parts[parts.length - 2] === 'gov')) {
        apex = parts.slice(-3).join('.');
      } else if (parts.length >= 2) {
        apex = parts.slice(-2).join('.');
      }

      if (this.AGGREGATOR_DOMAINS.has(apex)) {
        return null;
      }
      return apex;
    } catch {
      const cleaned = urlOrDomain.toLowerCase().trim();
      if (this.AGGREGATOR_DOMAINS.has(cleaned)) return null;
      return cleaned;
    }
  }

  /**
   * Computes contactability score based on availability of verified business channels.
   */
  static calculateContactability(lead: {
    officialEmail?: string | null;
    officialPhone?: string | null;
    contactPageUrl?: string | null;
    companyWebsite?: string | null;
  }): 'COMPLETE' | 'PARTIAL' | 'UNCONTACTABLE' {
    const hasDirectContact = Boolean(lead.officialEmail || lead.officialPhone);
    const hasWebPresence = Boolean(lead.companyWebsite || lead.contactPageUrl);

    if (hasDirectContact && hasWebPresence) {
      return 'COMPLETE';
    }
    if (hasDirectContact || hasWebPresence) {
      return 'PARTIAL';
    }
    return 'UNCONTACTABLE';
  }

  /**
   * Generates deterministic hash signature for requirement deduplication.
   * Prioritizes external listing ID or normalized canonical URL; fallbacks to leadId + normalizedTitle + city.
   * Volatile fields (like changing salary) do NOT invalidate requirement identity.
   */
  static generateRequirementHash(
    leadId: string,
    title: string,
    sourceUrl?: string | null,
    externalListingId?: string | null,
    city?: string | null
  ): string {
    if (externalListingId && externalListingId.trim()) {
      return crypto.createHash('sha256').update(`EXT:${leadId}:${externalListingId.trim()}`).digest('hex');
    }
    const normUrl = this.normalizeUrl(sourceUrl || '');
    if (normUrl) {
      try {
        const parsed = new URL(normUrl);
        const host = parsed.hostname.toLowerCase();
        if (host !== 'example.com' && !host.endsWith('.example.com')) {
          const canonical = `${parsed.origin}${parsed.pathname}`.toLowerCase();
          return crypto.createHash('sha256').update(`URL:${leadId}:${canonical}`).digest('hex');
        }
      } catch {
        return crypto.createHash('sha256').update(`URL:${leadId}:${normUrl.toLowerCase()}`).digest('hex');
      }
    }
    const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normCity = (city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const payload = `${leadId}:${normTitle}:${normCity}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Ingests a discovered lead with deduplication and entity resolution.
   */
  static async ingestLead(input: IngestLeadInput): Promise<IngestLeadResult> {
    const normalizedName = this.normalizeCompanyName(input.companyName);
    const normalizedWebsite = this.normalizeUrl(input.companyWebsite);
    const normalizedContactPage = this.normalizeUrl(input.contactPageUrl);
    const domain = this.extractApexDomain(normalizedWebsite || input.companyWebsite);
    const contactability = this.calculateContactability({
      ...input,
      companyWebsite: normalizedWebsite,
      contactPageUrl: normalizedContactPage,
    });

    // 1. Check for existing employer lead by domain first; fallback to normalized name + city
    let lead = null;
    let isNewLead = false;

    if (domain) {
      lead = await prisma.employer_leads.findFirst({
        where: { company_domain: domain }
      });
    }
    if (!lead && normalizedName && input.city) {
      lead = await prisma.employer_leads.findFirst({
        where: {
          normalized_name: normalizedName,
          city: { equals: input.city, mode: 'insensitive' }
        }
      });
    }

    if (lead) {
      isNewLead = false;
      // Update existing lead with newly discovered info or refreshed valid URLs
      lead = await prisma.employer_leads.update({
        where: { id: lead.id },
        data: {
          company_name: input.companyName || lead.company_name,
          official_email: input.officialEmail || lead.official_email,
          official_phone: input.officialPhone || lead.official_phone,
          company_website: normalizedWebsite || lead.company_website,
          contact_page_url: normalizedContactPage || lead.contact_page_url,
          company_domain: domain || lead.company_domain,
          industry: input.industry || lead.industry,
          city: input.city || lead.city,
          address: input.address || lead.address,
          contactability_score: this.calculateContactability({
            officialEmail: input.officialEmail || lead.official_email,
            officialPhone: input.officialPhone || lead.official_phone,
            companyWebsite: normalizedWebsite || lead.company_website,
            contactPageUrl: normalizedContactPage || lead.contact_page_url,
          }),
          updated_at: new Date()
        }
      });
    } else {
      isNewLead = true;
      // Create fresh employer lead without fabricating missing information
      lead = await prisma.employer_leads.create({
        data: {
          company_name: input.companyName,
          normalized_name: normalizedName,
          company_domain: domain,
          company_website: normalizedWebsite,
          industry: input.industry || null,
          city: input.city || null,
          state: input.state || null,
          address: input.address || null,
          official_email: input.officialEmail || null,
          official_phone: input.officialPhone || null,
          contact_page_url: normalizedContactPage || null,
          contactability_score: contactability,
          status: 'DISCOVERED',
        }
      });
    }

    // 2. Process Requirements
    const results = [];
    let duplicatesMergedCount = 0;
    let newRequirementsCount = 0;

    for (const req of input.requirements) {
      const normalizedSourceUrl = this.normalizeUrl(req.sourceUrl) || normalizedWebsite;
      // Never fabricate a source URL with trusthyre.com for external listings!
      if (!normalizedSourceUrl) {
        continue;
      }

      const normTitle = req.title.toLowerCase().trim();
      const hash = this.generateRequirementHash(
        lead.id,
        req.title,
        normalizedSourceUrl,
        req.externalListingId,
        req.city || input.city
      );

      const existingReq = await prisma.employer_lead_requirements.findFirst({
        where: {
          lead_id: lead.id,
          source_hash: hash
        }
      });

      if (existingReq) {
        duplicatesMergedCount++;
        // Update freshness and valid source URL without deleting historical records
        const updated = await prisma.employer_lead_requirements.update({
          where: { id: existingReq.id },
          data: {
            title: req.title || existingReq.title,
            description: sanitizeHtmlDescription(req.description) || existingReq.description,
            workers_needed: req.workersNeeded !== undefined ? req.workersNeeded : existingReq.workers_needed,
            salary_range: req.salaryRange || existingReq.salary_range,
            source_url: normalizedSourceUrl,
            source_name: req.sourceName || existingReq.source_name,
            last_seen_at: new Date(),
          }
        });
        results.push(updated);
      } else {
        newRequirementsCount++;
        const created = await prisma.employer_lead_requirements.create({
          data: {
            lead_id: lead.id,
            title: req.title,
            normalized_title: normTitle,
            category: req.category || input.industry || null,
            description: sanitizeHtmlDescription(req.description) || null,
            city: req.city || input.city || null,
            location: req.location || input.address || null,
            workers_needed: req.workersNeeded !== undefined ? req.workersNeeded : null,
            salary_range: req.salaryRange || null,
            source_name: req.sourceName,
            source_url: normalizedSourceUrl,
            source_hash: hash,
            status: 'OPEN'
          }
        });
        results.push(created);
      }
    }

    return {
      lead,
      requirements: results,
      isNewLead,
      duplicatesMergedCount,
      newRequirementsCount,
    };
  }

  /**
   * Retrieves leads with rich filtering, search, sorting, and pagination.
   */
  static async getLeads(filters: {
    status?: string;
    contactability?: string;
    city?: string;
    category?: string;
    sortBy?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters.contactability && filters.contactability !== 'ALL') {
      where.contactability_score = filters.contactability;
    }
    if (filters.city && filters.city !== 'ALL') {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.category && filters.category !== 'ALL') {
      where.OR = [
        { industry: { contains: filters.category, mode: 'insensitive' } },
        { requirements: { some: { category: { contains: filters.category, mode: 'insensitive' } } } }
      ];
    }
    if (filters.q) {
      where.OR = [
        { company_name: { contains: filters.q, mode: 'insensitive' } },
        { company_domain: { contains: filters.q, mode: 'insensitive' } },
        { official_email: { contains: filters.q, mode: 'insensitive' } },
        { official_phone: { contains: filters.q, mode: 'insensitive' } },
        { city: { contains: filters.q, mode: 'insensitive' } },
        { requirements: { some: { title: { contains: filters.q, mode: 'insensitive' } } } }
      ];
    }

    let orderBy: any = { created_at: 'desc' };
    if (filters.sortBy === 'OLDEST') {
      orderBy = { created_at: 'asc' };
    } else if (filters.sortBy === 'NAME_ASC') {
      orderBy = { company_name: 'asc' };
    } else if (filters.sortBy === 'NAME_DESC') {
      orderBy = { company_name: 'desc' };
    }

    const [total, leads] = await Promise.all([
      prisma.employer_leads.count({ where }),
      prisma.employer_leads.findMany({
        where,
        include: {
          requirements: {
            orderBy: { discovered_at: 'desc' }
          },
          outreach_logs: {
            orderBy: { contacted_at: 'desc' }
          }
        },
        orderBy,
        take: limit,
        skip: skip
      })
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      total,
      page,
      limit,
      totalPages,
      leads
    };
  }

  /**
   * Retrieves aggregated KPI analytics for employer lead discovery.
   */
  static async getLeadStats() {
    const [totalLeads, completeLeads, verifiedLeads, contactedLeads, convertedLeads, totalRequirements] =
      await Promise.all([
        prisma.employer_leads.count(),
        prisma.employer_leads.count({ where: { contactability_score: 'COMPLETE' } }),
        prisma.employer_leads.count({ where: { status: 'VERIFIED' } }),
        prisma.employer_leads.count({ where: { status: { in: ['CONTACTED', 'RESPONDED', 'INTERESTED'] } } }),
        prisma.employer_leads.count({ where: { status: 'ONBOARDED' } }),
        prisma.employer_lead_requirements.count()
      ]);

    return {
      totalLeads,
      completeLeads,
      verifiedLeads,
      contactedLeads,
      convertedLeads,
      totalRequirements
    };
  }

  /**
   * Updates status of an employer lead.
   */
  static async updateLeadStatus(id: string, status: string) {
    return prisma.employer_leads.update({
      where: { id },
      data: {
        status,
        updated_at: new Date()
      }
    });
  }

  /**
   * Logs a BD outreach action against a lead.
   */
  static async logOutreach(leadId: string, adminId: string, data: {
    channel: string;
    contactTarget?: string;
    notes: string;
    outcome?: string;
  }) {
    const log = await prisma.lead_outreach_logs.create({
      data: {
        lead_id: leadId,
        admin_id: adminId,
        channel: data.channel,
        contact_target: data.contactTarget,
        notes: data.notes,
        outcome: data.outcome
      }
    });

    // Update lead status to CONTACTED or RESPONDED if appropriate
    let newStatus = 'CONTACTED';
    if (data.outcome === 'INTERESTED') newStatus = 'INTERESTED';
    if (data.outcome === 'NOT_INTERESTED') newStatus = 'NOT_INTERESTED';

    await prisma.employer_leads.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        updated_at: new Date()
      }
    });

    return log;
  }

  /**
   * Converts a verified lead into a live TrustHire Employer profile.
   */
  static async convertLeadToEmployer(leadId: string) {
    const lead = await prisma.employer_leads.findUnique({
      where: { id: leadId },
      include: { requirements: true }
    });

    if (!lead) {
      throw new Error('Employer lead not found');
    }

    if (lead.trusthire_employer_id) {
      throw new Error('This lead has already been converted to a TrustHire employer');
    }

    const email = lead.official_email || `employer_${lead.normalized_name.replace(/\s+/g, '_')}@trusthyre.lead`;
    
    // Check if user already exists with this email
    let user = await prisma.user_metadata.findUnique({ where: { email } });

    if (!user) {
      const generatedSecret = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(generatedSecret, 10);

      user = await prisma.user_metadata.create({
        data: {
          id: uuidv4(),
          email,
          password_hash: passwordHash,
          first_name: lead.company_name.split(' ')[0] || 'Employer',
          last_name: lead.company_name.split(' ').slice(1).join(' ') || 'Admin',
          role: 'EMPLOYER',
          email_verified: false,
          onboarded: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    // Create or Link employer_profiles
    let employerProfile = await prisma.employer_profiles.findUnique({
      where: { user_id: user.id }
    });

    if (!employerProfile) {
      employerProfile = await prisma.employer_profiles.create({
        data: {
          user_id: user.id,
          company_name: lead.company_name,
          industry: lead.industry || 'General Trade',
          company_website: lead.company_website,
          city: lead.city,
          address: lead.address,
          is_verified: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    // Update lead record to ONBOARDED
    await prisma.employer_leads.update({
      where: { id: leadId },
      data: {
        status: 'ONBOARDED',
        trusthire_employer_id: employerProfile.id,
        updated_at: new Date()
      }
    });

    // Copy active requirements into live jobs table & sync to search index
    const publishedJobs = [];
    if (lead.requirements && Array.isArray(lead.requirements)) {
      for (const req of lead.requirements) {
        if (req.status === 'OPEN') {
          // Parse budget from salary_range prioritizing upper earning limit if range exists
          let budget = null;
          if (req.salary_range) {
            const matches = req.salary_range.replace(/,/g, '').match(/\d+/g);
            if (matches && matches.length > 0) {
              const nums = matches.map(n => parseFloat(n)).filter(n => !isNaN(n) && n > 0);
              budget = nums.length > 1 ? Math.max(...nums) : nums[0];
            }
          }

          let reqDetails = null;
          if (req.normalized_title && req.normalized_title.startsWith('{')) {
            try {
              reqDetails = JSON.parse(req.normalized_title);
            } catch (e) {}
          }
          const job = await prisma.jobs.create({
            data: {
              employer_id: user.id,
              employer_name: lead.company_name,
              title: req.title,
              description: req.description || `Active hiring opening for ${req.title} at ${lead.company_name}.`,
              industry: req.category || lead.industry || 'General Trade',
              city: req.city || lead.city,
              location: req.location || req.city || lead.city,
              budget: budget ? budget : null,
              experience_years_required: 1,
              alternate_sources: reqDetails ? { additional_details: reqDetails } : undefined,
              status: 'OPEN',
              is_external: false,
              source_name: req.source_name,
              source_url: req.source_url,
              source_hash: req.source_hash,
              date_posted: new Date(),
              last_verified_at: new Date(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 day validity
            }
          });

          await prisma.job_search_index.upsert({
            where: { job_id: job.id },
            update: {
              title: job.title,
              description: job.description,
              category: job.industry,
              city: job.city,
              location: job.location,
              status: 'OPEN',
              budget: budget ? budget : undefined,
              employer_name: job.employer_name,
              last_updated_at: new Date(),
            },
            create: {
              job_id: job.id,
              title: job.title,
              description: job.description,
              category: job.industry,
              city: job.city,
              location: job.location,
              status: 'OPEN',
              budget: budget ? budget : undefined,
              employer_name: job.employer_name,
            }
          });

          await prisma.employer_lead_requirements.update({
            where: { id: req.id },
            data: { status: 'FILLED' }
          });

          publishedJobs.push(job.id);
        }
      }
    }

    return {
      message: 'Employer converted successfully',
      employerId: employerProfile.id,
      userId: user.id,
      email: user.email,
      publishedJobsCount: publishedJobs.length
    };
  }

  /**
   * Synchronously ingests an array of discovered jobs directly into employer_leads & employer_lead_requirements.
   * Runs in parallel using Promise.allSettled and returns exact counts for live UI reactivity.
   */
  static async ingestJobsAsLeads(jobs: any[]): Promise<{
    syncedCount: number;
    newLeadsCount: number;
    updatedLeadsCount: number;
    newRequirementsCount: number;
    failedCount: number;
  }> {
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return { syncedCount: 0, newLeadsCount: 0, updatedLeadsCount: 0, newRequirementsCount: 0, failedCount: 0 };
    }

    const results = await Promise.allSettled(
      jobs.map(async (job) => {
        const empName = (job.employer_name || '').trim();
        if (!empName) return null;

        const salaryStr = job.budget ? `₹${job.budget}` : undefined;
        const isAggregator = !this.extractApexDomain(job.source_url);
        const companyWebsite = isAggregator ? undefined : (job.source_url || undefined);

        return await this.ingestLead({
          companyName: empName,
          companyWebsite: companyWebsite,
          industry: job.industry || undefined,
          city: job.city || undefined,
          requirements: [
            {
              title: (job.title || '').trim(),
              category: job.industry || 'Logistics & Operations',
              description: job.description || undefined,
              city: job.city || undefined,
              location: job.location || undefined,
              salaryRange: salaryStr,
              sourceName: job.source_name || 'Web Discovery',
              sourceUrl: job.source_url || '',
              externalListingId: job.external_id || job.id,
            }
          ]
        });
      })
    );

    let newLeadsCount = 0;
    let updatedLeadsCount = 0;
    let newRequirementsCount = 0;
    let failedCount = 0;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const val = r.value;
        if (val) {
          if (val.isNewLead) newLeadsCount++;
          else updatedLeadsCount++;
          newRequirementsCount += val.newRequirementsCount || 0;
        }
      } else {
        failedCount++;
        console.error('[LeadService] Lead ingestion failure:', r.reason?.message || r.reason);
      }
    }

    return {
      syncedCount: jobs.length - failedCount,
      newLeadsCount,
      updatedLeadsCount,
      newRequirementsCount,
      failedCount,
    };
  }

  /**
   * Synchronizes external jobs discovered by the Python microservice into employer_leads and employer_lead_requirements.
   */
  static async syncLeadsFromScrapedJobs(limit: number = 200): Promise<{
    syncedCount: number;
    newLeadsCount: number;
    updatedLeadsCount: number;
  }> {
    const externalJobs = await prisma.jobs.findMany({
      where: {
        is_external: true,
        employer_name: { not: null }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });

    let newLeadsCount = 0;
    let updatedLeadsCount = 0;

    for (const job of externalJobs) {
      if (!job.employer_name || !job.employer_name.trim()) continue;

      const salaryStr = job.budget ? `₹${job.budget}` : undefined;
      const isAggregator = !this.extractApexDomain(job.source_url);
      const companyWebsite = isAggregator ? undefined : (job.source_url || undefined);
      const res = await this.ingestLead({
        companyName: job.employer_name.trim(),
        companyWebsite: companyWebsite,
        industry: job.industry || undefined,
        city: job.city || undefined,
        requirements: [
          {
            title: job.title.trim(),
            category: job.industry || 'Logistics & Operations',
            description: job.description || undefined,
            city: job.city || undefined,
            salaryRange: salaryStr,
            sourceName: job.source_name || 'Web Discovery',
            sourceUrl: job.source_url || '',
            externalListingId: job.external_id || job.id
          }
        ]
      });

      if (res.isNewLead) {
        newLeadsCount++;
      } else {
        updatedLeadsCount++;
      }
    }

    return {
      syncedCount: externalJobs.length,
      newLeadsCount,
      updatedLeadsCount
    };
  }
}
