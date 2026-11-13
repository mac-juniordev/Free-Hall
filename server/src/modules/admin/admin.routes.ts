import { Router } from 'express';
import { requireAuth, requireApproved, requireRole } from '../../middleware/auth';
import { universityScope } from '../../middleware/universityScope';
import { validate } from '../../middleware/validate';
import { hallIdParamSchema, userIdParamSchema } from './admin.schema';
import * as controller from './admin.controller';

const router = Router();

// Every route: super_admin only
router.use(requireAuth, requireApproved, requireRole('super_admin'), universityScope);

// Users
router.get('/pending-users', controller.getPendingUsers);
router.post('/users/:id/approve', validate(userIdParamSchema, 'params'), controller.postApproveUser);
router.post('/users/:id/suspend', validate(userIdParamSchema, 'params'), controller.postSuspendUser);
router.post('/users/:id/reinstate', validate(userIdParamSchema, 'params'), controller.postReinstateUser);

// Halls
router.get('/pending-halls', controller.getPendingHalls);
router.post('/halls/:id/approve', validate(hallIdParamSchema, 'params'), controller.postApproveHall);
router.post('/halls/:id/reject', validate(hallIdParamSchema, 'params'), controller.postRejectHall);

// Analytics
router.get('/analytics', controller.getAnalytics);

export default router;