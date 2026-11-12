import { z } from 'zod';

/**
 * Loose UUID format check — accepts any hex UUID shape including nil
 * and non-RFC-4122 variants (like our seed: 11111111-1111-1111-1111-111111111111).
 * Matches exactly what PostgreSQL's `uuid` type accepts.
 */
const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

const matriculePrefixRule = z
  .string()
  .trim()
  .min(2, 'Prefix must be at least 2 characters')
  .max(6, 'Prefix must be at most 6 characters')
  .regex(/^[A-Za-z]+$/, 'Prefix must contain letters only');

export const createUniversitySchema = z.object({
  name: z.string().trim().min(3, 'Name is too short').max(150),
  shortCode: z
    .string()
    .trim()
    .min(2, 'Short code too short')
    .max(20, 'Short code too long')
    .regex(/^[A-Za-z0-9]+$/, 'Short code must be alphanumeric'),
  matriculePrefix: matriculePrefixRule,
  isActive: z.boolean().optional().default(true),
});

export const updateUniversitySchema = z.object({
  name: z.string().trim().min(3).max(150).optional(),
  shortCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/)
    .optional(),
  matriculePrefix: matriculePrefixRule.optional(),
  isActive: z.boolean().optional(),
});

export const universityIdParamSchema = z.object({
  id: uuidLoose,
});

export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
export type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;