import { Hono } from 'hono';
import { workOrderController } from '../controllers/workOrderController';
import { authenticateJWT, requireEmployer, requireWorker } from '../middlewares/auth';
import { writeActionLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

// Employer: Create work order
router.post('/', authenticateJWT, requireEmployer, writeActionLimiter, workOrderController.createWorkOrder);

// Employer: List employer work orders
router.get('/employer', authenticateJWT, requireEmployer, workOrderController.getEmployerWorkOrders);

// Worker: List received work orders
router.get('/worker', authenticateJWT, requireWorker, workOrderController.getWorkerWorkOrders);

// Both: Get single work order details (enforces ownership in service)
router.get('/:id', authenticateJWT, workOrderController.getWorkOrderById);

// Employer: Send draft work order
router.post('/:id/send', authenticateJWT, requireEmployer, writeActionLimiter, workOrderController.sendWorkOrder);

// Worker: Accept, Decline, or Request Clarification
router.post('/:id/respond', authenticateJWT, requireWorker, writeActionLimiter, workOrderController.respondToWorkOrder);

// Employer: Update terms
router.put('/:id', authenticateJWT, requireEmployer, writeActionLimiter, workOrderController.updateTerms);

// Both: Cancel work order
router.post('/:id/cancel', authenticateJWT, writeActionLimiter, workOrderController.cancelWorkOrder);

export default router;

