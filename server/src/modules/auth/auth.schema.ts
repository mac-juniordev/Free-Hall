import { z } from 'zod';

const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password too long (max 72)')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number');

export const registerSchema = z
  .object({
    universityId: uuidLoose,
    fullName: z.string().trim().min(3, 'Full name is too short').max(120),
    matricule: z.string().trim().min(4).max(30),
    email: z.string().trim().email('Enter a valid email (e.g., you@gmail.com)').max(150),
    department: z.string().trim().min(2, 'Department is required').max(120),
    level: z.string().trim().min(2, 'Level is required').max(20),
    role: z.enum(['cc', 'assistant']).default('cc'),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  matricule: z.string().trim().min(4).max(30),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(150),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email').max(150),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;