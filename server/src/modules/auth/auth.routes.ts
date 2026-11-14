import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schema';
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

// Even tighter for forgot-password — 3 requests / 15 min / IP
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again in 15 minutes.' },
});

// ---- Public ----
router.get('/universities', controller.getUniversities);
router.post('/register', authLimiter, validate(registerSchema, 'body'), controller.postRegister);
router.post('/login', authLimiter, validate(loginSchema, 'body'), controller.postLogin);
router.post(
  '/forgot-password',
  forgotLimiter,
  validate(forgotPasswordSchema, 'body'),
  controller.postForgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema, 'body'),
  controller.postResetPassword
);

// ---- Protected ----
router.get('/me', requireAuth, controller.getMe);

export default router;