import { Router } from 'express';
import { requireAuth, requireApproved, requireRole } from '../../middleware/auth';
import { universityScope } from '../../middleware/universityScope';
import { validate } from '../../middleware/validate';
import {
  settingKeyParamSchema,
  updateSettingSchema,
} from './settings.schema';
import * as controller from './settings.controller';

const router = Router();

// ---- PUBLIC (PWA bootstrap) ----
router.get('/flags', controller.getFlagsPublic);
router.get('/announcement', controller.getAnnouncementPublic);

// ---- SUPER ADMIN ----
router.get(
  '/all',
  requireAuth,
  requireApproved,
  requireRole('super_admin'),
  universityScope,
  controller.listSettings
);

router.put(
  '/:key',
  requireAuth,
  requireApproved,
  requireRole('super_admin'),
  universityScope,
  validate(settingKeyParamSchema, 'params'),
  validate(updateSettingSchema, 'body'),
  controller.putSetting
);

export default router;