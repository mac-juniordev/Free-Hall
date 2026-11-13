import { z } from 'zod';

const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

export const userIdParamSchema = z.object({ id: uuidLoose });
export const hallIdParamSchema = z.object({ id: uuidLoose });