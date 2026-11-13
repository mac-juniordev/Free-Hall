import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireApproved } from '../../middleware/auth';
import { universityScope } from '../../middleware/universityScope';
import { validate } from '../../middleware/validate';
import {
  hallIdParamSchema,
  listHallsQuerySchema,
  suggestHallSchema,
} from './halls.schema';
import * as controller from './halls.controller';

const router = Router();

// Slightly tighter for write endpoint — 20 suggests / 10 min / IP
const suggestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many suggestions. Please wait a few minutes.' },
});

// All routes require auth + approved + university scope
router.use(requireAuth, requireApproved, universityScope);

// GET /api/halls?zone=&tier=
router.get(
  '/',
  validate(listHallsQuerySchema, 'query'),
  controller.getHalls
);

// GET /api/halls/:id
router.get(
  '/:id',
  validate(hallIdParamSchema, 'params'),
  controller.getHall
);

// POST /api/halls/suggest
router.post(
  '/suggest',
  suggestLimiter,
  validate(suggestHallSchema, 'body'),
  controller.postSuggestHall
);

export default router;