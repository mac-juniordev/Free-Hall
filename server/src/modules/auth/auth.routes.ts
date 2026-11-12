import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema } from './auth.schema';
import * as controller from './auth.controller';

const router = Router();

// Tight limit for auth endpoints — 10 requests / 5 minutes / IP
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

// ---- Public ----
router.get('/universities', controller.getUniversities);
router.post('/register', authLimiter, validate(registerSchema, 'body'), controller.postRegister);
router.post('/login', authLimiter, validate(loginSchema, 'body'), controller.postLogin);

// ---- Protected ----
router.get('/me', requireAuth, controller.getMe);

export default router;