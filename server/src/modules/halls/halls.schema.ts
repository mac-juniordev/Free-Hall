import { z } from 'zod';

/**
 * Loose UUID — accepts seed UUIDs and any hex UUID shape (matches PostgreSQL).
 */
const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

const capacityTierEnum = z.enum(['small', 'medium', 'large', 'amphi']);

/**
 * Query params for GET /api/halls
 *  - zone: optional string filter
 *  - tier: optional capacity tier filter
 */
export const listHallsQuerySchema = z.object({
  zone: z.string().trim().min(1).max(100).optional(),
  tier: capacityTierEnum.optional(),
});

/**
 * Body for POST /api/halls/suggest
 *  - Capacity range must match the tier so the board can render consistently.
 */
export const suggestHallSchema = z.object({
  name: z.string().trim().min(2, 'Hall name is too short').max(100),
  zone: z.string().trim().min(2, 'Zone is required').max(100),
  capacityTier: capacityTierEnum,
  approxCapacityRange: z
    .string()
    .trim()
    .min(2, 'Approximate capacity range is required')
    .max(30),
});

export const hallIdParamSchema = z.object({
  id: uuidLoose,
});

export type ListHallsQuery = z.infer<typeof listHallsQuerySchema>;
export type SuggestHallInput = z.infer<typeof suggestHallSchema>;