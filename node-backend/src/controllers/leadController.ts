import { Context } from 'hono';
import { LeadService } from '../services/leadService';
import prisma from '../config/prisma';

export class LeadController {
  static async getLeads(c: Context) {
    try {
      const status = c.req.query('status') || 'ALL';
      const contactability = c.req.query('contactability') || 'ALL';
      const city = c.req.query('city') || 'ALL';
      const category = c.req.query('category') || 'ALL';
      const sortBy = c.req.query('sortBy') || 'NEWEST';
      const q = c.req.query('q') || '';
      const page = parseInt(c.req.query('page') || '1', 10);
      const limit = parseInt(c.req.query('limit') || '10', 10);

      const result = await LeadService.getLeads({
        status,
        contactability,
        city,
        category,
        sortBy,
        q,
        page,
        limit
      });

      return c.json({ success: true, ...result, data: result });
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      return c.json({ success: false, error: error.message || 'Failed to fetch leads' }, 500);
    }
  }

  static async getLeadStats(c: Context) {
    try {
      const stats = await LeadService.getLeadStats();
      return c.json({ success: true, stats, data: stats });
    } catch (error: any) {
      console.error('Error fetching lead stats:', error);
      return c.json({ success: false, error: error.message || 'Failed to fetch lead stats' }, 500);
    }
  }

  static async ingestLead(c: Context) {
    try {
      const body = await c.req.json();
      if (!body.companyName || !body.requirements || !Array.isArray(body.requirements)) {
        return c.json({ success: false, error: 'companyName and requirements array are required' }, 400);
      }

      const result = await LeadService.ingestLead(body);
      return c.json({ success: true, ...result, data: result }, 201);
    } catch (error: any) {
      console.error('Error ingesting lead:', error);
      return c.json({ success: false, error: error.message || 'Failed to ingest lead' }, 500);
    }
  }

  static async batchIngest(c: Context) {
    try {
      const body = await c.req.json();
      const leads = Array.isArray(body) ? body : body.leads;

      if (!leads || !Array.isArray(leads)) {
        return c.json({ success: false, error: 'Array of leads is required' }, 400);
      }

      const processed = [];
      for (const item of leads) {
        if (item.companyName && Array.isArray(item.requirements)) {
          const res = await LeadService.ingestLead(item);
          processed.push(res);
        }
      }

      return c.json({ success: true, count: processed.length, results: processed }, 201);
    } catch (error: any) {
      console.error('Error in batch ingest:', error);
      return c.json({ success: false, error: error.message || 'Failed to process batch ingestion' }, 500);
    }
  }

  static async updateLeadStatus(c: Context) {
    try {
      const id = c.req.param('id');
      if (!id) {
        return c.json({ success: false, error: 'Lead ID is required' }, 400);
      }
      const { status } = await c.req.json();

      if (!status) {
        return c.json({ success: false, error: 'Status is required' }, 400);
      }

      const updated = await LeadService.updateLeadStatus(id, status);
      return c.json({ success: true, lead: updated });
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      return c.json({ success: false, error: error.message || 'Failed to update status' }, 500);
    }
  }

  static async logOutreach(c: Context) {
    try {
      const id = c.req.param('id');
      if (!id) {
        return c.json({ success: false, error: 'Lead ID is required' }, 400);
      }
      const user = c.get('user');
      const adminId = user?.userId || user?.id || 'ADMIN';
      const body = await c.req.json();

      if (!body.channel || !body.notes) {
        return c.json({ success: false, error: 'channel and notes are required' }, 400);
      }

      const log = await LeadService.logOutreach(id, adminId, body);
      return c.json({ success: true, log }, 201);
    } catch (error: any) {
      console.error('Error logging outreach:', error);
      return c.json({ success: false, error: error.message || 'Failed to log outreach' }, 500);
    }
  }

  static async convertLead(c: Context) {
    try {
      const id = c.req.param('id');
      if (!id) {
        return c.json({ success: false, error: 'Lead ID is required' }, 400);
      }
      const result = await LeadService.convertLeadToEmployer(id);
      return c.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error converting lead:', error);
      return c.json({ success: false, error: error.message || 'Failed to convert lead' }, 500);
    }
  }

