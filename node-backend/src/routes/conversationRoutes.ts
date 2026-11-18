import { Hono } from 'hono';
import { authenticateJWT } from '../middlewares/auth';
import { writeActionLimiter } from '../middlewares/rateLimiter';
import * as conversationController from '../controllers/conversationController';

const router = new Hono();

// All conversation routes require JWT authentication
router.use('*', authenticateJWT);

// Create or get conversation by job application
router.post('/by-application/:applicationId', conversationController.getOrCreateConversation);

// Create or get conversation by work order
router.post('/by-work-order/:workOrderId', conversationController.getOrCreateByWorkOrder);

// Employer candidate contacts (Hired workers & Shortlisted applicants)
router.get('/contacts', conversationController.getContacts);

// Inbox listing
router.get('/', conversationController.getInbox);

// Total unread count
router.get('/unread-count', conversationController.getUnreadCount);

// Conversation messages stream
router.get('/:id/messages', conversationController.getMessages);

// Send message (rate limited to prevent spam)
router.post('/:id/messages', writeActionLimiter, conversationController.sendMessage);

// Mark read cursor
router.patch('/:id/read', conversationController.markAsRead);

// Report conversation
router.post('/:id/report', writeActionLimiter, conversationController.reportConversation);

export default router;
