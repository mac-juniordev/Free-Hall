import { z } from 'zod';

/**
 * Loose UUID format check — accepts any hex UUID shape including nil
 * and non-RFC-4122 variants (like our seed: 11111111-1111-1111-1111-111111111111).
 */
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;