  static async runAutoDiscovery(c: Context) {
    try {
      const body = await c.req.json().catch(() => ({}));
      const queryParam = body.query || 'Delivery Driver';
      const cityParam = body.city || 'Chennai';
      const limitParam = Number(body.limit) || 25;

      const startTime = Date.now();
      console.log(`[LeadController][Step 1/5 - INITIATE] runAutoDiscovery started: query='${queryParam}', city='${cityParam}', limit=${limitParam}`);

      const { ScraperServiceClient } = await import('../services/scraperServiceClient');

      console.log(`[LeadController][Step 2/5 - DISPATCH] Requesting discovery via ScraperServiceClient...`);
      const results = await ScraperServiceClient.runDiscovery({
        query: queryParam,
        city: cityParam,
        sources: Array.isArray(body.sources) ? body.sources : undefined,
        limit: limitParam,
      });

      const scrapeElapsed = Date.now() - startTime;
      console.log(`[LeadController][Step 3/5 - RECEIVED] Scraper returned ${results.items?.length || 0} jobs in ${scrapeElapsed}ms.`);

      // Step 4: Persist discovered jobs into PostgreSQL prisma.jobs with full error visibility
      let dbFulfilled = 0;
      if (Array.isArray(results.items) && results.items.length > 0) {
        const dbStart = Date.now();
        const upsertResults = await Promise.allSettled(
          results.items.map((item) =>
            prisma.jobs.upsert({
              where: { id: item.id },
              create: {
                id: item.id,
                employer_id: item.employer_id || 'external_aggregator',
                title: item.title,
                employer_name: item.employer_name || 'Verified Employer',
                description: item.description || '',
                industry: item.industry || 'Field Operations & Logistics',
                experience_years_required: item.experience_years_required || 0,
                budget: item.budget ? Number(item.budget) : null,
                status: 'PENDING_REVIEW',
                city: item.city || cityParam,
                location: item.location || item.city || cityParam,
                is_external: true,
                source_name: item.source_name || 'Web Discovery',
                source_url: item.source_url || '',
                source_hash: item.source_hash || item.id,
                external_id: item.external_id || item.id,
                created_at: item.created_at ? new Date(item.created_at) : new Date(),
                updated_at: new Date(),
              },
              update: {
                last_verified_at: new Date(),
              },
            })
          )
        );

        dbFulfilled = upsertResults.filter(r => r.status === 'fulfilled').length;
        const failedUpserts = upsertResults.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        if (failedUpserts.length > 0) {
          console.error(`[LeadController][Step 4/5 - DB UPSERT] ${failedUpserts.length} of ${results.items.length} job writes failed:`, failedUpserts.map(f => f.reason?.message || f.reason));
        }
        console.log(`[LeadController][Step 4/5 - DB UPSERT] Successfully upserted ${dbFulfilled}/${results.items.length} jobs in ${Date.now() - dbStart}ms`);
      }

      // Step 5: Synchronously ingest newly discovered jobs directly into employer_leads & employer_lead_requirements
      const syncStart = Date.now();
      const syncResult = await LeadService.ingestJobsAsLeads(results.items || []);
      console.log(`[LeadController][Step 5/5 - LEAD SYNC] Ingested ${syncResult.newLeadsCount} new leads (${syncResult.newRequirementsCount} reqs) in ${Date.now() - syncStart}ms (Total elapsed: ${Date.now() - startTime}ms)`);

      return c.json({
        ...results,
        success: true,
        sourcesScanned: results.sources_scanned?.length || 0,
        leadsIngested: syncResult.newLeadsCount + syncResult.updatedLeadsCount,
        newLeadsCount: syncResult.newLeadsCount,
        requirementsIngested: syncResult.newRequirementsCount,
        totalDiscovered: results.total || results.items?.length || 0,
        syncResult,
        message: `Discovery scan completed successfully. ${syncResult.newLeadsCount} new leads and ${syncResult.newRequirementsCount} requirements ingested.`,
      });
    } catch (error: any) {
      console.error('[LeadController] Error running auto-discovery:', error);
      return c.json({
        success: false,
        error: error.message || 'Scraper service is unreachable. Please verify Python service is running.',
      }, 503);
    }
  }

  // Cache of synced scan results to prevent duplicate database operations on repeated polls
  private static syncedScansCache = new Map<string, any>();

  static async getScanStatus(c: Context) {
    try {
      const id = c.req.param('id');
      if (!id) {
        return c.json({ success: false, error: 'Scan ID is required' }, 400);
      }
      const { ScraperServiceClient } = await import('../services/scraperServiceClient');
      const status = await ScraperServiceClient.getScanStatus(id);

      let syncResult = null;
      if (status.status === 'COMPLETED') {
        if (LeadController.syncedScansCache.has(id)) {
          syncResult = LeadController.syncedScansCache.get(id);
        } else {
          console.log(`[LeadController][Step 3/3 - SYNC] Scan ${id} is COMPLETED! Running LeadService.syncLeadsFromScrapedJobs()...`);
          syncResult = await LeadService.syncLeadsFromScrapedJobs();
          LeadController.syncedScansCache.set(id, syncResult);
          // Keep cache bounded
          if (LeadController.syncedScansCache.size > 100) {
            const firstKey = LeadController.syncedScansCache.keys().next().value;
            if (firstKey) LeadController.syncedScansCache.delete(firstKey);
          }
          console.log(`[LeadController][Step 3/3 - SYNC RESULT]`, syncResult);
        }
      }

      return c.json({
        success: true,
        ...status,
        syncResult,
      });
    } catch (error: any) {
      console.error(`[LeadController] Error fetching scan status for ${c.req.param('id')}:`, error);
      return c.json({ success: false, error: error.message || 'Failed to fetch scan status' }, 500);
    }
  }

  static async syncLeads(c: Context) {
    try {
      const result = await LeadService.syncLeadsFromScrapedJobs();
      return c.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error syncing leads:', error);
      return c.json({ success: false, error: error.message || 'Failed to sync leads' }, 500);
    }
  }

  static async getSources(c: Context) {
    try {
      const { ScraperServiceClient } = await import('../services/scraperServiceClient');
      const rawSources = await ScraperServiceClient.getSources();
      const sources = rawSources.map((s) => {
        const isLive = !s.is_restricted && (s.status === 'ACTIVE' || s.status === 'SUPPORTED' || (s as any).active === true);
        return {
          ...s,
          id: s.id || s.source_id,
          type: s.is_restricted ? 'RESTRICTED_PARTNER' : 'DIRECT_FEED',
          status: isLive ? 'ACTIVE' : s.status,
          active: isLive,
          complianceNote: s.compliance_note,
          lastScan: s.last_checked_at,
        };
      });
      return c.json({ success: true, data: sources, sources });
    } catch (error: any) {
      console.error('Error fetching sources:', error);
      return c.json({ success: true, data: [], sources: [] });
    }
  }
}
