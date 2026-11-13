import { z } from 'zod';

const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

export const createSwapSchema = z.object({
  requesterBookingId: uuidLoose,
  targetBookingId: uuidLoose,
});

export const swapIdParamSchema = z.object({
  id: uuidLoose,
});

export type CreateSwapInput = z.infer<typeof createSwapSchema>;