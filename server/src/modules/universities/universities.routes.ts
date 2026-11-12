import { Router } from 'express';
import { requireAuth, requireApproved, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createUniversitySchema,
  updateUniversitySchema,
  universityIdParamSchema,
} from './universities.schema';
import * as controller from './universities.controller';

const router = Router();

// ---- Public (used by /api/auth/register dropdown) ----
router.get('/', controller.getUniversities);

// ---- Authenticated (any approved user — read only) ----
router.get(
  '/:id',
  requireAuth,
  requireApproved,
  validate(universityIdParamSchema, 'params'),
  controller.getUniversity
);

// ---- Super Admin only ----
router.post(
  '/',
  requireAuth,
  requireApproved,
  requireRole('super_admin'),
  validate(createUniversitySchema, 'body'),
  controller.postUniversity
);

router.patch(
  '/:id',
  requireAuth,
  requireApproved,
  requireRole('super_admin'),
  validate(universityIdParamSchema, 'params'),
  validate(updateUniversitySchema, 'body'),
  controller.patchUniversity
);

export default router;