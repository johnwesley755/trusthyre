import { Hono } from 'hono';
import { LeadController } from '../controllers/leadController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const leadRouter = new Hono();

// All Lead Discovery endpoints require Administrator authentication
leadRouter.use('*', authenticateJWT);
leadRouter.use('*', requireAdmin);

leadRouter.get('/', LeadController.getLeads);
leadRouter.get('/stats', LeadController.getLeadStats);
leadRouter.get('/sources', LeadController.getSources);
leadRouter.get('/scan-status/:id', LeadController.getScanStatus);
leadRouter.post('/sync-leads', LeadController.syncLeads);
leadRouter.post('/run-discovery', LeadController.runAutoDiscovery);
leadRouter.post('/ingest', LeadController.ingestLead);
leadRouter.post('/batch-ingest', LeadController.batchIngest);
leadRouter.patch('/:id/status', LeadController.updateLeadStatus);
leadRouter.post('/:id/outreach', LeadController.logOutreach);
leadRouter.post('/:id/convert', LeadController.convertLead);
leadRouter.patch('/:id/requirements/:reqId', LeadController.updateRequirement);

export { leadRouter };
