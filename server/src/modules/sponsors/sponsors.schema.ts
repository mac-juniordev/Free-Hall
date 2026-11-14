import { z } from 'zod';

const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

const phoneRegex = /^\+?[0-9\s\-()]{7,30}$/;

export const createSponsorSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is too short').max(120),
  bannerText: z.string().trim().min(2, 'Banner text is too short').max(255),
  whatsappFooter: z.string().trim().min(2, 'WhatsApp footer is too short').max(180),
  contactPhone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Invalid phone number format')
    .max(30)
    .optional(),
  expiresAt: z.string().datetime({ message: 'expiresAt must be ISO 8601' }),
  isActive: z.boolean().optional().default(true),
});

export const updateSponsorSchema = z.object({
  businessName: z.string().trim().min(2).max(120).optional(),
  bannerText: z.string().trim().min(2).max(255).optional(),
  whatsappFooter: z.string().trim().min(2).max(180).optional(),
  contactPhone: z.string().trim().regex(phoneRegex).max(30).nullable().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const sponsorIdParamSchema = z.object({
  id: uuidLoose,
});

export type CreateSponsorInput = z.infer<typeof createSponsorSchema>;
export type UpdateSponsorInput = z.infer<typeof updateSponsorSchema>;