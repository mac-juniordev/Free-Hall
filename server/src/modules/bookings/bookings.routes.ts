import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireApproved } from '../../middleware/auth';
import { universityScope } from '../../middleware/universityScope';
import { validate } from '../../middleware/validate';
import {
  bookingIdParamSchema,
  claimBookingSchema,
  scheduleBookingSchema,
} from './bookings.schema';
import * as controller from './bookings.controller';

const router = Router();

const claimLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking attempts. Please wait a few minutes.' },
});

router.use(requireAuth, requireApproved, universityScope);

router.post('/claim', claimLimiter, validate(claimBookingSchema, 'body'), controller.postClaim);
router.post('/schedule', claimLimiter, validate(scheduleBookingSchema, 'body'), controller.postSchedule);
router.post('/:id/checkin', validate(bookingIdParamSchema, 'params'), controller.postCheckin);
router.post('/:id/release', validate(bookingIdParamSchema, 'params'), controller.postRelease);
router.get('/mine', controller.getMine);

export default router;