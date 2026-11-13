import { q } from '../../db/query';
import { AppError } from '../../middleware/errorHandler';
import { SettingKey, UpdateSettingInput } from './settings.schema';

type SettingRow = {
  id: string;
  university_id: string;
  setting_key: string;
  is_enabled: boolean;
  scheduled_date: string | null;
  announcement_text: string | null;
  updated_at: string;
};

export type FlagsDto = {
  enableStudentView: boolean;
  enableStudentPremium: boolean;
  enableSponsorBanners: boolean;
};

export type AnnouncementDto = {
  text: string;
  scheduledDate: string | null;
} | null;

const FLAG_KEYS = [
  'enable_student_view',
  'enable_student_premium',
  'enable_sponsor_banners',
] as const;

const ALL_KEYS: readonly SettingKey[] = [...FLAG_KEYS, 'announcement'];

/**
 * Read all flags for a university. Missing rows default to false
 * (matching DB default).
 */
export async function getFlags(universityId: string): Promise<FlagsDto> {
  const { rows } = await q<SettingRow>(
    `SELECT setting_key, is_enabled
       FROM system_settings
      WHERE university_id = $1
        AND setting_key = ANY($2::text[])`,
    [universityId, FLAG_KEYS]
  );

  const map = new Map<string, boolean>();
  for (const r of rows) map.set(r.setting_key, r.is_enabled);

  return {
    enableStudentView: map.get('enable_student_view') ?? false,
    enableStudentPremium: map.get('enable_student_premium') ?? false,
    enableSponsorBanners: map.get('enable_sponsor_banners') ?? false,
  };
}

/**
 * Announcement row — returns null if no announcement text is set or the
 * announcement has been cleared.
 */
export async function getAnnouncement(universityId: string): Promise<AnnouncementDto> {
  const { rows } = await q<SettingRow>(
    `SELECT announcement_text, scheduled_date
       FROM system_settings
      WHERE university_id = $1
        AND setting_key = 'announcement'
      LIMIT 1`,
    [universityId]
  );
  const row = rows[0];
  if (!row || !row.announcement_text) return null;
  return {
    text: row.announcement_text,
    scheduledDate: row.scheduled_date,
  };
}

/**
 * Read a single flag value. Used internally by other systems
 * (e.g. Sponsors -> enable_sponsor_banners).
 */
export async function getFlag(universityId: string, key: SettingKey): Promise<boolean> {
  if (key === 'announcement') {
    throw new AppError('getFlag() does not support the announcement key', 400, 'BAD_KEY');
  }
  const { rows } = await q<{ is_enabled: boolean }>(
    `SELECT is_enabled FROM system_settings
      WHERE university_id = $1 AND setting_key = $2`,
    [universityId, key]
  );
  return rows[0]?.is_enabled ?? false;
}

/**
 * Upsert — creates the row if it doesn't exist, otherwise updates.
 * This makes admin PUT idempotent even for the 'announcement' key which
 * has no seed row initially.
 */
export async function updateSetting(
  universityId: string,
  key: SettingKey,
  input: UpdateSettingInput
): Promise<{ key: SettingKey; flags?: FlagsDto; announcement?: AnnouncementDto }> {
  if (key === 'announcement') {
    // Announcement update requires announcementText (may be null to clear)
    if (input.announcementText === undefined) {
      throw new AppError(
        'announcementText is required when updating the announcement',
        400,
        'MISSING_TEXT'
      );
    }

    const { rows } = await q<SettingRow>(
      `INSERT INTO system_settings
         (university_id, setting_key, is_enabled, announcement_text, scheduled_date, updated_at)
       VALUES ($1, 'announcement', TRUE, $2, $3, NOW())
       ON CONFLICT (university_id, setting_key) DO UPDATE
         SET announcement_text = EXCLUDED.announcement_text,
             scheduled_date    = EXCLUDED.scheduled_date,
             updated_at        = NOW()
       RETURNING announcement_text, scheduled_date`,
      [universityId, input.announcementText, input.scheduledDate ?? null]
    );

    const row = rows[0];
    return {
      key,
      announcement:
        row && row.announcement_text
          ? { text: row.announcement_text, scheduledDate: row.scheduled_date }
          : null,
    };
  }

  // Feature flag update
  if (input.isEnabled === undefined) {
    throw new AppError(
      'isEnabled is required when updating a feature flag',
      400,
      'MISSING_FLAG_VALUE'
    );
  }

  await q(
    `INSERT INTO system_settings
       (university_id, setting_key, is_enabled, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (university_id, setting_key) DO UPDATE
       SET is_enabled = EXCLUDED.is_enabled,
           updated_at = NOW()`,
    [universityId, key, input.isEnabled]
  );

  const flags = await getFlags(universityId);
  return { key, flags };
}

/**
 * Admin utility — returns all settings rows for a university.
 */
export async function listSettings(universityId: string): Promise<SettingRow[]> {
  const { rows } = await q<SettingRow>(
    `SELECT id, university_id, setting_key, is_enabled, scheduled_date,
            announcement_text, updated_at
       FROM system_settings
      WHERE university_id = $1
      ORDER BY setting_key ASC`,
    [universityId]
  );
  return rows;
}

export { ALL_KEYS };