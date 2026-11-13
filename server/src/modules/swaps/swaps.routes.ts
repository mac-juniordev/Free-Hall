import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireApproved } from '../../middleware/auth';
import { universityScope } from '../../middleware/universityScope';
import { validate } from '../../middleware/validate';
import { createSwapSchema, swapIdParamSchema } from './swaps.schema';
import * as controller from './swaps.controller';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many swap requests. Please wait a few minutes.' },
});

router.use(requireAuth, requireApproved, universityScope);

router.post('/', createLimiter, validate(createSwapSchema, 'body'), controller.postCreate);
router.post('/:id/accept', validate(swapIdParamSchema, 'params'), controller.postAccept);
router.post('/:id/reject', validate(swapIdParamSchema, 'params'), controller.postReject);
router.get('/mine', controller.getMine);

export default router;