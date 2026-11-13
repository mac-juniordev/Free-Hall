import { z } from 'zod';

/**
 * Loose UUID — matches PostgreSQL's uuid type (accepts seed UUIDs).
 */
const uuidLoose = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID format'
  );

/**
 * Valid setting keys for update.
 *  - 3 feature flags
 *  - 'announcement' — special row (uses announcement_text + scheduled_date)
 */
export const settingKeyEnum = z.enum([
  'enable_student_view',
  'enable_student_premium',
  'enable_sponsor_banners',
  'announcement',
]);

export type SettingKey = z.infer<typeof settingKeyEnum>;

export const settingKeyParamSchema = z.object({
  key: settingKeyEnum,
});

/**
 * Body for PUT /api/settings/:key
 *  - Flag keys: { isEnabled: boolean }
 *  - Announcement key: { announcementText: string, scheduledDate?: ISO string | null }
 *
 * We validate shape here; specific rules applied in service based on key.
 */
export const updateSettingSchema = z.object({
  isEnabled: z.boolean().optional(),
  announcementText: z.string().trim().max(500).nullable().optional(),
  scheduledDate: z
    .string()
    .datetime({ message: 'scheduledDate must be ISO 8601' })
    .nullable()
    .optional(),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

/**
 * Optional query for admin listing — pass ?universityId= to switch context
 * (super admin only; enforced in controller).
 */
export const listSettingsQuerySchema = z.object({
  universityId: uuidLoose.optional(),
});