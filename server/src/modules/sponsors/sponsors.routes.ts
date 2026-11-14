import { Router } from 'express';
import { requireAuth, requireApproved, requireRole } from '../../middleware/auth';
import { universityScope } from '../../middleware/universityScope';
import { validate } from '../../middleware/validate';
import {
  createSponsorSchema,
  sponsorIdParamSchema,
  updateSponsorSchema,
} from './sponsors.schema';
import * as controller from './sponsors.controller';

const router = Router();

// PUBLIC
router.get('/active', controller.getActivePublic);

// SUPER ADMIN
router.use(requireAuth, requireApproved, requireRole('super_admin'), universityScope);

router.get('/', controller.getList);
router.post('/', validate(createSponsorSchema, 'body'), controller.postCreate);
router.patch(
  '/:id',
  validate(sponsorIdParamSchema, 'params'),
  validate(updateSponsorSchema, 'body'),
  controller.patchSponsor
);
router.delete(
  '/:id',
  validate(sponsorIdParamSchema, 'params'),
  controller.deleteSponsor
);

export default router;